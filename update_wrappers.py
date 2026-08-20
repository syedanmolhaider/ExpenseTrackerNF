import re

file_path = r'C:\Users\anmolh\.gemini\antigravity\scratch\ExpenseTrackerNF\src\main.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# For displayBudget:
content = re.sub(
    r'(<div class="progress-bar-fill"[^>]*></div>\n          </div>\n        </div>`;)',
    r'\1\n      html += `<div id="budget-${cat.replace(/\\s+/g, \'-\')}" style="display: none;">`;',
    content,
    count=1
)

# Unbudgeted section:
content = re.sub(
    r'(</div>\n        </div>`;\n\n      Object\.keys\(unplannedGrouped\)\.forEach\(\(cat\) => {)',
    r'\1\n      html += `<div id="unbudgeted-items" style="display: none;">`;',
    content
)

# For displayNextBudget:
content = re.sub(
    r'(<span class="\$\{diffClass\}" style="font-weight:600; font-size: 0\.85rem;">\$\{diffLabel\}</span>\n          </div>\n        </div>`;)',
    r'\1\n      html += `<div id="next-budget-${cat.replace(/\\s+/g, \'-\')}" style="display: none;">`;',
    content
)

# Close wrapper in displayBudget:
content = re.sub(
    r'(html \+= `    </div>`;\n    }\);)',
    r'\1\n    html += `</div>`; // End wrapper',
    content,
    count=1
)

# Close wrapper in unbudgeted:
content = re.sub(
    r'(html \+= `</div>`;\n    }\n\n    list\.innerHTML = html;)',
    r'  html += `</div>`; // End unbudgeted wrapper\n\n    \1',
    content
)

# Close wrapper in displayNextBudget:
content = re.sub(
    r'(        </div>`;\n      }\);\n      html \+= `</div>`;)',
    r'\1\n      html += `</div>`; // End wrapper',
    content,
    count=1
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
