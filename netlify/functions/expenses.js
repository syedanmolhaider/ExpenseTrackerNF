const { query } = require("./utils/db");
const { getUserFromRequest, createResponse } = require("./utils/auth");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  try {
    // Authenticate user
    const decoded = getUserFromRequest(event);
    if (!decoded) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const userId = decoded.userId;

    // Handle GET request - fetch all expenses for user
    if (event.httpMethod === "GET") {
      const result = await query(
        `SELECT id, title, amount, category, date, notes, created_at, updated_at 
         FROM expenses 
         WHERE user_id = $1 
         ORDER BY date DESC, created_at DESC`,
        [userId]
      );

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

      const result = await query(
        `INSERT INTO expenses (user_id, title, amount, category, date, notes) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, title, amount, category, date, notes, created_at, updated_at`,
        [userId, title, parseFloat(amount), category, date, notes || null]
      );

      return createResponse(201, {
        message: "Expense created successfully",
        expense: result.rows[0],
      });
    }

    // Handle PUT request - update expense
    if (event.httpMethod === "PUT") {
      const pathParts = event.path.split("/");
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

      // Check if expense belongs to user
      const checkResult = await query(
        "SELECT id FROM expenses WHERE id = $1 AND user_id = $2",
        [expenseId, userId]
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
        ]
      );

      return createResponse(200, {
        message: "Expense updated successfully",
        expense: result.rows[0],
      });
    }

    // Handle DELETE request - delete expense
    if (event.httpMethod === "DELETE") {
      const pathParts = event.path.split("/");
      const expenseId = pathParts[pathParts.length - 1];

      if (!expenseId) {
        return createResponse(400, { error: "Expense ID is required" });
      }

      // Check if expense belongs to user
      const checkResult = await query(
        "SELECT id FROM expenses WHERE id = $1 AND user_id = $2",
        [expenseId, userId]
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
