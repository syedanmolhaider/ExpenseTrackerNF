file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Unplanned entries
old_str = """      </div>`;

    // Show each unplanned category with its expenses
    Object.entries(unplannedGrouped).forEach(([cat, catExps]) => {"""

new_str = """      </div>`;

    // Show each unplanned category with its expenses
    html += `<div class="budget-sub-items" style="display: none;">`;
    Object.entries(unplannedGrouped).forEach(([cat, catExps]) => {"""

content = content.replace(old_str, new_str)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
