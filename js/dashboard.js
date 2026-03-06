// =============================================
// EXPENSE TRACKER — Dashboard Controller
// Budget + Daily Tracker + Income + Charts + Import/Export + Reset
// =============================================

// ------ State ------
let currentMonth = new Date();
let expenses = [];
let allExpenses = [];
let budgetItems = [];
let incomeEntries = [];
let availableBalance = 0;
let currentFilter = "";

// ------ Init ------
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  renderMonthLabel();
  initListeners();
  setDefaultDate();
  await loadAll();
});

// ------ Auth ------
async function checkAuth() {
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) { window.location.href = "/index.html"; return; }
    const data = await res.json();
    document.getElementById("userName").textContent = data.user.name;
  } catch { window.location.href = "/index.html"; }
}

// ------ Month Helpers ------
function getMonthKey(d = currentMonth) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function renderMonthLabel() {
  document.getElementById("currentMonthLabel").textContent =
    currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function changeMonth(offset) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
  renderMonthLabel();
  loadAll();
}

// ------ Listeners ------
function initListeners() {
  document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
  document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab);
      if (tab.dataset.tab === "trends") renderCharts();
    });
  });

  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("addBudgetForm").addEventListener("submit", handleAddBudget);
  document.getElementById("addExpenseForm").addEventListener("submit", handleAddExpense);
  document.getElementById("editExpenseForm").addEventListener("submit", handleEditExpense);
  document.getElementById("addIncomeForm").addEventListener("submit", handleAddIncome);

  document.getElementById("filterCategory").addEventListener("change", (e) => {
    currentFilter = e.target.value;
    displayExpenses();
  });

  // Export modal
  document.getElementById("exportBtn").addEventListener("click", () => document.getElementById("exportModal").classList.add("show"));
  document.getElementById("cancelExport").addEventListener("click", () => document.getElementById("exportModal").classList.remove("show"));
  document.getElementById("exportModal").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.target.classList.remove("show"); });

  // Export options
  document.getElementById("exportCSV").addEventListener("click", () => { exportExpensesCSV(); closeExportModal(); });
  document.getElementById("exportJSON").addEventListener("click", () => { exportExpensesJSON(); closeExportModal(); });
  document.getElementById("exportBudgetCSV").addEventListener("click", () => { exportBudgetCSV(); closeExportModal(); });
  document.getElementById("exportIncomeCSV").addEventListener("click", () => { exportIncomeCSV(); closeExportModal(); });
  document.getElementById("exportFullReport").addEventListener("click", () => { exportFullReport(); closeExportModal(); });
  document.getElementById("exportTemplate").addEventListener("click", () => { exportTemplate(); closeExportModal(); });

  // Import
  document.getElementById("importFile").addEventListener("change", handleImport);

  // Balance modal
  document.getElementById("editBalanceBtn").addEventListener("click", openBalanceModal);
  document.getElementById("cancelBalance").addEventListener("click", closeBalanceModal);
  document.getElementById("saveBalance").addEventListener("click", handleSaveBalance);

  // Edit modal close
  document.querySelectorAll(".close-modal").forEach((btn) => btn.addEventListener("click", closeEditModal));

  // Overlay clicks
  document.getElementById("balanceModal").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeBalanceModal(); });
  document.getElementById("editModal").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeEditModal(); });

  // Reset All
  document.getElementById("resetAllBtn").addEventListener("click", handleResetAll);

  // Keyboard: Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeBalanceModal(); closeEditModal(); closeExportModal(); }
  });
}

function closeExportModal() { document.getElementById("exportModal").classList.remove("show"); }

// ------ Tab Switching ------
function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`panel-${tabName}`).classList.add("active");
}

// ------ Load All Data ------
async function loadAll() {
  const month = getMonthKey();
  await Promise.all([loadExpenses(month), loadBudget(month), loadBalance(month), loadIncome(month)]);
  updateBalanceBar();
  if (document.getElementById("panel-trends").classList.contains("active")) renderCharts();
}

// =============================================
// EXPENSES
// =============================================
async function loadExpenses(month) {
  try {
    const res = await fetch("/api/expenses", { credentials: "include" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    allExpenses = data.expenses || [];
    expenses = allExpenses.filter((exp) => {
      const d = new Date(exp.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === month;
    });
    displayExpenses();
    updateDailySummary();
  } catch {
    document.getElementById("expensesList").innerHTML = '<p class="empty-msg" style="color:var(--red)">Failed to load expenses.</p>';
  }
}

function displayExpenses() {
  const list = document.getElementById("expensesList");
  let filtered = currentFilter ? expenses.filter((e) => e.category === currentFilter) : expenses;
  if (filtered.length === 0) { list.innerHTML = '<p class="empty-msg">No expenses logged this month.</p>'; return; }
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  list.innerHTML = filtered.map((exp) => `
    <div class="expense-item">
      <div class="expense-row">
        <div class="expense-left">
          <div class="expense-title-text">${esc(exp.title)}</div>
          <div class="expense-meta">
            <span class="expense-cat">${getCatIcon(exp.category)} ${esc(exp.category)}</span>
            <span>${fmtDate(exp.date)}</span>
          </div>
          ${exp.notes ? `<div class="expense-notes-text">${esc(exp.notes)}</div>` : ""}
        </div>
        <div class="expense-amount-val">Rs ${fmtNum(exp.amount)}</div>
      </div>
      <div class="expense-actions">
        <button class="btn-sm" onclick="openEditModal('${exp.id}')">Edit</button>
        <button class="btn-sm delete" onclick="handleDelete('${exp.id}')">Delete</button>
      </div>
    </div>`).join("");
}

function updateDailySummary() {
  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const today = new Date().toISOString().split("T")[0];
  const todayTotal = expenses.filter((e) => e.date === today).reduce((s, e) => s + parseFloat(e.amount), 0);
  document.getElementById("dailyTotalSpent").textContent = `Rs ${fmtNum(total)}`;
  document.getElementById("dailyTodaySpent").textContent = `Rs ${fmtNum(todayTotal)}`;
  document.getElementById("dailyTotalEntries").textContent = expenses.length;
}

async function handleAddExpense(e) {
  e.preventDefault();
  const form = e.target;
  const data = { title: form.title.value.trim(), amount: form.amount.value, category: form.category.value, date: form.date.value, notes: form.notes.value.trim() };
  if (!data.title || !data.amount || !data.category || !data.date) return;
  try {
    const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
    if (res.ok) { form.reset(); setDefaultDate(); toast("Expense logged", "success"); await loadExpenses(getMonthKey()); updateBalanceBar(); }
    else { const r = await res.json(); toast(r.error || "Failed", "error"); }
  } catch { toast("Network error", "error"); }
}

function openEditModal(id) {
  const exp = expenses.find((e) => e.id === id);
  if (!exp) return;
  document.getElementById("editExpenseId").value = exp.id;
  document.getElementById("editExpenseTitle").value = exp.title;
  document.getElementById("editExpenseAmount").value = exp.amount;
  document.getElementById("editExpenseCategory").value = exp.category;
  document.getElementById("editExpenseDate").value = exp.date;
  document.getElementById("editExpenseNotes").value = exp.notes || "";
  document.getElementById("editModal").classList.add("show");
}
function closeEditModal() { document.getElementById("editModal").classList.remove("show"); }

async function handleEditExpense(e) {
  e.preventDefault();
  const id = document.getElementById("editExpenseId").value;
  const form = e.target;
  const data = { title: form.title.value.trim(), amount: form.amount.value, category: form.category.value, date: form.date.value, notes: form.notes.value.trim() };
  try {
    const res = await fetch(`/api/expenses/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
    if (res.ok) { closeEditModal(); toast("Updated", "success"); await loadExpenses(getMonthKey()); updateBalanceBar(); }
    else toast("Failed to update", "error");
  } catch { toast("Network error", "error"); }
}

async function handleDelete(id) {
  if (!confirm("Delete this expense?")) return;
  try {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { toast("Deleted", "success"); await loadExpenses(getMonthKey()); updateBalanceBar(); }
  } catch { toast("Failed", "error"); }
}

// =============================================
// BUDGET
// =============================================
async function loadBudget(month) {
  try {
    const res = await fetch(`/api/budget?month=${month}`, { credentials: "include" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    budgetItems = data.items || [];
    displayBudget();
    updateBudgetSummary();
  } catch {
    document.getElementById("budgetList").innerHTML = '<p class="empty-msg" style="color:var(--red)">Failed to load budget.</p>';
  }
}

function displayBudget() {
  const list = document.getElementById("budgetList");
  if (budgetItems.length === 0) { list.innerHTML = '<p class="empty-msg">No budget items yet. Add your first one above!</p>'; return; }
  list.innerHTML = budgetItems.map((item) => `
    <div class="budget-item ${item.is_done ? "done" : ""}">
      <button class="budget-check ${item.is_done ? "checked" : ""}" onclick="toggleBudget('${item.id}')" aria-label="${item.is_done ? "Mark undone" : "Mark done"}" title="${item.is_done ? "Mark undone" : "Mark done"}">
        ${item.is_done ? "✓" : ""}
      </button>
      <div class="budget-info"><div class="budget-title">${esc(item.title)}</div></div>
      <div class="budget-amount">Rs ${fmtNum(item.amount)}</div>
      <div class="budget-actions"><button class="btn-sm delete" onclick="deleteBudget('${item.id}')">✕</button></div>
    </div>`).join("");
}

function updateBudgetSummary() {
  const total = budgetItems.reduce((s, i) => s + parseFloat(i.amount), 0);
  const done = budgetItems.filter((i) => i.is_done).reduce((s, i) => s + parseFloat(i.amount), 0);
  document.getElementById("budgetTotalPlanned").textContent = `Rs ${fmtNum(total)}`;
  document.getElementById("budgetTotalDone").textContent = `Rs ${fmtNum(done)}`;
  document.getElementById("budgetTotalPending").textContent = `Rs ${fmtNum(total - done)}`;
}

async function handleAddBudget(e) {
  e.preventDefault();
  const title = document.getElementById("budgetTitle").value.trim();
  const amount = document.getElementById("budgetAmount").value;
  if (!title || !amount) return;
  try {
    const res = await fetch("/api/budget", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title, amount: parseFloat(amount), month: getMonthKey() }) });
    if (res.ok) { e.target.reset(); toast("Budget item added", "success"); await loadBudget(getMonthKey()); updateBalanceBar(); }
    else { const d = await res.json(); toast(d.error || "Failed", "error"); }
  } catch { toast("Network error", "error"); }
}

async function toggleBudget(id) {
  try {
    const res = await fetch(`/api/budget/${id}/toggle`, { method: "PUT", credentials: "include" });
    if (res.ok) { await loadBudget(getMonthKey()); updateBalanceBar(); }
  } catch { toast("Failed to toggle", "error"); }
}

async function deleteBudget(id) {
  if (!confirm("Delete this budget item?")) return;
  try {
    const res = await fetch(`/api/budget/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { toast("Deleted", "success"); await loadBudget(getMonthKey()); updateBalanceBar(); }
  } catch { toast("Failed", "error"); }
}

// =============================================
// INCOME
// =============================================
async function loadIncome(month) {
  try {
    const res = await fetch(`/api/income?month=${month}`, { credentials: "include" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    incomeEntries = data.entries || [];
    displayIncome();
    updateIncomeSummary();
  } catch {
    incomeEntries = [];
    const el = document.getElementById("incomeList");
    if (el) el.innerHTML = '<p class="empty-msg" style="color:var(--red)">Failed to load income.</p>';
  }
}

function getSourceIcon(source) {
  const icons = { Salary: "💼", Freelance: "💻", Business: "🏢", Investment: "📈", Gift: "🎁", Refund: "↩️", Other: "📦" };
  return icons[source] || "📦";
}

function displayIncome() {
  const list = document.getElementById("incomeList");
  if (!list) return;
  if (incomeEntries.length === 0) { list.innerHTML = '<p class="empty-msg">No income recorded this month.</p>'; return; }

  list.innerHTML = incomeEntries.map((entry) => `
    <div class="income-item">
      <div class="income-row">
        <div class="income-left">
          <div class="income-title-text">${esc(entry.title)}</div>
          <div class="income-meta">
            <span class="income-source">${getSourceIcon(entry.source)} ${esc(entry.source)}</span>
            <span>${fmtDate(entry.date)}</span>
          </div>
          ${entry.notes ? `<div class="expense-notes-text">${esc(entry.notes)}</div>` : ""}
        </div>
        <div class="income-amount-val">+ Rs ${fmtNum(entry.amount)}</div>
      </div>
      <div class="income-actions">
        <button class="btn-sm delete" onclick="deleteIncome('${entry.id}')">Delete</button>
      </div>
    </div>`).join("");
}

function updateIncomeSummary() {
  const total = incomeEntries.reduce((s, e) => s + parseFloat(e.amount), 0);
  const el1 = document.getElementById("incomeTotalMonth");
  const el2 = document.getElementById("incomeTotalEntries");
  if (el1) el1.textContent = `Rs ${fmtNum(total)}`;
  if (el2) el2.textContent = incomeEntries.length;
}

async function handleAddIncome(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    title: form.title.value.trim(),
    amount: form.amount.value,
    source: form.source.value,
    date: form.date.value,
    notes: form.notes.value.trim(),
  };
  if (!data.title || !data.amount || !data.date) return;
  try {
    const res = await fetch("/api/income", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
    if (res.ok) { form.reset(); setDefaultDate("incomeDate"); toast("Income added", "success"); await loadIncome(getMonthKey()); updateBalanceBar(); }
    else { const r = await res.json(); toast(r.error || "Failed", "error"); }
  } catch { toast("Network error", "error"); }
}

async function deleteIncome(id) {
  if (!confirm("Delete this income entry?")) return;
  try {
    const res = await fetch(`/api/income/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { toast("Deleted", "success"); await loadIncome(getMonthKey()); updateBalanceBar(); }
  } catch { toast("Failed", "error"); }
}

// =============================================
// BALANCE
// =============================================
async function loadBalance(month) {
  try {
    const res = await fetch(`/api/balance?month=${month}`, { credentials: "include" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    availableBalance = data.balance || 0;
  } catch { availableBalance = 0; }
}

function updateBalanceBar() {
  const incomeTotal = incomeEntries.reduce((s, e) => s + parseFloat(e.amount), 0);
  const budgetTotal = budgetItems.reduce((s, i) => s + parseFloat(i.amount), 0);
  const budgetSpent = budgetItems.filter((i) => i.is_done).reduce((s, i) => s + parseFloat(i.amount), 0);
  const dailySpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const remaining = availableBalance + incomeTotal - budgetSpent - dailySpent;

  document.getElementById("balanceIncome").textContent = `Rs ${fmtNum(incomeTotal)}`;
  document.getElementById("balanceAvailable").textContent = `Rs ${fmtNum(availableBalance)}`;
  document.getElementById("balanceBudgetTotal").textContent = `Rs ${fmtNum(budgetTotal)}`;
  document.getElementById("balanceBudgetSpent").textContent = `Rs ${fmtNum(budgetSpent)}`;
  document.getElementById("balanceDailySpent").textContent = `Rs ${fmtNum(dailySpent)}`;

  const el = document.getElementById("balanceRemaining");
  el.textContent = `Rs ${fmtNum(remaining)}`;
  el.className = remaining < 0 ? "balance-value text-red" : remaining < (availableBalance + incomeTotal) * 0.2 ? "balance-value text-orange" : "balance-value text-accent";
}

// Balance Modal
function openBalanceModal() {
  document.getElementById("balanceInput").value = availableBalance || "";
  document.getElementById("balanceModal").classList.add("show");
  document.getElementById("balanceInput").focus();
}
function closeBalanceModal() { document.getElementById("balanceModal").classList.remove("show"); }

async function handleSaveBalance() {
  const val = parseFloat(document.getElementById("balanceInput").value);
  if (isNaN(val) || val < 0) { toast("Enter a valid balance", "error"); return; }
  try {
    const res = await fetch("/api/balance", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ month: getMonthKey(), balance: val }) });
    if (res.ok) { availableBalance = val; closeBalanceModal(); updateBalanceBar(); toast("Balance updated", "success"); }
    else toast("Failed", "error");
  } catch { toast("Network error", "error"); }
}

// =============================================
// RESET ALL
// =============================================
async function handleResetAll() {
  const confirm1 = confirm("⚠️ This will DELETE ALL your data across ALL months:\n\n• All expenses\n• All budget items\n• All income records\n• All balance settings\n\nThis action CANNOT be undone. Continue?");
  if (!confirm1) return;
  const confirm2 = confirm("Are you ABSOLUTELY sure? Type 'yes' in the next prompt to confirm.");
  if (!confirm2) return;
  const typed = prompt("Type 'RESET' to confirm deletion of all data:");
  if (typed !== "RESET") { toast("Reset cancelled", "error"); return; }

  try {
    const res = await fetch("/api/reset", { method: "DELETE", credentials: "include" });
    if (res.ok) {
      toast("All data has been reset", "success");
      expenses = []; allExpenses = []; budgetItems = []; incomeEntries = []; availableBalance = 0;
      displayExpenses(); displayBudget(); displayIncome();
      updateDailySummary(); updateBudgetSummary(); updateIncomeSummary(); updateBalanceBar();
    } else toast("Failed to reset", "error");
  } catch { toast("Network error", "error"); }
}

// =============================================
// LOGOUT
// =============================================
async function handleLogout() {
  try { await fetch("/api/logout", { method: "POST", credentials: "include" }); } catch { }
  window.location.href = "/index.html";
}

// =============================================
// IMPORT
// =============================================
async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  let rows = [];

  if (file.name.endsWith(".json")) {
    try {
      const data = JSON.parse(text);
      rows = Array.isArray(data) ? data : (data.expenses || []);
    } catch { toast("Invalid JSON", "error"); e.target.value = ""; return; }
  } else {
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);
    if (lines.length < 2) { toast("CSV is empty", "error"); e.target.value = ""; return; }
    const headers = parseCSVRow(lines[0].toLowerCase());
    const dateIdx = headers.findIndex((h) => h.includes("date"));
    const titleIdx = headers.findIndex((h) => h.includes("title") || h.includes("name") || h.includes("description"));
    const catIdx = headers.findIndex((h) => h.includes("categ"));
    const amountIdx = headers.findIndex((h) => h.includes("amount") || h.includes("price") || h.includes("cost"));
    const notesIdx = headers.findIndex((h) => h.includes("note"));
    if (titleIdx === -1 || amountIdx === -1) { toast("CSV must have Title and Amount columns", "error"); e.target.value = ""; return; }
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      if (cols.length <= amountIdx) continue;
      rows.push({ title: cols[titleIdx] || "Imported", amount: parseFloat(cols[amountIdx]) || 0, category: cols[catIdx] || "Other", date: cols[dateIdx] || new Date().toISOString().split("T")[0], notes: notesIdx >= 0 ? cols[notesIdx] || "" : "" });
    }
  }

  if (rows.length === 0) { toast("No rows found", "error"); e.target.value = ""; return; }
  const validCats = ["Food", "Transport", "Entertainment", "Shopping", "Bills", "Healthcare", "Education", "Other"];
  let imported = 0, failed = 0;
  for (const row of rows) {
    const cat = validCats.find((c) => c.toLowerCase() === (row.category || "").toLowerCase()) || "Other";
    const amount = parseFloat(row.amount);
    if (!row.title || isNaN(amount) || amount <= 0) { failed++; continue; }
    try {
      const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: row.title, amount, category: cat, date: row.date || new Date().toISOString().split("T")[0], notes: row.notes || "" }) });
      if (res.ok) imported++; else failed++;
    } catch { failed++; }
  }
  e.target.value = "";
  toast(`Imported ${imported} expenses${failed ? `, ${failed} failed` : ""}`, imported > 0 ? "success" : "error");
  await loadExpenses(getMonthKey());
  updateBalanceBar();
}

function parseCSVRow(line) {
  const result = []; let current = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else current += ch;
  }
  result.push(current.trim());
  return result;
}

// =============================================
// EXPORT
// =============================================
function exportExpensesCSV() {
  if (expenses.length === 0) { toast("No expenses", "error"); return; }
  const csv = ["Date,Title,Category,Amount,Notes", ...expenses.map((e) => `"${e.date}","${e.title}","${e.category}","${e.amount}","${e.notes || ""}"`).sort()].join("\n");
  downloadFile(csv, `expenses-${getMonthKey()}.csv`, "text/csv");
  toast("Expenses CSV exported", "success");
}

function exportExpensesJSON() {
  if (expenses.length === 0) { toast("No expenses", "error"); return; }
  const json = JSON.stringify({ month: getMonthKey(), expenses: expenses.map((e) => ({ date: e.date, title: e.title, category: e.category, amount: parseFloat(e.amount), notes: e.notes || "" })) }, null, 2);
  downloadFile(json, `expenses-${getMonthKey()}.json`, "application/json");
  toast("Expenses JSON exported", "success");
}

function exportBudgetCSV() {
  if (budgetItems.length === 0) { toast("No budget items", "error"); return; }
  const csv = ["Title,Amount,Status", ...budgetItems.map((i) => `"${i.title}","${i.amount}","${i.is_done ? "Done" : "Pending"}"`)].join("\n");
  downloadFile(csv, `budget-${getMonthKey()}.csv`, "text/csv");
  toast("Budget CSV exported", "success");
}

function exportIncomeCSV() {
  if (incomeEntries.length === 0) { toast("No income entries", "error"); return; }
  const csv = ["Date,Title,Source,Amount,Notes", ...incomeEntries.map((e) => `"${e.date}","${e.title}","${e.source}","${e.amount}","${e.notes || "}"`)].join("\n");
  downloadFile(csv, `income - ${ getMonthKey() }.csv`, "text/csv");
  toast("Income CSV exported", "success");
}

function exportTemplate() {
  const template = `Date, Title, Category, Amount, Notes
2026-03-01, Groceries, Food, 1500, Weekly groceries from store
2026-03-02, Uber ride, Transport, 350, Office commute
2026-03-03, Netflix, Entertainment, 1500, Monthly subscription
2026-03-05, New shoes, Shopping, 4500, Running shoes from Nike
2026-03 - 10, Electricity bill, Bills, 3200, March electricity
2026-03 - 12, Doctor visit, Healthcare, 2000, General checkup
2026-03 - 15, Online course, Education, 5000, Udemy course
2026-03 - 20, Gift for friend, Other, 1000, Birthday gift`;

  downloadFile(template, "import-template.csv", "text/csv");
  toast("Template downloaded — fill it in and import!", "success");
}

function exportFullReport() {
  const incomeTotal = incomeEntries.reduce((s, e) => s + parseFloat(e.amount), 0);
  const budgetTotal = budgetItems.reduce((s, i) => s + parseFloat(i.amount), 0);
  const budgetSpent = budgetItems.filter((i) => i.is_done).reduce((s, i) => s + parseFloat(i.amount), 0);
  const dailySpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const remaining = availableBalance + incomeTotal - budgetSpent - dailySpent;

  const catTotals = {};
  expenses.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount); });

  let r = `EXPENSE TRACKER — MONTHLY REPORT\n`;
  r += `Month: ${ currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }) } \n`;
  r += `Generated: ${ new Date().toLocaleString() } \n${ "=".repeat(50) } \n\n`;
  r += `BALANCE OVERVIEW\n${ "-".repeat(30) } \n`;
  r += `Income:             Rs ${ fmtNum(incomeTotal) } \n`;
  r += `Available Balance:  Rs ${ fmtNum(availableBalance) } \n`;
  r += `Budget Planned:     Rs ${ fmtNum(budgetTotal) } \n`;
  r += `Budget Spent:       Rs ${ fmtNum(budgetSpent) } \n`;
  r += `Daily Expenses:     Rs ${ fmtNum(dailySpent) } \n`;
  r += `Remaining:          Rs ${ fmtNum(remaining) } \n\n`;
  r += `INCOME RECORDS(${ incomeEntries.length } entries) \n${ "-".repeat(30) } \n`;
  incomeEntries.forEach((e) => { r += `${ e.date } | ${ e.title } | ${ e.source } | + Rs ${ fmtNum(e.amount) }${ e.notes ? " | " + e.notes : "" } \n`; });
  r += "\n";
  r += `BUDGET PLAN(${ budgetItems.length } items) \n${ "-".repeat(30) } \n`;
  budgetItems.forEach((i) => { r += `[${ i.is_done ? "✓" : " " }] ${ i.title } — Rs ${ fmtNum(i.amount) } \n`; });
  r += "\n";
  r += `CATEGORY BREAKDOWN\n${ "-".repeat(30) } \n`;
  Object.entries(catTotals).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
    r += `${ cat }: Rs ${ fmtNum(amt) } (${ dailySpent > 0 ? ((amt / dailySpent) * 100).toFixed(1) : 0 }%) \n`;
  });
  r += "\n";
  r += `ALL EXPENSES(${ expenses.length } entries) \n${ "-".repeat(30) } \n`;
  expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((e) => {
    r += `${ e.date } | ${ e.title } | ${ e.category } | Rs ${ fmtNum(e.amount) }${ e.notes ? " | " + e.notes : "" } \n`;
  });
  downloadFile(r, `full - report - ${ getMonthKey() }.txt`, "text/plain");
  toast("Full report exported", "success");
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// =============================================
// CHARTS / TRENDS
// =============================================
const CHART_COLORS = ["#6c5ce7", "#0984e3", "#00b894", "#f39c12", "#e74c3c", "#a29bfe", "#fd79a8", "#636e72"];

function renderCharts() { renderCategoryChart(); renderDailyChart(); renderBudgetProgress(); renderTopExpenses(); renderMonthComparison(); }

function renderCategoryChart() {
  const el = document.getElementById("categoryChart");
  if (expenses.length === 0) { el.innerHTML = '<p class="chart-empty">No expense data.</p>'; return; }
  const catTotals = {}; expenses.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount); });
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const max = sorted[0][1]; const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  el.innerHTML = sorted.map(([cat, amt], i) => `
    < div class="bar-row" ><div class="bar-label">${getCatIcon(cat)} ${cat}</div><div class="bar-track"><div class="bar-fill" style="width:${(amt / max) * 100}%; background:${CHART_COLORS[i % CHART_COLORS.length]}"></div></div><div class="bar-value">Rs ${fmtNum(amt)} <small style="color:var(--text-muted)">(${((amt / total) * 100).toFixed(1)}%)</small></div></div > `).join("");
}

function renderDailyChart() {
  const el = document.getElementById("dailyChart");
  if (expenses.length === 0) { el.innerHTML = '<p class="chart-empty">No expense data.</p>'; return; }
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const dayTotals = {}; for (let d = 1; d <= daysInMonth; d++) dayTotals[d] = 0;
  expenses.forEach((e) => { const day = new Date(e.date).getDate(); if (dayTotals[day] !== undefined) dayTotals[day] += parseFloat(e.amount); });
  const maxDay = Math.max(...Object.values(dayTotals), 1);
  el.innerHTML = `< div class="day-bars" > ${ Object.entries(dayTotals).map(([day, amt]) => `<div class="day-bar-col"><div class="day-bar" style="height:${Math.max((amt / maxDay) * 100, 2)}%; background:${amt > 0 ? "#6c5ce7" : "var(--border)"}">${amt > 0 ? `<div class="day-bar-tooltip">Day ${day}: Rs ${fmtNum(amt)}</div>` : ""}</div><div class="day-bar-label">${day % 5 === 0 || day === 1 ? day : ""}</div></div>`).join("") }</div > `;
}

function renderBudgetProgress() {
  const el = document.getElementById("budgetProgress");
  if (budgetItems.length === 0) { el.innerHTML = '<p class="chart-empty">No budget items.</p>'; return; }
  const totalDone = budgetItems.filter((i) => i.is_done).length; const totalItems = budgetItems.length; const overallPct = ((totalDone / totalItems) * 100).toFixed(0);
  let html = `< div class="progress-item" > <div class="progress-header"><span class="progress-name">Overall</span><span class="progress-status ${totalDone === totalItems ? " done" : "pending"}">${totalDone}/${totalItems} (${overallPct}%)</span></div > <div class="progress-bar"><div class="progress-bar-fill" style="width:${overallPct}%; background:${totalDone === totalItems ? " var(--green)" : "var(--accent)"}"></div></div ></div > `;
  budgetItems.forEach((item) => { html += `< div class="progress-item" > <div class="progress-header"><span class="progress-name">${esc(item.title)}</span><span class="progress-status ${item.is_done ? " done" : "pending"}">Rs ${fmtNum(item.amount)} — ${item.is_done ? "✓ Done" : "Pending"}</span></div > <div class="progress-bar"><div class="progress-bar-fill" style="width:${item.is_done ? 100 : 0}%; background:${item.is_done ? " var(--green)" : "var(--orange)"}"></div></div ></div > `; });
  el.innerHTML = html;
}

function renderTopExpenses() {
  const el = document.getElementById("topExpenses");
  if (expenses.length === 0) { el.innerHTML = '<p class="chart-empty">No expenses yet.</p>'; return; }
  el.innerHTML = [...expenses].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5).map((e, i) => `
    < div class="top-item" ><div class="top-rank">#${i + 1}</div><div class="top-info"><div class="top-title">${esc(e.title)}</div><div class="top-cat">${getCatIcon(e.category)} ${esc(e.category)} · ${fmtDate(e.date)}</div></div><div class="top-amount">Rs ${fmtNum(e.amount)}</div></div > `).join("");
}

function renderMonthComparison() {
  const el = document.getElementById("monthComparison");
  const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonth);
  const lastLabel = lastMonth.toLocaleDateString("en-US", { month: "short" });
  const thisLabel = currentMonth.toLocaleDateString("en-US", { month: "short" });
  const lastExpenses = allExpenses.filter((e) => { const d = new Date(e.date); return `${ d.getFullYear() } -${ String(d.getMonth() + 1).padStart(2, "0") } ` === lastMonthKey; });
  const thisTotal = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const lastTotal = lastExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const thisCats = {}, lastCats = {};
  expenses.forEach((e) => { thisCats[e.category] = (thisCats[e.category] || 0) + parseFloat(e.amount); });
  lastExpenses.forEach((e) => { lastCats[e.category] = (lastCats[e.category] || 0) + parseFloat(e.amount); });
  const allCats = [...new Set([...Object.keys(thisCats), ...Object.keys(lastCats)])];
  function tag(c, p) {
    if (p === 0 && c === 0) return '<span class="compare-change same">—</span>';
    if (p === 0) return '<span class="compare-change up">New</span>';
    const d = ((c - p) / p) * 100;
    if (Math.abs(d) < 1) return '<span class="compare-change same">~0%</span>';
    return d > 0 ? `< span class="compare-change up" >▲ ${ d.toFixed(0) }%</span > ` : ` < span class="compare-change down" >▼ ${ Math.abs(d).toFixed(0) }%</span > `;
  }
  let html = `< div class="compare-row" style = "font-weight:700;border-bottom:2px solid var(--border)" ><div class="compare-label">Category</div><div class="compare-values"><span class="compare-old">${lastLabel}</span><span class="compare-new">${thisLabel}</span><span style="min-width:60px;text-align:center">Change</span></div></div > `;
  html += `< div class="compare-row" style = "background:var(--bg-hover);margin:0 -20px;padding:12px 20px;border-radius:var(--radius-sm)" ><div class="compare-label" style="font-weight:700">Total</div><div class="compare-values"><span class="compare-old">Rs ${fmtNum(lastTotal)}</span><span class="compare-new">Rs ${fmtNum(thisTotal)}</span>${tag(thisTotal, lastTotal)}</div></div > `;
  allCats.forEach((cat) => { const c = thisCats[cat] || 0, p = lastCats[cat] || 0; html += `< div class="compare-row" ><div class="compare-label">${getCatIcon(cat)} ${cat}</div><div class="compare-values"><span class="compare-old">Rs ${fmtNum(p)}</span><span class="compare-new">Rs ${fmtNum(c)}</span>${tag(c, p)}</div></div > `; });
  if (allCats.length === 0 && thisTotal === 0 && lastTotal === 0) html = '<p class="chart-empty">No data to compare.</p>';
  el.innerHTML = html;
}

// =============================================
// UTILITIES
// =============================================
function setDefaultDate(fieldId) {
  const today = new Date().toISOString().split("T")[0];
  const el1 = document.getElementById("expenseDate");
  const el2 = document.getElementById("incomeDate");
  if (fieldId) { const el = document.getElementById(fieldId); if (el) el.value = today; }
  else { if (el1) el1.value = today; if (el2) el2.value = today; }
}

function esc(t) { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
function fmtDate(s) { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function fmtNum(n) { return parseFloat(n).toLocaleString("en-PK", { minimumFractionDigits: 0 }); }
function getCatIcon(c) { return ({ Food: "🍔", Transport: "🚗", Entertainment: "🎬", Shopping: "🛍️", Bills: "📄", Healthcare: "⚕️", Education: "📚", Other: "📦" })[c] || "📦"; }
function toast(msg, type = "") { const el = document.getElementById("toast"); el.textContent = msg; el.className = "toast show " + type; clearTimeout(el._tid); el._tid = setTimeout(() => el.className = "toast", 2500); }

// Globals for inline onclick
window.openEditModal = openEditModal;
window.handleDelete = handleDelete;
window.toggleBudget = toggleBudget;
window.deleteBudget = deleteBudget;
window.deleteIncome = deleteIncome;
