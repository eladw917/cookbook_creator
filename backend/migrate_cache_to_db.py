"""
Migration script to import recipes from cache into database
This will:
1. Scan cache directory for all recipes
2. Create Recipe entries in database
3. Associate them with a user (you'll need to specify user_id or clerk_id)
"""
import sys
from pathlib import Path
import json
from sqlalchemy.orm import Session

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

import database
import models
import crud
import cache_manager

def migrate_cache_to_database(user_id: int = None, clerk_id: str = None):
    """
    Migrate all recipes from cache to database
    
    Args:
        user_id: User ID to associate recipes with (optional)
        clerk_id: Clerk ID to find user and associate recipes with (optional)
    """
    db = next(database.get_db())
    
    # Get or find user
    user = None
    if user_id:
        user = crud.get_user_by_id(db, user_id)
    elif clerk_id:
        user = crud.get_user_by_clerk_id(db, clerk_id)
    
    if not user:
        print("ERROR: User not found. Please provide a valid user_id or clerk_id")
        print("\nAvailable users:")
        users = db.query(models.User).all()
        for u in users:
            print(f"  - User ID: {u.id}, Clerk ID: {u.clerk_id}")
        return
    
    print(f"Migrating recipes to user ID {user.id} (clerk_id: {user.clerk_id})")
    print("=" * 60)
    
    # Scan cache directory directly to avoid issues with corrupted metadata files
    cache_dir = cache_manager.CACHE_DIR
    if not cache_dir.exists():
        print(f"ERROR: Cache directory not found: {cache_dir}")
        return
    
    video_dirs = [d for d in cache_dir.iterdir() if d.is_dir()]
    print(f"Found {len(video_dirs)} cached video directories")
    
    migrated_count = 0
    skipped_count = 0
    error_count = 0
    
    for video_dir in video_dirs:
        video_id = video_dir.name
        
        # Check if recipe.json exists
        recipe_file = video_dir / "recipe.json"
        if not recipe_file.exists():
            print(f"⏭️  Skipping {video_id}: No recipe.json found")
            skipped_count += 1
            continue
        
        try:
            # Load recipe from cache
            try:
                recipe_data = cache_manager.load_step(video_id, "recipe")
            except (json.JSONDecodeError, Exception) as e:
                print(f"⚠️  Skipping {video_id}: Error loading recipe.json: {e}")
                skipped_count += 1
                continue
                
            if not recipe_data:
                print(f"⚠️  Skipping {video_id}: Could not load recipe.json")
                skipped_count += 1
                continue
            
            # Load metadata for video URL and channel name
            metadata = None
            try:
                metadata = cache_manager.load_step(video_id, "metadata")
            except (json.JSONDecodeError, Exception):
                # Metadata might be corrupted, that's okay
                pass
                
            video_url = recipe_data.get("video_url") or (f"https://www.youtube.com/watch?v={video_id}" if not recipe_data.get("video_url") else None)
            channel_name = recipe_data.get("channel_name") or (metadata.get("channel_name") if metadata else None)
            title = recipe_data.get("title") or (metadata.get("title") if metadata else f"Recipe {video_id}")
            
            if not video_url:
                print(f"⚠️  Skipping {video_id}: No video URL found")
                skipped_count += 1
                continue
            
            # Check if recipe already exists
            existing_recipe = crud.get_recipe_by_video_id(db, video_id)
            
            if existing_recipe:
                print(f"✓ Recipe {video_id} already exists in database")
                recipe = existing_recipe
            else:
                # Create recipe in database
                recipe = crud.create_recipe(
                    db=db,
                    video_id=video_id,
                    video_url=video_url,
                    title=title,
                    recipe_data=recipe_data,
                    channel_name=channel_name
                )
                print(f"✓ Created recipe: {title[:50]}... ({video_id})")
            
            # Check if already associated with user
            if crud.user_has_recipe(db, user.id, recipe.id):
                print(f"  → Already associated with user")
            else:
                # Associate with user
                try:
                    crud.add_recipe_to_user(db, user.id, recipe.id)
                    print(f"  → Associated with user")
                    migrated_count += 1
                except ValueError as e:
                    print(f"  → Already associated: {e}")
            
        except Exception as e:
            print(f"❌ Error migrating {video_id}: {e}")
            import traceback
            traceback.print_exc()
            error_count += 1
    
    print("=" * 60)
    print(f"Migration complete!")
    print(f"  ✓ Migrated: {migrated_count}")
    print(f"  ⏭️  Skipped: {skipped_count}")
    print(f"  ❌ Errors: {error_count}")
    print(f"  Total recipes in database for user {user.id}: {len(crud.get_user_recipes(db, user.id))}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate recipes from cache to database")
    parser.add_argument("--user-id", type=int, help="User ID to associate recipes with")
    parser.add_argument("--clerk-id", type=str, help="Clerk ID to find user and associate recipes with")
    parser.add_argument("--auto", action="store_true", help="Auto-detect user (use first user found)")
    
    args = parser.parse_args()
    
    if args.auto:
        # Auto-detect: use first user found
        db = next(database.get_db())
        users = db.query(models.User).all()
        if not users:
            print("ERROR: No users found in database. Please create a user first by signing in.")
            sys.exit(1)
        user = users[0]
        print(f"Auto-detected user: ID {user.id}, Clerk ID {user.clerk_id}")
        migrate_cache_to_database(user_id=user.id)
    elif args.user_id:
        migrate_cache_to_database(user_id=args.user_id)
    elif args.clerk_id:
        migrate_cache_to_database(clerk_id=args.clerk_id)
    else:
        print("ERROR: Please provide either --user-id, --clerk-id, or --auto")
        print("\nUsage:")
        print("  python migrate_cache_to_db.py --auto")
        print("  python migrate_cache_to_db.py --user-id 1")
        print("  python migrate_cache_to_db.py --clerk-id user_xxxxx")
        sys.exit(1)

