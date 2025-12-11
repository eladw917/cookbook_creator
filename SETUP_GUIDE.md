# Setup Guide - Clerk Authentication & Recipe Management

This guide will help you set up the cookbook creator with Clerk authentication, user profiles, recipe collections, and cookbook creation.

## Prerequisites

- Python 3.8+
- Node.js 16+
- Clerk account (free tier available)

## Clerk Authentication Setup

### 1. Create Clerk Account and Application

1. **Go to [Clerk.com](https://clerk.com)** and sign up for a free account

2. **Create a new application**:

   - Click "Add application"
   - Enter application name: "Cookbook Creator"
   - Choose your preferred authentication methods (Google, Email, etc.)
   - Click "Create application"

3. **Get your API keys**:

   - In your Clerk dashboard, go to "API Keys"
   - Copy your **Publishable Key** (starts with `pk_test_...`)
   - Copy your **Secret Key** (starts with `sk_test_...`)
   - Keep these safe - you'll need them for the `.env` files

4. **Configure authentication providers** (optional):

   - Go to "User & Authentication" → "Social Connections"
   - Enable Google, GitHub, or other providers you want
   - Follow Clerk's instructions to configure each provider

5. **Add authorized domains**:
   - Go to "Domains"
   - Add `http://localhost:5173` for development
   - Add your production domain when deploying

### 2. Configure Backend Environment

Create `backend/.env` file:

```bash
# Google Gemini API Key (required for recipe extraction)
GEMINI_API_KEY=your-gemini-api-key-here

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key-here

# Database URL (SQLite by default)
DATABASE_URL=sqlite:///./cookbook.db

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

**To get your Gemini API Key:**

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key and paste it in your `.env` file

### 3. Configure Frontend Environment

Create `frontend/.env` file:

```bash
# Backend API URL
VITE_API_BASE_URL=http://localhost:8000

# Clerk Publishable Key
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key-here
```

## Installation

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# The database will be automatically initialized on first run
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## Running the Application

### Start Backend

```bash
cd backend
python main.py
```

The backend will:

- Initialize the SQLite database automatically
- Create all necessary tables (including the new `clerk_id` column)
- Start on http://localhost:8000

### Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on http://localhost:5173

## Features

### User Authentication (via Clerk)

- **Multiple sign-in options**: Google, email/password, and more
- **Pre-built UI components**: Beautiful, customizable sign-in/sign-up forms
- **Automatic session management**: Secure token handling and refresh
- **User management dashboard**: Manage users directly from Clerk dashboard

### Recipe Management

- **Extract recipes** from YouTube cooking videos using AI
- **Save recipes** to your personal collection
- **Shared recipe database**: One recipe entry per YouTube video
- **User-specific collections**: Each user has their own recipe library
- **Search and organize**: Find recipes by title or channel name

### Cookbook Creation

- **Select 5-20 recipes** from your collection
- **Create named cookbooks** with custom titles
- **Download as PDF**: Beautiful, formatted cookbook PDFs
- **Manage multiple cookbooks**: Create as many as you want

## Database Schema

The application uses SQLite with the following tables:

- **users**: User accounts with Clerk integration
  - `id`: Primary key
  - `clerk_id`: Clerk user identifier (unique)
  - `google_id`: Legacy Google ID (nullable, for backward compatibility)
  - `email`: User email
  - `name`: User display name
  - `profile_picture_url`: User avatar URL
- **recipes**: Shared recipe data (one per YouTube video)
  - `id`: Primary key
  - `video_id`: YouTube video ID (unique)
  - `video_url`: Full YouTube URL
  - `title`: Recipe title
  - `channel_name`: YouTube channel name
  - `recipe_data`: Full recipe JSON
- **user_recipes**: Many-to-many relationship (users ↔ recipes)
  - Links users to their saved recipes
- **books**: User's cookbooks
  - `id`: Primary key
  - `user_id`: Owner user ID
  - `name`: Cookbook name
- **book_recipes**: Many-to-many relationship (books ↔ recipes)
  - Links cookbooks to their recipes with ordering

## API Endpoints

### Authentication

- `GET /auth/me` - Get current user info (requires Clerk token)

### Recipes

- `POST /api/recipe` - Extract recipe (saves to collection if authenticated)
- `GET /api/recipes` - Get user's saved recipes
- `POST /api/recipes` - Save recipe to collection
- `DELETE /api/recipes/{id}` - Remove recipe from collection

### Books

- `POST /api/books` - Create new book
- `GET /api/books` - Get user's books
- `GET /api/books/{id}` - Get book details with recipes
- `DELETE /api/books/{id}` - Delete book
- `GET /api/books/{id}/pdf` - Download book PDF

## User Flow

### New User

1. Visit landing page at `http://localhost:5173`
2. Enter YouTube URL
3. Click "Get Started" → Clerk sign-in modal appears
4. Sign in with Google (or create account with email)
5. Recipe is automatically extracted and saved
6. User sees their first recipe in collection

### Returning User

1. Sign in with Clerk (automatic if session exists)
2. View recipe collection
3. Add new recipes via URL
4. Create cookbooks from saved recipes (5-20 recipes)
5. Download individual recipe PDFs or combined cookbook PDFs

## Troubleshooting

### "Missing Clerk Publishable Key" Error

- Verify `VITE_CLERK_PUBLISHABLE_KEY` is set in `frontend/.env`
- Restart the frontend dev server: `npm run dev`

### "Clerk secret key not configured" Error

- Verify `CLERK_SECRET_KEY` is set in `backend/.env`
- Restart the backend server: `python main.py`

### "Invalid or expired token" Error

- Check that your Clerk Secret Key is correct in `backend/.env`
- Make sure you're using keys from the same Clerk application
- Verify you're using the correct environment (test vs production)

### Database errors

- Delete `backend/cookbook.db` file to reset database
- Restart backend to reinitialize with correct schema

### CORS errors

- Verify `CORS_ORIGINS` in `backend/.env` matches frontend URL
- Check both servers are running on correct ports (8000 and 5173)

## Development Notes

### Cache vs Database

- **Cache**: Stores extracted recipe data, frames, PDFs (by video_id)
- **Database**: Stores user accounts, recipe references, books
- Cache serves as optimization layer, database as source of truth

### Recipe Deduplication

- When a user adds a recipe, system checks if video_id exists
- If exists: creates user_recipe link to existing recipe
- If not: extracts recipe, saves to database, creates user_recipe link

### Security

- All recipe/book operations require Clerk authentication
- Clerk handles token validation and refresh automatically
- Users can only access their own data
- SQL injection protection via SQLAlchemy ORM

## Clerk Benefits

### Why Clerk vs Manual OAuth?

✅ **Simpler Setup**: No Google Cloud Console complexity
✅ **Multiple Providers**: Easy to add GitHub, Facebook, etc.
✅ **Better UX**: Pre-built, customizable UI components
✅ **Automatic Security**: Clerk handles all crypto and security
✅ **User Management**: Built-in dashboard to manage users
✅ **Free Tier**: Up to 10,000 monthly active users
✅ **Session Management**: Automatic token refresh and persistence

### Customization

You can customize Clerk's appearance in your dashboard:

- Brand colors and logos
- Custom CSS
- Localization (multiple languages)
- Custom fields and metadata

## Next Steps

1. **Set up Clerk account** and get API keys
2. **Configure environment variables** in both `.env` files
3. **Install dependencies** for backend and frontend
4. **Run both servers** (backend and frontend)
5. **Visit http://localhost:5173** and start creating your cookbook!

### Optional Enhancements

- **Customize Clerk UI**: Match your brand in Clerk dashboard
- **Add more auth providers**: Enable GitHub, Facebook, etc.
- **Set up production**: Create production Clerk app with live keys
- **Enable email verification**: Configure in Clerk dashboard
- **Add webhooks**: Get notified of user events (optional)

## Support

### Clerk Documentation

- [Clerk Docs](https://clerk.com/docs)
- [React Integration](https://clerk.com/docs/react/overview)
- [API Reference](https://clerk.com/docs/reference/backend-api)

### Getting Help

- Clerk Discord community
- Clerk support (available in dashboard)
- Check `CLERK_MIGRATION_COMPLETE.md` for detailed migration notes

---

**Ready to get started?** Follow the setup steps above and you'll have your cookbook creator running in minutes! 🚀
