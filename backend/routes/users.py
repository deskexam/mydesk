from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from datetime import datetime, timedelta
from pydantic import BaseModel
from core.database import get_db
from core.security import get_current_user
from core.config import settings
from core.plan_enforcement import enforce_and_reset, get_usage_stats, get_effective_plan
from models.user import UserUpdate
import os, uuid

class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str

class SubscribeRequest(BaseModel):
    plan: str

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": current_user["_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user = await enforce_and_reset(user, db)
    stats = get_usage_stats(user)

    return {
        "id": str(user["_id"]),
        "full_name": user.get("full_name") or user.get("name", ""),
        "name": user.get("full_name") or user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "created_at": user.get("created_at"),
        "email_verified": user.get("email_verified", False),
        "institute_name": user.get("institute_name", ""),
        "custom_logo_url": user.get("custom_logo_url"),
        # Plan info
        "plan": stats["plan"],
        "trial_active": stats["trial_active"],
        "subscription_end": user.get("subscription_end"),
        "papers_used": stats["papers_used"],
        "papers_limit": stats["papers_limit"],
        "papers_remaining": stats["papers_remaining"],
        "downloads_used": stats["downloads_used"],
        "downloads_limit": stats["downloads_limit"],
        "downloads_remaining": stats["downloads_remaining"],
        "days_until_expiry": stats["days_until_expiry"],
        "show_upgrade_banner": stats["show_upgrade_banner"],
        "total_papers_created": user.get("total_papers_created", 0),
        # Legacy
        "subscription_status": user.get("subscription_status", "free"),
        "credits": user.get("credits", 3),
    }


@router.put("/profile")
async def update_profile(payload: UserUpdate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No changes made")
    update_data["updated_at"] = datetime.utcnow()
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_data})
    return {"message": "Profile updated successfully"}


@router.put("/password")
async def update_password(payload: PasswordUpdate, current_user: dict = Depends(get_current_user)):
    from core.security import verify_password, hash_password
    db = get_db()
    user = await db.users.find_one({"_id": current_user["_id"]})
    if not user.get("password"):
        raise HTTPException(status_code=400, detail="This account uses Google login — no password set")
    if not verify_password(payload.old_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": hash_password(payload.new_password), "updated_at": datetime.utcnow()}}
    )
    return {"message": "Password updated successfully"}


@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload institute logo — Pro and Yearly plans only. Max 2MB, PNG/JPG."""
    db = get_db()
    user = await db.users.find_one({"_id": current_user["_id"]})
    user = await enforce_and_reset(user, db)
    plan = get_effective_plan(user)

    if plan not in ("pro", "yearly"):
        raise HTTPException(
            status_code=403,
            detail="Custom logo upload is available on Pro and Yearly plans only."
        )

    # Validate file type
    allowed_types = {"image/png", "image/jpeg", "image/jpg"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PNG and JPG files are allowed.")

    # Validate file size
    contents = await file.read()
    if len(contents) > settings.max_logo_size:
        raise HTTPException(status_code=400, detail="Logo must be under 2MB.")

    # Save file
    logos_dir = os.path.join(settings.upload_dir, "logos")
    os.makedirs(logos_dir, exist_ok=True)
    ext = "png" if file.content_type == "image/png" else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(logos_dir, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    logo_url = f"/uploads/logos/{filename}"
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"custom_logo_url": logo_url, "updated_at": datetime.utcnow()}}
    )
    return {"logo_url": logo_url, "message": "Logo uploaded successfully"}


@router.get("/transactions")
async def get_transactions(current_user: dict = Depends(get_current_user)):
    db = get_db()
    transactions = []
    async for t in db.transactions.find({"user_id": current_user["_id"]}).sort("created_at", -1):
        transactions.append({
            "id": str(t["_id"]),
            "type": t["type"],
            "amount": t["amount"],
            "description": t.get("description", ""),
            "created_at": t["created_at"].isoformat() if hasattr(t["created_at"], "isoformat") else str(t["created_at"]),
        })
    return transactions


@router.post("/increment-papers")
async def increment_paper_count(current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"total_papers_created": 1, "papers_used": 1}}
    )
    return {"message": "Paper count incremented"}
