const { query } = require("./utils/db");
const { createResponse } = require("./utils/auth");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  if (event.httpMethod !== "GET") {
    return createResponse(405, { error: "Method not allowed" });
  }

  try {
    // Test database connection
    const result = await query(
      "SELECT NOW() as current_time, version() as pg_version"
    );

    return createResponse(200, {
      status: "Database connected successfully!",
      currentTime: result.rows[0].current_time,
      pgVersion: result.rows[0].pg_version.substring(0, 50) + "...",
      rowCount: result.rowCount,
    });
  } catch (error) {
    console.error("Database test error:", error);
    return createResponse(500, {
      error: "Database connection failed",
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
  }
};
