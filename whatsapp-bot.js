/**
 * ===============================================================
 * King's Tracker — WhatsApp Linked Device Bot & Local Bridge
 * ===============================================================
 * Features:
 * - Uses whatsapp-web.js with LocalAuth (persistent QR scan)
 * - Emits QR code in terminal & provides live base64 QR for Dashboard
 * - Smart parsing for messages like "Lunch 300", "Petrol 1500 card", etc.
 * - Logs expenses directly into King's Tracker (Netlify API / Neon DB)
 * - Auto-replies with confirmation + category + today's spending
 * - Built-in HTTP server on port 3001 with CORS for Dashboard tab
 * - Syncs status and logs with Netlify cloud endpoint
 */

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

// --- Configuration ---
const PORT = process.env.PORT || process.env.WHATSAPP_PORT || 3001;
const TRACKER_API_URL = process.env.TRACKER_API_URL || "https://expensetrackernf.netlify.app";
const USER_EMAIL = process.env.USER_EMAIL || "zsfoodvlogs@gmail.com";
const USER_PASSWORD = process.env.USER_PASSWORD || "ZainiBhai@007";
const CURRENCY = process.env.CURRENCY || "Rs";
const LOGS_FILE = path.join(__dirname, "whatsapp_logs.json");

// Find Chrome or Chromium executable on Windows, Linux, or Docker
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

// Bot In-Memory State
const botState = {
  status: "STARTING", // STARTING, QR_READY, AUTHENTICATING, CONNECTED, DISCONNECTED, ERROR
  qrString: null,
  qrDataUrl: null,
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

// Track sent messages by bot to avoid self-response loops
const sentMessageIds = new Set();

// Load existing logs if available (keep small to avoid RAM bloat)
if (fs.existsSync(LOGS_FILE)) {
  try {
    const raw = fs.readFileSync(LOGS_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data.logs)) botState.logs = data.logs.slice(-30);
    if (data.stats) botState.stats = { ...botState.stats, ...data.stats };
  } catch (e) {
    // ignore
  }
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
  } catch (e) {
    console.error("Failed to persist logs:", e.message);
  }
}

function addLog(entry) {
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

// --- Container & System Memory Monitor ---
function getContainerMemoryMb() {
  try {
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

async function triggerDeepGarbageCollection(reason = "routine") {
  // 1. Force Node.js V8 GC
  if (global.gc) {
    try {
      global.gc();
    } catch (e) {}
  }

  // 2. Force Chromium V8 & DOM Tree GC via Chrome DevTools Protocol
  if (client && client.pupPage) {
    try {
      const cdp = await client.pupPage.target().createCDPSession();
      await cdp.send("HeapProfiler.collectGarbage");
      await cdp.detach().catch(() => {});
    } catch (e) {
      // Safe to ignore if transitioning
    }
  }

  const used = getContainerMemoryMb();
  const headroom = Math.max(0, 512 - used);
  const headroomPercent = Math.round((headroom / 512) * 100);
  console.log(`[Memory Monitor] GC executed (${reason}). Active RAM: ${used}MB / 512MB (${headroomPercent}% free headroom)`);
}

// Sync current bot state to Netlify cloud endpoint (strictly scoped to user)
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
      connectedAt: botState.connectedAt,
      stats: botState.stats,
      logs: botState.logs.slice(0, 30),
    };
    await apiRequest("/api/whatsapp", "POST", payload).catch(() => {});
  } catch (e) {
    // ignore cloud sync error if offline
  }
}

// --- Category Keyword Matching ---
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

// --- Smart Message Parser ---
function parseExpenseMessage(text) {
  if (!text || typeof text !== "string") return null;
  const raw = text.trim();

  // Ignore bot output messages or indicators
  if (["✅", "📊", "🤖", "⚠️", "👑", "💡", "●"].some((p) => raw.startsWith(p))) {
    return null;
  }

  // Check bot commands
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

  // Regex to extract amount (handles "300", "1500", "Rs 300", "250/-", "450.50", "250rs", etc.)
  const amountRegex = /(?:rs\.?|pkr\.?|\$)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:\/\-|\/=|\/|rs\.?|pkr\.?)?/i;
  const match = raw.match(amountRegex);

  if (!match) return null;

  const rawAmountStr = match[1].replace(/,/g, "");
  const amount = parseFloat(rawAmountStr);

  if (isNaN(amount) || amount <= 0) return null;

  // Remove the matched amount and currency from text to get remainder
  let remainingText = raw.replace(match[0], " ").replace(/\s+/g, " ").trim();

  // Detect payment method
  const paymentMethod = detectPaymentMethod(raw);

  // Clean out payment method keywords from title
  remainingText = remainingText
    .replace(/\b(platinum|plat|silver|flexi|flex|creditcard|credit|card|cc|debit|cash)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Category detection
  const category = matchCategory(raw);

  // If title equals or ends with matched category name, clean it
  const catRegex = new RegExp(`\\b${category}\\b`, "i");
  if (remainingText.toLowerCase() === category.toLowerCase()) {
    remainingText = category;
  } else if (catRegex.test(remainingText) && remainingText.replace(catRegex, "").trim().length >= 2) {
    remainingText = remainingText.replace(catRegex, "").replace(/\s+/g, " ").trim();
  }

  // Title fallback
  let title = remainingText;
  if (!title || title.length < 2) {
    title = category !== "Other" ? category : "Expense";
  }

  // Capitalize title and limit length to avoid DB payload limit errors on long forwarded text
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

// --- Netlify API Integration ---
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
        // Collect Set-Cookie
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
    console.log(`[API] Logging into tracker as ${USER_EMAIL}...`);
    const res = await apiRequest("/api/login", "POST", {
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });
    sessionUser = res.user;
    console.log(`[API] Logged in successfully: ${sessionUser?.name || USER_EMAIL}`);
    return true;
  } catch (err) {
    console.error("[API] Login failed:", err.message);
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
      console.log("[API] Session expired. Re-authenticating...");
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
    console.error("[API] Failed to fetch today's expenses:", err.message);
    return [];
  }
}

// --- WhatsApp Client Initialization ---
const executablePath = findBrowserExecutable();
console.log(`[WhatsApp] Browser executable: ${executablePath || "Default Puppeteer"}`);

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.join(__dirname, ".wwebjs_auth"),
  }),
  puppeteer: {
    headless: true,
    executablePath,
    defaultViewport: { width: 800, height: 600 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--in-process-gpu",
      "--renderer-process-limit=1",
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-breakpad",
      "--disable-client-side-phishing-detection",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-domain-reliability",
      "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process,TranslateUI,BackForwardCache,BlinkGenPropertyTrees",
      "--disable-hang-monitor",
      "--disable-ipc-flooding-protection",
      "--disable-notifications",
      "--disable-offer-store-unmasked-wallet-cards",
      "--disable-popup-blocking",
      "--disable-print-preview",
      "--disable-prompt-on-repost",
      "--disable-renderer-backgrounding",
      "--disable-speech-api",
      "--disable-sync",
      "--hide-scrollbars",
      "--ignore-gpu-blacklist",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-default-browser-check",
      "--no-pings",
      "--password-store=basic",
      "--use-mock-keychain",
      "--disk-cache-size=1",
      "--media-cache-size=1",
      "--aggressive-cache-discard",
      "--window-size=800,600",
      "--js-flags=--max-old-space-size=96 --max-semi-space-size=2",
    ],
  },
});

// Event: QR Code Received
client.on("qr", async (qr) => {
  botState.status = "QR_READY";
  botState.qrString = qr;

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
    console.error("[QR] Error generating QR Data URL:", e.message);
  }

  console.log("\n=======================================================");
  console.log("📲 SCAN QR CODE WITH WHATSAPP (Linked Devices):");
  console.log("=======================================================");
  qrcodeTerminal.generate(qr, { small: true });
  console.log("=======================================================");
  console.log(`👉 Or open Dashboard > WhatsApp tab: http://localhost:${PORT}/api/whatsapp/status\n`);

  addLog({
    type: "SYSTEM",
    direction: "SYSTEM",
    text: "New QR Code generated. Scan with WhatsApp on your phone.",
    status: "QR_READY",
  });
  syncToCloud();
  setTimeout(() => triggerDeepGarbageCollection("post-qr"), 1500);
});

// Event: Authenticated
client.on("authenticated", () => {
  botState.status = "AUTHENTICATED";
  console.log("🔒 [WhatsApp] Authentication verified! Loading chats...");
  addLog({
    type: "SYSTEM",
    direction: "SYSTEM",
    text: "Authentication verified. Initializing WhatsApp session...",
    status: "AUTHENTICATED",
  });
});

// Event: Client Ready
client.on("ready", async () => {
  botState.status = "CONNECTED";
  botState.qrString = null;
  botState.qrDataUrl = null;
  botState.connectedAt = new Date().toISOString();

  const info = client.info;
  botState.userNumber = info.wid?.user || "Unknown";
  botState.userName = info.pushname || "Owner";

  console.log("\n🎉 =====================================================");
  console.log(`✅ WHATSAPP CONNECTED AS: ${botState.userName} (+${botState.userNumber})`);
  console.log("📱 You can now message yourself on WhatsApp to log expenses!");
  console.log("   Example: 'Lunch 300' or 'Petrol 1500 card'");
  console.log("=====================================================\n");

  addLog({
    type: "SYSTEM",
    direction: "SYSTEM",
    text: `WhatsApp successfully connected as ${botState.userName} (+${botState.userNumber})`,
    status: "CONNECTED",
  });

  loginToTracker();
  setTimeout(() => triggerDeepGarbageCollection("post-ready"), 3000);
});

// Event: Disconnected / Auth Failure
client.on("auth_failure", (msg) => {
  botState.status = "ERROR";
  botState.lastError = msg;
  console.error("❌ [WhatsApp] Auth failure:", msg);
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
  console.warn("⚠️ [WhatsApp] Disconnected:", reason);
  addLog({
    type: "SYSTEM",
    direction: "SYSTEM",
    text: `WhatsApp disconnected: ${reason}`,
    status: "DISCONNECTED",
  });
});

// --- Incoming Message Handler ---
client.on("message_create", async (msg) => {
  try {
    if (!msg.body || typeof msg.body !== "string") return;

    // Check if this was a bot-sent message
    if (msg.id && sentMessageIds.has(msg.id._serialized)) {
      sentMessageIds.delete(msg.id._serialized);
      return;
    }

    const text = msg.body.trim();

    // Prevent replying to output messages
    if (["✅", "📊", "🤖", "⚠️", "👑", "💡", "●"].some((p) => text.startsWith(p))) {
      return;
    }

    // Determine if message is from user to themselves or direct chat
    const myNumber = client.info?.wid?.user;
    const isFromMe = msg.fromMe;
    const isSelfChat = msg.to === msg.from || (msg.to && msg.to.includes(myNumber) && msg.from && msg.from.includes(myNumber));

    if (!isSelfChat && !isFromMe) {
      if (msg.isGroupMsg) return;
    }

    // Parse the message
    const parsed = parseExpenseMessage(text);
    if (!parsed) return;

    botState.stats.messagesReceived++;

    // Helper to send reply and register ID
    async function sendBotReply(replyText) {
      const sent = await msg.reply(replyText);
      if (sent && sent.id && sent.id._serialized) {
        sentMessageIds.add(sent.id._serialized);
      }
      return sent;
    }

    // 1. Handle Help Command
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

    // 2. Handle Today's Summary Command
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

    // 3. Handle Balance Command
    if (parsed.isCommand && parsed.command === "balance") {
      const reply = `💡 *Budget Check*\nOpen your dashboard to view complete balance, daily room & category caps:\n${TRACKER_API_URL}`;
      await sendBotReply(reply);
      botState.stats.repliesSent++;
      return;
    }

    // 4. Handle Expense Logging
    if (parsed.isExpense) {
      console.log(`[Expense Detected] "${parsed.title}" -> ${CURRENCY} ${parsed.amount} [${parsed.category}] via ${parsed.paymentMethod}`);

      try {
        await logExpenseToTracker(parsed);

        // Fetch today's new total
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

        console.log(`[Expense Saved] Replied with confirmation.`);
      } catch (err) {
        console.error("[Expense Error]", err.message);
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
  } catch (err) {
    console.error("[Message Handler Error]", err);
  }
});

// --- Local HTTP Server for Dashboard Tab & Controls ---
const server = http.createServer(async (req, res) => {
  // CORS Headers for Dashboard
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

  // Endpoints:
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
      connectedAt: botState.connectedAt,
      lastActive: botState.lastActive,
      lastError: botState.lastError,
      stats: botState.stats,
      logs: botState.logs.slice(0, 30),
    });
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
        setTimeout(() => {
          console.log("[WhatsApp] Re-initializing client for new QR code...");
          client.initialize().catch((e) => console.error("Re-init error:", e.message));
        }, 1500);
      }
      return sendJson(200, { message: "Disconnected successfully", success: true });
    } catch (e) {
      return sendJson(500, { error: e.message });
    }
  }

  // Simulate endpoint for testing expense parsing from dashboard
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
  console.log(`[Bridge Server] WhatsApp Dashboard Bridge listening on port ${PORT}`);
  
  // Initial login to tracker immediately so user ID and session cookies are available
  loginToTracker().then(() => syncToCloud()).catch((e) => console.warn("Initial tracker login warning:", e.message));

  // Heartbeat sync every 15 seconds
  setInterval(syncToCloud, 15000);

  // Proactive Memory Guard Watchdog: Strictly enforces 30%+ headroom below 512MB limit (< 350MB ceiling)
  setInterval(() => {
    const currentRam = getContainerMemoryMb();
    if (currentRam >= 240) {
      triggerDeepGarbageCollection(`Proactive threshold: ${currentRam}MB >= 240MB`);
    } else if (global.gc) {
      try { global.gc(); } catch (e) {}
    }
  }, 25000);

  // Keep Render Web Service awake if RENDER_EXTERNAL_URL is present
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (externalUrl) {
    console.log(`[Keep-Alive] Configured self-ping for Render: ${externalUrl}`);
    setInterval(() => {
      const pingClient = externalUrl.startsWith("https") ? https : http;
      pingClient.get(`${externalUrl}/health`, () => {}).on("error", () => {});
    }, 10 * 60 * 1000); // Ping every 10 minutes
  }
});

// Launch WhatsApp Client
console.log("[WhatsApp] Starting WhatsApp Web client...");
client.initialize().catch((err) => {
  botState.status = "ERROR";
  botState.lastError = err.message;
  console.error("❌ Failed to initialize WhatsApp client:", err);
});
