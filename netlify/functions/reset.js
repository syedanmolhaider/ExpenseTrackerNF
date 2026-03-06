const { query } = require("./utils/db");
const { getUserFromRequest, createResponse } = require("./utils/auth");

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return createResponse(200, { message: "OK" });
    }

    try {
        const decoded = getUserFromRequest(event);
        if (!decoded) {
            return createResponse(401, { error: "Unauthorized" });
        }

        const userId = decoded.userId;

        // Only allow DELETE method
        if (event.httpMethod !== "DELETE") {
            return createResponse(405, { error: "Method not allowed" });
        }

        // Delete all user data across all months
        await query("DELETE FROM expenses WHERE user_id = $1", [userId]);
        await query("DELETE FROM budget_items WHERE user_id = $1", [userId]);
        await query("DELETE FROM monthly_balance WHERE user_id = $1", [userId]);

        // Also delete income if table exists
        try {
            await query("DELETE FROM income WHERE user_id = $1", [userId]);
        } catch (e) {
            // income table might not exist yet, ignore
        }

        return createResponse(200, {
            message: "All data has been reset successfully",
        });
    } catch (error) {
        console.error("Reset error:", error);
        return createResponse(500, { error: "Internal server error" });
    }
};
