let baileysModule = null;

async function getBaileys() {
  if (!baileysModule) {
    baileysModule = await import("@whiskeysockets/baileys");
  }
  return baileysModule;
}

function useNeonPostgresAuthState(pool, sessionId = "main_whatsapp_session") {
  const memoryMap = new Map();
  const dirtyKeys = new Set();
  let debounceTimer = null;
  let isFlushing = false;

  async function loadState() {
    if (!pool) return;
    const { BufferJSON } = await getBaileys();
    try {
      const res = await pool.query(
        "SELECT session_key, session_value FROM whatsapp_auth_state WHERE session_key LIKE $1",
        [`${sessionId}:%`]
      );
      for (const row of res.rows) {
        const cleanKey = row.session_key.replace(`${sessionId}:`, "");
        try {
          const val = typeof row.session_value === "string"
            ? JSON.parse(row.session_value, BufferJSON.reviver)
            : JSON.parse(JSON.stringify(row.session_value), BufferJSON.reviver);
          memoryMap.set(cleanKey, val);
        } catch (err) {}
      }
      console.log("db auth loaded");
    } catch (e) {
      console.log("db auth load error:", e.message);
    }
  }

  async function flushToDb() {
    if (!pool || dirtyKeys.size === 0 || isFlushing) return;
    isFlushing = true;
    const { BufferJSON } = await getBaileys();
    const keysToFlush = Array.from(dirtyKeys);
    dirtyKeys.clear();

    try {
      for (const key of keysToFlush) {
        const fullKey = `${sessionId}:${key}`;
        const val = memoryMap.get(key);
        if (val) {
          const serialized = JSON.stringify(val, BufferJSON.replacer);
          await pool.query(
            "INSERT INTO whatsapp_auth_state (session_key, session_value, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (session_key) DO UPDATE SET session_value = $2::jsonb, updated_at = NOW()",
            [fullKey, serialized]
          );
        } else {
          await pool.query("DELETE FROM whatsapp_auth_state WHERE session_key = $1", [fullKey]);
        }
      }
      console.log("db auth saved");
    } catch (e) {
      console.log("db auth save error:", e.message);
      for (const k of keysToFlush) dirtyKeys.add(k);
    } finally {
      isFlushing = false;
    }
  }

  function scheduleFlush() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushToDb, 15000);
  }

  async function clearSession() {
    memoryMap.clear();
    dirtyKeys.clear();
    if (pool) {
      try {
        await pool.query("DELETE FROM whatsapp_auth_state WHERE session_key LIKE $1", [`${sessionId}:%`]);
        console.log("session cleared");
      } catch (e) {}
    }
  }

  async function getAuthState() {
    const { initAuthCreds } = await getBaileys();
    await loadState();

    let creds = memoryMap.get("creds");
    if (!creds) {
      creds = initAuthCreds();
      memoryMap.set("creds", creds);
      dirtyKeys.add("creds");
      scheduleFlush();
    }

    const state = {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (const id of ids) {
            const val = memoryMap.get(`${type}-${id}`);
            if (val) data[id] = val;
          }
          return data;
        },
        set: async (data) => {
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const val = data[category][id];
              const mapKey = `${category}-${id}`;
              if (val) {
                memoryMap.set(mapKey, val);
                dirtyKeys.add(mapKey);
              } else {
                memoryMap.delete(mapKey);
                dirtyKeys.add(mapKey);
              }
            }
          }
          scheduleFlush();
        },
      },
    };

    return {
      state,
      saveCreds: async () => {
        memoryMap.set("creds", state.creds);
        dirtyKeys.add("creds");
        await flushToDb();
      },
      clearSession,
      flushToDb,
    };
  }

  return {
    loadState,
    clearSession,
    flushToDb,
    getAuthState,
  };
}

module.exports = { useNeonPostgresAuthState };
