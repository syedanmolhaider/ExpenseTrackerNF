const { query } = require("./utils/db");

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
        "Access-Control-Allow-Methods": "POST, PUT, DELETE, OPTIONS",
      },
      body: JSON.stringify({ message: "OK" }),
    };
  }

  // Verify API key
  const apiKey = event.headers["x-api-key"];
  if (apiKey !== process.env.AGENT_API_KEY) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Invalid or missing API key" }),
    };
  }

  // Allowed methods
  if (!["POST", "PUT", "DELETE"].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { title, amount, category, date, notes, user_id } = body;

    // Extract expense ID from path for PUT/DELETE
    let expenseId = null;
    if (event.httpMethod === "PUT" || event.httpMethod === "DELETE") {
      const pathParts = event.path.replace(/\/$/, "").split("/");
      expenseId = pathParts[pathParts.length - 1];
      if (!expenseId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Expense ID required in path" }) };
      }
    }

    // POST: Create new expense
    if (event.httpMethod === "POST") {
      if (!title || !amount || !category || !date || !user_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Title, amount, category, date, and user_id are required" }),
        };
      }
      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "Amount must be positive" }) };
      }

      const result = await query(
        `INSERT INTO expenses (user_id, title, amount, category, date, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, amount, category, date, notes, created_at`,
        [user_id, title.trim(), parseFloat(amount), category, date, notes?.trim() || null]
      );

      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Expense added", expense: result.rows[0] }),
      };
    }

    // PUT: Update expense
    if (event.httpMethod === "PUT") {
      if (!title || !amount || !category || !date || !user_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Title, amount, category, date, and user_id are required" }),
        };
      }
      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "Amount must be positive" }) };
      }

      const result = await query(
        `UPDATE expenses
         SET title=$1, amount=$2, category=$3, date=$4, notes=$5, updated_at=CURRENT_TIMESTAMP
         WHERE id=$6 AND user_id=$7
         RETURNING id, title, amount, category, date, notes, created_at, updated_at`,
        [title.trim(), parseFloat(amount), category, date, notes?.trim() || null, expenseId, user_id]
      );

      if (result.rows.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: "Expense not found or unauthorized" }) };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Expense updated", expense: result.rows[0] }),
      };
    }

    // DELETE: Remove expense
    if (event.httpMethod === "DELETE") {
      if (!user_id) {
        return { statusCode: 400, body: JSON.stringify({ error: "user_id is required" }) };
      }

      const delResult = await query("DELETE FROM expenses WHERE id=$1 AND user_id=$2", [expenseId, user_id]);

      if (delResult.rowCount === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: "Expense not found or unauthorized" }) };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Expense deleted" }),
      };
    }

  } catch (error) {
    console.error("Agent expense API error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
