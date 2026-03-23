from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from datetime import datetime, timedelta, timezone
import os
from core.database import get_db
from core.security import hash_password, verify_password, create_access_token, get_current_user
from models.user import UserCreate
from pydantic import BaseModel, EmailStr
import secrets

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC, consistent with Motor


# ── Request body schemas ──────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    new_password: str

class GoogleAuthRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr


# ── Helpers ───────────────────────────────────────────────────────────────────

def format_user(user: dict) -> dict:
    """Return a consistent user dict for API responses."""
    return {
        "id": str(user["_id"]),
        "full_name": user.get("full_name", user.get("name", "")),
        "email": user["email"],
        "role": user.get("role", "user"),
        "email_verified": user.get("email_verified", False),
        "google_id": user.get("google_id"),
        "credits": user.get("credits", 3),
        "subscription_status": user.get("subscription_status", "free"),
        "subscription_end": user.get("subscription_end").isoformat()
            if isinstance(user.get("subscription_end"), datetime) else user.get("subscription_end"),
        "total_papers_created": user.get("total_papers_created", 0),
        "created_at": user["created_at"].isoformat()
            if isinstance(user.get("created_at"), datetime) else str(user.get("created_at", "")),
        "updated_at": user["updated_at"].isoformat()
            if isinstance(user.get("updated_at"), datetime) else str(user.get("updated_at", "")),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(payload: UserCreate):
    db = get_db()
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    admin_email = os.getenv("FIRST_ADMIN_EMAIL", "").strip().lower()
    user_count = await db.users.count_documents({})
    role = "admin" if (user_count == 0 and (not admin_email or payload.email.lower() == admin_email)) else "user"
    now = _now()

    user_doc = {
        "full_name": payload.full_name,
        "name": payload.full_name,
        "email": payload.email,
        "password": hash_password(payload.password),
        "role": role,
        "email_verified": False,
        "email_verification_token": secrets.token_urlsafe(32),
        "google_id": None,
        "credits": 3,
        "subscription_status": "free",
        "subscription_end": None,
        "total_papers_created": 0,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return format_user(user_doc)


@router.post("/login")
async def login(payload: LoginRequest):
    db = get_db()
    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="No account found with this email")
    if not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect password")

    token = create_access_token({"sub": str(user["_id"]), "role": user.get("role", "user")})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": format_user(user),
    }


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return format_user(current_user)


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}


@router.get("/verify-email/{token}")
async def verify_email(token: str):
    db = get_db()
    user = await db.users.find_one({"email_verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"email_verified": True, "email_verification_token": None,
                  "updated_at": _now()}}
    )
    return {"message": "Email verified successfully"}


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    db = get_db()
    user = await db.users.find_one({"email": payload.email})
    if not user:
        return {"message": "If this email exists, a reset link has been sent"}

    reset_token = secrets.token_urlsafe(32)
    reset_expires = _now() + timedelta(hours=1)
    now = _now()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": reset_token, "reset_expires": reset_expires,
                  "updated_at": now}}
    )
    background_tasks.add_task(send_reset_email, payload.email, reset_token)
    return {"message": "If this email exists, a reset link has been sent"}


@router.post("/reset-password/{token}")
async def reset_password(token: str, payload: ResetPasswordRequest):
    db = get_db()
    user = await db.users.find_one(
        {"reset_token": token, "reset_expires": {"$gt": _now()}}
    )
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hash_password(payload.new_password),
                  "reset_token": None, "reset_expires": None,
                  "updated_at": _now()}}
    )
    return {"message": "Password reset successfully"}


@router.post("/google")
async def google_auth():
    raise HTTPException(status_code=501, detail="Google OAuth not implemented yet")


@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest, background_tasks: BackgroundTasks):
    db = get_db()
    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")

    verification_token = secrets.token_urlsafe(32)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"email_verification_token": verification_token,
                  "updated_at": _now()}}
    )
    background_tasks.add_task(send_verification_email, payload.email, verification_token)
    return {"message": "Verification email sent"}


# ── Email placeholders ────────────────────────────────────────────────────────

async def send_reset_email(email: str, token: str):
    print(f"[EMAIL] Password reset link for {email}: /auth?reset={token}")


async def send_verification_email(email: str, token: str):
    print(f"[EMAIL] Verification link for {email}: /auth?verify={token}")
