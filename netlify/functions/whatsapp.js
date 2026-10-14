const { query } = require("./utils/db");
const { createResponse } = require("./utils/auth");

let tableVerified = false;

async function ensureTableExists() {
  if (tableVerified) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS whatsapp_sync (
        id VARCHAR(50) PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'DISCONNECTED',
        connected BOOLEAN DEFAULT FALSE,
        user_number VARCHAR(100),
        user_name VARCHAR(100),
        qr_data_url TEXT,
        connected_at TIMESTAMP,
        last_active TIMESTAMP,
        stats JSONB,
        logs JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tableVerified = true;
  } catch (err) {
    console.error("Warning in whatsapp ensureTableExists:", err.message);
  }
}

// In-memory state cache fallback
let cachedState = {
  status: "DISCONNECTED",
  connected: false,
  userNumber: null,
  userName: null,
  qrDataUrl: null,
  connectedAt: null,
  lastActive: null,
  stats: {
    totalExpensesLogged: 0,
    totalAmountLogged: 0,
    messagesReceived: 0,
    repliesSent: 0,
  },
  logs: [],
};

exports.handler = async (event) => {
  // CORS Preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Sync-Key",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({ message: "OK" }),
    };
  }

  await ensureTableExists().catch(() => {});

  // GET: Fetch current WhatsApp status & logs
  if (event.httpMethod === "GET") {
    try {
      const res = await query(
        "SELECT id, status, connected, user_number, user_name, qr_data_url, connected_at, last_active, stats, logs FROM whatsapp_sync WHERE id = 'default' LIMIT 1"
      );
      if (res && res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        const dbState = {
          status: row.status || cachedState.status,
          connected: Boolean(row.connected),
          userNumber: row.user_number || null,
          userName: row.user_name || null,
          qrDataUrl: row.qr_data_url || null,
          connectedAt: row.connected_at ? new Date(row.connected_at).toISOString() : null,
          lastActive: row.last_active ? new Date(row.last_active).toISOString() : null,
          stats: row.stats || cachedState.stats,
          logs: Array.isArray(row.logs) ? row.logs : cachedState.logs,
        };
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify(dbState),
        };
      }
    } catch (dbErr) {
      console.warn("DB read error in whatsapp GET, using in-memory fallback:", dbErr.message);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(cachedState),
    };
  }

  // POST: Sync status or logs from the local WhatsApp background bot or dashboard commands
  if (event.httpMethod === "POST") {
    try {
      const data = event.body ? JSON.parse(event.body) : {};

      // Handle action commands (disconnect, clear-logs)
      if (data.action === "disconnect") {
        cachedState.status = "DISCONNECTED";
        cachedState.connected = false;
        cachedState.userNumber = null;
        cachedState.userName = null;
        cachedState.qrDataUrl = null;
        cachedState.lastActive = new Date().toISOString();

        try {
          await query(
            `UPDATE whatsapp_sync 
             SET status = 'DISCONNECTED', connected = FALSE, user_number = NULL, user_name = NULL, qr_data_url = NULL, last_active = NOW(), updated_at = NOW() 
             WHERE id = 'default'`
          );
        } catch (e) {}

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ success: true, message: "Disconnected" }),
        };
      }

      if (data.action === "clear-logs") {
        cachedState.logs = [];
        try {
          await query(
            `UPDATE whatsapp_sync 
             SET logs = '[]'::jsonb, updated_at = NOW() 
             WHERE id = 'default'`
          );
        } catch (e) {}

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ success: true, message: "Logs cleared" }),
        };
      }

      // Merge data into cached state
      cachedState = {
        ...cachedState,
        ...data,
        lastActive: new Date().toISOString(),
      };

      // Persist to DB
      try {
        await query(
          `INSERT INTO whatsapp_sync (id, status, connected, user_number, user_name, qr_data_url, connected_at, last_active, stats, logs, updated_at)
           VALUES ('default', $1, $2, $3, $4, $5, $6, NOW(), $7, $8, NOW())
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             connected = EXCLUDED.connected,
             user_number = EXCLUDED.user_number,
             user_name = EXCLUDED.user_name,
             qr_data_url = EXCLUDED.qr_data_url,
             connected_at = COALESCE(EXCLUDED.connected_at, whatsapp_sync.connected_at),
             last_active = NOW(),
             stats = EXCLUDED.stats,
             logs = EXCLUDED.logs,
             updated_at = NOW()`,
          [
            data.status || cachedState.status,
            Boolean(data.connected),
            data.userNumber || null,
            data.userName || null,
            data.qrDataUrl || null,
            data.connectedAt ? new Date(data.connectedAt) : null,
            JSON.stringify(data.stats || cachedState.stats),
            JSON.stringify(data.logs || cachedState.logs),
          ]
        );
      } catch (dbErr) {
        console.warn("DB save error in whatsapp POST, cached in-memory only:", dbErr.message);
      }

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: true, message: "Synced successfully" }),
      };
    } catch (err) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: err.message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ error: "Method not allowed" }),
  };
};
