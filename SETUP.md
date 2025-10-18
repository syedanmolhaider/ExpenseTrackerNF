# 🚀 Quick Setup Guide

## Setup in 5 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Neon Database

**Create Account & Database:**

- Visit: https://console.neon.tech/
- Click "Create Project"
- Copy your connection string

**Run Migration:**

- Open Neon SQL Editor in console
- Copy content from `migration.sql`
- Paste and execute

### 3. Configure Environment

Create `.env` file:

```env
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require
JWT_SECRET=your-random-32-char-secret-here
```

Generate JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Test Locally

```bash
npm run dev
```

Visit: http://localhost:8888

### 5. Deploy to Netlify

**Via CLI:**

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

**Set environment variables in Netlify:**

```bash
netlify env:set DATABASE_URL "your-connection-string"
netlify env:set JWT_SECRET "your-jwt-secret"
```

**Or via Dashboard:**

- Site Settings → Environment Variables
- Add `DATABASE_URL` and `JWT_SECRET`

---

## Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] Neon account created
- [ ] Database tables created (run `migration.sql`)
- [ ] `.env` file configured
- [ ] Local development working
- [ ] Pushed to Git
- [ ] Deployed to Netlify
- [ ] Environment variables set in Netlify
- [ ] Production site working

---

## Test Your Deployment

1. Visit your Netlify URL
2. Click "Sign up"
3. Create account with: name, email, password
4. Add a test expense
5. Edit/delete the expense
6. Filter by category
7. Export to CSV
8. Logout and login again

---

## Common Issues

**"Database connection failed"**
→ Check DATABASE_URL in environment variables

**"Unauthorized" errors**
→ Check JWT_SECRET is set correctly

**"Function not found"**
→ Verify `netlify.toml` exists and functions are in `netlify/functions/`

**Build fails**
→ Check Node version (need v16+) and run `npm install`

---

Need help? Check the full README.md
