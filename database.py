from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import pool
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL=os.getenv("DATABASE_URL") 


print("DB URL before engine creation:", DATABASE_URL)
engine = create_async_engine(DATABASE_URL, echo=True, pool_pre_ping=True,
                             pool_size=10, max_overflow=20, connect_args={"statement_cache_size": 0})

AsyncsessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False)


async def get_db():
    async with AsyncsessionLocal() as session:
        yield session