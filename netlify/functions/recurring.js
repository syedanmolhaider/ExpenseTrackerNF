const { query } = require("./utils/db");
const { getUserFromRequest, createResponse } = require("./utils/auth");
const { rateLimitCheck } = require("./utils/rate-limit");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  // Rate limit: 60 requests per minute per IP
  const limited = rateLimitCheck(event, {
    maxRequests: 60,
    windowMs: 60000,
    prefix: "recurring",
  });
  if (limited) return limited;

  try {
    // Authenticate user
    const decoded = getUserFromRequest(event);
    if (!decoded) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const userId = decoded.userId;
    const pathParts = event.path.replace(/\/$/, "").split("/");
    const lastPart = pathParts[pathParts.length - 1];
    const itemId = lastPart !== "recurring" ? lastPart : null;
    const params = event.queryStringParameters || {};

    // GET — fetch all recurring expenses for user
    if (event.httpMethod === "GET") {
      let sql = `SELECT id, title, amount, category, frequency, start_date, end_date, 
                        next_date, is_active, notes, created_at, updated_at
                 FROM recurring_expenses 
                 WHERE user_id = $1`;
      const values = [userId];
      let paramIdx = 2;

      // Filter by active status
      if (params.active !== undefined) {
        sql += ` AND is_active = $${paramIdx}`;
        values.push(params.active === "true");
        paramIdx++;
      }

      sql += ` ORDER BY next_date ASC, created_at DESC`;

      const result = await query(sql, values);
      return createResponse(200, { items: result.rows });
    }

    // POST — create new recurring expense
    if (event.httpMethod === "POST") {
      const {
        title,
        amount,
        category,
        frequency,
        start_date,
        end_date,
        notes,
      } = JSON.parse(event.body);

      // Validate required fields
      if (!title || !amount || !category || !frequency || !start_date) {
        return createResponse(400, {
          error:
            "Title, amount, category, frequency, and start_date are required",
        });
      }

      // Validate amount
      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return createResponse(400, {
          error: "Amount must be a positive number",
        });
      }

      // Validate frequency
      const validFrequencies = [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "yearly",
      ];
      if (!validFrequencies.includes(frequency)) {
        return createResponse(400, {
          error: `Frequency must be one of: ${validFrequencies.join(", ")}`,
        });
      }

      // Validate lengths
      if (
        title.length > 255 ||
        category.length > 100 ||
        (notes && notes.length > 1000)
      ) {
        return createResponse(400, {
          error: "Payload size limits exceeded",
        });
      }

      // Calculate next_date (same as start_date initially)
      const nextDate = start_date;

      const result = await query(
        `INSERT INTO recurring_expenses 
         (user_id, title, amount, category, frequency, start_date, end_date, next_date, is_active, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
         RETURNING id, title, amount, category, frequency, start_date, end_date, next_date, is_active, notes, created_at, updated_at`,
        [
          userId,
          title.trim(),
          parseFloat(amount),
          category,
          frequency,
          start_date,
          end_date || null,
          nextDate,
          notes?.trim() || null,
        ],
      );

      return createResponse(201, {
        message: "Recurring expense created",
        item: result.rows[0],
      });
    }

    // PUT — update recurring expense
    if (event.httpMethod === "PUT") {
      if (!itemId) {
        return createResponse(400, { error: "Item ID is required" });
      }

      const {
        title,
        amount,
        category,
        frequency,
        start_date,
        end_date,
        next_date,
        is_active,
        notes,
      } = JSON.parse(event.body);

      // Check ownership
      const checkResult = await query(
        "SELECT id FROM recurring_expenses WHERE id = $1 AND user_id = $2",
        [itemId, userId],
      );

      if (checkResult.rows.length === 0) {
        return createResponse(404, { error: "Recurring expense not found" });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramIdx = 1;

      if (title !== undefined) {
        if (title.length > 255) {
          return createResponse(400, {
            error: "Title must be 255 characters or less",
          });
        }
        updates.push(`title = $${paramIdx}`);
        values.push(title.trim());
        paramIdx++;
      }

      if (amount !== undefined) {
        if (isNaN(amount) || parseFloat(amount) <= 0) {
          return createResponse(400, {
            error: "Amount must be a positive number",
          });
        }
        updates.push(`amount = $${paramIdx}`);
        values.push(parseFloat(amount));
        paramIdx++;
      }

      if (category !== undefined) {
        if (category.length > 100) {
          return createResponse(400, {
            error: "Category must be 100 characters or less",
          });
        }
        updates.push(`category = $${paramIdx}`);
        values.push(category);
        paramIdx++;
      }

      if (frequency !== undefined) {
        const validFrequencies = [
          "daily",
          "weekly",
          "biweekly",
          "monthly",
          "quarterly",
          "yearly",
        ];
        if (!validFrequencies.includes(frequency)) {
          return createResponse(400, {
            error: `Frequency must be one of: ${validFrequencies.join(", ")}`,
          });
        }
        updates.push(`frequency = $${paramIdx}`);
        values.push(frequency);
        paramIdx++;
      }

      if (start_date !== undefined) {
        updates.push(`start_date = $${paramIdx}`);
        values.push(start_date);
        paramIdx++;
      }

      if (end_date !== undefined) {
        updates.push(`end_date = $${paramIdx}`);
        values.push(end_date || null);
        paramIdx++;
      }

      if (next_date !== undefined) {
        updates.push(`next_date = $${paramIdx}`);
        values.push(next_date);
        paramIdx++;
      }

      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIdx}`);
        values.push(is_active);
        paramIdx++;
      }

      if (notes !== undefined) {
        if (notes && notes.length > 1000) {
          return createResponse(400, {
            error: "Notes must be 1000 characters or less",
          });
        }
        updates.push(`notes = $${paramIdx}`);
        values.push(notes?.trim() || null);
        paramIdx++;
      }

      if (updates.length === 0) {
        return createResponse(400, { error: "No fields to update" });
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(itemId, userId);

      const result = await query(
        `UPDATE recurring_expenses SET ${updates.join(", ")}
         WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1}
         RETURNING id, title, amount, category, frequency, start_date, end_date, next_date, is_active, notes, created_at, updated_at`,
        values,
      );

      return createResponse(200, {
        message: "Recurring expense updated",
        item: result.rows[0],
      });
    }

    // DELETE — delete recurring expense
    if (event.httpMethod === "DELETE") {
      if (!itemId) {
        return createResponse(400, { error: "Item ID is required" });
      }

      // Check ownership
      const checkResult = await query(
        "SELECT id FROM recurring_expenses WHERE id = $1 AND user_id = $2",
        [itemId, userId],
      );

      if (checkResult.rows.length === 0) {
        return createResponse(404, { error: "Recurring expense not found" });
      }

      await query(
        "DELETE FROM recurring_expenses WHERE id = $1 AND user_id = $2",
        [itemId, userId],
      );

      return createResponse(200, { message: "Recurring expense deleted" });
    }

    return createResponse(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Recurring expenses error:", error.message);
    return createResponse(500, { error: "Internal server error" });
  }
};
