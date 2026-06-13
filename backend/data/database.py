"""
database.py — Database configuration and connection manager for Synthetic Nation.
"""

from __future__ import annotations

import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# SQLite database file located inside backend/data/
DB_PATH = os.path.join(os.path.dirname(__file__), "synthetic_nation.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite in multithreaded envs
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def init_db() -> None:
    """Initialize the database tables if they do not exist."""
    # Ensure directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency injection helper to yield database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
