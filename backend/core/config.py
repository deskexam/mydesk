from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # MongoDB Configuration
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017/deskexam")
    mongodb_database: str = os.getenv("MONGODB_DATABASE", "deskexam")
    mongodb_db: Optional[str] = None  # Legacy field from EduRAG
    
    # Groq AI Configuration
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    # Google Gemini AI Configuration
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Razorpay Configuration
    razorpay_key_id: str = os.getenv("RAZORPAY_KEY_ID", "")
    razorpay_key_secret: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    
    # JWT Configuration
    secret_key: str = os.getenv("SECRET_KEY", "deskexam-secret-key-change-in-production")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # CORS Configuration
    allowed_origins: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
    
    # RAG Configuration
    rag_collection_name: str = "deskexam_rag"
    rag_chunk_size: int = 1000
    rag_chunk_overlap: int = 200
    chroma_persist_dir: Optional[str] = None  # Legacy field from EduRAG
    
    # Paper Generation Configuration
    max_mcq_batch_size: int = 50
    default_difficulty: str = "medium"
    
    # File Upload Configuration
    upload_dir: str = os.getenv("UPLOAD_DIR", "uploads")
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    max_logo_size: int = 2 * 1024 * 1024   # 2MB

    # Admin secret for protected endpoints (e.g. migration)
    admin_secret: str = os.getenv("ADMIN_SECRET", "")

    # Plan limits: (papers_per_period, downloads_per_period, max_grade, trial_days)
    # free: lifetime totals | basic/pro/yearly: per anniversary period
    PLAN_LIMITS: dict = {
        "free":   {"papers": 5,    "downloads": 3,   "max_grade": 10, "label": "Free"},
        "basic":  {"papers": 50,   "downloads": 25,  "max_grade": 12, "label": "Basic"},
        "pro":    {"papers": 100,  "downloads": 50,  "max_grade": 12, "label": "Pro"},
        "yearly": {"papers": 1000, "downloads": 500, "max_grade": 12, "label": "Yearly"},
    }
    TRIAL_DAYS: int = 15
    
    # Available Models (comma-separated string)
    available_models_str: str = "llama-3.3-70b-versatile,llama-3.1-8b-instant,mixtral-8x7b-32768,gemma2-9b-it"
    
    @property
    def AVAILABLE_MODELS(self) -> List[str]:
        """Parse available models from comma-separated string"""
        return [model.strip() for model in self.available_models_str.split(",") if model.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields in .env file

settings = Settings()