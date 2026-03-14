const { query } = require("./utils/db");
const { createResponse } = require("./utils/auth");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  // Only allow POST for security
  if (event.httpMethod !== "POST") {
    return createResponse(405, { error: "Method not allowed" });
  }

  try {
    console.log("Starting database setup...");

    // Helper function to check if a table exists
    async function tableExists(tableName) {
      const result = await query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [tableName]
      );
      return result.rows[0].exists;
    }

    // Create users table (must be first - other tables reference it)
    if (!(await tableExists('users'))) {
      await query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("✓ users table created");
    } else {
      console.log("✓ users table already exists");
    }

    // Create expenses table
    if (!(await tableExists('expenses'))) {
      await query(`
        CREATE TABLE expenses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          category VARCHAR(100) NOT NULL,
          date DATE NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("✓ expenses table created");
    } else {
      console.log("✓ expenses table already exists");
    }

    // Create budget_items table
    if (!(await tableExists('budget_items'))) {
      await query(`
        CREATE TABLE budget_items (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          month VARCHAR(7) NOT NULL,
          is_done BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("✓ budget_items table created");
    } else {
      console.log("✓ budget_items table already exists");
    }

    // Create income table
    if (!(await tableExists('income'))) {
      await query(`
        CREATE TABLE income (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          source VARCHAR(100),
          date DATE NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("✓ income table created");
    } else {
      console.log("✓ income table already exists");
    }

    // Create user_settings table
    if (!(await tableExists('user_settings'))) {
      await query(`
        CREATE TABLE user_settings (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          month_start_day INTEGER DEFAULT 1,
          month_end_day INTEGER DEFAULT 0,
          currency VARCHAR(10) DEFAULT 'Rs',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("✓ user_settings table created");
    } else {
      console.log("✓ user_settings table already exists");
    }

    // Create expense_tags table
    if (!(await tableExists('expense_tags'))) {
      await query(`
        CREATE TABLE expense_tags (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(50) NOT NULL,
          color VARCHAR(7) DEFAULT '#6c5ce7',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, name)
        )
      `);
      console.log("✓ expense_tags table created");
    } else {
      console.log("✓ expense_tags table already exists");
    }

    // Create expense_tag_map table
    if (!(await tableExists('expense_tag_map'))) {
      await query(`
        CREATE TABLE expense_tag_map (
          expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
          tag_id INTEGER REFERENCES expense_tags(id) ON DELETE CASCADE,
          PRIMARY KEY (expense_id, tag_id)
        )
      `);
      console.log("✓ expense_tag_map table created");
    } else {
      console.log("✓ expense_tag_map table already exists");
    }

    // Create user_categories table
    if (!(await tableExists('user_categories'))) {
      await query(`
        CREATE TABLE user_categories (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          icon VARCHAR(10) DEFAULT '📦',
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, name)
        )
      `);
      console.log("✓ user_categories table created");
    } else {
      console.log("✓ user_categories table already exists");
    }

    // Create indexes for better performance
    await query(
      `CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)`,
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`,
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date)`,
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_budget_items_user_month ON budget_items(user_id, month)`,
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id)`,
    );
    await query(`CREATE INDEX IF NOT EXISTS idx_income_date ON income(date)`);
    console.log("✓ indexes created");

    console.log("Database setup completed successfully!");

    return createResponse(200, {
      message: "Database setup completed successfully",
      tables: [
        "users",
        "expenses",
        "budget_items",
        "income",
        "user_settings",
        "expense_tags",
        "expense_tag_map",
        "user_categories",
      ],
    });
  } catch (error) {
    console.error("Database setup error:", error);
    return createResponse(500, {
      error: "Database setup failed",
      details: error.message,
    });
  }
};
