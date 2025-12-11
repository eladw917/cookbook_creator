# Migration Guide - Upgrading to Multi-User System

This guide helps you migrate from the single-user recipe extraction tool to the new multi-user platform with authentication.

## Overview of Changes

### What's New

- ✅ User authentication with Google OAuth
- ✅ Personal recipe collections
- ✅ Cookbook creation (5-20 recipes per book)
- ✅ User profiles and management
- ✅ Recipe sharing (deduplication by video_id)

### What's Preserved

- ✅ All existing cache data (recipes, frames, PDFs)
- ✅ Recipe extraction pipeline
- ✅ PDF generation
- ✅ All existing API endpoints (now with optional auth)

## Breaking Changes

### Frontend

- **Old**: Single-page app with direct recipe extraction
- **New**: Multi-page app with routing and authentication

### Backend

- **New Dependencies**: SQLAlchemy, python-jose, google-auth
- **New Database**: SQLite database for user/recipe management
- **API Changes**: Most endpoints now support/require authentication

## Migration Steps

### 1. Backup Existing Data

```bash
# Backup your cache directory
cp -r backend/cache backend/cache_backup

# Backup your .env file
cp backend/.env backend/.env.backup
```

### 2. Update Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

New dependencies added:

- `sqlalchemy==2.0.23` - Database ORM
- `python-jose[cryptography]==3.3.0` - JWT tokens
- `google-auth==2.25.2` - Google OAuth verification
- `python-dotenv==1.0.0` - Environment variables

### 3. Update Frontend Dependencies

```bash
cd frontend
npm install
```

New dependencies added:

- `react-router-dom@^6.21.0` - Routing
- `@react-oauth/google@^0.12.1` - Google OAuth
- `@types/react-router-dom@^5.3.3` - TypeScript types

### 4. Configure Google OAuth

Follow the [SETUP_GUIDE.md](./SETUP_GUIDE.md) to:

1. Create Google OAuth credentials
2. Add to backend/.env:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `JWT_SECRET_KEY`
3. Add to frontend/.env:
   - `VITE_GOOGLE_CLIENT_ID`

### 5. Initialize Database

The database will be automatically created on first backend start:

```bash
cd backend
python main.py
```

This creates `cookbook.db` with all necessary tables.

### 6. Import Existing Recipes (Optional)

If you want to import cached recipes into the database for a user:

```python
# Run this script after creating your first user account
import os
import json
from database import SessionLocal, init_db
import models
import crud

init_db()
db = SessionLocal()

# Replace with your user's email
USER_EMAIL = "your-email@gmail.com"
user = db.query(models.User).filter(models.User.email == USER_EMAIL).first()

if not user:
    print("User not found. Please sign in first to create account.")
    exit()

# Import recipes from cache
cache_dir = "backend/cache"
for video_id in os.listdir(cache_dir):
    video_path = os.path.join(cache_dir, video_id)
    if not os.path.isdir(video_path):
        continue

    recipe_file = os.path.join(video_path, "recipe.json")
    metadata_file = os.path.join(video_path, "metadata.json")

    if os.path.exists(recipe_file) and os.path.exists(metadata_file):
        with open(recipe_file) as f:
            recipe_data = json.load(f)
        with open(metadata_file) as f:
            metadata = json.load(f)

        # Create or get recipe
        recipe, created = crud.get_or_create_recipe(
            db=db,
            video_id=video_id,
            video_url=f"https://www.youtube.com/watch?v={video_id}",
            title=recipe_data.get("title", metadata.get("title")),
            recipe_data=recipe_data,
            channel_name=metadata.get("channel_name")
        )

        # Add to user's collection
        try:
            crud.add_recipe_to_user(db, user.id, recipe.id)
            print(f"Imported: {recipe.title}")
        except ValueError:
            print(f"Already imported: {recipe.title}")

db.close()
print("Import complete!")
```

## Compatibility

### Backward Compatibility

The following features remain compatible:

1. **Cache System**: All cached data (recipes, frames, PDFs) continues to work
2. **Public Endpoints**: Some endpoints work without authentication:

   - `GET /api/cache` - List cached videos
   - `GET /api/cache/{video_id}` - Get cached recipe
   - `GET /api/cache/{video_id}/pdf` - Download PDF

3. **Recipe Extraction**: The `/api/recipe` endpoint works with or without authentication:
   - **Without auth**: Extracts recipe, returns data (not saved)
   - **With auth**: Extracts recipe, saves to user's collection, returns data

### API Endpoint Changes

| Endpoint            | Old Behavior    | New Behavior                                    |
| ------------------- | --------------- | ----------------------------------------------- |
| `POST /api/recipe`  | Extract recipe  | Extract + save to collection (if authenticated) |
| `POST /api/visuals` | Extract visuals | Same + requires authentication                  |
| All new endpoints   | N/A             | Require authentication                          |

## Testing the Migration

### 1. Test Backend

```bash
cd backend
python main.py
```

Check for:

- ✅ Database initialized successfully
- ✅ No import errors
- ✅ Server starts on port 8000

### 2. Test Frontend

```bash
cd frontend
npm run dev
```

Check for:

- ✅ No build errors
- ✅ Landing page loads
- ✅ Google OAuth button appears

### 3. Test Authentication Flow

1. Visit http://localhost:5173
2. Enter a YouTube URL
3. Click "Get Started"
4. Sign in with Google
5. Verify recipe is extracted and saved

### 4. Test Recipe Collection

1. Sign in
2. Navigate to "My Recipes"
3. Verify recipes are listed
4. Test adding/removing recipes

### 5. Test Book Creation

1. Go to recipe collection
2. Select 5-20 recipes
3. Click "Create Book"
4. Enter book name
5. Verify book is created

## Rollback Plan

If you need to rollback:

### 1. Restore Backup

```bash
# Restore cache
rm -rf backend/cache
cp -r backend/cache_backup backend/cache

# Restore .env
cp backend/.env.backup backend/.env
```

### 2. Revert Code

```bash
git checkout <previous-commit-hash>
```

### 3. Reinstall Dependencies

```bash
cd backend
pip install -r requirements.txt

cd frontend
npm install
```

## Common Issues

### "Database is locked" error

- Close all connections to cookbook.db
- Restart the backend server

### "Invalid token" errors

- Clear localStorage in browser
- Sign in again

### Missing recipes in collection

- Run the import script (see step 6)
- Or add recipes manually through the UI

### Google OAuth not working

- Verify client ID matches in backend and frontend
- Check authorized origins in Google Console
- Ensure both servers are running

## Support

If you encounter issues:

1. Check error messages in terminal
2. Review this migration guide
3. Check [SETUP_GUIDE.md](./SETUP_GUIDE.md)
4. Verify environment variables
5. Test with a fresh database (delete cookbook.db)

## Next Steps

After successful migration:

1. ✅ Sign in with Google
2. ✅ Import existing recipes (optional)
3. ✅ Start building your cookbook collection
4. ✅ Create and share cookbooks

Enjoy your new multi-user cookbook platform! 🍳📚


