# 🚀 INSTALLATION GUIDE

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js v16 or higher installed
- ✅ npm (comes with Node.js)
- ✅ Git installed
- ✅ A code editor (VS Code recommended)
- ✅ A web browser

---

## Step-by-Step Installation

### Step 1: Verify Prerequisites

```bash
# Check Node.js version (should be 16+)
node --version

# Check npm version
npm --version

# Check git version
git --version
```

### Step 2: Install Dependencies

Open terminal in project directory and run:

```bash
npm install
```

This will install:

- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `pg` - PostgreSQL database client
- `cookie` - Cookie parsing
- `netlify-cli` - Local development server

**Expected output:**

```
added 150 packages, and audited 151 packages in 30s
```

### Step 3: Setup Neon Database

#### 3.1 Create Neon Account

1. Visit https://console.neon.tech/
2. Sign up (free tier available)
3. Click "Create Project"
4. Choose a name and region
5. Click "Create Project"

#### 3.2 Get Connection String

1. In project dashboard, click "Connection Details"
2. Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

#### 3.3 Run Database Migration

1. In Neon dashboard, click "SQL Editor"
2. Open `migration.sql` from project
3. Copy entire content
4. Paste in SQL Editor
5. Click "Run" or press Ctrl+Enter
6. Verify tables created (should see "users" and "expenses")

### Step 4: Configure Environment Variables

#### 4.1 Create .env File

```bash
# Copy from example
cp .env.example .env
```

#### 4.2 Generate JWT Secret

```bash
# Windows PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output (64 character string)
```

#### 4.3 Edit .env File

Open `.env` in your code editor and replace:

```env
DATABASE_URL=postgresql://your-actual-connection-string-here
JWT_SECRET=your-generated-64-char-string-here
```

**Example:**

```env
DATABASE_URL=postgresql://user:pass@ep-cool-river-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Step 5: Test Local Development

#### 5.1 Start Dev Server

```bash
npm run dev
```

**Expected output:**

```
◈ Netlify Dev ◈
◈ Starting Netlify Dev with Netlify Functions
◈ Server now ready on http://localhost:8888
```

#### 5.2 Open in Browser

1. Visit: http://localhost:8888
2. You should see the login/signup page

#### 5.3 Test Signup

1. Click "Sign up"
2. Enter test data:
   - Name: Test User
   - Email: test@example.com
   - Password: test123456
3. Click "Sign Up"
4. Should redirect to dashboard

#### 5.4 Test Adding Expense

1. Fill in expense form:
   - Title: Test Expense
   - Amount: 50.00
   - Category: Food
   - Date: (today's date)
   - Notes: Testing
2. Click "Add Expense"
3. Should appear in list below

#### 5.5 Test Edit

1. Click "Edit" on the expense
2. Modify any field
3. Click "Update Expense"
4. Should see changes

#### 5.6 Test Delete

1. Click "Delete" on the expense
2. Confirm deletion
3. Should disappear from list

#### 5.7 Test Filter

1. Add expenses with different categories
2. Select category from dropdown
3. List should filter

#### 5.8 Test Export

1. Click "Export CSV"
2. File should download
3. Open in Excel/spreadsheet app

#### 5.9 Test Logout

1. Click "Logout"
2. Should redirect to login page

---

## Troubleshooting Installation

### Issue: "npm install" fails

**Error:** `gyp ERR! build error`

**Solution:**

```bash
# Windows: Install build tools
npm install --global windows-build-tools

# Then retry
npm install
```

---

### Issue: "Cannot find module"

**Solution:**

```bash
# Clear cache and reinstall
rm -rf node_modules
npm cache clean --force
npm install
```

---

### Issue: "Port 8888 already in use"

**Solution:**

```bash
# Find and kill process using port 8888
# Windows:
netstat -ano | findstr :8888
taskkill /PID <PID> /F

# Or change port in netlify.toml:
# [dev]
#   port = 3000
```

---

### Issue: Database connection error

**Error:** `Error: Connection terminated unexpectedly`

**Solutions:**

1. **Check DATABASE_URL:**

   - Open `.env`
   - Verify connection string is complete
   - Ensure no spaces or line breaks
   - Should end with `?sslmode=require`

2. **Check Neon Project:**

   - Login to Neon console
   - Verify project is active (not paused)
   - Check connection limits

3. **Test Connection:**
   ```bash
   node -e "const {Client}=require('pg'); const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); c.connect().then(()=>console.log('Connected!')).catch(e=>console.error(e));"
   ```

---

### Issue: "Unauthorized" on API calls

**Solutions:**

1. **Check JWT_SECRET:**

   - Open `.env`
   - Verify JWT_SECRET is set
   - Generate new one if needed

2. **Clear Cookies:**

   - Open browser DevTools (F12)
   - Application → Cookies
   - Delete all cookies
   - Refresh page and login again

3. **Check Functions:**
   - Ensure all functions in `netlify/functions/`
   - Restart dev server

---

### Issue: Tables don't exist

**Error:** `relation "users" does not exist`

**Solution:**

1. Login to Neon console
2. Open SQL Editor
3. Run this query to check:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
4. If no tables, re-run `migration.sql`

---

## Verification Checklist

After installation, verify:

- [ ] Dependencies installed (`node_modules` folder exists)
- [ ] `.env` file created and configured
- [ ] DATABASE_URL set correctly
- [ ] JWT_SECRET generated and set
- [ ] Database tables created in Neon
- [ ] Dev server starts without errors
- [ ] Login page loads at http://localhost:8888
- [ ] Can create account
- [ ] Can login
- [ ] Can add expense
- [ ] Can edit expense
- [ ] Can delete expense
- [ ] Can filter by category
- [ ] Can export CSV
- [ ] Can logout
- [ ] No console errors in browser DevTools

---

## Next Steps

Once local installation is working:

1. **Read Documentation:**

   - README.md - Full documentation
   - SETUP.md - Quick reference

2. **Deploy to Production:**

   - Follow DEPLOYMENT_CHECKLIST.md
   - Setup Netlify account
   - Deploy to Netlify

3. **Customize:**
   - Modify colors in `css/style.css`
   - Add more categories
   - Enhance features

---

## Getting Help

If you encounter issues:

1. **Check Browser Console:**

   - Press F12
   - Look for error messages in Console tab

2. **Check Terminal Output:**

   - Look for errors when running `npm run dev`

3. **Check Netlify Dev Logs:**

   - Watch for function errors
   - Check database connection logs

4. **Review Documentation:**

   - README.md has troubleshooting section
   - Check API endpoint documentation

5. **Test Database:**
   - Login to Neon console
   - Verify tables exist
   - Check connection string

---

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Check Node version
node --version

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules; npm install
```

---

## File Permissions (Linux/Mac)

If you get permission errors:

```bash
# Make scripts executable
chmod +x node_modules/.bin/*

# Or use sudo
sudo npm install
```

---

## Environment Variables Reference

```env
# Required Variables

DATABASE_URL          # Neon PostgreSQL connection string
                     # Format: postgresql://user:pass@host/db?sslmode=require
                     # Get from: Neon Console → Connection Details

JWT_SECRET           # Secret key for JWT signing (32+ chars)
                     # Generate: crypto.randomBytes(32).toString('hex')
                     # Keep secret, never commit to Git
```

---

## Success!

If you can:

- ✅ Start dev server
- ✅ See login page
- ✅ Create account
- ✅ Add/edit/delete expenses
- ✅ No errors in console

**You're ready to go!** 🎉

Proceed to deployment using DEPLOYMENT_CHECKLIST.md

---

## Need More Help?

Check these resources:

- `README.md` - Complete documentation
- `SETUP.md` - Quick setup guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment steps
- `PROJECT_OVERVIEW.md` - Feature overview

---

**Installation Guide Version:** 1.0
**Last Updated:** October 18, 2025
