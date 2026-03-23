from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from datetime import datetime
from bson import ObjectId

ALLOWED_TEMPLATES = {"standard", "professional", "two_column", "compact", "modern", "classic"}

class Question(BaseModel):
    type: str           # MCQ | short_answer | long_answer | Subjective | True/False
    question: str
    options: Optional[List[str]] = None  # for MCQ
    answer: Optional[str] = None
    marks: int = Field(ge=0, le=100)
    topic: Optional[str] = ""

class PaperBase(BaseModel):
    board: Literal["CBSE", "ICSE", "Maharashtra"]
    grade: Literal["10", "11", "12"]
    subject: str = Field(min_length=1, max_length=100)
    topics: Optional[List[str]] = Field(default_factory=list, max_length=20)
    total_marks: int = Field(ge=1, le=1000)
    duration_minutes: int = Field(ge=10, le=300)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    questions: Optional[List[Question]] = Field(default_factory=list)
    include_answer_key: bool = False
    institute_name: Optional[str] = Field(default=None, max_length=200)
    tutor_name: Optional[str] = Field(default=None, max_length=100)
    template: str = "standard"

    @field_validator("template")
    @classmethod
    def validate_template(cls, v):
        if v not in ALLOWED_TEMPLATES:
            return "standard"
        return v

class Paper(PaperBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class PaperCreate(PaperBase):
    # Extra fields sent by the AI generator form
    question_types: Optional[List[str]] = None
    num_mcq: Optional[int] = None
    num_short: Optional[int] = None
    num_long: Optional[int] = None
    marks_per_mcq: Optional[int] = 1
    marks_per_short: Optional[int] = 2
    marks_per_long: Optional[int] = 5

class PaperUpdate(BaseModel):
    board: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None
    topics: Optional[List[str]] = None
    total_marks: Optional[int] = None
    duration_minutes: Optional[int] = None
    difficulty: Optional[str] = None
    questions: Optional[List[Question]] = None
    include_answer_key: Optional[bool] = None
    institute_name: Optional[str] = None
    tutor_name: Optional[str] = None
    template: Optional[str] = None

class PaperOut(PaperBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }