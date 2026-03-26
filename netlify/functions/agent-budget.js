const { query } = require("./utils/db");

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
        "Access-Control-Allow-Methods": "POST, PUT, DELETE, GET, OPTIONS",
      },
      body: JSON.stringify({ message: "OK" }),
    };
  }

  // Verify API key
  const apiKey = event.headers["x-api-key"];
  if (apiKey !== process.env.AGENT_API_KEY) {
    return {
      statusCode: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Invalid or missing API key" }),
    };
  }

  try {
    // Get user_id from query (GET) or body (POST/PUT)
    let userId;
    if (event.httpMethod === "GET") {
      userId = event.queryStringParameters?.user_id;
    } else {
      const body = event.body ? JSON.parse(event.body) : {};
      userId = body.user_id;
    }

    if (!userId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "user_id is required" }),
      };
    }

    // GET - fetch budget items for a month
    if (event.httpMethod === "GET") {
      const month = event.queryStringParameters?.month;
      if (!month) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "Month parameter is required (YYYY-MM)" }),
        };
      }

      const result = await query(
        `SELECT id, title, category, amount, is_done, created_at, updated_at 
         FROM budget_items 
         WHERE user_id = $1 AND month = $2 
         ORDER BY is_done ASC, created_at ASC`,
        [userId, month]
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ items: result.rows }),
      };
    }

    // POST - create new budget item
    if (event.httpMethod === "POST") {
      const { title, category, amount, month } = JSON.parse(event.body);

      if (!title || !category || !amount || !month) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "Title, category, amount, and month are required" }),
        };
      }

      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Amount must be positive" }) };
      }

      const result = await query(
        `INSERT INTO budget_items (user_id, title, category, amount, month) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, title, category, amount, is_done, created_at, updated_at`,
        [userId, title.trim(), category.trim(), parseFloat(amount), month]
      );

      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Budget item created", item: result.rows[0] }),
      };
    }

    // PUT - update budget item
    if (event.httpMethod === "PUT") {
      const pathParts = event.path.replace(/\/$/, "").split("/");
      const itemId = pathParts[pathParts.length - 1];

      if (!itemId) {
        return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Item ID required in path" }) };
      }

      const { title, category, amount } = JSON.parse(event.body);

      if (!title || !category || !amount) {
        return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Title, category, and amount are required" }) };
      }

      // Check ownership
      const checkResult = await query(
        "SELECT id FROM budget_items WHERE id = $1 AND user_id = $2",
        [itemId, userId]
      );

      if (checkResult.rows.length === 0) {
        return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Budget item not found or unauthorized" }) };
      }

      const result = await query(
        `UPDATE budget_items 
         SET title = $1, category = $2, amount = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 AND user_id = $5 
         RETURNING id, title, category, amount, is_done, created_at, updated_at`,
        [title.trim(), category.trim(), parseFloat(amount), itemId, userId]
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Budget item updated", item: result.rows[0] }),
      };
    }

    // DELETE - remove budget item
    if (event.httpMethod === "DELETE") {
      const pathParts = event.path.replace(/\/$/, "").split("/");
      const itemId = pathParts[pathParts.length - 1];

      if (!itemId) {
        return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Item ID required in path" }) };
      }

      const delResult = await query("DELETE FROM budget_items WHERE id = $1 AND user_id = $2", [itemId, userId]);

      if (delResult.rowCount === 0) {
        return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Budget item not found or unauthorized" }) };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Budget item deleted" }),
      };
    }

    return { statusCode: 405, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (error) {
    console.error("Agent budget API error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal server error", details: error.message }),
    };
  }
};
