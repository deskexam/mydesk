import React, { useEffect, useRef } from 'react';
import katex from 'katex';

/**
 * Renders text with inline LaTeX expressions.
 * Supports $...$ for inline and $$...$$ for display math.
 */
export function LatexRenderer({ text, displayMode = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !text) return;

    // Parse text with LaTeX
    const rendered = renderMixedContent(text);
    ref.current.innerHTML = rendered;
  }, [text, displayMode]);

  return <span ref={ref} className={`latex-content ${className}`}>{text}</span>;
}

function renderMixedContent(text) {
  if (!text) return '';

  // Split on $$ first (display math), then $ (inline)
  let remaining = text;

  // Process display math $$...$$
  remaining = remaining.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
    try {
      return `<span class="katex-display-wrap">${katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false })}</span>`;
    } catch {
      return match;
    }
  });

  // Process inline math $...$
  remaining = remaining.replace(/\$([^$\n]+?)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return match;
    }
  });

  return remaining;
}

/**
 * Inline LaTeX input with live preview
 */
export function LatexInput({ value, onChange, placeholder, multiline = false, className = '' }) {
  const Tag = multiline ? 'textarea' : 'input';

  return (
    <Tag
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Type text or LaTeX: $\\frac{1}{2}$'}
      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary-900 focus:ring-1 focus:ring-primary-900 transition-all ${className}`}
      rows={multiline ? 3 : undefined}
    />
  );
}

export default LatexRenderer;
