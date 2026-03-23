from groq import Groq
from typing import List, Dict, Optional
from core.chroma_client import get_collection
from core.config import settings

_groq_client = None


def get_client():
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=settings.groq_api_key)
    return _groq_client


def index_chunks(doc_id: str, chunks: List[Dict], metadata: Dict):
    collection = get_collection()
    ids = [f"{doc_id}_chunk_{c['chunk_index']}" for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "doc_id": doc_id,
            "board": metadata.get("board", ""),
            "grade": metadata.get("grade", ""),
            "subject": metadata.get("subject", ""),
            "topics": ",".join(metadata.get("topics", [])),
            "title": metadata.get("title", ""),
            "chunk_index": c["chunk_index"],
        }
        for c in chunks
    ]
    collection.add(ids=ids, documents=documents, metadatas=metadatas)


def delete_doc_chunks(doc_id: str):
    collection = get_collection()
    results = collection.get(where={"doc_id": doc_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])


def retrieve_chunks(
    query: str,
    board: str,
    grade: str,
    subject: str,
    topics: Optional[List[str]] = None,
    n_results: int = 12,
) -> List[str]:
    collection = get_collection()

    where_filter: Dict = {
        "$and": [
            {"board": {"$eq": board}},
            {"grade": {"$eq": grade}},
            {"subject": {"$eq": subject}},
        ]
    }

    try:
        total = collection.count()
        if total == 0:
            return []
        actual_n = min(n_results, total)
        results = collection.query(
            query_texts=[query],
            n_results=actual_n,
            where=where_filter,
        )
        docs = results.get("documents", [[]])[0]

        if topics:
            topic_lower = [t.lower() for t in topics]
            filtered = []
            for doc, meta in zip(docs, results.get("metadatas", [[]])[0]):
                doc_topics = meta.get("topics", "").lower()
                if any(t in doc_topics for t in topic_lower):
                    filtered.append(doc)
            if filtered:
                return filtered

        return docs
    except Exception as e:
        print(f"[RAG] retrieve_chunks error (board={board}, grade={grade}, subject={subject}): {e}", flush=True)
        return []
