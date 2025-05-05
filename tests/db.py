# tests/db.py
from sqlalchemy.ext.asyncio import create_async_engine
import os

DATABASE_URL = os.getenv("DATABASE_URL")
print("Attempting to connect to:", DATABASE_URL)

engine = create_async_engine(DATABASE_URL, echo=True, pool_pre_ping=True)

async def test_connection():
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))

        print("✅ Connection successful!")
    except Exception as e:
        print("❌ Connection failed:", str(e))

import asyncio
asyncio.run(test_connection())
