const { getUserFromRequest, createResponse } = require("./auth");
const { rateLimitCheck } = require("./rate-limit");

/**
 * Middleware wrapper for Netlify functions
 * Handles CORS, Rate Limiting, and Authentication automatically.
 *
 * @param {Object} options Configuration for the route
 * @param {boolean} options.requireAuth Whether the route requires authentication (default: true)
 * @param {string} options.rateLimitPrefix Prefix for rate limiting (default: "global")
 * @param {number} options.maxRequests Max requests for rate limiting (default: 60)
 * @param {Function} handler The actual route handler function
 */
function withMiddleware(options, handler) {
  // Allow passing handler directly if no options provided
  if (typeof options === "function") {
    handler = options;
    options = {};
  }

  const { requireAuth = true, rateLimitPrefix = "global", maxRequests = 60 } = options;

  return async (event, context) => {
    // 1. Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return createResponse(200, { message: "OK" });
    }

    // 2. Rate Limiting
    const limited = rateLimitCheck(event, {
      maxRequests,
      windowMs: 60000,
      prefix: rateLimitPrefix,
    });
    if (limited) return limited;

    // 3. Authentication
    let user = null;
    if (requireAuth) {
      user = getUserFromRequest(event);
      if (!user) {
        return createResponse(401, { error: "Unauthorized" });
      }
    }

    // 4. Execute the actual handler
    try {
      // Pass user explicitly so the handler doesn't need to extract it again
      return await handler(event, context, user);
    } catch (error) {
      console.error(`Error in ${rateLimitPrefix} handler:`, error);
      return createResponse(500, { error: "Internal server error" });
    }
  };
}

module.exports = {
  withMiddleware,
};
