import { useRef } from 'react';
import katex from 'katex';


const KATEX_OPTS_INLINE   = { displayMode: false, throwOnError: false, strict: false };
const KATEX_OPTS_DISPLAY  = { displayMode: true,  throwOnError: false, strict: false };

function inlineKatex(latex) {
  try { return katex.renderToString(latex.trim(), KATEX_OPTS_INLINE); }
  catch { return latex; }
}

function displayKatex(latex) {
  try {
    return `<span style="display:block;text-align:center;margin:10px 0;overflow-x:auto">${
      katex.renderToString(latex.trim(), KATEX_OPTS_DISPLAY)
    }</span>`;
  } catch { return latex; }
}

// Converts Unicode / bare-LaTeX math patterns to properly delimited $...$ / $$...$$ blocks.
// Uses null-byte placeholders so already-processed math is never double-processed.
function autoWrapMath(text) {
  if (!text) return text;

  // Placeholder registry — key is \x00M<n>\x00, value is the final $...$  string
  const vault = [];
  const lock   = (inner, display = false) => {
    const delim = display ? '$$' : '$';
    vault.push(`${delim}${inner}${delim}`);
    return `\x00M${vault.length - 1}\x00`;
  };
  const restore = s => s.replace(/\x00M(\d+)\x00/g, (_, i) => vault[+i]);

  // Protect existing delimited math FIRST so later steps never touch it
  let s = text
    .replace(/\$\$([\s\S]+?)\$\$/g,   (_, m) => lock(m, true))
    .replace(/\$([^$\n]+?)\$/g,        (_, m) => lock(m))
    .replace(/\\\[([\s\S]+?)\\\]/g,    (_, m) => { vault.push(`\\[${m}\\]`); return `\x00M${vault.length-1}\x00`; })
    .replace(/\\\((.+?)\\\)/g,         (_, m) => { vault.push(`\\(${m}\\)`); return `\x00M${vault.length-1}\x00`; });

  // Helper: convert common Unicode inside limit strings to LaTeX without $ wrappers
  const uniLimits = t => t.trim()
    .replace(/π/g,'\\pi').replace(/∞/g,'\\infty').replace(/α/g,'\\alpha')
    .replace(/β/g,'\\beta').replace(/θ/g,'\\theta').replace(/ω/g,'\\omega')
    .replace(/²/g,'^{2}').replace(/³/g,'^{3}').replace(/⁴/g,'^{4}');

  // ── 1. Unicode integral with bracket limits:  ∫[0,π/2]  ∫[a,b] ──────────────
  s = s.replace(/∫\s*\[\s*([^,\]]+?)\s*,\s*([^\]]+?)\s*\]/g,
    (_, lo, hi) => lock(`\\int_{${uniLimits(lo)}}^{${uniLimits(hi)}}`));

  // ── 2. Unicode integral with _{}^{} limits:  ∫_{0}^{1} ───────────────────────
  s = s.replace(/∫\s*_\{([^}]+)\}\s*\^\{([^}]+)\}/g,
    (_, lo, hi) => lock(`\\int_{${uniLimits(lo)}}^{${uniLimits(hi)}}`));
  s = s.replace(/∫\s*\^\{([^}]+)\}\s*_\{([^}]+)\}/g,
    (_, hi, lo) => lock(`\\int_{${uniLimits(lo)}}^{${uniLimits(hi)}}`));

  // ── 3. Bare Unicode ∫ ─────────────────────────────────────────────────────────
  s = s.replace(/∫/g, () => lock('\\int'));

  // ── 4. Bare \frac{a}{b} and \sqrt{...} without $ wrapper ─────────────────────
  s = s.replace(/\\frac\{[^}]+\}\{[^}]+\}/g,          m => lock(m));
  s = s.replace(/\\sqrt(?:\[[^\]]+\])?\{[^}]+\}/g,    m => lock(m));

  // ── 5. \int / \sum / \prod with optional _{} ^{} limits ──────────────────────
  s = s.replace(/\\(int|iint|oint|sum|prod|lim)(?:_\{[^}]+\})?(?:\^\{[^}]+\})?(?:\^\{[^}]+\})?(?:_\{[^}]+\})?/g,
    m => lock(m));

  // ── 6. Bare Greek / math commands ────────────────────────────────────────────
  s = s.replace(/\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|pi|infty|partial|nabla|pm|mp|cdot|times|div|leq|geq|neq|approx|equiv|in|notin|subset|supset|forall|exists|to|rightarrow|leftarrow|sin|cos|tan|sec|csc|cot|log|ln)\b/g,
    m => lock(m));

  // ── 7. Trig with Unicode superscript: sin²x  cos³θ ───────────────────────────
  const SUP = { '²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁰':'0','¹':'1' };
  const SUP_PAT = '[²³⁴⁵⁶⁷⁸⁹⁰¹]';
  s = s.replace(
    new RegExp(`(sin|cos|tan|sec|csc|cosec|cot|log|ln)(${SUP_PAT})`, 'g'),
    (_, fn, sup) => lock(`\\${fn === 'cosec' ? 'csc' : fn}^{${SUP[sup]}}`));

  // ── 8. Generic Unicode superscripts:  x²  n³  ────────────────────────────────
  s = s.replace(new RegExp(`([a-zA-Z][a-zA-Z0-9']*|\\d+)(${SUP_PAT})`, 'g'),
    (_, base, sup) => lock(`${base}^{${SUP[sup]}}`));

  // ── 9. Unicode Greek letters and math symbols → $\cmd$ ───────────────────────
  const UNI = {
    'π':'\\pi','α':'\\alpha','β':'\\beta','γ':'\\gamma','δ':'\\delta',
    'ε':'\\epsilon','ζ':'\\zeta','η':'\\eta','θ':'\\theta','κ':'\\kappa',
    'λ':'\\lambda','μ':'\\mu','ν':'\\nu','ξ':'\\xi','ρ':'\\rho',
    'σ':'\\sigma','τ':'\\tau','φ':'\\phi','χ':'\\chi','ψ':'\\psi','ω':'\\omega',
    'Γ':'\\Gamma','Δ':'\\Delta','Θ':'\\Theta','Λ':'\\Lambda','Ξ':'\\Xi',
    'Σ':'\\Sigma','Φ':'\\Phi','Ψ':'\\Psi','Ω':'\\Omega',
    '∞':'\\infty','∑':'\\sum','∏':'\\prod','∂':'\\partial','∇':'\\nabla',
    '±':'\\pm','∓':'\\mp','×':'\\times','÷':'\\div',
    '≤':'\\leq','≥':'\\geq','≠':'\\neq','≈':'\\approx',
    '→':'\\to','←':'\\leftarrow','↔':'\\leftrightarrow',
    '∈':'\\in','∉':'\\notin','⊂':'\\subset','⊃':'\\supset',
    '∀':'\\forall','∃':'\\exists',
  };
  for (const [uni, cmd] of Object.entries(UNI)) {
    s = s.replace(new RegExp(uni, 'g'), () => lock(cmd));
  }

  // ── 10. Unicode √ ─────────────────────────────────────────────────────────────
  s = s.replace(/√\(([^)]+)\)/g, (_, e) => lock(`\\sqrt{${e}}`));
  s = s.replace(/√([a-zA-Z0-9.]+)/g, (_, e) => lock(`\\sqrt{${e}}`));
  s = s.replace(/√/g, () => lock('\\sqrt{}'));

  // ── 11. x^{n}, x^(n), x^n ────────────────────────────────────────────────────
  s = s.replace(/([a-zA-Z][a-zA-Z0-9']*|\d+)\^\{([^}]+)\}/g, (_, b, e) => lock(`${b}^{${e}}`));
  s = s.replace(/([a-zA-Z][a-zA-Z0-9']*|\d+)\^\(([^)]+)\)/g, (_, b, e) => lock(`${b}^{${e}}`));
  s = s.replace(/([a-zA-Z][a-zA-Z0-9']*|\d+)\^([0-9]+)/g,    (_, b, e) => lock(`${b}^{${e}}`));

  // ── 12. Subscripts: x_n  x_{n+1} ─────────────────────────────────────────────
  s = s.replace(/([a-zA-Z])\{_\}([0-9a-zA-Z]+)/g,   (_, b, e) => lock(`${b}_{${e}}`));
  s = s.replace(/([a-zA-Z])\{_\{([^}]+)\}\}/g,       (_, b, e) => lock(`${b}_{${e}}`));

  return restore(s);
}

// Render a string that may contain LaTeX math delimiters ($, $$, \[, \() into HTML.
function renderLatex(text) {
  if (!text) return '';
  const processed = autoWrapMath(text);

  return processed
    .replace(/\$\$([\s\S]+?)\$\$/g,   (_, m) => displayKatex(m))
    .replace(/\\\[([\s\S]+?)\\\]/g,   (_, m) => displayKatex(m))
    .replace(/\$([^$\n]+?)\$/g,        (_, m) => inlineKatex(m))
    .replace(/\\\((.+?)\\\)/g,         (_, m) => inlineKatex(m));
}

export default function PdfPreview({ paperData, showAnswers = false, showWatermark = false, logoUrl = null }) {
  const { metadata = {}, questions = [], template = {} } = paperData || {};
  const previewRef = useRef(null);

  const accentColor = template.accentColor || '#1a365d';
  const fontFamily = template.fontFamily || 'Times New Roman';
  const layout = template.layoutTemplate || 'classic';

  const isMultiCol  = layout === 'two-column' || layout === 'newspaper';
  const qFontSize   = layout === 'newspaper' ? 11 : 12;
  const qLineHeight = layout === 'newspaper' ? 1.5 : 1.7;
  const qGap        = isMultiCol ? 10 : 14;

  function cleanOption(opt) {
    // Strip leading "A. ", "A) ", "a. " etc. added by the AI so we don't double-render the letter
    return (opt || '').replace(/^[A-Da-d][.)]\s*/, '');
  }

  function renderOptions(q) {
    if (q.type !== 'MCQ' || !q.options) return null;

    // compact — all 4 options on one horizontal line
    if (layout === 'compact') {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 18px', fontSize: 11, color: '#333', marginTop: 6 }}>
          {q.options.map((opt, i) => (
            <span key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + i)})</span>
              <span dangerouslySetInnerHTML={{ __html: renderLatex(cleanOption(opt)) }} />
            </span>
          ))}
        </div>
      );
    }

    // newspaper — vertical single-column list
    if (layout === 'newspaper') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, color: '#333', marginTop: 4 }}>
          {q.options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 5 }}>
              <span style={{ minWidth: 16, fontWeight: 600 }}>{String.fromCharCode(65 + i)})</span>
              <span dangerouslySetInnerHTML={{ __html: renderLatex(cleanOption(opt)) }} />
            </div>
          ))}
        </div>
      );
    }

    // classic / two-column / boxed — 2×2 grid
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: 11, color: '#333', marginTop: 6 }}>
        {q.options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ minWidth: 16, fontWeight: 600, alignSelf: 'flex-start', paddingTop: '0.15em' }}>{String.fromCharCode(65 + i)})</span>
            <span style={{ display: 'inline-block', verticalAlign: 'middle', lineHeight: 'normal' }} dangerouslySetInnerHTML={{ __html: renderLatex(opt) }} />
          </div>
        ))}
      </div>
    );
  }

  function renderQuestion(q, qi = 0) {
    const boxed = layout === 'boxed';
    const wrapStyle = boxed
      ? { marginBottom: qGap, display: 'flex', gap: 8, border: `1px solid ${accentColor}33`, borderLeft: `3px solid ${accentColor}`, borderRadius: 5, padding: '8px 10px', background: '#fafbff' }
      : { marginBottom: qGap, display: 'flex', gap: 8 };

    return (
      <div key={q.id || qi} className="pdf-question" style={wrapStyle}>
        <div style={{ minWidth: 22, fontWeight: 'bold', fontSize: qFontSize }}>{qi + 1}.</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: qFontSize, lineHeight: qLineHeight, marginBottom: 6 }}
            dangerouslySetInnerHTML={{ __html: renderLatex(q.question) }} />

          {renderOptions(q)}

          {q.type === 'True/False' && (
            <div style={{ display: 'flex', gap: 20, fontSize: 11, marginTop: 4 }}>
              <span style={{ border: '1px solid #999', padding: '1px 16px', borderRadius: 3 }}>True</span>
              <span style={{ border: '1px solid #999', padding: '1px 16px', borderRadius: 3 }}>False</span>
            </div>
          )}

          {(q.type === 'Subjective' || q.type === 'short_answer' || q.type === 'long_answer') && !q.answer && (
            <div style={{ marginTop: 8, height: Math.max(40, (q.marks || 2) * 12) }}>
              {[...Array(Math.max(3, Math.floor((q.marks || 2) * 1.5)))].map((_, li) => (
                <div key={li} style={{ borderBottom: '1px dashed #e5e5e5', height: 24 }} />
              ))}
            </div>
          )}

          {showAnswers && q.answer && (
            <div style={{ marginTop: 6, padding: '4px 8px', background: '#f0fdf4', borderLeft: '3px solid #16a34a', borderRadius: 3, fontSize: 11, color: '#15803d' }}>
              <strong>Ans:</strong> <span dangerouslySetInnerHTML={{ __html: renderLatex(q.answer) }} />
            </div>
          )}

          {q.imageUrl && (
            <img src={q.imageUrl} alt={`Q${qi + 1} diagram`}
              style={{ maxWidth: 280, maxHeight: 180, marginTop: 8, border: '1px solid #ddd', borderRadius: 4 }} />
          )}

          <div style={{ textAlign: 'right', fontSize: 10, color: '#666', marginTop: 4, fontStyle: 'italic' }}>
            [{q.marks || 1} mark{(q.marks || 1) !== 1 ? 's' : ''}]
          </div>
        </div>
      </div>
    );
  }

  const sectionMarks = { 'MCQ': '1 mark each', 'True/False': '1 mark each', 'Subjective': 'as indicated' };

  return (
    <div ref={previewRef} id="pdf-preview-root" className="pdf-preview" style={{ fontFamily, color: '#000', position: 'relative' }}>

      {/* Watermark — free plan only */}
      {showWatermark && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 10, transform: 'rotate(-30deg)',
          opacity: 0.08, fontSize: 64, fontWeight: 900, color: '#000',
          letterSpacing: 4, userSelect: 'none', whiteSpace: 'nowrap',
        }}>
          DESKEXAM.COM
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: `3px solid ${accentColor}`, marginBottom: 16, paddingBottom: 12, textAlign: 'center' }}>
        {logoUrl && (
          <img src={logoUrl} alt="Institute Logo"
            style={{ maxHeight: 56, maxWidth: 160, objectFit: 'contain', marginBottom: 6, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
        )}
        {metadata.instituteName && (
          <div style={{ fontSize: 18, fontWeight: 'bold', color: accentColor, marginBottom: 4 }}>{metadata.instituteName}</div>
        )}
        {metadata.subject && (
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{metadata.subject} Question Paper</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 8, color: '#333' }}>
          <span>{metadata.className && `Class: ${metadata.className}`}</span>
          <span>{metadata.maxMarks && `Total Marks: ${metadata.maxMarks}`}</span>
          <span>{metadata.timeDuration && `Time: ${metadata.timeDuration}`}</span>
        </div>
        {metadata.teacherName && (
          <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>Teacher: {metadata.teacherName}</div>
        )}
      </div>

      {/* General Instructions */}
      <div style={{ fontSize: 10, color: '#444', marginBottom: 16, paddingBottom: 8 }}>
        <strong>General Instructions:</strong> All questions are compulsory. Read each question carefully before answering.
      </div>

      {/* Questions */}
      {questions.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 13 }}>
          Add questions on the left to see preview here...
        </div>
      ) : (
        <div>
          {['MCQ', 'True/False', 'Subjective', 'short_answer', 'long_answer'].map(type => {
            const sectionQs = questions.filter(q => q.type === type);
            if (sectionQs.length === 0) return null;
            return (
              <div key={type} style={{ marginBottom: 20 }}>
                <div style={{ backgroundColor: accentColor, color: '#fff', padding: '4px 12px', fontWeight: 'bold', fontSize: 11, borderRadius: 4, marginBottom: 10 }}>
                  Section: {type} ({sectionMarks[type]})
                </div>
                <div style={isMultiCol ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' } : {}}>
                  {sectionQs.map((q, qi) => renderQuestion(q, qi))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: `2px solid ${accentColor}`, marginTop: 24, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666' }}>
        <span>{metadata.instituteName || 'Deskexam'}</span>
        <span>*** End of Paper ***</span>
      </div>
    </div>
  );
}
