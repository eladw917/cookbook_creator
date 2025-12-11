# Environment Variables Setup Instructions

## Quick Setup Guide

You need to set up environment variables in two places:

1. `backend/.env` (already exists, needs updating)
2. `frontend/.env` (needs to be created)

---

## Step 1: Get Your Clerk API Keys

### 1.1 Sign up for Clerk (5 minutes)

1. Go to **[https://clerk.com](https://clerk.com)**
2. Click "Start building for free"
3. Sign up with your email or GitHub

### 1.2 Create Your Application

1. After signing in, click **"Add application"**
2. Name it: **"Cookbook Creator"**
3. Choose authentication methods:
   - ✅ **Email** (recommended)
   - ✅ **Google** (recommended)
   - You can add more later
4. Click **"Create application"**

### 1.3 Get Your API Keys

1. You'll be taken to the **API Keys** page automatically
2. Copy these two keys:
   - **Publishable Key** (starts with `pk_test_...`)
   - **Secret Key** (starts with `sk_test_...`)
3. Keep this page open - you'll need these keys in the next steps

---

## Step 2: Update Backend Environment Variables

### Edit `backend/.env`

Open the file `backend/.env` in your editor and update it to look like this:

```bash
# Google Gemini API Key (required for recipe extraction)
GEMINI_API_KEY=your-existing-gemini-key-keep-this

# Clerk Authentication (ADD THESE TWO LINES)
CLERK_SECRET_KEY=sk_test_paste-your-clerk-secret-key-here

# Database URL (SQLite by default)
DATABASE_URL=sqlite:///./cookbook.db

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

**What to do:**

1. Keep your existing `GEMINI_API_KEY` value
2. **Add** the line `CLERK_SECRET_KEY=` and paste your Clerk **Secret Key** (the one starting with `sk_test_`)
3. Remove any old Google OAuth lines if they exist:
   - ❌ Remove `GOOGLE_CLIENT_ID` (not needed anymore)
   - ❌ Remove `GOOGLE_CLIENT_SECRET` (not needed anymore)
   - ❌ Remove `GOOGLE_REDIRECT_URI` (not needed anymore)
   - ❌ Remove `JWT_SECRET_KEY` (not needed anymore)

---

## Step 3: Create Frontend Environment Variables

### Create `frontend/.env`

Create a new file at `frontend/.env` with this content:

```bash
# Backend API URL
VITE_API_BASE_URL=http://localhost:8000

# Clerk Publishable Key
VITE_CLERK_PUBLISHABLE_KEY=pk_test_paste-your-clerk-publishable-key-here
```

**What to do:**

1. Create the file `frontend/.env` (it doesn't exist yet)
2. Paste the content above
3. Replace `pk_test_paste-your-clerk-publishable-key-here` with your actual Clerk **Publishable Key** (the one starting with `pk_test_`)

---

## Step 4: Verify Your Setup

### Backend `.env` should have:

- ✅ `GEMINI_API_KEY=` (your existing key)
- ✅ `CLERK_SECRET_KEY=sk_test_...` (new)
- ✅ `DATABASE_URL=sqlite:///./cookbook.db`
- ✅ `FRONTEND_URL=http://localhost:5173`
- ✅ `CORS_ORIGINS=http://localhost:5173`

### Frontend `.env` should have:

- ✅ `VITE_API_BASE_URL=http://localhost:8000`
- ✅ `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...` (new)

---

## Step 5: Install Dependencies

Now that your environment is configured, install the new dependencies:

### Backend

```bash
cd backend
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

---

## Step 6: Start the Application

### Terminal 1 - Backend

```bash
cd backend
python main.py
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

You should see:

```
VITE v... ready in ...ms
➜  Local:   http://localhost:5173/
```

---

## Step 7: Test It!

1. Open your browser to **http://localhost:5173**
2. Enter a YouTube cooking video URL
3. Click **"Get Started"**
4. You should see a beautiful Clerk sign-in modal
5. Sign in with Google or create an account with email
6. Your recipe should be extracted and saved!

---

## Troubleshooting

### ❌ "Missing Clerk Publishable Key" error in browser console

**Problem:** Frontend can't find the Clerk key

**Solution:**

1. Make sure `frontend/.env` exists
2. Make sure it has `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`
3. Restart the frontend server: `Ctrl+C` then `npm run dev`

### ❌ "Clerk secret key not configured" error in backend

**Problem:** Backend can't find the Clerk key

**Solution:**

1. Make sure `backend/.env` has `CLERK_SECRET_KEY=sk_test_...`
2. Restart the backend server: `Ctrl+C` then `python main.py`

### ❌ Backend won't start - "No module named 'clerk'"

**Problem:** New dependencies not installed

**Solution:**

```bash
cd backend
pip install -r requirements.txt
```

### ❌ Frontend won't start - "Cannot find module '@clerk/clerk-react'"

**Problem:** New dependencies not installed

**Solution:**

```bash
cd frontend
npm install
```

---

## Quick Copy-Paste Templates

### Backend `.env` Template

```bash
GEMINI_API_KEY=your-existing-gemini-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key-here
DATABASE_URL=sqlite:///./cookbook.db
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

### Frontend `.env` Template

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key-here
```

---

## Need Help?

1. **Can't find your Clerk keys?**
   - Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
   - Select your application
   - Click "API Keys" in the sidebar
2. **Need a Gemini API key?**
   - Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
   - Click "Create API Key"
3. **Still stuck?**
   - Check `CLERK_MIGRATION_COMPLETE.md` for more details
   - Check `SETUP_GUIDE.md` for complete setup instructions

---

**Ready?** Follow the steps above and you'll be up and running in 10 minutes! 🚀
