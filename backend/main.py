from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import traceback
from motor.motor_asyncio import AsyncIOMotorClient
from core.database import connect_db, close_db, get_db
from core.config import settings
from core.responses import SafeJSONResponse
from routes import auth, documents, papers, users, pdf_tools, payment
from services.rag_service import get_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(
    title="DeskExam RAG API",
    description="AI-powered exam paper generator with RAG integration",
    version="1.0.0",
    lifespan=lifespan,
    default_response_class=SafeJSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log full trace to server console only — never send to client
    trace = traceback.format_exc()
    print(f"[ERROR] {request.method} {request.url.path} → {type(exc).__name__}: {exc}\n{trace}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )

app.include_router(auth.router)                                         # prefix="/api/auth" set in auth.py
app.include_router(documents.router)                                    # prefix="/api/documents" set in documents.py
app.include_router(papers.router, prefix="/api/papers", tags=["papers"])
app.include_router(users.router)                                        # prefix="/api/users" set in users.py
app.include_router(pdf_tools.router)                                    # prefix="/api/pdf-tools" set in pdf_tools.py
app.include_router(payment.router)                                      # prefix="/api/payment" set in payment.py

@app.get("/")
async def root():
    return {"message": "DeskExam RAG API is running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/models")
async def list_models():
    return {"models": settings.AVAILABLE_MODELS}

@app.get("/ping-db")
async def ping_db():
    """Tests MongoDB connection and returns all papers."""
    db = get_db()
    if db is None:
        return {"status": "error", "detail": "DB not connected"}
    count = await db.papers.count_documents({})
    papers_list = []
    async for p in db.papers.find({}, {"questions": 0, "sections": 0}):
        p["id"] = str(p.pop("_id"))
        papers_list.append(p)
    return {"status": "ok", "papers_in_db": count, "papers": papers_list}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)