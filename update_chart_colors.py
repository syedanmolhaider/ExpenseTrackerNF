file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace border-bottom color
content = content.replace('border-bottom: 1px solid rgba(255,255,255,0.04);', 'border-bottom: 1px solid var(--border);')

# Replace chart hardcoded colors with a theme check
content = content.replace('track: { background: "rgba(255,255,255,0.06)", strokeWidth: "100%" }', "track: { background: getChartTheme() === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', strokeWidth: '100%' }")
content = content.replace('grid: { borderColor: "rgba(255,255,255,0.05)" }', "grid: { borderColor: getChartTheme() === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }")

# Also, there's color: "#fff" in the value label of the gauge charts! Let's check for value: { color: "#fff", ... }
content = content.replace('value: {\n              color: "#fff",', 'value: {\n              color: getChartTheme() === "dark" ? "#fff" : "#1c1c1e",')
# Might not exactly match formatting, let's use regex for value color
import re
content = re.sub(r'value:\s*\{\s*color:\s*"#fff"', 'value: { color: getChartTheme() === "dark" ? "#fff" : "#1c1c1e"', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
