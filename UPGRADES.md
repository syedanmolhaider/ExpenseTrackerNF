# 📊 Complete Upgrade Tracker — ExpenseTrackerNF

> **Started:** March 14, 2026  
> **Status:** In Progress

---

## 📋 Overview

This document tracks ALL upgrade categories for the ExpenseTrackerNF project. Each category contains multiple features with:

- Description and requirements
- Implementation details
- Testing checklist
- Completion status

---

## 🗂️ Upgrade Categories

| Category                  | Priority      | Status         |
| ------------------------- | ------------- | -------------- |
| 🔒 Security Upgrades      | 🔴 High       | ⬜ Not Started |
| 📊 New Features           | 🟢 High Value | 🔄 In Progress |
| 🎨 UI/UX Upgrades         | 🟡 Medium     | ⬜ Not Started |
| ⚡ Performance Upgrades   | 🟡 Medium     | ⬜ Not Started |
| 🤖 AI/Smart Features      | 🟢 High Value | ⬜ Not Started |
| 🔗 Integrations           | 🟡 Medium     | ⬜ Not Started |
| 📱 Mobile & Accessibility | 🟡 Medium     | ⬜ Not Started |

---

## 🔒 Security Upgrades (High Priority)

> **Goal:** Protect user data and prevent common web vulnerabilities

### 1. CSRF Protection

**What:** Add Cross-Site Request Forgery tokens to all forms and API requests  
**Why:** Prevents attackers from tricking users into making unwanted actions  
**How:** Generate unique tokens per session, validate on each POST/PUT/DELETE request  
**Impact:** 🔴 Critical — Prevents unauthorized actions on behalf of logged-in users

### 2. 2FA Authentication

**What:** Add two-factor authentication using TOTP (Google Authenticator) or SMS  
**Why:** Extra security layer beyond passwords  
**How:** Generate QR codes for authenticator apps, verify 6-digit codes during login  
**Impact:** 🔴 High — Significantly reduces account takeover risk

### 3. Account Lockout

**What:** Lock accounts after 5 failed login attempts for 15 minutes  
**Why:** Prevents brute-force password attacks  
**How:** Track failed attempts per IP+email combo, enforce cooldown period  
**Impact:** 🟡 Medium — Protects against automated password guessing

### 4. Password Strength

**What:** Enforce strong passwords with visual strength meter  
**Why:** Weak passwords are easily compromised  
**How:** Require 8+ chars, uppercase, lowercase, number, special char; show real-time feedback  
**Impact:** 🟡 Medium — Improves overall account security

### 5. Session Management

**What:** View and revoke active login sessions  
**Why:** Users should control where they're logged in  
**How:** Store session metadata (device, IP, last active), provide UI to revoke  
**Impact:** 🟢 Low — User convenience and security awareness

---

## 📊 New Features (High Value) — In Progress

> **Goal:** Add powerful new functionality to enhance expense tracking

### 1. Expense Tags ✅ Complete

**What:** Custom labels for expenses (e.g., #vacation, #work, #reimbursable)  
**Why:** Better organization beyond rigid categories  
**Features:** Multiple tags per expense, color-coded, filterable, autocomplete  
**Status:** Fully implemented — backend API + frontend UI

### 2. Expense Categories Editor ✅ Complete

**What:** Create, edit, delete custom expense categories  
**Why:** Default categories may not fit all users' needs  
**Features:** Custom icons, usage tracking, cascade updates, default protection  
**Status:** Fully implemented — backend API + frontend UI

### 3. Recurring Expenses 🔄 In Progress

**What:** Auto-generate expenses on schedule (rent, subscriptions, bills)  
**Why:** Eliminates manual entry for predictable expenses  
**Features:** Daily/weekly/monthly/yearly frequency, pause/resume, auto-create  
**Backend:** ✅ API complete | **Frontend:** ⬜ Pending

### 4. Budget Alerts

**What:** Notify when approaching or exceeding budget limits  
**Why:** Helps users stay within budget proactively  
**Features:** Configurable thresholds (50%, 75%, 90%), in-app notifications, history  
**Impact:** 🟡 Medium — Prevents overspending

### 5. Multi-Currency Support

**What:** Track expenses in different currencies with conversion  
**Why:** Users may travel or have international expenses  
**Features:** Primary currency setting, auto-conversion, exchange rate fetching  
**Impact:** 🟡 Medium — Essential for international users

### 6. Export to PDF

**What:** Generate professional PDF reports  
**Why:** Users need reports for taxes, reimbursement, records  
**Features:** Monthly summaries, budget vs actual, category breakdowns, custom ranges  
**Impact:** 🟡 Medium — Critical for business/accounting use

### 7. Savings Goals

**What:** Set and track savings targets with progress visualization  
**Why:** Encourages saving and financial planning  
**Features:** Target amounts, deadlines, progress bars, deposit tracking  
**Impact:** 🟡 Medium — Adds financial planning capabilities

### 8. Bill Reminders

**What:** Track upcoming bills and payment due dates  
**Why:** Prevents missed payments and late fees  
**Features:** Due date tracking, recurring bills, overdue alerts, mark as paid  
**Impact:** 🟡 Medium — Helps avoid late payment penalties

---

## 🎨 UI/UX Upgrades

> **Goal:** Improve user experience and visual appeal

### 1. Theme Toggle

**What:** Light, Dark, and Auto (system) theme options  
**Why:** User preference and accessibility  
**How:** CSS custom properties for both themes, toggle in settings  
**Effort:** 🟢 Low — 2-3 hours

### 2. Enhanced Charts

**What:** Add Sankey (flow) and Treemap (hierarchy) visualizations  
**Why:** Better data understanding through diverse chart types  
**How:** Add new ApexCharts types to Trends tab  
**Effort:** 🟡 Medium — 4-6 hours

### 3. PWA / Mobile App

**What:** Install as native-like app on phones  
**Why:** Better mobile experience, home screen access  
**How:** Add manifest.json, service worker, app icons  
**Effort:** 🟡 Medium — 6-8 hours

### 4. Keyboard Shortcuts

**What:** Quick actions via keyboard (Ctrl+N for new expense, etc.)  
**Why:** Power users prefer keyboard navigation  
**How:** Add event listeners for common shortcuts  
**Effort:** 🟢 Low — 2-3 hours

### 5. Drag & Drop

**What:** Drag expenses to recategorize or tag  
**Why:** Intuitive visual organization  
**How:** HTML5 drag-and-drop API with visual feedback  
**Effort:** 🟡 Medium — 4-6 hours

### 6. Bulk Actions

**What:** Select multiple expenses for batch delete/edit/export  
**Why:** Efficient management of many expenses  
**How:** Checkbox selection + action toolbar  
**Effort:** 🟢 Low — 3-4 hours

### 7. Advanced Search

**What:** Complex filters, saved searches, search history  
**Why:** Find specific expenses quickly  
**How:** Filter builder UI, localStorage for saved searches  
**Effort:** 🟡 Medium — 4-6 hours

### 8. Customizable Dashboard

**What:** Drag-and-drop widget positioning  
**Why:** Users want personalized layouts  
**How:** Grid layout library, position persistence  
**Effort:** 🔴 High — 8-12 hours

---

## ⚡ Performance Upgrades

> **Goal:** Make the app faster and more responsive

### 1. Caching

**What:** Cache API responses to reduce database queries  
**Why:** Faster page loads, reduced server load  
**How:** Redis for server-side, browser cache headers for client  
**Impact:** 🟢 High — 50-80% faster repeat loads

### 2. Pagination

**What:** Load expenses in pages instead of all at once  
**Why:** Users with many expenses experience slow loads  
**How:** API pagination params, infinite scroll or page buttons  
**Impact:** 🟢 High — Handles large datasets efficiently

### 3. Offline Support

**What:** Add expenses without internet, sync when online  
**Why:** Users may need to track expenses offline  
**How:** Service Worker + IndexedDB + sync queue  
**Impact:** 🟡 Medium — Works in poor connectivity

### 4. Image Optimization

**What:** Lazy loading, WebP format, responsive images  
**Why:** Faster page loads, less bandwidth  
**How:** Native lazy loading, image CDN, format conversion  
**Impact:** 🟢 Low — Minor improvement for this app

### 5. Database Indexes

**What:** Add indexes on frequently queried columns  
**Why:** Faster database queries  
**How:** Index on user_id, date, category columns  
**Impact:** 🟢 High — 10-100x faster queries

---

## 🤖 AI/Smart Features (High Value)

> **Goal:** Leverage AI to provide intelligent insights and automation

### 1. Smart Categorization

**What:** Auto-suggest category based on expense title  
**Why:** Faster expense entry, consistent categorization  
**How:** Train on user's history, suggest top 3 categories  
**Effort:** 🟡 Medium — Requires ML model or rules engine

### 2. Spending Insights

**What:** AI-generated analysis of spending patterns  
**Why:** Help users understand their habits  
**How:** Analyze trends, compare periods, highlight anomalies  
**Effort:** 🟡 Medium — LLM integration for natural language insights

### 3. Budget Suggestions

**What:** AI recommends budget amounts based on history  
**Why:** Helps new users set realistic budgets  
**How:** Analyze past spending, suggest per-category limits  
**Effort:** 🟡 Medium — Statistical analysis + recommendations

### 4. Anomaly Detection

**What:** Alert on unusual spending patterns  
**Why:** Catch fraud or unexpected charges  
**How:** Statistical analysis, flag expenses outside normal range  
**Effort:** 🔴 High — Requires ML/statistical models

### 5. Natural Language Input

**What:** "Add $50 for groceries yesterday"  
**Why:** Faster, more natural expense entry  
**How:** Parse natural language, extract amount/category/date  
**Effort:** 🟡 Medium — NLP parsing required

### 6. Predictive Analytics

**What:** Forecast future expenses based on patterns  
**Why:** Help users plan ahead  
**How:** Time series analysis, trend projection  
**Effort:** 🔴 High — Complex ML implementation

---

## 🔗 Integrations

> **Goal:** Connect with external services for enhanced functionality

### 1. Bank Sync

**What:** Auto-import transactions from bank accounts  
**Why:** Eliminates manual entry for bank transactions  
**How:** Plaid API or similar for secure bank connections  
**Impact:** 🔴 High — Major convenience feature

### 2. Google Sheets

**What:** Two-way sync with Google Sheets  
**Why:** Users want spreadsheet access to their data  
**How:** Google Sheets API, bidirectional sync  
**Impact:** 🟡 Medium — Popular request for data analysis

### 3. Slack/Discord

**What:** Expense notifications in chat channels  
**Why:** Team expense tracking, reminders  
**How:** Webhook integration, bot commands  
**Impact:** 🟢 Low — Nice-to-have for teams

### 4. Zapier/Make

**What:** Connect to 1000+ apps via automation  
**Why:** Flexible integration without custom code  
**How:** Webhook triggers, Zapier/Make MCP integration  
**Impact:** 🟡 Medium — Extends functionality broadly

### 5. Calendar Integration

**What:** Show recurring expenses on calendar view  
**Why:** Visual planning of upcoming expenses  
**How:** iCal export, Google Calendar API  
**Impact:** 🟢 Low — Visual convenience

### 6. Email Reports

**What:** Automated weekly/monthly expense summaries  
**Why:** Regular overview without opening app  
**How:** Scheduled emails with summary data  
**Impact:** 🟡 Medium — Keeps users engaged

---

## 📱 Mobile & Accessibility

> **Goal:** Make the app accessible to all users and devices

### 1. PWA Installation

**What:** Install as app on phone home screen  
**Why:** Native-like experience without app store  
**How:** Web app manifest, service worker, icons  
**Effort:** 🟡 Medium — 4-6 hours

### 2. Offline Mode

**What:** Full functionality without internet  
**Why:** Track expenses anywhere  
**How:** Service Worker caching, local storage sync  
**Effort:** 🔴 High — Complex sync logic

### 3. Voice Input

**What:** "Add expense 50 dollars food"  
**Why:** Hands-free expense entry  
**How:** Web Speech API, natural language parsing  
**Effort:** 🟡 Medium — 6-8 hours

### 4. Screen Reader Support

**What:** Full ARIA labels and semantic HTML  
**Why:** Accessibility for visually impaired users  
**How:** Add ARIA attributes, test with screen readers  
**Effort:** 🟡 Medium — Comprehensive audit needed

### 5. High Contrast Mode

**What:** Accessibility theme with high contrast colors  
**Why:** Better visibility for some users  
**How:** Additional CSS theme with high contrast palette  
**Effort:** 🟢 Low — 2-3 hours

### 6. Localization

**What:** Multi-language support  
**Why:** Non-English speakers  
**How:** i18n framework, translation files  
**Effort:** 🔴 High — Ongoing translation effort

---

---

---

## 📊 New Features — Detailed Implementation

### 1️⃣ Expense Tags

### Description

Allow users to add custom tags to expenses for better organization beyond categories. Tags are flexible labels like "#vacation", "#work", "#reimbursable".

### Requirements

- Add/remove tags on expenses
- Filter expenses by tags
- Tag autocomplete from previously used tags
- Multiple tags per expense
- Tag cloud visualization

### Database Schema

```sql
CREATE TABLE expense_tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#6c5ce7',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE TABLE expense_tag_map (
  expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES expense_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, tag_id)
);
```

### API Endpoints

| Method | Endpoint                      | Description             |
| ------ | ----------------------------- | ----------------------- |
| GET    | /api/tags                     | Get all user tags       |
| POST   | /api/tags                     | Create new tag          |
| PUT    | /api/tags/:id                 | Update tag              |
| DELETE | /api/tags/:id                 | Delete tag              |
| POST   | /api/expenses/:id/tags        | Add tag to expense      |
| DELETE | /api/expenses/:id/tags/:tagId | Remove tag from expense |

### Frontend Changes

- Tag input component with autocomplete
- Tag chips in expense list items
- Tag filter in Daily Tracker tab
- Tag management in Settings
- Tag cloud visualization in Trends

### Testing Checklist

- [x] Create tag
- [x] Edit tag name/color
- [x] Delete tag
- [x] Add tag to expense
- [x] Remove tag from expense
- [x] Filter by tag
- [x] Tag autocomplete works
- [x] Multiple tags per expense

### Test Report — March 14, 2026

#### Backend API Tests

| Test                                 | Status  | Notes                                  |
| ------------------------------------ | ------- | -------------------------------------- |
| GET /api/tags                        | ✅ Pass | Returns all user tags with usage count |
| POST /api/tags                       | ✅ Pass | Creates tag with name and color        |
| PUT /api/tags/:id                    | ✅ Pass | Updates tag name and/or color          |
| DELETE /api/tags/:id                 | ✅ Pass | Deletes tag and cascades to mappings   |
| GET /api/expenses/:id/tags           | ✅ Pass | Returns tags for specific expense      |
| POST /api/expenses/:id/tags          | ✅ Pass | Adds tag to expense                    |
| DELETE /api/expenses/:id/tags/:tagId | ✅ Pass | Removes tag from expense               |
| GET /api/expenses?tag=name           | ✅ Pass | Filters expenses by tag name           |

#### Frontend Tests

| Test                          | Status  | Notes                              |
| ----------------------------- | ------- | ---------------------------------- |
| Tags tab displays             | ✅ Pass | New tab added to navigation        |
| Tag creation form             | ✅ Pass | Name input + color picker          |
| Tag list display              | ✅ Pass | Shows tags with usage count        |
| Tag edit (prompt)             | ✅ Pass | Edit name and color via prompt     |
| Tag delete                    | ✅ Pass | Confirmation dialog, cascades      |
| Tag input in expense form     | ✅ Pass | Autocomplete dropdown works        |
| Tag chips display             | ✅ Pass | Selected tags shown as chips       |
| Tag remove from selection     | ✅ Pass | Click × to remove                  |
| Tags display on expense items | ✅ Pass | Colored tag chips shown            |
| Tag filter dropdown           | ✅ Pass | Filters expenses by tag            |
| Tags preserved on edit        | ✅ Pass | Existing tags loaded in edit modal |
| Tags saved on expense create  | ✅ Pass | Tags added after expense created   |
| Tags updated on expense edit  | ✅ Pass | Tags synced on update              |

#### Integration Tests

| Test                     | Status  | Notes                      |
| ------------------------ | ------- | -------------------------- |
| Create expense with tags | ✅ Pass | Tags saved and displayed   |
| Edit expense tags        | ✅ Pass | Tags updated correctly     |
| Filter by tag + category | ✅ Pass | Both filters work together |
| Search includes tags     | ✅ Pass | Tag names searchable       |

### Status

**Status:** ✅ Complete  
**Started:** March 14, 2026  
**Completed:** March 14, 2026  
**Notes:** Full implementation complete. Backend APIs, frontend UI, tag management, expense tagging, filtering, and search all working.

---

## 2️⃣ Expense Categories Editor

### Description

Allow users to create, edit, and delete custom expense categories beyond the default ones.

### Requirements

- Add new custom categories
- Edit category name and icon
- Delete custom categories (with reassignment)
- Default categories cannot be deleted
- Category usage statistics

### Database Schema

```sql
CREATE TABLE user_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) DEFAULT '📦',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);
```

### API Endpoints

| Method | Endpoint            | Description             |
| ------ | ------------------- | ----------------------- |
| GET    | /api/categories     | Get all user categories |
| POST   | /api/categories     | Create new category     |
| PUT    | /api/categories/:id | Update category         |
| DELETE | /api/categories/:id | Delete category         |

### Frontend Changes

- Category management section in Settings
- Category picker with custom icons
- Category edit modal
- Usage count display

### Testing Checklist

- [ ] Create category
- [ ] Edit category
- [ ] Delete category
- [ ] Cannot delete default categories
- [ ] Category appears in expense form
- [ ] Category appears in budget form

### Test Report — March 14, 2026

#### Backend API Tests

| Test                        | Status  | Notes                                                 |
| --------------------------- | ------- | ----------------------------------------------------- |
| GET /api/categories         | ✅ Pass | Returns default + custom categories with usage counts |
| POST /api/categories        | ✅ Pass | Creates custom category with name and icon            |
| PUT /api/categories/:id     | ✅ Pass | Updates category name/icon, cascades to expenses      |
| DELETE /api/categories/:id  | ✅ Pass | Deletes category if not in use                        |
| Default category protection | ✅ Pass | Cannot edit/delete default categories                 |
| Duplicate name check        | ✅ Pass | Prevents duplicate category names                     |
| Usage check on delete       | ✅ Pass | Prevents deletion if category is in use               |

#### Frontend Tests

| Test                           | Status  | Notes                                      |
| ------------------------------ | ------- | ------------------------------------------ |
| Categories section in Settings | ✅ Pass | Section added with add form and list       |
| Category list display          | ✅ Pass | Shows all categories with icons and counts |
| Default badge display          | ✅ Pass | Default categories marked with badge       |
| Add category form              | ✅ Pass | Name input + icon selector                 |
| Category creation              | ✅ Pass | Creates category and refreshes list        |
| Category edit                  | ✅ Pass | Edit via prompt dialogs                    |
| Category delete                | ✅ Pass | Confirmation dialog, prevents if in use    |
| Category dropdowns update      | ✅ Pass | All form dropdowns updated dynamically     |

#### Integration Tests

| Test                         | Status  | Notes                                  |
| ---------------------------- | ------- | -------------------------------------- |
| Create and use category      | ✅ Pass | New category appears in expense form   |
| Edit category cascades       | ✅ Pass | Expenses updated when category renamed |
| Delete unused category       | ✅ Pass | Category removed successfully          |
| Delete used category blocked | ✅ Pass | Error message with usage count         |

### Status

**Status:** ✅ Complete  
**Started:** March 14, 2026  
**Completed:** March 14, 2026  
**Notes:** Full implementation complete. Backend API, frontend UI, category management, dropdown integration, and cascade updates all working.

---

## 3️⃣ Recurring Expenses

### Description

Automatically add recurring expenses like rent, subscriptions, and monthly bills.

### Requirements

- Create recurring expense templates
- Set frequency (daily, weekly, monthly, yearly)
- Auto-generate expenses on schedule
- View upcoming recurring expenses
- Pause/resume recurring expenses
- Edit future occurrences

### Database Schema

```sql
CREATE TABLE recurring_expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
  start_date DATE NOT NULL,
  end_date DATE,
  next_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

| Method | Endpoint                  | Description                    |
| ------ | ------------------------- | ------------------------------ |
| GET    | /api/recurring            | Get all recurring expenses     |
| POST   | /api/recurring            | Create recurring expense       |
| PUT    | /api/recurring/:id        | Update recurring expense       |
| DELETE | /api/recurring/:id        | Delete recurring expense       |
| POST   | /api/recurring/:id/pause  | Pause recurring expense        |
| POST   | /api/recurring/:id/resume | Resume recurring expense       |
| POST   | /api/recurring/process    | Process due recurring expenses |

### Frontend Changes

- New "Recurring" tab or section in Budget Plan
- Recurring expense form with frequency selector
- Calendar view of upcoming expenses
- Active/paused status indicators
- Process button to manually trigger

### Testing Checklist

- [ ] Create recurring expense
- [ ] Edit recurring expense
- [ ] Delete recurring expense
- [ ] Pause recurring expense
- [ ] Resume recurring expense
- [ ] Auto-generation works
- [ ] View upcoming expenses

### Status

**Status:** ⬜ Not Started  
**Started:** -  
**Completed:** -  
**Notes:** -

---

## 4️⃣ Budget Alerts

### Description

Notify users when they're approaching or exceeding budget limits.

### Requirements

- Set alert thresholds (50%, 75%, 90%, 100%)
- In-app notifications
- Alert history
- Per-category alerts
- Daily digest option

### Database Schema

```sql
CREATE TABLE budget_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  budget_item_id INTEGER REFERENCES budget_items(id) ON DELETE CASCADE,
  threshold_percent INTEGER NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  alert_id INTEGER REFERENCES budget_alerts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| GET    | /api/alerts                 | Get user alert settings  |
| POST   | /api/alerts                 | Create/update alert      |
| DELETE | /api/alerts/:id             | Delete alert             |
| GET    | /api/notifications          | Get notifications        |
| PUT    | /api/notifications/:id/read | Mark as read             |
| POST   | /api/alerts/check           | Check and trigger alerts |

### Frontend Changes

- Alert settings in Budget Plan tab
- Notification bell icon in topbar
- Notification dropdown/panel
- Alert threshold selector
- Mark as read functionality

### Testing Checklist

- [ ] Create alert threshold
- [ ] Edit alert threshold
- [ ] Delete alert
- [ ] Alert triggers at threshold
- [ ] Notification appears
- [ ] Mark notification as read
- [ ] Alert history view

### Status

**Status:** ⬜ Not Started  
**Started:** -  
**Completed:** -  
**Notes:** -

---

## 5️⃣ Multi-Currency Support

### Description

Track expenses in different currencies with automatic conversion.

### Requirements

- Set primary currency
- Add expenses in any currency
- Automatic exchange rate fetching
- Currency conversion display
- Historical rate support

### Database Schema

```sql
CREATE TABLE currency_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  primary_currency VARCHAR(3) DEFAULT 'PKR',
  show_converted BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add to expenses table
ALTER TABLE expenses ADD COLUMN currency VARCHAR(3) DEFAULT 'PKR';
ALTER TABLE expenses ADD COLUMN original_amount DECIMAL(12, 2);
ALTER TABLE expenses ADD COLUMN exchange_rate DECIMAL(12, 6);
```

### API Endpoints

| Method | Endpoint               | Description                |
| ------ | ---------------------- | -------------------------- |
| GET    | /api/currencies        | Get supported currencies   |
| GET    | /api/currencies/rates  | Get current exchange rates |
| PUT    | /api/settings/currency | Update currency settings   |

### Frontend Changes

- Currency selector in expense form
- Currency display in settings
- Converted amount display
- Currency symbol in all displays

### Testing Checklist

- [ ] Add expense in different currency
- [ ] Conversion displays correctly
- [ ] Primary currency setting works
- [ ] Exchange rates update
- [ ] Reports show converted amounts

### Status

**Status:** ⬜ Not Started  
**Started:** -  
**Completed:** -  
**Notes:** -

---

## 6️⃣ Export to PDF

### Description

Generate PDF reports for expenses, budgets, and summaries.

### Requirements

- Monthly expense report
- Budget vs actual report
- Category breakdown report
- Custom date range reports
- Professional formatting

### Database Schema

No schema changes required.

### API Endpoints

| Method | Endpoint        | Description         |
| ------ | --------------- | ------------------- |
| POST   | /api/export/pdf | Generate PDF report |

### Frontend Changes

- Export button in each tab
- Report type selector
- Date range picker
- Preview before download
- Download progress indicator

### Testing Checklist

- [ ] Generate monthly report
- [ ] Generate budget report
- [ ] Generate category report
- [ ] Custom date range works
- [ ] PDF downloads correctly
- [ ] PDF formatting is correct

### Status

**Status:** ⬜ Not Started  
**Started:** -  
**Completed:** -  
**Notes:** -

---

## 7️⃣ Savings Goals

### Description

Set and track savings goals with progress visualization.

### Requirements

- Create savings goals with target amount
- Track progress towards goals
- Set target dates
- Allocate savings from income
- Goal completion celebrations

### Database Schema

```sql
CREATE TABLE savings_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  target_date DATE,
  icon VARCHAR(10) DEFAULT '🎯',
  color VARCHAR(7) DEFAULT '#00b894',
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE savings_transactions (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- deposit, withdrawal
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

| Method | Endpoint                  | Description           |
| ------ | ------------------------- | --------------------- |
| GET    | /api/savings              | Get all savings goals |
| POST   | /api/savings              | Create savings goal   |
| PUT    | /api/savings/:id          | Update savings goal   |
| DELETE | /api/savings/:id          | Delete savings goal   |
| POST   | /api/savings/:id/deposit  | Add money to goal     |
| POST   | /api/savings/:id/withdraw | Withdraw from goal    |

### Frontend Changes

- New "Savings" tab or section in Income tab
- Goal cards with progress bars
- Deposit/withdraw modal
- Goal completion animation
- Savings summary in balance bar

### Testing Checklist

- [ ] Create savings goal
- [ ] Edit savings goal
- [ ] Delete savings goal
- [ ] Deposit to goal
- [ ] Withdraw from goal
- [ ] Progress bar updates
- [ ] Goal completion triggers

### Status

**Status:** ⬜ Not Started  
**Started:** -  
**Completed:** -  
**Notes:** -

---

## 8️⃣ Bill Reminders

### Description

Set reminders for upcoming bills and payments.

### Requirements

- Create bill reminders with due dates
- Recurring bill support
- Reminder notifications (in-app)
- Mark bills as paid
- Overdue bill tracking

### Database Schema

```sql
CREATE TABLE bill_reminders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2),
  due_date DATE NOT NULL,
  frequency VARCHAR(20), -- once, monthly, weekly, yearly
  category VARCHAR(100),
  is_paid BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  reminder_days INTEGER DEFAULT 3, -- days before due to remind
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

| Method | Endpoint            | Description            |
| ------ | ------------------- | ---------------------- |
| GET    | /api/bills          | Get all bill reminders |
| POST   | /api/bills          | Create bill reminder   |
| PUT    | /api/bills/:id      | Update bill reminder   |
| DELETE | /api/bills/:id      | Delete bill reminder   |
| POST   | /api/bills/:id/pay  | Mark bill as paid      |
| GET    | /api/bills/upcoming | Get upcoming bills     |

### Frontend Changes

- Bill reminders section in Budget Plan tab
- Upcoming bills widget on dashboard
- Bill calendar view
- Pay bill button
- Overdue bill highlighting

### Testing Checklist

- [ ] Create bill reminder
- [ ] Edit bill reminder
- [ ] Delete bill reminder
- [ ] Mark as paid
- [ ] Recurring bill generates next
- [ ] Upcoming bills display
- [ ] Overdue highlighting works

### Status

**Status:** ⬜ Not Started  
**Started:** -  
**Completed:** -  
**Notes:** -

---

## 📝 Implementation Order

Based on dependencies and complexity:

1. **Expense Tags** — No dependencies, standalone feature
2. **Expense Categories Editor** — No dependencies, standalone feature
3. **Budget Alerts** — Depends on budget items (already exists)
4. **Bill Reminders** — Standalone, similar to recurring
5. **Recurring Expenses** — More complex, generates expenses
6. **Savings Goals** — New section, needs UI space
7. **Multi-Currency** — Affects all monetary displays
8. **Export to PDF** — Can use all other features' data

---

## 🔄 Changelog

| Date       | Feature | Change                            |
| ---------- | ------- | --------------------------------- |
| 2026-03-14 | All     | Created upgrade tracking document |
| -          | -       | -                                 |

---

## 📚 Related Documents

- `MEMORY.md` — Project memory and conventions
- `UPGRADES.md` — This document
- `package.json` — Dependencies

---

> **Last Updated:** March 14, 2026
