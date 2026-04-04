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


def index_chunks(doc_id: str, chunks: List[Dict], metadata: Dict, doc_type: str = "textbook"):
    collection = get_collection()
    ids = [f"{doc_id}_chunk_{c['chunk_index']}" for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "doc_id":      doc_id,
            "board":       metadata.get("board", ""),
            "grade":       metadata.get("grade", ""),
            "subject":     metadata.get("subject", ""),
            "topics":      ",".join(metadata.get("topics", [])),
            "title":       metadata.get("title", ""),
            "chunk_index": c["chunk_index"],
            "doc_type":    doc_type,
        }
        for c in chunks
    ]
    collection.add(ids=ids, documents=documents, metadatas=metadatas)
    print(f"[RAG] Indexed {len(chunks)} chunks for doc_id={doc_id} type={doc_type}", flush=True)


def delete_doc_chunks(doc_id: str):
    collection = get_collection()
    results = collection.get(where={"doc_id": doc_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
        print(f"[RAG] Deleted {len(results['ids'])} old chunks for doc_id={doc_id}", flush=True)


def wipe_all_chunks():
    """
    Delete every chunk from ChromaDB regardless of doc_id.
    Used before a fresh migration to clear out pre-migration
    word-based chunks that have no doc_type field.
    Returns the count of deleted entries.
    """
    collection = get_collection()
    results = collection.get()
    ids = results.get("ids", [])
    if ids:
        collection.delete(ids=ids)
    print(f"[RAG] Wiped {len(ids)} total chunks from ChromaDB", flush=True)
    return len(ids)


def retrieve_chunks(
    query: str,
    board: str,
    grade: str,
    subject: str,
    topics: Optional[List[str]] = None,
    n_results: int = 6,
    include_question_papers: bool = False,
) -> List[str]:
    collection = get_collection()

    base_conditions = [
        {"board":    {"$eq": board}},
        {"grade":    {"$eq": grade}},
        {"subject":  {"$eq": subject}},
    ]
    if not include_question_papers:
        base_conditions.append({"doc_type": {"$eq": "textbook"}})

    where_filter: Dict = {"$and": base_conditions}

    try:
        total = collection.count()
        if total == 0:
            print(f"[RAG] Vector DB is empty — run migration first.", flush=True)
            return []

        actual_n = min(n_results, total)
        results = collection.query(
            query_texts=[query],
            n_results=actual_n,
            where=where_filter,
        )
        docs  = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]

        if not docs:
            print(
                f"[RAG] No chunks found for board={board} grade={grade} subject={subject}. "
                f"Migration may not have run yet for this document.",
                flush=True,
            )
            return []

        # Topic filtering
        if topics and docs:
            topic_lower = [t.lower() for t in topics]
            filtered = [
                doc for doc, meta in zip(docs, metas)
                if any(t in meta.get("topics", "").lower() for t in topic_lower)
            ]
            if len(filtered) >= min(3, len(docs)):
                print(
                    f"[RAG] Retrieved {len(filtered)} topic-filtered chunks "
                    f"(board={board} grade={grade} subject={subject})",
                    flush=True,
                )
                return filtered

        print(
            f"[RAG] Retrieved {len(docs)} chunks from vector DB "
            f"(board={board} grade={grade} subject={subject})",
            flush=True,
        )
        return docs

    except Exception as e:
        print(f"[RAG] retrieve_chunks error (board={board} grade={grade} subject={subject}): {e}", flush=True)
        return []


def retrieve_example_questions(
    board: str,
    grade: str,
    subject: str,
    topics: Optional[List[str]] = None,
    n_results: int = 4,
) -> List[str]:
    """Retrieve past exam question chunks for hard difficulty calibration."""
    collection = get_collection()

    where_filter = {"$and": [
        {"board":    {"$eq": board}},
        {"grade":    {"$eq": grade}},
        {"subject":  {"$eq": subject}},
        {"doc_type": {"$eq": "question_paper"}},
    ]}

    try:
        total = collection.count()
        if total == 0:
            return []
        actual_n = min(n_results, total)
        results = collection.query(
            query_texts=[f"{subject} {board} grade {grade} exam hard questions"],
            n_results=actual_n,
            where=where_filter,
        )
        docs = results.get("documents", [[]])[0]
        if docs:
            print(f"[RAG] Retrieved {len(docs)} past exam question chunks for hard difficulty", flush=True)
        return docs
    except Exception:
        return []
