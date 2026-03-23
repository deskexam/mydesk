from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timedelta
from pydantic import BaseModel
from core.database import get_db
from core.security import get_current_user
from models.user import UserUpdate

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
    
    return {
        "id": str(user["_id"]),
        "name": user.get("name") or user.get("full_name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "created_at": user.get("created_at"),
        "email_verified": user.get("email_verified", False),
        "subscription_status": user.get("subscription_status", "free"),
        "subscription_end": user.get("subscription_end"),
        "total_papers_created": user.get("total_papers_created", 0),
        "institute_name": user.get("institute_name", ""),
        "credits": user.get("credits", 3),
    }


@router.put("/profile")
async def update_profile(payload: UserUpdate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    
    result = await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="No changes made")
    
    return {"message": "Profile updated successfully"}


@router.put("/password")
async def update_password(payload: PasswordUpdate, current_user: dict = Depends(get_current_user)):
    from core.security import verify_password, hash_password
    old_password = payload.old_password
    new_password = payload.new_password

    db = get_db()
    user = await db.users.find_one({"_id": current_user["_id"]})

    if not verify_password(old_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": hash_password(new_password)}}
    )
    
    return {"message": "Password updated successfully"}


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


@router.post("/subscribe")
async def subscribe(payload: SubscribeRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    plan = payload.plan

    if plan not in ["monthly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid plan")

    subscription_end = datetime.utcnow() + (timedelta(days=365) if plan == "yearly" else timedelta(days=30))
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "subscription_status": plan,
            "subscription_end": subscription_end,
            "credits": 1000 if plan == "yearly" else 100
        }}
    )
    
    # Create transaction record
    await db.transactions.insert_one({
        "user_id": current_user["_id"],
        "type": "subscription",
        "amount": 2000 if plan == "yearly" else 200,
        "description": f"{plan.capitalize()} subscription",
        "created_at": datetime.utcnow()
    })
    
    return {"message": "Subscription activated successfully"}


@router.post("/increment-papers")
async def increment_paper_count(current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"total_papers_created": 1}}
    )
    return {"message": "Paper count incremented"}


@router.post("/decrement-credits")
async def decrement_credit(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": current_user["_id"]})
    
    if user.get("subscription_status") in ["monthly", "yearly"]:
        # Subscribed users have unlimited downloads
        return {"message": "Subscribed user - no credit deduction"}
    
    credits = user.get("credits", 0)
    if credits <= 0:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"credits": -1}}
    )
    
    return {"message": "Credit deducted successfully", "remaining_credits": credits - 1}