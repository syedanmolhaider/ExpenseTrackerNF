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

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ users table created");

    // Create expenses table
    await query(`
      CREATE TABLE IF NOT EXISTS expenses (
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

    // Create budget_items table
    await query(`
      CREATE TABLE IF NOT EXISTS budget_items (
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

    // Create income table
    await query(`
      CREATE TABLE IF NOT EXISTS income (
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

    // Create user_settings table
    await query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        month_start_day INTEGER DEFAULT 1,
        month_end_day INTEGER DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'Rs',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ user_settings table created");

    // Create expense_tags table
    await query(`
      CREATE TABLE IF NOT EXISTS expense_tags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        color VARCHAR(7) DEFAULT '#6c5ce7',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `);
    console.log("✓ expense_tags table created");

    // Create expense_tag_map table
    await query(`
      CREATE TABLE IF NOT EXISTS expense_tag_map (
        expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES expense_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (expense_id, tag_id)
      )
    `);
    console.log("✓ expense_tag_map table created");

    // Create user_categories table
    await query(`
      CREATE TABLE IF NOT EXISTS user_categories (
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
