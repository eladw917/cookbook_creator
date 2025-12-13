"""
CRUD operations for users, recipes, and books
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime
import models


# ==================== User Operations ====================

def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    """Get user by ID"""
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_clerk_id(db: Session, clerk_id: str) -> Optional[models.User]:
    """Get user by Clerk ID"""
    return db.query(models.User).filter(models.User.clerk_id == clerk_id).first()


# ==================== Recipe Operations ====================

def get_recipe_by_id(db: Session, recipe_id: int) -> Optional[models.Recipe]:
    """Get recipe by ID"""
    return db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()


def get_recipe_by_video_id(db: Session, video_id: str) -> Optional[models.Recipe]:
    """Get recipe by YouTube video ID"""
    return db.query(models.Recipe).filter(models.Recipe.video_id == video_id).first()


def create_recipe(
    db: Session,
    video_id: str,
    video_url: str,
    title: str,
    recipe_data: dict,
    channel_name: Optional[str] = None
) -> models.Recipe:
    """
    Create a new recipe
    
    Args:
        db: Database session
        video_id: YouTube video ID
        video_url: Full YouTube URL
        title: Recipe title
        recipe_data: Full recipe structure as dictionary
        channel_name: Optional channel name
        
    Returns:
        Created recipe instance
    """
    recipe = models.Recipe(
        video_id=video_id,
        video_url=video_url,
        title=title,
        channel_name=channel_name,
        recipe_data=recipe_data
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    print(f"DEBUG: Created new recipe: {title} (video_id: {video_id})")
    return recipe


def get_or_create_recipe(
    db: Session,
    video_id: str,
    video_url: str,
    title: str,
    recipe_data: dict,
    channel_name: Optional[str] = None
) -> tuple[models.Recipe, bool]:
    """
    Get existing recipe or create new one
    
    Args:
        db: Database session
        video_id: YouTube video ID
        video_url: Full YouTube URL
        title: Recipe title
        recipe_data: Full recipe structure as dictionary
        channel_name: Optional channel name
        
    Returns:
        Tuple of (recipe, created) where created is True if new recipe was created
    """
    recipe = get_recipe_by_video_id(db, video_id)
    if recipe:
        return recipe, False
    
    recipe = create_recipe(db, video_id, video_url, title, recipe_data, channel_name)
    return recipe, True


# ==================== User Recipe Operations ====================

def get_user_recipes(db: Session, user_id: int) -> List[models.Recipe]:
    """
    Get all recipes for a user
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        List of Recipe instances
    """
    user_recipes = db.query(models.UserRecipe).filter(
        models.UserRecipe.user_id == user_id
    ).all()
    
    return [ur.recipe for ur in user_recipes]


def add_recipe_to_user(db: Session, user_id: int, recipe_id: int) -> models.UserRecipe:
    """
    Associate a recipe with a user
    
    Args:
        db: Database session
        user_id: User ID
        recipe_id: Recipe ID
        
    Returns:
        UserRecipe instance
        
    Raises:
        ValueError: If association already exists
    """
    # Check if association already exists
    existing = db.query(models.UserRecipe).filter(
        and_(
            models.UserRecipe.user_id == user_id,
            models.UserRecipe.recipe_id == recipe_id
        )
    ).first()
    
    if existing:
        raise ValueError("Recipe already added to user's collection")
    
    user_recipe = models.UserRecipe(user_id=user_id, recipe_id=recipe_id)
    db.add(user_recipe)
    db.commit()
    db.refresh(user_recipe)
    
    print(f"DEBUG: Added recipe {recipe_id} to user {user_id}")
    return user_recipe


def remove_recipe_from_user(db: Session, user_id: int, recipe_id: int) -> bool:
    """
    Remove recipe association from user
    
    Args:
        db: Database session
        user_id: User ID
        recipe_id: Recipe ID
        
    Returns:
        True if removed, False if not found
    """
    user_recipe = db.query(models.UserRecipe).filter(
        and_(
            models.UserRecipe.user_id == user_id,
            models.UserRecipe.recipe_id == recipe_id
        )
    ).first()
    
    if not user_recipe:
        return False
    
    db.delete(user_recipe)
    db.commit()
    print(f"DEBUG: Removed recipe {recipe_id} from user {user_id}")
    return True


def user_has_recipe(db: Session, user_id: int, recipe_id: int) -> bool:
    """Check if user has a specific recipe"""
    return db.query(models.UserRecipe).filter(
        and_(
            models.UserRecipe.user_id == user_id,
            models.UserRecipe.recipe_id == recipe_id
        )
    ).first() is not None


# ==================== Book Operations ====================

def get_book_by_id(db: Session, book_id: int) -> Optional[models.Book]:
    """Get book by ID"""
    return db.query(models.Book).filter(models.Book.id == book_id).first()


def get_user_books(db: Session, user_id: int) -> List[models.Book]:
    """Get all books for a user"""
    return db.query(models.Book).filter(models.Book.user_id == user_id).all()


def create_book(
    db: Session,
    user_id: int,
    name: str,
    recipe_ids: List[int]
) -> models.Book:
    """
    Create a new book with recipes
    
    Args:
        db: Database session
        user_id: User ID
        name: Book name
        recipe_ids: List of recipe IDs to include (must be 5-20)
        
    Returns:
        Created book instance
        
    Raises:
        ValueError: If recipe count is invalid or recipes don't belong to user
    """
    # Validate recipe count
    if len(recipe_ids) < 5:
        raise ValueError("Book must contain at least 5 recipes")
    if len(recipe_ids) > 20:
        raise ValueError("Book cannot contain more than 20 recipes")
    
    # Verify all recipes belong to the user
    for recipe_id in recipe_ids:
        if not user_has_recipe(db, user_id, recipe_id):
            raise ValueError(f"Recipe {recipe_id} not found in user's collection")
    
    # Create book
    book = models.Book(user_id=user_id, name=name)
    db.add(book)
    db.flush()  # Get book ID without committing
    
    # Add recipes to book with order
    for index, recipe_id in enumerate(recipe_ids):
        book_recipe = models.BookRecipe(
            book_id=book.id,
            recipe_id=recipe_id,
            order_index=index
        )
        db.add(book_recipe)
    
    db.commit()
    db.refresh(book)
    
    print(f"DEBUG: Created book '{name}' with {len(recipe_ids)} recipes for user {user_id}")
    return book


def get_book_recipes(db: Session, book_id: int) -> List[models.Recipe]:
    """
    Get all recipes in a book, ordered by order_index
    
    Args:
        db: Database session
        book_id: Book ID
        
    Returns:
        List of Recipe instances in order
    """
    book_recipes = db.query(models.BookRecipe).filter(
        models.BookRecipe.book_id == book_id
    ).order_by(models.BookRecipe.order_index).all()
    
    return [br.recipe for br in book_recipes]


def delete_book(db: Session, book_id: int, user_id: int) -> bool:
    """
    Delete a book (only if it belongs to the user)
    
    Args:
        db: Database session
        book_id: Book ID
        user_id: User ID (for authorization)
        
    Returns:
        True if deleted, False if not found or unauthorized
    """
    book = db.query(models.Book).filter(
        and_(
            models.Book.id == book_id,
            models.Book.user_id == user_id
        )
    ).first()
    
    if not book:
        return False
    
    db.delete(book)
    db.commit()
    print(f"DEBUG: Deleted book {book_id} for user {user_id}")
    return True


def get_book_with_recipes(db: Session, book_id: int) -> Optional[dict]:
    """
    Get book with all its recipes
    
    Args:
        db: Database session
        book_id: Book ID
        
    Returns:
        Dictionary with book info and recipes, or None if not found
    """
    book = get_book_by_id(db, book_id)
    if not book:
        return None
    
    recipes = get_book_recipes(db, book_id)
    
    return {
        "id": book.id,
        "name": book.name,
        "user_id": book.user_id,
        "created_at": book.created_at,
        "updated_at": book.updated_at,
        "recipe_count": len(recipes),
        "recipes": [
            {
                "id": recipe.id,
                "video_id": recipe.video_id,
                "video_url": recipe.video_url,
                "title": recipe.title,
                "channel_name": recipe.channel_name,
                "recipe_data": recipe.recipe_data
            }
            for recipe in recipes
        ]
    }


