"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

# Use Railway volume if available, otherwise local directory
BASE_DIR = os.getenv("RAILWAY_VOLUME_MOUNT_PATH", ".")

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