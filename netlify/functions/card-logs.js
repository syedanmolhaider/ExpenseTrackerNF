const { query } = require("./utils/db");
const { createResponse } = require("./utils/auth");
const { withMiddleware } = require("./utils/middleware");

let tableVerified = false;

async function ensureTableExists() {
  if (tableVerified) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS card_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        card_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_card_logs_user_id ON card_logs(user_id)`);
    } catch (e) {}
    tableVerified = true;
    console.log("✓ card_logs table verified successfully");
  } catch (err) {
    console.error("Warning in card_logs ensureTableExists:", err.message);
  }
}

exports.handler = withMiddleware({ rateLimitPrefix: "card-logs" }, async (event, context, user) => {
  try {
    await ensureTableExists();
    const userId = String(user.userId);
    const pathParts = event.path.replace(/\/$/, "").split("/");
    const lastPart = pathParts[pathParts.length - 1];
    let logId = lastPart !== "card-logs" ? lastPart : null;
    if (!logId && event.queryStringParameters && event.queryStringParameters.id) {
      logId = event.queryStringParameters.id;
    }

    // -------------------------------------------------------------
    // GET — fetch card-specific extra/past logs for user
    // -------------------------------------------------------------
    if (event.httpMethod === "GET") {
      const month = event.queryStringParameters?.month; // optional YYYY-MM
      let sql = "SELECT id, card_type, title, amount, date, notes, created_at FROM card_logs WHERE user_id::text = $1::text";
      const values = [userId];

      if (month) {
        sql += " AND to_char(date, 'YYYY-MM') = $2";
        values.push(month);
      }
      sql += " ORDER BY date DESC, id DESC";

      const result = await query(sql, values);
      return createResponse(200, { logs: result.rows || [] });
    }

    // -------------------------------------------------------------
    // POST — create new card-specific log
    // -------------------------------------------------------------
    if (event.httpMethod === "POST") {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
      const { card_type, title, amount, date, notes } = body;

      if (!title || !title.trim()) {
        return createResponse(400, { error: "Title is required" });
      }
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return createResponse(400, { error: "Valid amount is required" });
      }
      if (!date) {
        return createResponse(400, { error: "Date is required" });
      }
      const cleanCard = (card_type === "flexi" || card_type === "flexi_card") ? "flexi" : "platinum";

      const result = await query(
        `INSERT INTO card_logs (user_id, card_type, title, amount, date, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, card_type, title, amount, date, notes, created_at`,
        [userId, cleanCard, title.trim(), numAmount, date, notes ? notes.trim() : null]
      );

      return createResponse(201, {
        message: "Card log added successfully",
        log: result.rows[0],
      });
    }

    // -------------------------------------------------------------
    // PUT — update card-specific log
    // -------------------------------------------------------------
    if (event.httpMethod === "PUT") {
      if (!logId) return createResponse(400, { error: "Log ID is required" });
      const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
      const { card_type, title, amount, date, notes } = body;

      const check = await query(
        "SELECT id FROM card_logs WHERE id = $1 AND user_id::text = $2::text",
        [logId, userId]
      );
      if (!check.rows || check.rows.length === 0) {
        return createResponse(404, { error: "Card log not found" });
      }

      const updates = [];
      const values = [];
      let idx = 1;

      if (card_type !== undefined) {
        const cleanCard = (card_type === "flexi" || card_type === "flexi_card") ? "flexi" : "platinum";
        updates.push(`card_type = $${idx}`);
        values.push(cleanCard);
        idx++;
      }
      if (title !== undefined) {
        if (!title.trim()) return createResponse(400, { error: "Title cannot be empty" });
        updates.push(`title = $${idx}`);
        values.push(title.trim());
        idx++;
      }
      if (amount !== undefined) {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return createResponse(400, { error: "Valid amount is required" });
        updates.push(`amount = $${idx}`);
        values.push(numAmount);
        idx++;
      }
      if (date !== undefined) {
        updates.push(`date = $${idx}`);
        values.push(date);
        idx++;
      }
      if (notes !== undefined) {
        updates.push(`notes = $${idx}`);
        values.push(notes ? notes.trim() : null);
        idx++;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(logId, userId);

      const result = await query(
        `UPDATE card_logs SET ${updates.join(", ")}
         WHERE id = $${idx} AND user_id::text = $${idx + 1}::text
         RETURNING id, card_type, title, amount, date, notes, created_at, updated_at`,
        values
      );

      return createResponse(200, {
        message: "Card log updated successfully",
        log: result.rows[0],
      });
    }

    // -------------------------------------------------------------
    // DELETE — delete card-specific log
    // -------------------------------------------------------------
    if (event.httpMethod === "DELETE") {
      if (!logId) return createResponse(400, { error: "Log ID is required" });
      const result = await query(
        "DELETE FROM card_logs WHERE id = $1 AND user_id::text = $2::text RETURNING id",
        [logId, userId]
      );
      if (result.rows.length === 0) {
        return createResponse(404, { error: "Card log not found" });
      }
      return createResponse(200, { message: "Card log deleted successfully" });
    }

    return createResponse(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("Error in card-logs handler:", err);
    return createResponse(500, { error: "Server error in card-logs: " + err.message });
  }
});
