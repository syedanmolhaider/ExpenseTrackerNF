// Debug script to check database connection and data
const { Pool } = require("pg");

// Test database connection
async function testDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;

  console.log("🔍 Database Connection Test");
  console.log("DATABASE_URL:", connectionString ? "SET" : "NOT SET");

  if (!connectionString) {
    console.log("❌ ERROR: DATABASE_URL environment variable not set");
    return false;
  }

  try {
    const pool = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: true },
    });

    // Test basic connection
    await pool.query("SELECT NOW()");
    console.log("✅ Database connection: SUCCESS");

    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("\n📋 Database Tables:");
    if (tables.rows.length === 0) {
      console.log("❌ No tables found");
      return false;
    }

    tables.rows.forEach((row) => {
      console.log(`✅ ${row.table_name}`);
    });

    // Check user count
    const userCount = await pool.query("SELECT COUNT(*) FROM users");
    console.log(`\n👥 Users: ${userCount.rows[0].count}`);

    // Check expense count
    const expenseCount = await pool.query("SELECT COUNT(*) FROM expenses");
    console.log(`💰 Expenses: ${expenseCount.rows[0].count}`);

    // Check budget count
    const budgetCount = await pool.query("SELECT COUNT(*) FROM budget_items");
    console.log(`📊 Budget Items: ${budgetCount.rows[0].count}`);

    // Check income count
    const incomeCount = await pool.query("SELECT COUNT(*) FROM income");
    console.log(`💵 Income: ${incomeCount.rows[0].count}`);

    // Sample data check
    const sampleExpenses = await pool.query(`
      SELECT id, title, amount, category, date, user_id 
      FROM expenses 
      LIMIT 3
    `);

    console.log("\n📝 Sample Expenses:");
    if (sampleExpenses.rows.length === 0) {
      console.log("❌ No expenses found");
    } else {
      sampleExpenses.rows.forEach((expense) => {
        console.log(
          `- ID: ${expense.id}, Title: ${expense.title}, Amount: ${expense.amount}, Category: ${expense.category}, Date: ${expense.date}, User ID: ${expense.user_id}`,
        );
      });
    }

    await pool.end();
    return true;
  } catch (error) {
    console.log("❌ Database connection failed:", error.message);
    return false;
  }
}

// Test JWT secret
function testJWTSecret() {
  console.log("\n🔐 JWT Secret Test");
  const jwtSecret = process.env.JWT_SECRET;
  console.log("JWT_SECRET:", jwtSecret ? "SET" : "NOT SET");

  if (!jwtSecret) {
    console.log("⚠️ WARNING: JWT_SECRET not set - using fallback dev secret");
    console.log("🔒 This is only acceptable for development, not production");
  } else {
    console.log("✅ JWT Secret: SET");
  }
}

// Main function
async function main() {
  console.log("🚀 ExpenseTrackerNF Debug Script");
  console.log("=".repeat(50));

  // Test JWT secret first
  testJWTSecret();

  // Test database connection
  const dbSuccess = await testDatabaseConnection();

  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY:");
  console.log(`Database Status: ${dbSuccess ? "✅ OK" : "❌ FAILED"}`);
  console.log(
    `JWT Secret: ${process.env.JWT_SECRET ? "✅ SET" : "❌ NOT SET"}`,
  );

  if (!dbSuccess) {
    console.log("\n🔧 NEXT STEPS:");
    console.log("1. Set DATABASE_URL environment variable");
    console.log("2. Run database setup (visit /setup.html)");
    console.log("3. Check Neon database connection");
  }
}

// Run the debug script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testDatabaseConnection, testJWTSecret };
