"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

# Use volume path from Railway or Fly.io, otherwise local directory
# Railway uses RAILWAY_VOLUME_MOUNT_PATH, Fly.io uses DATABASE_PATH
BASE_DIR = os.getenv("RAILWAY_VOLUME_MOUNT_PATH") or os.getenv("DATABASE_PATH", ".").rsplit("/", 1)[0] if "/" in os.getenv("DATABASE_PATH", ".") else "."

# Get database URL from environment or use SQLite in volume
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/cookbook.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.
    Use with FastAPI Depends().
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    from models import User, Recipe, UserRecipe, Book, BookRecipe
    Base.metadata.create_all(bind=engine)
    print("DEBUG: Database tables created successfully")