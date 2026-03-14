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
    prefix: "expenses",
  });
  if (limited) return limited;

  try {
    // Authenticate user
    const decoded = getUserFromRequest(event);
    if (!decoded) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const userId = decoded.userId;
    const params = event.queryStringParameters || {};

    // Handle GET request - fetch expenses for user (with optional date range filter)
    if (event.httpMethod === "GET") {
      let sql = `SELECT e.id, e.title, e.amount, e.category, e.date, e.notes, e.created_at, e.updated_at,
                COALESCE(
                  json_agg(
                    json_build_object('id', t.id, 'name', t.name, 'color', t.color)
                  ) FILTER (WHERE t.id IS NOT NULL),
                  '[]'
                ) as tags
         FROM expenses e
         LEFT JOIN expense_tag_map etm ON e.id = etm.expense_id
         LEFT JOIN expense_tags t ON etm.tag_id = t.id
         WHERE e.user_id = $1`;
      const values = [userId];
      let paramIdx = 2;

      // Optional date range filtering for server-side pagination
      if (params.from) {
        sql += ` AND e.date >= $${paramIdx}`;
        values.push(params.from);
        paramIdx++;
      }
      if (params.to) {
        sql += ` AND e.date <= $${paramIdx}`;
        values.push(params.to);
        paramIdx++;
      }

      // Optional tag filter
      if (params.tag) {
        sql += ` AND EXISTS (
          SELECT 1 FROM expense_tag_map etm2 
          JOIN expense_tags t2 ON etm2.tag_id = t2.id 
          WHERE etm2.expense_id = e.id AND LOWER(t2.name) = LOWER($${paramIdx})
        )`;
        values.push(params.tag);
        paramIdx++;
      }

      sql += ` GROUP BY e.id ORDER BY e.date DESC, e.created_at DESC`;

      const result = await query(sql, values);

      return createResponse(200, {
        expenses: result.rows,
      });
    }

    // Handle POST request - create new expense
    if (event.httpMethod === "POST") {
      const { title, amount, category, date, notes } = JSON.parse(event.body);

      // Validate input
      if (!title || !amount || !category || !date) {
        return createResponse(400, {
          error: "Title, amount, category, and date are required",
        });
      }

      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return createResponse(400, {
          error: "Amount must be a positive number",
        });
      }

      if (
        title.length > 255 ||
        category.length > 100 ||
        (notes && notes.length > 1000)
      ) {
        return createResponse(400, {
          error:
            "Payload size limits exceeded (Title max 255, Category max 100, Notes max 1000)",
        });
      }

      const result = await query(
        `INSERT INTO expenses (user_id, title, amount, category, date, notes) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, title, amount, category, date, notes, created_at, updated_at`,
        [userId, title, parseFloat(amount), category, date, notes || null],
      );

      return createResponse(201, {
        message: "Expense created successfully",
        expense: result.rows[0],
      });
    }

    // Handle PUT request - update expense
    if (event.httpMethod === "PUT") {
      const pathParts = event.path.replace(/\/$/, "").split("/");
      const expenseId = pathParts[pathParts.length - 1];

      if (!expenseId) {
        return createResponse(400, { error: "Expense ID is required" });
      }

      const { title, amount, category, date, notes } = JSON.parse(event.body);

      // Validate input
      if (!title || !amount || !category || !date) {
        return createResponse(400, {
          error: "Title, amount, category, and date are required",
        });
      }

      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return createResponse(400, {
          error: "Amount must be a positive number",
        });
      }

      if (
        title.length > 255 ||
        category.length > 100 ||
        (notes && notes.length > 1000)
      ) {
        return createResponse(400, {
          error:
            "Payload size limits exceeded (Title max 255, Category max 100, Notes max 1000)",
        });
      }

      // Check if expense belongs to user
      const checkResult = await query(
        "SELECT id FROM expenses WHERE id = $1 AND user_id = $2",
        [expenseId, userId],
      );

      if (checkResult.rows.length === 0) {
        return createResponse(404, { error: "Expense not found" });
      }

      const result = await query(
        `UPDATE expenses 
         SET title = $1, amount = $2, category = $3, date = $4, notes = $5, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $6 AND user_id = $7 
         RETURNING id, title, amount, category, date, notes, created_at, updated_at`,
        [
          title,
          parseFloat(amount),
          category,
          date,
          notes || null,
          expenseId,
          userId,
        ],
      );

      return createResponse(200, {
        message: "Expense updated successfully",
        expense: result.rows[0],
      });
    }

    // Handle DELETE request - delete expense
    if (event.httpMethod === "DELETE") {
      const pathParts = event.path.replace(/\/$/, "").split("/");
      const expenseId = pathParts[pathParts.length - 1];

      if (!expenseId) {
        return createResponse(400, { error: "Expense ID is required" });
      }

      // Check if expense belongs to user
      const checkResult = await query(
        "SELECT id FROM expenses WHERE id = $1 AND user_id = $2",
        [expenseId, userId],
      );

      if (checkResult.rows.length === 0) {
        return createResponse(404, { error: "Expense not found" });
      }

      await query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [
        expenseId,
        userId,
      ]);

      return createResponse(200, {
        message: "Expense deleted successfully",
      });
    }

    return createResponse(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Expenses error:", error);
    return createResponse(500, { error: "Internal server error" });
  }
};
