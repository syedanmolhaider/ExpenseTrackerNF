const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: true,
      },
    });
  }
  return pool;
}

async function query(text, params) {
  const pool = getPool();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error("Database query error:", { text: text.substring(0, 80), error: error.message });
    throw error;
  }
}

module.exports = {
  query,
  getPool,
};
