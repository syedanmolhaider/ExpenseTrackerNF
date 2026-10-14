const { Client, RemoteAuth, LocalAuth } = require("whatsapp-web.js");
const { Pool } = require("pg");
const qrcode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || process.env.WHATSAPP_PORT || 3001;
const TRACKER_API_URL = process.env.TRACKER_API_URL || "https://expensetrackernf.netlify.app";
const USER_EMAIL = process.env.USER_EMAIL || "zsfoodvlogs@gmail.com";
const USER_PASSWORD = process.env.USER_PASSWORD || "ZainiBhai@007";
const CURRENCY = process.env.CURRENCY || "Rs";
const LOGS_FILE = path.join(__dirname, "whatsapp_logs.json");

function findBrowserExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidatePaths = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const botState = {
  status: "STARTING",
  qrString: null,
  qrDataUrl: null,
  syncPercent: null,
  userNumber: null,
  userName: null,
  connectedAt: null,
  lastActive: null,
  lastError: null,
  stats: {
    totalExpensesLogged: 0,
    totalAmountLogged: 0,
    messagesReceived: 0,
    repliesSent: 0,
  },
  logs: [],
};

const sentMessageIds = new Set();

if (fs.existsSync(LOGS_FILE)) {
  try {
    const raw = fs.readFileSync(LOGS_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data.logs)) botState.logs = data.logs.slice(-30);
    if (data.stats) botState.stats = { ...botState.stats, ...data.stats };
  } catch (e) {}
}

function saveLogs() {
  try {
    fs.writeFileSync(
      LOGS_FILE,
      JSON.stringify(
        {
          logs: botState.logs.slice(-30),
          stats: botState.stats,
          lastSaved: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch (e) {}
}

function addLog(entry) {
  if (/[\u0600-\u06FF]/.test(entry.text || "") || /[\u0600-\u06FF]/.test(entry.reply || "")) {
    return null;
  }
  const logItem = {
    id: Date.now() + "-" + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    date: new Date().toISOString().split("T")[0],
    ...entry,
  };
  botState.logs.unshift(logItem);
  if (botState.logs.length > 30) botState.logs.pop();
  botState.lastActive = new Date().toISOString();
  saveLogs();
  syncToCloud();
  return logItem;
}

function getContainerMemoryMb() {
  try {
    if (fs.existsSync("/sys/fs/cgroup/memory.stat")) {
      const stat = fs.readFileSync("/sys/fs/cgroup/memory.stat", "utf-8");
      const match = stat.match(/\banon\s+(\d+)/);
      if (match) return Math.round(parseInt(match[1], 10) / 1024 / 1024);
    }
    if (fs.existsSync("/sys/fs/cgroup/memory.current")) {
      const bytes = parseInt(fs.readFileSync("/sys/fs/cgroup/memory.current", "utf-8").trim(), 10);
      if (!isNaN(bytes) && bytes > 0) return Math.round(bytes / 1024 / 1024);
    }
    if (fs.existsSync("/sys/fs/cgroup/memory/memory.usage_in_bytes")) {
      const bytes = parseInt(fs.readFileSync("/sys/fs/cgroup/memory/memory.usage_in_bytes", "utf-8").trim(), 10);
      if (!isNaN(bytes) && bytes > 0) return Math.round(bytes / 1024 / 1024);
    }
  } catch (e) {}
  const mem = process.memoryUsage();
  return Math.round(mem.rss / 1024 / 1024);
}

async function syncToCloud() {
  try {
    const payload = {
      userEmail: USER_EMAIL,
      userId: sessionUser?.id,
      status: botState.status,
      connected: botState.status === "CONNECTED",
      userNumber: botState.userNumber,
      userName: botState.userName,
      qrDataUrl: botState.qrDataUrl,
      syncPercent: botState.syncPercent,
      connectedAt: botState.connectedAt,
      stats: {
        ...botState.stats,
        syncPercent: botState.syncPercent,
      },
      logs: botState.logs.slice(0, 30),
    };
    await apiRequest("/api/whatsapp", "POST", payload).catch(() => {});
  } catch (e) {}
}

class NeonPostgresStore {
  constructor(pool) {
    this.pool = pool;
    this.cache = new Map();
    this.loaded = false;
  }

  async init() {
    if (!this.pool || this.loaded) return;
    try {
      await this.pool.query(
        "CREATE TABLE IF NOT EXISTS whatsapp_remote_sessions (session_id VARCHAR(100) PRIMARY KEY, session_zip BYTEA NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
      );
      const res = await this.pool.query("SELECT session_id FROM whatsapp_remote_sessions");
      for (const row of res.rows) {
        this.cache.set(row.session_id, true);
      }
      this.loaded = true;
      console.log("db auth loaded");
    } catch (e) {
      console.log("source not found");
    }
  }

  async sessionExists(options) {
    await this.init();
    return !!this.cache.get(options.session);
  }

  async save(options) {
    if (!this.pool) return;
    const zipPath = path.join(__dirname, ".wwebjs_auth", `${options.session}.zip`);
    if (!fs.existsSync(zipPath)) return;
    try {
      const zipBuffer = fs.readFileSync(zipPath);
      await this.pool.query(
        "INSERT INTO whatsapp_remote_sessions (session_id, session_zip, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (session_id) DO UPDATE SET session_zip = EXCLUDED.session_zip, updated_at = CURRENT_TIMESTAMP",
        [options.session, zipBuffer]
      );
      this.cache.set(options.session, true);
      console.log("db auth saved");
    } catch (e) {
      console.log("source not found");
    }
  }

  async extract(options) {
    if (!this.pool) return;
    try {
      const res = await this.pool.query(
        "SELECT session_zip FROM whatsapp_remote_sessions WHERE session_id = $1",
        [options.session]
      );
      if (res.rows.length > 0 && res.rows[0].session_zip) {
        fs.mkdirSync(path.dirname(options.path), { recursive: true });
        fs.writeFileSync(options.path, res.rows[0].session_zip);
        this.cache.set(options.session, true);
        console.log("db auth loaded");
      }
    } catch (e) {
      console.log("source not found");
    }
  }

  async delete(options) {
    if (!this.pool) return;
    try {
      await this.pool.query("DELETE FROM whatsapp_remote_sessions WHERE session_id = $1", [options.session]);
      this.cache.delete(options.session);
      console.log("db auth saved");
    } catch (e) {
      console.log("source not found");
    }
  }
}

let dbPool = null;
if (process.env.DATABASE_URL) {
  try {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
  } catch (e) {
    console.log("source not found");
  }
} else {
  console.log("source not found");
}

const neonStore = new NeonPostgresStore(dbPool);

const CATEGORY_KEYWORDS = {
  "Food": [
    "food", "lunch", "dinner", "breakfast", "burger", "pizza", "biryani", "chai", "tea", "coffee",
    "roti", "naan", "shawarma", "paratha", "snack", "cafe", "samosa", "roll", "bakery", "cake",
    "ice cream", "juice", "doodh", "chaye", "salan", "halwa", "puri", "kabab", "tikka", "karahi",
    "nihari", "haleem", "pakora", "anda", "bread", "subway", "kfc", "mcdonalds"
  ],
  "Dining Out": ["dining out", "dining", "restaurant", "hotel", "dine out", "fine dine", "buffet"],
  "Transport": [
    "petrol", "fuel", "diesel", "bike", "car", "uber", "careem", "indrive", "yangow", "rickshaw",
    "riksha", "cng", "fare", "ride", "metro", "bus", "transport", "toll", "parking", "challan"
  ],
  "Household": [
    "grocery", "groceries", "rashan", "ration", "milk", "eggs", "vegetable", "vegetables", "fruit",
    "fruits", "atta", "oil", "ghee", "supermarket", "meat", "chicken", "beef", "mutton", "household",
    "mart", "soap", "detergent", "surf", "tissue", "sauda"
  ],
  "Bills": [
    "bill", "bijli", "electricity", "lesco", "kelectric", "iesco", "fesco", "gepco", "gas",
    "sui gas", "ssgc", "sngpl", "internet", "wifi", "net", "nayatel", "stormfiber", "mobile bill",
    "ptcl", "water", "pani", "utility", "easyload", "load", "package", "jazz", "zong", "telenor", "ufone"
  ],
  "Healthcare": [
    "medicine", "medicines", "dawa", "dawaii", "panadol", "doctor", "hospital", "pharmacy",
    "clinic", "dentist", "medical", "checkup", "tablet", "syrup", "test", "lab", "blood test"
  ],
  "Education": [
    "school", "college", "uni", "university", "fees", "fee", "tuition", "academy", "books",
    "book", "course", "stationery", "exam"
  ],
  "Personal Care": [
    "gym", "fitness", "workout", "protein", "salon", "barber", "haircut", "nayee", "shampoo",
    "perfume", "skincare", "cream", "facial"
  ],
  "Shopping": [
    "shopping", "clothes", "shirt", "pant", "shoes", "daraz", "mall", "watch", "dress",
    "suit", "kapray", "jootay"
  ],
  "Maintenance": [
    "maintenance", "repair", "car wash", "plumber", "electrician", "mechanic", "tyre",
    "puncture", "service", "oil change"
  ],
  "Loan": ["loan", "debt", "installment", "instalment", "emi", "qarz", "udhar", "committee", "kameti"],
  "Rent": ["rent", "kiraya", "house rent", "office rent", "shop rent"],
  "Parents": ["parents", "abbu", "ammi", "walidain", "mother", "father"],
  "Investment": ["invest", "investment", "shares", "stocks", "psx", "crypto", "bitcoin", "gold", "fund", "mutual fund"],
  "Entertainment": ["movie", "cinema", "netflix", "games", "gaming", "steam", "match", "outing"],
  "Savings": ["saving", "savings", "bisi"],
  "Unexpected": ["unexpected", "emergency", "fine", "loss"],
  "Other": ["other", "misc", "miscellaneous"]
};

function matchCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      if (regex.test(lower)) return category;
    }
  }
  return "Other";
}

function detectPaymentMethod(text) {
  const lower = text.toLowerCase();
  if (/\b(flex|flexi)\b/i.test(lower)) return "flexi";
  if (/\b(plat|platinum|silver|card|cc|credit|creditcard|debit)\b/i.test(lower)) return "platinum";
  return "cash";
}

function parseExpenseMessage(text) {
  if (!text || typeof text !== "string") return null;
  const raw = text.trim();

  if (raw.length > 80 || raw.split("\n").filter((l) => l.trim()).length > 2) {
    return null;
  }

  if (/https?:\/\/|www\.|youtu\.?be/i.test(raw)) {
    return null;
  }

  if (/[\u0600-\u06FF]/.test(raw)) {
    return null;
  }

  if (["✅", "📊", "🤖", "⚠️", "👑", "💡", "●"].some((p) => raw.startsWith(p))) {
    return null;
  }

  const cleanCmd = raw.toLowerCase().replace(/^[!/#.]/, "").trim();
  if (["help", "info", "commands", "start"].includes(cleanCmd)) {
    return { isCommand: true, command: "help" };
  }
  if (["today", "status", "summary", "daily"].includes(cleanCmd)) {
    return { isCommand: true, command: "today" };
  }
  if (["balance", "budget", "room"].includes(cleanCmd)) {
    return { isCommand: true, command: "balance" };
  }
  if (["last", "recent"].includes(cleanCmd)) {
    return { isCommand: true, command: "last" };
  }

  const amountRegex = /(?:rs\.?|pkr\.?|\$)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:\/\-|\/=|\/|rs\.?|pkr\.?)?/i;
  const match = raw.match(amountRegex);

  if (!match) return null;

  const rawAmountStr = match[1].replace(/,/g, "");
  const amount = parseFloat(rawAmountStr);

  if (isNaN(amount) || amount <= 0) return null;

  let remainingText = raw.replace(match[0], " ").replace(/\s+/g, " ").trim();
  const paymentMethod = detectPaymentMethod(raw);

  remainingText = remainingText
    .replace(/\b(platinum|plat|silver|flexi|flex|creditcard|credit|card|cc|debit|cash)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const category = matchCategory(raw);
  const catRegex = new RegExp(`\\b${category}\\b`, "i");
  if (remainingText.toLowerCase() === category.toLowerCase()) {
    remainingText = category;
  } else if (catRegex.test(remainingText) && remainingText.replace(catRegex, "").trim().length >= 2) {
    remainingText = remainingText.replace(catRegex, "").replace(/\s+/g, " ").trim();
  }

  let title = remainingText;
  if (!title || title.length < 2) {
    title = category !== "Other" ? category : "Expense";
  }

  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 90) {
    title = title.substring(0, 87) + "...";
  }

  return {
    isExpense: true,
    title,
    amount,
    category,
    paymentMethod,
    raw,
  };
}

let sessionCookie = null;
let sessionUser = null;

async function apiRequest(endpoint, method = "GET", data = null) {
  const urlObj = new URL(endpoint.startsWith("http") ? endpoint : `${TRACKER_API_URL}${endpoint}`);
  const postData = data ? JSON.stringify(data) : null;
  const httpLib = urlObj.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const headers = {
      "Accept": "application/json",
      "User-Agent": "KingsTracker-WhatsAppBot/1.0",
    };

    if (postData) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(postData);
    }

    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }

    const req = httpLib.request(
      urlObj,
      {
        method,
        headers,
      },
      (res) => {
        if (res.headers["set-cookie"]) {
          sessionCookie = res.headers["set-cookie"]
            .map((c) => c.split(";")[0])
            .join("; ");
        }

        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch (e) {
            parsed = body;
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(typeof parsed === "object" && parsed.error ? parsed.error : `HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function loginToTracker() {
  try {
    const res = await apiRequest("/api/login", "POST", {
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });
    sessionUser = res.user;
    return true;
  } catch (err) {
    return false;
  }
}

async function logExpenseToTracker(expense) {
  if (!sessionCookie) {
    await loginToTracker();
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const payload = {
    title: (expense.title || "Expense").substring(0, 100),
    amount: expense.amount,
    category: (expense.category || "Other").substring(0, 50),
    date: todayStr,
    payment_method: expense.paymentMethod || "cash",
    notes: "Logged via WhatsApp",
  };

  try {
    const res = await apiRequest("/api/expenses", "POST", payload);
    return res;
  } catch (err) {
    if (err.message.includes("401") || err.message.includes("unauthorized") || err.message.includes("token")) {
      await loginToTracker();
      return await apiRequest("/api/expenses", "POST", payload);
    }
    throw err;
  }
}

async function getTodayExpenses() {
  if (!sessionCookie) await loginToTracker();
  const todayStr = new Date().toISOString().split("T")[0];
  try {
    const res = await apiRequest(`/api/expenses?from=${todayStr}&to=${todayStr}`, "GET");
    const expenses = Array.isArray(res) ? res : res.expenses || [];
    return expenses;
  } catch (err) {
    return [];
  }
}

let client = null;

function createClientInstance() {
  const executablePath = findBrowserExecutable();

  let authStrategy;
  if (dbPool) {
    authStrategy = new RemoteAuth({
      clientId: "king-tracker",
      dataPath: path.join(__dirname, ".wwebjs_auth"),
      store: neonStore,
      backupSyncIntervalMs: 3600000,
    });
  } else {
    authStrategy = new LocalAuth({
      dataPath: path.join(__dirname, ".wwebjs_auth"),
    });
  }

  return new Client({
    authTimeoutMs: 120000,
    qrMaxRetries: 0,
    authStrategy,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    puppeteer: {
      headless: true,
      executablePath,
      timeout: 120000,
      protocolTimeout: 180000,
      defaultViewport: { width: 800, height: 600 },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-extensions",
        "--disable-default-apps",
        "--disable-breakpad",
        "--disable-sync",
        "--disable-notifications",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--mute-audio",
        "--hide-scrollbars",
        "--window-size=800,600",
        "--disk-cache-size=1",
        "--media-cache-size=1",
      ],
    },
  });
}

function attachClientEvents(client) {
  client.on("qr", async (qr) => {
    botState.status = "QR_READY";
    botState.qrString = qr;
    console.log("qr updated");

    try {
      botState.qrDataUrl = await qrcode.toDataURL(qr, {
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch (e) {
      console.log("source not found");
    }

    qrcodeTerminal.generate(qr, { small: true });

    addLog({
      type: "SYSTEM",
      direction: "SYSTEM",
      text: "New QR Code generated. Scan with WhatsApp on your phone.",
      status: "QR_READY",
    });
    syncToCloud();
  });

  client.on("loading_screen", (percent, message) => {
    botState.status = "SYNCING";
    botState.syncPercent = percent;
    botState.qrString = null;
    botState.qrDataUrl = null;
    addLog({
      type: "SYSTEM",
      direction: "SYSTEM",
      text: `QR code scanned! Syncing chats (${percent}%)...`,
      status: "SYNCING",
    });
    syncToCloud();
  });

  client.on("authenticated", () => {
    botState.status = "AUTHENTICATED";
    botState.qrString = null;
    botState.qrDataUrl = null;
    console.log("db auth loaded");
    addLog({
      type: "SYSTEM",
      direction: "SYSTEM",
      text: "Authentication verified. Initializing WhatsApp session...",
      status: "AUTHENTICATED",
    });
    syncToCloud();
  });

  client.on("ready", async () => {
    botState.status = "CONNECTED";
    botState.qrString = null;
    botState.qrDataUrl = null;
    botState.syncPercent = 100;
    botState.connectedAt = new Date().toISOString();

    const info = client.info || {};
    botState.userNumber = info.wid?.user || "Unknown";
    botState.userName = info.pushname || "Owner";
    console.log("db auth loaded");

    addLog({
      type: "SYSTEM",
      direction: "SYSTEM",
      text: `WhatsApp successfully connected as ${botState.userName} (+${botState.userNumber})`,
      status: "CONNECTED",
    });

    syncToCloud();
    loginToTracker();

    setTimeout(() => {
      if (client?.authStrategy && typeof client.authStrategy.storeRemoteSession === "function") {
        client.authStrategy.storeRemoteSession({ emit: true }).catch(() => {});
      }
    }, 30000);
  });

  client.on("auth_failure", (msg) => {
    botState.status = "ERROR";
    botState.lastError = msg;
    console.log("source not found");
    addLog({
      type: "ERROR",
      direction: "SYSTEM",
      text: `Auth failure: ${msg}`,
      status: "ERROR",
    });
  });

  client.on("disconnected", (reason) => {
    botState.status = "DISCONNECTED";
    botState.lastError = reason;
    console.log("source not found");
    addLog({
      type: "SYSTEM",
      direction: "SYSTEM",
      text: `WhatsApp disconnected: ${reason}`,
      status: "DISCONNECTED",
    });
  });

  client.on("message_create", async (msg) => {
    try {
      if (!msg.body || typeof msg.body !== "string") return;
      if (msg.isForwarded || msg.broadcast || msg.isStatus) return;

      const text = msg.body.trim();
      if (!text) return;

      if (msg.id && msg.id._serialized && sentMessageIds.has(msg.id._serialized)) {
        sentMessageIds.delete(msg.id._serialized);
        return;
      }

      const myNumber = client.info?.wid?.user;
      const isFromMe = msg.fromMe;
      const isSelfChat = msg.to === msg.from || (msg.to && msg.to.includes(myNumber) && msg.from && msg.from.includes(myNumber));

      if (!isSelfChat && !isFromMe) {
        if (msg.isGroupMsg) return;
      }

      const parsed = parseExpenseMessage(text);
      if (!parsed) return;

      botState.stats.messagesReceived++;

      async function sendBotReply(replyText) {
        const sent = await msg.reply(replyText);
        if (sent && sent.id && sent.id._serialized) {
          sentMessageIds.add(sent.id._serialized);
        }
        return sent;
      }

      if (parsed.isCommand && parsed.command === "help") {
        const reply = `👑 *King's Tracker WhatsApp Assistant*

Send expenses in natural text:
• *Lunch 300* ➔ Log Rs 300 (Food)
• *Petrol 1500 card* ➔ Platinum Card
• *Flexi 5000* ➔ Flexi Card
• *Milk 250 Household* ➔ Custom Category
• *Internet bill 4000* ➔ Bills

*Commands:*
• *today* — View today's total spending
• *balance* — Check available budget
• *help* — Show this guide`;

        await sendBotReply(reply);
        botState.stats.repliesSent++;
        addLog({
          type: "COMMAND",
          direction: "IN_OUT",
          text,
          reply,
          status: "SUCCESS",
        });
        return;
      }

      if (parsed.isCommand && parsed.command === "today") {
        const expenses = await getTodayExpenses();
        const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        let reply = `📊 *Today's Spending Summary*\n\n💰 *Total Spent Today:* ${CURRENCY} ${total.toLocaleString()} (${expenses.length} expenses)\n`;

        if (expenses.length > 0) {
          reply += "\n*Recent items:*\n";
          expenses.slice(-5).reverse().forEach((e) => {
            reply += `• ${e.title}: ${CURRENCY} ${parseFloat(e.amount).toLocaleString()} (${e.category || "Other"})\n`;
          });
        } else {
          reply += "\nNo expenses logged yet today.";
        }

        await sendBotReply(reply);
        botState.stats.repliesSent++;
        addLog({
          type: "COMMAND",
          direction: "IN_OUT",
          text,
          reply,
          status: "SUCCESS",
        });
        return;
      }

      if (parsed.isCommand && parsed.command === "balance") {
        const reply = `💡 *Budget Check*\nOpen your dashboard to view complete balance, daily room & category caps:\n${TRACKER_API_URL}`;
        await sendBotReply(reply);
        botState.stats.repliesSent++;
        return;
      }

      if (parsed.isExpense) {
        try {
          await logExpenseToTracker(parsed);

          const todayItems = await getTodayExpenses();
          const todayTotal = todayItems.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

          botState.stats.totalExpensesLogged++;
          botState.stats.totalAmountLogged += parsed.amount;

          const cardBadge = parsed.paymentMethod === "platinum" ? "🥈 Platinum Card" : parsed.paymentMethod === "flexi" ? "💳 Flexi Card" : "💵 Cash";
          const reply = `✅ *Logged:* ${parsed.title} — ${CURRENCY} ${parsed.amount.toLocaleString()}
📂 *Category:* ${parsed.category}
💳 *Method:* ${cardBadge}
💰 *Today's Spent:* ${CURRENCY} ${todayTotal.toLocaleString()}`;

          await sendBotReply(reply);
          botState.stats.repliesSent++;

          addLog({
            type: "EXPENSE",
            direction: "IN_OUT",
            text,
            parsed,
            reply,
            status: "SUCCESS",
          });
        } catch (err) {
          const reply = `⚠️ *Could not save expense:* ${err.message}\nPlease check your tracker connection.`;
          await sendBotReply(reply);

          addLog({
            type: "EXPENSE",
            direction: "IN_OUT",
            text,
            parsed,
            error: err.message,
            reply,
            status: "ERROR",
          });
        }
      }
    } catch (err) {}
  });
}

client = createClientInstance();
attachClientEvents(client);

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  const readBody = () =>
    new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          resolve(JSON.parse(body || "{}"));
        } catch (e) {
          resolve({});
        }
      });
    });

  if (pathname === "/" || pathname === "/health") {
    const memMb = getContainerMemoryMb();
    return sendJson(200, {
      status: "OK",
      service: "King's Tracker WhatsApp Bot",
      botStatus: botState.status,
      connected: botState.status === "CONNECTED",
      userNumber: botState.userNumber,
      userName: botState.userName,
      memory: {
        usedMb: memMb,
        limitMb: 512,
        headroomMb: Math.max(0, 512 - memMb),
        headroomPercent: Math.round(((512 - memMb) / 512) * 100) + "%",
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  if (pathname === "/api/whatsapp/status") {
    return sendJson(200, {
      status: botState.status,
      connected: botState.status === "CONNECTED",
      userNumber: botState.userNumber,
      userName: botState.userName,
      qrDataUrl: botState.qrDataUrl,
      syncPercent: botState.syncPercent,
      connectedAt: botState.connectedAt,
      lastActive: botState.lastActive,
      lastError: botState.lastError,
      stats: botState.stats,
      logs: botState.logs.slice(0, 10),
    });
  }

  if (pathname === "/api/whatsapp/debug") {
    try {
      const page = client?.pupPage;
      if (!page) return sendJson(200, { hasPage: false, status: botState.status });
      const url = page.url();
      const title = await page.title().catch((e) => e.message);
      const content = await page.content().catch((e) => e.message);
      return sendJson(200, {
        hasPage: true,
        url,
        title,
        status: botState.status,
        lastError: botState.lastError,
        htmlPreview: (content || "").substring(0, 1500),
      });
    } catch (e) {
      return sendJson(500, { error: e.message });
    }
  }

  if (pathname === "/api/whatsapp/screenshot") {
    try {
      const page = client?.pupPage;
      if (!page) return sendJson(404, { error: "No active page" });
      const buf = await page.screenshot({ type: "jpeg", quality: 60 });
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      return res.end(buf);
    } catch (e) {
      return sendJson(500, { error: e.message });
    }
  }

  if (pathname === "/api/whatsapp/logs") {
    return sendJson(200, {
      logs: botState.logs,
      stats: botState.stats,
    });
  }

  if (pathname === "/api/whatsapp/clear-logs" && req.method === "POST") {
    botState.logs = [];
    saveLogs();
    apiRequest("/api/whatsapp", "POST", { action: "clear-logs" }).catch(() => {});
    return sendJson(200, { message: "Logs cleared", success: true });
  }

  if (pathname === "/api/whatsapp/disconnect" && req.method === "POST") {
    try {
      if (client) {
        await client.logout().catch(() => {});
        botState.status = "DISCONNECTED";
        botState.userNumber = null;
        botState.userName = null;
        botState.qrDataUrl = null;
        syncToCloud();
        setTimeout(async () => {
          await cleanupBeforeRetry();
          initializeWithRetry();
        }, 1500);
      }
      return sendJson(200, { message: "Disconnected successfully", success: true });
    } catch (e) {
      return sendJson(500, { error: e.message });
    }
  }

  if (pathname === "/api/whatsapp/simulate" && req.method === "POST") {
    const body = await readBody();
    const text = body.text || "";
    const parsed = parseExpenseMessage(text);

    if (!parsed) {
      return sendJson(400, { error: "Could not parse expense from text", text });
    }

    if (parsed.isExpense && body.execute !== false) {
      try {
        await logExpenseToTracker(parsed);
        botState.stats.totalExpensesLogged++;
        botState.stats.totalAmountLogged += parsed.amount;

        const logEntry = addLog({
          type: "SIMULATION",
          direction: "IN_OUT",
          text,
          parsed,
          reply: `✅ Logged: ${parsed.title} — ${CURRENCY} ${parsed.amount} (${parsed.category})`,
          status: "SUCCESS",
        });

        return sendJson(200, {
          success: true,
          parsed,
          logEntry,
          message: `Logged ${parsed.title} of ${CURRENCY} ${parsed.amount}`,
        });
      } catch (err) {
        return sendJson(500, { error: err.message, parsed });
      }
    }

    return sendJson(200, { success: true, parsed });
  }

  sendJson(404, { error: "Not found" });
});

server.listen(PORT, () => {
  loginToTracker().then(() => syncToCloud()).catch(() => {});

  setInterval(syncToCloud, 15000);

  setInterval(async () => {
    if (botState.status === "STARTING" || botState.status === "SYNCING") {
      if (global.gc) { try { global.gc(); } catch (e) {} }
      return;
    }
    const currentRam = getContainerMemoryMb();
    if (currentRam >= 450) {
      try {
        await client.destroy().catch(() => {});
      } catch (e) {}
      if (global.gc) { try { global.gc(); } catch (e) {} }
      setTimeout(() => initializeWithRetry(), 5000);
    } else if (global.gc) {
      try { global.gc(); } catch (e) {}
    }
  }, 20000);

  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (externalUrl) {
    setInterval(() => {
      const pingClient = externalUrl.startsWith("https") ? https : http;
      pingClient.get(`${externalUrl}/health`, () => {}).on("error", () => {});
    }, 10 * 60 * 1000);
  }
});

let initRetryCount = 0;
const MAX_INIT_RETRIES = 5;

async function cleanupBeforeRetry() {
  if (client) {
    try {
      await client.destroy().catch(() => {});
    } catch (e) {}
    client = null;
  }

  const authBase = path.join(__dirname, ".wwebjs_auth");
  if (fs.existsSync(authBase)) {
    try {
      const entries = fs.readdirSync(authBase);
      for (const entry of entries) {
        const fullPath = path.join(authBase, entry);
        if (fs.statSync(fullPath).isDirectory()) {
          const lockFiles = ["SingletonLock", "SingletonCookie", "SingletonSocket"];
          for (const lock of lockFiles) {
            try { fs.unlinkSync(path.join(fullPath, lock)); } catch (e) {}
          }
          if (initRetryCount >= 2 && !entry.endsWith(".zip")) {
            try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }

  if (global.gc) { try { global.gc(); } catch (e) {} }

  client = createClientInstance();
  attachClientEvents(client);
}

async function initializeWithRetry() {
  if (initRetryCount > 0) {
    await cleanupBeforeRetry();
  }

  botState.status = "STARTING";
  botState.lastError = null;
  syncToCloud();

  client.initialize().catch(async (err) => {
    const errMsg = typeof err === "string" ? err : (err.message || String(err));
    botState.status = "ERROR";
    botState.lastError = errMsg;

    initRetryCount++;
    if (initRetryCount < MAX_INIT_RETRIES) {
      const delay = Math.min(15000 * initRetryCount, 60000);
      addLog({
        type: "SYSTEM",
        direction: "SYSTEM",
        text: `Init failed: ${errMsg}. Retrying in ${delay / 1000}s...`,
        status: "ERROR",
      });
      setTimeout(() => initializeWithRetry(), delay);
    } else {
      addLog({
        type: "ERROR",
        direction: "SYSTEM",
        text: `All ${MAX_INIT_RETRIES} init attempts exhausted. Restart required.`,
        status: "ERROR",
      });
    }
  });
}

initializeWithRetry();
