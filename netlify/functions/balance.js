const { query } = require("./utils/db");
const { getUserFromRequest, createResponse } = require("./utils/auth");

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return createResponse(200, { message: "OK" });
    }

    try {
        // Authenticate user
        const decoded = getUserFromRequest(event);
        if (!decoded) {
            return createResponse(401, { error: "Unauthorized" });
        }

        const userId = decoded.userId;
        const params = event.queryStringParameters || {};

        // Handle GET - fetch balance for a month
        if (event.httpMethod === "GET") {
            const month = params.month;
            if (!month) {
                return createResponse(400, { error: "Month parameter is required (YYYY-MM)" });
            }

            const result = await query(
                `SELECT available_balance FROM monthly_balance 
         WHERE user_id = $1 AND month = $2`,
                [userId, month]
            );

            const balance = result.rows.length > 0 ? parseFloat(result.rows[0].available_balance) : 0;

            return createResponse(200, { balance });
        }

        // Handle POST/PUT - set balance for a month
        if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
            const { month, balance } = JSON.parse(event.body);

            if (!month || balance === undefined || balance === null) {
                return createResponse(400, { error: "Month and balance are required" });
            }

            if (isNaN(balance) || parseFloat(balance) < 0) {
                return createResponse(400, { error: "Balance must be a non-negative number" });
            }

            // Upsert balance
            const result = await query(
                `INSERT INTO monthly_balance (user_id, month, available_balance) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (user_id, month) 
         DO UPDATE SET available_balance = $3, updated_at = CURRENT_TIMESTAMP 
         RETURNING available_balance`,
                [userId, month, parseFloat(balance)]
            );

            return createResponse(200, {
                message: "Balance updated",
                balance: parseFloat(result.rows[0].available_balance),
            });
        }

        return createResponse(405, { error: "Method not allowed" });
    } catch (error) {
        console.error("Balance error:", error);
        return createResponse(500, { error: "Internal server error" });
    }
};
