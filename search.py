import re
file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'class="budget-cat-header' in line or 'itemSpends = items.map' in line or 'html += `</div>`;' in line or 'let itemSpends = items.map' in line:
        print(f"Line {i}: {line.strip()}")
