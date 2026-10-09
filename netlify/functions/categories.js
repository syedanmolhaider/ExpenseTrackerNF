const { query } = require("./utils/db");
const { createResponse } = require("./utils/auth");
const { withMiddleware } = require("./utils/middleware");

// Default categories that cannot be edited or deleted
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

let tableVerified = false;

async function ensureTableExists() {
  if (tableVerified) return;
  try {
    console.log("Verifying user_categories table schema...");

    // 1. Create table if not exists with user_id as VARCHAR(255) to accommodate UUID / text user IDs
    await query(`
      CREATE TABLE IF NOT EXISTS user_categories (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(10) DEFAULT '📦',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Drop any legacy integer foreign key constraint that causes type mismatch with UUID user IDs
    try {
      await query(`ALTER TABLE user_categories DROP CONSTRAINT IF EXISTS user_categories_user_id_fkey`);
    } catch (e) {
      console.log("Drop constraint note:", e.message);
    }

    // 3. Alter user_id column type to VARCHAR(255) if it was previously INTEGER
    try {
      await query(`ALTER TABLE user_categories ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::VARCHAR(255)`);
    } catch (e) {
      console.log("Alter user_id type note:", e.message);
    }

    // 4. Ensure additional columns exist
    try {
      await query(`ALTER TABLE user_categories ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE`);
    } catch (e) {}

    try {
      await query(`ALTER TABLE user_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    } catch (e) {}

    // 5. Ensure index on user_id for fast lookups
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_user_categories_user_id ON user_categories(user_id)`);
    } catch (e) {}

    tableVerified = true;
    console.log("✓ user_categories table schema verified successfully");
  } catch (err) {
    console.error("Warning in ensureTableExists:", err.message);
    // Do not throw so that API handler can still run gracefully
  }
}

exports.handler = withMiddleware({ rateLimitPrefix: "categories" }, async (event, context, user) => {
  try {
    // Ensure database table exists before handling requests
    await ensureTableExists();

    const userId = String(user.userId);
    const pathParts = event.path.replace(/\/$/, "").split("/");
    const lastPart = pathParts[pathParts.length - 1];
    let categoryId = lastPart !== "categories" ? lastPart : null;

    if (!categoryId && event.queryStringParameters && event.queryStringParameters.id) {
      categoryId = event.queryStringParameters.id;
    }

    // -------------------------------------------------------------
    // GET — fetch all categories for user (defaults + custom)
    // -------------------------------------------------------------
    if (event.httpMethod === "GET") {
      let customCategories = [];

      try {
        const customResult = await query(
          `SELECT id, name, icon, is_default, created_at
           FROM user_categories
           WHERE user_id::text = $1::text
           ORDER BY name ASC`,
          [userId],
        );
        customCategories = customResult.rows || [];
      } catch (err) {
        console.warn("user_categories query note:", err.message);
        customCategories = [];
      }

      // Single aggregation query for expense usage counts (no DB queries in loops)
      const usageMap = {};
      try {
        const usageResult = await query(
          `SELECT category, COUNT(*)::int as count 
           FROM expenses 
           WHERE user_id::text = $1::text 
           GROUP BY category`,
          [userId],
        );
        (usageResult.rows || []).forEach((row) => {
          if (row.category) {
            usageMap[row.category.toLowerCase()] = parseInt(row.count) || 0;
          }
        });
      } catch (err) {
        console.warn("expenses count note:", err.message);
      }

      // Single aggregation query for budget usage counts
      const budgetMap = {};
      try {
        const budgetResult = await query(
          `SELECT category, COUNT(*)::int as count 
           FROM budget_items 
           WHERE user_id::text = $1::text 
           GROUP BY category`,
          [userId],
        );
        (budgetResult.rows || []).forEach((row) => {
          if (row.category) {
            budgetMap[row.category.toLowerCase()] = parseInt(row.count) || 0;
          }
        });
      } catch (err) {
        console.warn("budget count note:", err.message);
      }

      // Combine default categories with custom ones
      const allCategories = [
        ...DEFAULT_CATEGORIES.map((cat, idx) => ({
          id: `default_${idx}`,
          name: cat.name,
          icon: cat.icon,
          is_default: true,
          usage_count: usageMap[cat.name.toLowerCase()] || 0,
        })),
        ...customCategories.map((cat) => {
          const key = (cat.name || "").toLowerCase();
          return {
            id: String(cat.id),
            name: cat.name,
            icon: cat.icon || "📦",
            is_default: false,
            created_at: cat.created_at,
            usage_count: (usageMap[key] || 0) + (budgetMap[key] || 0),
          };
        }),
      ];

      return createResponse(200, { categories: allCategories });
    }

    // -------------------------------------------------------------
    // POST — create new custom category
    // -------------------------------------------------------------
    if (event.httpMethod === "POST") {
      let body = {};
      try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
      } catch (e) {
        return createResponse(400, { error: "Invalid JSON body" });
      }

      const { name, icon } = body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return createResponse(400, { error: "Category name is required" });
      }

      const cleanName = name.trim();

      if (cleanName.length > 100) {
        return createResponse(400, {
          error: "Category name must be 100 characters or less",
        });
      }

      // Check if name conflicts with default category
      const isDefaultConflict = DEFAULT_CATEGORIES.some(
        (cat) => cat.name.toLowerCase() === cleanName.toLowerCase(),
      );
      if (isDefaultConflict) {
        return createResponse(400, {
          error: "Cannot create category with same name as a default category",
        });
      }

      // Check for duplicate custom category for this user
      try {
        const existing = await query(
          "SELECT id FROM user_categories WHERE user_id::text = $1::text AND LOWER(name) = LOWER($2)",
          [userId, cleanName],
        );

        if (existing.rows && existing.rows.length > 0) {
          return createResponse(400, {
            error: `Category "${cleanName}" already exists`,
          });
        }

        const categoryIcon = (icon && typeof icon === "string" && icon.trim()) ? icon.trim() : "📦";

        const result = await query(
          `INSERT INTO user_categories (user_id, name, icon, is_default)
           VALUES ($1, $2, $3, false)
           RETURNING id, name, icon, is_default, created_at`,
          [userId, cleanName, categoryIcon],
        );

        const newCat = result.rows[0];
        return createResponse(201, {
          message: `Category "${cleanName}" created successfully`,
          category: { ...newCat, id: String(newCat.id), usage_count: 0 },
        });
      } catch (err) {
        console.error("Error creating category:", err.message);
        return createResponse(500, {
          error: "Database error: " + err.message,
        });
      }
    }

    // -------------------------------------------------------------
    // PUT — update custom category
    // -------------------------------------------------------------
    if (event.httpMethod === "PUT") {
      if (!categoryId || categoryId.startsWith("default_")) {
        return createResponse(400, {
          error: "Default categories cannot be edited or deleted",
        });
      }

      let body = {};
      try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
      } catch (e) {
        return createResponse(400, { error: "Invalid JSON body" });
      }

      const { name, icon } = body;

      try {
        // Check ownership
        const checkResult = await query(
          "SELECT id, name FROM user_categories WHERE id = $1 AND user_id::text = $2::text",
          [categoryId, userId],
        );

        if (!checkResult.rows || checkResult.rows.length === 0) {
          return createResponse(404, { error: "Custom category not found" });
        }

        const oldName = checkResult.rows[0].name;

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramIdx = 1;

        if (name !== undefined) {
          const cleanName = String(name).trim();
          if (cleanName.length === 0) {
            return createResponse(400, {
              error: "Category name cannot be empty",
            });
          }
          if (cleanName.length > 100) {
            return createResponse(400, {
              error: "Category name must be 100 characters or less",
            });
          }

          // Check if new name conflicts with default category
          const isDefault = DEFAULT_CATEGORIES.some(
            (cat) => cat.name.toLowerCase() === cleanName.toLowerCase(),
          );
          if (isDefault) {
            return createResponse(400, {
              error: "Cannot rename to same name as a default category",
            });
          }

          // Check if new name conflicts with another custom category
          const dupCheck = await query(
            "SELECT id FROM user_categories WHERE user_id::text = $1::text AND LOWER(name) = LOWER($2) AND id != $3",
            [userId, cleanName, categoryId]
          );
          if (dupCheck.rows && dupCheck.rows.length > 0) {
            return createResponse(400, {
              error: `Category "${cleanName}" already exists`,
            });
          }

          updates.push(`name = $${paramIdx}`);
          values.push(cleanName);
          paramIdx++;
        }

        if (icon !== undefined) {
          const cleanIcon = String(icon).trim() || "📦";
          updates.push(`icon = $${paramIdx}`);
          values.push(cleanIcon);
          paramIdx++;
        }

        if (updates.length === 0) {
          return createResponse(400, { error: "No fields to update" });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(categoryId, userId);
        const result = await query(
          `UPDATE user_categories SET ${updates.join(", ")}
           WHERE id = $${paramIdx} AND user_id::text = $${paramIdx + 1}::text
           RETURNING id, name, icon, is_default, created_at, updated_at`,
          values,
        );

        // If name changed, synchronize existing expenses and budget items with old category name
        if (name && name.trim() !== oldName) {
          await query(
            "UPDATE expenses SET category = $1 WHERE category = $2 AND user_id::text = $3::text",
            [name.trim(), oldName, userId],
          );
          await query(
            "UPDATE budget_items SET category = $1 WHERE category = $2 AND user_id::text = $3::text",
            [name.trim(), oldName, userId],
          );
        }

        const updatedCat = result.rows[0];
        return createResponse(200, {
          message: "Category updated successfully",
          category: { ...updatedCat, id: String(updatedCat.id) },
        });
      } catch (err) {
        console.error("Error updating category:", err.message);
        return createResponse(500, {
          error: "Error updating category: " + err.message,
        });
      }
    }

    // -------------------------------------------------------------
    // DELETE — delete custom category
    // -------------------------------------------------------------
    if (event.httpMethod === "DELETE") {
      if (!categoryId || categoryId.startsWith("default_")) {
        return createResponse(400, {
          error: "Default categories cannot be edited or deleted",
        });
      }

      try {
        // Check ownership
        const checkResult = await query(
          "SELECT id, name FROM user_categories WHERE id = $1 AND user_id::text = $2::text",
          [categoryId, userId],
        );

        if (!checkResult.rows || checkResult.rows.length === 0) {
          return createResponse(404, { error: "Custom category not found" });
        }

        const categoryName = checkResult.rows[0].name;

        // Check if category is currently used in expenses or budget items
        const expenseCount = await query(
          "SELECT COUNT(*)::int as count FROM expenses WHERE category = $1 AND user_id::text = $2::text",
          [categoryName, userId],
        );

        const budgetCount = await query(
          "SELECT COUNT(*)::int as count FROM budget_items WHERE category = $1 AND user_id::text = $2::text",
          [categoryName, userId],
        );

        const totalUsage =
          parseInt(expenseCount.rows[0]?.count || 0) +
          parseInt(budgetCount.rows[0]?.count || 0);

        if (totalUsage > 0) {
          return createResponse(400, {
            error: `Cannot delete category "${categoryName}" — it is currently used in ${totalUsage} expense(s) or budget item(s). Please reassign or delete them first.`,
            usage_count: totalUsage,
          });
        }

        // Delete category
        await query(
          "DELETE FROM user_categories WHERE id = $1 AND user_id::text = $2::text",
          [categoryId, userId],
        );

        return createResponse(200, {
          message: `Category "${categoryName}" deleted successfully`,
        });
      } catch (err) {
        console.error("Error deleting category:", err.message);
        return createResponse(500, {
          error: "Error deleting category: " + err.message,
        });
      }
    }

    return createResponse(405, { error: "Method not allowed" });
  } catch (globalErr) {
    console.error("Unhandled error in categories function:", globalErr);
    return createResponse(500, {
      error: "Server error in categories: " + globalErr.message,
    });
  }
});
