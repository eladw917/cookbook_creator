# Quick Start Guide

Get up and running with the Cookbook Creator in 5 minutes!

## Prerequisites

- Python 3.8+ installed
- Node.js 16+ installed
- Google account for OAuth

## Step 1: Get Google OAuth Credentials (2 minutes)

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure consent screen if needed
6. Set Application type: "Web application"
7. Add Authorized JavaScript origins: `http://localhost:5173`
8. Add Authorized redirect URIs: `http://localhost:8000/auth/callback`
9. Copy your Client ID and Client Secret

## Step 2: Configure Backend (1 minute)

```bash
cd backend

# Create .env file
cat > .env << EOF
GEMINI_API_KEY=your-existing-gemini-key
GOOGLE_CLIENT_ID=paste-client-id-here
GOOGLE_CLIENT_SECRET=paste-client-secret-here
JWT_SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=sqlite:///./cookbook.db
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
EOF

# Install dependencies
pip install -r requirements.txt
```

## Step 3: Configure Frontend (30 seconds)

```bash
cd frontend

# Create .env file
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=paste-same-client-id-here
EOF

# Install dependencies
npm install
```

## Step 4: Start Servers (30 seconds)

**Terminal 1 - Backend:**

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

## Step 5: Use the App! (1 minute)

1. Open http://localhost:5173 in your browser
2. Enter a YouTube cooking video URL
3. Click "Get Started"
4. Sign in with Google
5. Watch your recipe being extracted!
6. Start building your cookbook collection 🍳

## Troubleshooting

### "Invalid client" error

- Double-check your Google Client ID matches in both backend and frontend .env files

### Backend won't start

- Make sure port 8000 is not in use
- Verify your GEMINI_API_KEY is set correctly

### Frontend won't start

- Make sure port 5173 is not in use
- Run `npm install` again if you see dependency errors

### "CORS error"

- Verify CORS_ORIGINS in backend .env is `http://localhost:5173`
- Make sure both servers are running

## What's Next?

- Add multiple recipes to your collection
- Create your first cookbook (needs 5-20 recipes)
- Download beautiful PDF cookbooks
- Explore the recipe collection features

## Need Help?

Check out:

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Detailed setup instructions
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Upgrading from old version
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical details

Happy cooking! 🍳📚✨


