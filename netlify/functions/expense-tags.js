const { query } = require("./utils/db");
const { getUserFromRequest, createResponse } = require("./utils/auth");
const { rateLimitCheck } = require("./utils/rate-limit");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  // Rate limit: 60 requests per minute per IP
  const limited = rateLimitCheck(event, {
    maxRequests: 60,
    windowMs: 60000,
    prefix: "expense-tags",
  });
  if (limited) return limited;

  try {
    // Authenticate user
    const decoded = getUserFromRequest(event);
    if (!decoded) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const userId = decoded.userId;
    const pathParts = event.path.replace(/\/$/, "").split("/");

    // Path: /api/expenses/:expenseId/tags or /api/expenses/:expenseId/tags/:tagId
    const expenseIdIdx = pathParts.indexOf("expenses") + 1;
    const expenseId = pathParts[expenseIdIdx];
    const tagId =
      pathParts[pathParts.length - 1] !== "tags"
        ? pathParts[pathParts.length - 1]
        : null;

    if (!expenseId || expenseId === "tags") {
      return createResponse(400, { error: "Expense ID is required" });
    }

    // Verify expense belongs to user
    const expenseCheck = await query(
      "SELECT id FROM expenses WHERE id = $1 AND user_id = $2",
      [expenseId, userId],
    );

    if (expenseCheck.rows.length === 0) {
      return createResponse(404, { error: "Expense not found" });
    }

    // GET — fetch tags for an expense
    if (event.httpMethod === "GET") {
      const result = await query(
        `SELECT t.id, t.name, t.color
         FROM expense_tags t
         INNER JOIN expense_tag_map etm ON t.id = etm.tag_id
         WHERE etm.expense_id = $1 AND t.user_id = $2
         ORDER BY t.name ASC`,
        [expenseId, userId],
      );

      return createResponse(200, { tags: result.rows });
    }

    // POST — add tag to expense
    if (event.httpMethod === "POST") {
      const { tag_id } = JSON.parse(event.body);

      if (!tag_id) {
        return createResponse(400, { error: "Tag ID is required" });
      }

      // Verify tag belongs to user
      const tagCheck = await query(
        "SELECT id FROM expense_tags WHERE id = $1 AND user_id = $2",
        [tag_id, userId],
      );

      if (tagCheck.rows.length === 0) {
        return createResponse(404, { error: "Tag not found" });
      }

      // Check if mapping already exists
      const existingMapping = await query(
        "SELECT expense_id FROM expense_tag_map WHERE expense_id = $1 AND tag_id = $2",
        [expenseId, tag_id],
      );

      if (existingMapping.rows.length > 0) {
        return createResponse(400, {
          error: "Tag already added to this expense",
        });
      }

      // Create mapping
      await query(
        "INSERT INTO expense_tag_map (expense_id, tag_id) VALUES ($1, $2)",
        [expenseId, tag_id],
      );

      // Get the tag details to return
      const tag = tagCheck.rows[0];
      const tagDetails = await query(
        "SELECT id, name, color FROM expense_tags WHERE id = $1",
        [tag_id],
      );

      return createResponse(201, {
        message: "Tag added to expense",
        tag: tagDetails.rows[0],
      });
    }

    // DELETE — remove tag from expense
    if (event.httpMethod === "DELETE") {
      if (!tagId) {
        return createResponse(400, { error: "Tag ID is required" });
      }

      // Verify tag belongs to user
      const tagCheck = await query(
        "SELECT id FROM expense_tags WHERE id = $1 AND user_id = $2",
        [tagId, userId],
      );

      if (tagCheck.rows.length === 0) {
        return createResponse(404, { error: "Tag not found" });
      }

      // Remove mapping
      const result = await query(
        "DELETE FROM expense_tag_map WHERE expense_id = $1 AND tag_id = $2",
        [expenseId, tagId],
      );

      if (result.rowCount === 0) {
        return createResponse(404, {
          error: "Tag not associated with this expense",
        });
      }

      return createResponse(200, { message: "Tag removed from expense" });
    }

    return createResponse(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Expense tags error:", error.message);
    return createResponse(500, { error: "Internal server error" });
  }
};
