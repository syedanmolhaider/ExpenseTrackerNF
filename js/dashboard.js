// Global state
let expenses = [];
let currentFilter = "";

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  await loadExpenses();
  initializeEventListeners();
  setDefaultDate();
});

// Check authentication
async function checkAuth() {
  try {
    const response = await fetch("/api/me", {
      credentials: "include",
    });

    if (!response.ok) {
      // Not logged in, redirect to login page
      window.location.href = "/index.html";
      return;
    }

    const data = await response.json();
    document.getElementById("userName").textContent = data.user.name;
  } catch (error) {
    console.error("Auth check error:", error);
    window.location.href = "/index.html";
  }
}

// Initialize event listeners
function initializeEventListeners() {
  // Logout button
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);

  // Add expense form
  document
    .getElementById("addExpenseForm")
    .addEventListener("submit", handleAddExpense);

  // Edit expense form
  document
    .getElementById("editExpenseForm")
    .addEventListener("submit", handleEditExpense);

  // Filter
  document
    .getElementById("filterCategory")
    .addEventListener("change", handleFilter);

  // Export CSV
  document.getElementById("exportBtn").addEventListener("click", handleExport);

  // Modal close
  document.querySelector(".close").addEventListener("click", closeModal);

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("editModal");
    if (e.target === modal) {
      closeModal();
    }
  });

  // Listen for section changes to update charts
  window.addEventListener("section:changed", (e) => {
    if (e.detail.section === "dashboard") {
      console.log("Dashboard section active - updating charts");
      // Small delay to ensure elements are visible
      setTimeout(() => {
        updateCharts();
      }, 100);
    }
  });
}

// Set default date to today
function setDefaultDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("expenseDate").value = today;
}

// Handle logout
async function handleLogout() {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    window.location.href = "/index.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Load expenses
async function loadExpenses() {
  try {
    const response = await fetch("/api/expenses", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to load expenses");
    }

    const data = await response.json();
    expenses = data.expenses;
    displayExpenses();
    updateSummary();
    displayRecentActivity();
    updateCharts();
  } catch (error) {
    console.error("Load expenses error:", error);
    document.getElementById("expensesList").innerHTML =
      '<p class="error-message show">Failed to load expenses. Please refresh the page.</p>';
  }
}

// Display expenses
function displayExpenses() {
  const expensesList = document.getElementById("expensesList");

  // Filter expenses
  let filteredExpenses = expenses;
  if (currentFilter) {
    filteredExpenses = expenses.filter((exp) => exp.category === currentFilter);
  }

  if (filteredExpenses.length === 0) {
    expensesList.innerHTML =
      '<p class="empty-state">No expenses found. Add your first expense above!</p>';
    return;
  }

  expensesList.innerHTML = filteredExpenses
    .map(
      (expense) => `
        <div class="expense-item">
            <div class="expense-header">
                <div>
                    <div class="expense-title">${escapeHtml(
                      expense.title
                    )}</div>
                    <span class="expense-category">${escapeHtml(
                      expense.category
                    )}</span>
                </div>
                <div class="expense-amount">$${parseFloat(
                  expense.amount
                ).toFixed(2)}</div>
            </div>
            <div class="expense-details">
                <div class="expense-detail">
                    📅 ${formatDate(expense.date)}
                </div>
                <div class="expense-detail">
                    🕒 ${formatDateTime(expense.created_at)}
                </div>
            </div>
            ${
              expense.notes
                ? `<div class="expense-notes">${escapeHtml(
                    expense.notes
                  )}</div>`
                : ""
            }
            <div class="expense-actions">
                <button class="btn btn-edit" onclick="openEditModal('${
                  expense.id
                }')">Edit</button>
                <button class="btn btn-danger" onclick="handleDelete('${
                  expense.id
                }')">Delete</button>
            </div>
        </div>
    `
    )
    .join("");
}

// Update summary
function updateSummary() {
  const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  // Calculate monthly total
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTotal = expenses
    .filter((exp) => {
      const expDate = new Date(exp.date);
      return (
        expDate.getMonth() === currentMonth &&
        expDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  document.getElementById("totalExpenses").textContent = `$${total.toFixed(2)}`;
  document.getElementById(
    "monthlyExpenses"
  ).textContent = `$${monthlyTotal.toFixed(2)}`;
  document.getElementById("totalEntries").textContent = expenses.length;
}

// Display recent activity (last 5 expenses)
function displayRecentActivity() {
  const recentActivity = document.getElementById("recentActivity");

  if (!recentActivity) return; // Element might not exist yet

  if (expenses.length === 0) {
    recentActivity.innerHTML = '<p class="empty-state">No recent expenses</p>';
    return;
  }

  // Get last 5 expenses sorted by date
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  recentActivity.innerHTML = recentExpenses
    .map(
      (expense) => `
        <div class="recent-item" onclick="openEditModal('${expense.id}')">
          <div class="recent-item-info">
            <div class="recent-item-title">${escapeHtml(expense.title)}</div>
            <div class="recent-item-category">
              ${getCategoryIcon(expense.category)} ${escapeHtml(
        expense.category
      )}
            </div>
          </div>
          <div class="recent-item-amount">$${parseFloat(expense.amount).toFixed(
            2
          )}</div>
        </div>
      `
    )
    .join("");
}

// Get category icon
function getCategoryIcon(category) {
  const icons = {
    Food: "🍔",
    Transport: "🚗",
    Entertainment: "🎬",
    Shopping: "🛍️",
    Bills: "📄",
    Healthcare: "⚕️",
    Education: "📚",
    Other: "📦",
  };
  return icons[category] || "📦";
}

// Display category chart
function displayCategoryChart() {
  const categoryChart = document.getElementById("categoryChart");

  if (!categoryChart) {
    console.warn("categoryChart element not found");
    return;
  }

  if (expenses.length === 0) {
    categoryChart.innerHTML =
      '<p class="chart-placeholder">No data available</p>';
    return;
  }

  console.log("Rendering category chart with", expenses.length, "expenses");

  // Calculate category totals
  const categoryTotals = {};
  expenses.forEach((expense) => {
    const category = expense.category;
    const amount = parseFloat(expense.amount);
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
  });

  // Sort by amount (descending)
  const sortedCategories = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  );

  const total = sortedCategories.reduce((sum, [_, amount]) => sum + amount, 0);

  // Create visual bars
  categoryChart.innerHTML = `
    <div class="category-bars">
      ${sortedCategories
        .map(([category, amount]) => {
          const percentage = ((amount / total) * 100).toFixed(1);
          return `
            <div class="category-bar-item">
              <div class="category-bar-header">
                <span class="category-name">${getCategoryIcon(
                  category
                )} ${category}</span>
                <span class="category-amount">$${amount.toFixed(
                  2
                )} (${percentage}%)</span>
              </div>
              <div class="category-bar-track">
                <div class="category-bar-fill" style="width: ${percentage}%; background: ${getCategoryColor(
            category
          )}"></div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

// Get category color
function getCategoryColor(category) {
  const colors = {
    Food: "linear-gradient(90deg, #00e5ff, #00a8cc)",
    Transport: "linear-gradient(90deg, #ff00d1, #cc00a8)",
    Entertainment: "linear-gradient(90deg, #c7ff00, #9acc00)",
    Shopping: "linear-gradient(90deg, #ff00d1, #ff0055)",
    Bills: "linear-gradient(90deg, #00e5ff, #c7ff00)",
    Healthcare: "linear-gradient(90deg, #ff0055, #ff00d1)",
    Education: "linear-gradient(90deg, #c7ff00, #00e5ff)",
    Other: "linear-gradient(90deg, #ffffff, #c0c5ce)",
  };
  return colors[category] || colors.Other;
}

// Display monthly trend
function displayMonthlyTrend() {
  const trendChart = document.getElementById("trendChart");

  if (!trendChart) {
    console.warn("trendChart element not found");
    return;
  }

  if (expenses.length === 0) {
    trendChart.innerHTML = '<p class="chart-placeholder">No data available</p>';
    return;
  }

  console.log("Rendering monthly trend with", expenses.length, "expenses");

  // Get last 6 months data
  const monthlyData = {};
  const currentDate = new Date();

  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1
    );
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    const monthName = date.toLocaleDateString("en", { month: "short" });
    monthlyData[monthKey] = { name: monthName, amount: 0 };
  }

  // Calculate monthly totals
  expenses.forEach((expense) => {
    const date = new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].amount += parseFloat(expense.amount);
    }
  });

  const monthlyArray = Object.values(monthlyData);
  const maxAmount = Math.max(...monthlyArray.map((m) => m.amount), 100);

  // Create visual bars
  trendChart.innerHTML = `
    <div class="trend-bars">
      ${monthlyArray
        .map((month) => {
          const heightPercent = (month.amount / maxAmount) * 100;
          return `
            <div class="trend-bar-item">
              <div class="trend-bar-column">
                <div class="trend-bar-fill" style="height: ${heightPercent}%; background: linear-gradient(180deg, #ff00d1, #00e5ff)">
                  ${
                    month.amount > 0
                      ? `<span class="trend-bar-value">$${month.amount.toFixed(
                          0
                        )}</span>`
                      : ""
                  }
                </div>
              </div>
              <div class="trend-bar-label">${month.name}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

// Update charts
function updateCharts() {
  console.log("updateCharts called, expenses count:", expenses.length);

  // Check if chart elements exist
  const categoryChart = document.getElementById("categoryChart");
  const trendChart = document.getElementById("trendChart");

  console.log("categoryChart exists:", !!categoryChart);
  console.log("trendChart exists:", !!trendChart);

  if (categoryChart || trendChart) {
    displayCategoryChart();
    displayMonthlyTrend();
  } else {
    console.error("Chart elements not found in DOM");
  }
}

// Handle add expense
async function handleAddExpense(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    title: formData.get("title"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    date: formData.get("date"),
    notes: formData.get("notes"),
  };

  const formError = document.getElementById("formError");

  try {
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      // Add successful
      e.target.reset();
      setDefaultDate();
      formError.classList.remove("show");
      await loadExpenses();
    } else {
      formError.textContent = result.error || "Failed to add expense";
      formError.classList.add("show");
    }
  } catch (error) {
    console.error("Add expense error:", error);
    formError.textContent = "An error occurred. Please try again.";
    formError.classList.add("show");
  }
}

// Open edit modal
function openEditModal(expenseId) {
  const expense = expenses.find((exp) => exp.id === expenseId);
  if (!expense) return;

  document.getElementById("editExpenseId").value = expense.id;
  document.getElementById("editExpenseTitle").value = expense.title;
  document.getElementById("editExpenseAmount").value = expense.amount;
  document.getElementById("editExpenseCategory").value = expense.category;
  document.getElementById("editExpenseDate").value = expense.date;
  document.getElementById("editExpenseNotes").value = expense.notes || "";

  document.getElementById("editModal").classList.add("show");
}

// Close modal
function closeModal() {
  document.getElementById("editModal").classList.remove("show");
  document.getElementById("editFormError").classList.remove("show");
}

// Handle edit expense
async function handleEditExpense(e) {
  e.preventDefault();

  const expenseId = document.getElementById("editExpenseId").value;
  const formData = new FormData(e.target);
  const data = {
    title: formData.get("title"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    date: formData.get("date"),
    notes: formData.get("notes"),
  };

  const editFormError = document.getElementById("editFormError");

  try {
    const response = await fetch(`/api/expenses/${expenseId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      closeModal();
      await loadExpenses();
    } else {
      editFormError.textContent = result.error || "Failed to update expense";
      editFormError.classList.add("show");
    }
  } catch (error) {
    console.error("Edit expense error:", error);
    editFormError.textContent = "An error occurred. Please try again.";
    editFormError.classList.add("show");
  }
}

// Handle delete expense
async function handleDelete(expenseId) {
  if (!confirm("Are you sure you want to delete this expense?")) {
    return;
  }

  try {
    const response = await fetch(`/api/expenses/${expenseId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (response.ok) {
      await loadExpenses();
    } else {
      alert("Failed to delete expense");
    }
  } catch (error) {
    console.error("Delete expense error:", error);
    alert("An error occurred. Please try again.");
  }
}

// Handle filter
function handleFilter(e) {
  currentFilter = e.target.value;
  displayExpenses();
}

// Handle CSV export
function handleExport() {
  if (expenses.length === 0) {
    alert("No expenses to export");
    return;
  }

  // Create CSV content
  const headers = ["Date", "Title", "Category", "Amount", "Notes"];
  const rows = expenses.map((exp) => [
    exp.date,
    exp.title,
    exp.category,
    exp.amount,
    exp.notes || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((field) => `"${field}"`).join(",")),
  ].join("\n");

  // Download CSV
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Make functions globally accessible
window.openEditModal = openEditModal;
window.handleDelete = handleDelete;
