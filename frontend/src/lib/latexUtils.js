// ─── Shared LaTeX generation utilities ───────────────────────────────────────

export const LATEX_FORMATS = [
  {
    id: 'cbse',
    label: 'CBSE Standard',
    emoji: '🏫',
    desc: 'Formal sections (A, B, C), general instructions, board-exam style with header & footer',
  },
  {
    id: 'jee',
    label: 'JEE / NEET',
    emoji: '🔬',
    desc: 'Compact competitive-exam layout, MCQ-focused, two-column options, single-column questions',
  },
  {
    id: 'olympiad',
    label: 'Olympiad',
    emoji: '🏆',
    desc: 'Elegant serif style, marks shown per question, dotted lines, olympiad aesthetic',
  },
  {
    id: 'coaching',
    label: 'Coaching Institute',
    emoji: '📚',
    desc: 'Practice-set format, framed header, MCQ options in grid, answer key appended at end',
  },
  {
    id: 'simple',
    label: 'Simple & Clean',
    emoji: '📄',
    desc: 'Minimal classic academic layout, answer-space below each question, three clear parts',
  },
];

export function esc(text) {
  return String(text || '').replace(/&/g, '\\&').replace(/%/g, '\\%');
}

export function mcqOptionsTabular(options) {
  const valid = options.filter(o => o && o.trim());
  const letters = ['(A)', '(B)', '(C)', '(D)'];
  if (valid.length === 0) return '';
  const rows = [];
  for (let i = 0; i < valid.length; i += 2) {
    const left  = `${letters[i]}~${esc(valid[i])}`;
    const right = valid[i + 1] ? `${letters[i + 1]}~${esc(valid[i + 1])}` : '';
    rows.push(`  ${left} & ${right} \\\\`);
  }
  return `\\begin{tabular}{p{0.45\\textwidth}p{0.45\\textwidth}}\n${rows.join('\n')}\n\\end{tabular}`;
}

export function mcqOptionsEnumerate(options) {
  const valid = options.filter(o => o && o.trim());
  if (valid.length === 0) return '';
  return `\\begin{enumerate}[label=(\\Alph*),noitemsep]\n${valid.map(o => `  \\item ${esc(o)}`).join('\n')}\n\\end{enumerate}`;
}

export function generateLatex(paperData, formatId) {
  const { metadata, questions, title } = paperData;
  const inst      = esc(metadata.instituteName || 'Institution Name');
  const teacher   = esc(metadata.teacherName   || '');
  const subject   = esc(metadata.subject       || 'Subject');
  const cls       = esc(metadata.className     || 'Class X');
  const maxMarks  = metadata.maxMarks          || 80;
  const time      = esc(metadata.timeDuration  || '3 Hours');
  const examTitle = esc(title                  || 'Question Paper');

  // ── CBSE Standard ────────────────────────────────────────────────────────────
  if (formatId === 'cbse') {
    const mcqs  = questions.filter(q => q.type === 'MCQ');
    const tfs   = questions.filter(q => q.type === 'True/False');
    const subjs = questions.filter(q => q.type === 'Subjective');
    const sectionLetters = ['A', 'B', 'C', 'D'];
    let sIdx = 0;
    let sections = '';

    if (mcqs.length) {
      sections += `
\\section*{Section ${sectionLetters[sIdx++]}: Multiple Choice Questions}
\\textit{Each question carries 1 mark. Choose the correct option.}
\\begin{enumerate}[label=\\textbf{Q.\\arabic*.},leftmargin=*]
${mcqs.map(q => `\\item ${esc(q.question)} \\hfill \\textbf{[${q.marks}M]}\n${mcqOptionsEnumerate(q.options)}`).join('\n\n')}
\\end{enumerate}`;
    }
    if (tfs.length) {
      sections += `
\\section*{Section ${sectionLetters[sIdx++]}: True or False}
\\textit{State whether the following statements are True or False.}
\\begin{enumerate}[label=\\textbf{Q.\\arabic*.},leftmargin=*,resume]
${tfs.map(q => `\\item ${esc(q.question)} \\hfill \\textbf{[${q.marks}M]}\n\\quad\\underline{\\hspace{3cm}}`).join('\n\n')}
\\end{enumerate}`;
    }
    if (subjs.length) {
      sections += `
\\section*{Section ${sectionLetters[sIdx++]}: Answer the Following}
\\begin{enumerate}[label=\\textbf{Q.\\arabic*.},leftmargin=*,resume]
${subjs.map(q => `\\item ${esc(q.question)} \\hfill \\textbf{[${q.marks}M]}`).join('\n\n')}
\\end{enumerate}`;
    }

    return `\\documentclass[12pt,a4paper]{article}
\\usepackage{amsmath,amssymb,enumitem,geometry,fancyhdr,titlesec}
\\geometry{top=2cm,bottom=2cm,left=2.5cm,right=2.5cm}
\\pagestyle{fancy}
\\fancyhf{}
\\lhead{${inst}}
\\rhead{${subject} $|$ ${cls}}
\\cfoot{\\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}

\\begin{document}

\\begin{center}
  {\\Large\\textbf{${inst}}}\\\\[4pt]
  {\\large\\textbf{${examTitle}}}\\\\[2pt]
  {\\normalsize Subject: ${subject} \\quad Class: ${cls}}\\\\[2pt]
  {\\normalsize Time Allowed: ${time} \\quad Maximum Marks: ${maxMarks}}${teacher ? `\\\\[2pt]{\\small Teacher: ${teacher}}` : ''}
\\end{center}
\\hrule
\\vspace{6pt}
\\noindent\\textbf{General Instructions:}
\\begin{itemize}[noitemsep]
  \\item All questions are compulsory.
  \\item Write neatly. Marks for each question are shown in brackets.
  \\item No marks will be awarded for incomplete solutions.
\\end{itemize}
\\vspace{8pt}
${sections}

\\end{document}`;
  }

  // ── JEE / NEET ────────────────────────────────────────────────────────────
  if (formatId === 'jee') {
    const allQ = questions;
    const qBody = allQ.map((q, i) => {
      const num = i + 1;
      if (q.type === 'MCQ') {
        return `\\item[${num}.] ${esc(q.question)}\n${mcqOptionsTabular(q.options)}`;
      }
      if (q.type === 'True/False') {
        return `\\item[${num}.] ${esc(q.question)}\\quad (A)~True\\quad (B)~False`;
      }
      return `\\item[${num}.] ${esc(q.question)}\\hfill\\textbf{[${q.marks}M]}`;
    }).join('\n\n');

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage{amsmath,amssymb,enumitem,geometry,fancyhdr,array}
\\geometry{top=1.5cm,bottom=1.5cm,left=2cm,right=2cm}
\\pagestyle{fancy}
\\fancyhf{}
\\lhead{\\textbf{${inst}}}
\\rhead{${subject} $|$ Time: ${time} $|$ Marks: ${maxMarks}}
\\cfoot{Page~\\thepage}
\\setlength{\\parskip}{0pt}

\\begin{document}

\\begin{center}
  {\\Large\\textbf{${examTitle}}}\\\\[3pt]
  {\\normalsize ${inst}}\\\\[2pt]
  {\\small Subject: ${subject} \\quad Class: ${cls} \\quad Time: ${time} \\quad Max.~Marks: ${maxMarks}}
\\end{center}
\\noindent\\rule{\\textwidth}{0.6pt}
\\vspace{2pt}

\\noindent\\textbf{Instructions:} This paper contains ${allQ.length} questions.
For MCQs only one option is correct unless stated otherwise. Attempt all questions.

\\vspace{6pt}
\\begin{description}[leftmargin=2em,itemsep=10pt]
${qBody}
\\end{description}

\\end{document}`;
  }

  // ── Olympiad ─────────────────────────────────────────────────────────────
  if (formatId === 'olympiad') {
    const totalPts = questions.reduce((s, q) => s + (parseInt(q.marks) || 1), 0);
    const qBody = questions.map((q, i) => {
      const num = i + 1;
      const pts = `\\textbf{${q.marks}~pt${q.marks > 1 ? 's' : ''}}`;
      const base = `\\item[${num}.] ${esc(q.question)}\\dotfill ${pts}`;
      if (q.type === 'MCQ') {
        return `${base}\n${mcqOptionsEnumerate(q.options)}`;
      }
      if (q.type === 'True/False') {
        return `${base}\n  \\quad Circle one: \\underline{~True~} / \\underline{~False~}`;
      }
      return base;
    }).join('\n\n');

    return `\\documentclass[12pt,a4paper]{article}
\\usepackage{amsmath,amssymb,enumitem,geometry,fancyhdr}
\\geometry{top=2cm,bottom=2cm,left=2.5cm,right=2.5cm}
\\pagestyle{fancy}
\\fancyhf{}
\\lhead{${inst}}
\\rhead{${subject} Olympiad}
\\cfoot{\\thepage}

\\begin{document}

\\begin{center}
  \\rule{\\textwidth}{1.5pt}\\\\[6pt]
  {\\LARGE\\textbf{${inst}}}\\\\[4pt]
  {\\Large\\textit{${examTitle}}}\\\\[4pt]
  {\\normalsize ${subject} $\\bullet$ ${cls} $\\bullet$ Total Points: ${totalPts}}\\\\[2pt]
  {\\normalsize Time Allowed: ${time}}${teacher ? `\\\\[2pt]{\\small Prepared by: ${teacher}}` : ''}\\\\[6pt]
  \\rule{\\textwidth}{1.5pt}
\\end{center}
\\vspace{1cm}

\\begin{description}[style=nextline,leftmargin=0pt,itemsep=12pt]
${qBody}
\\end{description}

\\vspace{2cm}
\\noindent\\rule{\\textwidth}{0.4pt}\\\\
\\textit{All the best! Show all working for full credit.}

\\end{document}`;
  }

  // ── Coaching Institute ────────────────────────────────────────────────────
  if (formatId === 'coaching') {
    const qBody = questions.map((q, i) => {
      const num = i + 1;
      if (q.type === 'MCQ') {
        return `\\item[${num}.] ${esc(q.question)}\\hfill\\textbf{[${q.marks}M]}\n${mcqOptionsTabular(q.options)}`;
      }
      if (q.type === 'True/False') {
        return `\\item[${num}.] ${esc(q.question)}\\hfill\\textbf{[${q.marks}M]}\n  \\quad [ \\quad True \\quad / \\quad False \\quad ]`;
      }
      return `\\item[${num}.] ${esc(q.question)}\\hfill\\textbf{[${q.marks}M]}\n  \\vspace{2cm}`;
    }).join('\n\n');

    const mcqAnsKey = questions
      .filter(q => q.type === 'MCQ' && q.answer)
      .map((q, i) => `Q${i + 1}:~${q.answer}`)
      .join(',\\quad ');

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage{amsmath,amssymb,enumitem,geometry,fancyhdr,array,framed}
\\geometry{top=1.8cm,bottom=2.5cm,left=2cm,right=2cm}
\\pagestyle{fancy}
\\fancyhf{}
\\lhead{\\textbf{${inst}}}
\\rhead{${subject} $|$ ${cls}}
\\lfoot{\\textit{Practice Set}}
\\cfoot{\\thepage}
\\rfoot{${time} $|$ ${maxMarks}~Marks}
\\renewcommand{\\headrulewidth}{0.5pt}
\\renewcommand{\\footrulewidth}{0.5pt}

\\begin{document}

\\begin{framed}
\\centering
\\textbf{\\large ${inst}}\\\\
\\textbf{Practice Set --- ${subject}}\\\\
\\textit{Class: ${cls} \\quad Time: ${time} \\quad Max Marks: ${maxMarks}}
\\end{framed}
\\vspace{6pt}

\\begin{description}[leftmargin=3em,itemsep=10pt]
${qBody}
\\end{description}
${mcqAnsKey ? `
\\vspace{1cm}
\\noindent\\rule{\\textwidth}{0.4pt}\\\\
\\textbf{Answer Key (MCQs):} ${mcqAnsKey}` : ''}

\\end{document}`;
  }

  // ── Simple & Clean ────────────────────────────────────────────────────────
  if (formatId === 'simple') {
    const mcqs  = questions.filter(q => q.type === 'MCQ');
    const tfs   = questions.filter(q => q.type === 'True/False');
    const subjs = questions.filter(q => q.type === 'Subjective');

    let body = '';
    if (mcqs.length) {
      body += `\\section*{Part~I: Multiple Choice Questions}\n\\begin{enumerate}[label=\\arabic*.,leftmargin=*,itemsep=8pt]\n`;
      body += mcqs.map(q => {
        const opts = q.options.filter(o => o && o.trim());
        const letters = ['(a)', '(b)', '(c)', '(d)'];
        const row = opts.map((o, i) => `${letters[i]}~${esc(o)}`).join(' & ');
        return `\\item ${esc(q.question)}\\hfill\\textbf{[${q.marks}M]}\n  \\begin{tabular}{llll}\n  ${row}\n  \\end{tabular}`;
      }).join('\n\n');
      body += '\n\\end{enumerate}\n';
    }
    if (tfs.length) {
      body += `\\section*{Part~II: True or False}\n\\begin{enumerate}[label=\\arabic*.,leftmargin=*,itemsep=8pt]\n`;
      body += tfs.map(q => `\\item ${esc(q.question)}\\hfill\\textbf{[${q.marks}M]}\n  \\quad\\underline{\\hspace{4cm}}`).join('\n\n');
      body += '\n\\end{enumerate}\n';
    }
    if (subjs.length) {
      body += `\\section*{Part~III: Answer in Detail}\n\\begin{enumerate}[label=\\arabic*.,leftmargin=*,itemsep=16pt]\n`;
      body += subjs.map(q => `\\item ${esc(q.question)}\\hfill\\textbf{[${q.marks}M]}\n  \\vspace{3cm}`).join('\n\n');
      body += '\n\\end{enumerate}\n';
    }

    return `\\documentclass[12pt,a4paper]{article}
\\usepackage{amsmath,amssymb,enumitem,geometry,fancyhdr,array}
\\geometry{top=2.5cm,bottom=2.5cm,left=2.5cm,right=2.5cm}
\\pagestyle{fancy}
\\fancyhf{}
\\lhead{${inst}}
\\chead{${examTitle}}
\\rhead{Max Marks: ${maxMarks}}
\\cfoot{\\thepage}

\\begin{document}

\\begin{center}
  {\\Large\\textbf{${inst}}}\\\\[6pt]
  {\\large ${examTitle}}\\\\[4pt]
  {\\normalsize Subject: ${subject} \\quad Class: ${cls}}\\\\[2pt]
  {\\normalsize Time: ${time} \\quad Maximum Marks: ${maxMarks}}${teacher ? `\\\\[2pt]{\\small Examiner: ${teacher}}` : ''}
\\end{center}
\\vspace{0.5cm}
\\hrule
\\vspace{0.5cm}

${body}

\\end{document}`;
  }

  return '% Unknown format';
}

export function downloadLatexFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
