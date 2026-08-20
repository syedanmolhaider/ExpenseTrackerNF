file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace exactly
old_str = """    html += `</div>`;
  });"""
new_str = """    html += `</div>`;
    html += `</div>`; // End wrapper
  });"""

content = content.replace(old_str, new_str)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
