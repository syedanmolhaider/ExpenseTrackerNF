# 💰 Expense Tracker - Netlify + Neon Database

A full-stack expense tracking web application built with vanilla JavaScript, Netlify Functions, and Neon PostgreSQL database. Features include user authentication, expense management, monthly summaries, category filtering, and CSV export.

## ✨ Features

- **User Authentication**

  - Secure signup/login with bcrypt password hashing
  - JWT-based authentication with HttpOnly cookies
  - Protected routes and API endpoints

- **Expense Management**

  - Add, edit, and delete expenses
  - Track title, amount, category, date, and notes
  - Real-time updates

- **Dashboard Analytics**

  - Total expenses overview
  - Monthly expense summary
  - Total entries count

- **Filtering & Export**

  - Filter expenses by category
  - Export data to CSV format

- **Responsive Design**
  - Mobile-friendly interface
  - Clean and modern UI
  - No external CSS frameworks

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Netlify Serverless Functions (Node.js)
- **Database**: Neon PostgreSQL
- **Authentication**: JWT + bcrypt
- **Deployment**: Netlify

## 📁 Project Structure

```
expense-tracker/
├── css/
│   └── style.css              # All styling
├── js/
│   ├── auth.js                # Login/Signup logic
│   └── dashboard.js           # Dashboard & expense logic
├── netlify/
│   └── functions/
│       ├── utils/
│       │   ├── auth.js        # JWT utilities
│       │   └── db.js          # Database connection
│       ├── signup.js          # POST /api/signup
│       ├── login.js           # POST /api/login
│       ├── logout.js          # POST /api/logout
│       ├── me.js              # GET /api/me
│       └── expenses.js        # CRUD for expenses
├── index.html                 # Login/Signup page
├── dashboard.html             # Main dashboard
├── migration.sql              # Database schema
├── netlify.toml               # Netlify configuration
├── package.json               # Dependencies
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## 🚀 Local Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Neon Database account (free tier available)

### Step 1: Clone and Install

```bash
# Clone the repository
cd expense-tracker

# Install dependencies
npm install
```

### Step 2: Setup Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your connection string (looks like: `postgresql://username:password@host.neon.tech/database?sslmode=require`)
4. In Neon SQL Editor, run the SQL from `migration.sql` to create tables

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy from example
cp .env.example .env
```

Edit `.env` and add your values:

```env
DATABASE_URL=postgresql://username:password@host.neon.tech/database?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
```

**Important:** Use a strong random string for `JWT_SECRET`. You can generate one using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Run Locally

```bash
# Start Netlify Dev server
npm run dev
```

The app will be available at `http://localhost:8888`

## 📦 Deployment to Netlify

### Option 1: Deploy via Netlify CLI

```bash
# Install Netlify CLI globally (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

### Option 2: Deploy via Netlify Dashboard

1. **Push to Git Repository**

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-git-repo-url>
   git push -u origin main
   ```

2. **Connect to Netlify**

   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `.`
     - Functions directory: `netlify/functions`

3. **Set Environment Variables**

   - In Netlify Dashboard, go to Site settings → Environment variables
   - Add the following variables:
     - `DATABASE_URL`: Your Neon connection string
     - `JWT_SECRET`: Your secure random string

4. **Deploy**
   - Click "Deploy site"
   - Wait for deployment to complete

### Post-Deployment

After deployment:

1. Visit your site URL (e.g., `https://your-site-name.netlify.app`)
2. Create an account using the signup form
3. Start tracking your expenses!

## 🔧 Environment Variables

Required environment variables for production:

| Variable       | Description                       | Example                                    |
| -------------- | --------------------------------- | ------------------------------------------ |
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host.neon.tech/db` |
| `JWT_SECRET`   | Secret key for JWT signing        | `a-long-random-string-at-least-32-chars`   |

## 📊 Database Schema

### Users Table

```sql
id            UUID PRIMARY KEY
name          VARCHAR(255)
email         VARCHAR(255) UNIQUE
password_hash VARCHAR(255)
created_at    TIMESTAMP
```

### Expenses Table

```sql
id         UUID PRIMARY KEY
user_id    UUID REFERENCES users(id)
title      VARCHAR(255)
amount     DECIMAL(10, 2)
category   VARCHAR(100)
date       DATE
notes      TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

## 🔌 API Endpoints

### Authentication

- `POST /api/signup` - Create new user account

  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepass123"
  }
  ```

- `POST /api/login` - Login existing user

  ```json
  {
    "email": "john@example.com",
    "password": "securepass123"
  }
  ```

- `GET /api/me` - Get current user info
- `POST /api/logout` - Logout current user

### Expenses

- `GET /api/expenses` - Get all expenses for logged-in user
- `POST /api/expenses` - Create new expense
  ```json
  {
    "title": "Grocery Shopping",
    "amount": 125.5,
    "category": "Food",
    "date": "2025-10-18",
    "notes": "Weekly groceries"
  }
  ```
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

## 🎨 Categories

Available expense categories:

- Food
- Transport
- Entertainment
- Shopping
- Bills
- Healthcare
- Education
- Other

## 🔒 Security Features

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens stored in HttpOnly cookies
- CSRF protection via SameSite cookie policy
- SQL injection prevention with parameterized queries
- Input validation on both client and server
- Secure cookie settings in production

## 🐛 Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correctly set in environment variables
- Ensure Neon database is active (not paused)
- Check that IP allowlist includes Netlify's IPs (or set to allow all)

### JWT/Authentication Issues

- Verify `JWT_SECRET` is set
- Clear browser cookies and try logging in again
- Check browser console for error messages

### Functions Not Working

- Ensure `netlify.toml` is in the root directory
- Verify functions are in `netlify/functions` directory
- Check Netlify function logs in dashboard

### Build Failures

- Run `npm install` to ensure all dependencies are installed
- Check that Node.js version is compatible (v16+)
- Review Netlify build logs for specific errors

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests

## 📧 Support

For issues or questions:

1. Check the troubleshooting section
2. Review Netlify function logs
3. Check browser console for errors
4. Open an issue on GitHub

## 🎯 Future Enhancements

Potential features to add:

- Budget limits and notifications
- Recurring expenses
- Multiple currency support
- Expense charts and visualizations
- Receipt image uploads
- Shared expenses with other users
- Mobile app (React Native/Flutter)

---

Built with ❤️ using Netlify and Neon
