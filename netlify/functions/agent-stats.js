const { query } = require("./utils/db");

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: JSON.stringify({ message: "OK" }),
    };
  }

  // Verify API key
  const apiKey = event.headers["x-api-key"];
  if (apiKey !== process.env.AGENT_API_KEY) {
    return {
      statusCode: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Invalid or missing API key" }),
    };
  }

  // Only allow GET
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const userId = parseInt(event.queryStringParameters?.user_id);
    const { from, to, group_by = "category" } = event.queryStringParameters;

    if (!userId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "user_id query parameter is required" }),
      };
    }

    // Build date filter conditions
    const conditions = ["e.user_id = $1"];
    const values = [userId];
    let paramIdx = 2;

    if (from) {
      conditions.push(`e.date >= $${paramIdx}`);
      values.push(from);
      paramIdx++;
    }
    if (to) {
      conditions.push(`e.date <= $${paramIdx}`);
      values.push(to);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    // Get stats by category
    const catSql = `
      SELECT category, COUNT(*) as count, SUM(amount) as total
      FROM expenses e
      WHERE ${whereClause}
      GROUP BY category
      ORDER BY total DESC
    `;
    const catResult = await query(catSql, values);

    // Get totals
    const totalSql = `
      SELECT COUNT(*) as count, SUM(amount) as total,
             MIN(date) as earliest, MAX(date) as latest
      FROM expenses e
      WHERE ${whereClause}
    `;
    const totalResult = await query(totalSql, values);

    // Daily breakdown (last 7 days or within range)
    const dailySql = `
      SELECT date, SUM(amount) as total
      FROM expenses e
      WHERE ${whereClause}
      ${from ? '' : 'AND e.date >= CURRENT_DATE - INTERVAL \'7 days\''}
      GROUP BY date
      ORDER BY date DESC
    `;
    const dailyResult = await query(dailySql, values);

    // Monthly breakdown (if range covers multiple months)
    const monthlySql = `
      SELECT TO_CHAR(date, 'YYYY-MM') as month, COUNT(*) as count, SUM(amount) as total
      FROM expenses e
      WHERE ${whereClause}
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month DESC
    `;
    const monthlyResult = await query(monthlySql, values);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        user_id: userId,
        date_range: { from, to },
        summary: totalResult.rows[0] || { count: 0, total: 0 },
        by_category: catResult.rows,
        daily: dailyResult.rows,
        monthly: monthlyResult.rows,
        generated_at: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Stats error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
