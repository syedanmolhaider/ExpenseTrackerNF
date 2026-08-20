file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix for displayBudget
old1 = """      html += `    </div>`;
    });
    html += `</div>`;"""
new1 = """      html += `    </div>`;
    });
    html += `</div>`; // End item wrapper
    html += `</div>`;"""
content = content.replace(old1, new1)

# Fix for displayNextBudget
old2 = """        </div>`;
      });
      html += `</div>`;"""
new2 = """        </div>`;
      });
      html += `</div>`; // End item wrapper
      html += `</div>`;"""
content = content.replace(old2, new2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
