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

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { title, amount, category, date, notes, user_id } = JSON.parse(event.body);

    // Validate required fields
    if (!title || !amount || !category || !date) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Title, amount, category, date, and user_id are required",
        }),
      };
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Amount must be a positive number" }),
      };
    }

    // Insert expense
    const result = await query(
      `INSERT INTO expenses (user_id, title, amount, category, date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, amount, category, date, notes, created_at`,
      [user_id, title.trim(), parseFloat(amount), category, date, notes?.trim() || null]
    );

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Expense added successfully",
        expense: result.rows[0],
      }),
    };
  } catch (error) {
    console.error("Agent expense add error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
