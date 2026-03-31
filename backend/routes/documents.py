from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import json
import asyncio
from functools import partial
from core.database import get_db
from core.security import require_admin, get_current_user
from services.pdf_service import save_upload, extract_text_chunks
from services.rag_service import index_chunks, delete_doc_chunks

router = APIRouter(prefix="/api/documents", tags=["documents"])


def serialize_doc(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    board: str = Form(...),
    grade: str = Form(...),
    subject: str = Form(...),
    topics: str = Form(...),        # JSON array string
    title: str = Form(...),
    admin: dict = Depends(require_admin),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    topics_list: List[str] = json.loads(topics)
    file_bytes = await file.read()
    filename = await save_upload(file_bytes, file.filename)

    loop = asyncio.get_event_loop()
    chunks = await loop.run_in_executor(None, extract_text_chunks, filename)
    if not chunks:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    db = get_db()
    doc = {
        "board": board,
        "grade": grade,
        "subject": subject,
        "topics": topics_list,
        "title": title,
        "filename": filename,
        "chunk_count": len(chunks),
        "uploaded_by": str(admin["_id"]),
        "created_at": datetime.utcnow(),
    }
    result = await db.documents.insert_one(doc)
    doc_id = str(result.inserted_id)

    await loop.run_in_executor(None, partial(
        index_chunks,
        doc_id=doc_id,
        chunks=chunks,
        metadata={"board": board, "grade": grade, "subject": subject, "topics": topics_list, "title": title},
    ))

    doc["id"] = doc_id
    return {"message": "Document uploaded and indexed successfully", "doc_id": doc_id, "chunks": len(chunks)}


@router.get("/")
async def list_documents(
    board: Optional[str] = None,
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    _: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if board:
        query["board"] = board
    if grade:
        query["grade"] = grade
    if subject:
        query["subject"] = subject

    cursor = db.documents.find(query).sort("created_at", -1)
    docs = []
    async for doc in cursor:
        docs.append(serialize_doc(doc))
    return docs


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: str, admin: dict = Depends(require_admin)):
    db = get_db()
    doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    delete_doc_chunks(doc_id)
    await db.documents.delete_one({"_id": ObjectId(doc_id)})


@router.get("/meta/boards")
async def get_boards(_: dict = Depends(get_current_user)):
    db = get_db()
    boards = await db.documents.distinct("board")
    return sorted(boards)


@router.get("/meta/grades")
async def get_grades(board: Optional[str] = None, _: dict = Depends(get_current_user)):
    db = get_db()
    query = {}
    if board:
        query["board"] = board
    grades = await db.documents.distinct("grade", query)
    return sorted(grades, key=lambda x: int(x) if x.isdigit() else x)


@router.get("/meta/subjects")
async def get_subjects(board: Optional[str] = None, grade: Optional[str] = None, _: dict = Depends(get_current_user)):
    db = get_db()
    query = {}
    if board:
        query["board"] = board
    if grade:
        query["grade"] = grade
    subjects = await db.documents.distinct("subject", query)
    return subjects


@router.get("/meta/topics")
async def get_topics(board: Optional[str] = None, grade: Optional[str] = None, subject: Optional[str] = None, _: dict = Depends(get_current_user)):
    db = get_db()
    query = {}
    if board:
        query["board"] = board
    if grade:
        query["grade"] = grade
    if subject:
        query["subject"] = subject

    cursor = db.documents.find(query, {"topics": 1})
    all_topics = set()
    async for doc in cursor:
        all_topics.update(doc.get("topics", []))
    return sorted(list(all_topics))
