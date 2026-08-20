file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Budget items sub wrapper start
old_budget_sub_start = """      </div>`;

    // Allocate expenses to items to prevent double-counting"""
new_budget_sub_start = """      </div>`;

    // Allocate expenses to items to prevent double-counting
    html += `<div class="budget-sub-items" style="display: none;">`;"""
content = content.replace(old_budget_sub_start, new_budget_sub_start)

# 2. Budget items sub wrapper end
old_budget_sub_end = """    }

    html += `</div>`;
  });"""
new_budget_sub_end = """    }
    html += `</div>`; // Close sub-items
    html += `</div>`;
  });"""
content = content.replace(old_budget_sub_end, new_budget_sub_end)

# 3. Unbudgeted start
old_unbudgeted_sub_start = """      Object.keys(unplannedGrouped).forEach((cat) => {"""
new_unbudgeted_sub_start = """      html += `<div class="budget-sub-items" style="display: none;">`;
      Object.keys(unplannedGrouped).forEach((cat) => {"""
content = content.replace(old_unbudgeted_sub_start, new_unbudgeted_sub_start)

# 4. Unbudgeted end
old_unbudgeted_sub_end = """    html += `</div>`;
  }

  list.innerHTML = html;"""
new_unbudgeted_sub_end = """    html += `</div>`; // Close sub-items
    html += `</div>`;
  }

  list.innerHTML = html;"""
content = content.replace(old_unbudgeted_sub_end, new_unbudgeted_sub_end)

# 5. Next budget start
old_next_budget_sub_start = """      </div>`;

    // Sub-items
    items.forEach((item) => {"""
new_next_budget_sub_start = """      </div>`;

    // Sub-items
    html += `<div class="budget-sub-items" style="display: none;">`;
    items.forEach((item) => {"""
content = content.replace(old_next_budget_sub_start, new_next_budget_sub_start)

# 6. Next budget end
old_next_budget_sub_end = """    });

    html += `</div>`;
  });"""
new_next_budget_sub_end = """    });
    html += `</div>`; // Close sub-items
    html += `</div>`;
  });"""
content = content.replace(old_next_budget_sub_end, new_next_budget_sub_end)

# 7. Add toggle logic
toggle_logic = """
document.addEventListener("DOMContentLoaded", () => {
  const toggleAllBudgetBtn = document.getElementById('toggleAllBudgetBtn');
  if (toggleAllBudgetBtn) {
    toggleAllBudgetBtn.addEventListener('click', () => {
      const budgetList = document.getElementById('budgetList');
      const items = budgetList.querySelectorAll('.budget-sub-items');
      const isExpanded = toggleAllBudgetBtn.textContent.includes('Collapse');
      
      items.forEach(el => el.style.display = isExpanded ? 'none' : 'block');
      toggleAllBudgetBtn.textContent = isExpanded ? 'Expand All ▼' : 'Collapse All ▲';
    });
  }

  const toggleAllNextBudgetBtn = document.getElementById('toggleAllNextBudgetBtn');
  if (toggleAllNextBudgetBtn) {
    toggleAllNextBudgetBtn.addEventListener('click', () => {
      const nextBudgetList = document.getElementById('nextBudgetList');
      const items = nextBudgetList.querySelectorAll('.budget-sub-items');
      const isExpanded = toggleAllNextBudgetBtn.textContent.includes('Collapse');
      
      items.forEach(el => el.style.display = isExpanded ? 'none' : 'block');
      toggleAllNextBudgetBtn.textContent = isExpanded ? 'Expand All ▼' : 'Collapse All ▲';
    });
  }
});
"""
content = content + "\n" + toggle_logic

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
