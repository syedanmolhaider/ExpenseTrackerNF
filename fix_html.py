file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\dashboard.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('type=\\"text\\"', 'type="text"')
content = content.replace('inputmode=\\"decimal\\"', 'inputmode="decimal"')
content = content.replace('id=\\"inHandInput\\"', 'id="inHandInput"')
content = content.replace('id=\\"budgetAmount\\"', 'id="budgetAmount"')
content = content.replace('id=\\"nextBudgetAmount\\"', 'id="nextBudgetAmount"')
content = content.replace('id=\\"expenseAmount\\"', 'id="expenseAmount"')
content = content.replace('id=\\"incomeAmount\\"', 'id="incomeAmount"')
content = content.replace('id=\\"editExpenseAmount\\"', 'id="editExpenseAmount"')
content = content.replace('id=\\"editBudgetAmount\\"', 'id="editBudgetAmount"')
content = content.replace('id=\\"editNextBudgetAmount\\"', 'id="editNextBudgetAmount"')
content = content.replace('id=\\"editIncomeAmount\\"', 'id="editIncomeAmount"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
