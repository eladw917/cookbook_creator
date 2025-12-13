"""
Interactive database explorer script
Run this to explore and interact with your SQLite database
"""
from database import SessionLocal, init_db
from models import User, Recipe, UserRecipe, Book, BookRecipe
from crud import *
import sys


def print_separator():
    print("\n" + "="*60 + "\n")


def show_menu():
    print("\n" + "="*60)
    print("DATABASE EXPLORER - Choose an option:")
    print("="*60)
    print("1. View all users")
    print("2. View all recipes")
    print("3. View all books")
    print("4. View recipes for a user")
    print("5. View recipes in a book")
    print("6. Get user statistics")
    print("7. Search recipes by title")
    print("8. View database statistics")
    print("9. Exit")
    print("="*60)


def view_all_users(db):
    """Display all users"""
    users = db.query(User).all()
    if not users:
        print("No users found.")
        return
    
    print(f"\nFound {len(users)} user(s):\n")
    print("Note: User display info (email, name) is stored in Clerk, not in the database.")
    print(f"{'ID':<5} {'Clerk ID':<40} {'Created At':<20}")
    print("-" * 70)
    for user in users:
        clerk_id = user.clerk_id[:37] + "..." if user.clerk_id and len(user.clerk_id) > 40 else (user.clerk_id or "N/A")
        created = user.created_at.strftime("%Y-%m-%d %H:%M") if user.created_at else "N/A"
        print(f"{user.id:<5} {clerk_id:<40} {created:<20}")


def view_all_recipes(db):
    """Display all recipes"""
    recipes = db.query(Recipe).all()
    if not recipes:
        print("No recipes found.")
        return
    
    print(f"\nFound {len(recipes)} recipe(s):\n")
    print(f"{'ID':<5} {'Title':<40} {'Video ID':<15}")
    print("-" * 65)
    for recipe in recipes:
        title = recipe.title[:37] + "..." if len(recipe.title) > 40 else recipe.title
        print(f"{recipe.id:<5} {title:<40} {recipe.video_id:<15}")


def view_all_books(db):
    """Display all books"""
    books = db.query(Book).all()
    if not books:
        print("No books found.")
        return
    
    print(f"\nFound {len(books)} book(s):\n")
    print(f"{'ID':<5} {'Name':<30} {'User ID':<10} {'Recipes':<10}")
    print("-" * 60)
    for book in books:
        recipe_count = len(book.book_recipes)
        print(f"{book.id:<5} {book.name:<30} {book.user_id:<10} {recipe_count:<10}")


def view_user_recipes(db):
    """Display recipes for a specific user"""
    user_id = input("\nEnter user ID: ")
    try:
        user_id = int(user_id)
    except ValueError:
        print("Invalid user ID.")
        return
    
    user = get_user_by_id(db, user_id)
    if not user:
        print(f"User with ID {user_id} not found.")
        return
    
    recipes = get_user_recipes(db, user_id)
    if not recipes:
        print(f"\nUser ID {user_id} has no saved recipes.")
        return
    
    print(f"\nRecipes saved by user ID {user_id} ({len(recipes)} total):\n")
    print(f"{'ID':<5} {'Title':<40} {'Video ID':<15}")
    print("-" * 65)
    for recipe in recipes:
        title = recipe.title[:37] + "..." if len(recipe.title) > 40 else recipe.title
        print(f"{recipe.id:<5} {title:<40} {recipe.video_id:<15}")


def view_book_recipes(db):
    """Display recipes in a specific book"""
    book_id = input("\nEnter book ID: ")
    try:
        book_id = int(book_id)
    except ValueError:
        print("Invalid book ID.")
        return
    
    book = get_book_by_id(db, book_id)
    if not book:
        print(f"Book with ID {book_id} not found.")
        return
    
    recipes = get_book_recipes(db, book_id)
    if not recipes:
        print(f"\nBook '{book.name}' has no recipes.")
        return
    
    print(f"\nRecipes in '{book.name}' ({len(recipes)} total):\n")
    print(f"{'Order':<8} {'ID':<5} {'Title':<40}")
    print("-" * 60)
    for idx, recipe in enumerate(recipes):
        title = recipe.title[:37] + "..." if len(recipe.title) > 40 else recipe.title
        print(f"{idx:<8} {recipe.id:<5} {title:<40}")


def view_user_stats(db):
    """Display statistics for a user"""
    user_id = input("\nEnter user ID: ")
    try:
        user_id = int(user_id)
    except ValueError:
        print("Invalid user ID.")
        return
    
    user = get_user_by_id(db, user_id)
    if not user:
        print(f"User with ID {user_id} not found.")
        return
    
    recipes = get_user_recipes(db, user_id)
    books = get_user_books(db, user_id)
    
    print(f"\nStatistics for user ID {user_id} (Clerk ID: {user.clerk_id}):")
    print("-" * 60)
    print(f"Total saved recipes: {len(recipes)}")
    print(f"Total books created: {len(books)}")
    print(f"Account created: {user.created_at}")
    print(f"Last updated: {user.updated_at}")
    print("\nNote: User display info (email, name, profile picture) is stored in Clerk.")


def search_recipes(db):
    """Search recipes by title"""
    search_term = input("\nEnter search term: ").strip()
    if not search_term:
        print("Search term cannot be empty.")
        return
    
    recipes = db.query(Recipe).filter(
        Recipe.title.ilike(f"%{search_term}%")
    ).all()
    
    if not recipes:
        print(f"No recipes found matching '{search_term}'.")
        return
    
    print(f"\nFound {len(recipes)} recipe(s) matching '{search_term}':\n")
    print(f"{'ID':<5} {'Title':<40} {'Video ID':<15}")
    print("-" * 65)
    for recipe in recipes:
        title = recipe.title[:37] + "..." if len(recipe.title) > 40 else recipe.title
        print(f"{recipe.id:<5} {title:<40} {recipe.video_id:<15}")


def view_db_stats(db):
    """Display overall database statistics"""
    user_count = db.query(User).count()
    recipe_count = db.query(Recipe).count()
    book_count = db.query(Book).count()
    user_recipe_count = db.query(UserRecipe).count()
    book_recipe_count = db.query(BookRecipe).count()
    
    print("\nDatabase Statistics:")
    print("-" * 60)
    print(f"Total users: {user_count}")
    print(f"Total recipes: {recipe_count}")
    print(f"Total books: {book_count}")
    print(f"User-recipe associations: {user_recipe_count}")
    print(f"Book-recipe associations: {book_recipe_count}")
    
    # Average recipes per user
    if user_count > 0:
        avg_recipes = user_recipe_count / user_count
        print(f"Average recipes per user: {avg_recipes:.2f}")
    
    # Average recipes per book
    if book_count > 0:
        avg_book_recipes = book_recipe_count / book_count
        print(f"Average recipes per book: {avg_book_recipes:.2f}")


def main():
    """Main interactive loop"""
    print("\n" + "="*60)
    print("SQLite Database Explorer")
    print("="*60)
    print("\nInitializing database connection...")
    
    # Initialize database (creates tables if they don't exist)
    init_db()
    
    # Create database session
    db = SessionLocal()
    
    try:
        while True:
            show_menu()
            choice = input("\nEnter your choice (1-9): ").strip()
            
            print_separator()
            
            if choice == "1":
                view_all_users(db)
            elif choice == "2":
                view_all_recipes(db)
            elif choice == "3":
                view_all_books(db)
            elif choice == "4":
                view_user_recipes(db)
            elif choice == "5":
                view_book_recipes(db)
            elif choice == "6":
                view_user_stats(db)
            elif choice == "7":
                search_recipes(db)
            elif choice == "8":
                view_db_stats(db)
            elif choice == "9":
                print("Goodbye!")
                break
            else:
                print("Invalid choice. Please enter a number between 1-9.")
            
            input("\nPress Enter to continue...")
    
    except KeyboardInterrupt:
        print("\n\nExiting...")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        print("Database connection closed.")


if __name__ == "__main__":
    main()
