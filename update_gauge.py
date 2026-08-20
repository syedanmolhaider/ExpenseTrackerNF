file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
# Replace color: "#fff" inside gauge chart dataLabels.value
content = re.sub(r'color:\s*"#fff"', 'color: getChartTheme() === "dark" ? "#fff" : "#1c1c1e"', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
