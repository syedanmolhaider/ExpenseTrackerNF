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
    const hasDbUrl = !!process.env.DATABASE_URL;
    const hasJwtSecret = !!process.env.JWT_SECRET;
    const dbUrlLength = process.env.DATABASE_URL
      ? process.env.DATABASE_URL.length
      : 0;

    return createResponse(200, {
      environment: process.env.NODE_ENV || "development",
      hasDbUrl,
      hasJwtSecret,
      dbUrlLength,
      dbUrlPreview: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.substring(0, 20) + "..."
        : "NOT SET",
    });
  } catch (error) {
    console.error("Test error:", error);
    return createResponse(500, { error: error.message });
  }
};
