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
    prefix: "tags",
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
    const lastPart = pathParts[pathParts.length - 1];
    const tagId = lastPart !== "tags" ? lastPart : null;

    // GET — fetch all tags for user
    if (event.httpMethod === "GET") {
      try {
        const result = await query(
          `SELECT t.id, t.name, t.color, t.created_at,
                  COUNT(etm.expense_id) as usage_count
           FROM expense_tags t
           LEFT JOIN expense_tag_map etm ON t.id = etm.tag_id
           WHERE t.user_id = $1
           GROUP BY t.id
           ORDER BY usage_count DESC, t.name ASC`,
          [userId],
        );

        return createResponse(200, { tags: result.rows });
      } catch (err) {
        console.log("Tags table not found, returning empty array");
        return createResponse(200, { tags: [] });
      }
    }

    // POST — create new tag
    if (event.httpMethod === "POST") {
      try {
        const { name, color } = JSON.parse(event.body);

        if (!name || name.trim().length === 0) {
          return createResponse(400, { error: "Tag name is required" });
        }

        if (name.length > 50) {
          return createResponse(400, {
            error: "Tag name must be 50 characters or less",
          });
        }

        // Validate color format (hex)
        const tagColor =
          color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#6c5ce7";

        // Check for duplicate tag name
        const existing = await query(
          "SELECT id FROM expense_tags WHERE user_id = $1 AND LOWER(name) = LOWER($2)",
          [userId, name.trim()],
        );

        if (existing.rows.length > 0) {
          return createResponse(400, {
            error: "A tag with this name already exists",
          });
        }

        const result = await query(
          `INSERT INTO expense_tags (user_id, name, color)
           VALUES ($1, $2, $3)
           RETURNING id, name, color, created_at`,
          [userId, name.trim(), tagColor],
        );

        return createResponse(201, {
          message: "Tag created successfully",
          tag: { ...result.rows[0], usage_count: 0 },
        });
      } catch (err) {
        console.error("Error creating tag:", err.message);
        return createResponse(500, {
          error: "Database table not found. Please run database setup first.",
        });
      }
    }

    // PUT — update tag
    if (event.httpMethod === "PUT") {
      if (!tagId) {
        return createResponse(400, { error: "Tag ID is required" });
      }

      try {
        const { name, color } = JSON.parse(event.body);

        // Check ownership
        const checkResult = await query(
          "SELECT id FROM expense_tags WHERE id = $1 AND user_id = $2",
          [tagId, userId],
        );

        if (checkResult.rows.length === 0) {
          return createResponse(404, { error: "Tag not found" });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramIdx = 1;

        if (name !== undefined) {
          if (name.trim().length === 0) {
            return createResponse(400, { error: "Tag name cannot be empty" });
          }
          if (name.length > 50) {
            return createResponse(400, {
              error: "Tag name must be 50 characters or less",
            });
          }
          updates.push(`name = $${paramIdx}`);
          values.push(name.trim());
          paramIdx++;
        }

        if (color !== undefined) {
          if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return createResponse(400, {
              error: "Invalid color format. Use hex format like #6c5ce7",
            });
          }
          updates.push(`color = $${paramIdx}`);
          values.push(color);
          paramIdx++;
        }

        if (updates.length === 0) {
          return createResponse(400, { error: "No fields to update" });
        }

        values.push(tagId, userId);
        const result = await query(
          `UPDATE expense_tags SET ${updates.join(", ")}
           WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1}
           RETURNING id, name, color, created_at`,
          values,
        );

        return createResponse(200, {
          message: "Tag updated successfully",
          tag: result.rows[0],
        });
      } catch (err) {
        console.error("Error updating tag:", err.message);
        return createResponse(500, {
          error: "Database table not found. Please run database setup first.",
        });
      }
    }

    // DELETE — delete tag
    if (event.httpMethod === "DELETE") {
      if (!tagId) {
        return createResponse(400, { error: "Tag ID is required" });
      }

      try {
        // Check ownership
        const checkResult = await query(
          "SELECT id FROM expense_tags WHERE id = $1 AND user_id = $2",
          [tagId, userId],
        );

        if (checkResult.rows.length === 0) {
          return createResponse(404, { error: "Tag not found" });
        }

        // Delete tag (cascade will remove mappings)
        await query("DELETE FROM expense_tags WHERE id = $1 AND user_id = $2", [
          tagId,
          userId,
        ]);

        return createResponse(200, { message: "Tag deleted successfully" });
      } catch (err) {
        console.error("Error deleting tag:", err.message);
        return createResponse(500, {
          error: "Database table not found. Please run database setup first.",
        });
      }
    }

    return createResponse(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Tags error:", error.message);
    return createResponse(500, { error: "Internal server error" });
  }
};
