import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Plus, Trash2, Download, Eye, EyeOff, Image,
  ChevronDown, X, Loader2, FileCode, GripVertical,
} from 'lucide-react';
import Navbar from '../components/auth/Navbar';
import PdfPreview from '../components/editor/PdfPreview';
import { LatexInput } from '../components/editor/LatexRenderer';
import PaywallModal from '../components/payment/PaywallModal';
import { generateLatex, downloadLatexFile } from '../lib/latexUtils';
import { useAuth } from '../hooks/useAuth';
import { savePaper, getPaper, decrementCredit, incrementPaperCount, fastapiClient } from '../lib/api';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Science', 'Computer Science'];

// ─── Layout Template Thumbnails ───────────────────────────────────────────────
const _b  = (w = '100%', h = 3, bg = '#94a3b8') => ({ width: w, height: h, background: bg, borderRadius: 2, marginBottom: 3 });
const _t  = (w = '100%', h = 2, bg = '#cbd5e1') => ({ width: w, height: h, background: bg, borderRadius: 1, marginBottom: 2 });

function ThumbClassic() {
  return (
    <div style={{ width: 54, height: 40, border: '1px solid #cbd5e1', borderRadius: 3, padding: '5px 5px 3px', background: '#f8fafc' }}>
      <div style={_b('80%')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 4px', marginBottom: 4 }}>
        {[0,1,2,3].map(i => <div key={i} style={_t()} />)}
      </div>
      <div style={_b('85%')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 4px' }}>
        {[0,1,2,3].map(i => <div key={i} style={_t()} />)}
      </div>
    </div>
  );
}
function ThumbTwoColumn() {
  return (
    <div style={{ width: 54, height: 40, border: '1px solid #cbd5e1', borderRadius: 3, padding: '5px 4px 3px', background: '#f8fafc' }}>
      {[0,1].map(row => (
        <div key={row} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: row === 0 ? 4 : 0 }}>
          {[0,1].map(col => (
            <div key={col}>
              <div style={_b()} />
              <div style={_t('90%')} />
              <div style={_t('70%')} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
function ThumbCompact() {
  return (
    <div style={{ width: 54, height: 40, border: '1px solid #cbd5e1', borderRadius: 3, padding: '5px 5px 3px', background: '#f8fafc' }}>
      {[0,1].map(i => (
        <div key={i} style={{ marginBottom: i === 0 ? 5 : 0 }}>
          <div style={_b('80%')} />
          <div style={{ display: 'flex', gap: 3 }}>
            {[0,1,2,3].map(j => <div key={j} style={{ height: 2, flex: 1, background: '#cbd5e1', borderRadius: 1 }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
function ThumbBoxed() {
  return (
    <div style={{ width: 54, height: 40, border: '1px solid #cbd5e1', borderRadius: 3, padding: 4, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {[0,1].map(i => (
        <div key={i} style={{ border: '1px solid #94a3b8', borderLeft: '2.5px solid #64748b', borderRadius: 3, padding: '3px 4px' }}>
          <div style={_b('75%')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 3px' }}>
            {[0,1].map(j => <div key={j} style={_t()} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
function ThumbNewspaper() {
  return (
    <div style={{ width: 54, height: 40, border: '1px solid #cbd5e1', borderRadius: 3, padding: '5px 4px 3px', background: '#f8fafc' }}>
      {[0,1].map(row => (
        <div key={row} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: row === 0 ? 4 : 0 }}>
          {[0,1].map(col => (
            <div key={col}>
              <div style={_b()} />
              {[0,1,2].map(k => <div key={k} style={_t('85%', 1.5)} />)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const LAYOUT_TEMPLATES = [
  { id: 'classic',    name: 'Classic',    desc: '1 col · grid options',   thumb: <ThumbClassic /> },
  { id: 'two-column', name: 'Two Column', desc: '2 cols · grid options',  thumb: <ThumbTwoColumn /> },
  { id: 'compact',    name: 'Compact',    desc: '1 col · inline options', thumb: <ThumbCompact /> },
  { id: 'boxed',      name: 'Boxed',      desc: '1 col · card borders',   thumb: <ThumbBoxed /> },
  { id: 'newspaper',  name: 'Newspaper',  desc: '2 cols · list options',  thumb: <ThumbNewspaper /> },
];

const emptyQuestion = () => ({
  id: uuidv4(),
  type: 'MCQ',
  question: '',
  options: ['', '', '', ''],
  answer: '',
  marks: 1,
  imageUrl: null,
});

const q = (type, question, options, answer, marks) => ({
  id: uuidv4(), type, question, options: options || ['', '', '', ''], answer: answer || '', marks: marks || 1, imageUrl: null,
});

const TEMPLATE_PRESETS = {
  'cbse-standard': {
    title: 'CBSE Board Examination – Mathematics',
    metadata: { instituteName: 'Kendriya Vidyalaya', teacherName: '', subject: 'Mathematics', className: 'Class X', maxMarks: 80, timeDuration: '3 Hours' },
    template: { accentColor: '#1a365d', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', 'The HCF of 26 and 91 is:', ['13', '26', '91', '1'], 'A', 1),
      q('MCQ', 'The roots of the equation x² – 3x – 10 = 0 are:', ['2 and –5', '5 and –2', '–2 and –5', '2 and 5'], 'B', 1),
      q('MCQ', 'In an AP, if a = 1 and d = 2, the 10th term is:', ['19', '20', '21', '18'], 'A', 1),
      q('Subjective', 'Prove that √2 is irrational.', [], '', 3),
      q('Subjective', 'Find the zeros of the polynomial p(x) = x² – 5x + 6 and verify the relationship between its zeros and coefficients.', [], '', 3),
      q('Subjective', 'Solve the following pair of linear equations by substitution method: 2x + 3y = 11 and 2x – 4y = –24.', [], '', 4),
    ],
  },
  'jee-mock': {
    title: 'JEE Main Mock Test – Paper 1 (PCM)',
    metadata: { instituteName: 'JEE Preparation Center', teacherName: '', subject: 'Physics, Chemistry & Mathematics', className: 'Class XII / Dropper', maxMarks: 300, timeDuration: '3 Hours' },
    template: { accentColor: '#dc2626', fontFamily: 'Arial' },
    questions: [
      q('MCQ', '[Physics] A particle moves in a circle of radius R. The displacement after half a circle is:', ['0', 'πR', '2R', '2πR'], 'C', 4),
      q('MCQ', '[Physics] Which of the following has the highest resistivity at room temperature?', ['Copper', 'Silver', 'Silicon', 'Aluminium'], 'C', 4),
      q('MCQ', '[Chemistry] The IUPAC name of CH₃–CH(OH)–CH₃ is:', ['Propan-1-ol', 'Propan-2-ol', '1-methylethanol', '2-propanol'], 'B', 4),
      q('MCQ', '[Chemistry] Hybridisation of nitrogen in NH₃ is:', ['sp', 'sp²', 'sp³', 'sp³d'], 'C', 4),
      q('MCQ', '[Mathematics] If f(x) = x² and g(x) = √x, then fog(x) is:', ['x', 'x²', '√x', 'x⁴'], 'A', 4),
      q('Subjective', '[Mathematics] Find the value of k such that the quadratic equation kx² + 6x + 1 = 0 has equal roots. (Integer type answer)', [], '', 4),
    ],
  },
  'weekly-test': {
    title: 'Weekly Class Test',
    metadata: { instituteName: '', teacherName: '', subject: 'Science', className: 'Class VIII', maxMarks: 20, timeDuration: '45 Minutes' },
    template: { accentColor: '#2563eb', fontFamily: 'Arial' },
    questions: [
      q('MCQ', 'Which gas is released during photosynthesis?', ['CO₂', 'O₂', 'N₂', 'H₂'], 'B', 1),
      q('MCQ', 'The SI unit of force is:', ['Joule', 'Watt', 'Newton', 'Pascal'], 'C', 1),
      q('True/False', 'Sound travels faster in air than in water.', [], 'False', 1),
      q('True/False', 'The nucleus is the control centre of the cell.', [], 'True', 1),
      q('Subjective', "Define Newton's First Law of Motion with one example.", [], '', 3),
      q('Subjective', 'What are the differences between plant cells and animal cells? (Any two points)', [], '', 3),
    ],
  },
  'neet-mock': {
    title: 'NEET Mock Test',
    metadata: { instituteName: 'Medical Entrance Coaching', teacherName: '', subject: 'Biology', className: 'Class XII / NEET Aspirant', maxMarks: 720, timeDuration: '3 Hours 20 Minutes' },
    template: { accentColor: '#16a34a', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', '[Biology] Which of the following is NOT a characteristic of living organisms?', ['Growth', 'Reproduction', 'Crystallisation', 'Metabolism'], 'C', 4),
      q('MCQ', '[Biology] The functional unit of the kidney is:', ['Nephron', 'Neuron', 'Lobule', 'Alveolus'], 'A', 4),
      q('MCQ', '[Physics] The momentum of a 10 kg object moving at 5 m/s is:', ['2 kg·m/s', '50 kg·m/s', '0.5 kg·m/s', '15 kg·m/s'], 'B', 4),
      q('MCQ', '[Chemistry] Atomic number of Carbon is:', ['6', '8', '12', '14'], 'A', 4),
      q('MCQ', '[Biology] DNA replication is:', ['Semi-conservative', 'Conservative', 'Dispersive', 'None of these'], 'A', 4),
      q('MCQ', '[Biology] Photosynthesis occurs in:', ['Mitochondria', 'Ribosome', 'Chloroplast', 'Nucleus'], 'C', 4),
    ],
  },
  'colorful-kids': {
    title: 'Fun Science Quiz 🌈',
    metadata: { instituteName: 'Sunshine Primary School', teacherName: '', subject: 'Science', className: 'Class III', maxMarks: 25, timeDuration: '1 Hour' },
    template: { accentColor: '#7c3aed', fontFamily: 'Arial' },
    questions: [
      q('MCQ', 'How many legs does a spider have?', ['4', '6', '8', '10'], 'C', 2),
      q('MCQ', 'What do plants use to make their own food?', ['Soil and water only', 'Sunlight, water and CO₂', 'Fertiliser', 'Rain'], 'B', 2),
      q('True/False', 'The Sun is a planet.', [], 'False', 1),
      q('True/False', 'Fish breathe using gills.', [], 'True', 1),
      q('Subjective', 'Name any two animals that live in water. 🐠', [], '', 2),
      q('Subjective', 'Draw and label the parts of a flower. 🌸', [], '', 3),
    ],
  },
  'olympiad': {
    title: 'Mathematics Olympiad',
    metadata: { instituteName: 'Mathematics Olympiad Foundation', teacherName: '', subject: 'Mathematics', className: 'Class IX–X', maxMarks: 100, timeDuration: '3 Hours' },
    template: { accentColor: '#b45309', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', 'The number of prime numbers between 1 and 100 is:', ['24', '25', '26', '27'], 'B', 5),
      q('MCQ', 'If a + b = 10 and ab = 21, then a² + b² equals:', ['58', '16', '100', '42'], 'A', 5),
      q('Subjective', 'Prove that for any integer n, the expression n³ – n is divisible by 6.', [], '', 10),
      q('Subjective', 'In triangle ABC, angle A = 90°. If AB = 5 cm and BC = 13 cm, find AC and the area of triangle ABC.', [], '', 10),
      q('Subjective', 'Find all integer solutions to the equation x² – y² = 35.', [], '', 10),
    ],
  },
  'coaching-premium': {
    title: 'Topic Assessment Test',
    metadata: { instituteName: 'Excellence Coaching Institute', teacherName: '', subject: 'Physics', className: 'Class XI', maxMarks: 100, timeDuration: '2 Hours' },
    template: { accentColor: '#0f766e', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', 'A body is thrown vertically upward with velocity u. The maximum height attained is:', ['u/g', 'u²/2g', 'u²/g', '2u²/g'], 'B', 4),
      q('MCQ', "Newton's law of cooling states that rate of cooling is proportional to:", ['Temperature of body', 'Difference in temperatures', 'Time elapsed', 'Thermal conductivity'], 'B', 4),
      q('MCQ', 'The dimension of coefficient of viscosity is:', ['ML⁻¹T⁻¹', 'M⁰LT⁻²', 'MLT⁻²', 'M⁰L²T⁻¹'], 'A', 4),
      q('Subjective', 'Derive the equation of motion v = u + at from first principles.', [], '', 8),
      q('Subjective', 'A car accelerates from rest at 2 m/s². Calculate (i) velocity after 10 s, and (ii) distance covered in 10 s.', [], '', 8),
    ],
  },
  'formal-collegiate': {
    title: 'End Semester Examination',
    metadata: { instituteName: 'Department of Physics & Mathematics', teacherName: '', subject: 'Mathematics', className: 'B.Sc. Second Year', maxMarks: 100, timeDuration: '3 Hours' },
    template: { accentColor: '#1e3a5f', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', 'A linear transformation T: R² → R² defined by T(x, y) = (x + y, x – y) is:', ['Neither injective nor surjective', 'Injective but not surjective', 'Surjective but not injective', 'Bijective'], 'D', 5),
      q('Subjective', 'State and prove the Fundamental Theorem of Calculus (Part I).', [], '', 15),
      q('Subjective', 'Find the eigenvalues and corresponding eigenvectors of the matrix A = [[2,1],[1,2]].', [], '', 15),
      q('Subjective', 'Evaluate the integral ∫₀¹ x²·e^x dx using integration by parts.', [], '', 15),
    ],
  },
  'icse-standard': {
    title: 'ICSE Board Examination – Mathematics',
    metadata: { instituteName: 'Council for the Indian School Certificate Examinations', teacherName: '', subject: 'Mathematics', className: 'Class X', maxMarks: 80, timeDuration: '2½ Hours' },
    template: { accentColor: '#1a1a2e', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', 'If the mean of 5 observations x, x+2, x+4, x+6, x+8 is 11, then the value of x is:', ['7', '8', '9', '10'], 'A', 2),
      q('MCQ', 'The angle of elevation of the top of a tower 30 m high from a point on the ground 30√3 m away is:', ['30°', '45°', '60°', '90°'], 'A', 2),
      q('Subjective', 'Using factor theorem, show that (x – 2) is a factor of x³ – 3x² + 4. Hence factorise the polynomial completely.', [], '', 5),
      q('Subjective', 'The following table shows the ages of 100 students of a school. Find the mean age. Age (years): 10, 11, 12, 13, 14. No. of students: 15, 22, 30, 18, 15.', [], '', 5),
      q('Subjective', 'In a right triangle ABC, right-angled at B, if tan A = 1/√3, find the value of: (i) sin A · cos C + cos A · sin C', [], '', 4),
    ],
  },
  'chapter-test': {
    title: 'Chapter Test – Triangles',
    metadata: { instituteName: '', teacherName: '', subject: 'Mathematics', className: 'Class IX', maxMarks: 25, timeDuration: '40 Minutes' },
    template: { accentColor: '#0369a1', fontFamily: 'Arial' },
    questions: [
      q('MCQ', 'Two triangles are congruent if two angles and the included side of one triangle are equal to:', ['Any two sides and one angle', 'Two angles and included side of the other', 'Three sides of the other', 'Two sides and any angle'], 'B', 1),
      q('MCQ', 'In △ABC, if AB = AC, then the angles opposite to them are:', ['Unequal', 'Complementary', 'Equal', 'Supplementary'], 'C', 1),
      q('True/False', 'A triangle can have two right angles.', [], 'False', 1),
      q('Subjective', 'State and prove the Angle Sum Property of a triangle.', [], '', 4),
      q('Subjective', 'In △PQR, PQ = PR. A line through P bisects angle QPR and meets QR at M. Prove that △PQM ≅ △PRM.', [], '', 5),
    ],
  },
  'pro-custom': {
    title: 'Custom Question Paper',
    metadata: { instituteName: '', teacherName: '', subject: 'Mathematics', className: 'Class X', maxMarks: 100, timeDuration: '3 Hours' },
    template: { accentColor: '#6d28d9', fontFamily: 'Times New Roman' },
    questions: [emptyQuestion()],
  },
};

// ─── A4 constants (natural px at 96 dpi) ─────────────────────────────────────
const A4_W_PX           = Math.round(210 * 96 / 25.4); // 794 px
const A4_H_PX           = Math.round(297 * 96 / 25.4); // 1123 px
const FOOTER_DISPLAY_H  = 20;   // px — footer bar
const PAGE_TOP_MARGIN   = 32;   // px — breathing room at top of pages 2+
const PAGE_BOTTOM_MARGIN = 18;  // px — breathing room above footer
// These are computed per-render based on the live preview scale (fluid):
// CONTENT_USABLE_H = PAGE_DISPLAY_H - FOOTER_DISPLAY_H - PAGE_BOTTOM_MARGIN
// CONTENT_NATURAL_H = CONTENT_USABLE_H / scale

// ─── Fluid Paged Preview ──────────────────────────────────────────────────────
// Scales to fill the available container width instead of a fixed 516 px card.
// The `containerWidth` prop is the live pixel width of the preview panel.

function PagedPreview({ paperData, containerWidth, showAnswers = false }) {
  const measureRef  = useRef(null);   // hidden full-height div for measurement
  const [pageBreaks, setPageBreaks] = useState([0]);

  // Derive display dimensions from available width (fill the container with 24 px padding each side)
  const PADDING        = 24;
  const pageDisplayW   = Math.max(300, containerWidth - PADDING * 2);
  const scale          = pageDisplayW / A4_W_PX;                          // fluid scale
  const pageDisplayH   = Math.round(A4_H_PX * scale);
  const contentDisplayH  = pageDisplayH - FOOTER_DISPLAY_H;
  const contentUsableH   = contentDisplayH - PAGE_BOTTOM_MARGIN;
  const contentNaturalH  = Math.round(contentUsableH / scale);

  useLayoutEffect(() => {
    const wrapper = measureRef.current;
    if (!wrapper || wrapper.scrollHeight === 0) return;

    const naturalH = wrapper.scrollHeight;
    const wRect    = wrapper.getBoundingClientRect();

    const avoidRanges = Array.from(wrapper.querySelectorAll('.pdf-question')).map(el => {
      const r = el.getBoundingClientRect();
      return {
        top:    (r.top    - wRect.top) / scale,
        bottom: (r.bottom - wRect.top) / scale,
      };
    });

    function findSmartBreak(idealPx, prevPx) {
      for (const r of avoidRanges) {
        if (r.top < idealPx && r.bottom > idealPx) {
          const candidate = r.top - 8;
          if (candidate > prevPx + 40) return candidate;
          break;
        }
      }
      return idealPx;
    }

    const starts = [0];
    let next = contentNaturalH;
    while (next < naturalH) {
      const bp = findSmartBreak(next, starts[starts.length - 1]);
      starts.push(bp);
      next = bp + contentNaturalH;
    }

    setPageBreaks(prev =>
      prev.length === starts.length && prev.every((v, i) => Math.abs(v - starts[i]) < 2)
        ? prev : starts
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentNaturalH, scale, paperData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>

      {/* Hidden full-height render used only for measurement — never visible */}
      <div style={{ position: 'fixed', top: 0, left: -9999, width: A4_W_PX, visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }} ref={measureRef}>
        <PdfPreview paperData={paperData} showAnswers={showAnswers} />
      </div>

      {pageBreaks.map((startNaturalPx, i) => {
        const topMargin = i > 0 ? PAGE_TOP_MARGIN : 0;
        const nextBreakNatural = i < pageBreaks.length - 1 ? pageBreaks[i + 1] : null;
        const pageContentEndPx = nextBreakNatural !== null
          ? Math.round((nextBreakNatural - startNaturalPx) * scale) + topMargin
          : contentDisplayH;

        return (
          <div key={i} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* A4 page card — fills available width */}
            <div style={{
              width: pageDisplayW,
              height: pageDisplayH,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 2px 16px rgba(0,0,0,0.22)',
              background: '#fff',
              borderRadius: 2,
            }}>
              {/* Scaled content */}
              <div
                style={{
                  position: 'absolute',
                  top: -(startNaturalPx * scale) + topMargin,
                  left: 0,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: A4_W_PX,
                }}
              >
                <PdfPreview paperData={paperData} showAnswers={showAnswers} />
              </div>

              {/* Top margin mask (pages 2+) */}
              {topMargin > 0 && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topMargin, background: '#fff', zIndex: 3 }} />
              )}

              {/* Bottom margin mask */}
              <div style={{ position: 'absolute', top: contentUsableH, left: 0, right: 0, height: PAGE_BOTTOM_MARGIN, background: '#fff', zIndex: 3 }} />

              {/* Smart-break overflow mask */}
              {pageContentEndPx < contentUsableH && (
                <div style={{ position: 'absolute', top: pageContentEndPx, left: 0, right: 0, bottom: FOOTER_DISPLAY_H + PAGE_BOTTOM_MARGIN, background: '#fff', zIndex: 3 }} />
              )}

              {/* Footer */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_DISPLAY_H,
                background: '#fff', borderTop: '1.5px solid #cbd5e1',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 10px', zIndex: 5, boxSizing: 'border-box',
              }}>
                <span style={{ fontSize: 8, color: '#94a3b8' }}>{paperData.metadata?.instituteName || ''}</span>
                <span style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>Page {i + 1} / {pageBreaks.length}</span>
                <span style={{ fontSize: 8, color: '#94a3b8' }}>{paperData.metadata?.subject || ''}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Resizable Divider Hook ───────────────────────────────────────────────────
// Returns [splitPct, dragHandleProps] where splitPct is 0–100 (% for editor).

function useSplitPane(initialPct = 45, minPct = 20, maxPct = 80) {
  const [splitPct, setSplitPct] = useState(initialPct);
  const dragging = useRef(false);
  const containerRef = useRef(null);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(maxPct, Math.max(minPct, pct)));
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [minPct, maxPct]);

  return { splitPct, containerRef, dragHandleProps: { onMouseDown } };
}

// ─── Main Editor Component ────────────────────────────────────────────────────

export default function EditorPage() {
  const { paperId } = useParams();
  const location = useLocation();
  const { user, profile, refreshProfile, canDownload } = useAuth();

  const [paperData, setPaperData] = useState({
    metadata: {
      instituteName: profile?.institute_name || '',
      teacherName: profile?.full_name || '',
      subject: location.state?.subject || 'Mathematics',
      className: 'Class X',
      maxMarks: 80,
      timeDuration: '3 Hours',
    },
    questions: [emptyQuestion()],
    template: { accentColor: '#1a365d', fontFamily: 'Times New Roman', layoutTemplate: 'classic' },
    title: 'Untitled Paper',
  });

  const [showPreview, setShowPreview] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [savedPaperId, setSavedPaperId] = useState(paperId || null);
  const [showMetadata, setShowMetadata] = useState(true);
  const [importBanner, setImportBanner] = useState('');

  // Measure preview panel width for fluid scaling
  const previewPanelRef = useRef(null);
  const [previewPanelWidth, setPreviewPanelWidth] = useState(600);

  // Resizable split pane
  const { splitPct, containerRef, dragHandleProps } = useSplitPane(45);

  // Keep preview width in sync with panel size
  useEffect(() => {
    if (!previewPanelRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setPreviewPanelWidth(entry.contentRect.width);
      }
    });
    ro.observe(previewPanelRef.current);
    return () => ro.disconnect();
  }, [showPreview]);

  // Load existing paper
  useEffect(() => {
    if (paperId) {
      getPaper(paperId).then(({ data }) => {
        if (data) {
          const meta = data.metadata || {};
          const normType = (t) => {
            if (t === 'short_answer' || t === 'long_answer') return 'Subjective';
            if (t === 'True/False') return 'True/False';
            if (t === 'MCQ') return 'MCQ';
            return 'Subjective';
          };
          const durationLabel = data.duration_minutes
            ? data.duration_minutes >= 60
              ? `${Math.floor(data.duration_minutes / 60)}${data.duration_minutes % 60 ? `.${data.duration_minutes % 60}` : ''} Hour${data.duration_minutes >= 120 ? 's' : ''}`
              : `${data.duration_minutes} Minutes`
            : '3 Hours';
          setPaperData({
            metadata: {
              ...meta,
              subject: meta.subject || data.subject || 'Mathematics',
              className: meta.className || (data.grade ? `Class ${data.grade}` : 'Class X'),
              maxMarks: meta.maxMarks || data.total_marks || 80,
              timeDuration: meta.timeDuration || durationLabel,
              teacherName: meta.teacherName || profile?.full_name || '',
              instituteName: meta.instituteName || profile?.institute_name || '',
            },
            questions: (data.questions || [emptyQuestion()]).map(q => ({
              ...q,
              id: q.id || uuidv4(),
              type: normType(q.type),
              options: (q.options || ['', '', '', '']).map(o => o ?? ''),
              answer: q.answer ?? '',
            })),
            template: data.metadata?.template || { accentColor: '#1a365d', fontFamily: 'Times New Roman' },
            title: data.title,
          });
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);

  // Once profile loads, backfill teacher/institute name if still empty
  useEffect(() => {
    if (!profile?.full_name) return;
    setPaperData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        teacherName: prev.metadata.teacherName || profile.full_name,
        instituteName: prev.metadata.instituteName || profile.institute_name || '',
      },
    }));
  }, [profile?.full_name, profile?.institute_name]);

  // Apply template preset
  useEffect(() => {
    const templateId = location.state?.templateId;
    if (templateId && !paperId) {
      const preset = TEMPLATE_PRESETS[templateId];
      if (preset) {
        setPaperData({
          title: preset.title,
          metadata: {
            ...preset.metadata,
            instituteName: preset.metadata.instituteName || profile?.institute_name || '',
            teacherName: preset.metadata.teacherName || profile?.full_name || '',
          },
          questions: preset.questions,
          template: preset.template,
        });
        setImportBanner(`Template applied: ${preset.title}`);
        window.history.replaceState({}, '');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle questions imported from PDF Tools
  useEffect(() => {
    const iq = location.state?.importedQuestions;
    const it = location.state?.importedTitle;
    if (iq && iq.length > 0 && !paperId) {
      const normType = (t) => {
        if (t === 'short_answer' || t === 'long_answer') return 'Subjective';
        if (t === 'True/False' || t === 'MCQ') return t;
        return 'Subjective';
      };
      setPaperData(prev => ({ ...prev, questions: iq.map(q => ({
        ...q,
        id: q.id || uuidv4(),
        type: normType(q.type),
        options: (q.options || ['', '', '', '']).map(o => o ?? ''),
        answer: q.answer ?? '',
      })), title: it || 'Imported Question Paper' }));
      setImportBanner(`${iq.length} question${iq.length > 1 ? 's' : ''} imported from PDF`);
      window.history.replaceState({}, '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMetadata = (key, value) =>
    setPaperData(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));

  const updateQuestion = (id, field, value) =>
    setPaperData(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q),
    }));

  const updateOption = (qId, optIdx, value) =>
    setPaperData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === qId ? { ...q, options: q.options.map((o, i) => i === optIdx ? value : o) } : q
      ),
    }));

  const addQuestion = (type = 'MCQ') => {
    const nq = emptyQuestion();
    nq.type = type;
    setPaperData(prev => ({ ...prev, questions: [...prev.questions, nq] }));
  };

  const removeQuestion = (id) =>
    setPaperData(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));

  const handleImageUpload = (qId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    updateQuestion(qId, 'imageUrl', URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      title: paperData.title,
      subject: paperData.metadata.subject,
      institute_name: paperData.metadata.instituteName,
      teacher_name: paperData.metadata.teacherName,
      class_name: paperData.metadata.className,
      max_marks: parseInt(paperData.metadata.maxMarks) || 80,
      time_duration: paperData.metadata.timeDuration,
      questions: paperData.questions,
      metadata: { ...paperData.metadata, template: paperData.template },
    };

    if (savedPaperId) {
      // Update existing paper — don't create duplicate
      await fastapiClient.patch(`/api/papers/${savedPaperId}`, payload);
      refreshProfile();
    } else {
      const { data } = await savePaper(payload);
      if (data) {
        setSavedPaperId(data.id);
        await incrementPaperCount(user.id);
        refreshProfile();
      }
    }
    setSaving(false);
  };

  const handleLatexDownload = () => {
    // Strip answers when showAnswers is off
    const dataForLatex = showAnswers ? paperData : {
      ...paperData,
      questions: paperData.questions.map(q => ({ ...q, answer: '' })),
    };
    try {
      const tex = generateLatex(dataForLatex, 'cbse');
      const safeName = (paperData.title || 'question-paper').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      downloadLatexFile(tex, `${safeName}${showAnswers ? '-with-answers' : ''}.tex`);
    } catch (err) {
      console.error('LaTeX generation error:', err);
    }
  };

  // ── Download — clones PdfPreview off-screen so live preview is NEVER mutated ──
  const handleDownload = async (withAnswers = false) => {
    if (!canDownload()) { setShowPaywall(true); return; }
    setDownloading(true);
    try {
      // Quality check
      const verificationResult = await verifyPaperQuality(paperData);
      if (!verificationResult.isProfessional) {
        const proceed = window.confirm(
          `Quality Issues Found:\n\n${verificationResult.issues.join('\n')}\n\nContinue with download anyway?`
        );
        if (!proceed) { setDownloading(false); return; }
      }

      // Off-screen container — placed far left so it's invisible but still in normal flow
      const offscreen = document.createElement('div');
      Object.assign(offscreen.style, {
        position: 'absolute', top: '0', left: '-9999px',
        width: `${A4_W_PX}px`,
        background: '#ffffff', pointerEvents: 'none',
      });
      document.body.appendChild(offscreen);

      // Render a fresh PdfPreview into the off-screen div
      const { createRoot } = await import('react-dom/client');
      const tmpRoot = createRoot(offscreen);
      await new Promise(resolve => {
        tmpRoot.render(<PdfPreview paperData={paperData} showAnswers={withAnswers} />);
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      const cloneEl = offscreen.firstElementChild || offscreen;

      // Measure question positions for smart page breaks
      const cloneRect = cloneEl.getBoundingClientRect();
      const avoidRanges = Array.from(cloneEl.querySelectorAll('.pdf-question')).map(el => {
        const r = el.getBoundingClientRect();
        return { top: r.top - cloneRect.top, bottom: r.bottom - cloneRect.top };
      });

      const SCALE = 2; // 192 DPI
      const PADDING_MM = 10;

      // html-to-image uses SVG foreignObject — no scroll/position offset bugs
      const canvas = await toCanvas(cloneEl, {
        pixelRatio: SCALE,
        backgroundColor: '#ffffff',
        width: A4_W_PX,
        height: cloneEl.scrollHeight,
        fontEmbedCSS: '',           // skip external font fetching (avoids CORS errors)
        skipAutoScale: false,
      });

      tmpRoot.unmount();
      document.body.removeChild(offscreen);

      const effectiveHeight = canvas.height;
      const avoidRangesPx = avoidRanges.map(r => ({
        top:    Math.round(r.top    * SCALE),
        bottom: Math.round(r.bottom * SCALE),
      }));

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidthMM      = pdf.internal.pageSize.getWidth();
      const pageHeightMM     = pdf.internal.pageSize.getHeight();
      const FOOTER_H_MM      = 8;
      const BOTTOM_MARGIN_MM = 7;
      const contentHeightMM  = pageHeightMM - PADDING_MM - FOOTER_H_MM - BOTTOM_MARGIN_MM;
      const pageHeightPx     = Math.round(canvas.width * contentHeightMM / pageWidthMM);

      function findSmartBreak(idealPx, prevPx) {
        for (const r of avoidRangesPx) {
          if (r.top < idealPx && r.bottom > idealPx) {
            const candidate = r.top - SCALE * 8;
            if (candidate > prevPx + SCALE * 40) return candidate;
            break;
          }
        }
        return idealPx;
      }

      const sliceStarts = [0];
      let nextIdeal = pageHeightPx;
      while (nextIdeal < effectiveHeight) {
        const breakPx = findSmartBreak(nextIdeal, sliceStarts[sliceStarts.length - 1]);
        sliceStarts.push(breakPx);
        nextIdeal = breakPx + pageHeightPx;
      }

      sliceStarts.forEach((startPx, idx) => {
        const endPx    = idx + 1 < sliceStarts.length ? sliceStarts[idx + 1] : effectiveHeight;
        const sliceH   = endPx - startPx;
        const sliceHmm = sliceH * pageWidthMM / canvas.width;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, sliceH);
        ctx.drawImage(canvas, 0, startPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        if (idx > 0) pdf.addPage();
        // Place image at PADDING_MM on every page — mirrors the preview padding exactly
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, PADDING_MM, pageWidthMM, sliceHmm);

        // Vector footer
        const footerY = pageHeightMM - FOOTER_H_MM;
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.3);
        pdf.line(5, footerY, pageWidthMM - 5, footerY);
        const textY = footerY + FOOTER_H_MM * 0.62;
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text(paperData.metadata?.instituteName || '', 5, textY);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Page ${idx + 1} / ${sliceStarts.length}`, pageWidthMM / 2, textY, { align: 'center' });
        pdf.setTextColor(148, 163, 184);
        pdf.text(paperData.metadata?.subject || '', pageWidthMM - 5, textY, { align: 'right' });
      });

      const suffix = withAnswers ? '-with-answers' : '';
      pdf.save(`${paperData.title || 'question-paper'}${suffix}-${Date.now()}.pdf`);

      if (!['monthly', 'yearly'].includes(profile?.subscription_status)) {
        await decrementCredit(user.id);
        refreshProfile();
      }
      await handleSave();
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('PDF generation failed. Please try again.');
    }
    setDownloading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Top toolbar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-2 shadow-sm">
        <input
          value={paperData.title}
          onChange={e => setPaperData(prev => ({ ...prev, title: e.target.value }))}
          className="font-semibold text-primary-900 text-sm border-none outline-none bg-transparent flex-1 max-w-xs"
          placeholder="Paper Title..."
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          {paperData.questions?.some(q => q.answer) && (
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all ${
                showAnswers
                  ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              title={showAnswers ? 'Hide answers in preview' : 'Show answers in preview'}
            >
              {showAnswers ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  Hide Answers
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Show Answers
                </>
              )}
            </button>
          )}
          {paperData.questions?.some(q => q.answer) && (
            <button
              onClick={() => setShowAnswerReview(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all ${
                paperData.questions.some(q => q.answer && q.answer_verified === false)
                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              title="Review and edit AI-generated answers"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {paperData.questions.some(q => q.answer && q.answer_verified === false)
                ? `Review Answers (${paperData.questions.filter(q => q.answer && q.answer_verified === false).length} flagged)`
                : 'Review Answers'}
            </button>
          )}
          <button
            onClick={handleLatexDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            title="Download as LaTeX (.tex)"
          >
            <FileCode className="w-4 h-4" /> LaTeX
          </button>
          <button
            onClick={() => handleDownload(showAnswers)}
            disabled={downloading}
            className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-4"
            title={showAnswers ? 'Download PDF with answers' : 'Download PDF'}
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF{showAnswers ? ' + Answers' : ''}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-28">
        {/* Resizable split container */}
        <div
          ref={containerRef}
          className="flex"
          style={{ height: 'calc(100vh - 112px)', overflow: 'hidden' }}
        >
          {/* ── Left: Editor ── */}
          <div
            style={{ width: showPreview ? `${splitPct}%` : '100%', minWidth: 0, transition: 'width 0.05s' }}
            className="overflow-y-auto bg-gray-50 p-4 flex-shrink-0"
          >
            {importBanner && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                  <span>✅</span> {importBanner} — review and edit below
                </div>
                <button onClick={() => setImportBanner('')} className="text-green-400 hover:text-green-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden">
              <button
                onClick={() => setShowMetadata(!showMetadata)}
                className="w-full flex items-center justify-between px-5 py-3 font-semibold text-primary-900 text-sm hover:bg-gray-50"
              >
                <span>📋 Paper Metadata</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showMetadata ? 'rotate-180' : ''}`} />
              </button>
              {showMetadata && (
                <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ['instituteName', 'Institute Name'],
                    ['teacherName', 'Teacher Name'],
                    ['className', 'Class'],
                    ['maxMarks', 'Total Marks'],
                    ['timeDuration', 'Time Duration'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
                      <input
                        value={paperData.metadata[key] || ''}
                        onChange={e => updateMetadata(key, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-900"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Subject</label>
                    <select
                      value={paperData.metadata.subject || 'Mathematics'}
                      onChange={e => updateMetadata('subject', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-900"
                    >
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Layout Templates */}
            <div className="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden">
              <div className="px-5 py-3 font-semibold text-primary-900 text-sm border-b border-gray-100">
                Layout Template
              </div>
              <div className="px-5 py-4 flex gap-3 flex-wrap">
                {LAYOUT_TEMPLATES.map(lt => {
                  const active = (paperData.template.layoutTemplate || 'classic') === lt.id;
                  return (
                    <button
                      key={lt.id}
                      onClick={() => setPaperData(prev => ({ ...prev, template: { ...prev.template, layoutTemplate: lt.id } }))}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all"
                      style={{ borderColor: active ? '#1a365d' : '#e2e8f0', background: active ? '#f0f4ff' : '#fff' }}
                      title={lt.desc}
                    >
                      {lt.thumb}
                      <span className="text-xs font-medium" style={{ color: active ? '#1a365d' : '#64748b' }}>{lt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Questions */}
            {paperData.questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={idx}
                onChange={updateQuestion}
                onOptionChange={updateOption}
                onRemove={removeQuestion}
                onImageUpload={handleImageUpload}
              />
            ))}

            <button
              onClick={() => addQuestion('MCQ')}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-gray-300 text-gray-600 text-sm rounded-xl hover:border-primary-900 hover:text-primary-900 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>

          {/* ── Drag Handle ── */}
          {showPreview && (
            <div
              {...dragHandleProps}
              style={{
                width: 6,
                flexShrink: 0,
                background: '#e2e8f0',
                cursor: 'col-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#94a3b8'}
              onMouseLeave={e => e.currentTarget.style.background = '#e2e8f0'}
              title="Drag to resize"
            >
              <GripVertical style={{ width: 12, height: 12, color: '#64748b', pointerEvents: 'none' }} />
            </div>
          )}

          {/* ── Right: PDF Preview ── */}
          {showPreview && (
            <div
              ref={previewPanelRef}
              style={{ flex: 1, minWidth: 0 }}
              className="overflow-y-auto overflow-x-hidden bg-gray-300"
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-10 bg-gray-300 px-4 pt-3 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Live Preview</span>
                  <span className="text-xs text-gray-500">A4 Pages</span>
                </div>
              </div>

              <div className="px-6 pb-6">
                <PagedPreview paperData={paperData} containerWidth={previewPanelWidth} showAnswers={showAnswers} />
              </div>
            </div>
          )}
        </div>
      </div>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}

      {showAnswerReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="font-semibold text-primary-900 text-lg">Review Answers</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {paperData.questions.filter(q => q.answer && q.answer_verified === false).length > 0
                    ? `${paperData.questions.filter(q => q.answer && q.answer_verified === false).length} answers flagged for review — edit if incorrect`
                    : 'All answers verified by AI — review and edit if needed'}
                </p>
              </div>
              <button onClick={() => setShowAnswerReview(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Answer list */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {paperData.questions.map((q, globalIdx) => {
                const flagged = q.answer_verified === false;
                return (
                  <div key={idx} className={`rounded-xl border p-4 ${flagged ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      {flagged ? (
                        <span className="text-xs font-bold px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full flex-shrink-0">⚠ Needs Review</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex-shrink-0">✓ Verified</span>
                      )}
                      <span className="text-xs text-gray-500">{q.type} · {q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm text-gray-800 font-medium mb-3">Q{globalIdx + 1}. {q.question}</p>
                    {q.options && (
                      <div className="grid grid-cols-2 gap-1 mb-3">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`text-xs px-2 py-1 rounded ${q.answer === opt || q.answer?.startsWith(String.fromCharCode(65+oi)) ? 'bg-green-100 text-green-800 font-semibold' : 'bg-white text-gray-600 border border-gray-200'}`}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 flex-shrink-0">Answer:</span>
                      <input
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        value={q.answer || ''}
                        onChange={e => {
                          const updated = [...paperData.questions];
                          updated[globalIdx] = { ...updated[globalIdx], answer: e.target.value, answer_verified: true };
                          setPaperData(prev => ({ ...prev, questions: updated }));
                        }}
                      />
                      <button
                        onClick={() => {
                          const updated = [...paperData.questions];
                          updated[globalIdx] = { ...updated[globalIdx], answer_verified: true };
                          setPaperData(prev => ({ ...prev, questions: updated }));
                        }}
                        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          q.answer_verified === true ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'
                        }`}
                      >
                        {q.answer_verified === true ? '✓ Approved' : 'Approve'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {paperData.questions.filter(q => q.answer && q.answer_verified === true).length} / {paperData.questions.length} questions
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const updated = paperData.questions.map(q => q.answer ? { ...q, answer_verified: true } : q);
                    setPaperData(prev => ({ ...prev, questions: updated }));
                  }}
                  className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Approve All
                </button>
                <button
                  onClick={() => { handleSave(); setShowAnswerReview(false); }}
                  className="text-sm px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-blue-800"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Quality Verification ──────────────────────────────────────────────────

async function verifyPaperQuality(paperData) {
  const issues = [];
  let isProfessional = true;
  const questions = paperData.questions || [];

  const questionTexts = questions.map(q => q.question.toLowerCase().trim());
  const duplicates = questionTexts.filter((text, index) => questionTexts.indexOf(text) !== index);
  if (duplicates.length > 0) { issues.push('⚠️ Duplicate questions found'); isProfessional = false; }

  const emptyQs = questions.filter(q => !q.question || q.question.trim().length === 0);
  if (emptyQs.length > 0) { issues.push(`❌ ${emptyQs.length} empty question(s) found`); isProfessional = false; }

  questions.filter(q => q.type === 'MCQ').forEach((q, index) => {
    const valid = q.options.filter(o => o && o.trim());
    const dups  = valid.map(o => o.toLowerCase().trim()).filter((t, i, a) => a.indexOf(t) !== i);
    if (dups.length > 0)   { issues.push(`❌ Q${index + 1}: Duplicate options`); isProfessional = false; }
    if (valid.length < 2)  { issues.push(`❌ Q${index + 1}: Needs at least 2 options`); isProfessional = false; }
    const empty = q.options.filter(o => !o || !o.trim());
    if (empty.length > 0)  { issues.push(`❌ Q${index + 1}: Empty options`); isProfessional = false; }
    if (q.answer && !['A','B','C','D'].includes(q.answer.trim()[0]?.toUpperCase())) {
      issues.push(`❌ Q${index + 1}: Invalid answer key`); isProfessional = false;
    }
  });

  const totalMarks    = questions.reduce((s, q) => s + (parseInt(q.marks) || 1), 0);
  const expectedMarks = paperData.metadata?.maxMarks || 80;
  if (Math.abs(totalMarks - expectedMarks) > 5) {
    issues.push(`⚠️ Total marks (${totalMarks}) ≠ expected (${expectedMarks})`); isProfessional = false;
  }

  const requiredMeta = ['instituteName', 'teacherName', 'subject', 'className'];
  const missingMeta  = requiredMeta.filter(k => !paperData.metadata[k]);
  if (missingMeta.length > 0) issues.push(`⚠️ Missing metadata: ${missingMeta.join(', ')}`);

  return { isProfessional, issues };
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({ question, index, onChange, onOptionChange, onRemove, onImageUpload }) {
  const [expanded, setExpanded] = useState(true);
  const fileRef = useRef(null);

  const typeColors = {
    'MCQ': 'bg-blue-100 text-blue-700',
    'True/False': 'bg-green-100 text-green-700',
    'Subjective': 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 mb-3 overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="w-7 h-7 rounded-full bg-primary-900 text-white text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColors[question.type]}`}>
          {question.type}
        </span>
        <span className="text-sm text-gray-600 truncate flex-1">
          {question.question
            ? question.question.substring(0, 60) + (question.question.length > 60 ? '...' : '')
            : 'Empty question...'}
        </span>
        <span className="text-xs text-gray-400">{question.marks}m</span>
        <button
          onClick={e => { e.stopPropagation(); onRemove(question.id); }}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <label className="text-xs text-gray-500 font-medium">Type:</label>
            {['MCQ', 'True/False', 'Subjective'].map(t => (
              <button
                key={t}
                onClick={() => onChange(question.id, 'type', t)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                  question.type === t ? 'bg-primary-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs text-gray-500">Marks:</label>
              <input
                type="number"
                value={question.marks}
                onChange={e => onChange(question.id, 'marks', parseInt(e.target.value) || 1)}
                className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
                min="1"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-500 font-medium block mb-1">Question (supports $LaTeX$)</label>
            <LatexInput
              value={question.question}
              onChange={val => onChange(question.id, 'question', val)}
              multiline
              placeholder="Enter question... Use $\frac{1}{2}$ for LaTeX math"
            />
          </div>

          {question.type === 'MCQ' && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {question.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={opt ?? ''}
                    onChange={e => onOptionChange(question.id, i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-900 font-mono"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Correct Answer (A/B/C/D)</label>
                <input
                  value={question.answer ?? ''}
                  onChange={e => onChange(question.id, 'answer', e.target.value.toUpperCase())}
                  placeholder="A"
                  className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center"
                  maxLength={1}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => onImageUpload(question.id, e)} />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-1.5 hover:border-primary-900 hover:text-primary-900 transition-all"
            >
              <Image className="w-3 h-3" /> {question.imageUrl ? 'Change Image' : 'Add Diagram/Image'}
            </button>
            {question.imageUrl && (
              <img src={question.imageUrl} alt="diagram" className="h-12 rounded-lg border border-gray-200" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}