import { useState } from 'react';
import { X, Loader2, FileCode } from 'lucide-react';
import { LATEX_FORMATS, generateLatex, downloadLatexFile } from '../../lib/latexUtils';

export default function LatexFormatModal({ paperData, onClose }) {
  const [downloading, setDownloading] = useState(null);

  const handleDownload = (formatId) => {
    setDownloading(formatId);
    try {
      const tex = generateLatex(paperData, formatId);
      const safeName = (paperData.title || 'question-paper').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      downloadLatexFile(tex, `${safeName}-${formatId}.tex`);
    } catch (err) {
      console.error('LaTeX generation error:', err);
    }
    setTimeout(() => setDownloading(null), 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-900 to-blue-800 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold">Download as LaTeX</h2>
            <p className="text-blue-200 text-sm mt-0.5">Choose a professional template format</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format list */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {LATEX_FORMATS.map(fmt => (
            <div
              key={fmt.id}
              className="flex items-center gap-4 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-2xl p-4 transition-all group"
            >
              <div className="text-3xl w-10 text-center flex-shrink-0">{fmt.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-primary-900 text-sm">{fmt.label}</div>
                <div className="text-gray-400 text-xs mt-0.5 leading-snug">{fmt.desc}</div>
              </div>
              <button
                onClick={() => handleDownload(fmt.id)}
                disabled={downloading === fmt.id}
                className="flex-shrink-0 flex items-center gap-1.5 bg-primary-900 hover:bg-blue-800 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all"
              >
                {downloading === fmt.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <FileCode className="w-3 h-3" />}
                .tex
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Compile the .tex file with <strong>pdflatex</strong> or upload to <strong>Overleaf</strong> for instant preview
          </p>
        </div>
      </div>
    </div>
  );
}
