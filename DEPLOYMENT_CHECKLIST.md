# ✅ Deployment Checklist

## Pre-Deployment Tasks

### Local Setup

- [ ] Node.js v16+ installed
- [ ] Git installed and configured
- [ ] Repository created (GitHub/GitLab/Bitbucket)

### Database Setup

- [ ] Neon account created at https://console.neon.tech
- [ ] New project created in Neon
- [ ] Connection string copied
- [ ] SQL Editor opened
- [ ] `migration.sql` executed successfully
- [ ] Tables `users` and `expenses` created
- [ ] Indexes created

### Local Configuration

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created from `.env.example`
- [ ] `DATABASE_URL` added to `.env`
- [ ] `JWT_SECRET` generated and added to `.env`
- [ ] Local dev server tested (`npm run dev`)
- [ ] Signup/login tested locally
- [ ] Add expense tested locally
- [ ] Edit expense tested locally
- [ ] Delete expense tested locally
- [ ] CSV export tested locally

---

## Git Repository Setup

- [ ] Git initialized (`git init`)
- [ ] Remote repository created (GitHub/GitLab/Bitbucket)
- [ ] Remote added (`git remote add origin <url>`)
- [ ] Files staged (`git add .`)
- [ ] Initial commit (`git commit -m "Initial commit"`)
- [ ] Pushed to remote (`git push -u origin main`)

---

## Netlify Deployment

### Option A: CLI Deployment

- [ ] Netlify CLI installed (`npm install -g netlify-cli`)
- [ ] Logged into Netlify (`netlify login`)
- [ ] Site initialized (`netlify init`)
- [ ] Environment variables set:
  - [ ] `DATABASE_URL` set (`netlify env:set DATABASE_URL "..."`)
  - [ ] `JWT_SECRET` set (`netlify env:set JWT_SECRET "..."`)
- [ ] Deployed (`netlify deploy --prod`)

### Option B: Dashboard Deployment

- [ ] Netlify account created at https://app.netlify.com
- [ ] "Add new site" clicked
- [ ] Git repository connected
- [ ] Build settings configured:
  - [ ] Build command: `npm run build`
  - [ ] Publish directory: `.`
  - [ ] Functions directory: `netlify/functions`
- [ ] Environment variables added in Site Settings:
  - [ ] `DATABASE_URL` added
  - [ ] `JWT_SECRET` added
- [ ] Deploy triggered
- [ ] Build completed successfully

---

## Post-Deployment Testing

### Authentication Tests

- [ ] Visit production URL
- [ ] Signup page loads
- [ ] Create test account
- [ ] Redirected to dashboard
- [ ] User name displays correctly
- [ ] Logout works
- [ ] Login with same credentials works

### Expense Management Tests

- [ ] Add new expense works
- [ ] Expense appears in list
- [ ] Summary cards update correctly
- [ ] Edit expense opens modal
- [ ] Update expense saves changes
- [ ] Delete expense with confirmation works
- [ ] Filter by category works
- [ ] CSV export downloads file

### UI/UX Tests

- [ ] Desktop view looks good
- [ ] Tablet view responsive
- [ ] Mobile view responsive
- [ ] Forms are user-friendly
- [ ] Error messages display properly
- [ ] Success actions clear forms
- [ ] Modal opens and closes smoothly

### Security Tests

- [ ] Direct access to `/dashboard.html` without login redirects to login
- [ ] API calls without auth return 401
- [ ] User can only see their own expenses
- [ ] Password is not visible in forms
- [ ] Token stored in HttpOnly cookie

---

## Monitoring & Maintenance

### Netlify Dashboard

- [ ] Function logs reviewed
- [ ] No error logs present
- [ ] Response times acceptable
- [ ] Build logs checked

### Database

- [ ] Neon dashboard accessed
- [ ] Connection pool healthy
- [ ] Queries executing properly
- [ ] No performance issues

### Analytics (Optional)

- [ ] Netlify Analytics enabled
- [ ] Usage monitored
- [ ] Function invocations tracked

---

## Documentation Verification

- [ ] README.md complete and accurate
- [ ] SETUP.md has correct instructions
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Troubleshooting section helpful

---

## Optional Enhancements

- [ ] Custom domain configured
- [ ] SSL certificate verified (auto by Netlify)
- [ ] Favicon added
- [ ] Meta tags for SEO added
- [ ] Analytics integrated
- [ ] Error monitoring (e.g., Sentry) added
- [ ] Email notifications setup
- [ ] Backup strategy planned

---

## Common Issues & Solutions

### Issue: "Function not found"

**Solution:**

- Verify `netlify.toml` in root directory
- Check functions are in `netlify/functions/`
- Redeploy site

### Issue: "Database connection error"

**Solution:**

- Verify `DATABASE_URL` environment variable
- Check Neon database is not paused
- Test connection string locally

### Issue: "Unauthorized" after login

**Solution:**

- Check `JWT_SECRET` is set correctly
- Clear browser cookies
- Try in incognito mode

### Issue: Build fails

**Solution:**

- Check Node.js version (need v16+)
- Run `npm install` locally
- Review Netlify build logs

---

## Success Criteria

✅ Site accessible at Netlify URL
✅ Users can sign up
✅ Users can log in
✅ Users can add expenses
✅ Users can edit expenses
✅ Users can delete expenses
✅ Dashboard shows correct summaries
✅ Filter works correctly
✅ CSV export downloads
✅ Mobile responsive
✅ No console errors
✅ No security vulnerabilities

---

## Deployment Complete! 🎉

Your Expense Tracker is now live and ready to use!

**Next Steps:**

1. Share the URL with users
2. Monitor usage and performance
3. Gather feedback
4. Plan future enhancements

**Production URL:** `https://your-site-name.netlify.app`

---

**Deployed on:** ******\_\_\_******
**By:** ******\_\_\_******
**Production URL:** ******\_\_\_******

---

Need help? Check README.md or contact support.
