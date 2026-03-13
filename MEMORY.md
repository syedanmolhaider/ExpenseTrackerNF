# ExpenseTrackerNF — Project Memory

> This file contains all key details, conventions, and decisions that must be followed across sessions.

---

## 🌐 Deployment

| Item | Value |
|------|-------|
| **Live URL** | https://expensetrackernf.netlify.app/ |
| **Repository** | https://github.com/syedanmolhaider/ExpenseTrackerNF |
| **Branch** | `main` |
| **Hosting** | Netlify (auto-deploys on push to `main`) |

---

## 📁 Project Structure

```
ExpenseTrackerNF/
├── index.html          # Login / Sign-up page
├── dashboard.html      # Main dashboard (authenticated)
├── css/
│   └── style.css       # Single CSS file - all styles
├── js/
│   └── dashboard.js    # Single JS file - all dashboard logic
├── netlify/
│   └── functions/      # Serverless API functions (Netlify Functions)
├── netlify.toml        # Netlify config
├── package.json        # Node deps
└── .env.example        # Environment variable template
```

---

## 🔑 Key Architecture

### Frontend
- **Vanilla HTML/CSS/JS** — no frameworks
- **ApexCharts** — loaded via CDN for all chart/visualization rendering
- **Dark theme** with CSS custom properties defined in `:root`
- **Inter** font from Google Fonts

### Backend
- **Netlify Functions** — serverless API at `/api/...`
- Handles: auth, expenses CRUD, budget CRUD, income CRUD, settings, export

### State Management (dashboard.js)
- `currentMonth` — Date object for currently viewed month
- `expenses` — array of expense objects for current month
- `budgetItems` — array of budget limits for current month
- `incomeEntries` — array of income entries for current month
- `userSettings` — object with `month_start_day`, `month_end_day`, `currency`
- `apexInstances` — object holding all ApexCharts instances for proper destroy/re-render

---

## 📊 Dashboard Tabs

1. **Budget Plan** — Set budget limits per category, grouped by category
2. **Next Month** — Clone/plan budget for next cycle
3. **Daily Tracker** — Add/view/filter/search expenses, import CSV/JSON, export
4. **Income** — Add/view income entries
5. **Trends** — Full analytics: KPIs, charts, visualizations

---

## 📈 Trends Tab — Charts & Visualizations

All chart rendering is called from `renderCharts()` which wraps each in try-catch:

| Chart Function | Element ID | Description |
|---|---|---|
| `renderKPIs()` | `#kpiGrid` | 6 KPI cards: avg daily, days left, projected, savings rate, top category, budget util |
| `renderDailySpendingRoom()` | `.daily-room-grid` | 4 KPI cards: available balance, days remaining, budget/day, today's spent |
| `renderDailyRoomGauge()` | `#dailyRoomGaugeChart` | Radial gauge: today's % of daily allowance used |
| `renderSpendingPace()` | `#spendingPaceChart` | Horizontal bar: time elapsed % vs budget used % |
| `renderCategoryDailyAllowance()` | `#categoryDailyAllowanceChart` | Horizontal bar: per-category daily allowance vs today's spending |
| `renderIncomeVsExpenseChart()` | `#incomeVsExpenseChart` | Bar chart: income vs expenses vs savings/deficit |
| `renderSavingsGauge()` | `#savingsGaugeChart` | Radial gauge: savings rate |
| `renderSpendingVelocity()` | `#spendingVelocityChart` | Area chart: cumulative spending over days |
| `renderWeeklyHeatmap()` | `#weeklyHeatmap` | Heatmap: spending intensity by weekday/week |
| `renderCategoryChart()` | `#categoryChart` | Donut: spending by category |
| `renderDailyChart()` | `#dailyChart` | Bar: daily spending amounts |
| `renderBudgetProgress()` | `#budgetProgress` | Horizontal bar: budget utilization per category |
| `renderTopExpenses()` | `#topExpenses` | HTML list: top 5 expenses |
| `renderMonthComparison()` | `#monthComparison` | HTML table: this month vs last month |

---

## 🎨 Design System

### Color Palette
| Variable | Hex | Usage |
|---|---|---|
| `--bg-primary` | `#0f1117` | Main background |
| `--bg-secondary` | `#1a1d27` | Topbar, balance bar |
| `--bg-card` | `#1e2130` | Cards |
| `--accent` | `#6c5ce7` | Primary accent (purple) |
| `--accent-light` | `#a29bfe` | Accent hover/text |
| `--green` | `#00b894` | Income, positive |
| `--orange` | `#f39c12` | Warnings, daily spent |
| `--red` | `#e74c3c` | Over budget, negative |
| `--blue` | `#0984e3` | Info, budget planned |

### Visual Style Conventions
- **KPI/stat cards**: Gradient background + colored glowing border + bottom gradient bar (always visible, grows on hover)
- **Icons**: Emoji in rounded colored containers (46px for KPI, 42px for daily room)
- **Hover effects**: `translateY(-3px)` + stronger box-shadow
- **Chart empty states**: Styled `.chart-empty` with dashed border + emoji + actionable hint text
- **Responsive**: 3-col → 2-col → 1-col for KPI grids; 2-col → 1-col for chart rows

---

## 🗓️ Financial Cycle Logic

The app supports custom financial month start days via `userSettings.month_start_day`:
- **Cycle dates** calculated by `getCycleDates()` and `getDateRangeForMonth()`
- **Example**: If start day = 22, cycle is Feb 22 → Mar 21
- All data queries and chart date calculations respect this setting

---

## ⚠️ Known Gotchas

1. **ApexCharts can't resolve CSS variables** — always use hex values for chart configs (stroke colors, etc.)
2. **Heatmap**: Must use `enableShades: false` when defining custom `colorScale.ranges`, otherwise shadeIntensity overrides the colors
3. **renderCharts()** uses try-catch per chart to prevent cascading failures
4. **PowerShell** — use `;` not `&&` to chain commands on Windows
5. **ApexCharts tooltip** — never use `shared: true` without explicitly setting `intersect: false`, some chart types default intersect to true which conflicts

---

## 📊 Balance Bar Fields

| Field | Element ID | Calculation | Notes |
|---|---|---|---|
| **Income** | `balanceIncome` | Sum of all income entries | Green text |
| **Budget Planned** | `balanceBudgetTotal` | Sum of all budget item limits | Blue text |
| **Total Spent** | `balanceBudgetSpent` | Sum of ALL expenses (budgeted + unplanned) | Green/Orange/Red based on vs budget |
| **Today Spent** | `balanceDailySpent` | Sum of expenses where `date === today` only | Orange text |
| **Remaining** | `balanceRemaining` | `Income - Total Spent` | Accent/Orange/Red based on level |

---

## 🔄 Workflow

1. Edit files locally
2. Test by opening dashboard in browser
3. `git add -A` → `git commit -m "message"` → `git push origin main`
4. Netlify auto-deploys from the `main` branch
5. Verify at https://expensetrackernf.netlify.app/

---

*Last updated: 2026-03-13*
