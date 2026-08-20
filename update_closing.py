file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 1072 is html += `</div>`; which closes the category group.
# We want to insert html += `</div>`; just before it.
# Line 1488 is html += `</div>`; which closes the category group.
# We want to insert html += `</div>`; just before it.

# Search for the lines
line1 = -1
line2 = -1
for i, line in enumerate(lines):
    if 'html += `</div>`;' in line:
        # Check surrounding context
        if '});' in lines[i-1]:
            # This is likely the end of displayBudget inner loop (around 1072) or displayNextBudget (around 1488)
            pass

# Instead of searching, let's just insert at exactly the strings
new_lines = []
for i, line in enumerate(lines):
    if line.strip() == 'html += `</div>`;':
        if i > 0 and lines[i-1].strip() == '});':
            new_lines.append('    html += `</div>`; // Close wrapper\n')
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
