import { useState, useRef, useEffect } from 'react';
import { X, Download, Copy, ExternalLink, Check } from 'lucide-react';
import katex from 'katex';
import { downloadLatexFile } from '../../lib/latexUtils';

// ─── LaTeX → HTML renderer ────────────────────────────────────────────────────

function renderLatexToHtml(latex) {
  // Extract body content
  let body = latex;
  const bodyMatch = latex.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (bodyMatch) body = bodyMatch[1];

  // Remove header/footer commands that shouldn't show in preview
  body = body.replace(/\\(pagestyle|fancyhf|lhead|chead|rhead|lfoot|cfoot|rfoot|renewcommand|setlength)\{[^}]*\}(\{[^}]*\})?/g, '');
  body = body.replace(/\\geometry\{[^}]*\}/g, '');
  body = body.replace(/\\usepackage(\[.*?\])?\{[^}]*\}/g, '');

  // framed environment → bordered box
  body = body.replace(/\\begin\{framed\}([\s\S]*?)\\end\{framed\}/g,
    '<div style="border:1.5px solid #64748b;padding:12px 16px;margin:10px 0;border-radius:4px">$1</div>');

  // center environment
  body = body.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    '<div style="text-align:center;margin:8px 0">$1</div>');

  // enumerate / itemize (handle nested [label=...] option)
  body = body.replace(/\\begin\{enumerate\}(\[[^\]]*\])?([\s\S]*?)\\end\{enumerate\}/g, (_m, _opt, inner) => {
    const items = inner.split('\\item').slice(1);
    return `<ol style="margin:6px 0 6px 24px;list-style:decimal">${items.map(i =>
      `<li style="margin:3px 0">${i.trim()}</li>`).join('')}</ol>`;
  });
  body = body.replace(/\\begin\{itemize\}(\[[^\]]*\])?([\s\S]*?)\\end\{itemize\}/g, (_m, _opt, inner) => {
    const items = inner.split('\\item').slice(1);
    return `<ul style="margin:6px 0 6px 24px;list-style:disc">${items.map(i =>
      `<li style="margin:3px 0">${i.trim()}</li>`).join('')}</ul>`;
  });

  // description environment
  body = body.replace(/\\begin\{description\}(\[[^\]]*\])?([\s\S]*?)\\end\{description\}/g, (_m, _opt, inner) => {
    const items = inner.split('\\item').slice(1);
    return `<div style="margin:6px 0">${items.map(item => {
      const lm = item.match(/^\[([^\]]*)\]/);
      if (lm) return `<div style="display:flex;gap:8px;margin:4px 0"><span style="font-weight:600;min-width:2em">${lm[1]}</span><span>${item.slice(lm[0].length).trim()}</span></div>`;
      return `<div style="margin:4px 0">${item.trim()}</div>`;
    }).join('')}</div>`;
  });

  // tabular environment → simple table
  body = body.replace(/\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g, (_m, inner) => {
    const rows = inner.split('\\\\').map(r => r.replace(/\\hline/g, '').trim()).filter(Boolean);
    return `<table style="border-collapse:collapse;margin:8px 0;font-size:0.92em">${rows.map(row => {
      const cells = row.split('&').map(c => c.trim());
      return `<tr>${cells.map(c => `<td style="border:1px solid #cbd5e1;padding:4px 8px">${c}</td>`).join('')}</tr>`;
    }).join('')}</table>`;
  });

  // Sections / headings
  body = body.replace(/\\section\*?\{([^}]+)\}/g,
    '<h2 style="font-size:1.18em;font-weight:700;margin:18px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">$1</h2>');
  body = body.replace(/\\subsection\*?\{([^}]+)\}/g,
    '<h3 style="font-size:1.05em;font-weight:600;margin:12px 0 4px">$1</h3>');

  // Text formatting
  body = body.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
  body = body.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
  body = body.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>');
  body = body.replace(/\\texttt\{([^}]+)\}/g, '<code style="font-family:monospace;background:#f1f5f9;padding:0 3px;border-radius:2px">$1</code>');
  body = body.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
  body = body.replace(/\\large\s*/g, '<span style="font-size:1.15em">');
  body = body.replace(/\\Large\s*/g, '<span style="font-size:1.3em">');
  body = body.replace(/\\LARGE\s*/g, '<span style="font-size:1.5em">');
  body = body.replace(/\\normalsize\s*/g, '');
  body = body.replace(/\\small\s*/g, '<span style="font-size:0.88em">');

  // Spacing / layout
  body = body.replace(/\\\\(\[[^\]]*\])?/g, '<br>');
  body = body.replace(/\\newline/g, '<br>');
  body = body.replace(/\\hrule|\\hline/g, '<hr style="border:none;border-top:1px solid #94a3b8;margin:8px 0">');
  body = body.replace(/\\vspace\{[^}]+\}/g, '<div style="height:10px"></div>');
  body = body.replace(/\\hfill/g, '<span style="display:inline-block;flex:1;min-width:16px"> </span>');
  body = body.replace(/\\quad/g, '\u2003');
  body = body.replace(/\\qquad/g, '\u2003\u2003');
  body = body.replace(/\\,/g, '\u2009');
  body = body.replace(/\\noindent\s*/g, '');
  body = body.replace(/\\centering\s*/g, '');

  // Special characters
  body = body.replace(/\\&/g, '&amp;');
  body = body.replace(/\\%/g, '%');
  body = body.replace(/\\\$/g, '\uFF04'); // placeholder to avoid KaTeX conflict
  body = body.replace(/\\textasciitilde/g, '~');
  body = body.replace(/~(?=[^\s])/g, '\u00A0');

  // Remove remaining stray commands (unknown \command or \command{...})
  body = body.replace(/\\[a-zA-Z]+\*?(\{[^}]*\})?/g, (m, arg) => arg ? arg.slice(1, -1) : '');
  body = body.replace(/\{|\}/g, '');

  // Restore escaped dollar
  body = body.replace(/\uFF04/g, '$');

  // Render math with KaTeX
  body = body.replace(/\$\$([\s\S]+?)\$\$/g, (_m, math) => {
    try {
      return `<div style="text-align:center;margin:10px 0;overflow-x:auto">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch { return `<code>$$${math}$$</code>`; }
  });
  body = body.replace(/\$([^$\n]+?)\$/g, (_m, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch { return `<code>$${math}$</code>`; }
  });

  // Convert double newlines to paragraphs
  body = body.replace(/\n{2,}/g, '</p><p style="margin:6px 0">');
  body = `<p style="margin:6px 0">${body}</p>`;

  return body;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LatexDocEditor({ initialLatex, filename = 'document', onClose, isSubscribed = false, onDownload }) {
  const [code, setCode] = useState(initialLatex || '');
  const [copied, setCopied] = useState(false);
  const [activePane, setActivePane] = useState('both'); // 'code' | 'preview' | 'both'
  const previewRef = useRef(null);

  // Update preview whenever code changes
  useEffect(() => {
    if (!previewRef.current) return;
    try {
      previewRef.current.innerHTML = renderLatexToHtml(code);
    } catch (e) {
      previewRef.current.textContent = 'Preview error: ' + e.message;
    }
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (onDownload) {
      // Let parent handle credit check; pass a callback to do the actual download
      onDownload(() => downloadLatexFile(code, `${filename.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.tex`));
    } else {
      downloadLatexFile(code, `${filename.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.tex`);
    }
  };

  const openOverleaf = () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.overleaf.com/docs';
    form.target = '_blank';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'snip';
    input.value = code;
    const type = document.createElement('input');
    type.type = 'hidden';
    type.name = 'snip_type';
    type.value = 'main.tex';
    form.appendChild(input);
    form.appendChild(type);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-700 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-gray-200 font-semibold text-sm">{filename}.tex</span>
        <span className="text-gray-500 text-xs">LaTeX Editor</span>

        {/* View toggles */}
        <div className="flex bg-gray-800 rounded-lg p-0.5 gap-0.5 ml-2">
          {[['code', 'Code'], ['both', 'Split'], ['preview', 'Preview']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setActivePane(v)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${activePane === v ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-primary-900 hover:bg-blue-800 rounded-lg transition-colors font-medium"
          >
            <Download className="w-3 h-3" /> Download .tex
          </button>
          {isSubscribed && (
            <button
              onClick={openOverleaf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-green-700 hover:bg-green-600 rounded-lg transition-colors font-medium"
            >
              <ExternalLink className="w-3 h-3" /> Open in Overleaf
            </button>
          )}
        </div>
      </div>

      {/* ── Panes ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Code pane */}
        {(activePane === 'code' || activePane === 'both') && (
          <div className={`flex flex-col overflow-hidden ${activePane === 'both' ? 'w-1/2 border-r border-gray-700' : 'w-full'}`}>
            <div className="px-4 py-1.5 bg-gray-900 border-b border-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-500 text-xs ml-2">main.tex</span>
            </div>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 bg-gray-950 text-gray-100 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
              style={{ tabSize: 2 }}
              placeholder="LaTeX code will appear here…"
            />
          </div>
        )}

        {/* Preview pane */}
        {(activePane === 'preview' || activePane === 'both') && (
          <div className={`flex flex-col overflow-hidden bg-gray-200 ${activePane === 'both' ? 'w-1/2' : 'w-full'}`}>
            <div className="px-4 py-1.5 bg-gray-200 border-b border-gray-300 flex items-center justify-between">
              <span className="text-gray-500 text-xs font-medium">PREVIEW</span>
              <span className="text-gray-400 text-xs">Rendered with KaTeX</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {/* A4 page */}
              <div
                style={{
                  width: 794,
                  minHeight: 1123,
                  margin: '0 auto',
                  background: '#fff',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                  padding: '72px 80px',
                  fontFamily: '"Computer Modern", "Latin Modern", "Times New Roman", serif',
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: '#1e293b',
                  boxSizing: 'border-box',
                }}
              >
                <div ref={previewRef} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-900 border-t border-gray-700 text-xs text-gray-500 flex-shrink-0">
        <span>{code.split('\n').length} lines · {code.length} chars</span>
        <span>LaTeX · UTF-8</span>
      </div>
    </div>
  );
}
