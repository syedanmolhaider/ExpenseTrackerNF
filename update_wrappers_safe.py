file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_display_budget = False
in_unbudgeted = False
in_next_budget = False

for i, line in enumerate(lines):
    new_lines.append(line)
    
    # Track which function we are in
    if 'function displayBudget()' in line:
        in_display_budget = True
        in_next_budget = False
    elif 'function displayNextBudget()' in line:
        in_display_budget = False
        in_next_budget = True
    
    # 1. displayBudget items wrapper start
    if in_display_budget and 'let itemSpends = items.map(() => 0);' in line:
        new_lines.insert(-1, '      html += `<div id="budget-${cat.replace(/\\s+/g, \'-\')}" style="display: none;">`;\n')
        
    # 2. displayBudget items wrapper end
    if in_display_budget and 'html += `</div>`;' in line and lines[i-1].strip() == '});':
        # Add a closing div just before this
        new_lines.insert(-1, '    html += `</div>`; // End item wrapper\n')
        
    # 3. displayBudget unbudgeted wrapper start
    if in_display_budget and 'Object.keys(unplannedGrouped).forEach((cat) => {' in line:
        new_lines.insert(-1, '      html += `<div id="unbudgeted-items" style="display: none;">`;\n')
        
    # 4. displayBudget unbudgeted wrapper end
    if in_display_budget and 'list.innerHTML = html;' in line:
        new_lines.insert(-1, '  html += `</div>`; // End unbudgeted wrapper\n')
        in_display_budget = False

    # 5. displayNextBudget wrapper start
    if in_next_budget and 'items.forEach((item) => {' in line:
        new_lines.insert(-1, '      html += `<div id="next-budget-${cat.replace(/\\s+/g, \'-\')}" style="display: none;">`;\n')
        
    # 6. displayNextBudget wrapper end
    if in_next_budget and 'html += `</div>`;' in line and lines[i-1].strip() == '});':
        new_lines.insert(-1, '      html += `</div>`; // End item wrapper\n')

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
