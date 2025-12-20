"""
Database migration script to add print_orders table
This script creates the print_orders table for tracking Lulu print jobs
"""
import sqlite3
import sys
from datetime import datetime

DATABASE_PATH = "cookbook.db"

def migrate_database():
    """Add print_orders table to the database"""
    print("="*60)
    print("Database Migration: Add Print Orders Table")
    print("="*60)
    
    # Connect to database
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Step 1: Check if print_orders table already exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='print_orders'")
        if cursor.fetchone():
            print("✓ print_orders table already exists. No migration needed.")
            return
        
        # Step 2: Create print_orders table
        print("\nCreating print_orders table...")
        cursor.execute("""
            CREATE TABLE print_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                lulu_job_id VARCHAR UNIQUE,
                status VARCHAR DEFAULT 'CREATED',
                shipping_name VARCHAR NOT NULL,
                shipping_address JSON NOT NULL,
                shipping_level VARCHAR DEFAULT 'MAIL',
                total_cost VARCHAR,
                tracking_id VARCHAR,
                tracking_url VARCHAR,
                carrier_name VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (book_id) REFERENCES books (id)
            )
        """)
        print("✓ Created print_orders table")
        
        # Step 3: Create indexes
        print("\nCreating indexes...")
        cursor.execute("CREATE INDEX idx_print_orders_user_id ON print_orders(user_id)")
        cursor.execute("CREATE INDEX idx_print_orders_book_id ON print_orders(book_id)")
        cursor.execute("CREATE UNIQUE INDEX idx_print_orders_lulu_job_id ON print_orders(lulu_job_id)")
        print("✓ Created indexes")
        
        # Commit changes
        conn.commit()
        
        print("\n" + "="*60)
        print("✓ Migration completed successfully!")
        print("="*60)
        print("Added table: print_orders")
        print("Columns:")
        print("  - id (primary key)")
        print("  - user_id (foreign key to users)")
        print("  - book_id (foreign key to books)")
        print("  - lulu_job_id (unique, Lulu's print job ID)")
        print("  - status (CREATED, UNPAID, IN_PRODUCTION, SHIPPED, etc.)")
        print("  - shipping_name, shipping_address, shipping_level")
        print("  - total_cost")
        print("  - tracking_id, tracking_url, carrier_name")
        print("  - created_at, updated_at")
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    print("\nThis script will add the print_orders table to your database.")
    print("This is required for the Lulu print-on-demand integration.")
    
    # Check if running in non-interactive mode
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--auto':
        migrate_database()
    else:
        response = input("\nProceed with migration? (yes/no): ").strip().lower()
        if response == 'yes':
            migrate_database()
        else:
            print("Migration cancelled.")

