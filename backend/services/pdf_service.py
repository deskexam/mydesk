import os
import uuid
import asyncio
import pdfplumber
from typing import List, Dict
from core.config import settings


def _write_file_sync(path: str, data: bytes):
    with open(path, "wb") as f:
        f.write(data)


async def save_upload(file_bytes: bytes, filename: str) -> str:
    """Save uploaded file without blocking the async event loop."""
    os.makedirs(settings.upload_dir, exist_ok=True)
    # Sanitize filename — strip path components
    safe_name = os.path.basename(filename).replace(" ", "_")
    unique_name = f"{uuid.uuid4()}_{safe_name}"
    path = os.path.join(settings.upload_dir, unique_name)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _write_file_sync, path, file_bytes)
    return unique_name


def extract_text_chunks(filename: str, chunk_size: int = 800, overlap: int = 100) -> List[Dict]:
    from fastapi import HTTPException
    path = os.path.join(settings.upload_dir, filename)
    full_text = ""

    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
    except Exception:
        try:
            os.remove(path)
        except OSError:
            pass
        raise HTTPException(
            status_code=422,
            detail="This PDF could not be read. It may be corrupted or in an unsupported format. Please try a different PDF file."
        )

    if not full_text.strip():
        try:
            os.remove(path)
        except OSError:
            pass
        raise HTTPException(
            status_code=422,
            detail="No readable text was found in this PDF. Please upload a PDF that contains selectable text (not a scanned image)."
        )

    words = full_text.split()
    chunks = []
    i = 0
    chunk_index = 0

    while i < len(words):
        chunk_words = words[i: i + chunk_size]
        chunk_text = " ".join(chunk_words)
        chunks.append({
            "chunk_index": chunk_index,
            "text": chunk_text,
        })
        i += chunk_size - overlap
        chunk_index += 1

    return chunks
