from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class DocumentBase(BaseModel):
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    content_type: str
    board: str
    grade: str
    subject: str
    topics: List[str]
    title: str
    uploaded_by: str
    chunk_count: int = 0

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    topics: Optional[List[str]] = None
    board: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None

class Document(DocumentBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }