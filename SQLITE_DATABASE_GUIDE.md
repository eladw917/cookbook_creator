# SQLite Database Guide

## What is SQLite?

SQLite is a lightweight, file-based database that stores all data in a single file (in your case, `cookbook.db`). Unlike MySQL or PostgreSQL, it doesn't require a separate server - it's embedded directly in your application. Perfect for development and small-to-medium applications!

**Key Points:**

- All data is stored in one file: `backend/cookbook.db`
- No server setup needed - just works!
- Uses SQL (Structured Query Language) to interact with data
- Your app uses SQLAlchemy ORM (Object-Relational Mapping) which makes it easier

---

## Your Database Structure

Your cookbook app has **5 tables**:

### 1. **users** - Stores user accounts

- `id` - Primary key (auto-incrementing number)
- `clerk_id` - Unique ID from Clerk authentication
- `email` - User's email address
- `name` - User's name
- `profile_picture_url` - Profile picture URL
- `created_at` - When account was created
- `updated_at` - Last update time

### 2. **recipes** - Stores recipe information

- `id` - Primary key
- `video_id` - YouTube video ID (unique)
- `video_url` - Full YouTube URL
- `title` - Recipe title
- `channel_name` - YouTube channel name
- `recipe_data` - Full recipe as JSON (ingredients, steps, etc.)
- `created_at` - When recipe was added
- `updated_at` - Last update time

### 3. **user_recipes** - Links users to their saved recipes

- `id` - Primary key
- `user_id` - References `users.id`
- `recipe_id` - References `recipes.id`
- `added_at` - When recipe was saved

### 4. **books** - Cookbook collections

- `id` - Primary key
- `user_id` - References `users.id` (who owns the book)
- `name` - Book name
- `created_at` - When book was created
- `updated_at` - Last update time

### 5. **book_recipes** - Links recipes to books

- `id` - Primary key
- `book_id` - References `books.id`
- `recipe_id` - References `recipes.id`
- `order_index` - Order of recipe in book (0, 1, 2, ...)
- `added_at` - When recipe was added to book

---

## Ways to Interact with Your Database

### Method 1: Using a GUI Tool (Easiest - Recommended for Beginners!)

**DB Browser for SQLite** is the easiest way to explore your database:

1. Download from: https://sqlitebrowser.org/ (free, works on Mac/Windows/Linux)
2. Open `backend/cookbook.db` in the app
3. Browse tables visually, edit data, run queries with a nice interface

**VS Code Extension** (if you use VS Code):

- Install "SQLite Viewer" extension
- Right-click `cookbook.db` → "Open Database"
- Browse and query visually

**Why use a GUI?**

- Visual table browser
- Easy to edit data
- Query builder interface
- Export data to CSV/JSON
- No command-line needed

---

### Method 2: Using Python/SQLAlchemy (What Your App Uses)

Your app already uses SQLAlchemy ORM. Here's how it works:

#### Getting a Database Session

```python
from database import get_db, SessionLocal
from sqlalchemy.orm import Session

# Option 1: Use the dependency function (for FastAPI endpoints)
def my_endpoint(db: Session = Depends(get_db)):
    # Use db here
    pass

# Option 2: Create a session manually (for scripts)
db = SessionLocal()
try:
    # Use db here
    pass
finally:
    db.close()
```

#### Common Operations

**Query all users:**

```python
from models import User
users = db.query(User).all()
for user in users:
    print(f"{user.name} ({user.email})")
```

**Find a user by email:**

```python
from crud import get_user_by_email
user = get_user_by_email(db, "example@email.com")
if user:
    print(f"Found: {user.name}")
```

**Get all recipes for a user:**

```python
from crud import get_user_recipes
recipes = get_user_recipes(db, user_id=1)
for recipe in recipes:
    print(f"- {recipe.title}")
```

**Create a new recipe:**

```python
from crud import create_recipe
recipe = create_recipe(
    db=db,
    video_id="dQw4w9WgXcQ",
    video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title="Amazing Recipe",
    recipe_data={"ingredients": [], "steps": []},
    channel_name="Cooking Channel"
)
print(f"Created recipe with ID: {recipe.id}")
```

**Add recipe to user's collection:**

```python
from crud import add_recipe_to_user
add_recipe_to_user(db, user_id=1, recipe_id=5)
```

**Get all books for a user:**

```python
from crud import get_user_books
books = get_user_books(db, user_id=1)
for book in books:
    print(f"- {book.name} ({len(book.book_recipes)} recipes)")
```

---

### Method 3: Using SQLite Command Line Tool

You can interact directly with the database using the `sqlite3` command-line tool.

#### Opening Your Database

```bash
cd backend
sqlite3 cookbook.db
```

#### Basic SQL Commands

**View all tables:**

```sql
.tables
```

**View table structure:**

```sql
.schema users
.schema recipes
```

**View all users:**

```sql
SELECT * FROM users;
```

**View users with formatted output:**

```sql
.mode column
.headers on
SELECT id, email, name FROM users;
```

**Count recipes:**

```sql
SELECT COUNT(*) FROM recipes;
```

**Find recipes by title:**

```sql
SELECT id, title, video_id FROM recipes WHERE title LIKE '%chicken%';
```

**Get all recipes for a specific user:**

```sql
SELECT r.id, r.title, r.video_url
FROM recipes r
JOIN user_recipes ur ON r.id = ur.recipe_id
WHERE ur.user_id = 1;
```

**Get all books with recipe counts:**

```sql
SELECT b.id, b.name, COUNT(br.recipe_id) as recipe_count
FROM books b
LEFT JOIN book_recipes br ON b.id = br.book_id
GROUP BY b.id, b.name;
```

**Exit sqlite3:**

```sql
.quit
```

#### Useful SQLite Commands

```sql
.headers on          -- Show column headers
.mode column         -- Format output as columns
.mode table          -- Format as table
.mode json           -- Output as JSON
.width 20 30         -- Set column widths
.output results.txt  -- Save output to file
.read script.sql     -- Execute SQL from file
```

---

### Method 4: Custom Python Script (Optional - For Learning)

There's also a `db_explorer.py` script in the backend folder that demonstrates how to use your existing code. It's mainly useful for:

- Learning how your CRUD functions work
- Quick command-line exploration
- Custom queries using your existing code

But honestly, **DB Browser for SQLite is much easier** for most tasks!

---

## Common SQL Queries for Your App

### Find all recipes saved by a user

```sql
SELECT r.id, r.title, r.video_url, ur.added_at
FROM recipes r
JOIN user_recipes ur ON r.id = ur.recipe_id
WHERE ur.user_id = 1
ORDER BY ur.added_at DESC;
```

### Get a book with all its recipes in order

```sql
SELECT b.name, r.title, br.order_index
FROM books b
JOIN book_recipes br ON b.id = br.book_id
JOIN recipes r ON br.recipe_id = r.id
WHERE b.id = 1
ORDER BY br.order_index;
```

### Find duplicate recipes (same video_id)

```sql
SELECT video_id, COUNT(*) as count
FROM recipes
GROUP BY video_id
HAVING COUNT(*) > 1;
```

### Get user statistics

```sql
SELECT
    u.name,
    COUNT(DISTINCT ur.recipe_id) as recipe_count,
    COUNT(DISTINCT b.id) as book_count
FROM users u
LEFT JOIN user_recipes ur ON u.id = ur.user_id
LEFT JOIN books b ON u.id = b.user_id
GROUP BY u.id, u.name;
```

### Find recipes not in any book

```sql
SELECT r.id, r.title
FROM recipes r
LEFT JOIN book_recipes br ON r.id = br.recipe_id
WHERE br.id IS NULL;
```

---

## Important Notes

### 1. Always Commit Changes

When you modify data, you must commit:

```python
db.add(new_item)
db.commit()  # Don't forget this!
```

### 2. Use Transactions

SQLite uses transactions. If something fails, rollback:

```python
try:
    db.add(item)
    db.commit()
except Exception as e:
    db.rollback()
    raise
```

### 3. Close Sessions

Always close database sessions:

```python
db.close()
```

Or use context managers:

```python
from contextlib import contextmanager

@contextmanager
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Usage:
with get_db_session() as db:
    recipes = db.query(models.Recipe).all()
```

### 4. Backup Your Database

```bash
# Copy the file
cp backend/cookbook.db backend/cookbook.db.backup

# Or use SQLite backup command
sqlite3 cookbook.db ".backup cookbook.db.backup"
```

### 5. Database Location

Your database file is at: `backend/cookbook.db`

---

## Troubleshooting

### "Database is locked"

- Another process is using the database
- Close other connections
- Check if your FastAPI server is running

### "No such table"

- Tables might not be initialized
- Run: `python -c "from database import init_db; init_db()"`

### View database file size

```bash
ls -lh backend/cookbook.db
```

### Check if database exists

```bash
ls -la backend/cookbook.db
```

---

## Learning Resources

- **SQLite Tutorial**: https://www.sqlitetutorial.net/
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org/
- **SQL Basics**: https://www.w3schools.com/sql/

---

## Quick Reference: Your CRUD Functions

All these are in `backend/crud.py`:

**Users:**

- `get_user_by_id(db, user_id)`
- `get_user_by_email(db, email)`
- `get_user_by_clerk_id(db, clerk_id)`

**Recipes:**

- `get_recipe_by_id(db, recipe_id)`
- `get_recipe_by_video_id(db, video_id)`
- `create_recipe(db, ...)`
- `get_or_create_recipe(db, ...)`

**User Recipes:**

- `get_user_recipes(db, user_id)`
- `add_recipe_to_user(db, user_id, recipe_id)`
- `remove_recipe_from_user(db, user_id, recipe_id)`
- `user_has_recipe(db, user_id, recipe_id)`

**Books:**

- `get_book_by_id(db, book_id)`
- `get_user_books(db, user_id)`
- `create_book(db, user_id, name, recipe_ids)`
- `get_book_recipes(db, book_id)`
- `get_book_with_recipes(db, book_id)`
- `delete_book(db, book_id, user_id)`
