import json
import re
from typing import List, Optional, Dict
from core.config import settings
from services.rag_service import retrieve_chunks, retrieve_example_questions, get_client

MCQ_BATCH_SIZE = 25  # MCQ questions per LLM call

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
    """Generate large papers using batched MCQ calls + single call for other types."""
    client = get_client()
    sections = []

    # Batched MCQ generation
    mcq_count = counts.get("MCQ", 0)
    marks_per_mcq = per_q_marks["MCQ"]
    if mcq_count > 0:
        all_mcqs: List[dict] = []
        remaining = mcq_count
        current_num = 1
        batch_num = 0
        while remaining > 0:
            batch_size = min(MCQ_BATCH_SIZE, remaining)
            batch_num += 1
            prompt = _build_mcq_batch_prompt(
                board, grade, subject, topics, difficulty,
                batch_size, marks_per_mcq, context_chunks, include_answer_key,
                start_num=current_num, used_questions=all_mcqs,
            )
            message = client.chat.completions.create(
                model=model, max_tokens=3000,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.choices[0].message.content.strip()
            arr_match = re.search(r'\[[\s\S]*\]', raw)
            if arr_match:
                try:
                    batch_qs = json.loads(arr_match.group())
                    for q in batch_qs:
                        q["marks"] = marks_per_mcq
                    all_mcqs.extend(batch_qs)
                except json.JSONDecodeError:
                    pass

            remaining -= batch_size
            current_num += batch_size

        sections.append({
            "section_name": "Section A", "type": "MCQ",
            "instructions": "Choose the correct answer.", "questions": all_mcqs,
        })

    # Non-MCQ sections (single call)
    non_mcq_types = [qt for qt in question_types if qt != "MCQ"]
    if non_mcq_types:
        non_mcq_total = sum(counts.get(qt, 0) * per_q_marks[qt] for qt in non_mcq_types)
        non_mcq_counts = {qt: counts[qt] for qt in non_mcq_types if qt in counts}

        prompt = build_prompt(
            board, grade, subject, topics, non_mcq_total, duration_minutes,
            non_mcq_types, difficulty, context_chunks, include_answer_key,
            non_mcq_counts, per_q_marks,
        )
        max_out = min(max(2048, non_mcq_total * 80), 5500)
        message = client.chat.completions.create(
            model=model, max_tokens=max_out,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.choices[0].message.content.strip()
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            try:
                data = json.loads(json_match.group())
                other = data.get("paper", data)
                for section in other.get("sections", []):
                    raw_type = section.get("type", "")
                    section["type"] = TYPE_MAP.get(raw_type.lower(), raw_type)
                    if section["type"] in non_mcq_types:
                        sections.append(section)
            except json.JSONDecodeError:
                pass

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
    prompt = build_prompt(
        board, grade, subject, topics, total_marks, duration_minutes,
        question_types, difficulty, chunks, include_answer_key,
        counts, per_q_marks,
    )
    max_out = min(max(2048, total_marks * 60), 5500)

    client = get_client()
    message = client.chat.completions.create(
        model=active_model, max_tokens=max_out,
        messages=[{"role": "user", "content": prompt}],
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

    try:
        result = client.chat.completions.create(
            model=model,
            max_tokens=min(count * 120, 3000),
            messages=[{"role": "user", "content": prompt}],
        )
        raw = result.choices[0].message.content.strip()
        arr_match = re.search(r'\[[\s\S]*\]', raw)
        if arr_match:
            return json.loads(arr_match.group())
    except Exception as e:
        print(f"[VERIFY] Replacement generation failed for {section_type}: {e}", flush=True)
    return []


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
    - Remove duplicates, incomplete, or bad questions
    - Verify answer correctness (sets answer_verified flag)
    - Regenerate replacements for any removed questions
      so the final count matches what the user requested.

    Uses llama-3.1-8b-instant for verify (higher TPM, sufficient for QA).
    Uses the generation model for replacements (needs quality).
    """
    VERIFY_MODEL = "llama-3.1-8b-instant"

    client = get_client()
    sections = paper.get("sections", [])
    if not sections:
        return paper

    # Track original counts per section type for replacement
    original_counts: Dict[str, int] = {}
    for sec in sections:
        stype = sec.get("type", "")
        original_counts[stype] = len(sec.get("questions", []))

    # Use caller-provided expected counts if available (more accurate)
    target_counts = expected_counts or original_counts

    flat = []
    for sec in sections:
        for q in sec.get("questions", []):
            flat.append({
                "section_type": sec.get("type"),
                "question":     q.get("question", ""),
                "options":      q.get("options"),
                "answer":       q.get("answer"),
                "marks":        q.get("marks", 1),
                "topic":        q.get("topic", ""),
            })

    has_answers = any(q.get("answer") for q in flat)
    answer_instructions = """
7. For every question that has an "answer" field:
   - Verify the answer is FACTUALLY CORRECT.
   - For MCQ: confirm the answer matches one of the options and is correct.
   - If correct and confident → set "answer_verified": true.
   - If wrong or unsure → CORRECT it and set "answer_verified": false.
   - Never leave a wrong answer — fix it or flag it.
""" if has_answers else ""

    prompt = f"""You are a strict exam quality-control reviewer for {paper.get('board', '')} Board, Grade {paper.get('grade', '')}, {paper.get('subject', '')} paper.

Review the questions below and:
1. REMOVE any duplicate or near-duplicate questions (keep the better one).
2. REMOVE any question that is incomplete, poorly worded, or has missing text.
3. For MCQ: REMOVE any question without exactly 4 distinct options (A, B, C, D).
4. REMOVE any question where the correct answer is not among the options.
5. REMOVE any off-topic, inappropriate, or factually incorrect questions.
6. Keep all valid questions unchanged — do not rephrase or alter them.
{answer_instructions}
Return ONLY a valid JSON array. No markdown, no explanation.

QUESTIONS:
{json.dumps(flat, indent=2)[:12000]}"""

    try:
        verify_max = min(max(2000, len(flat) * 60), 5000)
        message = client.chat.completions.create(
            model=VERIFY_MODEL,
            max_tokens=verify_max,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.choices[0].message.content.strip()
        arr_match = re.search(r'\[[\s\S]*\]', raw)
        if not arr_match:
            return paper

        cleaned_flat = json.loads(arr_match.group())

        # Count how many were removed per section type
        cleaned_counts: Dict[str, int] = {}
        for q in cleaned_flat:
            stype = q.get("section_type", "short_answer")
            cleaned_counts[stype] = cleaned_counts.get(stype, 0) + 1

        # Regenerate replacements for removed questions
        existing_qs = [q.get("question", "") for q in cleaned_flat]
        topics = paper.get("topics_covered", [])
        board  = paper.get("board", "")
        grade  = paper.get("grade", "")
        subject = paper.get("subject", "")
        difficulty = paper.get("difficulty", "medium")

        for stype, target in target_counts.items():
            got = cleaned_counts.get(stype, 0)
            shortage = target - got
            if shortage > 0:
                print(f"[VERIFY] {shortage} {stype} question(s) removed — regenerating replacements", flush=True)
                marks = (per_q_marks or {}).get(stype, 1)
                replacements = _regenerate_replacements(
                    section_type=stype,
                    count=shortage,
                    marks=marks,
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

        # Rebuild sections
        sections_map = {}
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

        paper["sections"] = list(sections_map.values())
        paper["total_marks"] = sum(
            q.get("marks", 1) for s in paper["sections"] for q in s.get("questions", [])
        )
        print(f"[VERIFY] Final counts: { {k: len(v['questions']) for k, v in sections_map.items()} }", flush=True)

    except Exception as e:
        print(f"[VERIFY] Verify pass failed: {e} — returning original paper", flush=True)

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
