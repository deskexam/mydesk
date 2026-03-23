import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Lock, ChevronRight, Palette } from 'lucide-react';
import Navbar from '../components/auth/Navbar';
import { useAuth } from '../hooks/useAuth';

const TEMPLATES = [
  {
    id: 'cbse-standard', name: 'CBSE Board Style', category: 'Board Exams',
    desc: 'Standard CBSE format with formal header, instructions section and proper marking scheme.',
    color: '#1a365d', tags: ['CBSE', 'Board', 'Formal'], isPro: false, emoji: '📋'
  },
  {
    id: 'jee-mock', name: 'JEE Mock Test', category: 'Competitive',
    desc: 'Physics, Chemistry & Math sections. JEE Mains/Advanced style with single-digit integer and MCQ types.',
    color: '#dc2626', tags: ['JEE', 'PCM', 'Competitive'], isPro: false, emoji: '🎯'
  },
  {
    id: 'weekly-test', name: 'Weekly Class Test', category: 'Class Tests',
    desc: 'Quick weekly assessment format. Clean and simple for regular classroom evaluation.',
    color: '#2563eb', tags: ['Weekly', 'Simple', 'Quick'], isPro: false, emoji: '📅'
  },
  {
    id: 'neet-mock', name: 'NEET Mock Test', category: 'Competitive',
    desc: 'Biology, Physics and Chemistry. NEET standard with 200 questions format.',
    color: '#16a34a', tags: ['NEET', 'Medical', 'Bio'], isPro: false, emoji: '🧬'
  },
  {
    id: 'colorful-kids', name: 'Colorful Kids', category: 'School',
    desc: 'Fun and engaging format for younger students. Colorful headers, bigger fonts, friendly layout.',
    color: '#7c3aed', tags: ['Kids', 'Primary', 'Fun'], isPro: false, emoji: '🌈'
  },
  {
    id: 'olympiad', name: 'Math Olympiad', category: 'Competitive',
    desc: 'International Olympiad style for gifted students. Clean, elegant, problem-focused.',
    color: '#b45309', tags: ['Olympiad', 'Advanced', 'Math'], isPro: false, emoji: '🏆'
  },
  {
    id: 'coaching-premium', name: 'Coaching Premium', category: 'Coaching',
    desc: 'Professional branded format for private coaching institutes with logo placement.',
    color: '#0f766e', tags: ['Coaching', 'Branded', 'Pro'], isPro: false, emoji: '🏫'
  },
  {
    id: 'formal-collegiate', name: 'Formal Collegiate', category: 'University',
    desc: 'University-level examination format with department header and formal layout.',
    color: '#1e3a5f', tags: ['University', 'College', 'Formal'], isPro: false, emoji: '🎓'
  },
  {
    id: 'icse-standard', name: 'ICSE Standard', category: 'Board Exams',
    desc: 'ICSE board examination style paper with proper section divisions.',
    color: '#1a1a2e', tags: ['ICSE', 'Board', 'Standard'], isPro: false, emoji: '📚'
  },
  {
    id: 'chapter-test', name: 'Chapter-wise Test', category: 'Class Tests',
    desc: 'Focused single-chapter assessment. Shows chapter name prominently in header.',
    color: '#0369a1', tags: ['Chapter', 'Focused', 'Quick'], isPro: false, emoji: '📖'
  },
  {
    id: 'pro-custom', name: 'Pro Custom Builder', category: 'Pro',
    desc: 'Fully customizable canvas — drag headers, change fonts (Times New Roman/Arial), adjust margins.',
    color: '#6d28d9', tags: ['Custom', 'Drag', 'Editable'], isPro: true, emoji: '⚡'
  },
];

const CATEGORIES = ['All', 'Board Exams', 'Competitive', 'Class Tests', 'School', 'Coaching', 'University', 'Pro'];

// ─── Mini Paper Previews ──────────────────────────────────────────────────────
// Each renders a scaled-down visual that actually looks like the paper format.


function Bubble({ filled, color }) {
  return (
    <div style={{
      width: 7, height: 7, borderRadius: '50%',
      border: `1px solid ${color}`,
      backgroundColor: filled ? color : 'transparent',
      flexShrink: 0,
    }} />
  );
}

const PREVIEWS = {
  'cbse-standard': () => (
    <div style={{ background: '#fff', padding: '8px 10px', fontFamily: 'serif', fontSize: 6, color: '#1a365d' }}>
      {/* Double border header */}
      <div style={{ border: '2px solid #1a365d', borderBottom: 'none', padding: '4px 6px' }}>
        <div style={{ border: '1px solid #1a365d', padding: '3px 4px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 7, letterSpacing: 0.5 }}>KENDRIYA VIDYALAYA SANGATHAN</div>
          <div style={{ fontSize: 5.5, marginTop: 1, color: '#334155' }}>ANNUAL EXAMINATION 2024–25</div>
          <div style={{ borderTop: '1px solid #1a365d', marginTop: 3, paddingTop: 2, display: 'flex', justifyContent: 'space-between' }}>
            <span>Subject: Mathematics</span>
            <span>Class: X</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
            <span>Max. Marks: 80</span>
            <span>Time: 3 Hours</span>
          </div>
        </div>
      </div>
      <div style={{ border: '2px solid #1a365d', borderTop: '1px solid #1a365d', padding: '3px 6px' }}>
        <div style={{ fontSize: 5.5, fontWeight: 600, marginBottom: 2 }}>General Instructions:</div>
        {['All questions are compulsory.', 'Section A: 1 mark each (Q1–10)', 'Section B: 3 marks each (Q11–16)'].map((t, i) => (
          <div key={i} style={{ color: '#475569', marginBottom: 1 }}>• {t}</div>
        ))}
        <div style={{ marginTop: 4, fontWeight: 700, fontSize: 6, borderTop: '1px solid #1a365d', paddingTop: 2 }}>SECTION – A (MCQ)</div>
        <div style={{ marginTop: 2, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600 }}>1.</span>
          <div>
            <div style={{ color: '#334155' }}>HCF of 26 and 91 is:</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 1, color: '#475569' }}>
              {['(A) 13', '(B) 26', '(C) 91', '(D) 1'].map(o => <span key={o}>{o}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  ),

  'jee-mock': () => (
    <div style={{ background: '#fff', fontFamily: 'Arial, sans-serif', fontSize: 6 }}>
      {/* Red header */}
      <div style={{ background: '#dc2626', padding: '5px 8px', color: '#fff' }}>
        <div style={{ fontWeight: 700, fontSize: 8, textAlign: 'center', letterSpacing: 0.5 }}>JEE MAIN MOCK TEST</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 5.5 }}>
          <span>Max. Marks: 300</span><span>Paper 1 – PCM</span><span>Time: 3 Hrs</span>
        </div>
      </div>
      {/* Section tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #fca5a5' }}>
        {['PHYSICS', 'CHEMISTRY', 'MATHEMATICS'].map((s, i) => (
          <div key={s} style={{
            flex: 1, textAlign: 'center', padding: '2px 0', fontSize: 5, fontWeight: 700,
            background: i === 0 ? '#fee2e2' : '#fff',
            borderRight: i < 2 ? '1px solid #fca5a5' : 'none',
            color: i === 0 ? '#dc2626' : '#6b7280',
          }}>{s}</div>
        ))}
      </div>
      <div style={{ padding: '4px 8px' }}>
        <div style={{ fontSize: 5.5, color: '#374151', fontWeight: 600, marginBottom: 2 }}>
          Section A – Single Correct (4 marks each, –1 for wrong)
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-start', marginBottom: 3 }}>
          <span style={{ fontWeight: 700, color: '#dc2626' }}>1.</span>
          <div>
            <div style={{ color: '#374151' }}>A particle moves in a circle of radius R. Displacement after half circle:</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 1.5, flexWrap: 'wrap' }}>
              {['(A) 0', '(B) πR', '(C) 2R', '(D) 2πR'].map(o => (
                <span key={o} style={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Bubble filled={false} color="#dc2626" /> {o}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px dashed #fca5a5', paddingTop: 2, fontSize: 5, color: '#6b7280' }}>
          Section B – Integer Type (4 marks each, no negative marking)
        </div>
      </div>
    </div>
  ),

  'weekly-test': () => (
    <div style={{ background: '#fff', fontFamily: 'Arial, sans-serif', fontSize: 6 }}>
      {/* Simple blue header */}
      <div style={{ background: '#2563eb', padding: '5px 8px', color: '#fff' }}>
        <div style={{ fontWeight: 700, fontSize: 7, textAlign: 'center' }}>WEEKLY CLASS TEST</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1.5, fontSize: 5.5 }}>
          <span>Subject: Science</span><span>Class: VIII</span><span>Marks: 20</span>
        </div>
      </div>
      <div style={{ padding: '5px 8px' }}>
        {/* Name / Date row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <span style={{ color: '#374151' }}>Name: </span>
            <div style={{ borderBottom: '1px solid #9ca3af', width: '100%', marginTop: 1 }} />
          </div>
          <div>
            <span style={{ color: '#374151' }}>Date: </span>
            <div style={{ borderBottom: '1px solid #9ca3af', width: 30, marginTop: 1 }} />
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 6, color: '#2563eb', marginBottom: 2 }}>Section A – MCQ (1 mark each)</div>
        {[
          { n: '1.', q: 'Gas released during photosynthesis?', opts: ['CO₂', 'O₂', 'N₂', 'H₂'] },
          { n: '2.', q: 'SI unit of force is:', opts: ['Joule', 'Watt', 'Newton', 'Pascal'] },
        ].map(item => (
          <div key={item.n} style={{ marginBottom: 3, display: 'flex', gap: 2 }}>
            <span style={{ fontWeight: 600, color: '#1e40af' }}>{item.n}</span>
            <div>
              <div style={{ color: '#374151' }}>{item.q}</div>
              <div style={{ display: 'flex', gap: 5, marginTop: 1, color: '#6b7280' }}>
                {item.opts.map((o, i) => <span key={o}>{String.fromCharCode(65 + i)}. {o}</span>)}
              </div>
            </div>
          </div>
        ))}
        <div style={{ fontWeight: 700, fontSize: 6, color: '#2563eb', marginTop: 2 }}>Section B – True / False</div>
      </div>
    </div>
  ),

  'neet-mock': () => (
    <div style={{ background: '#fff', fontFamily: 'Arial, sans-serif', fontSize: 6 }}>
      {/* Green header */}
      <div style={{ background: '#15803d', padding: '5px 8px', color: '#fff' }}>
        <div style={{ fontWeight: 700, fontSize: 8, textAlign: 'center', letterSpacing: 0.5 }}>NEET MOCK TEST</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 5.5 }}>
          <span>Max. Marks: 720</span><span>180 Questions</span><span>Time: 3 Hr 20 Min</span>
        </div>
      </div>
      {/* Section tabs */}
      <div style={{ display: 'flex' }}>
        {[['BIOLOGY', '#15803d', true], ['PHYSICS', '#6b7280', false], ['CHEMISTRY', '#6b7280', false]].map(([s, c, active]) => (
          <div key={s} style={{
            flex: 1, textAlign: 'center', padding: '2px 0', fontSize: 5, fontWeight: 700,
            background: active ? '#dcfce7' : '#f9fafb',
            borderBottom: active ? `2px solid ${c}` : '1px solid #e5e7eb',
            color: c,
          }}>{s}</div>
        ))}
      </div>
      <div style={{ padding: '4px 8px' }}>
        <div style={{ fontSize: 5.5, color: '#166534', fontWeight: 600, marginBottom: 2 }}>
          Q1–90: Biology (4 marks each, –1 for wrong)
        </div>
        {[
          'Which of the following is NOT a characteristic of living organisms?',
          'The functional unit of the kidney is:',
        ].map((q, i) => (
          <div key={i} style={{ marginBottom: 3, display: 'flex', gap: 2 }}>
            <span style={{ fontWeight: 600, color: '#15803d', minWidth: 10 }}>{i + 1}.</span>
            <div>
              <div style={{ color: '#374151' }}>{q}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 1.5, flexWrap: 'wrap' }}>
                {['A', 'B', 'C', 'D'].map(o => (
                  <span key={o} style={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Bubble filled={false} color="#15803d" /> ({o})
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),

  'colorful-kids': () => (
    <div style={{ background: '#fff', fontFamily: 'Arial, sans-serif', fontSize: 6 }}>
      {/* Colorful gradient header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', padding: '6px 8px', color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 10 }}>🌈</div>
        <div style={{ fontWeight: 800, fontSize: 8, letterSpacing: 0.5, marginTop: 1 }}>FUN SCIENCE QUIZ</div>
        <div style={{ fontSize: 5.5, marginTop: 1, opacity: 0.9 }}>Sunshine Primary School · Class III · 25 Marks</div>
      </div>
      <div style={{ padding: '5px 8px' }}>
        {/* Name box */}
        <div style={{ background: '#faf5ff', border: '1px dashed #a855f7', borderRadius: 4, padding: '3px 5px', marginBottom: 4, display: 'flex', gap: 4 }}>
          <span style={{ color: '#7c3aed' }}>My Name:</span>
          <div style={{ flex: 1, borderBottom: '1px solid #c084fc' }} />
        </div>
        <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 2, fontSize: 6.5 }}>⭐ Section A – Choose the Right Answer!</div>
        <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, color: '#ec4899', fontSize: 7 }}>1.</span>
          <div>
            <div style={{ color: '#374151', fontWeight: 500 }}>How many legs does a spider have? 🕷️</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 1.5 }}>
              {['4', '6', '8', '10'].map((o, i) => (
                <span key={o} style={{
                  padding: '1px 4px', borderRadius: 6,
                  background: i === 2 ? '#7c3aed' : '#f3e8ff',
                  color: i === 2 ? '#fff' : '#7c3aed',
                  fontWeight: 600,
                }}>({o})</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: 6.5 }}>✅ Section B – True or False?</div>
        <div style={{ color: '#475569', marginTop: 1 }}>2. The Sun is a planet. [ True / <u>False</u> ] 🌞</div>
      </div>
    </div>
  ),

  'olympiad': () => (
    <div style={{ background: '#fff', fontFamily: 'Georgia, serif', fontSize: 6 }}>
      {/* Gold double border */}
      <div style={{ border: '2px solid #b45309', margin: 3, padding: '4px 6px' }}>
        <div style={{ border: '1px solid #d97706', padding: '3px 4px', textAlign: 'center' }}>
          <div style={{ fontSize: 6, color: '#92400e', letterSpacing: 1, fontWeight: 600 }}>MATHEMATICS OLYMPIAD</div>
          <div style={{ fontSize: 8, fontWeight: 800, color: '#b45309', marginTop: 1 }}>🏆 International Standard</div>
          <div style={{ fontSize: 5.5, color: '#78350f', marginTop: 1 }}>Class IX–X · Max. Marks: 100 · Time: 3 Hours</div>
          <div style={{ borderTop: '1px solid #d97706', marginTop: 3, paddingTop: 2, fontSize: 5, color: '#92400e', fontStyle: 'italic' }}>
            Attempt all questions. Full credit only with complete justification.
          </div>
        </div>
      </div>
      <div style={{ padding: '2px 8px' }}>
        <div style={{ fontWeight: 700, fontSize: 6, color: '#b45309', marginBottom: 2, borderBottom: '1px solid #fde68a', paddingBottom: 1 }}>
          Part I – Multiple Choice (5 marks each)
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={{ fontWeight: 700 }}>1.</span>
          <div>
            <div style={{ color: '#1c1917' }}>The number of prime numbers between 1 and 100 is:</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 1.5, color: '#44403c' }}>
              {['(A) 24', '(B) 25', '(C) 26', '(D) 27'].map(o => <span key={o}>{o}</span>)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 3, fontWeight: 700, fontSize: 6, color: '#b45309', borderBottom: '1px solid #fde68a', paddingBottom: 1 }}>
          Part II – Proof Based (10 marks each)
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
          <span style={{ fontWeight: 700 }}>3.</span>
          <div style={{ color: '#1c1917', fontStyle: 'italic' }}>Prove that for any integer n, n³ – n is divisible by 6.</div>
        </div>
      </div>
    </div>
  ),

  'coaching-premium': () => (
    <div style={{ background: '#fff', fontFamily: 'Arial, sans-serif', fontSize: 6 }}>
      {/* Teal branded header */}
      <div style={{ background: '#0f766e', padding: '5px 8px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* Logo placeholder */}
          <div style={{ width: 20, height: 20, background: '#99f6e4', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, flexShrink: 0 }}>E</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 7.5 }}>EXCELLENCE COACHING INSTITUTE</div>
            <div style={{ fontSize: 5.5, opacity: 0.85 }}>Empowering Future Leaders</div>
          </div>
        </div>
        <div style={{ background: '#0d9488', marginTop: 3, padding: '2px 4px', borderRadius: 2, display: 'flex', justifyContent: 'space-between' }}>
          <span>Topic Assessment Test · Physics</span><span>Class XI · 100 Marks · 2 Hrs</span>
        </div>
      </div>
      <div style={{ padding: '5px 8px' }}>
        {/* Student info row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 3, borderBottom: '1px solid #ccfbf1', paddingBottom: 2 }}>
          {['Student Name', 'Roll No.', 'Batch'].map(f => (
            <div key={f} style={{ flex: 1 }}>
              <div style={{ color: '#0f766e', fontWeight: 600, fontSize: 5 }}>{f}</div>
              <div style={{ borderBottom: '1px solid #5eead4', marginTop: 2 }} />
            </div>
          ))}
        </div>
        <div style={{ fontWeight: 700, color: '#0f766e', marginBottom: 2 }}>Section A – MCQ (4 marks each, –1 wrong)</div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={{ fontWeight: 600, color: '#0f766e' }}>1.</span>
          <div>
            <div style={{ color: '#374151' }}>A body thrown up with velocity u reaches max height:</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 1.5 }}>
              {['u/g', 'u²/2g', 'u²/g', '2u²/g'].map((o, i) => (
                <span key={o} style={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Bubble filled={false} color="#0f766e" /> {String.fromCharCode(65 + i)}. {o}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 2, fontWeight: 700, color: '#0f766e' }}>Section B – Theory & Derivations (8 marks each)</div>
      </div>
    </div>
  ),

  'formal-collegiate': () => (
    <div style={{ background: '#fff', fontFamily: 'Georgia, serif', fontSize: 6 }}>
      {/* University header */}
      <div style={{ borderBottom: '3px double #1e3a5f', padding: '5px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 6, color: '#475569', letterSpacing: 0.5, textTransform: 'uppercase' }}>State University</div>
        <div style={{ fontWeight: 800, fontSize: 8.5, color: '#1e3a5f', marginTop: 1 }}>Department of Mathematics</div>
        <div style={{ fontSize: 5.5, color: '#374151', marginTop: 1 }}>End Semester Examination – November 2024</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 2, fontSize: 5.5, color: '#374151' }}>
          <span>Course: B.Sc. II Year</span><span>Max. Marks: 100</span><span>Duration: 3 Hours</span>
        </div>
      </div>
      <div style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 5.5, color: '#475569', fontStyle: 'italic' }}>
          Instructions: Attempt any FIVE questions. All questions carry equal marks. Use of scientific calculator is permitted.
        </div>
      </div>
      <div style={{ padding: '4px 8px' }}>
        <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, minWidth: 14 }}>Q.1</span>
          <div>
            <span style={{ color: '#1e3a5f' }}>State and prove the Fundamental Theorem of Calculus (Part I).</span>
            <span style={{ float: 'right', fontWeight: 700, color: '#1e3a5f' }}>[15]</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={{ fontWeight: 700, minWidth: 14 }}>Q.2</span>
          <div>
            <span style={{ color: '#1e3a5f' }}>Find eigenvalues and eigenvectors of A = [[2,1],[1,2]].</span>
            <span style={{ float: 'right', fontWeight: 700, color: '#1e3a5f' }}>[15]</span>
          </div>
        </div>
      </div>
    </div>
  ),

  'icse-standard': () => (
    <div style={{ background: '#fff', fontFamily: 'Georgia, serif', fontSize: 6 }}>
      {/* ICSE header */}
      <div style={{ border: '2px solid #1a1a2e', margin: 2, padding: '4px 6px' }}>
        <div style={{ textAlign: 'center', borderBottom: '1px solid #1a1a2e', paddingBottom: 3, marginBottom: 3 }}>
          <div style={{ fontWeight: 700, fontSize: 5.5, letterSpacing: 0.5, color: '#1a1a2e' }}>
            COUNCIL FOR THE INDIAN SCHOOL CERTIFICATE EXAMINATIONS
          </div>
          <div style={{ fontWeight: 800, fontSize: 8, color: '#1a1a2e', marginTop: 1 }}>MATHEMATICS</div>
          <div style={{ fontSize: 5.5, color: '#374151', marginTop: 1 }}>CLASS X · 2024 · Maximum Marks: 80</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 5.5, color: '#374151' }}>
          <span>Time Allowed: 2½ Hours</span><span>Answers to this paper must be written on the paper provided separately.</span>
        </div>
      </div>
      <div style={{ padding: '3px 7px' }}>
        <div style={{ fontWeight: 700, fontSize: 6, borderBottom: '1px solid #1a1a2e', paddingBottom: 1, marginBottom: 2 }}>SECTION A [40 Marks]</div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={{ fontWeight: 700 }}>1.</span>
          <div>
            <div style={{ color: '#1a1a2e' }}>
              Using factor theorem, show that (x–2) is a factor of x³ – 3x² + 4. Hence factorise completely.
            </div>
            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 5.5, color: '#374151', marginTop: 1 }}>[4]</div>
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 6, borderBottom: '1px solid #1a1a2e', paddingBottom: 1, marginBottom: 2, marginTop: 3 }}>SECTION B [40 Marks] — Attempt any four</div>
      </div>
    </div>
  ),

  'chapter-test': () => (
    <div style={{ background: '#fff', fontFamily: 'Arial, sans-serif', fontSize: 6 }}>
      {/* Chapter accent header */}
      <div style={{ background: '#0369a1', padding: '4px 8px', color: '#fff' }}>
        <div style={{ fontWeight: 700, fontSize: 7, textAlign: 'center' }}>CHAPTER TEST</div>
      </div>
      {/* Chapter name banner */}
      <div style={{ background: '#e0f2fe', borderBottom: '2px solid #0369a1', padding: '3px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 5, color: '#0c4a6e', fontWeight: 600 }}>CHAPTER:</div>
          <div style={{ fontWeight: 800, fontSize: 7.5, color: '#0369a1' }}>Triangles</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 5.5, color: '#0c4a6e' }}>
          <div>Class IX · Maths</div>
          <div>Marks: 25 · Time: 40 min</div>
        </div>
      </div>
      <div style={{ padding: '5px 8px' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 5, color: '#0369a1', fontWeight: 600 }}>Name:</div>
            <div style={{ borderBottom: '1px solid #bae6fd', marginTop: 1 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 5, color: '#0369a1', fontWeight: 600 }}>Roll No.:</div>
            <div style={{ borderBottom: '1px solid #bae6fd', marginTop: 1 }} />
          </div>
        </div>
        <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: 2 }}>Section A – MCQ (1 mark each)</div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={{ fontWeight: 600, color: '#0369a1' }}>1.</span>
          <div>
            <div>Two triangles are congruent if two angles and the included side are equal to:</div>
            <div style={{ color: '#6b7280', marginTop: 1 }}>A. Any two sides   B. Two ∠s & side   C. Three sides   D. Two sides & any ∠</div>
          </div>
        </div>
      </div>
    </div>
  ),

  'pro-custom': () => (
    <div style={{ background: 'linear-gradient(135deg, #4c1d95, #6d28d9)', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8, color: '#fff', textAlign: 'center' }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>⚡</div>
      <div style={{ fontWeight: 800, fontSize: 8, letterSpacing: 0.5 }}>PRO CUSTOM BUILDER</div>
      <div style={{ fontSize: 5.5, color: '#ddd6fe', marginTop: 3, lineHeight: 1.6 }}>
        Choose any font · Set your colors<br />Adjust margins · Add your logo
      </div>
      {/* Mock drag handles */}
      <div style={{ marginTop: 6, display: 'flex', gap: 3 }}>
        {['Header', 'Body', 'Footer'].map(s => (
          <div key={s} style={{ background: 'rgba(255,255,255,0.2)', border: '1px dashed rgba(255,255,255,0.5)', borderRadius: 3, padding: '2px 5px', fontSize: 5, color: '#e9d5ff' }}>{s}</div>
        ))}
      </div>
      <div style={{ marginTop: 3, fontSize: 5, color: '#c4b5fd' }}>✦ Requires Pro subscription</div>
    </div>
  ),
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');

  const isSubscribed = ['monthly', 'yearly'].includes(profile?.subscription_status)
    && new Date(profile?.subscription_end) > new Date();

  const filtered = activeCategory === 'All'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === activeCategory);

  const handleUseTemplate = (template) => {
    if (template.isPro && !isSubscribed) {
      navigate('/payment');
      return;
    }
    navigate('/editor', { state: { templateId: template.id } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="font-serif text-4xl font-bold text-primary-900 mb-3">Template Gallery</h1>
            <p className="text-gray-500">11 professional templates for every type of exam</p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-primary-900 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(template => {
              const Preview = PREVIEWS[template.id];
              return (
                <div
                  key={template.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all template-card cursor-pointer"
                >
                  {/* Mini paper preview */}
                  <div className="relative overflow-hidden" style={{ height: 160, borderBottom: `3px solid ${template.color}` }}>
                    <div style={{ transform: 'scale(1)', transformOrigin: 'top left', width: '100%', height: '100%', overflow: 'hidden' }}>
                      {Preview && <Preview />}
                    </div>
                    {template.isPro && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                        <Star className="w-3 h-3 fill-current" /> PRO
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase mb-1">{template.category}</div>
                    <h3 className="font-bold text-primary-900 mb-1.5">{template.name}</h3>
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2 leading-relaxed">{template.desc}</p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
                      ))}
                    </div>

                    <button
                      onClick={() => handleUseTemplate(template)}
                      className={`w-full text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                        template.isPro && !isSubscribed
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          : 'bg-primary-900 text-white hover:bg-blue-800'
                      }`}
                    >
                      {template.isPro && !isSubscribed ? (
                        <><Lock className="w-3 h-3" /> Upgrade to Use</>
                      ) : (
                        <><ChevronRight className="w-3 h-3" /> Use Template</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pro CTA if not subscribed */}
          {!isSubscribed && (
            <div className="mt-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-8 text-white text-center">
              <Palette className="w-12 h-12 mx-auto mb-4 opacity-80" />
              <h3 className="font-serif text-2xl font-bold mb-2">Unlock Pro Custom Builder</h3>
              <p className="text-purple-200 mb-6">Drag headers, set fonts, adjust margins — total control over your paper design</p>
              <button onClick={() => navigate('/payment')} className="btn-gold px-8 py-3">
                Upgrade to Pro ₹200/month
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
