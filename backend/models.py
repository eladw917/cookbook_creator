"""
SQLAlchemy ORM models for the cookbook application
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, unique=True, index=True, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)  # Kept for backward compatibility
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    profile_picture_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_recipes = relationship("UserRecipe", back_populates="user", cascade="all, delete-orphan")
    books = relationship("Book", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, name={self.name})>"


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String, unique=True, index=True, nullable=False)
    video_url = Column(String, nullable=False)
    title = Column(String, nullable=False)
    channel_name = Column(String, nullable=True)
    recipe_data = Column(JSON, nullable=False)  # Full recipe structure as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_recipes = relationship("UserRecipe", back_populates="recipe", cascade="all, delete-orphan")
    book_recipes = relationship("BookRecipe", back_populates="recipe", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Recipe(id={self.id}, video_id={self.video_id}, title={self.title})>"


class UserRecipe(Base):
    __tablename__ = "user_recipes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)

    # Unique constraint to prevent duplicate user-recipe associations
    __table_args__ = (UniqueConstraint('user_id', 'recipe_id', name='unique_user_recipe'),)

    # Relationships
    user = relationship("User", back_populates="user_recipes")
    recipe = relationship("Recipe", back_populates="user_recipes")

    def __repr__(self):
        return f"<UserRecipe(user_id={self.user_id}, recipe_id={self.recipe_id})>"


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="books")
    book_recipes = relationship("BookRecipe", back_populates="book", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Book(id={self.id}, name={self.name}, user_id={self.user_id})>"


class BookRecipe(Base):
    __tablename__ = "book_recipes"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    order_index = Column(Integer, nullable=False)  # For ordering recipes in the book
    added_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    book = relationship("Book", back_populates="book_recipes")
    recipe = relationship("Recipe", back_populates="book_recipes")

    def __repr__(self):
        return f"<BookRecipe(book_id={self.book_id}, recipe_id={self.recipe_id}, order={self.order_index})>"


