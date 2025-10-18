const { clearAuthCookie, createResponse } = require("./utils/auth");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  if (event.httpMethod !== "POST") {
    return createResponse(405, { error: "Method not allowed" });
  }

  const clearCookie = clearAuthCookie();

  return createResponse(
    200,
    {
      message: "Logout successful",
    },
    clearCookie
  );
};
