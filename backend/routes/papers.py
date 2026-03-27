from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from core.database import get_async_db
from core.security import get_current_user
from models.paper import PaperCreate, PaperUpdate, PaperOut, Question
from services.paper_generator import generate_paper, flatten_questions, verify_and_clean_paper
from services.pdf_export import generate_pdf
from services.rag_service import get_client
from core.config import settings
from core.plan_enforcement import enforce_and_reset, check_paper_limit, check_download_limit, check_grade_access

router = APIRouter()

@router.post("/generate", response_model=PaperOut)
async def generate_paper_endpoint(
    paper_request: PaperCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_async_db)
):
    """Generate a new exam paper using AI and RAG"""
    try:
        # Enforce plan limits
        sync_db = __import__('core.database', fromlist=['get_db']).get_db()
        full_user = await sync_db.users.find_one({"_id": current_user["_id"]})
        full_user = await enforce_and_reset(full_user, sync_db)
        check_grade_access(full_user, str(paper_request.grade))
        check_paper_limit(full_user)

        # Generate paper using EduRAG's paper generator
        question_types = paper_request.question_types or ["MCQ", "short_answer", "long_answer"]
        paper_data = generate_paper(
            board=paper_request.board,
            grade=paper_request.grade,
            subject=paper_request.subject,
            topics=paper_request.topics or [],
            total_marks=paper_request.total_marks,
            duration_minutes=paper_request.duration_minutes,
            question_types=question_types,
            difficulty=paper_request.difficulty,
            include_answer_key=paper_request.include_answer_key,
            model=None,
            num_mcq=paper_request.num_mcq,
            num_short=paper_request.num_short,
            num_long=paper_request.num_long,
            marks_per_mcq=paper_request.marks_per_mcq or 1,
            marks_per_short=paper_request.marks_per_short or 2,
            marks_per_long=paper_request.marks_per_long or 5,
        )

        # AI quality check — remove duplicates, fix/remove bad questions
        active_model = paper_request.__dict__.get("model") or settings.groq_model
        paper_data = verify_and_clean_paper(paper_data, active_model)

        # Convert to MongoDB format
        paper_doc = {
            "board": paper_request.board,
            "grade": paper_request.grade,
            "subject": paper_request.subject,
            "topics": paper_request.topics,
            "total_marks": paper_request.total_marks,
            "duration_minutes": paper_request.duration_minutes,
            "difficulty": paper_request.difficulty,
            "include_answer_key": paper_request.include_answer_key,
            "questions": flatten_questions(paper_data),
            "sections": paper_data.get("sections", []),
            "institute_name": paper_request.institute_name,
            "tutor_name": paper_request.tutor_name,
            "template": paper_request.template,
            "created_by": str(current_user["_id"]),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        # Save to MongoDB
        result = await db.papers.insert_one(paper_doc)
        paper_doc["id"] = str(result.inserted_id)
        paper_doc.pop("_id", None)

        # Increment usage counters
        await sync_db.users.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"papers_used": 1, "total_papers_created": 1}}
        )

        return paper_doc

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def list_papers(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_async_db)
):
    """List papers for the current user"""
    papers = []
    async for paper in db.papers.find({"created_by": str(current_user["_id"])}).sort("updated_at", -1).skip(skip).limit(limit):
        paper["id"] = str(paper.pop("_id"))
        papers.append(paper)
    return papers

def _validate_object_id(paper_id: str):
    """Return ObjectId or raise 400 instead of crashing with 500."""
    try:
        return ObjectId(paper_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid paper ID format")


@router.get("/{paper_id}")
async def get_paper(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_async_db)
):
    """Get a specific paper"""
    oid = _validate_object_id(paper_id)
    paper = await db.papers.find_one({"_id": oid, "created_by": str(current_user["_id"])})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    paper["id"] = str(paper.pop("_id"))
    return paper

@router.put("/{paper_id}")
async def update_paper(
    paper_id: str,
    paper_update: PaperUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_async_db)
):
    """Update a paper"""
    oid = _validate_object_id(paper_id)
    update_data = paper_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    result = await db.papers.update_one(
        {"_id": oid, "created_by": str(current_user["_id"])},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Paper not found or not authorized")

    updated_paper = await db.papers.find_one({"_id": oid})
    updated_paper["id"] = str(updated_paper.pop("_id"))
    return updated_paper

@router.delete("/{paper_id}")
async def delete_paper(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_async_db)
):
    """Delete a paper"""
    oid = _validate_object_id(paper_id)
    result = await db.papers.delete_one({"_id": oid, "created_by": str(current_user["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paper not found or not authorized")
    return {"message": "Paper deleted successfully"}

ALLOWED_TEMPLATES = {"standard", "professional", "two_column", "compact", "modern", "classic"}

@router.get("/{paper_id}/download")
async def download_paper(
    paper_id: str,
    answer_key: bool = False,
    template: str = "standard",
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_async_db)
):
    """Download paper as PDF — enforces plan download limit"""
    if template not in ALLOWED_TEMPLATES:
        template = "standard"

    sync_db = __import__('core.database', fromlist=['get_db']).get_db()
    full_user = await sync_db.users.find_one({"_id": current_user["_id"]})
    full_user = await enforce_and_reset(full_user, sync_db)
    check_download_limit(full_user)

    oid = _validate_object_id(paper_id)
    paper = await db.papers.find_one({"_id": oid, "created_by": str(current_user["_id"])})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Increment download counter
    await sync_db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"downloads_used": 1}}
    )

    pdf_content = generate_pdf(paper, include_answer_key=answer_key, template=template)

    from fastapi.responses import Response
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=paper_{paper_id}.pdf"}
    )


# Additional routes for frontend compatibility
@router.post("/")
async def create_paper(paper_data: dict, current_user: dict = Depends(get_current_user), db: AsyncIOMotorClient = Depends(get_async_db)):
    """Create a paper (for frontend compatibility)"""
    # Strip any fields the client must not control
    for key in ("_id", "created_by", "created_at"):
        paper_data.pop(key, None)
    paper_data["created_by"] = str(current_user["_id"])
    paper_data["created_at"] = datetime.utcnow()
    paper_data["updated_at"] = datetime.utcnow()

    result = await db.papers.insert_one(paper_data)
    paper_data["id"] = str(result.inserted_id)
    paper_data.pop("_id", None)
    return paper_data


@router.patch("/{paper_id}")
async def update_paper_patch(paper_id: str, update_data: dict, current_user: dict = Depends(get_current_user), db: AsyncIOMotorClient = Depends(get_async_db)):
    """Update a paper (for frontend compatibility)"""
    oid = _validate_object_id(paper_id)
    # Strip fields that must never be overwritten via PATCH
    for key in ("_id", "created_by", "created_at"):
        update_data.pop(key, None)
    update_data["updated_at"] = datetime.utcnow()

    result = await db.papers.update_one(
        {"_id": oid, "created_by": str(current_user["_id"])},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Paper not found or not authorized")

    updated_paper = await db.papers.find_one({"_id": oid})
    updated_paper["id"] = str(updated_paper.pop("_id"))
    return updated_paper
