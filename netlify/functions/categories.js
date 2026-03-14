const { query } = require("./utils/db");
const { getUserFromRequest, createResponse } = require("./utils/auth");
const { rateLimitCheck } = require("./utils/rate-limit");

// Default categories that cannot be deleted
const DEFAULT_CATEGORIES = [
  { name: "Food", icon: "🍔" },
  { name: "Transport", icon: "🚗" },
  { name: "Entertainment", icon: "🎬" },
  { name: "Shopping", icon: "🛍️" },
  { name: "Bills", icon: "📄" },
  { name: "Healthcare", icon: "⚕️" },
  { name: "Education", icon: "📚" },
  { name: "Loan", icon: "🏦" },
  { name: "Rent", icon: "🏠" },
  { name: "Parents", icon: "👨‍👩‍👧" },
  { name: "Investment", icon: "📈" },
  { name: "Unexpected", icon: "⚠️" },
  { name: "Maintenance", icon: "🛠️" },
  { name: "Household", icon: "🪑" },
  { name: "Personal Care", icon: "🧴" },
  { name: "Savings", icon: "💰" },
  { name: "Dining Out", icon: "🍽️" },
  { name: "Other", icon: "📦" },
];

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  // Rate limit: 60 requests per minute per IP
  const limited = rateLimitCheck(event, {
    maxRequests: 60,
    windowMs: 60000,
    prefix: "categories",
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
    const categoryId = lastPart !== "categories" ? lastPart : null;

    // GET — fetch all categories for user (defaults + custom)
    if (event.httpMethod === "GET") {
      // Get custom categories from database
      const customResult = await query(
        `SELECT id, name, icon, is_default, created_at,
                (SELECT COUNT(*) FROM expenses WHERE category = uc.name AND user_id = uc.user_id) as usage_count
         FROM user_categories uc
         WHERE user_id = $1
         ORDER BY name ASC`,
        [userId],
      );

      // Combine default categories with custom ones
      const customCategories = customResult.rows;
      const allCategories = [
        ...DEFAULT_CATEGORIES.map((cat, idx) => ({
          id: `default_${idx}`,
          name: cat.name,
          icon: cat.icon,
          is_default: true,
          usage_count: 0,
        })),
        ...customCategories.map((cat) => ({
          ...cat,
          is_default: false,
        })),
      ];

      // Get usage counts for default categories
      for (const cat of allCategories) {
        if (cat.is_default) {
          const usageResult = await query(
            "SELECT COUNT(*) as count FROM expenses WHERE category = $1 AND user_id = $2",
            [cat.name, userId],
          );
          cat.usage_count = parseInt(usageResult.rows[0].count) || 0;
        }
      }

      return createResponse(200, { categories: allCategories });
    }

    // POST — create new custom category
    if (event.httpMethod === "POST") {
      const { name, icon } = JSON.parse(event.body);

      if (!name || name.trim().length === 0) {
        return createResponse(400, { error: "Category name is required" });
      }

      if (name.length > 100) {
        return createResponse(400, {
          error: "Category name must be 100 characters or less",
        });
      }

      // Check if name conflicts with default category
      const isDefault = DEFAULT_CATEGORIES.some(
        (cat) => cat.name.toLowerCase() === name.trim().toLowerCase(),
      );
      if (isDefault) {
        return createResponse(400, {
          error: "Cannot create category with same name as default category",
        });
      }

      // Check for duplicate custom category
      const existing = await query(
        "SELECT id FROM user_categories WHERE user_id = $1 AND LOWER(name) = LOWER($2)",
        [userId, name.trim()],
      );

      if (existing.rows.length > 0) {
        return createResponse(400, {
          error: "A category with this name already exists",
        });
      }

      const categoryIcon = icon || "📦";

      const result = await query(
        `INSERT INTO user_categories (user_id, name, icon, is_default)
         VALUES ($1, $2, $3, false)
         RETURNING id, name, icon, is_default, created_at`,
        [userId, name.trim(), categoryIcon],
      );

      return createResponse(201, {
        message: "Category created successfully",
        category: { ...result.rows[0], usage_count: 0 },
      });
    }

    // PUT — update custom category
    if (event.httpMethod === "PUT") {
      if (!categoryId || categoryId.startsWith("default_")) {
        return createResponse(400, {
          error: "Cannot update default categories",
        });
      }

      const { name, icon } = JSON.parse(event.body);

      // Check ownership
      const checkResult = await query(
        "SELECT id, name FROM user_categories WHERE id = $1 AND user_id = $2",
        [categoryId, userId],
      );

      if (checkResult.rows.length === 0) {
        return createResponse(404, { error: "Category not found" });
      }

      const oldName = checkResult.rows[0].name;

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramIdx = 1;

      if (name !== undefined) {
        if (name.trim().length === 0) {
          return createResponse(400, {
            error: "Category name cannot be empty",
          });
        }
        if (name.length > 100) {
          return createResponse(400, {
            error: "Category name must be 100 characters or less",
          });
        }

        // Check if new name conflicts with default category
        const isDefault = DEFAULT_CATEGORIES.some(
          (cat) => cat.name.toLowerCase() === name.trim().toLowerCase(),
        );
        if (isDefault) {
          return createResponse(400, {
            error: "Cannot rename to same name as default category",
          });
        }

        updates.push(`name = $${paramIdx}`);
        values.push(name.trim());
        paramIdx++;
      }

      if (icon !== undefined) {
        updates.push(`icon = $${paramIdx}`);
        values.push(icon || "📦");
        paramIdx++;
      }

      if (updates.length === 0) {
        return createResponse(400, { error: "No fields to update" });
      }

      values.push(categoryId, userId);
      const result = await query(
        `UPDATE user_categories SET ${updates.join(", ")}
         WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1}
         RETURNING id, name, icon, is_default, created_at`,
        values,
      );

      // If name changed, update all expenses with old category name
      if (name && name.trim() !== oldName) {
        await query(
          "UPDATE expenses SET category = $1 WHERE category = $2 AND user_id = $3",
          [name.trim(), oldName, userId],
        );
        await query(
          "UPDATE budget_items SET category = $1 WHERE category = $2 AND user_id = $3",
          [name.trim(), oldName, userId],
        );
      }

      return createResponse(200, {
        message: "Category updated successfully",
        category: result.rows[0],
      });
    }

    // DELETE — delete custom category
    if (event.httpMethod === "DELETE") {
      if (!categoryId || categoryId.startsWith("default_")) {
        return createResponse(400, {
          error: "Cannot delete default categories",
        });
      }

      // Check ownership
      const checkResult = await query(
        "SELECT id, name FROM user_categories WHERE id = $1 AND user_id = $2",
        [categoryId, userId],
      );

      if (checkResult.rows.length === 0) {
        return createResponse(404, { error: "Category not found" });
      }

      const categoryName = checkResult.rows[0].name;

      // Check if category is in use
      const expenseCount = await query(
        "SELECT COUNT(*) as count FROM expenses WHERE category = $1 AND user_id = $2",
        [categoryName, userId],
      );

      const budgetCount = await query(
        "SELECT COUNT(*) as count FROM budget_items WHERE category = $1 AND user_id = $2",
        [categoryName, userId],
      );

      const totalUsage =
        parseInt(expenseCount.rows[0].count) +
        parseInt(budgetCount.rows[0].count);

      if (totalUsage > 0) {
        return createResponse(400, {
          error: `Cannot delete category "${categoryName}" - it is used in ${totalUsage} expense(s) or budget item(s). Please reassign them first.`,
          usage_count: totalUsage,
        });
      }

      // Delete category
      await query(
        "DELETE FROM user_categories WHERE id = $1 AND user_id = $2",
        [categoryId, userId],
      );

      return createResponse(200, { message: "Category deleted successfully" });
    }

    return createResponse(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Categories error:", error.message);
    return createResponse(500, { error: "Internal server error" });
  }
};
