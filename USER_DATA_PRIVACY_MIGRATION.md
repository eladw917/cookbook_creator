# User Data Privacy Migration

**Date:** December 13, 2025  
**Status:** ✅ Completed

## Overview

This migration removed sensitive user data from the backend database to improve privacy and security. User display information (email, name, profile picture) is now stored exclusively in Clerk and fetched on-demand.

## What Changed

### Database Schema

**Before:**

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    clerk_id VARCHAR UNIQUE,
    google_id VARCHAR UNIQUE,  -- Deprecated
    email VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    profile_picture_url VARCHAR,
    created_at DATETIME,
    updated_at DATETIME
);
```

**After:**

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    clerk_id VARCHAR NOT NULL UNIQUE,
    created_at DATETIME,
    updated_at DATETIME
);
```

### Removed Fields

- ❌ `email` - Now fetched from Clerk
- ❌ `name` - Now fetched from Clerk
- ❌ `profile_picture_url` - Now fetched from Clerk
- ❌ `google_id` - Deprecated, no longer needed

### Kept Fields

- ✅ `id` - Internal database primary key
- ✅ `clerk_id` - Required for linking to Clerk (not sensitive)
- ✅ `created_at` - Account creation timestamp
- ✅ `updated_at` - Last update timestamp

## Code Changes

### 1. User Model (`backend/models.py`)

Simplified to minimal fields:

```python
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 2. Authentication (`backend/auth.py`)

User creation now only stores `clerk_id`:

```python
user = models.User(clerk_id=clerk_id)
db.add(user)
db.commit()
```

### 3. Auth Endpoint (`backend/main.py`)

The `/auth/me` endpoint now fetches user details from Clerk:

```python
@app.get("/auth/me")
async def get_current_user_info(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Fetch fresh user details from Clerk
    clerk_user = auth.verify_clerk_token(credentials.credentials)

    # Extract display info from Clerk
    email = clerk_user.get("email_addresses", [{}])[0].get("email_address", "")
    name = f"{clerk_user.get('first_name', '')} {clerk_user.get('last_name', '')}".strip()
    profile_picture_url = clerk_user.get("image_url", "")

    return {
        "id": current_user.id,
        "email": email,
        "name": name,
        "profile_picture_url": profile_picture_url,
        "created_at": current_user.created_at
    }
```

### 4. CRUD Operations (`backend/crud.py`)

Removed deprecated functions:

- ❌ `get_user_by_email()` - No longer needed
- ❌ `get_user_by_google_id()` - No longer needed

Kept:

- ✅ `get_user_by_clerk_id()` - Primary user lookup method

### 5. Database Explorer (`backend/db_explorer.py`)

Updated to show only available fields and added notes about Clerk data.

## Migration Process

1. **Backup Created:** `cookbook.db.backup`
2. **Schema Migration:** Executed via `migrate_minimal_user.py`
3. **Data Migrated:** 2 users successfully migrated
4. **Verification:** All relationships (user_recipes, books) intact

## Privacy Benefits

✅ **Email addresses** no longer stored on backend servers  
✅ **User names** no longer stored on backend servers  
✅ **Profile pictures** no longer stored on backend servers  
✅ **Deprecated Google OAuth data** removed  
✅ **Single source of truth** for user identity (Clerk)  
✅ **Reduced data breach risk** - minimal PII exposure  
✅ **Simplified GDPR compliance** - less sensitive data to manage

## Data Flow

```
Frontend Login
    ↓
Clerk Authentication
    ↓
Backend receives Clerk token
    ↓
Backend verifies token with Clerk API
    ↓
Backend creates/finds user by clerk_id only
    ↓
Frontend requests /auth/me
    ↓
Backend fetches user details from Clerk
    ↓
Frontend caches user data in React state
```

## Testing

✅ Server starts successfully with new schema  
✅ Database migration completed without errors  
✅ No linter errors in updated code  
✅ Existing user relationships preserved  
✅ `/auth/me` endpoint structure unchanged (frontend compatible)

## Rollback Instructions

If you need to rollback:

1. Stop the backend server
2. Restore the backup:
   ```bash
   cd backend
   cp cookbook.db.backup cookbook.db
   ```
3. Revert code changes using git:
   ```bash
   git checkout HEAD~1 backend/models.py backend/auth.py backend/main.py backend/crud.py
   ```

## Notes

- **Frontend:** No changes required - the `/auth/me` response format remains the same
- **Clerk API Calls:** Minimal impact - only called once per login session
- **Performance:** Negligible - user info fetch happens once and is cached in frontend
- **Future Users:** All new users will be created with minimal data automatically

## Files Modified

- `backend/models.py` - Updated User model
- `backend/auth.py` - Simplified user creation
- `backend/main.py` - Updated /auth/me endpoint
- `backend/crud.py` - Removed deprecated functions
- `backend/db_explorer.py` - Updated display functions
- `SETUP_GUIDE.md` - Updated database documentation
- `SQLITE_DATABASE_GUIDE.md` - Updated examples

## Files Created

- `backend/migrate_minimal_user.py` - Migration script
- `backend/test_auth_endpoint.py` - Testing helper
- `backend/cookbook.db.backup` - Database backup
- `USER_DATA_PRIVACY_MIGRATION.md` - This document
