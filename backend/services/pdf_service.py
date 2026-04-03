import os
import re
import uuid
import asyncio
import pdfplumber
from typing import List, Dict, Tuple
from core.config import settings


def _write_file_sync(path: str, data: bytes):
    with open(path, "wb") as f:
        f.write(data)


async def save_upload(file_bytes: bytes, filename: str) -> str:
    """Save uploaded file without blocking the async event loop."""
    os.makedirs(settings.upload_dir, exist_ok=True)
    safe_name = os.path.basename(filename).replace(" ", "_")
    unique_name = f"{uuid.uuid4()}_{safe_name}"
    path = os.path.join(settings.upload_dir, unique_name)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _write_file_sync, path, file_bytes)
    return unique_name


# ─── Document type detection ──────────────────────────────────────────────────

# Patterns that strongly indicate a question paper
_QP_PATTERNS = [
    r'^\s*(?:Q\.?\s*)?\d+[.)]\s+\S',           # Q1. or 1. or 1) at line start
    r'^\s*\(?\s*[A-Da-d]\s*[.)]\s+\S',          # (A) or A) option lines
    r'(?i)section\s+[A-Z]\b',                    # Section A / Section B
    r'(?i)(?:total\s+)?marks?\s*[:–-]?\s*\d+',  # Marks: 80
    r'(?i)time\s+(?:allowed|limit|duration)',     # Time Allowed:
    r'(?i)answer\s+(?:all|any)\s+\d+',           # Answer all 5 / Answer any 3
    r'(?i)roll\s+no',                             # Roll No.
]
_QP_COMPILED = [re.compile(p, re.MULTILINE) for p in _QP_PATTERNS]


def detect_doc_type(text: str) -> str:
    """Return 'question_paper' or 'textbook' based on heuristic pattern matching."""
    sample = text[:4000]  # Only scan top of document — headers reveal type fast
    hits = sum(1 for pat in _QP_COMPILED if pat.search(sample))
    return "question_paper" if hits >= 3 else "textbook"


# ─── Textbook chunker ─────────────────────────────────────────────────────────
# Strategy: sentence-boundary aware with paragraph respect.
# Never cuts mid-sentence. Respects \n\n paragraph breaks.
# Target: ~350 words per chunk, min 40, overlap: carry last 2 sentences forward.

_SENT_END = re.compile(r'(?<=[.!?])\s+(?=[A-Z\(\"\'])')

def _split_sentences(text: str) -> List[str]:
    parts = _SENT_END.split(text)
    return [p.strip() for p in parts if p.strip()]


def _chunk_textbook(full_text: str, target_words: int = 350, min_words: int = 40) -> List[Dict]:
    paragraphs = [p.strip() for p in re.split(r'\n{2,}', full_text) if p.strip()]
    chunks: List[Dict] = []
    current_sentences: List[str] = []
    current_words = 0
    overlap_carry: List[str] = []   # last 2 sentences of previous chunk

    def flush(carry: List[str]) -> List[str]:
        """Emit current buffer as a chunk; return last 2 sentences as carry."""
        text_out = " ".join(current_sentences)
        if len(text_out.split()) >= min_words:
            chunks.append({"chunk_index": len(chunks), "text": text_out})
        return current_sentences[-2:] if len(current_sentences) >= 2 else current_sentences[:]

    for para in paragraphs:
        sentences = _split_sentences(para)
        for sent in sentences:
            word_count = len(sent.split())
            if current_words + word_count > target_words and current_words >= min_words:
                overlap_carry = flush(overlap_carry)
                # Restart with carry-over sentences for context continuity
                current_sentences = list(overlap_carry) + [sent]
                current_words = sum(len(s.split()) for s in current_sentences)
            else:
                current_sentences.append(sent)
                current_words += word_count

        # Paragraph boundary — soft flush if buffer is large enough
        if current_words >= target_words:
            overlap_carry = flush(overlap_carry)
            current_sentences = list(overlap_carry)
            current_words = sum(len(s.split()) for s in current_sentences)

    # Flush remaining
    if current_sentences:
        text_out = " ".join(current_sentences)
        if len(text_out.split()) >= min_words:
            chunks.append({"chunk_index": len(chunks), "text": text_out})

    return chunks


# ─── Question paper chunker ───────────────────────────────────────────────────
# Strategy: detect numbered question boundaries, keep each question +
# its options + any sub-parts as a single atomic chunk.

# Matches: "1.", "1)", "Q1.", "Q.1", "(i)", "i." at line start
_Q_BOUNDARY = re.compile(
    r'(?m)^(?:Q\.?\s*)?(?:\d+|[ivxIVX]{1,4})[.)]\s+',
)

def _chunk_question_paper(full_text: str, min_words: int = 10) -> List[Dict]:
    lines = full_text.split('\n')
    chunks: List[Dict] = []
    current_lines: List[str] = []

    def flush():
        text_out = " ".join(" ".join(current_lines).split())  # normalise whitespace
        if len(text_out.split()) >= min_words:
            chunks.append({"chunk_index": len(chunks), "text": text_out})

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if _Q_BOUNDARY.match(stripped) and current_lines:
            flush()
            current_lines = [stripped]
        else:
            current_lines.append(stripped)

    if current_lines:
        flush()

    return chunks


# ─── Public API ───────────────────────────────────────────────────────────────

def extract_text_chunks(
    filename: str,
    chunk_size: int = 800,   # kept for backwards compat but unused
    overlap: int = 100,
) -> Tuple[List[Dict], str]:
    """
    Extract and chunk text from a PDF.

    Returns:
        (chunks, doc_type) where doc_type is 'textbook' or 'question_paper'.

    Raises HTTPException 422 on unreadable or image-only PDFs.
    """
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
            detail="This PDF is not supported here. Please upload a text-based PDF (e.g. textbook chapters or curriculum documents).",
        )

    if not full_text.strip():
        try:
            os.remove(path)
        except OSError:
            pass
        raise HTTPException(
            status_code=422,
            detail="This PDF is not supported here — no readable text was found. Only text-based PDFs are accepted, not scanned images or generated papers.",
        )

    doc_type = detect_doc_type(full_text)

    if doc_type == "question_paper":
        chunks = _chunk_question_paper(full_text)
    else:
        chunks = _chunk_textbook(full_text)

    return chunks, doc_type
