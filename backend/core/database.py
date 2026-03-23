from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from typing import AsyncGenerator

client: AsyncIOMotorClient = None
db = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_url)
    # Use mongodb_db if it exists (legacy EduRAG), otherwise use mongodb_database
    db_name = settings.mongodb_db or settings.mongodb_database
    db = client[db_name]
    print(f"[DB] Connected to MongoDB: {db_name}")

async def close_db():
    global client
    if client:
        client.close()
        print("[DB] Disconnected from MongoDB")

def get_db():
    """Get database instance for sync operations"""
    global db
    return db

async def get_async_db() -> AsyncGenerator:
    """Get database instance for async operations"""
    global db
    yield db