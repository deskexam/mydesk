import chromadb
from chromadb.config import Settings as ChromaSettings
from .config import settings
import os

_chroma_client = None
_collection = None


def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        os.makedirs(settings.chroma_persist_dir, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
        )
    return _chroma_client


def get_collection():
    global _collection
    if _collection is None:
        client = get_chroma_client()
        _collection = client.get_or_create_collection(
            name="edurag_chunks",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection
