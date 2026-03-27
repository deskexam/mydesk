from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    google_id: Optional[str] = None
    email_verified: bool = False
    # Plan: free | basic | pro | yearly
    plan: str = "free"
    trial_active: bool = False
    trial_end: Optional[datetime] = None
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    papers_used: int = 0
    downloads_used: int = 0
    last_reset_date: Optional[datetime] = None
    custom_logo_url: Optional[str] = None
    institute_name: Optional[str] = None
    total_papers_created: int = 0
    # Legacy fields kept for compatibility
    credits: int = 3
    subscription_status: str = "free"

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    institute_name: Optional[str] = None
    credits: Optional[int] = None
    subscription_status: Optional[str] = None
    subscription_end: Optional[datetime] = None

class UserInDB(UserBase):
    id: str
    hashed_password: str
    created_at: datetime
    updated_at: datetime

class User(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class UserOut(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
