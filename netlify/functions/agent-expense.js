const { query } = require("./utils/db");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  // Only allow POST, PUT, DELETE
  if (!["POST", "PUT", "DELETE"].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { title, amount, category, date, notes, user_id } = JSON.parse(event.body || "{}");

    // POST: Create new expense
    if (event.httpMethod === "POST") {
      // Validate required fields...
      [..rest of code unchanged ..]
    }

    // PUT/DELETE: require expense ID in path
    if (event.httpMethod === "PUT" || event.httpMethod === "DELETE") {
      const pathParts = event.path.replace(/\/$/, "").split("/");
      const expenseId = pathParts[pathParts.length - 1];
      if (!expenseId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Expense ID required" }) };
      }
    }

    // PUT: Update expense
    if (event.httpMethod === "PUT") {
      // Validate fields
      if (!title || !amount || !category || !date) {
        return { statusCode: 400, body: JSON.stringify({ error: "Title, amount, category, date required" }) };
      }
      const result = await query(
        `UPDATE expenses SET title=$1, amount=$2, category=$3, date=$4, notes=$5, updated_at=CURRENT_TIMESTAMP 
         WHERE id=$6 AND user_id=$7 RETURNING *`,
        [title.trim(), parseFloat(amount), category, date, notes?.trim()||null, expenseId, user_id]
      );
      if (result.rows.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: "Expense not found or unauthorized" }) };
      }
      return { statusCode: 200, headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}, body: JSON.stringify({ message:"Updated", expense: result.rows[0] }) };
    }

    // DELETE: Remove expense
    if (event.httpMethod === "DELETE") {
      const delResult = await query("DELETE FROM expenses WHERE id=$1 AND user_id=$2", [expenseId, user_id]);
      if (delResult.rowCount === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: "Expense not found or unauthorized" }) };
      }
      return { statusCode: 200, headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}, body: JSON.stringify({ message:"Deleted" }) };
    }

  } catch (error) { [.. unchanged ..] }
};
