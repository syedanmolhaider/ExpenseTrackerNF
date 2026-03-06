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

        if (event.httpMethod === "GET") {
            const result = await query(
                "SELECT month_start_day, currency FROM user_settings WHERE user_id = $1",
                [userId]
            );
            if (result.rows.length === 0) {
                return createResponse(200, { settings: { month_start_day: 1, currency: 'Rs' } });
            }
            return createResponse(200, { settings: result.rows[0] });
        }

        if (event.httpMethod === "PUT" || event.httpMethod === "POST") {
            const { month_start_day, currency } = JSON.parse(event.body);

            const day = parseInt(month_start_day, 10) || 1;
            const curr = currency || 'Rs';

            if (day < 1 || day > 28) {
                return createResponse(400, { error: "Month start day must be between 1 and 28" });
            }

            const result = await query(
                `INSERT INTO user_settings (user_id, month_start_day, currency) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (user_id) DO UPDATE 
         SET month_start_day = EXCLUDED.month_start_day, 
             currency = EXCLUDED.currency, 
             updated_at = CURRENT_TIMESTAMP 
         RETURNING month_start_day, currency`,
                [userId, day, curr]
            );

            return createResponse(200, {
                message: "Settings updated",
                settings: result.rows[0],
            });
        }

        return createResponse(405, { error: "Method not allowed" });
    } catch (error) {
        console.error("Settings error:", error);
        return createResponse(500, { error: "Internal server error" });
    }
};
