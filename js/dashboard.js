// =============================================
// EXPENSE TRACKER — Dashboard Controller
// Budget + Daily Tracker + Income + Charts + Import/Export + Reset + Settings
// =============================================

// ------ State ------
let currentMonth = new Date();
let expenses = [];
let allExpenses = [];
let budgetItems = [];
let nextBudgetItems = [];
let incomeEntries = [];
let currentFilter = "";
let searchQuery = "";
let userSettings = { month_start_day: 1, month_end_day: 0, currency: "Rs" };

// ------ Global Interceptor ------
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);
  if (response.status === 401 && !args[0].includes('/api/me') && !args[0].includes('/api/login')) {
    window.location.href = '/index.html';
  }
  return response;
};

// ------ Init ------
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  await loadSettings();
  renderMonthLabel();
  renderNextMonthLabel();
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

// ------ Settings API ------
async function loadSettings() {
  try {
    const res = await fetch("/api/settings", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        userSettings.month_start_day = parseInt(data.settings.month_start_day) || 1;
        userSettings.month_end_day = parseInt(data.settings.month_end_day) || 0;
        userSettings.currency = data.settings.currency || "Rs";
      }
    }
  } catch (err) {
    console.error("Failed to load settings", err);
  }
}

// ------ Month Helpers ------
// Returns the financial month key (YYYY-MM) for a given date
function getFinancialMonthKey(d) {
  let y = d.getFullYear();
  let m = d.getMonth() + 1; // 1-12

  const startDay = userSettings.month_start_day;
  if (startDay > 1) {
    if (d.getDate() >= startDay) {
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// Returns the financial month key for the CURRENTLY VIEWED cycle
function getMonthKey(d = currentMonth) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function renderMonthLabel() {
  const startDay = userSettings.month_start_day;
  const endDay = userSettings.month_end_day;

  if (startDay === 1 && endDay === 0) {
    document.getElementById("currentMonthLabel").textContent = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else {
    const actualEndDay = endDay > 0 ? endDay : (startDay > 1 ? startDay - 1 : 0);
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, startDay);
    const endDate = actualEndDay > 0
      ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), actualEndDay)
      : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), startDay - 1);
    const fmt = (date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    document.getElementById("currentMonthLabel").textContent = `${fmt(startDate)} - ${fmt(endDate)}, ${endDate.getFullYear()}`;
  }
}

function changeMonth(offset) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
  renderMonthLabel();
  renderNextMonthLabel();
  loadAll();
}

// Returns the month key for the NEXT month relative to currently viewed month
function getNextMonthKey() {
  const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function renderNextMonthLabel() {
  const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  const label = next.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const el = document.getElementById("nextMonthLabel");
  if (el) el.textContent = `Planning for ${label}`;
}

// ------ Listeners ------
function initListeners() {
  document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
  document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab);
      if (tab.dataset.tab === "trends") renderCharts();
      if (tab.dataset.tab === "nextbudget") loadNextBudget(getNextMonthKey());
    });
  });

  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("addBudgetForm").addEventListener("submit", handleAddBudget);
  const cloneBtn = document.getElementById("cloneBudgetBtn");
  if (cloneBtn) cloneBtn.addEventListener("click", handleCloneBudget);
  document.getElementById("addExpenseForm").addEventListener("submit", handleAddExpense);
  document.getElementById("editExpenseForm").addEventListener("submit", handleEditExpense);
  const editBudgetForm = document.getElementById("editBudgetForm");
  if (editBudgetForm) editBudgetForm.addEventListener("submit", handleEditBudget);
  document.getElementById("addIncomeForm").addEventListener("submit", handleAddIncome);

  // Next Month Budget listeners
  const addNextBudgetForm = document.getElementById("addNextBudgetForm");
  if (addNextBudgetForm) addNextBudgetForm.addEventListener("submit", handleAddNextBudget);
  const copyBtn = document.getElementById("copyCurrentBudgetBtn");
  if (copyBtn) copyBtn.addEventListener("click", handleCopyCurrentBudget);
  const editNextBudgetForm = document.getElementById("editNextBudgetForm");
  if (editNextBudgetForm) editNextBudgetForm.addEventListener("submit", handleEditNextBudget);

  document.getElementById("filterCategory").addEventListener("change", (e) => {
    currentFilter = e.target.value;
    displayExpenses();
  });

  // Search
  document.getElementById("searchExpense").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    displayExpenses();
  });

  // Settings modal
  document.getElementById("settingsBtn").addEventListener("click", openSettingsModal);
  document.getElementById("cancelSettings").addEventListener("click", () => document.getElementById("settingsModal").classList.remove("show"));
  document.getElementById("saveSettingsBtn").addEventListener("click", handleSaveSettings);

  // Export modal
  document.getElementById("exportBtn").addEventListener("click", () => document.getElementById("exportModal").classList.add("show"));
  document.getElementById("cancelExport").addEventListener("click", () => document.getElementById("exportModal").classList.remove("show"));
  document.getElementById("exportModal").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.target.classList.remove("show"); });

  document.getElementById("exportCSV").addEventListener("click", () => { exportExpensesCSV(); closeExportModal(); });
  document.getElementById("exportJSON").addEventListener("click", () => { exportExpensesJSON(); closeExportModal(); });
  document.getElementById("exportBudgetCSV").addEventListener("click", () => { exportBudgetCSV(); closeExportModal(); });
  document.getElementById("exportIncomeCSV").addEventListener("click", () => { exportIncomeCSV(); closeExportModal(); });
  document.getElementById("exportFullReport").addEventListener("click", () => { exportFullReport(); closeExportModal(); });
  document.getElementById("exportTemplate").addEventListener("click", () => { exportTemplate(); closeExportModal(); });

  // Import
  document.getElementById("importFile").addEventListener("change", handleImport);

  // Edit modal close — close all modals
  document.querySelectorAll(".close-modal").forEach((btn) => btn.addEventListener("click", () => { closeEditModal(); closeEditBudgetModal(); closeEditNextBudgetModal(); }));

  // Overlay clicks
  document.getElementById("settingsModal").addEventListener("click", (e) => { if (e.target === e.currentTarget) document.getElementById("settingsModal").classList.remove("show"); });
  document.getElementById("editModal").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeEditModal(); });
  const editBudgetModal = document.getElementById("editBudgetModal");
  if (editBudgetModal) editBudgetModal.addEventListener("click", (e) => { if (e.target === e.currentTarget) closeEditBudgetModal(); });
  const editNextBudgetModal = document.getElementById("editNextBudgetModal");
  if (editNextBudgetModal) editNextBudgetModal.addEventListener("click", (e) => { if (e.target === e.currentTarget) closeEditNextBudgetModal(); });

  // Reset All
  document.getElementById("resetAllBtn").addEventListener("click", handleResetAll);

  // Keyboard: Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeEditModal(); closeExportModal(); closeEditBudgetModal(); closeEditNextBudgetModal(); document.getElementById("settingsModal").classList.remove("show"); }
  });
}

function closeExportModal() { document.getElementById("exportModal").classList.remove("show"); }

function openSettingsModal() {
  document.getElementById("settingStartDay").value = userSettings.month_start_day;
  document.getElementById("settingEndDay").value = userSettings.month_end_day;
  document.getElementById("settingCurrency").value = userSettings.currency;
  document.getElementById("settingsModal").classList.add("show");
}

async function handleSaveSettings() {
  const day = parseInt(document.getElementById("settingStartDay").value);
  const endDay = parseInt(document.getElementById("settingEndDay").value) || 0;
  const cur = document.getElementById("settingCurrency").value.trim() || 'Rs';

  if (day < 1 || day > 28) { toast("Start day must be 1-28", "error"); return; }
  if (endDay < 0 || endDay > 28) { toast("End day must be 0-28", "error"); return; }
  if (endDay > 0 && endDay === day) { toast("End day cannot be the same as start day", "error"); return; }

  try {
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ month_start_day: day, month_end_day: endDay, currency: cur })
    });
    if (res.ok) {
      userSettings.month_start_day = day;
      userSettings.month_end_day = endDay;
      userSettings.currency = cur;
      document.getElementById("settingsModal").classList.remove("show");
      toast("Settings saved", "success");
      renderMonthLabel();
      await loadAll();
    } else {
      toast("Failed to save", "error");
    }
  } catch { toast("Network error", "error"); }
}

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
  await Promise.all([loadExpenses(month), loadBudget(month), loadIncome(month), loadNextBudget(getNextMonthKey())]);
  // Re-render budget AFTER expenses are loaded (fixes race condition where
  // loadBudget finishes before loadExpenses, causing spent to show as 0)
  displayBudget();
  updateBudgetSummary();
  displayNextBudget();
  updateNextBudgetSummary();
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
    expenses = allExpenses.filter((exp) => getFinancialMonthKey(new Date(exp.date)) === month);
    displayExpenses();
  } catch {
    document.getElementById("expensesList").innerHTML = '<p class="empty-msg" style="color:var(--red)">Failed to load expenses.</p>';
  }
}

function displayExpenses() {
  const list = document.getElementById("expensesList");
  let filtered = currentFilter ? expenses.filter((e) => e.category === currentFilter) : expenses;
  // Apply search query
  if (searchQuery) {
    filtered = filtered.filter((e) =>
      (e.title && e.title.toLowerCase().includes(searchQuery)) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery)) ||
      (e.category && e.category.toLowerCase().includes(searchQuery)) ||
      (e.amount && String(e.amount).includes(searchQuery))
    );
  }
  updateDailySummary(filtered);
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
        <div class="expense-amount-val">${fmtCurr(exp.amount)}</div>
      </div>
      <div class="expense-actions">
        <button class="btn-sm" onclick="openEditModal('${exp.id}')">Edit</button>
        <button class="btn-sm delete" onclick="handleDelete('${exp.id}')">Delete</button>
      </div>
    </div>`).join("");
}

function updateDailySummary(filteredData = expenses) {
  const total = filteredData.reduce((s, e) => s + parseFloat(e.amount), 0);
  const today = new Date().toISOString().split("T")[0];
  const todayTotal = filteredData.filter((e) => e.date === today).reduce((s, e) => s + parseFloat(e.amount), 0);
  document.getElementById("dailyTotalSpent").textContent = `${fmtCurr(total)}`;
  document.getElementById("dailyTodaySpent").textContent = `${fmtCurr(todayTotal)}`;
  document.getElementById("dailyTotalEntries").textContent = filteredData.length;
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
  document.getElementById("editExpenseDate").value = exp.date ? exp.date.split("T")[0] : "";
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
// NOTE: budget items and total limits are set per cycle (month key) on backend
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
  if (budgetItems.length === 0) { list.innerHTML = '<p class="empty-msg">No budget limits defined for this cycle.</p>'; return; }

  // Group items by category
  const grouped = {};
  budgetItems.forEach((item) => {
    const cat = item.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  let html = '';
  Object.entries(grouped).forEach(([cat, items]) => {
    const categoryLimit = items.reduce((s, i) => s + parseFloat(i.amount), 0);
    const catExpenses = expenses.filter(e => e.category === cat);
    const categorySpent = catExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const categoryRemaining = categoryLimit - categorySpent;
    const isOver = categoryRemaining < 0;
    const pct = categoryLimit > 0 ? Math.min((categorySpent / categoryLimit) * 100, 100) : 0;
    const pctUsed = categoryLimit > 0 ? ((categorySpent / categoryLimit) * 100).toFixed(0) : 0;

    html += `<div class="budget-category-group">`;
    // Category header with totals
    html += `
      <div class="budget-cat-header ${isOver ? 'over-budget' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="font-weight: 700; font-size: 1.05rem;">${getCatIcon(cat)} ${esc(cat)} <span class="budget-cat-count">${items.length} item${items.length > 1 ? 's' : ''}</span></div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="budget-pct-badge ${isOver ? 'over' : pct > 80 ? 'warn' : 'ok'}">${isOver ? pctUsed + '% ⚠' : pctUsed + '% used'}</span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px; color:var(--text-secondary);">
          <span>Limit: <strong style="color:var(--text-primary)">${fmtCurr(categoryLimit)}</strong></span>
          <span>Spent: <span style="color:var(--orange); font-weight:600">${fmtCurr(categorySpent)}</span></span>
          <span>${isOver ? 'Over:' : 'Left:'} <strong class="${isOver ? 'text-red' : 'text-green'}">${fmtCurr(Math.abs(categoryRemaining))}</strong></span>
        </div>
        <div class="progress-bar" style="height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
          <div class="progress-bar-fill" style="height: 100%; width:${pct}%; background:${isOver ? 'var(--red)' : pct > 80 ? 'var(--orange)' : 'var(--accent)'}; transition: width 0.3s ease;"></div>
        </div>
      </div>`;

    // Allocate expenses to items to prevent double-counting
    let itemSpends = items.map(() => 0);
    let unallocatedSpent = 0;

    if (items.length === 1) {
      itemSpends[0] = categorySpent;
    } else {
      catExpenses.forEach((e) => {
        const eTitle = e.title.toLowerCase().trim();
        let matchedIdx = -1;

        // Exact match first
        for (let i = 0; i < items.length; i++) {
          if (eTitle === items[i].title.toLowerCase().trim()) {
            matchedIdx = i; break;
          }
        }

        // Partial match fallback
        if (matchedIdx === -1) {
          for (let i = 0; i < items.length; i++) {
            const bTitle = items[i].title.toLowerCase().trim();
            if (eTitle.includes(bTitle) || bTitle.includes(eTitle)) {
              matchedIdx = i; break;
            }
          }
        }

        if (matchedIdx !== -1) {
          itemSpends[matchedIdx] += parseFloat(e.amount);
        } else {
          unallocatedSpent += parseFloat(e.amount);
        }
      });
    }

    // Individual sub-items
    items.forEach((item, idx) => {
      const limit = parseFloat(item.amount);
      const shareOfCategory = categoryLimit > 0 ? (limit / categoryLimit) : 0;
      const itemSpent = itemSpends[idx];

      const subRemaining = limit - itemSpent;
      const subIsOver = subRemaining < 0;
      const subPct = limit > 0 ? Math.min((itemSpent / limit) * 100, 100) : 0;
      const subPctUsed = limit > 0 ? ((itemSpent / limit) * 100).toFixed(0) : 0;
      const sharePct = (shareOfCategory * 100).toFixed(0);

      html += `
      <div class="budget-sub-item">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="budget-sub-dot ${subIsOver ? 'over' : subPct > 80 ? 'warn' : ''}"></span>
            <span style="font-weight: 600; font-size: 0.9rem;">${esc(item.title)}</span>
            <span class="budget-sub-pct">${sharePct}% of ${esc(cat)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="budget-pct-badge sm ${subIsOver ? 'over' : subPct > 80 ? 'warn' : 'ok'}">${subPctUsed}%</span>
            <div class="budget-actions">
              <button class="btn-sm" onclick="openEditBudgetModal('${item.id}')">Edit</button>
              <button class="btn-sm delete" onclick="deleteBudget('${item.id}')">✕</button>
            </div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color:var(--text-muted); margin-bottom: 4px;">
          <span>Limit: ${fmtCurr(limit)}</span>
          <span>Spent: <span style="color:var(--orange)">${fmtCurr(itemSpent)}</span></span>
          <span>${subIsOver ? 'Over:' : 'Left:'} <span class="${subIsOver ? 'text-red' : 'text-green'}">${fmtCurr(Math.abs(subRemaining))}</span></span>
        </div>
        <div class="progress-bar" style="height: 4px; background: var(--border); border-radius: 2px; overflow: hidden;">
          <div class="progress-bar-fill" style="height: 100%; width:${subPct}%; background:${subIsOver ? 'var(--red)' : subPct > 80 ? 'var(--orange)' : 'var(--green)'}; transition: width 0.3s ease;"></div>
        </div>
      </div>`;
    });

    if (unallocatedSpent > 0 && items.length > 1) {
      html += `
      <div class="budget-sub-item">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="budget-sub-dot over"></span>
            <span style="font-weight: 600; font-size: 0.9rem;">Uncategorized / Other</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
             <span class="budget-pct-badge sm over">Unplanned</span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color:var(--text-muted); margin-bottom: 4px;">
          <span>Limit: ${fmtCurr(0)}</span>
          <span>Spent: <span style="color:var(--orange)">${fmtCurr(unallocatedSpent)}</span></span>
          <span>Over: <span class="text-red">${fmtCurr(unallocatedSpent)}</span></span>
        </div>
        <div class="progress-bar" style="height: 4px; background: var(--border); border-radius: 2px; overflow: hidden;">
          <div class="progress-bar-fill" style="height: 100%; width:100%; background:var(--red); transition: width 0.3s ease;"></div>
        </div>
      </div>`;
    }

    html += `</div>`;
  });

  list.innerHTML = html;
}

function updateBudgetSummary() {
  const totalLimit = budgetItems.reduce((s, i) => s + parseFloat(i.amount), 0);
  const budgetedCategories = new Set(budgetItems.map(i => i.category || 'Other'));
  const totalSpent = expenses.filter(e => budgetedCategories.has(e.category)).reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const remaining = totalLimit - totalSpent;
  document.getElementById("budgetTotalPlanned").textContent = `${fmtCurr(totalLimit)}`;
  if (document.getElementById("budgetTotalSpent")) document.getElementById("budgetTotalSpent").textContent = `${fmtCurr(totalSpent)}`;
  if (document.getElementById("budgetTotalRemaining")) {
    document.getElementById("budgetTotalRemaining").textContent = `${fmtCurr(remaining)}`;
    document.getElementById("budgetTotalRemaining").className = remaining < 0 ? "summary-num text-red" : "summary-num text-green";
  }
}

async function handleAddBudget(e) {
  e.preventDefault();
  const title = document.getElementById("budgetTitle").value.trim();
  const category = document.getElementById("budgetCategory").value;
  const amount = document.getElementById("budgetAmount").value;
  if (!title || !category || !amount) return;
  // No duplicate restriction — multiple items per category allowed (e.g. Milk + Lunch under Food)
  try {
    const res = await fetch("/api/budget", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title, category, amount: parseFloat(amount), month: getMonthKey() }) });
    if (res.ok) { e.target.reset(); toast("Budget limit added", "success"); await loadBudget(getMonthKey()); updateBalanceBar(); }
    else { const d = await res.json(); toast(d.error || "Failed", "error"); }
  } catch { toast("Network error", "error"); }
}

async function handleCloneBudget() {
  const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonth);
  try {
    const res = await fetch(`/api/budget?month=${lastMonthKey}`, { credentials: "include" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const oldItems = data.items || [];
    if (oldItems.length === 0) { toast("No budget items in previous cycle.", "error"); return; }

    let cloned = 0;
    for (const item of oldItems) {
      const cat = item.category || 'Other';
      // Check by title+category to allow multiple items per category
      if (!budgetItems.some(i => i.title === item.title && (i.category || 'Other') === cat)) {
        await fetch("/api/budget", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: item.title, category: cat, amount: parseFloat(item.amount), month: getMonthKey() }) });
        cloned++;
      }
    }
    if (cloned > 0) {
      toast(`${cloned} budget items cloned`, "success");
      await loadBudget(getMonthKey());
      updateBalanceBar();
    } else {
      toast("No new budget items to clone (already exist)", "error");
    }
  } catch { toast("Failed to clone budget", "error"); }
}

function openEditBudgetModal(id) {
  const item = budgetItems.find((e) => e.id === id);
  if (!item) return;
  document.getElementById("editBudgetId").value = item.id;
  document.getElementById("editBudgetTitle").value = item.title;
  document.getElementById("editBudgetCategory").value = item.category || "Other";
  document.getElementById("editBudgetAmount").value = item.amount;
  document.getElementById("editBudgetModal").classList.add("show");
}

function closeEditBudgetModal() {
  const modal = document.getElementById("editBudgetModal");
  if (modal) modal.classList.remove("show");
}

async function handleEditBudget(e) {
  e.preventDefault();
  const id = document.getElementById("editBudgetId").value;
  const form = e.target;
  const data = { title: form.title.value.trim(), category: form.category.value, amount: form.amount.value };
  try {
    const res = await fetch(`/api/budget/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
    if (res.ok) { closeEditBudgetModal(); toast("Budget limit updated", "success"); await loadBudget(getMonthKey()); updateBalanceBar(); }
    else toast("Failed to update", "error");
  } catch { toast("Network error", "error"); }
}

async function deleteBudget(id) {
  if (!confirm("Delete this budget limit?")) return;
  try {
    const res = await fetch(`/api/budget/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { toast("Deleted", "success"); await loadBudget(getMonthKey()); updateBalanceBar(); }
  } catch { toast("Failed", "error"); }
}

// =============================================
// NEXT MONTH BUDGET PLAN
// =============================================
async function loadNextBudget(month) {
  try {
    const res = await fetch(`/api/budget?month=${month}`, { credentials: "include" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    nextBudgetItems = data.items || [];
    displayNextBudget();
    updateNextBudgetSummary();
  } catch {
    const el = document.getElementById("nextBudgetList");
    if (el) el.innerHTML = '<p class="empty-msg" style="color:var(--red)">Failed to load next month budget.</p>';
  }
}

function displayNextBudget() {
  const list = document.getElementById("nextBudgetList");
  if (!list) return;
  if (nextBudgetItems.length === 0) {
    list.innerHTML = '<p class="empty-msg">No budget items planned for next month yet. Add items above or copy from current month!</p>';
    return;
  }

  // Group by category
  const grouped = {};
  nextBudgetItems.forEach((item) => {
    const cat = item.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  let html = '';
  Object.entries(grouped).forEach(([cat, items]) => {
    const categoryLimit = items.reduce((s, i) => s + parseFloat(i.amount), 0);
    // Compare with current month's total for this category
    const currentCatLimit = budgetItems.filter(b => (b.category || 'Other') === cat).reduce((s, i) => s + parseFloat(i.amount), 0);
    const diff = categoryLimit - currentCatLimit;
    const diffLabel = currentCatLimit > 0 ? (diff > 0 ? `▲ ${fmtCurr(diff)} more` : diff < 0 ? `▼ ${fmtCurr(Math.abs(diff))} less` : '= Same') : 'New Category';
    const diffClass = currentCatLimit > 0 ? (diff > 0 ? 'text-orange' : diff < 0 ? 'text-green' : 'text-blue') : 'text-accent';

    html += `<div class="budget-category-group next-budget-item">`;
    // Category header
    html += `
      <div class="budget-cat-header">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="font-weight: 700; font-size: 1.05rem;">${getCatIcon(cat)} ${esc(cat)}</div>
          <span class="${diffClass}" style="font-weight:600; font-size: 0.85rem;">${diffLabel}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 6px; color:var(--text-secondary);">
          <span>Next Month Limit: <strong style="color:var(--text-primary)">${fmtCurr(categoryLimit)}</strong></span>
          <span>Current Month: <span style="color:var(--text-muted); font-weight:500">${currentCatLimit > 0 ? fmtCurr(currentCatLimit) : '—'}</span></span>
        </div>
        <div class="progress-bar" style="height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;">
          <div class="progress-bar-fill" style="height: 100%; width:100%; background:var(--accent)"></div>
        </div>
      </div>`;

    // Sub-items
    items.forEach((item) => {
      const limit = parseFloat(item.amount);
      const itemPct = categoryLimit > 0 ? ((limit / categoryLimit) * 100).toFixed(0) : 0;
      html += `
      <div class="budget-sub-item">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="budget-sub-dot"></span>
            <span style="font-weight: 600; font-size: 0.9rem;">${esc(item.title)}</span>
            <span class="budget-sub-pct">${itemPct}%</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 0.9rem;">${fmtCurr(limit)}</span>
            <div class="budget-actions">
              <button class="btn-sm" onclick="openEditNextBudgetModal('${item.id}')">Edit</button>
              <button class="btn-sm delete" onclick="deleteNextBudget('${item.id}')">✕</button>
            </div>
          </div>
        </div>
      </div>`;
    });

    html += `</div>`;
  });

  list.innerHTML = html;
}

function updateNextBudgetSummary() {
  const totalLimit = nextBudgetItems.reduce((s, i) => s + parseFloat(i.amount), 0);
  const categoriesCount = new Set(nextBudgetItems.map(i => i.category || 'Other')).size;
  const currentTotal = budgetItems.reduce((s, i) => s + parseFloat(i.amount), 0);

  const el1 = document.getElementById("nextBudgetTotalPlanned");
  const el2 = document.getElementById("nextBudgetCategoriesCount");
  const el3 = document.getElementById("nextBudgetVsCurrent");

  if (el1) el1.textContent = fmtCurr(totalLimit);
  if (el2) el2.textContent = categoriesCount;
  if (el3) {
    if (currentTotal === 0 && totalLimit === 0) {
      el3.textContent = '—';
      el3.className = 'summary-num';
    } else if (currentTotal === 0) {
      el3.textContent = 'New Plan';
      el3.className = 'summary-num text-accent';
    } else {
      const diff = totalLimit - currentTotal;
      const pct = ((diff / currentTotal) * 100).toFixed(0);
      if (Math.abs(diff) < 1) {
        el3.textContent = '~Same';
        el3.className = 'summary-num text-blue';
      } else if (diff > 0) {
        el3.textContent = `▲ ${pct}% more`;
        el3.className = 'summary-num text-orange';
      } else {
        el3.textContent = `▼ ${Math.abs(pct)}% less`;
        el3.className = 'summary-num text-green';
      }
    }
  }
}

async function handleAddNextBudget(e) {
  e.preventDefault();
  const title = document.getElementById("nextBudgetTitle").value.trim();
  const category = document.getElementById("nextBudgetCategory").value;
  const amount = document.getElementById("nextBudgetAmount").value;
  if (!title || !category || !amount) return;
  // No duplicate restriction — multiple items per category allowed
  try {
    const res = await fetch("/api/budget", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title, category, amount: parseFloat(amount), month: getNextMonthKey() }) });
    if (res.ok) { e.target.reset(); toast("Next month budget item added", "success"); await loadNextBudget(getNextMonthKey()); }
    else { const d = await res.json(); toast(d.error || "Failed", "error"); }
  } catch { toast("Network error", "error"); }
}

async function handleCopyCurrentBudget() {
  if (budgetItems.length === 0) {
    toast("No budget items in current month to copy!", "error");
    return;
  }
  const confirmCopy = confirm(`This will copy ${budgetItems.length} budget item(s) from current month to next month.\nExisting next month items with the same category will be skipped.\n\nContinue?`);
  if (!confirmCopy) return;

  let copied = 0;
  let skipped = 0;
  for (const item of budgetItems) {
    const cat = item.category || 'Other';
    if (nextBudgetItems.some(i => i.title === item.title && (i.category || 'Other') === cat)) {
      skipped++;
      continue;
    }
    try {
      await fetch("/api/budget", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: item.title, category: cat, amount: parseFloat(item.amount), month: getNextMonthKey() })
      });
      copied++;
    } catch { /* skip failed */ }
  }

  if (copied > 0) {
    toast(`${copied} budget item(s) copied to next month${skipped > 0 ? `, ${skipped} skipped (already exist)` : ''}`, "success");
    await loadNextBudget(getNextMonthKey());
  } else if (skipped > 0) {
    toast(`All items already exist in next month's budget (${skipped} skipped)`, "error");
  } else {
    toast("Failed to copy budget items", "error");
  }
}

function openEditNextBudgetModal(id) {
  const item = nextBudgetItems.find((e) => e.id === id);
  if (!item) return;
  document.getElementById("editNextBudgetId").value = item.id;
  document.getElementById("editNextBudgetTitle").value = item.title;
  document.getElementById("editNextBudgetCategory").value = item.category || "Other";
  document.getElementById("editNextBudgetAmount").value = item.amount;
  document.getElementById("editNextBudgetModal").classList.add("show");
}

function closeEditNextBudgetModal() {
  const modal = document.getElementById("editNextBudgetModal");
  if (modal) modal.classList.remove("show");
}

async function handleEditNextBudget(e) {
  e.preventDefault();
  const id = document.getElementById("editNextBudgetId").value;
  const form = e.target;
  const data = { title: form.title.value.trim(), category: form.category.value, amount: form.amount.value };
  try {
    const res = await fetch(`/api/budget/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
    if (res.ok) { closeEditNextBudgetModal(); toast("Next month budget updated", "success"); await loadNextBudget(getNextMonthKey()); }
    else toast("Failed to update", "error");
  } catch { toast("Network error", "error"); }
}

async function deleteNextBudget(id) {
  if (!confirm("Delete this next month budget limit?")) return;
  try {
    const res = await fetch(`/api/budget/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { toast("Deleted", "success"); await loadNextBudget(getNextMonthKey()); }
  } catch { toast("Failed", "error"); }
}

// =============================================
// INCOME
// =============================================
async function loadIncome(month) {
  try {
    // API returns ALL income entries, we filter on frontend to reuse the financial month logic easily
    const res = await fetch(`/api/income`, { credentials: "include" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const allIncome = data.entries || [];
    incomeEntries = allIncome.filter((exp) => getFinancialMonthKey(new Date(exp.date)) === month);
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
        <div class="income-amount-val">+ ${fmtCurr(entry.amount)}</div>
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
  if (el1) el1.textContent = `${fmtCurr(total)}`;
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
function updateBalanceBar() {
  const incomeTotal = incomeEntries.reduce((s, e) => s + parseFloat(e.amount), 0);
  const budgetTotal = budgetItems.reduce((s, i) => s + parseFloat(i.amount), 0);
  const dailySpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  // Compute Budget Spent ensuring no double deductions across duplicates
  const budgetedCategories = new Set(budgetItems.map(i => i.category || 'Other'));
  const budgetSpent = expenses.filter(e => budgetedCategories.has(e.category)).reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Remaining Balance is simply Income - Total Daily Spent.
  const remaining = incomeTotal - dailySpent;

  document.getElementById("balanceIncome").textContent = `${fmtCurr(incomeTotal)}`;
  document.getElementById("balanceBudgetTotal").textContent = `${fmtCurr(budgetTotal)}`;
  if (document.getElementById("balanceBudgetSpent")) document.getElementById("balanceBudgetSpent").textContent = `${fmtCurr(budgetSpent)}`;
  document.getElementById("balanceDailySpent").textContent = `${fmtCurr(dailySpent)}`;

  const el = document.getElementById("balanceRemaining");
  el.textContent = `${fmtCurr(remaining)}`;
  el.className = remaining < 0 ? "balance-value text-red" : remaining < incomeTotal * 0.2 ? "balance-value text-orange" : "balance-value text-accent";
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
      expenses = []; allExpenses = []; budgetItems = []; nextBudgetItems = []; incomeEntries = [];
      displayExpenses(); displayBudget(); displayIncome(); displayNextBudget();
      updateDailySummary(); updateBudgetSummary(); updateIncomeSummary(); updateNextBudgetSummary(); updateBalanceBar();
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
  const validCats = ["Food", "Transport", "Entertainment", "Shopping", "Bills", "Healthcare", "Education", "Loan", "Rent", "Other"];
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
  const csv = ["Budget Name,Category Limit,Planned Amount,Amount Spent,Variance", ...budgetItems.map((i) => {
    const cat = i.category || 'Other';
    const spent = expenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount), 0);
    return `"${i.title}","${cat}","${i.amount}","${spent}","${parseFloat(i.amount) - spent}"`;
  })].join("\n");
  downloadFile(csv, `budget-${getMonthKey()}.csv`, "text/csv");
  toast("Budget CSV exported", "success");
}

function exportIncomeCSV() {
  if (incomeEntries.length === 0) { toast("No income entries", "error"); return; }
  const csv = ["Date,Title,Source,Amount,Notes", ...incomeEntries.map((e) => `"${e.date}","${e.title}","${e.source}","${e.amount}","${e.notes || ""}"`)].join("\n");
  downloadFile(csv, `income-${getMonthKey()}.csv`, "text/csv");
  toast("Income CSV exported", "success");
}

function exportTemplate() {
  const template = `Date,Title,Category,Amount,Notes
2026-03-01,Groceries,Food,1500,Weekly groceries from store
2026-03-02,Uber ride,Transport,350,Office commute
2026-03-03,Netflix,Entertainment,1500,Monthly subscription
2026-03-05,New shoes,Shopping,4500,Running shoes from Nike
2026-03-10,Electricity bill,Bills,3200,March electricity
2026-03-12,Doctor visit,Healthcare,2000,General checkup
2026-03-15,Online course,Education,5000,Udemy course
2026-03-20,Gift for friend,Other,1000,Birthday gift`;

  downloadFile(template, "import-template.csv", "text/csv");
  toast("Template downloaded — fill it in and import!", "success");
}

function exportFullReport() {
  const incomeTotal = incomeEntries.reduce((s, e) => s + parseFloat(e.amount), 0);
  const budgetTotal = budgetItems.reduce((s, i) => s + parseFloat(i.amount), 0);
  const budgetedCats = new Set(budgetItems.map(i => i.category || 'Other'));
  const budgetSpent = expenses.filter(e => budgetedCats.has(e.category)).reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const dailySpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const remaining = incomeTotal - dailySpent;

  const catTotals = {};
  expenses.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount); });

  let r = `EXPENSE TRACKER — MONTHLY REPORT\n`;
  r += `Month: ${document.getElementById("currentMonthLabel").textContent}\n`;
  r += `Generated: ${new Date().toLocaleString()}\n${"=".repeat(50)}\n\n`;
  r += `BALANCE OVERVIEW\n${"-".repeat(30)}\n`;
  r += `Income:             ${fmtCurr(incomeTotal)}\n`;
  r += `Budget Planned:     ${fmtCurr(budgetTotal)}\n`;
  r += `Budgeted Spent:     ${fmtCurr(budgetSpent)}\n`;
  r += `Total Daily Spent:  ${fmtCurr(dailySpent)}\n`;
  r += `Remaining:          ${fmtCurr(remaining)}\n\n`;
  r += `INCOME RECORDS (${incomeEntries.length} entries)\n${"-".repeat(30)}\n`;
  incomeEntries.forEach((e) => { r += `${e.date} | ${e.title} | ${e.source} | + ${fmtCurr(e.amount)}${e.notes ? " | " + e.notes : ""}\n`; });
  r += "\n";
  r += `BUDGET PLAN (${budgetItems.length} items)\n${"-".repeat(30)}\n`;
  budgetItems.forEach((i) => {
    const cat = i.category || 'Other';
    const spent = expenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount), 0);
    r += `${i.title} (${cat}) Limit: ${fmtCurr(i.amount)} | Spent: ${fmtCurr(spent)} | Variance: ${fmtCurr(parseFloat(i.amount) - spent)}\n`;
  });
  r += "\n";
  r += `CATEGORY BREAKDOWN\n${"-".repeat(30)}\n`;
  Object.entries(catTotals).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
    r += `${cat}: ${fmtCurr(amt)} (${dailySpent > 0 ? ((amt / dailySpent) * 100).toFixed(1) : 0}%)\n`;
  });
  r += "\n";
  r += `ALL EXPENSES (${expenses.length} entries)\n${"-".repeat(30)}\n`;
  expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((e) => {
    r += `${e.date} | ${e.title} | ${e.category} | ${fmtCurr(e.amount)}${e.notes ? " | " + e.notes : ""}\n`;
  });
  downloadFile(r, `full-report-${getMonthKey()}.txt`, "text/plain");
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
let apexInstances = {};

function renderCharts() { renderCategoryChart(); renderDailyChart(); renderBudgetProgress(); renderTopExpenses(); renderMonthComparison(); }

function renderCategoryChart() {
  const el = document.getElementById("categoryChart");
  if (expenses.length === 0) {
    if (apexInstances.cat) { apexInstances.cat.destroy(); delete apexInstances.cat; }
    el.innerHTML = '<p class="chart-empty">No expense data.</p>';
    return;
  }
  const catTotals = {}; expenses.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount); });
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  const labels = sorted.map(i => i[0]);
  const data = sorted.map(i => i[1]);

  if (apexInstances.cat) { apexInstances.cat.destroy(); }
  el.innerHTML = '';

  const options = {
    series: data,
    theme: { mode: 'dark' },
    chart: { type: 'donut', height: 320, background: 'transparent', foreColor: '#e2e8f0' },
    labels: labels.map(c => getCatIcon(c) + ' ' + c),
    colors: CHART_COLORS,
    plotOptions: { pie: { donut: { size: '65%' } } },
    dataLabels: { enabled: true, formatter: function (val) { return val.toFixed(1) + "%" } },
    legend: { position: 'bottom' },
    stroke: { show: false },
    tooltip: { theme: 'dark', y: { formatter: function (val) { return fmtCurr(val) } } }
  };
  apexInstances.cat = new ApexCharts(el, options);
  apexInstances.cat.render();
}

function renderDailyChart() {
  const el = document.getElementById("dailyChart");
  if (expenses.length === 0) {
    if (apexInstances.daily) { apexInstances.daily.destroy(); delete apexInstances.daily; }
    el.innerHTML = '<p class="chart-empty">No expense data.</p>';
    return;
  }

  const startDay = userSettings.month_start_day;
  const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (startDay > 1 ? 1 : 0), startDay);
  const eYear = currentMonth.getFullYear();
  const eMonth = currentMonth.getMonth() + (startDay > 1 ? 0 : 1);
  const eDate = startDay > 1 ? startDay - 1 : 0;
  const endDate = new Date(eYear, eMonth, eDate);

  const dayTotals = {};
  let curr = new Date(startDate);
  while (curr <= endDate) {
    dayTotals[`${curr.getDate()} ${curr.toLocaleString('en-US', { month: 'short' })}`] = 0;
    curr.setDate(curr.getDate() + 1);
  }

  expenses.forEach((e) => {
    const d = new Date(e.date);
    const k = `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
    if (dayTotals[k] !== undefined) dayTotals[k] += parseFloat(e.amount);
  });

  const categories = Object.keys(dayTotals);
  const data = Object.values(dayTotals);

  if (apexInstances.daily) { apexInstances.daily.destroy(); }
  el.innerHTML = '';

  const options = {
    series: [{ name: 'Spent', data: data }],
    theme: { mode: 'dark' },
    chart: { type: 'area', height: 300, toolbar: { show: false }, background: 'transparent', foreColor: '#e2e8f0' },
    colors: ['#0984e3'],
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: { categories: categories, tickAmount: Math.min(categories.length, 10) },
    yaxis: { labels: { formatter: function (val) { return fmtCurr(val); } } },
    tooltip: { theme: 'dark', y: { formatter: function (val) { return fmtCurr(val) } } }
  };

  apexInstances.daily = new ApexCharts(el, options);
  apexInstances.daily.render();
}

function renderBudgetProgress() {
  const el = document.getElementById("budgetProgress");
  if (budgetItems.length === 0) {
    if (apexInstances.budget) { apexInstances.budget.destroy(); delete apexInstances.budget; }
    el.innerHTML = '<p class="chart-empty">No budget items.</p>';
    return;
  }

  let categories = [];
  let planned = [];
  let spentData = [];
  let overallLimit = 0;
  let overallSpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  // Group items by category to resolve DB duplicates
  const groupedBudgets = {};
  budgetItems.forEach((item) => {
    const cat = item.category || 'Other';
    groupedBudgets[cat] = (groupedBudgets[cat] || 0) + parseFloat(item.amount);
  });

  Object.entries(groupedBudgets).forEach(([cat, limit]) => {
    const spent = expenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount), 0);
    overallLimit += limit;
    categories.push(`${getCatIcon(cat)} ${cat}`);
    planned.push(limit);
    spentData.push(spent);
  });

  categories.unshift('Overall Budget');
  planned.unshift(overallLimit);
  spentData.unshift(overallSpent);

  if (apexInstances.budget) { apexInstances.budget.destroy(); }
  el.innerHTML = '';

  const options = {
    series: [
      { name: 'Planned Limit', data: planned },
      { name: 'Actual Spent', data: spentData }
    ],
    theme: { mode: 'dark' },
    chart: { type: 'bar', height: Math.max(250, categories.length * 60), toolbar: { show: false }, background: 'transparent', foreColor: '#e2e8f0' },
    plotOptions: { bar: { horizontal: true, dataLabels: { position: 'top' }, borderRadius: 4, barHeight: '70%' } },
    colors: ['#00b894', '#e74c3c'],
    dataLabels: {
      enabled: true, offsetX: 25,
      style: { fontSize: '12px', colors: ['#e2e8f0'] },
      formatter: function (val) { return val > 0 ? fmtCurr(val) : ''; }
    },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: categories, labels: { formatter: function (val) { return fmtCurr(val); } } },
    yaxis: { labels: { style: { fontWeight: 'bold' } } },
    tooltip: { theme: 'dark', shared: true, intersect: false, y: { formatter: function (val) { return fmtCurr(val); } } }
  };

  apexInstances.budget = new ApexCharts(el, options);
  apexInstances.budget.render();
}

function renderTopExpenses() {
  const el = document.getElementById("topExpenses");
  if (expenses.length === 0) { el.innerHTML = '<p class="chart-empty">No expenses yet.</p>'; return; }
  el.innerHTML = [...expenses].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5).map((e, i) => `
    <div class="top-item"><div class="top-rank">#${i + 1}</div><div class="top-info"><div class="top-title">${esc(e.title)}</div><div class="top-cat">${getCatIcon(e.category)} ${esc(e.category)} · ${fmtDate(e.date)}</div></div><div class="top-amount">${fmtCurr(e.amount)}</div></div>`).join("");
}

function renderMonthComparison() {
  const el = document.getElementById("monthComparison");
  const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonth);
  const startDay = userSettings.month_start_day;

  let lastLabel, thisLabel;
  if (startDay === 1) {
    lastLabel = lastMonth.toLocaleDateString("en-US", { month: "short" });
    thisLabel = currentMonth.toLocaleDateString("en-US", { month: "short" });
  } else {
    lastLabel = "Last cycle";
    thisLabel = "This cycle";
  }

  const lastExpenses = allExpenses.filter((e) => getFinancialMonthKey(new Date(e.date)) === lastMonthKey);
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
    return d > 0 ? `<span class="compare-change up">▲ ${d.toFixed(0)}%</span>` : `<span class="compare-change down">▼ ${Math.abs(d).toFixed(0)}%</span>`;
  }
  let html = `<div class="compare-row" style="font-weight:700;border-bottom:2px solid var(--border)"><div class="compare-label">Category</div><div class="compare-values"><span class="compare-old">${lastLabel}</span><span class="compare-new">${thisLabel}</span><span style="min-width:60px;text-align:center">Change</span></div></div>`;
  html += `<div class="compare-row" style="background:var(--bg-hover);margin:0 -20px;padding:12px 20px;border-radius:var(--radius-sm)"><div class="compare-label" style="font-weight:700">Total</div><div class="compare-values"><span class="compare-old">${fmtCurr(lastTotal)}</span><span class="compare-new">${fmtCurr(thisTotal)}</span>${tag(thisTotal, lastTotal)}</div></div>`;
  allCats.forEach((cat) => { const c = thisCats[cat] || 0, p = lastCats[cat] || 0; html += `<div class="compare-row"><div class="compare-label">${getCatIcon(cat)} ${cat}</div><div class="compare-values"><span class="compare-old">${fmtCurr(p)}</span><span class="compare-new">${fmtCurr(c)}</span>${tag(c, p)}</div></div>`; });
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

// Dynamic Currency Formatter
function fmtCurr(n) {
  const numText = parseFloat(n).toLocaleString("en-PK", { minimumFractionDigits: 0 });
  return `${userSettings.currency} ${numText}`;
}

function getCatIcon(c) { return ({ Food: "🍔", Transport: "🚗", Entertainment: "🎬", Shopping: "🛍️", Bills: "📄", Healthcare: "⚕️", Education: "📚", Loan: "🏦", Rent: "🏠", Other: "📦" })[c] || "📦"; }
function toast(msg, type = "") { const el = document.getElementById("toast"); el.textContent = msg; el.className = "toast show " + type; clearTimeout(el._tid); el._tid = setTimeout(() => el.className = "toast", 2500); }

// Globals for inline onclick
window.openEditModal = openEditModal;
window.handleDelete = handleDelete;
window.deleteBudget = deleteBudget;
window.deleteIncome = deleteIncome;
window.openEditNextBudgetModal = openEditNextBudgetModal;
window.deleteNextBudget = deleteNextBudget;
