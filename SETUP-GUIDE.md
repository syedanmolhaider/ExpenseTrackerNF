# ExpenseTrackerNF — Netlify & Neon Setup Guide

> **Complete guide to connect your Netlify frontend with Neon PostgreSQL backend**

---

## 📋 Prerequisites

1. **Netlify Account** — [Sign up free](https://app.netlify.com/signup)
2. **Neon Account** — [Sign up free](https://neon.tech/signup)
3. **GitHub Repository** — Your ExpenseTrackerNF code pushed to GitHub

---

## 🗄️ Step 1: Set Up Neon PostgreSQL Database

### 1.1 Create a Neon Project

1. Log in to [Neon Console](https://console.neon.tech/)
2. Click **"Create a project"**
3. Configure:
   - **Project name:** `expensetrackernf`
   - **Database name:** `expensetracker`
   - **Region:** Choose closest to your users
4. Click **"Create project"**

### 1.2 Get Your Connection String

1. In Neon Console, go to **Dashboard → Connection Details**
2. Copy the **Connection string** (it looks like):
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/expensetracker?sslmode=require
   ```
3. **Save this securely** — you'll need it for Netlify

### 1.3 Initialize Database Schema

1. Go to your deployed site: `https://expensetrackernf.netlify.app/setup.html`
2. Click **"Initialize Database"** button
3. Wait for all tables to be created (users, expenses, budget_items, income, user_settings, expense_tags)

**OR** manually run the SQL from `netlify/functions/setup-db.js` in Neon's SQL Editor.

---

## 🚀 Step 2: Deploy to Netlify

### 2.1 Connect GitHub Repository

1. Log in to [Netlify](https://app.netlify.com/)
2. Click **"Add new site" → "Import an existing project"**
3. Choose **GitHub** and authorize
4. Select your `ExpenseTrackerNF` repository
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions`
6. Click **"Deploy site"**

### 2.2 Configure Environment Variables

1. In Netlify, go to **Site configuration → Environment variables**
2. Add these variables:

| Variable       | Value                       | Description            |
| -------------- | --------------------------- | ---------------------- |
| `DATABASE_URL` | Your Neon connection string | PostgreSQL connection  |
| `JWT_SECRET`   | Random secure string        | For JWT token signing  |
| `CONTEXT`      | `production`                | Enables secure cookies |

**Generate a secure JWT_SECRET:**

```bash
# Option 1: Online generator
# Visit: https://generate-secret.vercel.app/32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

### 2.3 Redeploy

1. Go to **Deploys** tab
2. Click **"Trigger deploy" → "Deploy site"**
3. Wait for deployment to complete

---

## 🔧 Step 3: Verify Connection

### 3.1 Test Database Setup

1. Visit: `https://expensetrackernf.netlify.app/setup.html`
2. Click **"Initialize Database"**
3. You should see:
   ```
   ✓ users table created
   ✓ expenses table created
   ✓ budget_items table created
   ✓ income table created
   ✓ user_settings table created
   ✓ expense_tags table created
   ✓ expense_tag_map table created
   ✓ Database setup complete!
   ```

### 3.2 Test Authentication

1. Visit: `https://expensetrackernf.netlify.app/`
2. Click **"Sign up"**
3. Create a test account
4. You should be redirected to the dashboard

### 3.3 Test API Endpoints

Open browser DevTools (F12) → Console and run:

```javascript
// Test auth
fetch("/api/me", { credentials: "include" })
  .then((r) => r.json())
  .then(console.log);

// Test expenses
fetch("/api/expenses?from=2026-03-01&to=2026-03-31", { credentials: "include" })
  .then((r) => r.json())
  .then(console.log);
```

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch" errors

**Cause:** API redirects not configured

**Fix:** Verify `netlify.toml` has:

```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### Issue: "Database connection error"

**Cause:** Invalid `DATABASE_URL` or Neon database not accessible

**Fix:**

1. Verify connection string in Netlify environment variables
2. Check Neon database is running (not suspended)
3. Ensure `?sslmode=require` is in connection string

### Issue: "Unauthorized" on all requests

**Cause:** JWT_SECRET mismatch or cookies not being sent

**Fix:**

1. Verify `JWT_SECRET` is set in Netlify
2. Ensure `CONTEXT=production` is set
3. Clear browser cookies and try again

### Issue: "CORS error"

**Cause:** Origin mismatch

**Fix:** The backend uses `process.env.URL` which Netlify sets automatically. If testing locally, use:

```bash
netlify dev
```

### Issue: Tables don't exist

**Cause:** Database not initialized

**Fix:** Visit `/setup.html` and click "Initialize Database"

---

## 📊 API Endpoints Reference

| Endpoint          | Method              | Description          | Auth Required |
| ----------------- | ------------------- | -------------------- | ------------- |
| `/api/signup`     | POST                | Create account       | No            |
| `/api/login`      | POST                | Login                | No            |
| `/api/logout`     | POST                | Logout               | Yes           |
| `/api/me`         | GET                 | Get current user     | Yes           |
| `/api/expenses`   | GET/POST/PUT/DELETE | Manage expenses      | Yes           |
| `/api/budget`     | GET/POST/PUT/DELETE | Manage budget items  | Yes           |
| `/api/income`     | GET/POST/PUT/DELETE | Manage income        | Yes           |
| `/api/settings`   | GET/PUT             | User settings        | Yes           |
| `/api/tags`       | GET/POST/PUT/DELETE | Expense tags         | Yes           |
| `/api/categories` | GET/POST/PUT/DELETE | Expense categories   | Yes           |
| `/api/reset`      | DELETE              | Delete all user data | Yes           |
| `/api/setup-db`   | POST                | Initialize database  | No            |

---

## 🔒 Security Checklist

- [x] Passwords hashed with bcrypt (10 rounds)
- [x] SQL injection protection (parameterized queries)
- [x] HTTP-only cookies for auth tokens
- [x] Secure flag on cookies in production
- [x] SameSite=strict cookie policy
- [x] Rate limiting on all endpoints
- [x] Input validation on all forms
- [x] CORS configured for credentials

---

## 🚀 Local Development

### Using Netlify Dev (Recommended)

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev
# or
netlify dev
```

This starts:

- Static file server on `http://localhost:8888`
- Functions server (proxied)
- Automatic `.env` file loading

### Environment Variables for Local Dev

Create `.env` file:

```env
DATABASE_URL=postgresql://username:password@host.neon.tech/database?sslmode=require
JWT_SECRET=your-local-dev-secret
```

---

## 📝 Next Steps

1. **Custom Domain:** Add your domain in Netlify → Domain settings
2. **SSL:** Automatic with Netlify (Let's Encrypt)
3. **Analytics:** Enable Netlify Analytics for traffic insights
4. **Forms:** Consider Netlify Forms for contact/feedback
5. **Identity:** Consider Netlify Identity for additional auth options

---

## 🆘 Support

- **Netlify Docs:** https://docs.netlify.com/
- **Neon Docs:** https://neon.tech/docs
- **Project Issues:** https://github.com/syedanmolhaider/ExpenseTrackerNF/issues

---

> **Last Updated:** March 14, 2026
