"""
RAG Migration Endpoint — v2.0
POST /api/admin/migrate-rag

Migrates all documents from old word-based chunking (v1) to the new
sentence-boundary / question-level chunking strategy (v2).

Features:
- Idempotent: skips documents already at indexing_version 2.0
- Dry-run mode: reports what would happen without touching the DB
- Per-doc sleep (2s) + batch sleep (60s) to avoid rate limit 429s
- Chunk-loss protection: if re-indexing fails after delete, doc is
  flagged as 'needs_reupload' and tracked separately
- Per-document error isolation: one bad PDF never stops the whole run
- Background task: returns 202 immediately, logs progress to console
- Admin-secret protected
"""

import os
import time
import asyncio
import threading
from datetime import datetime
from fastapi import APIRouter, Header, HTTPException, BackgroundTasks, Query
from bson import ObjectId

from core.database import get_db
from core.config import settings
from services.pdf_service import extract_text_chunks
from services.rag_service import index_chunks, delete_doc_chunks

router = APIRouter(prefix="/api/admin", tags=["admin-migration"])

INDEXING_VERSION = 2.0
BATCH_SIZE       = 5    # docs per batch before the long sleep
BATCH_SLEEP_SEC  = 60   # seconds to sleep between batches (quota reset)
DOC_SLEEP_SEC    = 3    # seconds to sleep between individual docs

# ── In-memory migration state (reset on server restart) ──────────────────────
_migration_state = {
    "running":       False,
    "started_at":    None,
    "total":         0,
    "processed":     0,
    "skipped":       0,
    "failed":        0,
    "needs_reupload": [],   # list of {doc_id, title, reason} — lost chunks
    "log":           [],    # capped at 200 lines
}


def _log(msg: str):
    ts = datetime.utcnow().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    _migration_state["log"].append(line)
    if len(_migration_state["log"]) > 200:
        _migration_state["log"].pop(0)


def _run_migration(dry_run: bool):
    """Blocking migration — runs inside a background thread."""

    async def _async_run():
        db = get_db()

        # Reset state
        _migration_state.update({
            "running": True,
            "started_at": datetime.utcnow().isoformat(),
            "total": 0,
            "processed": 0,
            "skipped": 0,
            "failed": 0,
            "needs_reupload": [],
            "log": [],
        })

        # Only target docs NOT yet at v2
        query = {
            "$or": [
                {"indexing_version": {"$exists": False}},
                {"indexing_version": {"$lt": INDEXING_VERSION}},
            ]
        }
        docs = await db.documents.find(query).to_list(length=None)
        total = len(docs)
        _migration_state["total"] = total
        _log(f"{'[DRY RUN] ' if dry_run else ''}Found {total} document(s) to migrate.")

        for i, doc in enumerate(docs):
            doc_id   = str(doc["_id"])
            filename = doc.get("filename", "")
            title    = doc.get("title", filename)
            path     = os.path.join(settings.upload_dir, filename)
            position = f"({i + 1}/{total})"

            # ── Missing file on disk ──────────────────────────────────────
            if not os.path.exists(path):
                _log(f"  ✗ SKIP — file missing on disk {position}: '{title}'")
                _migration_state["skipped"] += 1
                _migration_state["needs_reupload"].append({
                    "doc_id": doc_id,
                    "title":  title,
                    "reason": "PDF file not found on disk — must be re-uploaded by admin",
                })
                # Persist flag to MongoDB so it survives restarts
                await db.documents.update_one(
                    {"_id": ObjectId(doc_id)},
                    {"$set": {"needs_reupload": True, "reupload_reason": "PDF file missing on disk"}},
                )
                continue

            # ── Extract + classify + chunk ────────────────────────────────
            try:
                result = extract_text_chunks(filename)
                chunks, doc_type = result
            except Exception as exc:
                _log(f"  ✗ FAILED — could not read PDF {position}: '{title}' — {exc}")
                _migration_state["failed"] += 1
                _migration_state["needs_reupload"].append({
                    "doc_id": doc_id,
                    "title":  title,
                    "reason": f"PDF could not be read: {exc}",
                })
                await db.documents.update_one(
                    {"_id": ObjectId(doc_id)},
                    {"$set": {"needs_reupload": True, "reupload_reason": f"PDF unreadable: {exc}"}},
                )
                continue

            _log(
                f"  {'[DRY RUN] Would process' if dry_run else 'Processing'} "
                f"{position}: '{title}' → {len(chunks)} chunks, type={doc_type}"
            )

            if dry_run:
                _migration_state["processed"] += 1
                time.sleep(DOC_SLEEP_SEC)
                continue

            # ── Delete old ChromaDB chunks ────────────────────────────────
            # After this point the doc has NO chunks — we must re-index.
            chunks_deleted = False
            try:
                delete_doc_chunks(doc_id)
                chunks_deleted = True
            except Exception as exc:
                _log(f"    ⚠ Could not delete old chunks for '{title}': {exc} — skipping to avoid data loss")
                _migration_state["failed"] += 1
                continue

            # ── Re-index with new strategy ────────────────────────────────
            try:
                metadata = {
                    "board":   doc.get("board", ""),
                    "grade":   doc.get("grade", ""),
                    "subject": doc.get("subject", ""),
                    "topics":  doc.get("topics", []),
                    "title":   title,
                }
                index_chunks(
                    doc_id=doc_id,
                    chunks=chunks,
                    metadata=metadata,
                    doc_type=doc_type,
                )

                # Mark as fully migrated
                await db.documents.update_one(
                    {"_id": ObjectId(doc_id)},
                    {"$set": {
                        "indexing_version": INDEXING_VERSION,
                        "doc_type":         doc_type,
                        "chunk_count":      len(chunks),
                        "migrated_at":      datetime.utcnow(),
                        "needs_reupload":   False,   # clear any old flag
                    }},
                )
                _migration_state["processed"] += 1
                _log(f"    ✓ Done: '{title}'")

            except Exception as exc:
                # Chunks were deleted but re-indexing failed — doc now has NO chunks.
                # Flag it immediately so admin knows it needs re-uploading.
                _log(f"  ✗ CRITICAL — re-index failed for '{title}': {exc}")
                _log(f"    ⚠ '{title}' now has NO chunks in ChromaDB — must be re-uploaded!")
                _migration_state["failed"] += 1
                _migration_state["needs_reupload"].append({
                    "doc_id": doc_id,
                    "title":  title,
                    "reason": f"Chunks were deleted but re-indexing failed: {exc}",
                })
                await db.documents.update_one(
                    {"_id": ObjectId(doc_id)},
                    {"$set": {
                        "needs_reupload":  True,
                        "reupload_reason": f"Re-indexing failed after chunk deletion: {exc}",
                        "chunk_count":     0,
                    }},
                )

            # ── Per-doc sleep to avoid rate limit 429s ────────────────────
            time.sleep(DOC_SLEEP_SEC)

            # ── Batch sleep every BATCH_SIZE docs ────────────────────────
            if (i + 1) % BATCH_SIZE == 0 and (i + 1) < total:
                _log(f"  ⏸  {i + 1}/{total} done. Waiting {BATCH_SLEEP_SEC}s before next batch...")
                time.sleep(BATCH_SLEEP_SEC)

        # ── Final summary ─────────────────────────────────────────────────
        needs = _migration_state["needs_reupload"]
        _log(
            f"{'[DRY RUN] ' if dry_run else ''}Migration complete — "
            f"processed={_migration_state['processed']}, "
            f"skipped={_migration_state['skipped']}, "
            f"failed={_migration_state['failed']}, "
            f"needs_reupload={len(needs)}"
        )
        if needs:
            _log("  Documents that need re-uploading:")
            for item in needs:
                _log(f"    • '{item['title']}' — {item['reason']}")

        _migration_state["running"] = False

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_async_run())
    finally:
        loop.close()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/migrate-rag", status_code=202)
async def start_migration(
    background_tasks: BackgroundTasks,
    dry_run: bool = Query(False, description="Preview only — no changes made"),
    x_admin_secret: str = Header(..., alias="x-admin-secret"),
):
    """
    Trigger the RAG v2 migration.

    Headers: x-admin-secret: <ADMIN_SECRET>
    Query:   ?dry_run=true  (preview without changes)

    Returns 202 immediately. Watch PM2 logs for progress.
    """
    if not settings.admin_secret or x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret.")

    if _migration_state["running"]:
        raise HTTPException(
            status_code=409,
            detail="Migration already running. Check /api/admin/migrate-rag/status.",
        )

    thread = threading.Thread(target=_run_migration, args=(dry_run,), daemon=True)
    thread.start()

    return {
        "message":    f"{'Dry-run' if dry_run else 'Migration'} started in background.",
        "status_url": "/api/admin/migrate-rag/status",
        "note":       "Watch PM2 logs for real-time progress.",
    }


@router.get("/migrate-rag/status")
async def migration_status(
    x_admin_secret: str = Header(..., alias="x-admin-secret"),
):
    """Current progress + list of documents that need re-uploading."""
    if not settings.admin_secret or x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret.")

    return {
        "running":        _migration_state["running"],
        "started_at":     _migration_state["started_at"],
        "total":          _migration_state["total"],
        "processed":      _migration_state["processed"],
        "skipped":        _migration_state["skipped"],
        "failed":         _migration_state["failed"],
        "needs_reupload": _migration_state["needs_reupload"],
        "log":            _migration_state["log"][-50:],
    }


@router.get("/migrate-rag/needs-reupload")
async def list_needs_reupload(
    x_admin_secret: str = Header(..., alias="x-admin-secret"),
):
    """
    Returns all documents (from MongoDB) that are flagged needs_reupload=True.
    Persisted across server restarts — safe to call anytime.
    """
    if not settings.admin_secret or x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret.")

    db = get_db()
    cursor = db.documents.find({"needs_reupload": True}, {
        "title": 1, "board": 1, "grade": 1,
        "subject": 1, "filename": 1, "reupload_reason": 1,
    })
    docs = await cursor.to_list(length=None)
    result = []
    for doc in docs:
        result.append({
            "doc_id":          str(doc["_id"]),
            "title":           doc.get("title", ""),
            "board":           doc.get("board", ""),
            "grade":           doc.get("grade", ""),
            "subject":         doc.get("subject", ""),
            "filename":        doc.get("filename", ""),
            "reupload_reason": doc.get("reupload_reason", "Unknown"),
        })

    return {
        "count":     len(result),
        "documents": result,
    }
