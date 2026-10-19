let makeWASocket, DisconnectReason, Browsers, fetchLatestBaileysVersion, areJidsSameUser;

async function initBaileysModule() {
  if (!makeWASocket) {
    const b = await import("@whiskeysockets/baileys");
    makeWASocket = b.default?.default || b.default || b.makeWASocket;
    DisconnectReason = b.DisconnectReason;
    Browsers = b.Browsers;
    fetchLatestBaileysVersion = b.fetchLatestBaileysVersion;
    areJidsSameUser = b.areJidsSameUser;
  }
  return { makeWASocket, DisconnectReason, Browsers, fetchLatestBaileysVersion, areJidsSameUser };
}

const { Pool } = require("pg");
const qrcode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const { useNeonPostgresAuthState } = require("./neonAuthState");

const PORT = process.env.PORT || process.env.WHATSAPP_PORT || 3001;
const TRACKER_API_URL = process.env.TRACKER_API_URL || "https://expensetrackernf.netlify.app";
const USER_EMAIL = process.env.USER_EMAIL || "zsfoodvlogs@gmail.com";
const USER_PASSWORD = process.env.USER_PASSWORD || "ZainiBhai@007";
const CURRENCY = process.env.CURRENCY || "Rs";
const LOGS_FILE = path.join(__dirname, "whatsapp_logs.json");

const botState = {
  status: "STARTING",
  qrString: null,
  qrDataUrl: null,
  syncPercent: null,
  userNumber: null,
  userName: null,
  userLid: null,
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
function recordSentMessage(id) {
  if (!id) return;
  sentMessageIds.add(id);
  if (sentMessageIds.size > 200) {
    const first = sentMessageIds.values().next().value;
    sentMessageIds.delete(first);
  }
}

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
    console.log("db auth loaded");
  } catch (e) {
    console.log("db init error:", e.message);
  }
}

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
    "fruits", "meat", "chicken", "beef", "mutton", "fish", "oil", "ghee", "atta", "flour", "rice",
    "sugar", "daal", "pulse", "spices", "masala", "surf", "detergent", "soap", "shampoo", "tissue",
    "cleaner", "mop", "sabzi", "gosht", "chawal", "cheeni", "kitchen", "household"
  ],
  "Medical": [
    "medicine", "doctor", "hospital", "clinic", "pharmacy", "medical", "checkup", "test", "lab",
    "blood test", "xray", "panadol", "disprin", "tablet", "syrup", "injection", "dawa", "ilaj"
  ],
  "Utilities": [
    "electricity", "bijli", "bill", "gas", "water", "paani", "internet", "wifi", "ptcl", "stormfiber",
    "nayatel", "mobile load", "easyload", "jazzcash", "easypaisa", "maintenance", "utility"
  ],
  "Entertainment": [
    "cinema", "movie", "netflix", "game", "gaming", "outing", "trip", "tour", "amusement", "fun",
    "concert", "match", "cricket"
  ],
  "Personal": [
    "haircut", "salon", "barber", "grooming", "gym", "fitness", "perfume", "watch", "cosmetics",
    "cream", "lotion", "spa"
  ],
  "Apparel": [
    "clothes", "shirt", "pant", "shoes", "dress", "kurta", "shalwar", "shopping", "fabric", "tailor",
    "suit", "chappal", "sandals", "sneakers", "socks", "belt"
  ],
  "Education": [
    "fee", "school", "college", "university", "tuition", "academy", "books", "stationery", "course",
    "exam", "admission", "kitab", "copy", "pen"
  ],
  "Electronics": [
    "charger", "cable", "headphones", "airpods", "mobile", "phone", "laptop", "battery", "repair",
    "screen", "cover", "protector", "mouse", "keyboard"
  ],
  "Investment": ["committee", "saving", "investment", "gold", "shares", "crypto", "fund"],
  "Other": ["misc", "other", "cash", "kharcha", "payment", "transfer"]
};

function matchCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const rx = new RegExp(`(^|\\b|\\s)${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\b|\\s|$)`, "i");
      if (rx.test(lower)) {
        return category;
      }
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

function parseExpenseMessage(text, budgetItems = []) {
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
  if (["today", "status", "daily"].includes(cleanCmd)) {
    return { isCommand: true, command: "today" };
  }
  if (["yesterday"].includes(cleanCmd)) {
    return { isCommand: true, command: "yesterday" };
  }
  if (["month", "monthly", "overview", "summary"].includes(cleanCmd)) {
    return { isCommand: true, command: "month" };
  }
  if (["balance", "budget", "budgets", "items", "room", "left", "budget left"].includes(cleanCmd)) {
    return { isCommand: true, command: "budgets" };
  }
  if (["last", "recent", "history"].includes(cleanCmd)) {
    return { isCommand: true, command: "last" };
  }
  if (/^(undo|delete|del)(\s+.*)?$/i.test(cleanCmd)) {
    const arg = cleanCmd.replace(/^(undo|delete|del)\s*/i, "").trim();
    return { isCommand: true, command: "delete", arg };
  }

  const textWithoutPhones = raw.replace(/\b(?:03[0-9]{2}[-\s]?[0-9]{7}|\+?92[0-9]{10})\b/g, "");
  const textWithoutUnits = textWithoutPhones.replace(
    /\b[0-9]+(?::[0-9]{2})?\s*(?:am|pm|hrs?|hours?|mins?|minutes?|sec|seconds?|kg|g|gm|ml|ltr|liters?|litres?|km|m|cm|gb|mb|th|st|nd|rd)\b/gi,
    ""
  );

  const amountRegex = /(?:rs\.?|pkr\.?|\$)\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)|([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:\/\-|\/=|\/|rs\.?|pkr\.?)|\b([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\b/i;
  const match = textWithoutUnits.match(amountRegex);

  if (!match) return null;

  const rawAmountStr = (match[1] || match[2] || match[3] || "").replace(/,/g, "");
  const amount = parseFloat(rawAmountStr);

  if (isNaN(amount) || amount <= 0) return null;
  if (rawAmountStr.startsWith("0") && rawAmountStr.length > 2) return null;
  if (rawAmountStr.length > 8 && !/(?:rs\.?|pkr\.?|\$)/i.test(raw)) return null;

  const isIncome = /\b(income|salary|earning|freelance)\b/i.test(raw);
  if (isIncome) {
    let source = "Other";
    if (/\bflexi?\b/i.test(raw)) source = "Flexi";
    else if (/\bsalary\b/i.test(raw)) source = "Salary";
    else if (/\bbusiness\b/i.test(raw)) source = "Business";
    else if (/\bfreelance\b/i.test(raw)) source = "Freelance";
    else if (/\bbonus\b/i.test(raw)) source = "Bonus";

    let title = raw.replace(match[0], " ").replace(/\b(income|salary|earning|freelance|rs|pkr|\$)\b/gi, "").replace(/\s+/g, " ").trim();
    if (!title || title.length < 2) title = `${source} Income`;
    else title = title.charAt(0).toUpperCase() + title.slice(1);

    return {
      isIncome: true,
      title,
      amount,
      source,
      raw,
    };
  }

  let remainingText = raw.replace(match[0], " ").replace(/\s+/g, " ").trim();
  const paymentMethod = detectPaymentMethod(raw);

  remainingText = remainingText
    .replace(/\b(platinum|plat|silver|flexi|flex|creditcard|credit|card|cc|debit|cash)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  let budgetTag = null;
  let matchedBudgetItem = null;

  const tagMatch = remainingText.match(/#([a-zA-Z0-9_\s\+\-]+)/i) || remainingText.match(/\[([a-zA-Z0-9_\s\+\-]+)\]/i);
  if (tagMatch && budgetItems.length > 0) {
    const candidate = tagMatch[1].trim().toLowerCase();
    matchedBudgetItem = budgetItems.find((b) => (b.title || "").toLowerCase().trim() === candidate) ||
      budgetItems.find((b) => (b.title || "").toLowerCase().trim().includes(candidate) || candidate.includes((b.title || "").toLowerCase().trim()));
    if (matchedBudgetItem) {
      budgetTag = matchedBudgetItem.title;
      remainingText = remainingText.replace(tagMatch[0], " ").replace(/\s+/g, " ").trim();
    }
  }

  if (!budgetTag && budgetItems.length > 0) {
    const cleanLower = remainingText.toLowerCase();
    const sorted = [...budgetItems].sort((a, b) => (b.title || "").length - (a.title || "").length);
    for (const it of sorted) {
      const itTitle = (it.title || "").toLowerCase().trim();
      if (!itTitle || itTitle.length < 3) continue;
      const rx = new RegExp(`(^|\\b|\\s)${itTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\b|\\s|$)`, "i");
      if (rx.test(cleanLower)) {
        matchedBudgetItem = it;
        budgetTag = it.title;
        const stripped = remainingText.replace(rx, " ").replace(/\s+/g, " ").trim();
        if (stripped.length >= 2) {
          remainingText = stripped;
        }
        break;
      }
    }
  }

  const category = matchedBudgetItem ? matchedBudgetItem.category : matchCategory(raw);
  const catRegex = new RegExp(`\\b${category}\\b`, "i");
  if (remainingText.toLowerCase() === category.toLowerCase()) {
    remainingText = category;
  } else if (catRegex.test(remainingText) && remainingText.replace(catRegex, "").trim().length >= 2) {
    remainingText = remainingText.replace(catRegex, "").replace(/\s+/g, " ").trim();
  }

  const hasCurrencySign = /(?:rs\.?|pkr\.?|\$|\/\-|\/=)/i.test(raw);
  const hasWord = /[a-zA-Z]{2,}/.test(raw);
  if (!hasCurrencySign && !hasWord && !budgetTag) {
    if (raw.startsWith("0") || raw.length > 5 || isNaN(amount) || amount <= 0) {
      return null;
    }
  }

  let title = remainingText;
  if (!title || title.length < 2) {
    title = budgetTag || (category !== "Other" ? category : "Expense");
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
    budgetTag,
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
      "User-Agent": "KingsTracker-WhatsAppBot/Baileys",
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

let cachedBudgetItems = [];
let lastBudgetFetch = 0;

async function getCachedBudgetItems() {
  const now = Date.now();
  if (cachedBudgetItems.length > 0 && now - lastBudgetFetch < 300000) {
    return cachedBudgetItems;
  }
  const currentMonth = new Date().toISOString().slice(0, 7);
  try {
    if (!sessionUser && dbPool) {
      const uRes = await dbPool.query("SELECT id FROM users WHERE email = $1", [USER_EMAIL.toLowerCase()]);
      if (uRes.rows.length > 0) {
        sessionUser = { id: uRes.rows[0].id };
      }
    }
    if (sessionUser && sessionUser.id && dbPool) {
      const res = await dbPool.query(
        "SELECT id, title, category, amount FROM budget_items WHERE user_id = $1 AND month = $2 ORDER BY title ASC",
        [sessionUser.id, currentMonth]
      );
      if (res && res.rows && res.rows.length > 0) {
        cachedBudgetItems = res.rows;
        lastBudgetFetch = now;
        console.log("db budget items loaded");
        return cachedBudgetItems;
      }
    }
    const apiRes = await apiRequest(`/api/budget?month=${currentMonth}`, "GET");
    if (apiRes && apiRes.items && apiRes.items.length > 0) {
      cachedBudgetItems = apiRes.items;
      lastBudgetFetch = now;
      console.log("api budget items loaded");
      return cachedBudgetItems;
    }
  } catch (e) {
    console.log("budget items error:", e.message);
  }
  return cachedBudgetItems;
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
    budget_tag: expense.budgetTag || null,
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

async function logIncomeToTracker(income) {
  if (!sessionCookie) {
    await loginToTracker();
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const payload = {
    title: (income.title || "Income").substring(0, 100),
    amount: income.amount,
    source: income.source || "Other",
    date: todayStr,
    notes: "Logged via WhatsApp",
  };

  try {
    const res = await apiRequest("/api/income", "POST", payload);
    return res;
  } catch (err) {
    if (err.message.includes("401") || err.message.includes("unauthorized") || err.message.includes("token")) {
      await loginToTracker();
      return await apiRequest("/api/income", "POST", payload);
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

async function getYesterdayExpenses() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yestStr = d.toISOString().split("T")[0];
  try {
    if (!sessionCookie) await loginToTracker();
    const res = await apiRequest(`/api/expenses?from=${yestStr}&to=${yestStr}`, "GET");
    const expenses = Array.isArray(res) ? res : res.expenses || [];
    return expenses;
  } catch (err) {
    return [];
  }
}

async function getRecentExpenses(limit = 5) {
  try {
    if (!sessionUser && dbPool) {
      const uRes = await dbPool.query("SELECT id FROM users WHERE email = $1", [USER_EMAIL.toLowerCase()]);
      if (uRes.rows.length > 0) sessionUser = { id: uRes.rows[0].id };
    }
    if (sessionUser && sessionUser.id && dbPool) {
      const res = await dbPool.query(
        "SELECT id, title, amount, category, date, budget_tag, payment_method FROM expenses WHERE user_id = $1 ORDER BY date DESC, id DESC LIMIT $2",
        [sessionUser.id, limit]
      );
      return res.rows || [];
    }
    if (!sessionCookie) await loginToTracker();
    const res = await apiRequest("/api/expenses", "GET");
    const list = Array.isArray(res) ? res : res.expenses || [];
    return list.slice(0, limit);
  } catch (e) {
    return [];
  }
}

async function getBudgetItemsWithRemaining() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  try {
    if (!sessionUser && dbPool) {
      const uRes = await dbPool.query("SELECT id FROM users WHERE email = $1", [USER_EMAIL.toLowerCase()]);
      if (uRes.rows.length > 0) sessionUser = { id: uRes.rows[0].id };
    }
    if (sessionUser && sessionUser.id && dbPool) {
      const budgetRes = await dbPool.query(
        "SELECT id, title, category, amount FROM budget_items WHERE user_id = $1 AND month = $2",
        [sessionUser.id, currentMonth]
      );
      const items = budgetRes.rows || [];
      if (items.length === 0) return [];

      const expRes = await dbPool.query(
        `SELECT budget_tag, SUM(amount) as spent 
         FROM expenses 
         WHERE user_id = $1 AND budget_tag IS NOT NULL AND date::text LIKE $2 || '%'
         GROUP BY budget_tag`,
        [sessionUser.id, currentMonth]
      );
      const spentMap = {};
      (expRes.rows || []).forEach((r) => {
        if (r.budget_tag) {
          spentMap[r.budget_tag.toLowerCase().trim()] = parseFloat(r.spent || 0);
        }
      });

      const itemsWithRemaining = items.map((it) => {
        const limit = parseFloat(it.amount || 0);
        const spent = spentMap[(it.title || "").toLowerCase().trim()] || 0;
        const remaining = limit - spent;
        return {
          id: it.id,
          title: it.title,
          category: it.category,
          limit,
          spent,
          remaining,
          percent: limit > 0 ? Math.round((spent / limit) * 100) : 0,
        };
      });

      // Sort in budget left order (highest remaining budget first)
      itemsWithRemaining.sort((a, b) => b.remaining - a.remaining);
      return itemsWithRemaining;
    }
  } catch (err) {
    console.log("getBudgetItemsWithRemaining error:", err.message);
  }
  return [];
}

async function deleteExpenseFromTracker(arg = "") {
  try {
    if (!sessionUser && dbPool) {
      const uRes = await dbPool.query("SELECT id FROM users WHERE email = $1", [USER_EMAIL.toLowerCase()]);
      if (uRes.rows.length > 0) sessionUser = { id: uRes.rows[0].id };
    }

    let targetExpense = null;
    const cleanArg = (arg || "").trim().toLowerCase();

    if (sessionUser && sessionUser.id && dbPool) {
      if (!cleanArg || cleanArg === "last") {
        const findRes = await dbPool.query(
          "SELECT id, title, amount, category, date, budget_tag FROM expenses WHERE user_id = $1 ORDER BY id DESC LIMIT 1",
          [sessionUser.id]
        );
        targetExpense = findRes.rows[0] || null;
      } else if (!isNaN(parseFloat(cleanArg))) {
        const targetAmount = parseFloat(cleanArg);
        const findRes = await dbPool.query(
          "SELECT id, title, amount, category, date, budget_tag FROM expenses WHERE user_id = $1 AND amount = $2 ORDER BY id DESC LIMIT 1",
          [sessionUser.id, targetAmount]
        );
        targetExpense = findRes.rows[0] || null;
      } else {
        const findRes = await dbPool.query(
          "SELECT id, title, amount, category, date, budget_tag FROM expenses WHERE user_id = $1 AND LOWER(title) LIKE $2 ORDER BY id DESC LIMIT 1",
          [sessionUser.id, `%${cleanArg}%`]
        );
        targetExpense = findRes.rows[0] || null;
      }

      if (targetExpense) {
        await dbPool.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [targetExpense.id, sessionUser.id]);
        return targetExpense;
      }
    } else {
      if (!sessionCookie) await loginToTracker();
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await apiRequest(`/api/expenses?from=${todayStr}&to=${todayStr}`, "GET");
      const list = Array.isArray(res) ? res : res.expenses || [];
      if (list.length > 0) {
        targetExpense = list[0];
        await apiRequest(`/api/expenses/${targetExpense.id}`, "DELETE");
        return targetExpense;
      }
    }
  } catch (err) {
    console.log("deleteExpenseFromTracker error:", err.message);
    throw err;
  }
  return null;
}

async function getMonthSummary() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  try {
    if (!sessionUser && dbPool) {
      const uRes = await dbPool.query("SELECT id FROM users WHERE email = $1", [USER_EMAIL.toLowerCase()]);
      if (uRes.rows.length > 0) sessionUser = { id: uRes.rows[0].id };
    }
    if (sessionUser && sessionUser.id && dbPool) {
      const expRes = await dbPool.query(
        "SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE user_id = $1 AND date::text LIKE $2 || '%'",
        [sessionUser.id, currentMonth]
      );
      const bRes = await dbPool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM budget_items WHERE user_id = $1 AND month = $2",
        [sessionUser.id, currentMonth]
      );
      const incRes = await dbPool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE user_id = $1 AND date::text LIKE $2 || '%'",
        [sessionUser.id, currentMonth]
      );
      return {
        month: currentMonth,
        totalSpent: parseFloat(expRes.rows[0]?.total || 0),
        expenseCount: parseInt(expRes.rows[0]?.count || 0, 10),
        totalBudget: parseFloat(bRes.rows[0]?.total || 0),
        totalIncome: parseFloat(incRes.rows[0]?.total || 0),
      };
    }
  } catch (e) {
    console.log("getMonthSummary error:", e.message);
  }
  return null;
}

let sock = null;
let authManager = null;
let isStarting = false;

async function startWhatsApp() {
  if (isStarting) return;
  isStarting = true;

  try {
    botState.status = "STARTING";
    botState.lastError = null;
    syncToCloud();

    await initBaileysModule();
    authManager = useNeonPostgresAuthState(dbPool, "main_whatsapp_session");
    const { state, saveCreds } = await authManager.getAuthState();

    if (state?.creds?.me) {
      if (state.creds.me.id) {
        botState.userNumber = state.creds.me.id.split(":")[0].split("@")[0].replace(/[^0-9]/g, "");
      }
      if (state.creds.me.lid) {
        botState.userLid = state.creds.me.lid.split(":")[0].split("@")[0].replace(/[^0-9]/g, "");
      }
      if (state.creds.me.name) {
        botState.userName = state.creds.me.name;
      }
    }

    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1043857760] }));

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      shouldIgnoreJid: (jid) => jid === "status@broadcast" || (typeof jid === "string" && (jid.endsWith("@broadcast") || jid.endsWith("@newsletter"))),
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on("creds.update", (creds) => {
      if (creds?.me?.lid) {
        botState.userLid = creds.me.lid.split(":")[0].split("@")[0].replace(/[^0-9]/g, "");
      }
      if (creds?.me?.id) {
        botState.userNumber = creds.me.id.split(":")[0].split("@")[0].replace(/[^0-9]/g, "");
      }
      saveCreds();
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        botState.status = "QR_READY";
        botState.qrString = qr;
        console.log("qr updated");

        try {
          botState.qrDataUrl = await qrcode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
        } catch (e) {}

        qrcodeTerminal.generate(qr, { small: true });

        addLog({
          type: "SYSTEM",
          direction: "SYSTEM",
          text: "New QR Code generated. Scan with WhatsApp on your phone.",
          status: "QR_READY",
        });
        syncToCloud();
      }

      if (connection === "open") {
        botState.status = "CONNECTED";
        botState.qrString = null;
        botState.qrDataUrl = null;
        botState.syncPercent = 100;
        botState.connectedAt = new Date().toISOString();

        const user = sock.user || {};
        const rawUser = user.id || state?.creds?.me?.id || "";
        botState.userNumber = rawUser.split(":")[0] || rawUser.split("@")[0] || botState.userNumber || "Owner";
        botState.userName = user.name || state?.creds?.me?.name || botState.userName || "Owner";
        const rawLid = user.lid || state?.creds?.me?.lid || "";
        if (rawLid) {
          botState.userLid = rawLid.split(":")[0] || rawLid.split("@")[0] || botState.userLid;
        }
        console.log("db auth loaded");

        addLog({
          type: "SYSTEM",
          direction: "SYSTEM",
          text: `WhatsApp successfully connected as ${botState.userName} (+${botState.userNumber})`,
          status: "CONNECTED",
        });

        syncToCloud();
        loginToTracker();
        sock.sendPresenceUpdate("unavailable").catch(() => {});
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        botState.status = "DISCONNECTED";
        botState.lastError = lastDisconnect?.error?.message || "Connection closed";
        console.log("connection closed, status:", statusCode);

        addLog({
          type: "SYSTEM",
          direction: "SYSTEM",
          text: `WhatsApp disconnected: ${botState.lastError}. ${shouldReconnect ? "Reconnecting..." : "Logged out."}`,
          status: "DISCONNECTED",
        });
        syncToCloud();

        if (statusCode === DisconnectReason.loggedOut) {
          await authManager.clearSession();
          botState.userNumber = null;
          botState.userName = null;
          botState.qrDataUrl = null;
          setTimeout(() => {
            isStarting = false;
            startWhatsApp();
          }, 3000);
        } else if (shouldReconnect) {
          setTimeout(() => {
            isStarting = false;
            startWhatsApp();
          }, 5000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify" && type !== "append") return;

      for (const msg of messages) {
        try {
          if (!msg.message) continue;
          const key = msg.key;
          if (!key || !key.remoteJid) continue;
          const jid = key.remoteJid;

          // 1. Immediately ignore all status updates, broadcasts, and newsletters
          if (jid === "status@broadcast" || jid.endsWith("@broadcast") || jid.endsWith("@newsletter")) continue;

          // 2. Immediately ignore ALL WhatsApp groups — bot must NEVER reply in groups
          if (jid.endsWith("@g.us")) continue;

          // 3. Skip echoes from our own outgoing messages
          if (key.id && sentMessageIds.has(key.id)) {
            sentMessageIds.delete(key.id);
            continue;
          }

          const rawText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            "";

          const text = (rawText || "").trim();
          if (!text) continue;

          // 4. Skip bot system and confirmation receipts
          if (["✅", "📊", "🤖", "⚠️", "👑", "💡", "●"].some((p) => text.startsWith(p))) {
            continue;
          }

          // 5. Strict Self-Chat & Whitelist Verification
          const FALLBACK_USER_PHONE = "923094249475";
          const FALLBACK_USER_LID = "238916665913448";

          const myPhoneJid = sock.user?.id || (botState.userNumber ? `${botState.userNumber}@s.whatsapp.net` : `${FALLBACK_USER_PHONE}@s.whatsapp.net`);
          const myLidJid = sock.user?.lid || (botState.userLid ? `${botState.userLid}@lid` : `${FALLBACK_USER_LID}@lid`);

          const myCleanNumber = myPhoneJid.split(":")[0].split("@")[0].replace(/[^0-9]/g, "");
          const myCleanLid = myLidJid.split(":")[0].split("@")[0].replace(/[^0-9]/g, "");
          const remoteCleanNumber = jid.split(":")[0].split("@")[0].replace(/[^0-9]/g, "");

          function isPhoneMatch(n1, n2) {
            if (!n1 || !n2) return false;
            const a = n1.replace(/[^0-9]/g, "");
            const b = n2.replace(/[^0-9]/g, "");
            if (!a || !b) return false;
            if (a === b) return true;
            if (a.length >= 9 && b.length >= 9 && a.slice(-9) === b.slice(-9)) return true;
            return false;
          }

          const isSelfPhone = isPhoneMatch(myCleanNumber, remoteCleanNumber);
          const isSelfLid = Boolean(
            myCleanLid && (
              myCleanLid === remoteCleanNumber ||
              (myCleanLid.length >= 10 && remoteCleanNumber.length >= 10 && myCleanLid.slice(-10) === remoteCleanNumber.slice(-10))
            )
          );
          const isSelfJid = Boolean(
            (areJidsSameUser && areJidsSameUser(jid, myPhoneJid)) ||
            (areJidsSameUser && areJidsSameUser(jid, myLidJid)) ||
            jid === sock.user?.id ||
            jid === sock.user?.lid
          );

          const isSelfChat = Boolean(isSelfPhone || isSelfLid || isSelfJid);

          const allowedNumbersEnv = process.env.ALLOWED_NUMBERS || "";
          const allowedNumbers = allowedNumbersEnv
            .split(",")
            .map((n) => n.replace(/[^0-9]/g, ""))
            .filter(Boolean);
          const isAllowedRemote = allowedNumbers.some((n) => isPhoneMatch(n, remoteCleanNumber));

          console.log(`[WA-MSG] fromMe=${key.fromMe} jid=${jid} remote=${remoteCleanNumber} isSelf=${isSelfChat} text="${text}"`);

          if (!isSelfChat && !isAllowedRemote) {
            continue;
          }

          const budgetItems = await getCachedBudgetItems();
          const parsed = parseExpenseMessage(text, budgetItems);
          if (!parsed) continue;

          botState.stats.messagesReceived++;

          async function sendBotReply(replyText) {
            try {
              const sent = await sock.sendMessage(jid, { text: replyText }, { quoted: msg });
              if (sent?.key?.id) {
                recordSentMessage(sent.key.id);
              }
              sock.sendPresenceUpdate("unavailable").catch(() => {});
              return sent;
            } catch (err) {
              console.log("send reply quoted error, trying unquoted:", err.message);
              try {
                const sent2 = await sock.sendMessage(jid, { text: replyText });
                if (sent2?.key?.id) recordSentMessage(sent2.key.id);
                sock.sendPresenceUpdate("unavailable").catch(() => {});
                return sent2;
              } catch (err2) {
                console.log("send reply unquoted error:", err2.message);
                if (isSelfChat && myCleanNumber) {
                  try {
                    const fallbackJid = `${myCleanNumber}@s.whatsapp.net`;
                    const sent3 = await sock.sendMessage(fallbackJid, { text: replyText });
                    if (sent3?.key?.id) recordSentMessage(sent3.key.id);
                    sock.sendPresenceUpdate("unavailable").catch(() => {});
                    return sent3;
                  } catch (e3) {
                    console.log("fallback send error:", e3.message);
                  }
                }
                return null;
              }
            }
          }

          if (parsed.isCommand && parsed.command === "help") {
            const reply = `👑 *King's Tracker WhatsApp Assistant*

*Log Expenses in Natural Text:*
• *Lunch 300* ➔ Auto-categorized as Food
• *Milk 250* ➔ Links directly to 'Milk' budget item
• *Lunch 300 #Office Lunch* ➔ Explicit budget tag
• *Petrol 2000 platinum* ➔ Platinum Card
• *Flexi 5000* ➔ Flexi Card
• *Dinner 1500 cash* ➔ Cash

*Log Income:*
• *Income 50000 Salary*
• *Income 5000 Freelance*

*Commands:*
• *undo* or *delete* — Delete the last logged expense
• *delete 300* — Delete the latest Rs 300 expense
• *delete lunch* — Delete latest expense matching "lunch"
• *budgets* or *left* — All budget items in budget left order
• *today* — Today's total spent & items
• *yesterday* — Yesterday's spending summary
• *month* — Month overview (Spent vs Budget)
• *last* — Recent 5 expenses logged
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
            continue;
          }

          if (parsed.isCommand && parsed.command === "delete") {
            try {
              const deleted = await deleteExpenseFromTracker(parsed.arg);
              if (deleted) {
                const todayItems = await getTodayExpenses();
                const todayTotal = todayItems.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
                const tagInfo = deleted.budget_tag ? `\n📌 *Budget Item:* ${deleted.budget_tag}` : "";
                const reply = `🗑️ *Expense Deleted Successfully!*
• *Item:* ${deleted.title} — ${CURRENCY} ${parseFloat(deleted.amount).toLocaleString()}${tagInfo}
• *Category:* ${deleted.category || "Other"}
• *Date:* ${deleted.date ? String(deleted.date).split("T")[0] : "Today"}

💰 *Today's Updated Total:* ${CURRENCY} ${todayTotal.toLocaleString()}`;
                await sendBotReply(reply);
                botState.stats.repliesSent++;
                addLog({
                  type: "COMMAND",
                  direction: "IN_OUT",
                  text,
                  reply,
                  status: "SUCCESS",
                });
              } else {
                const reply = `⚠️ *No matching expense found to delete.*
• Type *undo* to remove the most recent expense
• Or check your dashboard: ${TRACKER_API_URL}`;
                await sendBotReply(reply);
                botState.stats.repliesSent++;
              }
            } catch (err) {
              await sendBotReply(`⚠️ *Error deleting expense:* ${err.message}`);
            }
            continue;
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
            continue;
          }

          if (parsed.isCommand && parsed.command === "yesterday") {
            const expenses = await getYesterdayExpenses();
            const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
            let reply = `📅 *Yesterday's Spending Summary*\n\n💰 *Total Spent:* ${CURRENCY} ${total.toLocaleString()} (${expenses.length} expenses)\n`;
            if (expenses.length > 0) {
              reply += "\n*Items:*\n";
              expenses.forEach((e) => {
                reply += `• ${e.title}: ${CURRENCY} ${parseFloat(e.amount).toLocaleString()} (${e.category || "Other"})\n`;
              });
            } else {
              reply += "\nNo expenses logged yesterday.";
            }
            await sendBotReply(reply);
            botState.stats.repliesSent++;
            continue;
          }

          if (parsed.isCommand && parsed.command === "last") {
            const recent = await getRecentExpenses(5);
            let reply = `🕒 *Recent Expenses*\n\n`;
            if (recent.length > 0) {
              recent.forEach((e, idx) => {
                const dateStr = e.date ? String(e.date).split("T")[0] : "";
                const tag = e.budget_tag ? ` [${e.budget_tag}]` : "";
                reply += `${idx + 1}. *${e.title}* — ${CURRENCY} ${parseFloat(e.amount).toLocaleString()}${tag}\n   ↳ ${e.category || "Other"} • ${dateStr}\n`;
              });
              reply += `\n💡 Type *undo* to delete the latest expense.`;
            } else {
              reply += `No recent expenses found.`;
            }
            await sendBotReply(reply);
            botState.stats.repliesSent++;
            continue;
          }

          if (parsed.isCommand && parsed.command === "month") {
            const sum = await getMonthSummary();
            if (sum) {
              const netRemaining = sum.totalBudget > 0 ? sum.totalBudget - sum.totalSpent : sum.totalIncome - sum.totalSpent;
              const reply = `🗓️ *Month Overview (${sum.month})*

💰 *Total Spent:* ${CURRENCY} ${sum.totalSpent.toLocaleString()} (${sum.expenseCount} expenses)
🎯 *Total Budget Planned:* ${CURRENCY} ${sum.totalBudget.toLocaleString()}
💵 *Total Income:* ${CURRENCY} ${sum.totalIncome.toLocaleString()}
📊 *Remaining Budget:* ${CURRENCY} ${netRemaining.toLocaleString()}

🌐 View full trends on dashboard:
${TRACKER_API_URL}`;
              await sendBotReply(reply);
            } else {
              await sendBotReply(`Visit your dashboard to view complete monthly analytics:\n${TRACKER_API_URL}`);
            }
            botState.stats.repliesSent++;
            continue;
          }

          if (parsed.isCommand && (parsed.command === "balance" || parsed.command === "budgets")) {
            const items = await getBudgetItemsWithRemaining();
            if (items && items.length > 0) {
              let reply = `📋 *Budget Items (Ranked by Budget Left)*\n\n`;
              items.slice(0, 20).forEach((b, idx) => {
                const isOver = b.remaining < 0;
                const icon = isOver ? "🔴" : b.percent >= 80 ? "🟡" : "🟢";
                const leftStr = isOver
                  ? `OVER by ${CURRENCY} ${Math.abs(b.remaining).toLocaleString()}!`
                  : `${CURRENCY} ${b.remaining.toLocaleString()} left`;
                reply += `${idx + 1}. ${icon} *${b.title}*: ${leftStr}\n`;
                reply += `   ↳ Spent: ${CURRENCY} ${b.spent.toLocaleString()} / ${CURRENCY} ${b.limit.toLocaleString()} (${b.percent}%)\n`;
              });
              reply += `\n💡 *Tip:* Mention item name (*Milk 250*) or use tag (*Lunch 300 #Office Lunch*) to log!`;
              await sendBotReply(reply);
            } else {
              const basicItems = await getCachedBudgetItems();
              let reply = `📋 *Active Budget Items*\n\n`;
              if (basicItems.length > 0) {
                basicItems.slice(0, 20).forEach((b) => {
                  reply += `• *${b.title}* (${b.category || "Other"})\n`;
                });
              } else {
                reply += `Manage your budget items directly on dashboard:\n${TRACKER_API_URL}`;
              }
              await sendBotReply(reply);
            }
            botState.stats.repliesSent++;
            continue;
          }

          if (parsed.isIncome) {
            try {
              await logIncomeToTracker(parsed);
              const reply = `💰 *Income Logged:* ${parsed.title} — ${CURRENCY} ${parsed.amount.toLocaleString()}
📂 *Source:* ${parsed.source}
📅 *Date:* Today`;
              await sendBotReply(reply);
              botState.stats.repliesSent++;
              addLog({
                type: "INCOME",
                direction: "IN_OUT",
                text,
                parsed,
                reply,
                status: "SUCCESS",
              });
              continue;
            } catch (err) {
              const reply = `⚠️ *Could not save income:* ${err.message}`;
              await sendBotReply(reply);
              addLog({
                type: "INCOME",
                direction: "IN_OUT",
                text,
                parsed,
                error: err.message,
                reply,
                status: "ERROR",
              });
              continue;
            }
          }

          if (parsed.isExpense) {
            try {
              await logExpenseToTracker(parsed);

              const todayItems = await getTodayExpenses();
              const todayTotal = todayItems.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

              botState.stats.totalExpensesLogged++;
              botState.stats.totalAmountLogged += parsed.amount;

              const cardBadge = parsed.paymentMethod === "platinum" ? "🥈 Platinum Card" : parsed.paymentMethod === "flexi" ? "💳 Flexi Card" : "💵 Cash";
              const budgetBadge = parsed.budgetTag ? `\n📌 *Budget Item:* ${parsed.budgetTag}` : "";
              const reply = `✅ *Logged:* ${parsed.title} — ${CURRENCY} ${parsed.amount.toLocaleString()}${budgetBadge}
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
        } catch (err) {
          console.log("message processing error:", err.message);
        }
      }
    });
  } catch (err) {
    botState.status = "ERROR";
    botState.lastError = err.message;
    console.log("Baileys init error:", err.message);
    setTimeout(() => {
      isStarting = false;
      startWhatsApp();
    }, 10000);
  } finally {
    isStarting = false;
  }
}

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
      service: "King's Tracker WhatsApp Bot (Baileys Engine)",
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

  if (pathname.startsWith("/api/whatsapp")) {
    const clientEmail = (req.headers["x-user-email"] || "").trim().toLowerCase();
    if (clientEmail && clientEmail !== USER_EMAIL.toLowerCase()) {
      return sendJson(403, { error: "Forbidden: WhatsApp service is restricted to authorized account", status: "DISABLED", allowed: false });
    }
  }

  if (pathname === "/api/whatsapp/status") {
    return sendJson(200, {
      status: botState.status,
      connected: botState.status === "CONNECTED",
      userNumber: botState.userNumber,
      userName: botState.userName,
      qr: botState.qrString,
      qrDataUrl: botState.qrDataUrl,
      syncPercent: botState.syncPercent,
      connectedAt: botState.connectedAt,
      lastActive: botState.lastActive,
      lastError: botState.lastError,
      stats: botState.stats,
      logs: botState.logs.slice(0, 10),
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
      console.log("Disconnect requested via API");
      if (sock) {
        try { await sock.logout(); } catch (e) {}
        try { sock.end(undefined); } catch (e) {}
        sock = null;
      }
      if (authManager) {
        try { await authManager.clearSession(); } catch (e) {}
      }
      botState.status = "DISCONNECTED";
      botState.userNumber = null;
      botState.userName = null;
      botState.qrDataUrl = null;
      botState.qrString = null;
      syncToCloud();
      setTimeout(() => {
        isStarting = false;
        startWhatsApp();
      }, 1500);
      return sendJson(200, { message: "Disconnected successfully", success: true });
    } catch (e) {
      return sendJson(500, { error: e.message });
    }
  }

  if (pathname === "/api/whatsapp/restart" || pathname === "/restart") {
    try {
      botState.status = "STARTING";
      botState.lastError = null;
      syncToCloud();
      if (sock) {
        try { sock.end(new Error("Manual restart")); } catch (e) {}
      }
      setTimeout(startWhatsApp, 1000);
      return sendJson(200, { message: "Bot restarting...", success: true });
    } catch (e) {
      return sendJson(500, { error: e.message });
    }
  }

  if (pathname === "/api/whatsapp/simulate" && req.method === "POST") {
    const body = await readBody();
    const text = body.text || "";
    const budgetItems = await getCachedBudgetItems();
    const parsed = parseExpenseMessage(text, budgetItems);

    if (!parsed) {
      return sendJson(400, { error: "Could not parse expense from text", text });
    }

    if (parsed.isExpense && body.execute !== false) {
      try {
        await logExpenseToTracker(parsed);
        botState.stats.totalExpensesLogged++;
        botState.stats.totalAmountLogged += parsed.amount;

        const budgetBadge = parsed.budgetTag ? ` [${parsed.budgetTag}]` : "";
        const logEntry = addLog({
          type: "SIMULATION",
          direction: "IN_OUT",
          text,
          parsed,
          reply: `✅ Logged: ${parsed.title} — ${CURRENCY} ${parsed.amount}${budgetBadge} (${parsed.category})`,
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
  startWhatsApp();

  setInterval(syncToCloud, 15000);

  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (externalUrl) {
    setInterval(() => {
      const pingClient = externalUrl.startsWith("https") ? https : http;
      pingClient.get(`${externalUrl}/health`, () => {}).on("error", () => {});
    }, 10 * 60 * 1000);
  }
});
