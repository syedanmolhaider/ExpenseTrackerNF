

// ------ Utility Functions ------
// Escape HTML to prevent XSS
function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Set default date to today in date input fields
function setDefaultDate() {
  const today = new Date().toISOString().split("T")[0];
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach((input) => {
    if (!input.value) {
      input.value = today;
    }
  });
}

// Toast notification
function toast(message, type = "info") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.className = `toast show ${type}`;
  setTimeout(() => {
    el.className = "toast";
  }, 3000);
}

// Format currency
function fmtCurr(amount) {
  const num = parseFloat(amount) || 0;
  return `${userSettings.currency} ${num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// Get category icon
function getCatIcon(category) {
  const cat = allCategories.find(
    (c) => c.name.toLowerCase() === (category || "").toLowerCase(),
  );
  return cat ? cat.icon : "📦";
}

// Render selected tags
function renderSelectedTags(tags, container) {
  if (!container) return;
  container.innerHTML = tags
    .map(
      (tag) => `
    <span class="tag-badge">
      ${esc(tag.name)}
      <button type="button" class="tag-remove" data-tag-id="${tag.id}">&times;</button>
    </span>
  `,
    )
    .join("");
}

// Load recurring expenses
async function loadRecurring() {
  try {
    const res = await fetch("/api/recurring", { credentials: "include" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.recurring || [];
  } catch (err) {
    console.error("Failed to load recurring expenses:", err);
    return [];
  }
}

// Add tags to an expense
async function addTagsToExpense(expenseId, tagList) {
  if (!expenseId) return;
  const ids = (tagList || []).map((t) => t.id);
  console.log(`addTagsToExpense: expenseId=${expenseId}, tag_ids=`, ids);
  try {
    const res = await fetch(`/api/expense-tags/${expenseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tag_ids: ids }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`addTagsToExpense FAILED (${res.status}):`, body);
      toast("Failed to save tag: " + (body.error || res.status), "error");
    } else {
      console.log("addTagsToExpense OK:", body);
    }
  } catch (err) {
    console.error("addTagsToExpense network error:", err);
    toast("Network error saving tag", "error");
  }
}

// Show loading state in a container
function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML =
    '<div class="loading-spinner"><div class="spinner"></div><p>Loading...</p></div>';
}

// Format date for display
function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Generate HTML for expense tags
function getExpenseTagsHTML(expenseTags) {
  if (!expenseTags || expenseTags.length === 0) return "";
  return `<div class="expense-tags">${expenseTags
    .map(
      (tag) =>
        `<span class="tag-badge" style="background: ${esc(tag.color || "#6c5ce7")}20; color: ${esc(tag.color || "#6c5ce7")}; border: 1px solid ${esc(tag.color || "#6c5ce7")}40;">${esc(tag.name)}</span>`,
    )
    .join("")}</div>`;
}

async function ensureTagExists(tagName) {
  const normalized = tagName.toLowerCase().trim();
  // First check local cache
  let tag = tags.find(t => t.name.toLowerCase().trim() === normalized);
  if (tag) {
    console.log("ensureTagExists: found in local cache:", tag);
    return tag;
  }
  // Try to create the tag
  try {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: tagName, color: "#6c5ce7" })
    });
    if (res.ok) {
      const data = await res.json();
      tags.push(data.tag);
      console.log("ensureTagExists: created new tag:", data.tag);
      return data.tag;
    }
    // If 400 (already exists), refresh the tags list and find it
    if (res.status === 400) {
      console.log("ensureTagExists: tag already exists in DB, refreshing tags list...");
      const tagsRes = await fetch("/api/tags", { credentials: "include" });
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        tags = tagsData.tags || [];
        tag = tags.find(t => t.name.toLowerCase().trim() === normalized);
        if (tag) {
          console.log("ensureTagExists: found after refresh:", tag);
          return tag;
        }
      }
    }
    console.error("ensureTagExists: could not find or create tag:", tagName);
  } catch (err) {
    console.error("ensureTagExists: network error:", err);
  }
  return null;
}

function populateBudgetTags() {
  const select = document.getElementById("expenseTag");
  const editSelect = document.getElementById("editExpenseTag");
  
  if (select) {
    select.innerHTML = '<option value="">None</option>';
    budgetItems.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.title;
      opt.dataset.category = item.category;
      opt.textContent = `${item.title} (${item.category})`;
      select.appendChild(opt);
    });
  }
  
  if (editSelect) {
    editSelect.innerHTML = '<option value="">None</option>';
    budgetItems.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.title;
      opt.dataset.category = item.category;
      opt.textContent = `${item.title} (${item.category})`;
      editSelect.appendChild(opt);
    });
  }
}

