const { query } = require("./utils/db");
const { createResponse } = require("./utils/auth");
const { withMiddleware } = require("./utils/middleware");

exports.handler = withMiddleware({ rateLimitPrefix: "reset", maxRequests: 3 }, async (event, context, user) => {
        const userId = user.userId;

        // Only allow DELETE method
        if (event.httpMethod !== "DELETE") {
            return createResponse(405, { error: "Method not allowed" });
        }

        // Delete all user data across all months
        await query("DELETE FROM expenses WHERE user_id = $1", [userId]);
        await query("DELETE FROM budget_items WHERE user_id = $1", [userId]);
        await query("DELETE FROM income WHERE user_id = $1", [userId]);

        return createResponse(200, {
            message: "All data has been reset successfully",
        });
});
