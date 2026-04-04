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

# Predefined curriculum — shown even if no documents are uploaded for that board/grade.
# subjects/topics are always available for paper generation using AI knowledge.
CURRICULUM: dict = {
    "CBSE": {
        grades: {
            "Mathematics": [], "Science": [], "English": [],
            "Social Science": [], "Hindi": [],
        }
        for grades in [str(g) for g in range(1, 13)]
    },
    "ICSE": {
        **{
            str(g): {
                "Mathematics": [], "English": [], "Hindi": [],
                "History & Civics": [], "Geography": [],
            }
            for g in range(1, 8)
        },
        **{
            str(g): {
                "Mathematics": [], "Physics": [], "Chemistry": [], "English": [],
            }
            for g in range(8, 11)
        },
        "11": {
            "Mathematics": [], "Physics": [], "Chemistry": [],
            "Biology": [], "English": [], "Economics": [], "Commerce": [],
        },
        "12": {
            "Mathematics": [], "Physics": [], "Chemistry": [],
            "Biology": [], "English": [], "Economics": [], "Commerce": [],
        },
    },
    "State Board": {
        str(g): {
            "Mathematics": [], "Science": [], "English": [],
            "Social Studies": [], "Hindi": [],
        }
        for g in range(1, 13)
    },
}


def _curriculum_boards() -> List[str]:
    return sorted(CURRICULUM.keys())


def _curriculum_grades(board: Optional[str]) -> List[str]:
    if board and board in CURRICULUM:
        return sorted(CURRICULUM[board].keys(), key=lambda x: int(x) if x.isdigit() else x)
    grades = set()
    for b in CURRICULUM.values():
        grades.update(b.keys())
    return sorted(grades, key=lambda x: int(x) if x.isdigit() else x)


def _curriculum_subjects(board: Optional[str], grade: Optional[str]) -> List[str]:
    subjects: set = set()
    boards = [board] if board and board in CURRICULUM else list(CURRICULUM.keys())
    for b in boards:
        if grade and grade in CURRICULUM[b]:
            subjects.update(CURRICULUM[b][grade].keys())
        elif not grade:
            for g_data in CURRICULUM[b].values():
                subjects.update(g_data.keys())
    return sorted(subjects)


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
    result_tuple = await loop.run_in_executor(None, extract_text_chunks, filename)
    if not result_tuple or not result_tuple[0]:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")
    chunks, doc_type = result_tuple

    db = get_db()
    doc = {
        "board": board,
        "grade": grade,
        "subject": subject,
        "topics": topics_list,
        "title": title,
        "filename": filename,
        "chunk_count": len(chunks),
        "doc_type": doc_type,
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
        doc_type=doc_type,
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


@router.put("/{doc_id}", status_code=200)
async def update_document(
    doc_id: str,
    board: str = Form(...),
    grade: str = Form(...),
    subject: str = Form(...),
    topics: str = Form(...),
    title: str = Form(...),
    file: Optional[UploadFile] = File(None),  # optional — if provided, replace the PDF
    admin: dict = Depends(require_admin),
):
    db = get_db()
    existing = await db.documents.find_one({"_id": ObjectId(doc_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")

    topics_list: List[str] = json.loads(topics)
    loop = asyncio.get_event_loop()
    update = {
        "board": board, "grade": grade, "subject": subject,
        "topics": topics_list, "title": title,
        "updated_at": datetime.utcnow(),
    }

    if file and file.filename:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        file_bytes = await file.read()
        filename = await save_upload(file_bytes, file.filename)
        result_tuple = await loop.run_in_executor(None, extract_text_chunks, filename)
        if not result_tuple or not result_tuple[0]:
            raise HTTPException(status_code=422, detail="Could not extract text from PDF")
        chunks, doc_type = result_tuple
        # Remove old chunks from vector store and re-index
        delete_doc_chunks(doc_id)
        await loop.run_in_executor(None, partial(
            index_chunks,
            doc_id=doc_id,
            chunks=chunks,
            metadata={"board": board, "grade": grade, "subject": subject, "topics": topics_list, "title": title},
            doc_type=doc_type,
        ))
        update["filename"] = filename
        update["chunk_count"] = len(chunks)
        update["doc_type"] = doc_type
    else:
        # No new file — re-index with updated metadata, preserve existing doc_type
        doc_type = existing.get("doc_type", "textbook")
        delete_doc_chunks(doc_id)
        existing_result = await loop.run_in_executor(None, extract_text_chunks, existing["filename"])
        existing_chunks = existing_result[0] if existing_result else []
        await loop.run_in_executor(None, partial(
            index_chunks,
            doc_id=doc_id,
            chunks=existing_chunks,
            metadata={"board": board, "grade": grade, "subject": subject, "topics": topics_list, "title": title},
            doc_type=doc_type,
        ))

    await db.documents.update_one({"_id": ObjectId(doc_id)}, {"$set": update})
    return {"message": "Document updated successfully"}


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
    db_boards = await db.documents.distinct("board")
    merged = sorted(set(db_boards) | set(_curriculum_boards()))
    return merged


@router.get("/meta/grades")
async def get_grades(board: Optional[str] = None, _: dict = Depends(get_current_user)):
    db = get_db()
    query = {}
    if board:
        query["board"] = board
    db_grades = await db.documents.distinct("grade", query)
    merged = sorted(
        set(db_grades) | set(_curriculum_grades(board)),
        key=lambda x: int(x) if x.isdigit() else x,
    )
    return merged


@router.get("/meta/subjects")
async def get_subjects(board: Optional[str] = None, grade: Optional[str] = None, _: dict = Depends(get_current_user)):
    db = get_db()
    query = {}
    if board:
        query["board"] = board
    if grade:
        query["grade"] = grade
    db_subjects = await db.documents.distinct("subject", query)
    merged = sorted(set(db_subjects) | set(_curriculum_subjects(board, grade)))
    return merged


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
