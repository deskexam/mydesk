import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, Loader2, Copy,
  Download, RefreshCw, AlertCircle, BarChart2, Lightbulb, FileCode,
  Plus, Trash2, ChevronUp, ChevronDown, ArrowLeft,
} from 'lucide-react';
import Navbar from '../components/auth/Navbar';
import LatexFormatModal from '../components/editor/LatexFormatModal';
import LatexDocEditor from '../components/editor/LatexDocEditor';
import PaywallModal from '../components/payment/PaywallModal';
import { useAuth } from '../hooks/useAuth';
import { decrementCredit } from '../lib/api';

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

const tabs = [
  { id: 'pdf-to-editor', label: 'PDF → Editor', icon: '✏️', desc: 'Extract questions from a PDF and open them directly in the question editor' },
  { id: 'pdf-to-latex', label: 'PDF → LaTeX', icon: '∑',   desc: 'Extract text and wrap it in a complete LaTeX document (.tex file)' },
  { id: 'pdf-to-ppt',   label: 'PDF → PPT',   icon: '📊',  desc: 'Extract slide-ready text outline from your question paper' },
  { id: 'photo-to-latex', label: 'Photo → LaTeX', icon: '📷', desc: 'Upload a photo or image of a question paper — Gemini AI converts it to a complete LaTeX document' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PdfToolsPage() {
  const navigate = useNavigate();
  const { profile, canDownload, refreshProfile } = useAuth();
  const isSubscribed = ['monthly', 'yearly'].includes(profile?.subscription_status);
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeTab, setActiveTab] = useState('pdf-to-editor');
  const [file, setFile] = useState(null);
  const processing = false;
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [result, setResult] = useState(null);
  const [showLatexModal, setShowLatexModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pdfError, setPdfError] = useState('');
  // Slide editor state
  const [editableSlides, setEditableSlides] = useState(null);
  const [editPptTitle, setEditPptTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [pptDescription, setPptDescription] = useState('');
  const [pdfDownloading, setPdfDownloading] = useState(false);
  // LaTeX editor state
  const [showLatexEditor, setShowLatexEditor] = useState(false);
  const fileRef = useRef(null);
  const photoRef = useRef(null);

  const isPhotoTab = activeTab === 'photo-to-latex';

  const handleFileDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); setPdfError(''); }
  }, []);

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setResult(null); setPdfError(''); }
  };

  const openInEditor = () => {
    if (!result) return;
    if (result.type === 'parsed-questions') {
      navigate('/editor', {
        state: {
          importedQuestions: result.parsed.questions,
          importedTitle: file?.name?.replace('.pdf', '') || 'Imported Paper',
        },
      });
    } else {
      // raw text fallback
      navigate('/editor', { state: { importedText: result.rawText || result.content } });
    }
  };

  const handleDownload = () => {
    if (!result || !result.content) return;
    const ext = result.type === 'latex-code' ? 'tex' : 'txt';
    downloadText(result.content, `${file?.name?.replace('.pdf', '') || 'output'}.${ext}`);
  };

  const resetAll = () => {
    setResult(null); setFile(null); setPdfError(''); setAiStatus('');
    setEditableSlides(null); setEditPptTitle(''); setEditSubject(''); setPptDescription('');
  };

  const processPptWithAI = async () => {
    if (!file) return;
    setAiProcessing(true); setPdfError(''); setResult(null); setAiStatus('');
    setEditableSlides(null);
    try {
      setAiStatus('Uploading file to AI…');
      const { extractPptSlides } = await import('../lib/api');
      const response = await extractPptSlides(file, pptDescription);
      if (response.error) throw new Error(response.error.message);
      const { title, subject, slides } = response.data;
      setResult({ type: 'ppt-slides', title: `${slides.length} slides ready to edit` });
      setEditableSlides(slides);
      setEditPptTitle(title || '');
      setEditSubject(subject || '');
    } catch (err) {
      console.error('PPT generation error:', err);
      setPdfError(`AI slide extraction failed: ${err.message}`);
    }
    setAiProcessing(false);
    setAiStatus('');
  };

  const processLatexWithAI = async () => {
    if (!file) return;
    setAiProcessing(true); setPdfError(''); setResult(null); setAiStatus('');
    try {
      setAiStatus('Converting to LaTeX with AI…');
      const { convertToLatexWithAI } = await import('../lib/api');
      const response = await convertToLatexWithAI(file);
      if (response.error) throw new Error(response.error.message);
      setResult({ type: 'latex-code', title: 'LaTeX Source (AI Generated)', content: response.data.latex });
      setShowLatexEditor(true);
    } catch (err) {
      console.error('LaTeX conversion error:', err);
      setPdfError(`LaTeX conversion failed: ${err.message}`);
    }
    setAiProcessing(false);
    setAiStatus('');
  };

  // ── Slide editor helpers ──────────────────────────────────────────────────
  const updateSlideTitle = (i, val) =>
    setEditableSlides(prev => prev.map((s, idx) => idx === i ? { ...s, title: val } : s));

  const updateSlideSubtitle = (i, val) =>
    setEditableSlides(prev => prev.map((s, idx) => idx === i ? { ...s, subtitle: val } : s));

  const updateBullet = (si, bi, val) =>
    setEditableSlides(prev => prev.map((s, idx) =>
      idx === si ? { ...s, bullets: s.bullets.map((b, j) => j === bi ? val : b) } : s
    ));

  const addBullet = (si) =>
    setEditableSlides(prev => prev.map((s, idx) =>
      idx === si ? { ...s, bullets: [...(s.bullets || []), ''] } : s
    ));

  const removeBullet = (si, bi) =>
    setEditableSlides(prev => prev.map((s, idx) =>
      idx === si ? { ...s, bullets: s.bullets.filter((_, j) => j !== bi) } : s
    ));

  const removeSlide = (i) =>
    setEditableSlides(prev => prev.filter((_, idx) => idx !== i));

  const moveSlide = (i, dir) => {
    const j = i + dir;
    setEditableSlides(prev => {
      if (j < 0 || j >= prev.length) return prev;
      const arr = [...prev];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const addSlide = () =>
    setEditableSlides(prev => [...prev, { type: 'content', title: 'New Slide', bullets: [''] }]);

  // ── Export helpers ────────────────────────────────────────────────────────
  const [pptxDownloading, setPptxDownloading] = useState(false);

  const downloadPptx = async () => {
    if (!editableSlides) return;
    setPptxDownloading(true);
    const { downloadPptxFromSlides } = await import('../lib/api');
    const { error } = await downloadPptxFromSlides(editPptTitle, editSubject, editableSlides);
    if (error) setPdfError(`Download failed: ${error.message}`);
    setPptxDownloading(false);
  };

  const downloadSlidesPdf = async () => {
    if (!editableSlides) return;
    setPdfDownloading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210;
      editableSlides.forEach((slide, i) => {
        if (i > 0) pdf.addPage();
        if (slide.type === 'title' || i === 0) {
          pdf.setFillColor(26, 54, 93);
          pdf.rect(0, 0, W, H, 'F');
          pdf.setFillColor(249, 115, 22);
          pdf.rect(0, H * 0.62, W, 1.5, 'F');
          pdf.setFontSize(28); pdf.setTextColor(255, 255, 255);
          pdf.text(editPptTitle || slide.title, W / 2, H * 0.45, { align: 'center', maxWidth: W - 40 });
          if (slide.subtitle) {
            pdf.setFontSize(14); pdf.setTextColor(191, 219, 254);
            pdf.text(slide.subtitle, W / 2, H * 0.57, { align: 'center', maxWidth: W - 60 });
          }
          if (editSubject) {
            pdf.setFontSize(10); pdf.setTextColor(148, 163, 184);
            pdf.text(editSubject, W / 2, H * 0.75, { align: 'center' });
          }
        } else if (slide.type === 'section_break') {
          pdf.setFillColor(45, 90, 142);
          pdf.rect(0, 0, W, H, 'F');
          pdf.setFillColor(249, 115, 22);
          pdf.rect(15, H * 0.56, 25, 1.5, 'F');
          pdf.setFontSize(26); pdf.setTextColor(255, 255, 255);
          pdf.text(slide.title, W / 2, H * 0.48, { align: 'center', maxWidth: W - 40 });
        } else {
          pdf.setFillColor(26, 54, 93);
          pdf.rect(0, 0, W, 18, 'F');
          pdf.setFillColor(249, 115, 22);
          pdf.rect(0, 18, W, 1, 'F');
          pdf.setFontSize(14); pdf.setTextColor(255, 255, 255);
          pdf.text(slide.title, 10, 12.5, { maxWidth: W - 30 });
          pdf.setFontSize(11); pdf.setTextColor(30, 41, 59);
          (slide.bullets || []).forEach((bullet, j) => {
            const lines = pdf.splitTextToSize(`• ${bullet}`, W - 30);
            pdf.text(lines, 12, 32 + j * 14);
          });
          pdf.setFontSize(8); pdf.setTextColor(148, 163, 184);
          pdf.text(`${i + 1} / ${editableSlides.length}`, W - 8, H - 6, { align: 'right' });
          pdf.setFillColor(232, 240, 254);
          pdf.rect(0, H - 8, W, 8, 'F');
          pdf.setFontSize(7); pdf.setTextColor(100, 116, 139);
          pdf.text(editPptTitle || '', 8, H - 3);
        }
      });
      const safeName = (editPptTitle || 'presentation').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      pdf.save(`${safeName}.pdf`);
    } catch (err) {
      setPdfError(`PDF export failed: ${err.message}`);
    }
    setPdfDownloading(false);
  };

  const openInGoogleSlides = async () => {
    await downloadPptx();
    window.open('https://slides.google.com', '_blank');
  };

  const processWithGemini = async () => {
    if (!file) return;
    setAiProcessing(true); setPdfError(''); setResult(null); setAiStatus('');

    try {
      setAiStatus('Uploading file to backend...');
      
      // Import the API function
      const { extractPdfWithGemini } = await import('../lib/api');
      
      const response = await extractPdfWithGemini(file);
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      const { questions } = response.data;
      
      if (questions.length === 0) {
        setPdfError('Gemini found no questions. Make sure the file contains exam questions.');
        setAiProcessing(false);
        return;
      }

      const parsed = {
        questions,
        mathWarning: false,
        hasAnswers: questions.some(q => q.answer),
        mcqCount: questions.filter(q => q.type === 'MCQ').length,
        tfCount: questions.filter(q => q.type === 'True/False').length,
        subjCount: questions.filter(q => q.type === 'Subjective').length,
      };
      setResult({
        type: 'parsed-questions',
        title: `🤖 ${questions.length} question${questions.length !== 1 ? 's' : ''} extracted by Gemini AI`,
        rawText: '',
        parsed,
        isAiResult: true,
      });
    } catch (err) {
      console.error('Backend extraction error:', err);
      setPdfError(`AI extraction failed: ${err.message}`);
    }

    setAiProcessing(false);
    setAiStatus('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-saffron rounded-2xl mb-4">
              <span className="text-3xl">🔄</span>
            </div>
            <h1 className="font-serif text-4xl font-bold text-primary-900 mb-2">PDF Power Tools</h1>
            <p className="text-gray-500">Extract and transform content from existing PDF question papers</p>
          </div>

          {/* Tab Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-1.5 flex gap-1 mb-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFile(null); setResult(null); setPdfError(''); setAiStatus('');
                  setEditableSlides(null); setEditPptTitle(''); setEditSubject(''); setPptDescription('');
                  setShowLatexEditor(false);
                }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-sm font-medium transition-all min-w-[120px] ${
                  activeTab === tab.id ? 'bg-primary-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-xs">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6 flex items-center gap-3">
            <span className="text-xl">{tabs.find(t => t.id === activeTab)?.icon}</span>
            <p className="text-blue-800 text-sm font-medium">{tabs.find(t => t.id === activeTab)?.desc}</p>
          </div>

          {/* ── Full-width Slide Editor (shown when slides are ready) ── */}
          {editableSlides && (
            <div className="mb-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Header bar */}
              <div className="bg-gradient-to-r from-primary-900 to-blue-800 px-6 py-4 flex items-center gap-4 flex-wrap">
                <button
                  onClick={resetAll}
                  className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex-1 min-w-0">
                  <input
                    value={editPptTitle}
                    onChange={e => setEditPptTitle(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white placeholder-blue-200 text-sm font-semibold focus:outline-none focus:border-white/50"
                    placeholder="Presentation title…"
                  />
                </div>
                <input
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="w-36 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white placeholder-blue-200 text-xs focus:outline-none focus:border-white/50"
                  placeholder="Subject…"
                />
                <span className="text-blue-200 text-xs whitespace-nowrap">{editableSlides.length} slides</span>
              </div>

              {/* Slide cards */}
              <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                {editableSlides.map((slide, i) => (
                  <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                    {/* Slide header */}
                    <div className={`flex items-center gap-2 px-4 py-2 ${
                      slide.type === 'title' || i === 0 ? 'bg-primary-900' :
                      slide.type === 'section_break' ? 'bg-blue-700' : 'bg-gray-50 border-b border-gray-100'
                    }`}>
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        slide.type === 'title' || i === 0 || slide.type === 'section_break'
                          ? 'bg-white/20 text-white' : 'bg-primary-900 text-white'
                      }`}>{i + 1}</span>
                      <input
                        value={slide.title}
                        onChange={e => updateSlideTitle(i, e.target.value)}
                        className={`flex-1 bg-transparent text-sm font-semibold focus:outline-none min-w-0 ${
                          slide.type === 'title' || i === 0 || slide.type === 'section_break'
                            ? 'text-white placeholder-white/50' : 'text-primary-900'
                        }`}
                        placeholder="Slide title…"
                      />
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => moveSlide(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveSlide(i, 1)} disabled={i === editableSlides.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeSlide(i)} disabled={editableSlides.length <= 1} className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-30">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Subtitle (title slides) */}
                    {(slide.type === 'title' || i === 0) && (
                      <div className="bg-primary-900/90 px-4 pb-2">
                        <input
                          value={slide.subtitle || ''}
                          onChange={e => updateSlideSubtitle(i, e.target.value)}
                          className="w-full bg-transparent text-xs text-blue-200 placeholder-blue-300 focus:outline-none"
                          placeholder="Subtitle…"
                        />
                      </div>
                    )}

                    {/* Bullets (content slides) */}
                    {slide.type !== 'section_break' && !(slide.type === 'title' || i === 0) && (
                      <div className="px-4 py-3 space-y-1.5">
                        {(slide.bullets || []).map((bullet, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <span className="text-gray-300 text-xs flex-shrink-0">•</span>
                            <input
                              value={bullet}
                              onChange={e => updateBullet(i, j, e.target.value)}
                              className="flex-1 text-sm text-gray-700 focus:outline-none border-b border-transparent focus:border-gray-300 py-0.5 bg-transparent"
                              placeholder="Bullet point…"
                            />
                            <button onClick={() => removeBullet(i, j)} className="text-gray-200 hover:text-red-400 flex-shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addBullet(i)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-900 mt-1"
                        >
                          <Plus className="w-3 h-3" /> Add bullet
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add slide button */}
                <button
                  onClick={addSlide}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm hover:border-primary-900 hover:text-primary-900 flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Slide
                </button>
              </div>

              {/* Export bar */}
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                <button
                  onClick={downloadPptx}
                  disabled={pptxDownloading}
                  className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5 disabled:opacity-60"
                >
                  {pptxDownloading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Building…</>
                    : <><Download className="w-4 h-4" /> Download .pptx</>}
                </button>
                <button
                  onClick={downloadSlidesPdf}
                  disabled={pdfDownloading}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-60 font-medium"
                >
                  {pdfDownloading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
                    : <><Download className="w-4 h-4" /> Download PDF</>}
                </button>
                <button
                  onClick={openInGoogleSlides}
                  disabled={pptxDownloading}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 font-medium transition-all"
                  title="Downloads .pptx then opens Google Slides — import the file there"
                >
                  <span className="text-base leading-none">🎯</span> Open in Google Slides
                </button>
                <button onClick={resetAll} className="text-gray-400 text-sm py-2 px-3 rounded-xl hover:bg-gray-50 flex items-center gap-1 ml-auto">
                  <RefreshCw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">

            {/* ── Upload Area ── */}
            <div>
              <h2 className="font-semibold text-primary-900 mb-3">
                {isPhotoTab ? '📷 Upload Question Photo' : '📄 Upload PDF File'}
              </h2>

              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => (isPhotoTab ? photoRef : fileRef).current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-primary-900 bg-blue-50' : 'border-gray-300 hover:border-primary-900 hover:bg-gray-50'
                }`}
              >
                <input ref={fileRef}  type="file" accept=".pdf"    className="hidden" onChange={handleFileSelect} />
                <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

                {file ? (
                  <div className="fade-in-up">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="font-semibold text-gray-800">{file.name}</p>
                    <p className="text-gray-400 text-sm mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                    <button
                      onClick={e => { e.stopPropagation(); setFile(null); setResult(null); setPdfError(''); }}
                      className="text-red-400 text-xs mt-2 underline"
                    >Remove</button>
                  </div>
                ) : (
                  <>
                    <div className="text-5xl mb-4">{isPhotoTab ? '📷' : '📤'}</div>
                    <p className="font-semibold text-gray-700 mb-1">
                      {isPhotoTab ? 'Click to take photo or upload image' : 'Drop PDF here or click to browse'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {isPhotoTab ? 'Supports JPG, PNG, HEIC' : 'Supports PDF up to 50 MB'}
                    </p>
                  </>
                )}
              </div>

              {pdfError && (
                <div className="flex items-start gap-2 mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {pdfError}
                </div>
              )}

              {activeTab === 'pdf-to-ppt' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slide instructions <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={pptDescription}
                    onChange={e => setPptDescription(e.target.value)}
                    placeholder="e.g. Focus on key formulas only. Use simple language for 10th grade students. Include a summary slide at the end."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent"
                  />
                </div>
              )}

              {file && (
                <div className="mt-4 flex flex-col gap-2">
                  {/* Extract button — handler and label change per tab */}
                  <button
                    onClick={
                      activeTab === 'pdf-to-ppt'     ? processPptWithAI :
                      activeTab === 'pdf-to-latex'   ? processLatexWithAI :
                      activeTab === 'photo-to-latex' ? processLatexWithAI :
                      processWithGemini
                    }
                    disabled={processing || aiProcessing}
                    className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
                  >
                    {aiProcessing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> {aiStatus || 'Processing…'}</>
                      : activeTab === 'pdf-to-ppt'
                        ? <>📊 Generate Presentation with AI</>
                        : activeTab === 'pdf-to-latex' || activeTab === 'photo-to-latex'
                          ? <>✨ Convert to LaTeX with AI</>
                          : <>🤖 Extract Questions with AI</>}
                  </button>
                </div>
              )}

              {/* How it works */}
              <div className="mt-6 bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-700 text-sm mb-3">How it works</h3>
                <div className="space-y-2">
                  {(activeTab === 'pdf-to-editor'
                    ? [
                        'Upload any text-based PDF question paper',
                        'Deskexam detects questions, options & answers',
                        'Opens directly in the editor with structured cards',
                      ]
                    : activeTab === 'pdf-to-ppt'
                    ? [
                        'Upload any PDF (notes, question paper, textbook chapter)',
                        'Gemini AI reads and structures content into logical slides',
                        'Preview slides then download a real .pptx file',
                      ]
                    : isPhotoTab
                    ? [
                        'Upload a photo or scan of any question paper or handwritten notes',
                        'Gemini AI reads every equation, symbol, and formula',
                        'Download a complete .tex file — compile with pdflatex or open in Overleaf',
                      ]
                    : activeTab === 'pdf-to-latex'
                    ? [
                        'Upload any PDF question paper (text-based or scanned)',
                        'Gemini AI converts all content including math to proper LaTeX',
                        'Download the complete .tex file ready to compile',
                      ]
                    : ['Upload any text-based PDF question paper', 'PDF.js reads every page and extracts text', 'Edit in editor, copy LaTeX, or download']
                  ).map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-gray-500 text-xs">{step}</span>
                    </div>
                  ))}
                </div>
                {activeTab === 'pdf-to-editor' && (
                  <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-lg px-3 py-2">
                    ⚠️ For best results use <strong>text-based PDFs</strong>. The AI can still read scanned PDFs but accuracy may vary.
                  </p>
                )}
                {isPhotoTab && (
                  <p className="text-xs text-green-700 mt-3 bg-green-50 rounded-lg px-3 py-2">
                    ✅ Works with <strong>any image format</strong> — JPG, PNG, HEIC, scanned documents, handwritten notes.
                  </p>
                )}
              </div>
            </div>

            {/* ── Result Area ── */}
            <div>
              <h2 className="font-semibold text-primary-900 mb-3">Result</h2>

              {!result && !processing && (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl h-64 flex items-center justify-center text-center p-8">
                  <div>
                    <div className="text-4xl mb-3 opacity-30">📄</div>
                    <p className="text-gray-400 text-sm">Upload a PDF and click Extract Content to see results here</p>
                  </div>
                </div>
              )}

              {(processing || aiProcessing) && (
                <div className="border-2 border-blue-200 rounded-2xl h-64 flex flex-col items-center justify-center gap-4 bg-blue-50">
                  <Loader2 className="w-10 h-10 text-primary-900 animate-spin" />
                  <div className="text-center">
                    <p className="font-semibold text-primary-900">
                      {aiProcessing ? '🤖 AI Extracting…' : 'Reading PDF…'}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {aiProcessing ? (aiStatus || 'Gemini AI is reading the content') : 'Extracting text from all pages'}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Parsed questions result (pdf-to-editor) ── */}
              {result && result.type === 'parsed-questions' && (
                <div className="fade-in-up space-y-3">
                  {result.isAiResult && (
                    <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-3 py-1 w-fit font-medium">
                      🤖 Extracted by Gemini AI · Math preserved as LaTeX
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-green-700">{result.title}</h3>
                  </div>

                  {/* Stats breakdown */}
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart2 className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-800 text-sm">Q&A Structure Detected</span>
                      {result.parsed.hasAnswers && (
                        <span className="ml-auto text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                          Answers included
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white rounded-xl p-2 border border-green-100">
                        <div className="text-2xl font-bold text-blue-600">{result.parsed.mcqCount}</div>
                        <div className="text-xs text-gray-500 mt-0.5">MCQ</div>
                      </div>
                      <div className="bg-white rounded-xl p-2 border border-green-100">
                        <div className="text-2xl font-bold text-green-600">{result.parsed.tfCount}</div>
                        <div className="text-xs text-gray-500 mt-0.5">True/False</div>
                      </div>
                      <div className="bg-white rounded-xl p-2 border border-green-100">
                        <div className="text-2xl font-bold text-purple-600">{result.parsed.subjCount}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Subjective</div>
                      </div>
                    </div>
                  </div>

                  {/* Math limitation warning */}
                  {result.parsed.mathWarning && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
                      <span className="font-bold">⚠️ Math note:</span> Square root symbols (√) in this PDF are drawn as graphics and <span className="font-semibold">cannot be extracted as text</span>.
                      Simple fractions (e.g. π/2, L/g) have been reconstructed. After opening in the editor, use LaTeX syntax like <code className="bg-amber-100 px-1 rounded">$\sqrt&#123;x&#125;$</code> to restore square roots.
                    </div>
                  )}

                  {/* Preview of first question */}
                  {result.parsed.questions[0] && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Preview — Q1</p>
                      <p className="text-sm text-gray-700 line-clamp-3">{result.parsed.questions[0].question}</p>
                      {result.parsed.questions[0].type === 'MCQ' && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {result.parsed.questions[0].options.filter(o => o).map((o, i) => (
                            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {String.fromCharCode(65 + i)}. {o.length > 20 ? o.slice(0, 20) + '…' : o}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={openInEditor}
                      className="btn-primary text-sm py-2.5 px-5 flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" /> Open All in Editor →
                    </button>
                    <button
                      onClick={() => setShowLatexModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-sm border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all"
                    >
                      <FileCode className="w-4 h-4" /> Get LaTeX File
                    </button>
                    <button onClick={resetAll} className="text-gray-400 text-sm py-2 px-3 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                </div>
              )}

              {/* ── Raw text fallback (pdf-to-editor, no questions found) ── */}
              {result && result.type === 'raw-text-editor' && (
                <div className="fade-in-up space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-amber-700">{result.title}</h3>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-xs">
                    Questions were not auto-detected. The raw text will be passed to the editor — you can manually format questions there.
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <pre className="p-4 text-xs font-mono text-gray-700 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {result.rawText?.slice(0, 600)}{result.rawText?.length > 600 ? '\n…' : ''}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={openInEditor} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Open Raw Text in Editor
                    </button>
                    <button onClick={resetAll} className="text-gray-400 text-sm py-2 px-3 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                </div>
              )}

              {/* ── LaTeX result ── */}
              {result && result.type === 'latex-code' && (
                <div className="fade-in-up space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-3 py-1 w-fit font-medium">
                    🤖 Generated by Gemini AI
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-green-700">{result.title}</h3>
                  </div>
                  {/* Code preview (first 12 lines) */}
                  <div className="bg-gray-950 rounded-xl overflow-hidden border border-gray-700">
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-gray-500 text-xs ml-2">main.tex</span>
                    </div>
                    <pre className="p-4 text-xs font-mono text-green-300 max-h-48 overflow-hidden leading-relaxed">
                      {result.content.split('\n').slice(0, 14).join('\n')}
                      {result.content.split('\n').length > 14 ? '\n…' : ''}
                    </pre>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowLatexEditor(true)}
                      className="btn-primary text-sm py-2.5 px-5 flex items-center gap-1.5"
                    >
                      <FileCode className="w-4 h-4" /> Open in Editor & Preview
                    </button>
                    <button onClick={resetAll} className="text-gray-400 text-sm py-2 px-3 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                </div>
              )}

              {/* ── Plain text / ppt-text result ── */}
              {result && (result.type === 'ppt-text' || result.type === 'text') && (
                <div className="fade-in-up">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-green-700">{result.title}</h3>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <pre className="p-4 text-xs font-mono text-gray-700 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {result.content}
                    </pre>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(result.content)}
                      className="border border-gray-200 text-gray-600 text-sm py-2 px-4 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-all"
                    >
                      <Copy className="w-4 h-4" /> Copy
                    </button>
                    <button
                      onClick={handleDownload}
                      className="border border-gray-200 text-gray-600 text-sm py-2 px-4 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download .txt
                    </button>
                    <button onClick={resetAll} className="text-gray-400 text-sm py-2 px-3 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                </div>
              )}

              {/* ── PPT slides result — editor shown above ── */}
              {result && result.type === 'ppt-slides' && (
                <div className="fade-in-up">
                  <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-3 py-1 w-fit font-medium mb-2">
                    🤖 Structured by Gemini AI
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-700 text-sm">{result.title}</p>
                      <p className="text-green-600 text-xs mt-0.5">Edit slides in the panel above, then export to .pptx, PDF, or Google Slides.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {showLatexModal && result?.type === 'parsed-questions' && (
        <LatexFormatModal
          paperData={{
            title: file?.name?.replace('.pdf', '') || 'Question Paper',
            metadata: {
              instituteName: '',
              teacherName: '',
              subject: 'Subject',
              className: 'Class X',
              maxMarks: 80,
              timeDuration: '3 Hours',
            },
            questions: result.parsed.questions,
          }}
          onClose={() => setShowLatexModal(false)}
        />
      )}

      {showLatexEditor && result?.type === 'latex-code' && (
        <LatexDocEditor
          initialLatex={result.content}
          filename={file?.name?.replace(/\.(pdf|jpg|jpeg|png|heic)$/i, '') || 'document'}
          onClose={() => setShowLatexEditor(false)}
          isSubscribed={isSubscribed}
          onDownload={async (doDownload) => {
            if (!canDownload()) { setShowPaywall(true); return; }
            doDownload();
            if (!isSubscribed) {
              await decrementCredit();
              refreshProfile();
            }
          }}
        />
      )}

      {showPaywall && (
        <PaywallModal onClose={() => setShowPaywall(false)} />
      )}
    </div>
  );
}
