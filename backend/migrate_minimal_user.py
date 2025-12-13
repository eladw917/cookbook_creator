"""
Database migration script to remove sensitive user data
This script:
1. Verifies all users have a clerk_id
2. Creates a new minimal users table
3. Migrates data from old table to new table
4. Replaces the old table with the new one
"""
import sqlite3
import sys
from datetime import datetime

DATABASE_PATH = "cookbook.db"

def migrate_database():
    """Migrate the database to the minimal user model"""
    print("="*60)
    print("Database Migration: Minimal User Model")
    print("="*60)
    
    # Connect to database
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Step 1: Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("✓ Users table doesn't exist yet. No migration needed.")
            return
        
        # Step 2: Check current schema
        cursor.execute("PRAGMA table_info(users)")
        columns = {col[1] for col in cursor.fetchall()}
        print(f"\nCurrent columns: {columns}")
        
        # If already migrated, skip
        if 'email' not in columns and 'name' not in columns:
            print("✓ Database already migrated to minimal user model.")
            return
        
        # Step 3: Verify all users have clerk_id
        cursor.execute("SELECT COUNT(*) FROM users WHERE clerk_id IS NULL OR clerk_id = ''")
        null_clerk_count = cursor.fetchone()[0]
        
        if null_clerk_count > 0:
            print(f"\n⚠️  WARNING: Found {null_clerk_count} user(s) without clerk_id")
            response = input("Delete these users? (yes/no): ").strip().lower()
            if response == 'yes':
                cursor.execute("DELETE FROM users WHERE clerk_id IS NULL OR clerk_id = ''")
                print(f"✓ Deleted {null_clerk_count} user(s) without clerk_id")
            else:
                print("✗ Migration aborted. Please ensure all users have a clerk_id.")
                return
        
        # Step 4: Get user count
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"\n✓ Found {user_count} user(s) to migrate")
        
        # Step 5: Create new minimal users table
        print("\nCreating new minimal users table...")
        cursor.execute("""
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clerk_id VARCHAR NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✓ Created users_new table")
        
        # Step 6: Migrate data
        print("\nMigrating user data...")
        cursor.execute("""
            INSERT INTO users_new (id, clerk_id, created_at, updated_at)
            SELECT id, clerk_id, created_at, updated_at
            FROM users
            WHERE clerk_id IS NOT NULL AND clerk_id != ''
        """)
        migrated_count = cursor.rowcount
        print(f"✓ Migrated {migrated_count} user(s)")
        
        # Step 7: Drop old table and rename new table
        print("\nReplacing old users table...")
        cursor.execute("DROP TABLE users")
        cursor.execute("ALTER TABLE users_new RENAME TO users")
        print("✓ Replaced users table")
        
        # Step 8: Create index on clerk_id
        print("\nCreating index on clerk_id...")
        cursor.execute("CREATE UNIQUE INDEX idx_users_clerk_id ON users(clerk_id)")
        print("✓ Created index")
        
        # Commit changes
        conn.commit()
        
        print("\n" + "="*60)
        print("✓ Migration completed successfully!")
        print("="*60)
        print(f"Users migrated: {migrated_count}")
        print("Removed columns: email, name, profile_picture_url, google_id")
        print("Remaining columns: id, clerk_id, created_at, updated_at")
        print("\nUser display information will now be fetched from Clerk.")
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    print("\nThis script will migrate your database to the minimal user model.")
    print("A backup should already exist at: cookbook.db.backup")
    print("\nWARNING: This will permanently remove email, name, and profile_picture_url from the database.")
    
    response = input("\nProceed with migration? (yes/no): ").strip().lower()
    if response == 'yes':
        migrate_database()
    else:
        print("Migration cancelled.")
