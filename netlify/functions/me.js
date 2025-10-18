const { query } = require("./utils/db");
const { getUserFromRequest, createResponse } = require("./utils/auth");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  if (event.httpMethod !== "GET") {
    return createResponse(405, { error: "Method not allowed" });
  }

  try {
    // Get user from JWT token
    const decoded = getUserFromRequest(event);

    if (!decoded) {
      return createResponse(401, { error: "Unauthorized" });
    }

    // Fetch user from database
    const result = await query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: "User not found" });
    }

    const user = result.rows[0];

    return createResponse(200, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return createResponse(500, { error: "Internal server error" });
  }
};
