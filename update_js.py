import re

file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update displayBudget headers
content = content.replace(
    '<div class="budget-cat-header ${isOver ? "over-budget" : ""}">',
    '<div class="budget-cat-header ${isOver ? "over-budget" : ""}" onclick="toggleCat(\'budget-\' + cat.replace(/\\s+/g, \'-\'))" style="cursor: pointer;">'
)

# Insert icon in displayBudget header
old_title_1 = '<div style="font-weight: 700; font-size: 1.05rem;">${getCatIcon(cat)} ${esc(cat)} <span class="budget-cat-count">${items.length} item${items.length > 1 ? "s" : ""}</span></div>'
new_title_1 = '<div style="font-weight: 700; font-size: 1.05rem;">${getCatIcon(cat)} ${esc(cat)} <span class="budget-cat-count">${items.length} item${items.length > 1 ? "s" : ""}</span> <span id="icon-budget-${cat.replace(/\\s+/g, \'-\')}" style="font-size:0.8em; margin-left: 5px; color:var(--text-muted);">▼</span></div>'
content = content.replace(old_title_1, new_title_1)

# Wrap items in displayBudget
content = content.replace(
    '      let itemSpends = items.map(() => 0);',
    '      html += `<div id="budget-${cat.replace(/\\s+/g, \'-\')}" style="display: none;">`;\n      let itemSpends = items.map(() => 0);'
)

# 2. Update displayNextBudget headers
content = content.replace(
    '<div class="budget-cat-header">',
    '<div class="budget-cat-header" onclick="toggleCat(\'next-budget-\' + cat.replace(/\\s+/g, \'-\'))" style="cursor: pointer;">'
)

# Insert icon in displayNextBudget header
old_title_2 = '<div style="font-weight: 700; font-size: 1.05rem;">${getCatIcon(cat)} ${esc(cat)} <span class="budget-cat-count">${items.length} item${items.length > 1 ? "s" : ""}</span></div>'
new_title_2 = '<div style="font-weight: 700; font-size: 1.05rem;">${getCatIcon(cat)} ${esc(cat)} <span class="budget-cat-count">${items.length} item${items.length > 1 ? "s" : ""}</span> <span id="icon-next-budget-${cat.replace(/\\s+/g, \'-\')}" style="font-size:0.8em; margin-left: 5px; color:var(--text-muted);">▼</span></div>'
content = content.replace(old_title_2, new_title_2)

# Wrap items in displayNextBudget
content = content.replace(
    '      items.forEach((item) => {',
    '      html += `<div id="next-budget-${cat.replace(/\\s+/g, \'-\')}" style="display: none;">`;\n      items.forEach((item) => {'
)

# Unbudgeted wrapper
content = content.replace(
    '<div class="budget-cat-header over-budget" style="border-left: 3px solid var(--red); padding-left: 12px;">',
    '<div class="budget-cat-header over-budget" onclick="toggleCat(\'unbudgeted-items\')" style="border-left: 3px solid var(--red); padding-left: 12px; cursor: pointer;">'
)
old_title_unbudgeted = '<div style="font-weight: 700; font-size: 1.05rem;"><span style="font-size:1.1rem">⚠️</span> Unbudgeted Spending</div>'
new_title_unbudgeted = '<div style="font-weight: 700; font-size: 1.05rem;"><span style="font-size:1.1rem">⚠️</span> Unbudgeted Spending <span id="icon-unbudgeted-items" style="font-size:0.8em; margin-left: 5px; color:var(--text-muted);">▼</span></div>'
content = content.replace(old_title_unbudgeted, new_title_unbudgeted)

content = content.replace(
    '      Object.keys(unbudgetedItems).forEach((title) => {',
    '      html += `<div id="unbudgeted-items" style="display: none;">`;\n      Object.keys(unbudgetedItems).forEach((title) => {'
)

# We need to add closing divs to the wrappers.
# For displayBudget:
content = re.sub(r'(      html \+= `    </div>`;\n    }\)\;\n    html \+= `</div>`;)', r'\1\n    html += `</div>`; // Close wrapper', content)

# For unbudgeted items:
content = re.sub(r'(        </div>`;\n      }\);\n    }\n    html \+= `</div>`;)', r'\1\n    html += `</div>`; // Close unbudgeted wrapper', content)

# For displayNextBudget:
content = re.sub(r'(        </div>`;\n      }\);\n      html \+= `</div>`;)', r'\1\n      html += `</div>`; // Close wrapper', content)

# Add toggleCat function
toggle_func = '''
window.toggleCat = function(id) {
  const el = document.getElementById(id);
  const icon = document.getElementById('icon-' + id);
  if (el && icon) {
    if (el.style.display === 'none') {
      el.style.display = 'block';
      icon.textContent = '▲';
    } else {
      el.style.display = 'none';
      icon.textContent = '▼';
    }
  }
};
'''
content = content + toggle_func

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("done")
