"""
Database Configuration
配置異步 SQLAlchemy 引擎與 Session Factory
"""
import os
from typing import AsyncGenerator
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from models import Base

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:P%40ssw0rd@localhost:5432/self_corner"
)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)


engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("ENV", "development") == "development",
    future=True,
    pool_pre_ping=True,
    poolclass=NullPool if os.getenv("TESTING") else None,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI 依賴注入用的資料庫 session"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """初始化資料庫（建立所有資料表）"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[INFO] Database tables created successfully!")


async def close_db():
    """關閉資料庫連線"""
    await engine.dispose()
    print("[INFO] Database connections closed.")
