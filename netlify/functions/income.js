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
        const pathParts = event.path.split("/");
        const params = event.queryStringParameters || {};
        const lastPart = pathParts[pathParts.length - 1];
        const incomeId = lastPart !== "income" ? lastPart : null;

        // GET — fetch income entries for a month (or all if no month param)
        if (event.httpMethod === "GET") {
            const month = params.month;
            let result;
            if (month) {
                result = await query(
                    `SELECT id, title, amount, source, date, notes, created_at 
           FROM income 
           WHERE user_id = $1 AND to_char(date, 'YYYY-MM') = $2 
           ORDER BY date DESC, created_at DESC`,
                    [userId, month]
                );
            } else {
                result = await query(
                    `SELECT id, title, amount, source, date, notes, created_at 
           FROM income 
           WHERE user_id = $1 
           ORDER BY date DESC, created_at DESC`,
                    [userId]
                );
            }

            return createResponse(200, { entries: result.rows });
        }

        // POST — add new income entry
        if (event.httpMethod === "POST") {
            const { title, amount, source, date, notes } = JSON.parse(event.body);

            if (!title || !amount || !date) {
                return createResponse(400, {
                    error: "Title, amount, and date are required",
                });
            }

            if (isNaN(amount) || parseFloat(amount) <= 0) {
                return createResponse(400, {
                    error: "Amount must be a positive number",
                });
            }

            const result = await query(
                `INSERT INTO income (user_id, title, amount, source, date, notes) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, title, amount, source, date, notes, created_at`,
                [userId, title, parseFloat(amount), source || "Other", date, notes || null]
            );

            return createResponse(201, {
                message: "Income entry added",
                entry: result.rows[0],
            });
        }

        // DELETE — delete income entry
        if (event.httpMethod === "DELETE") {
            if (!incomeId) {
                return createResponse(400, { error: "Income ID is required" });
            }

            const checkResult = await query(
                "SELECT id FROM income WHERE id = $1 AND user_id = $2",
                [incomeId, userId]
            );

            if (checkResult.rows.length === 0) {
                return createResponse(404, { error: "Income entry not found" });
            }

            await query("DELETE FROM income WHERE id = $1 AND user_id = $2", [
                incomeId,
                userId,
            ]);

            return createResponse(200, { message: "Income entry deleted" });
        }

        return createResponse(405, { error: "Method not allowed" });
    } catch (error) {
        console.error("Income error:", error);
        return createResponse(500, { error: "Internal server error" });
    }
};
