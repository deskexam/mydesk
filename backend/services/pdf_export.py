import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Table, TableStyle, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics

W, H = A4

# ─── shared helpers ────────────────────────────────────────────────────────────

def _header_text(paper: dict) -> tuple:
    institute = paper.get("institute_name", "").strip()
    tutor = paper.get("tutor_name", "").strip()
    board = paper.get("board", "")
    grade = paper.get("grade", "")
    subject = paper.get("subject", "")
    total = paper.get("total_marks", "")
    duration = paper.get("duration_minutes", "")
    difficulty = paper.get("difficulty", "").capitalize()
    topics = ", ".join(paper.get("topics_covered") or paper.get("topics", [])) or "—"
    return institute, tutor, board, grade, subject, total, duration, difficulty, topics


def _build_doc(buffer, margins=(2, 2, 2, 2)):
    l, r, t, b = [m * cm for m in margins]
    return SimpleDocTemplate(buffer, pagesize=A4,
                             leftMargin=l, rightMargin=r,
                             topMargin=t, bottomMargin=b)


def _student_info_block(styles):
    """Blank lines for student name / roll / date."""
    data = [
        ["Name: ___________________________", "Roll No: ___________", "Date: ___________"],
    ]
    t = Table(data, colWidths=[8 * cm, 5 * cm, 4 * cm])
    t.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 9),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 14)]))
    return t


# ─── TEMPLATE 1 · Standard ─────────────────────────────────────────────────────

def _tpl_standard(paper: dict, include_answer_key: bool) -> bytes:
    buf = io.BytesIO()
    doc = _build_doc(buf)
    s = getSampleStyleSheet()

    ST = lambda name, **kw: ParagraphStyle(name, parent=s["Normal"], **kw)
    title  = ST("t", alignment=TA_CENTER, fontSize=15, fontName="Helvetica-Bold", spaceAfter=3)
    sub    = ST("s", alignment=TA_CENTER, fontSize=11, spaceAfter=2)
    sec    = ST("sc", fontSize=12, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=5)
    q_sty  = ST("q", fontSize=11, spaceBefore=5, spaceAfter=2, leading=15)
    opt    = ST("o", fontSize=10, leftIndent=18, spaceAfter=1)
    ans    = ST("a", fontSize=10, leftIndent=18, textColor=colors.HexColor("#2e7d32"), spaceAfter=4)
    topic  = ST("tp", fontSize=8, leftIndent=18, textColor=colors.grey, spaceAfter=3)

    inst, tutor, board, grade, subj, total, dur, diff, topics = _header_text(paper)
    story = []

    if inst:
        story.append(Paragraph(inst, ST("i", alignment=TA_CENTER, fontSize=16, fontName="Helvetica-Bold", spaceAfter=2)))
    story.append(Paragraph(f"{board} Board Examination", title))
    story.append(Paragraph(f"Grade {grade} &nbsp;|&nbsp; {subj}", sub))
    if tutor:
        story.append(Paragraph(f"Tutor: {tutor}", sub))
    story.append(Spacer(1, 0.2 * cm))

    info = Table(
        [["Total Marks:", str(total), "Duration:", f"{dur} min"],
         ["Difficulty:", diff, "Topics:", topics]],
        colWidths=[3*cm, 5*cm, 3*cm, 6*cm],
    )
    info.setStyle(TableStyle([("FONTSIZE", (0,0),(-1,-1), 10),
                               ("FONTNAME", (0,0),(0,-1), "Helvetica-Bold"),
                               ("FONTNAME", (2,0),(2,-1), "Helvetica-Bold"),
                               ("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    story += [info, Spacer(1, 0.2*cm),
              HRFlowable(width="100%", thickness=1.5, color=colors.black),
              Spacer(1, 0.3*cm)]

    story.append(Paragraph("<b>General Instructions:</b>", q_sty))
    for i in ["All questions are compulsory.", "Read each question carefully.",
              "Marks are indicated against each question."]:
        story.append(Paragraph(f"• {i}", opt))
    story += [Spacer(1, 0.3*cm), HRFlowable(width="100%", thickness=0.5, color=colors.grey)]

    _append_sections(story, paper, include_answer_key, sec, q_sty, opt, ans, topic)
    doc.build(story)
    buf.seek(0)
    return buf.read()


# ─── TEMPLATE 2 · Professional ─────────────────────────────────────────────────

def _tpl_professional(paper: dict, include_answer_key: bool) -> bytes:
    buf = io.BytesIO()
    doc = _build_doc(buf)
    s = getSampleStyleSheet()
    ST = lambda name, **kw: ParagraphStyle(name, parent=s["Normal"], **kw)

    inst, tutor, board, grade, subj, total, dur, diff, topics = _header_text(paper)
    story = []

    # Boxed header
    hdr_data = [[
        Paragraph(f"<b><font size='18'>{inst or board + ' Examination'}</font></b><br/>"
                  f"<font size='11'>{board} Board &nbsp;|&nbsp; Grade {grade} &nbsp;|&nbsp; {subj}</font>"
                  + (f"<br/><font size='10'>Tutor: {tutor}</font>" if tutor else ""),
                  ST("h", alignment=TA_CENTER, leading=20)),
        Paragraph(f"<b>Total Marks:</b> {total}<br/>"
                  f"<b>Duration:</b> {dur} min<br/>"
                  f"<b>Difficulty:</b> {diff}",
                  ST("hr", fontSize=10, leading=16)),
    ]]
    hdr_table = Table(hdr_data, colWidths=[12*cm, 5*cm])
    hdr_table.setStyle(TableStyle([
        ("BOX", (0,0),(-1,-1), 1.5, colors.black),
        ("LINEAFTER", (0,0),(0,-1), 1, colors.black),
        ("BACKGROUND", (0,0),(0,-1), colors.HexColor("#f0f4ff")),
        ("VALIGN", (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
        ("LEFTPADDING", (0,0),(-1,-1), 8),
    ]))
    story += [hdr_table, Spacer(1, 0.3*cm), _student_info_block(s), Spacer(1, 0.2*cm),
              HRFlowable(width="100%", thickness=0.8, color=colors.black)]

    sec   = ST("sc", fontSize=12, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=5,
               borderPad=4, borderColor=colors.black, borderWidth=0.5)
    q_sty = ST("q", fontSize=11, spaceBefore=5, spaceAfter=2, leading=15)
    opt   = ST("o", fontSize=10, leftIndent=18, spaceAfter=1)
    ans   = ST("a", fontSize=10, leftIndent=18, textColor=colors.HexColor("#2e7d32"), spaceAfter=4)
    topic = ST("tp", fontSize=8, leftIndent=18, textColor=colors.grey, spaceAfter=3)

    _append_sections(story, paper, include_answer_key, sec, q_sty, opt, ans, topic)
    doc.build(story)
    buf.seek(0)
    return buf.read()


# ─── TEMPLATE 3 · Two-Column MCQ ───────────────────────────────────────────────

def _tpl_two_column(paper: dict, include_answer_key: bool) -> bytes:
    buf = io.BytesIO()
    doc = _build_doc(buf, margins=[1.5, 1.5, 2, 2])
    s = getSampleStyleSheet()
    ST = lambda name, **kw: ParagraphStyle(name, parent=s["Normal"], **kw)

    inst, tutor, board, grade, subj, total, dur, diff, topics = _header_text(paper)
    story = []

    if inst:
        story.append(Paragraph(inst, ST("i", alignment=TA_CENTER, fontSize=15, fontName="Helvetica-Bold", spaceAfter=2)))
    story.append(Paragraph(f"{board} Board | Grade {grade} | {subj}",
                           ST("t", alignment=TA_CENTER, fontSize=13, fontName="Helvetica-Bold", spaceAfter=2)))
    if tutor:
        story.append(Paragraph(f"Tutor: {tutor}", ST("tu", alignment=TA_CENTER, fontSize=10, spaceAfter=2)))

    meta = Table([["Total Marks: " + str(total), "Duration: " + str(dur) + " min", "Difficulty: " + diff]],
                 colWidths=[6*cm, 6*cm, 5*cm])
    meta.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER"),
                               ("FONTSIZE",(0,0),(-1,-1),10),
                               ("FONTNAME",(0,0),(-1,-1),"Helvetica-Bold"),
                               ("TOPPADDING",(0,0),(-1,-1),4),
                               ("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    story += [Spacer(1,0.2*cm), meta,
              HRFlowable(width="100%", thickness=2, color=colors.black), Spacer(1,0.2*cm)]

    sec_sty   = ST("sc", fontSize=11, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)
    q_sty     = ST("q", fontSize=10, spaceBefore=4, spaceAfter=1, leading=14)
    opt       = ST("o", fontSize=9, leftIndent=10, spaceAfter=1)
    ans       = ST("a", fontSize=9, leftIndent=10, textColor=colors.HexColor("#2e7d32"), spaceAfter=3)
    topic_sty = ST("tp", fontSize=7, leftIndent=10, textColor=colors.grey, spaceAfter=2)

    cell_w = (W - 3*cm) / 2  # 2 equal columns

    for section in paper.get("sections", []):
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph(
            f"{section.get('section_name','Section')} — {section.get('type','').replace('_',' ').title()}",
            sec_sty,
        ))
        if section.get("instructions"):
            story.append(Paragraph(f"<i>{section['instructions']}</i>", opt))

        if section.get("type") == "MCQ":
            # Build 2-column table
            qs = section.get("questions", [])
            cells = []
            for i, q in enumerate(qs):
                marks_txt = f"[{q.get('marks',1)}m]"
                cell_content = [Paragraph(f"<b>Q{i+1}.</b> {q.get('question','')} "
                                          f"<font color='grey' size='8'>{marks_txt}</font>", q_sty)]
                if q.get("options"):
                    for opt_txt in q["options"]:
                        cell_content.append(Paragraph(opt_txt, opt))
                if include_answer_key and q.get("answer"):
                    cell_content.append(Paragraph(f"<b>Ans:</b> {q['answer']}", ans))
                if q.get("topic"):
                    cell_content.append(Paragraph(f"Topic: {q['topic']}", topic_sty))
                cells.append(cell_content)

            # Pair into rows of 2
            rows = []
            for j in range(0, len(cells), 2):
                left = cells[j]
                right = cells[j+1] if j+1 < len(cells) else [""]
                rows.append([left, right])

            if rows:
                tbl = Table(rows, colWidths=[cell_w, cell_w])
                tbl.setStyle(TableStyle([
                    ("VALIGN", (0,0),(-1,-1), "TOP"),
                    ("LEFTPADDING", (0,0),(-1,-1), 4),
                    ("RIGHTPADDING", (0,0),(-1,-1), 4),
                    ("TOPPADDING", (0,0),(-1,-1), 4),
                    ("BOTTOMPADDING", (0,0),(-1,-1), 4),
                    ("LINEBELOW", (0,0),(-1,-2), 0.3, colors.lightgrey),
                ]))
                story.append(tbl)
        else:
            for i, q in enumerate(section.get("questions", []), 1):
                marks_txt = f"[{q.get('marks',1)}m]"
                story.append(Paragraph(
                    f"<b>Q{i}.</b> {q.get('question','')} <font color='grey' size='9'>{marks_txt}</font>",
                    q_sty,
                ))
                if include_answer_key and q.get("answer"):
                    story.append(Paragraph(f"<b>Answer:</b> {q['answer']}", ans))
                if q.get("topic"):
                    story.append(Paragraph(f"Topic: {q['topic']}", topic_sty))
                story.append(Spacer(1, 0.1*cm))

    doc.build(story)
    buf.seek(0)
    return buf.read()


# ─── TEMPLATE 4 · Compact ──────────────────────────────────────────────────────

def _tpl_compact(paper: dict, include_answer_key: bool) -> bytes:
    buf = io.BytesIO()
    doc = _build_doc(buf, margins=[1.5, 1.5, 1.5, 1.5])
    s = getSampleStyleSheet()
    ST = lambda name, **kw: ParagraphStyle(name, parent=s["Normal"], **kw)

    inst, tutor, board, grade, subj, total, dur, diff, topics = _header_text(paper)
    story = []

    hdr_parts = []
    if inst:
        hdr_parts.append(f"<b>{inst}</b> &nbsp;|&nbsp; ")
    hdr_parts.append(f"{board} Board &nbsp;|&nbsp; Grade {grade} &nbsp;|&nbsp; {subj}")
    if tutor:
        hdr_parts.append(f" &nbsp;|&nbsp; Tutor: {tutor}")
    story.append(Paragraph("".join(hdr_parts),
                            ST("h", alignment=TA_CENTER, fontSize=10, fontName="Helvetica-Bold", spaceAfter=2)))
    story.append(Paragraph(
        f"Total Marks: <b>{total}</b> &nbsp;|&nbsp; Duration: <b>{dur} min</b> &nbsp;|&nbsp; Difficulty: <b>{diff}</b>",
        ST("m", alignment=TA_CENTER, fontSize=9, spaceAfter=3),
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 0.2*cm))

    sec   = ST("sc", fontSize=9, fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=3)
    q_sty = ST("q", fontSize=9, spaceBefore=3, spaceAfter=1, leading=12)
    opt   = ST("o", fontSize=8, leftIndent=14, spaceAfter=0)
    ans   = ST("a", fontSize=8, leftIndent=14, textColor=colors.HexColor("#2e7d32"), spaceAfter=2)
    topic = ST("tp", fontSize=7, leftIndent=14, textColor=colors.grey, spaceAfter=2)

    _append_sections(story, paper, include_answer_key, sec, q_sty, opt, ans, topic,
                     spacer_h=0.08)
    doc.build(story)
    buf.seek(0)
    return buf.read()


# ─── TEMPLATE 5 · Modern ───────────────────────────────────────────────────────

def _tpl_modern(paper: dict, include_answer_key: bool) -> bytes:
    ACCENT = colors.HexColor("#4f46e5")   # indigo
    ACCENT_BG = colors.HexColor("#eef2ff")

    buf = io.BytesIO()
    doc = _build_doc(buf)
    s = getSampleStyleSheet()
    ST = lambda name, **kw: ParagraphStyle(name, parent=s["Normal"], **kw)

    inst, tutor, board, grade, subj, total, dur, diff, topics = _header_text(paper)
    story = []

    # Colored title banner
    banner_data = [[
        Paragraph(
            (f"<font size='16'><b>{inst}</b></font><br/>" if inst else "") +
            f"<font size='13'>{board} Board Examination</font><br/>"
            f"<font size='11'>Grade {grade} &nbsp;|&nbsp; {subj}"
            + (f" &nbsp;|&nbsp; Tutor: {tutor}" if tutor else "") + "</font>",
            ST("bh", textColor=colors.white, alignment=TA_CENTER, leading=22),
        ),
        Paragraph(
            f"<font color='white'><b>Total Marks</b><br/><font size='22'>{total}</font></font>",
            ST("bm", textColor=colors.white, alignment=TA_CENTER, leading=24),
        ),
    ]]
    banner = Table(banner_data, colWidths=[13*cm, 4*cm])
    banner.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), ACCENT),
        ("VALIGN", (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0),(-1,-1), 14),
        ("BOTTOMPADDING", (0,0),(-1,-1), 14),
        ("LEFTPADDING", (0,0),(-1,-1), 12),
        ("LINEAFTER", (0,0),(0,-1), 1, colors.white),
    ]))
    story += [banner, Spacer(1, 0.2*cm)]

    meta_data = [[f"Duration: {dur} min", f"Difficulty: {diff}", f"Topics: {topics}"]]
    meta = Table(meta_data, colWidths=[5*cm, 5*cm, 7*cm])
    meta.setStyle(TableStyle([
        ("FONTSIZE",(0,0),(-1,-1),9),
        ("BACKGROUND",(0,0),(-1,-1), ACCENT_BG),
        ("TOPPADDING",(0,0),(-1,-1),5),
        ("BOTTOMPADDING",(0,0),(-1,-1),5),
        ("LEFTPADDING",(0,0),(-1,-1),8),
    ]))
    story += [meta, Spacer(1, 0.3*cm), _student_info_block(s)]

    q_sty  = ST("q", fontSize=11, spaceBefore=5, spaceAfter=2, leading=15)
    opt    = ST("o", fontSize=10, leftIndent=18, spaceAfter=1)
    ans    = ST("a", fontSize=10, leftIndent=18, textColor=colors.HexColor("#166534"), spaceAfter=4)
    topic  = ST("tp", fontSize=8, leftIndent=18, textColor=colors.grey, spaceAfter=3)

    for section in paper.get("sections", []):
        story.append(Spacer(1, 0.4*cm))
        # Colored section header
        sec_hdr = Table([[
            Paragraph(
                f"{section.get('section_name','Section')} — {section.get('type','').replace('_',' ').title()}",
                ST("sh", fontSize=11, fontName="Helvetica-Bold", textColor=colors.white),
            )
        ]], colWidths=[17*cm])
        sec_hdr.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1), ACCENT),
            ("TOPPADDING",(0,0),(-1,-1),6),
            ("BOTTOMPADDING",(0,0),(-1,-1),6),
            ("LEFTPADDING",(0,0),(-1,-1),10),
        ]))
        story.append(sec_hdr)
        if section.get("instructions"):
            story.append(Paragraph(f"<i>{section['instructions']}</i>",
                                   ST("si", fontSize=9, leftIndent=8, spaceAfter=4)))
        story.append(Spacer(1, 0.2*cm))

        for i, q in enumerate(section.get("questions", []), 1):
            marks_txt = f"[{q.get('marks',1)}m]"
            story.append(Paragraph(
                f"<b>Q{i}.</b> {q.get('question','')} <font color='grey' size='9'>{marks_txt}</font>",
                q_sty,
            ))
            if q.get("options"):
                for opt_txt in q["options"]:
                    story.append(Paragraph(opt_txt, opt))
            if include_answer_key and q.get("answer"):
                story.append(Paragraph(f"<b>Answer:</b> {q['answer']}", ans))
            if q.get("topic"):
                story.append(Paragraph(f"Topic: {q['topic']}", topic))
            story.append(Spacer(1, 0.12*cm))

    doc.build(story)
    buf.seek(0)
    return buf.read()


# ─── TEMPLATE 6 · Classic (university / LaTeX-style) ──────────────────────────

def _tpl_classic(paper: dict, include_answer_key: bool) -> bytes:
    buf = io.BytesIO()
    doc = _build_doc(buf)
    s = getSampleStyleSheet()
    ST = lambda name, **kw: ParagraphStyle(name, parent=s["Normal"], fontName="Times-Roman", **kw)

    inst, tutor, board, grade, subj, total, dur, diff, topics = _header_text(paper)
    story = []

    story.append(HRFlowable(width="100%", thickness=2, color=colors.black))
    story.append(Spacer(1, 0.15*cm))
    if inst:
        story.append(Paragraph(inst,
            ST("i", alignment=TA_CENTER, fontSize=16, fontName="Times-Bold", spaceAfter=2)))
    story.append(Paragraph(f"{board} Board Examination",
        ST("t", alignment=TA_CENTER, fontSize=14, fontName="Times-Bold", spaceAfter=2)))
    story.append(Paragraph(f"Grade {grade}  —  {subj}",
        ST("s", alignment=TA_CENTER, fontSize=12, spaceAfter=2)))
    if tutor:
        story.append(Paragraph(f"Examiner: {tutor}",
            ST("tu", alignment=TA_CENTER, fontSize=10, spaceAfter=2)))
    story.append(Spacer(1, 0.1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 0.15*cm))

    meta = Table([
        [f"Maximum Marks: {total}", f"Time Allowed: {dur} Minutes", f"Difficulty: {diff}"]
    ], colWidths=[6*cm, 6*cm, 5*cm])
    meta.setStyle(TableStyle([
        ("FONTNAME",(0,0),(-1,-1),"Times-Roman"),
        ("FONTSIZE",(0,0),(-1,-1),10),
        ("ALIGN",(0,0),(-1,-1),"CENTER"),
        ("TOPPADDING",(0,0),(-1,-1),4),
        ("BOTTOMPADDING",(0,0),(-1,-1),4),
    ]))
    story += [meta, Spacer(1, 0.1*cm),
              HRFlowable(width="100%", thickness=2, color=colors.black),
              Spacer(1, 0.2*cm), _student_info_block(s), Spacer(1, 0.2*cm)]

    story.append(Paragraph("<b>Instructions:</b> Answer all questions. "
                           "Marks are shown in brackets. Write legibly.",
                           ST("inst", fontSize=10, spaceAfter=6)))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black))

    sec   = ST("sc", fontSize=12, fontName="Times-Bold", spaceBefore=12, spaceAfter=6)
    q_sty = ST("q", fontSize=11, spaceBefore=5, spaceAfter=2, leading=15)
    opt   = ST("o", fontSize=10, leftIndent=20, spaceAfter=1)
    ans   = ST("a", fontSize=10, leftIndent=20, textColor=colors.HexColor("#1b5e20"), spaceAfter=4)
    topic = ST("tp", fontSize=8, leftIndent=20, textColor=colors.grey, spaceAfter=3)

    for section in paper.get("sections", []):
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph(
            f"{section.get('section_name','Section')}  —  {section.get('type','').replace('_',' ').title()}",
            sec,
        ))
        if section.get("instructions"):
            story.append(Paragraph(f"({section['instructions']})", opt))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black))
        story.append(Spacer(1, 0.1*cm))

        for i, q in enumerate(section.get("questions", []), 1):
            marks_val = q.get("marks", 1)
            story.append(Paragraph(
                f"<b>{i}.</b>&nbsp;&nbsp;{q.get('question','')}",
                q_sty,
            ))
            # Marks right-aligned
            marks_row = Table([[" ", f"[{marks_val} {'mark' if marks_val==1 else 'marks'}]"]],
                              colWidths=[14*cm, 3*cm])
            marks_row.setStyle(TableStyle([
                ("FONTNAME",(0,0),(-1,-1),"Times-Roman"),
                ("FONTSIZE",(0,0),(-1,-1),9),
                ("ALIGN",(1,0),(1,-1),"RIGHT"),
                ("TOPPADDING",(0,0),(-1,-1),0),
                ("BOTTOMPADDING",(0,0),(-1,-1),0),
            ]))
            story.append(marks_row)

            if q.get("options"):
                for opt_txt in q["options"]:
                    story.append(Paragraph(opt_txt, opt))
            if include_answer_key and q.get("answer"):
                story.append(Paragraph(f"\\[Answer: {q['answer']}\\]", ans))
            if q.get("topic"):
                story.append(Paragraph(f"[Topic: {q['topic']}]", topic))
            story.append(HRFlowable(width="100%", thickness=0.3, color=colors.lightgrey))
            story.append(Spacer(1, 0.05*cm))

    doc.build(story)
    buf.seek(0)
    return buf.read()


# ─── shared section renderer ───────────────────────────────────────────────────

def _append_sections(story, paper, include_answer_key, sec, q_sty, opt, ans, topic, spacer_h=0.15):
    for section in paper.get("sections", []):
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph(
            f"{section.get('section_name','Section')} — {section.get('type','').replace('_',' ').title()}",
            sec,
        ))
        if section.get("instructions"):
            story.append(Paragraph(f"<i>{section['instructions']}</i>", opt))
        story.append(Spacer(1, 0.2*cm))

        for i, q in enumerate(section.get("questions", []), 1):
            marks_val = q.get("marks", 1)
            marks_txt = f"[{marks_val} {'mark' if marks_val==1 else 'marks'}]"
            story.append(Paragraph(
                f"<b>Q{i}.</b> {q.get('question','')} <font color='grey' size='9'>{marks_txt}</font>",
                q_sty,
            ))
            if q.get("options"):
                for opt_txt in q["options"]:
                    story.append(Paragraph(opt_txt, opt))
            if include_answer_key and q.get("answer"):
                story.append(Paragraph(f"<b>Answer:</b> {q['answer']}", ans))
            if q.get("topic"):
                story.append(Paragraph(f"Topic: {q['topic']}", topic))
            story.append(Spacer(1, spacer_h * cm))


# ─── public API ────────────────────────────────────────────────────────────────

TEMPLATES = {
    "standard":    _tpl_standard,
    "professional": _tpl_professional,
    "two_column":  _tpl_two_column,
    "compact":     _tpl_compact,
    "modern":      _tpl_modern,
    "classic":     _tpl_classic,
}


def generate_pdf(paper_data: dict, include_answer_key: bool = False,
                 template: str = "standard") -> bytes:
    fn = TEMPLATES.get(template, _tpl_standard)
    return fn(paper_data, include_answer_key)
