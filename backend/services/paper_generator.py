import json
import re
from typing import List, Optional, Dict
from core.config import settings
from services.rag_service import retrieve_chunks, retrieve_example_questions, get_client
from groq import RateLimitError as GroqRateLimitError

MCQ_BATCH_SIZE = 25  # MCQ questions per LLM call
MCQ_MODEL = "llama-3.1-8b-instant"  # 500k TPD — used for all MCQ batches to save 70b quota
FALLBACK_MODEL = "llama-3.1-8b-instant"  # automatic fallback when primary model hits TPD limit


def _groq_create(client, model: str, messages: list, max_tokens: int, timeout: int = 90):
    """Call Groq with automatic fallback to FALLBACK_MODEL on rate limit (429)."""
    try:
        return client.chat.completions.create(
            model=model, max_tokens=max_tokens, messages=messages, timeout=timeout,
        )
    except GroqRateLimitError:
        if model == FALLBACK_MODEL:
            raise
        print(f"[GROQ] Rate limit on {model} — retrying with {FALLBACK_MODEL}", flush=True)
        return client.chat.completions.create(
            model=FALLBACK_MODEL, max_tokens=max_tokens, messages=messages, timeout=timeout,
        )

DIFFICULTY_INSTRUCTIONS = {
    "easy": (
        "Bloom's Level: Remember & Understand. "
        "Questions must test direct recall, definitions, labelling, and one-step computations. "
        "Avoid multi-step reasoning. Suitable for students who have just read the chapter once."
    ),
    "medium": (
        "Bloom's Level: Apply & Analyse. "
        "Questions must require applying concepts to solve problems (2–3 steps), interpreting data, "
        "or explaining cause-and-effect. Do NOT include pure recall or definition questions."
    ),
    "hard": (
        "Bloom's Level: Analyse, Evaluate & Create. "
        "EVERY question must be genuinely challenging. Requirements:\n"
        "  • MCQ: options must be very close and plausible — at least 2 options should look correct to an unprepared student. Include tricky exceptions, edge-cases, or misconception-based distractors.\n"
        "  • Short/Long answer: require multi-step reasoning, derivations, proof-based arguments, unfamiliar applications, or synthesis of two or more concepts.\n"
        "  • STRICTLY FORBIDDEN: do not include any question that tests plain recall, simple definitions, or one-step computation.\n"
        "  • Questions should challenge students who already know the topic well."
    ),
}

DIFFICULTY_SYSTEM_ROLE = {
    "easy":   "You are setting a basic revision test for students who have just studied this chapter for the first time.",
    "medium": "You are setting an application-level class test. Students know the theory; they must now apply it.",
    "hard":   "You are setting a HARD exam to challenge top-scoring students. Every question must be difficult, analytical, and thought-provoking. If any question feels too easy, replace it.",
}

TYPE_MAP = {
    "multiple_choice": "MCQ", "multiple choice": "MCQ", "mcq": "MCQ",
    "short answer": "short_answer", "short-answer": "short_answer",
    "long answer": "long_answer", "long-answer": "long_answer", "essay": "long_answer",
}


def _compute_counts(total_marks: int, question_types: list, per_q: Dict[str, int]) -> dict:
    """Distribute total_marks across question types using per_q mark weights."""
    ordered = [qt for qt in ["long_answer", "short_answer", "MCQ"] if qt in question_types]
    counts = {}
    remaining = total_marks
    for i, qt in enumerate(ordered):
        if i == len(ordered) - 1:
            count = max(1, remaining // per_q[qt])
        else:
            share = remaining // (len(ordered) - i)
            count = max(1, share // per_q[qt])
        counts[qt] = count
        remaining = max(0, remaining - count * per_q[qt])
    return counts


def _enforce_marks(paper: dict, per_q: Dict[str, int]):
    """Set each question's marks to the user-specified value for its type."""
    for section in paper.get("sections", []):
        qt = section.get("type")
        if qt in per_q:
            for q in section.get("questions", []):
                q["marks"] = per_q[qt]


def _build_mcq_batch_prompt(
    board: str, grade: str, subject: str, topics: Optional[List[str]],
    difficulty: str, count: int, marks_per_mcq: int,
    context_chunks: List[str], include_answer_key: bool,
    start_num: int = 1, used_questions: Optional[List[dict]] = None,
) -> str:
    context = "\n\n---\n\n".join(c[:400] for c in context_chunks) if context_chunks else "Use your knowledge of the syllabus."
    topics_str = ", ".join(topics) if topics else "all topics in the syllabus"

    avoid_note = ""
    if used_questions:
        sample = used_questions[-15:]
        avoid_note = (
            "\n\nDO NOT REPEAT OR REPHRASE any of these already-generated questions:\n"
            + "\n".join(f"- {q['question']}" for q in sample)
        )

    answer_field = '"answer": "A. correct_option",' if include_answer_key else ""
    answer_instruction = (
        'Include the "answer" field set to the full text of the correct option.'
        if include_answer_key else 'Do NOT include an "answer" field.'
    )

    system_role = DIFFICULTY_SYSTEM_ROLE.get(difficulty, "You are an expert exam paper setter.")
    diff_detail = DIFFICULTY_INSTRUCTIONS.get(difficulty, '')

    return f"""{system_role}
You are setting a {board} Board, Grade {grade}, Subject: {subject} exam paper.

TASK: Generate exactly {count} unique MCQ questions numbered from {start_num} to {start_num + count - 1}.

Topics: {topics_str}
Difficulty Level: {difficulty.upper()}
{diff_detail}

SYLLABUS CONTEXT (all questions must be based on this material):
{context}
{avoid_note}

REQUIREMENTS:
1. Exactly {count} questions, numbered starting at {start_num}.
2. Each question must have exactly 4 options: ["A. ...", "B. ...", "C. ...", "D. ..."]
3. Each MCQ is worth {marks_per_mcq} mark(s).
4. Generate ORIGINAL questions — not copied from standard textbooks or past papers.
5. Each question must cover a DIFFERENT concept — no topic repetition.
6. Base every question strictly on the syllabus context above.
7. STRICTLY FOLLOW the difficulty level requirements above — this is mandatory.
8. {answer_instruction}
9. MATH FORMATTING (MANDATORY): Wrap ALL mathematical expressions in LaTeX delimiters:
   - Inline math: $x^2$, $\\frac{{a}}{{b}}$, $\\sqrt{{x}}$, $\\int_a^b f(x)\\,dx$, $\\frac{{dy}}{{dx}}$, $\\alpha$, $\\sin(\\theta)$
   - Display/block equations: $$\\int_0^\\infty e^{{-x^2}}\\,dx$$
   - NEVER write math as plain text — always use $...$ around every expression, symbol, or formula.

OUTPUT: strict JSON array only, no markdown, no extra text:
[
  {{
    "number": {start_num},
    "question": "Question text here?",
    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
    "marks": {marks_per_mcq},
    "topic": "topic name"
    {(',' + chr(10) + '    ' + answer_field) if answer_field else ''}
  }}
]"""


def build_prompt(
    board: str, grade: str, subject: str, topics: Optional[List[str]],
    total_marks: int, duration_minutes: int, question_types: List[str],
    difficulty: str, context_chunks: List[str], include_answer_key: bool,
    counts: Dict[str, int], per_q_marks: Dict[str, int],
) -> str:
    context = "\n\n---\n\n".join(c[:400] for c in context_chunks) if context_chunks else "Use your knowledge of the syllabus."
    topics_str = ", ".join(topics) if topics else "all topics in the syllabus"

    label_map = {"MCQ": "MCQ", "short_answer": "short answer", "long_answer": "long answer"}
    type_desc = {
        "MCQ": f"Multiple choice questions with 4 options (A, B, C, D). Each MCQ is worth {per_q_marks['MCQ']} mark(s).",
        "short_answer": f"Short answer questions requiring 2-4 sentence answers. Each is worth {per_q_marks['short_answer']} mark(s).",
        "long_answer": f"Long answer / essay-style questions requiring detailed explanations. Each is worth {per_q_marks['long_answer']} mark(s).",
    }
    qt_instructions = "\n".join(f"- {qt}: {type_desc[qt]}" for qt in question_types if qt in type_desc)

    parts = []
    for qt in ["MCQ", "short_answer", "long_answer"]:
        if qt not in counts:
            continue
        c, m = counts[qt], per_q_marks[qt]
        parts.append(f"exactly {c} {label_map[qt]} questions worth {m} mark(s) each = {c * m} marks")
    computed_total = sum(counts[qt] * per_q_marks[qt] for qt in counts)
    count_instruction = f"Generate {', '.join(parts)}. Total = {computed_total} marks."

    _ex_type = question_types[0]
    _ex_marks = per_q_marks.get(_ex_type, 1)
    _ex_section_name = {"MCQ": "Section A", "short_answer": "Section B", "long_answer": "Section C"}.get(_ex_type, "Section A")
    _ex_instructions = {
        "MCQ": "Choose the correct answer.",
        "short_answer": "Answer the following questions briefly.",
        "long_answer": "Answer the following questions in detail.",
    }.get(_ex_type, "Answer the following questions.")

    if _ex_type == "MCQ":
        _mcq_answer_field = ',\n            "answer": "A. option1"' if include_answer_key else ""
        _ex_question = f'''{{
            "number": 1,
            "question": "Question text here?",
            "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
            "marks": {_ex_marks},
            "topic": "topic name"{_mcq_answer_field}
          }}'''
    else:
        _ex_answer = '"answer": "Sample answer here.",' if include_answer_key else ''
        _ex_question = f'''{{
            "number": 1,
            "question": "Question text here?",
            {_ex_answer}
            "marks": {_ex_marks},
            "topic": "topic name"
          }}'''

    system_role = DIFFICULTY_SYSTEM_ROLE.get(difficulty, "You are an expert exam paper setter.")
    diff_detail = DIFFICULTY_INSTRUCTIONS.get(difficulty, '')

    return f"""{system_role}
You are setting a {board} Board, Grade {grade}, Subject: {subject} exam paper.

TASK: Create a complete exam paper based on the following specifications.

SPECIFICATIONS:
- Board: {board}
- Grade: {grade}
- Subject: {subject}
- Topics: {topics_str}
- Total Marks: {total_marks}
- Duration: {duration_minutes} minutes
- Difficulty Level: {difficulty.upper()} — MANDATORY
- Question Types:
{qt_instructions}

DIFFICULTY REQUIREMENTS (MUST BE FOLLOWED FOR EVERY SINGLE QUESTION):
{diff_detail}

SYLLABUS CONTEXT (base all questions on this material):
{context}

INSTRUCTIONS:
1. {count_instruction}
2. ONLY generate sections for these question types: {', '.join(question_types)}.
3. For MCQ: ALWAYS include exactly 4 options (A, B, C, D).
4. For short_answer and long_answer: do NOT include an options field.
5. Assign marks EXACTLY as specified above — do not change them.
6. Follow {board} board exam format and language style.
7. {"Include correct answers for each question." if include_answer_key else "Do NOT include answers — omit the answer field entirely."}
8. The "sections" array must ONLY contain sections with "type" from: {question_types}.
9. Generate ORIGINAL questions — not copied from textbooks or past papers.
10. Base every question strictly on the syllabus context provided above.
11. STRICTLY ENFORCE the difficulty level — reject and replace any question that does not match.
12. MATH FORMATTING (MANDATORY): Wrap ALL mathematical expressions in LaTeX delimiters:
    - Inline math: $x^2$, $\\frac{{a}}{{b}}$, $\\sqrt{{x}}$, $\\int_a^b f(x)\\,dx$, $\\frac{{dy}}{{dx}}$, $\\alpha$, $\\pi$, $\\sin(\\theta)$
    - Display/block equations on their own line: $$\\int_0^\\infty e^{{-x^2}}\\,dx = \\frac{{\\sqrt{{\\pi}}}}{{2}}$$
    - NEVER write math as plain text — always use $...$ around every formula, symbol, or expression.

CRITICAL: You MUST output ALL {len(question_types)} section(s) in the JSON — one section per question type: {', '.join(question_types)}. Do NOT stop after the first section. The JSON must be complete and valid before you stop.

OUTPUT FORMAT (strict JSON only, no markdown, no extra text):
{{
  "paper": {{
    "board": "{board}",
    "grade": "{grade}",
    "subject": "{subject}",
    "topics_covered": ["topic1", "topic2"],
    "total_marks": {total_marks},
    "duration_minutes": {duration_minutes},
    "difficulty": "{difficulty}",
    "sections": [
      {{
        "section_name": "{_ex_section_name}",
        "type": "{_ex_type}",
        "instructions": "{_ex_instructions}",
        "questions": [
          {_ex_question}
        ]
      }}
    ]
  }}
}}"""


def fix_marks(paper_data: dict, target: int) -> dict:
    """Adjust question marks to reach target total (for auto-distributed papers only)."""
    sections = paper_data.get("sections", [])
    all_questions = [(s, q) for s in sections for q in s.get("questions", [])]
    if not all_questions:
        return paper_data

    current = sum(q.get("marks", 1) for _, q in all_questions)
    diff = target - current
    if diff == 0:
        paper_data["total_marks"] = target
        return paper_data

    # Only adjust long_answer and short_answer marks
    for q_type in ["long_answer", "short_answer"]:
        for section in sections:
            if section.get("type") != q_type:
                continue
            for q in section.get("questions", []):
                if diff == 0:
                    break
                if diff > 0:
                    q["marks"] = q.get("marks", 1) + 1
                    diff -= 1
                elif q.get("marks", 1) > 1:
                    q["marks"] = q["marks"] - 1
                    diff += 1
        if diff == 0:
            break

    paper_data["total_marks"] = sum(q.get("marks", 1) for _, q in all_questions)
    return paper_data


def _generate_batched(
    board: str, grade: str, subject: str, topics: Optional[List[str]],
    total_marks: int, duration_minutes: int, question_types: List[str],
    difficulty: str, include_answer_key: bool,
    counts: Dict[str, int], context_chunks: List[str],
    model: str, per_q_marks: Dict[str, int],
) -> dict:
    """Generate large papers: batched MCQ calls + one dedicated call per non-MCQ type."""
    client = get_client()
    sections = []

    # ── MCQ: simple fixed-batch loop (fast, predictable) ─────────────────────────
    mcq_count     = counts.get("MCQ", 0)
    marks_per_mcq = per_q_marks["MCQ"]

    if mcq_count > 0:
        all_mcqs: List[dict] = []
        remaining   = mcq_count
        current_num = 1

        while remaining > 0:
            batch_size = min(MCQ_BATCH_SIZE, remaining)
            prompt = _build_mcq_batch_prompt(
                board, grade, subject, topics, difficulty,
                batch_size, marks_per_mcq, context_chunks, include_answer_key,
                start_num=current_num, used_questions=all_mcqs,
            )
            try:
                message = _groq_create(
                    client, MCQ_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=3000, timeout=60,
                )
                raw = message.choices[0].message.content.strip()
                arr_match = re.search(r'\[[\s\S]*\]', raw)
                if arr_match:
                    batch_qs = json.loads(arr_match.group())
                    for q in batch_qs:
                        q["marks"] = marks_per_mcq
                    all_mcqs.extend(batch_qs)
            except Exception:
                pass

            remaining   -= batch_size
            current_num += batch_size

        sections.append({
            "section_name": "Section A", "type": "MCQ",
            "instructions": "Choose the correct answer.", "questions": all_mcqs,
        })

    # ── Non-MCQ: one dedicated call per section type, one retry on failure ────────
    def _call_single_section(qt: str) -> Optional[dict]:
        q_count   = counts.get(qt, 0)
        sec_marks = q_count * per_q_marks[qt]
        max_out   = min(max(3500, q_count * 350), 7000)

        prompt = build_prompt(
            board, grade, subject, topics, sec_marks, duration_minutes,
            [qt], difficulty, context_chunks, include_answer_key,
            {qt: q_count}, per_q_marks,
        )

        def _try() -> Optional[dict]:
            try:
                msg = _groq_create(
                    client, model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=max_out, timeout=120,
                )
                raw = msg.choices[0].message.content.strip()
                j = re.search(r'\{[\s\S]*\}', raw)
                if not j:
                    return None
                data = json.loads(j.group())
                node = data.get("paper", data)
                for sec in node.get("sections", []):
                    sec["type"] = TYPE_MAP.get(sec.get("type", "").lower(), sec.get("type", ""))
                    if sec["type"] == qt:
                        return sec
            except Exception:
                pass
            return None

        return _try() or _try()   # one automatic retry

    non_mcq_types = [qt for qt in question_types if qt != "MCQ"]
    for qt in non_mcq_types:
        sec = _call_single_section(qt)
        if sec:
            sections.append(sec)

    # Enforce section order: MCQ → short_answer → long_answer
    SECTION_ORDER = ["MCQ", "short_answer", "long_answer"]
    sections_by_type = {s["type"]: s for s in sections}
    sections = [sections_by_type[k] for k in SECTION_ORDER if k in sections_by_type]
    sections += [s for s in sections_by_type.values() if s["type"] not in SECTION_ORDER]

    paper = {
        "board": board, "grade": grade, "subject": subject,
        "topics_covered": topics or [],
        "total_marks": total_marks, "duration_minutes": duration_minutes,
        "difficulty": difficulty, "sections": sections,
    }
    _enforce_marks(paper, per_q_marks)
    paper["total_marks"] = sum(
        q.get("marks", 1) for s in sections for q in s.get("questions", [])
    )
    return paper


def generate_paper(
    board: str, grade: str, subject: str, topics: Optional[List[str]],
    total_marks: int, duration_minutes: int, question_types: List[str],
    difficulty: str, include_answer_key: bool,
    model: Optional[str] = None,
    num_mcq: Optional[int] = None,
    num_short: Optional[int] = None,
    num_long: Optional[int] = None,
    marks_per_mcq: int = 1,
    marks_per_short: int = 2,
    marks_per_long: int = 5,
) -> dict:
    active_model = model or settings.groq_model
    per_q_marks = {"MCQ": marks_per_mcq, "short_answer": marks_per_short, "long_answer": marks_per_long}

    # Build a richer query — more specific = better embedding match
    topic_str = " ".join(topics or [])
    query = f"{board} grade {grade} {subject} {topic_str} concepts explanation"
    chunks = retrieve_chunks(query, board, grade, subject, topics, n_results=6)

    # For hard papers: supplement with past exam question examples if available
    if difficulty == "hard":
        example_qs = retrieve_example_questions(board, grade, subject, topics, n_results=4)
        if example_qs:
            chunks = chunks + example_qs  # add at end so context comes first

    explicit = any(x is not None for x in [num_mcq, num_short, num_long])
    if explicit:
        counts = {}
        if "MCQ" in question_types and num_mcq:
            counts["MCQ"] = num_mcq
        if "short_answer" in question_types and num_short:
            counts["short_answer"] = num_short
        if "long_answer" in question_types and num_long:
            counts["long_answer"] = num_long
        total_marks = sum(counts.get(qt, 0) * per_q_marks[qt] for qt in counts)
    else:
        counts = _compute_counts(total_marks, question_types, per_q_marks)

    # Always use batched path when MCQ exists alongside other question types
    # (prevents combined output from overflowing the token limit)
    has_non_mcq = any(qt != "MCQ" for qt in question_types)
    if counts.get("MCQ", 0) > MCQ_BATCH_SIZE or (counts.get("MCQ", 0) > 0 and has_non_mcq):
        result = _generate_batched(
            board, grade, subject, topics, total_marks, duration_minutes,
            question_types, difficulty, include_answer_key,
            counts, chunks, active_model, per_q_marks,
        )
        result["_context_chunks"] = chunks
        return result

    # Standard single-call path (MCQ only, ≤ 25 questions)
    # Use MCQ_MODEL for pure-MCQ papers to save 70b TPD quota
    only_mcq = set(question_types) == {"MCQ"}
    call_model = MCQ_MODEL if only_mcq else active_model
    prompt = build_prompt(
        board, grade, subject, topics, total_marks, duration_minutes,
        question_types, difficulty, chunks, include_answer_key,
        counts, per_q_marks,
    )
    max_out = min(max(3500, total_marks * 100), 8000)

    client = get_client()
    message = _groq_create(
        client, call_model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_out, timeout=90,
    )

    raw = message.choices[0].message.content.strip()
    json_match = re.search(r'\{[\s\S]*\}', raw)
    if not json_match:
        raise ValueError("LLM did not return valid JSON")

    try:
        data = json.loads(json_match.group())
    except json.JSONDecodeError:
        raise ValueError(
            "The generated paper was too large and the response was cut off. "
            "Try reducing total marks or selecting fewer question types."
        )
    paper = data.get("paper", data)

    for section in paper.get("sections", []):
        raw_type = section.get("type", "")
        section["type"] = TYPE_MAP.get(raw_type.lower(), raw_type)

    if paper.get("sections"):
        paper["sections"] = [s for s in paper["sections"] if s.get("type") in question_types]

    # Drop MCQ questions without valid options
    for section in paper.get("sections", []):
        if section.get("type") == "MCQ":
            section["questions"] = [
                q for q in section.get("questions", [])
                if q.get("options") and len(q["options"]) >= 2
            ]

    # Enforce user-specified marks on every question
    _enforce_marks(paper, per_q_marks)

    if explicit:
        paper["total_marks"] = sum(
            q.get("marks", 1) for s in paper.get("sections", []) for q in s.get("questions", [])
        )
        paper["_context_chunks"] = chunks
        return paper

    paper["_context_chunks"] = chunks
    return fix_marks(paper, total_marks)


def _regenerate_replacements(
    section_type: str, count: int, marks: int,
    board: str, grade: str, subject: str,
    topics: List[str], difficulty: str,
    include_answer_key: bool,
    context_chunks: List[str],
    existing_questions: List[str],
    model: str,
) -> List[dict]:
    """Generate replacement questions for ones removed during verify pass."""
    if count <= 0:
        return []

    client = get_client()
    context = "\n\n---\n\n".join(c[:400] for c in context_chunks) if context_chunks else "Use your syllabus knowledge."
    topics_str = ", ".join(topics) if topics else "all topics"
    diff_detail = DIFFICULTY_INSTRUCTIONS.get(difficulty, '')
    system_role = DIFFICULTY_SYSTEM_ROLE.get(difficulty, "You are an expert exam setter.")

    avoid_note = ""
    if existing_questions:
        avoid_note = (
            "\n\nDO NOT REPEAT OR REPHRASE any of these existing questions:\n"
            + "\n".join(f"- {q}" for q in existing_questions[-20:])
        )

    answer_field = '"answer": "correct answer here",' if include_answer_key else ""
    answer_instruction = (
        'Include the "answer" field with the correct answer.'
        if include_answer_key else 'Do NOT include an "answer" field.'
    )

    if section_type == "MCQ":
        prompt = f"""{system_role}
Generate exactly {count} replacement MCQ questions for {board} Board, Grade {grade}, {subject}.
Topics: {topics_str}
Difficulty: {difficulty.upper()} — {diff_detail}
Each MCQ is worth {marks} mark(s).
{answer_instruction}
{avoid_note}

CONTEXT:
{context}

Return ONLY a JSON array:
[{{"section_type":"MCQ","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"marks":{marks},"topic":"..."{(',' + answer_field) if answer_field else ''}}}]
No markdown, no explanation."""
    else:
        prompt = f"""{system_role}
Generate exactly {count} replacement {section_type.replace('_', ' ')} questions for {board} Board, Grade {grade}, {subject}.
Topics: {topics_str}
Difficulty: {difficulty.upper()} — {diff_detail}
Each question is worth {marks} mark(s).
{answer_instruction}
{avoid_note}

CONTEXT:
{context}

Return ONLY a JSON array:
[{{"section_type":"{section_type}","question":"...","marks":{marks},"topic":"..."{(',' + answer_field) if answer_field else ''}}}]
No markdown, no explanation."""

    call_model = MCQ_MODEL if section_type == "MCQ" else model
    # Token budget: MCQ is compact; non-MCQ needs room for full answers
    max_tok = min(count * 120, 3000) if section_type == "MCQ" else min(max(2000, count * 400), 7000)

    for attempt in range(2):   # one retry
        try:
            result = _groq_create(
                client, call_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tok, timeout=90,
            )
            raw = result.choices[0].message.content.strip()
            arr_match = re.search(r'\[[\s\S]*\]', raw)
            if arr_match:
                parsed = json.loads(arr_match.group())
                if parsed:
                    return parsed
        except Exception as e:
            print(f"[VERIFY] Replacement attempt {attempt+1} failed for {section_type}: {e}", flush=True)
    return []


def _python_validate_mcqs(mcq_flat: List[dict]) -> List[dict]:
    """
    Python-only MCQ validation — no LLM needed.
    Removes: missing question text, fewer than 4 options, exact duplicates.
    """
    seen: set = set()
    valid = []
    for q in mcq_flat:
        text = q.get("question", "").strip()
        options = q.get("options") or []
        if not text:
            continue
        if len(options) < 4:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        valid.append(q)
    return valid


def verify_and_clean_paper(
    paper: dict,
    model: str,
    context_chunks: Optional[List[str]] = None,
    expected_counts: Optional[Dict[str, int]] = None,
    per_q_marks: Optional[Dict[str, int]] = None,
    include_answer_key: bool = False,
) -> dict:
    """
    Second-pass QA:
    - MCQs: validated in Python (4 options, dedup) — never sent to LLM to avoid truncation
    - Non-MCQ: sent to LLM for semantic/factual review
    - Replacement questions regenerated (batched for MCQ) to match requested counts

    Uses llama-3.1-8b-instant for verify (higher TPM).
    Uses the generation model for replacements (needs quality).
    """
    VERIFY_MODEL = "llama-3.1-8b-instant"

    client = get_client()
    sections = paper.get("sections", [])
    if not sections:
        return paper

    target_counts = expected_counts or {
        sec.get("type", ""): len(sec.get("questions", []))
        for sec in sections
    }

    board     = paper.get("board", "")
    grade     = paper.get("grade", "")
    subject   = paper.get("subject", "")
    difficulty = paper.get("difficulty", "medium")
    topics    = paper.get("topics_covered", [])

    # ── 1. Split into MCQ vs non-MCQ ────────────────────────────────────────
    mcq_flat:     List[dict] = []
    non_mcq_flat: List[dict] = []
    for sec in sections:
        stype = sec.get("type", "")
        for q in sec.get("questions", []):
            entry = {
                "section_type": stype,
                "question":     q.get("question", ""),
                "options":      q.get("options"),
                "answer":       q.get("answer"),
                "marks":        q.get("marks", 1),
                "topic":        q.get("topic", ""),
            }
            if stype == "MCQ":
                mcq_flat.append(entry)
            else:
                non_mcq_flat.append(entry)

    # ── 2. Python-validate MCQs (fast, no token limits) ─────────────────────
    validated_mcqs = _python_validate_mcqs(mcq_flat)
    print(f"[VERIFY] MCQ python-check: {len(mcq_flat)} in → {len(validated_mcqs)} valid", flush=True)

    # ── 3. LLM-verify non-MCQ: light-touch only — fix answers, never remove ─────
    # We do NOT ask the LLM to remove questions here; removals cause count shortfalls
    # that are hard to recover from. Python validation already handles blanks/dupes.
    # The LLM's job here is only to verify/correct answer text when present.
    validated_non_mcq: List[dict] = non_mcq_flat  # default: keep all unchanged

    if non_mcq_flat and include_answer_key:
        has_answers = any(q.get("answer") for q in non_mcq_flat)
        if has_answers:
            # Build a lookup by question text so we can re-attach section_type correctly
            orig_by_text: Dict[str, dict] = {
                q.get("question", "").strip(): q for q in non_mcq_flat
            }

            llm_prompt = f"""You are an exam answer reviewer for {board} Board, Grade {grade}, {subject}.

For each question below, check if the "answer" is factually correct.
- If the answer is correct → keep it as-is, set "answer_verified": true.
- If the answer is wrong → correct it, set "answer_verified": false.
- Do NOT remove any questions. Return ALL {len(non_mcq_flat)} questions.
- Keep every field exactly as given. PRESERVE "section_type" on every object.

Return ONLY a valid JSON array. No markdown, no explanation.

QUESTIONS:
{json.dumps(non_mcq_flat, indent=2)[:8000]}"""

            try:
                verify_max = min(max(2500, len(non_mcq_flat) * 200), 6000)
                message = _groq_create(
                    client, VERIFY_MODEL,
                    messages=[{"role": "user", "content": llm_prompt}],
                    max_tokens=verify_max, timeout=60,
                )
                raw = message.choices[0].message.content.strip()
                arr_match = re.search(r'\[[\s\S]*\]', raw)
                if arr_match:
                    llm_result = json.loads(arr_match.group())
                    # Re-attach section_type by matching question text (index-match is broken
                    # when LLM reorders or drops entries)
                    for q in llm_result:
                        qtext = q.get("question", "").strip()
                        orig  = orig_by_text.get(qtext)
                        if orig and not q.get("section_type"):
                            q["section_type"] = orig.get("section_type", "short_answer")
                        elif not q.get("section_type"):
                            # Fallback: assign based on position in flat list
                            q["section_type"] = "short_answer"
                    # Only accept result if LLM returned at least as many questions as sent
                    if len(llm_result) >= len(non_mcq_flat):
                        validated_non_mcq = llm_result
                        print(f"[VERIFY] Non-MCQ answer-check OK: {len(validated_non_mcq)} questions", flush=True)
                    else:
                        print(f"[VERIFY] Non-MCQ verify returned fewer questions ({len(llm_result)}/{len(non_mcq_flat)}) — keeping originals", flush=True)
            except Exception as e:
                print(f"[VERIFY] Non-MCQ verify failed: {e} — keeping originals", flush=True)

    # ── 4. Combine and count ─────────────────────────────────────────────────
    cleaned_flat = validated_mcqs + validated_non_mcq
    cleaned_counts: Dict[str, int] = {}
    for q in cleaned_flat:
        stype = q.get("section_type", "short_answer")
        cleaned_counts[stype] = cleaned_counts.get(stype, 0) + 1

    # ── 5. Regenerate replacements for removed questions (up to 3 rounds per type)
    existing_qs = [q.get("question", "") for q in cleaned_flat]

    for stype, target in target_counts.items():
        marks       = (per_q_marks or {}).get(stype, 1)
        batch_limit = MCQ_BATCH_SIZE if stype == "MCQ" else 10

        for fill_round in range(3):          # up to 3 gap-fill rounds per type
            # Recount after each round
            current_count = sum(1 for q in cleaned_flat if q.get("section_type") == stype)
            shortage = target - current_count
            if shortage <= 0:
                break

            # Shrink ask size on later rounds to avoid token exhaustion
            ask = shortage if fill_round == 0 else max(1, shortage // 2)
            ask = min(ask, batch_limit)

            print(f"[VERIFY] Round {fill_round+1}: {shortage} {stype} short — asking for {ask}", flush=True)
            replacements = _regenerate_replacements(
                section_type=stype, count=ask, marks=marks,
                board=board, grade=grade, subject=subject,
                topics=topics, difficulty=difficulty,
                include_answer_key=include_answer_key,
                context_chunks=context_chunks or [],
                existing_questions=existing_qs,
                model=model,
            )
            for r in replacements:
                r["section_type"] = stype
            cleaned_flat.extend(replacements)
            existing_qs.extend(r.get("question", "") for r in replacements)
            if not replacements:
                break  # API keeps failing — stop early

    # ── 6. Rebuild sections ──────────────────────────────────────────────────
    try:
        sections_map: Dict[str, dict] = {}
        for q in cleaned_flat:
            stype = q.get("section_type", "short_answer")
            if stype not in sections_map:
                orig = next((s for s in sections if s.get("type") == stype), {})
                sections_map[stype] = {
                    "section_name": orig.get("section_name", stype),
                    "type":         stype,
                    "instructions": orig.get("instructions", ""),
                    "questions":    [],
                }
            q_clean = {k: v for k, v in q.items() if k != "section_type"}
            sections_map[stype]["questions"].append(q_clean)

        # Hard-enforce exact requested counts: trim excess, log if still short
        if target_counts:
            for stype, target in target_counts.items():
                if stype in sections_map:
                    qs = sections_map[stype]["questions"]
                    sections_map[stype]["questions"] = qs[:target]
                    actual = len(sections_map[stype]["questions"])
                    if actual < target:
                        print(f"[VERIFY] WARNING: {stype} delivered {actual}/{target} — shortage after all retries", flush=True)
                    else:
                        print(f"[VERIFY] OK: {stype} = {actual}/{target}", flush=True)
                else:
                    # Section type was requested but entirely missing — create empty placeholder
                    print(f"[VERIFY] WARNING: {stype} section entirely missing from paper", flush=True)

        # Always enforce section order: MCQ → short_answer → long_answer
        SECTION_ORDER = ["MCQ", "short_answer", "long_answer"]
        ordered = [sections_map[k] for k in SECTION_ORDER if k in sections_map]
        ordered += [v for k, v in sections_map.items() if k not in SECTION_ORDER]
        paper["sections"] = ordered
        paper["total_marks"] = sum(
            q.get("marks", 1) for s in paper["sections"] for q in s.get("questions", [])
        )
    except Exception as e:
        print(f"[VERIFY] Section rebuild failed: {e} — returning original paper", flush=True)

    return paper


def enforce_question_counts(
    paper: dict,
    expected_counts: Dict[str, int],
    per_q_marks: Dict[str, int],
    model: str,
    board: str, grade: str, subject: str,
    topics: List[str], difficulty: str,
    include_answer_key: bool,
    context_chunks: Optional[List[str]] = None,
) -> dict:
    """
    Hard final gate: count questions of each requested type in the paper.
    If any section is short, regenerate the missing questions.
    If any section has extras, trim to exact count.
    Called AFTER verify_and_clean_paper as the last step before returning to frontend.
    """
    sections = paper.get("sections", [])

    # Build a mutable map: type → section dict
    sec_map: Dict[str, dict] = {s["type"]: s for s in sections}

    SECTION_DEFAULTS = {
        "MCQ":          ("Section A", "Choose the correct answer."),
        "short_answer": ("Section B", "Answer the following questions briefly."),
        "long_answer":  ("Section C", "Answer the following questions in detail."),
    }

    changed = False
    for stype, target in expected_counts.items():
        sec     = sec_map.get(stype)
        current = len(sec["questions"]) if sec else 0

        # ── Trim excess ──
        if current > target:
            sec["questions"] = sec["questions"][:target]
            current = target
            changed = True

        # ── Fill shortage: loop until count met or 5 attempts exhausted ──
        if current < target:
            marks    = per_q_marks.get(stype, 1)
            if sec is None:
                name, instr = SECTION_DEFAULTS.get(stype, (stype, "Answer the following."))
                sec = {"section_name": name, "type": stype, "instructions": instr, "questions": []}
                sec_map[stype] = sec

            for attempt in range(5):
                shortage = target - len(sec["questions"])
                if shortage <= 0:
                    break

                existing = [q.get("question", "") for q in sec["questions"]]
                # Ask for full shortage on first attempt; half on subsequent to avoid token blow-out
                ask = shortage if attempt == 0 else max(1, shortage // 2)
                print(f"[ENFORCE] {stype} attempt {attempt+1}: need {shortage} more, asking {ask}", flush=True)

                filled = _regenerate_replacements(
                    section_type=stype, count=ask, marks=marks,
                    board=board, grade=grade, subject=subject,
                    topics=topics, difficulty=difficulty,
                    include_answer_key=include_answer_key,
                    context_chunks=context_chunks or [],
                    existing_questions=existing,
                    model=model,
                )

                if filled:
                    for q in filled:
                        q.pop("section_type", None)
                    sec["questions"].extend(filled)
                    changed = True
                else:
                    print(f"[ENFORCE] {stype} attempt {attempt+1}: API returned nothing — retrying", flush=True)

            # Re-number and final trim
            for i, q in enumerate(sec["questions"], 1):
                q["number"] = i
            sec["questions"] = sec["questions"][:target]
            actual = len(sec["questions"])
            if actual < target:
                print(f"[ENFORCE] WARNING: {stype} final={actual}/{target} after all attempts", flush=True)
            else:
                print(f"[ENFORCE] OK: {stype} = {actual}/{target}", flush=True)

    if changed:
        SECTION_ORDER = ["MCQ", "short_answer", "long_answer"]
        ordered = [sec_map[k] for k in SECTION_ORDER if k in sec_map]
        ordered += [v for k, v in sec_map.items() if k not in SECTION_ORDER]
        paper["sections"] = ordered
        paper["total_marks"] = sum(
            q.get("marks", 1) for s in paper["sections"] for q in s.get("questions", [])
        )

    return paper


def flatten_questions(paper_data: dict) -> List[dict]:
    questions = []
    for section in paper_data.get("sections", []):
        q_type = section.get("type", "short_answer")
        for q in section.get("questions", []):
            questions.append({
                "type": q_type,
                "question": q.get("question", ""),
                "options": q.get("options"),
                "answer": q.get("answer"),
                "answer_verified": q.get("answer_verified"),
                "marks": q.get("marks", 1),
                "topic": q.get("topic", ""),
                "section": section.get("section_name", ""),
            })
    return questions
