const { query } = require("./utils/db");
const { createResponse, getUserFromRequest } = require("./utils/auth");

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
    // Remove legacy un-isolated 'default' entry if present
    await query("DELETE FROM whatsapp_sync WHERE id = 'default'").catch(() => {});
    tableVerified = true;
  } catch (err) {
    console.error("Warning in whatsapp ensureTableExists:", err.message);
  }
}

function getDefaultUserState() {
  return {
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
}

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

  // -------------------------------------------------------------
  // GET: Fetch current user's isolated WhatsApp status & logs
  // -------------------------------------------------------------
  if (event.httpMethod === "GET") {
    const user = getUserFromRequest(event);
    if (!user || !user.userId) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Unauthorized", ...getDefaultUserState() }),
      };
    }

    const userId = String(user.userId);

    try {
      const res = await query(
        `SELECT id, status, connected, user_number, user_name, qr_data_url, connected_at, last_active, stats, logs 
         FROM whatsapp_sync 
         WHERE id = $1 
         LIMIT 1`,
        [userId]
      );

      if (res && res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        const dbState = {
          status: row.status || "DISCONNECTED",
          connected: Boolean(row.connected),
          userNumber: row.user_number || null,
          userName: row.user_name || null,
          qrDataUrl: row.qr_data_url || null,
          syncPercent: (row.stats && row.stats.syncPercent !== undefined) ? row.stats.syncPercent : null,
          connectedAt: row.connected_at ? new Date(row.connected_at).toISOString() : null,
          lastActive: row.last_active ? new Date(row.last_active).toISOString() : null,
          stats: row.stats || getDefaultUserState().stats,
          logs: Array.isArray(row.logs) ? row.logs : [],
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
      console.warn("DB read error in whatsapp GET:", dbErr.message);
    }

    // Return clean disconnected state for users with no linked device
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(getDefaultUserState()),
    };
  }

  // -------------------------------------------------------------
  // POST: Sync status or handle actions for a specific user
  // -------------------------------------------------------------
  if (event.httpMethod === "POST") {
    try {
      const data = event.body ? JSON.parse(event.body) : {};
      let targetUserId = null;

      // 1. Identify target user from request authentication cookie / Bearer token
      const user = getUserFromRequest(event);
      if (user && user.userId) {
        targetUserId = String(user.userId);
      } else if (data.userId) {
        targetUserId = String(data.userId);
      } else if (data.userEmail) {
        try {
          const uRes = await query("SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [data.userEmail.trim()]);
          if (uRes && uRes.rows && uRes.rows.length > 0) {
            targetUserId = String(uRes.rows[0].id);
          }
        } catch (e) {
          console.error("User lookup by email failed:", e.message);
        }
      }

      if (!targetUserId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "Missing user identification for sync" }),
        };
      }

      // Handle user disconnect action
      if (data.action === "disconnect") {
        try {
          await query(
            `UPDATE whatsapp_sync 
             SET status = 'DISCONNECTED', connected = FALSE, user_number = NULL, user_name = NULL, qr_data_url = NULL, last_active = NOW(), updated_at = NOW() 
             WHERE id = $1`,
            [targetUserId]
          );
        } catch (e) {
          console.error("Disconnect update error:", e.message);
        }

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ success: true, message: "Disconnected" }),
        };
      }

      // Handle user clear-logs action
      if (data.action === "clear-logs") {
        try {
          await query(
            `UPDATE whatsapp_sync 
             SET logs = '[]'::jsonb, updated_at = NOW() 
             WHERE id = $1`,
            [targetUserId]
          );
        } catch (e) {
          console.error("Clear logs update error:", e.message);
        }

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ success: true, message: "Logs cleared" }),
        };
      }

      // Persist / Upsert bot state strictly for this specific user
      try {
        await query(
          `INSERT INTO whatsapp_sync (id, status, connected, user_number, user_name, qr_data_url, connected_at, last_active, stats, logs, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, NOW())
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
            targetUserId,
            data.status || "DISCONNECTED",
            Boolean(data.connected),
            data.userNumber || null,
            data.userName || null,
            data.qrDataUrl || null,
            data.connectedAt ? new Date(data.connectedAt) : null,
            JSON.stringify(data.stats || getDefaultUserState().stats),
            JSON.stringify(data.logs || []),
          ]
        );
      } catch (dbErr) {
        console.error("DB save error in whatsapp POST:", dbErr.message);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: dbErr.message }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: true, message: "Synced successfully for user", userId: targetUserId }),
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
