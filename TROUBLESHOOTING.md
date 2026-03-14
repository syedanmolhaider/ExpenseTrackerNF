# Database Connection Troubleshooting Guide

## 🔍 Common Issues & Solutions

### 1. **Environment Variables Not Set**

**Problem:** Database connection fails because `DATABASE_URL` is not configured
**Solution:** Set these environment variables in Netlify:

- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `JWT_SECRET` - A secure secret for JWT tokens

### 2. **Database Tables Not Created**

**Problem:** Application shows "Database tables not found" error
**Solution:** Run the database setup by visiting `/setup.html` in your browser

### 3. **User Not Logged In**

**Problem:** Data doesn't load because user authentication is required
**Solution:** Make sure you're logged in to access your data

### 4. **Wrong Month Selected**

**Problem:** Data is visible but for a different month
**Solution:** Check the current month display and use the navigation arrows

---

## 🛠️ Step-by-Step Troubleshooting

### Step 1: Check Environment Variables

1. Go to your Netlify dashboard
2. Navigate to Site settings > Build & deploy > Environment
3. Ensure these variables are set:
   ```
   DATABASE_URL = postgresql://user:password@host:port/database
   JWT_SECRET = your-secure-secret-key
   ```

### Step 2: Test Database Connection

1. Open your browser and navigate to: `https://your-site.netlify.app/test-db-connection.html`
2. Click "Test Connection" button
3. Check the results:
   - If it shows "API Connection: OK" → Database is working
   - If it shows errors → Check environment variables

### Step 3: Run Database Setup

1. Navigate to: `https://your-site.netlify.app/setup.html`
2. Click the setup button to create database tables
3. You should see success messages for each table created

### Step 4: Verify User Authentication

1. Log out and log back in to ensure JWT tokens are fresh
2. Check browser console for any authentication errors
3. Verify cookies are being set (check Application > Cookies in browser dev tools)

### Step 5: Check Browser Console for Errors

1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for:
   - Network errors (red text)
   - Database connection errors
   - Authentication errors
   - JavaScript errors

---

## 🔧 Manual Database Check

If you have direct database access, run these queries to verify data:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check users table
SELECT COUNT(*) as user_count FROM users;

-- Check expenses table
SELECT COUNT(*) as expense_count FROM expenses;

-- Check budget_items table
SELECT COUNT(*) as budget_count FROM budget_items;

-- Check income table
SELECT COUNT(*) as income_count FROM income;

-- Sample data check
SELECT * FROM expenses LIMIT 5;
```

---

## 🚨 Common Error Messages

### "Database tables not found"

- **Cause:** Tables haven't been created yet
- **Fix:** Visit `/setup.html` to run setup

### "Unauthorized" or "401 Error"

- **Cause:** Invalid or missing JWT token
- **Fix:** Log out and log back in

### "relation does not exist"

- **Cause:** Database tables missing
- **Fix:** Run database setup

### "Network error"

- **Cause:** API endpoint not reachable
- **Fix:** Check if Netlify functions are deployed

---

## 📋 Quick Checklist

- [ ] DATABASE_URL environment variable set
- [ ] JWT_SECRET environment variable set
- [ ] Database tables created (visit /setup.html)
- [ ] User logged in
- [ ] Correct month selected
- [ ] No JavaScript errors in console
- [ ] Network requests successful in browser dev tools

---

## 🔄 If Problems Persist

1. **Check Netlify Build Logs:** Look for deployment errors
2. **Test Locally:** Run `netlify dev` to test locally
3. **Check Database Connection:** Verify Neon database is accessible
4. **Clear Browser Cache:** Sometimes cached data causes issues
5. **Check User Data:** Verify you have data in the database for your user ID

---

## 📞 Additional Help

If you continue to have issues:

1. Check the browser console for specific error messages
2. Verify your database has data for your user ID
3. Ensure you're looking at the correct time period (month)
4. Check if the data exists but is filtered out by some criteria
