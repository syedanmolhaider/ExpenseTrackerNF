const { query } = require("./utils/db");
const { getUserFromRequest, createResponse } = require("./utils/auth");
const { rateLimitCheck } = require("./utils/rate-limit");

// Calculate next date based on frequency
function calculateNextDate(currentDate, frequency) {
  const date = new Date(currentDate);

  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().split("T")[0];
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  // Rate limit: 10 requests per minute per IP (processing can be expensive)
  const limited = rateLimitCheck(event, {
    maxRequests: 10,
    windowMs: 60000,
    prefix: "recurring-process",
  });
  if (limited) return limited;

  try {
    // Authenticate user
    const decoded = getUserFromRequest(event);
    if (!decoded) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const userId = decoded.userId;

    // Only POST allowed
    if (event.httpMethod !== "POST") {
      return createResponse(405, { error: "Method not allowed" });
    }

    const today = new Date().toISOString().split("T")[0];

    // Get all active recurring expenses that are due
    const dueItems = await query(
      `SELECT id, title, amount, category, frequency, next_date, end_date, notes
       FROM recurring_expenses
       WHERE user_id = $1 AND is_active = true AND next_date <= $2
       AND (end_date IS NULL OR end_date >= $2)
       ORDER BY next_date ASC`,
      [userId, today],
    );

    if (dueItems.rows.length === 0) {
      return createResponse(200, {
        message: "No recurring expenses due for processing",
        processed: 0,
      });
    }

    let processedCount = 0;
    const processedItems = [];

    for (const item of dueItems.rows) {
      try {
        // Create the expense entry
        const expenseResult = await query(
          `INSERT INTO expenses (user_id, title, amount, category, date, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            userId,
            item.title,
            item.amount,
            item.category,
            item.next_date,
            item.notes ? `[Recurring] ${item.notes}` : "[Recurring]",
          ],
        );

        // Calculate next occurrence date
        const nextDate = calculateNextDate(item.next_date, item.frequency);

        // Check if we've passed the end date
        if (item.end_date && nextDate > item.end_date) {
          // Deactivate the recurring expense
          await query(
            "UPDATE recurring_expenses SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [item.id],
          );
        } else {
          // Update the next_date
          await query(
            "UPDATE recurring_expenses SET next_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [nextDate, item.id],
          );
        }

        processedCount++;
        processedItems.push({
          id: item.id,
          title: item.title,
          amount: item.amount,
          expense_id: expenseResult.rows[0].id,
          next_date: nextDate,
        });
      } catch (err) {
        console.error(
          `Failed to process recurring expense ${item.id}:`,
          err.message,
        );
      }
    }

    return createResponse(200, {
      message: `Processed ${processedCount} recurring expense(s)`,
      processed: processedCount,
      items: processedItems,
    });
  } catch (error) {
    console.error("Recurring process error:", error.message);
    return createResponse(500, { error: "Internal server error" });
  }
};
