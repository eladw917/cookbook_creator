# 🚀 START HERE - Quick Start Guide

## ✅ What's Already Done

- ✅ Backend dependencies installed
- ✅ Frontend dependencies installed
- ✅ Environment files created
- ✅ Code migrated to Clerk

## 🔑 What You Need To Do (5 minutes)

### Step 1: Get Clerk API Keys

1. Go to **[https://clerk.com](https://clerk.com)** and sign up
2. Create an application called "Cookbook Creator"
3. Go to **API Keys** in the dashboard
4. Copy these two keys:
   - **Publishable Key** (starts with `pk_test_...`)
   - **Secret Key** (starts with `sk_test_...`)

### Step 2: Update Environment Files

**Edit `backend/.env`:**

Find this line:

```bash
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key-here
```

Replace with your actual Secret Key:

```bash
CLERK_SECRET_KEY=sk_test_PASTE_YOUR_ACTUAL_KEY_HERE
```

**Edit `frontend/.env`:**

Find this line:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key-here
```

Replace with your actual Publishable Key:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_PASTE_YOUR_ACTUAL_KEY_HERE
```

### Step 3: Start the Application

**Terminal 1 - Backend:**

```bash
cd backend
source venv/bin/activate
python main.py
```

Wait for: `Uvicorn running on http://0.0.0.0:8000`

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

Wait for: `Local: http://localhost:5173/`

### Step 4: Test It!

1. Open **http://localhost:5173** in your browser
2. Enter a YouTube cooking video URL
3. Click "Get Started"
4. Sign in with Clerk
5. Your recipe will be extracted! 🎉

---

## 🆘 Troubleshooting

### Backend won't start?

**Error: "Clerk secret key not configured"**

- Make sure you updated `backend/.env` with your actual Clerk Secret Key
- Restart the backend

**Error: "No module named..."**

- Run: `cd backend && source venv/bin/activate && pip install -r requirements.txt`

### Frontend won't start?

**Error: "Missing Clerk Publishable Key"**

- Make sure you updated `frontend/.env` with your actual Clerk Publishable Key
- Restart the frontend

**Error: "Cannot find module..."**

- Run: `cd frontend && npm install`

---

## 📁 File Locations

- **Backend env**: `backend/.env`
- **Frontend env**: `frontend/.env`
- **Backend start**: `backend/main.py`
- **Frontend start**: `frontend/package.json` (npm run dev)

---

## 📚 More Help

- **`ENV_SETUP_INSTRUCTIONS.md`** - Detailed setup steps
- **`CLERK_IMPLEMENTATION_VERIFIED.md`** - Technical verification
- **`NEXT_STEPS.md`** - Quick reference

---

**Ready?** Get your Clerk keys and update the `.env` files. You're 5 minutes away from running! 🚀
