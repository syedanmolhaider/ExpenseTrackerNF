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
        const pathParts = event.path.split("/");
        const params = event.queryStringParameters || {};

        // Determine if this is an item-specific request (has ID in path)
        // Path patterns: /api/budget, /api/budget/:id, /api/budget/:id/toggle
        const lastPart = pathParts[pathParts.length - 1];
        const secondLast = pathParts[pathParts.length - 2];
        const isToggle = lastPart === "toggle";
        const itemId = isToggle ? secondLast : (lastPart !== "budget" ? lastPart : null);

        // Auto migrate category column (fails silently if already exists)
        try {
            await query("ALTER TABLE budget_items ADD COLUMN category VARCHAR(100) DEFAULT 'Other'");
            await query("UPDATE budget_items SET category = title WHERE category = 'Other' OR category IS NULL");
        } catch (e) { }

        // Handle GET - fetch budget items for a month
        if (event.httpMethod === "GET") {
            const month = params.month;
            if (!month) {
                return createResponse(400, { error: "Month parameter is required (YYYY-MM)" });
            }

            const result = await query(
                `SELECT id, title, category, amount, is_done, created_at, updated_at 
         FROM budget_items 
         WHERE user_id = $1 AND month = $2 
         ORDER BY is_done ASC, created_at ASC`,
                [userId, month]
            );

            return createResponse(200, { items: result.rows });
        }

        // Handle POST - create new budget item
        if (event.httpMethod === "POST") {
            const { title, category, amount, month } = JSON.parse(event.body);

            if (!title || !category || !amount || !month) {
                return createResponse(400, { error: "Title, category, amount, and month are required" });
            }

            if (isNaN(amount) || parseFloat(amount) <= 0) {
                return createResponse(400, { error: "Amount must be a positive number" });
            }

            const result = await query(
                `INSERT INTO budget_items (user_id, title, category, amount, month) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, title, category, amount, is_done, created_at, updated_at`,
                [userId, title, category, parseFloat(amount), month]
            );

            return createResponse(201, {
                message: "Budget item created",
                item: result.rows[0],
            });
        }

        // Handle PUT - update budget item or toggle done status
        if (event.httpMethod === "PUT") {
            if (!itemId) {
                return createResponse(400, { error: "Item ID is required" });
            }

            // Check ownership
            const checkResult = await query(
                "SELECT id, is_done FROM budget_items WHERE id = $1 AND user_id = $2",
                [itemId, userId]
            );

            if (checkResult.rows.length === 0) {
                return createResponse(404, { error: "Budget item not found" });
            }

            // Toggle done status
            if (isToggle) {
                const currentDone = checkResult.rows[0].is_done;
                const result = await query(
                    `UPDATE budget_items 
           SET is_done = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 AND user_id = $3 
           RETURNING id, title, amount, is_done, created_at, updated_at`,
                    [!currentDone, itemId, userId]
                );

                return createResponse(200, {
                    message: "Budget item toggled",
                    item: result.rows[0],
                });
            }

            // Regular update
            const { title, category, amount } = JSON.parse(event.body);

            if (!title || !category || !amount) {
                return createResponse(400, { error: "Title, category, and amount are required" });
            }

            const result = await query(
                `UPDATE budget_items 
         SET title = $1, category = $2, amount = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 AND user_id = $5 
         RETURNING id, title, category, amount, is_done, created_at, updated_at`,
                [title, category, parseFloat(amount), itemId, userId]
            );

            return createResponse(200, {
                message: "Budget item updated",
                item: result.rows[0],
            });
        }

        // Handle DELETE - delete budget item
        if (event.httpMethod === "DELETE") {
            if (!itemId) {
                return createResponse(400, { error: "Item ID is required" });
            }

            const checkResult = await query(
                "SELECT id FROM budget_items WHERE id = $1 AND user_id = $2",
                [itemId, userId]
            );

            if (checkResult.rows.length === 0) {
                return createResponse(404, { error: "Budget item not found" });
            }

            await query("DELETE FROM budget_items WHERE id = $1 AND user_id = $2", [
                itemId,
                userId,
            ]);

            return createResponse(200, { message: "Budget item deleted" });
        }

        return createResponse(405, { error: "Method not allowed" });
    } catch (error) {
        console.error("Budget error:", error);
        return createResponse(500, { error: "Internal server error" });
    }
};
