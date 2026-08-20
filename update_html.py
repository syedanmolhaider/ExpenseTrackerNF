import re

file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\dashboard.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace current budget header
old_budget_header = '''          <div class="card">
            <h2 class="card-title">Budget Items</h2>
            <div id="budgetList" class="item-list">'''

new_budget_header = '''          <div class="card">
            <div class="card-header" id="currentBudgetToggle" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 15px;">
              <h2 class="card-title" style="margin: 0;">Budget Items</h2>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="budgetTotalSummary" class="text-accent" style="font-weight: 600; font-size: 1.1rem;">Rs 0</span>
                <span id="currentBudgetIcon" style="color: var(--text-muted);">▼</span>
              </div>
            </div>
            <div id="budgetListWrapper" style="display: none;">
              <div id="budgetList" class="item-list">'''
content = content.replace(old_budget_header, new_budget_header)

# Replace only the first instance that follows budgetList
content = re.sub(r'(<div id="budgetList" class="item-list">[\s\S]*?)</div>\s*</div>', r'\1</div>\n            </div>\n          </div>', content, count=1)

# Replace next month budget header
old_next_budget_header = '''          <div class="card">
            <h2 class="card-title">Next Month Budget Items</h2>
            <div id="nextBudgetList" class="item-list">'''

new_next_budget_header = '''          <div class="card">
            <div class="card-header" id="nextBudgetToggle" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 15px;">
              <h2 class="card-title" style="margin: 0;">Next Month Budget Items</h2>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="nextBudgetTotalSummary" class="text-accent" style="font-weight: 600; font-size: 1.1rem;">Rs 0</span>
                <span id="nextBudgetIcon" style="color: var(--text-muted);">▼</span>
              </div>
            </div>
            <div id="nextBudgetListWrapper" style="display: none;">
              <div id="nextBudgetList" class="item-list">'''
content = content.replace(old_next_budget_header, new_next_budget_header)

content = re.sub(r'(<div id="nextBudgetList" class="item-list">[\s\S]*?)</div>\s*</div>', r'\1</div>\n            </div>\n          </div>', content, count=1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
