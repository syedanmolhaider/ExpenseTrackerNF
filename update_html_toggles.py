import re

file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\dashboard.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Budget Items header
content = content.replace(
    '<h2 class="card-title">Budget Items</h2>',
    '''<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h2 class="card-title" style="margin: 0;">Budget Items</h2>
              <button id="toggleAllBudgetBtn" class="btn-sm" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary);">Expand All ▼</button>
            </div>'''
)

# Replace Next Month Budget Items header
content = content.replace(
    '<h2 class="card-title">Next Month Budget Items</h2>',
    '''<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h2 class="card-title" style="margin: 0;">Next Month Budget Items</h2>
              <button id="toggleAllNextBudgetBtn" class="btn-sm" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary);">Expand All ▼</button>
            </div>'''
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
