import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, FileText, BookOpen, Tag, Layers, Loader2, CheckCircle, AlertCircle, ShieldAlert, X } from 'lucide-react';
import Navbar from '../components/auth/Navbar';
import { useAuth } from '../hooks/useAuth';
import { fastapiClient } from '../lib/api';
import toast from 'react-hot-toast';

const BOARDS = ['CBSE', 'ICSE', 'Maharashtra'];
const GRADES = ['10', '11', '12'];

const SUBJECTS_BY_GRADE = {
  '10': {
    'CBSE':        ['Mathematics', 'Science', 'English', 'History', 'Geography'],
    'ICSE':        ['Mathematics', 'Science', 'English', 'History & Civics', 'Geography'],
    'Maharashtra': ['Mathematics', 'Science & Technology', 'English', 'History & Political Science', 'Geography'],
  },
  '11': {
    'CBSE':        ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    'ICSE':        ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    'Maharashtra': ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
  },
  '12': {
    'CBSE':        ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    'ICSE':        ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    'Maharashtra': ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
  },
};

const TOPICS_BY_GRADE_SUBJECT = {
  '10': {
    'Mathematics': [
      'Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables',
      'Quadratic Equations', 'Arithmetic Progressions', 'Triangles',
      'Coordinate Geometry', 'Introduction to Trigonometry',
      'Applications of Trigonometry', 'Circles', 'Areas Related to Circles',
      'Surface Areas and Volumes', 'Statistics', 'Probability',
    ],
    'Science': [
      'Chemical Reactions and Equations', 'Acids, Bases and Salts',
      'Metals and Non-metals', 'Carbon and its Compounds',
      'Life Processes', 'Control and Coordination', 'Reproduction',
      'Heredity and Evolution', 'Light – Reflection and Refraction',
      'Human Eye and Colourful World', 'Electricity',
      'Magnetic Effects of Electric Current', 'Our Environment',
    ],
    'Science & Technology': [
      'Gravitation', 'Periodic Classification of Elements',
      'Chemical Reactions and Equations', 'Effects of Electric Current',
      'Heat', 'Sound', 'Refraction of Light', 'Human Eye',
      'Carbon Compounds', 'Space Missions', 'Heredity and Evolution', 'Life Processes',
    ],
    'English': [
      'First Flight – Prose', 'First Flight – Poetry',
      'Footprints Without Feet', 'Writing Skills', 'Grammar',
    ],
    'History': [
      'The Rise of Nationalism in Europe', 'Nationalism in India',
      'The Making of a Global World', 'The Age of Industrialisation',
      'Print Culture and the Modern World',
    ],
    'History & Civics': [
      'The Rise of Nationalism in Europe', 'Nationalism in India',
      'World War I', 'Rise of Dictatorship and World War II',
      'The United Nations', 'Modern Age in Europe', 'Parliamentary Democracy',
    ],
    'History & Political Science': [
      'Renaissance', 'Religious Reformation in Europe',
      'Industrial Revolution', 'World Wars',
      'Indian Constitution', 'Social and Political Life',
    ],
    'Geography': [
      'Resources and Development', 'Forest and Wildlife Resources',
      'Water Resources', 'Agriculture',
      'Minerals and Energy Resources', 'Manufacturing Industries',
      'Lifelines of National Economy',
    ],
  },
  '11': {
    'Physics': [
      'Physical World and Measurement', 'Kinematics',
      'Laws of Motion', 'Work, Energy and Power',
      'System of Particles and Rotational Motion', 'Gravitation',
      'Mechanical Properties of Solids', 'Mechanical Properties of Fluids',
      'Thermal Properties of Matter', 'Thermodynamics',
      'Kinetic Theory', 'Oscillations', 'Waves',
    ],
    'Chemistry': [
      'Some Basic Concepts of Chemistry', 'Structure of Atom',
      'Classification of Elements and Periodicity in Properties',
      'Chemical Bonding and Molecular Structure',
      'States of Matter', 'Thermodynamics', 'Equilibrium',
      'Redox Reactions', 'Hydrogen', 's-Block Elements',
      'Some p-Block Elements', 'Organic Chemistry – Basic Principles',
      'Hydrocarbons', 'Environmental Chemistry',
    ],
    'Mathematics': [
      'Sets', 'Relations and Functions', 'Trigonometric Functions',
      'Principle of Mathematical Induction',
      'Complex Numbers and Quadratic Equations', 'Linear Inequalities',
      'Permutations and Combinations', 'Binomial Theorem',
      'Sequences and Series', 'Straight Lines', 'Conic Sections',
      'Introduction to Three Dimensional Geometry',
      'Limits and Derivatives', 'Statistics', 'Probability',
    ],
    'Biology': [
      'The Living World', 'Biological Classification', 'Plant Kingdom', 'Animal Kingdom',
      'Morphology of Flowering Plants', 'Anatomy of Flowering Plants',
      'Structural Organisation in Animals', 'Cell: The Unit of Life',
      'Biomolecules', 'Cell Cycle and Cell Division',
      'Transport in Plants', 'Mineral Nutrition',
      'Photosynthesis in Higher Plants', 'Respiration in Plants',
      'Plant Growth and Development', 'Digestion and Absorption',
      'Breathing and Exchange of Gases', 'Body Fluids and Circulation',
      'Excretory Products and their Elimination',
      'Locomotion and Movement', 'Neural Control and Coordination',
      'Chemical Coordination and Integration',
    ],
  },
  '12': {
    'Physics': [
      'Electric Charges and Fields', 'Electrostatic Potential and Capacitance',
      'Current Electricity', 'Moving Charges and Magnetism', 'Magnetism and Matter',
      'Electromagnetic Induction', 'Alternating Current', 'Electromagnetic Waves',
      'Ray Optics and Optical Instruments', 'Wave Optics',
      'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei',
      'Semiconductor Electronics',
    ],
    'Chemistry': [
      'Solid State', 'Solutions', 'Electrochemistry', 'Chemical Kinetics',
      'Surface Chemistry', 'General Principles and Processes of Isolation of Elements',
      'p-Block Elements', 'd and f Block Elements', 'Coordination Compounds',
      'Haloalkanes and Haloarenes', 'Alcohols, Phenols and Ethers',
      'Aldehydes, Ketones and Carboxylic Acids', 'Amines', 'Biomolecules',
      'Polymers', 'Chemistry in Everyday Life',
    ],
    'Mathematics': [
      'Relations and Functions', 'Inverse Trigonometric Functions',
      'Matrices', 'Determinants', 'Continuity and Differentiability',
      'Application of Derivatives', 'Integrals', 'Application of Integrals',
      'Differential Equations', 'Vector Algebra',
      'Three Dimensional Geometry', 'Linear Programming', 'Probability',
    ],
    'Biology': [
      'Reproduction in Organisms', 'Sexual Reproduction in Flowering Plants',
      'Human Reproduction', 'Reproductive Health',
      'Principles of Inheritance and Variation', 'Molecular Basis of Inheritance',
      'Evolution', 'Human Health and Disease',
      'Strategies for Enhancement in Food Production',
      'Microbes in Human Welfare', 'Biotechnology – Principles and Processes',
      'Biotechnology and its Applications',
      'Organisms and Populations', 'Ecosystem',
      'Biodiversity and Conservation', 'Environmental Issues',
    ],
  },
};

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchDocuments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.board)   params.append('board',   filters.board);
  if (filters.grade)   params.append('grade',   filters.grade);
  if (filters.subject) params.append('subject', filters.subject);
  const res = await fastapiClient.get(`/api/documents/?${params}`);
  return res.data;
}

async function uploadDocument(formData) {
  const res = await fastapiClient.post('/api/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

async function deleteDocument(id) {
  await fastapiClient.delete(`/api/documents/${id}`);
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [docs,      setDocs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    board: 'CBSE', grade: '10', subject: 'Mathematics', title: '', file: null,
  });
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [filter, setFilter] = useState({ board: '', grade: '', subject: '' });

  // Derived lists
  const subjectList = SUBJECTS_BY_GRADE[form.grade]?.[form.board] || [];
  const topicList   = TOPICS_BY_GRADE_SUBJECT[form.grade]?.[form.subject] || [];

  // Guard: non-admins get bounced
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      toast.error('Admin access only');
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // Reset subject when board/grade changes
  useEffect(() => {
    const list = SUBJECTS_BY_GRADE[form.grade]?.[form.board] || [];
    setForm(f => ({ ...f, subject: list[0] || '' }));
    setSelectedTopics([]);
  }, [form.grade, form.board]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset topics when subject changes
  useEffect(() => {
    setSelectedTopics([]);
  }, [form.subject]);

  const toggleTopic = (topic) =>
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );

  const loadDocs = async () => {
    setLoading(true);
    try { setDocs(await fetchDocuments(filter)); }
    catch { toast.error('Failed to load documents'); }
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file)            return toast.error('Select a PDF file');
    if (!form.subject.trim())  return toast.error('Select a subject');
    if (!form.title.trim())    return toast.error('Enter a title');

    // If no topics selected → treat as "All Units" (use full topic list or empty = general)
    const topicsArr = selectedTopics.length > 0
      ? selectedTopics
      : (topicList.length > 0 ? topicList : ['General']);

    const fd = new FormData();
    fd.append('file',    form.file);
    fd.append('board',   form.board);
    fd.append('grade',   form.grade);
    fd.append('subject', form.subject.trim());
    fd.append('topics',  JSON.stringify(topicsArr));
    fd.append('title',   form.title.trim());

    setUploading(true);
    try {
      const result = await uploadDocument(fd);
      toast.success(`Uploaded & indexed ${result.chunks} chunks`);
      setForm(f => ({ ...f, file: null, title: '' }));
      setSelectedTopics([]);
      if (fileRef.current) fileRef.current.value = '';
      loadDocs();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upload failed');
    }
    setUploading(false);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This removes it from the vector store too.`)) return;
    setDeleting(id);
    try {
      await deleteDocument(id);
      toast.success('Document deleted');
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch { toast.error('Delete failed'); }
    setDeleting(null);
  };

  if (profile && profile.role !== 'admin') return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <div className="pt-20 px-4 pb-12 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-900 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">Upload PDFs to the RAG vector store for AI question generation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Upload Form ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary-900" /> Upload PDF
              </h2>
              <form onSubmit={handleUpload} className="space-y-4">

                {/* Board & Grade */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Board</label>
                    <select
                      value={form.board}
                      onChange={e => setForm(f => ({ ...f, board: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900"
                    >
                      {BOARDS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Grade</label>
                    <select
                      value={form.grade}
                      onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900"
                    >
                      {GRADES.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                {/* Subject dropdown */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Subject</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900"
                  >
                    {subjectList.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Topics chip selector */}
                {topicList.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-600">
                        Topics / Units
                        <span className="text-gray-400 font-normal ml-1">
                          {selectedTopics.length === 0 ? '(all units)' : `(${selectedTopics.length} selected)`}
                        </span>
                      </label>
                      {selectedTopics.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTopics([])}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                        >
                          <X className="w-3 h-3" /> Clear
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                      {topicList.map(topic => {
                        const active = selectedTopics.includes(topic);
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => toggleTopic(topic)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                              active
                                ? 'bg-primary-900 text-white border-primary-900'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary-900 hover:text-primary-900'
                            }`}
                          >
                            {topic}
                          </button>
                        );
                      })}
                    </div>
                    {selectedTopics.length === 0 && (
                      <p className="text-xs text-blue-600 mt-1">All units will be indexed</p>
                    )}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. NCERT Maths Grade 10 Ch1-5"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900"
                  />
                </div>

                {/* File picker */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">PDF File</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    onChange={e => setForm(f => ({ ...f, file: e.target.files[0] || null }))}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-900 file:text-white file:text-xs file:font-semibold hover:file:bg-blue-800 cursor-pointer"
                  />
                  {form.file && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {form.file.name}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                >
                  {uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading & Indexing…</>
                    : <><Upload className="w-4 h-4" /> Upload to Vector Store</>}
                </button>
              </form>

              <div className="mt-5 bg-blue-50 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
                <p className="font-semibold mb-1">How it works</p>
                <p>The PDF is split into text chunks and stored in ChromaDB. When a teacher generates a paper, the AI retrieves the most relevant chunks for the chosen board/grade/subject and uses them as context for question generation.</p>
              </div>
            </div>
          </div>

          {/* ── Document Library ──────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary-900" /> Vector Store Documents
                  <span className="ml-1 bg-primary-900 text-white text-xs px-2 py-0.5 rounded-full">{docs.length}</span>
                </h2>
              </div>

              {/* Filters */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <select
                  value={filter.board}
                  onChange={e => setFilter(f => ({ ...f, board: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-900"
                >
                  <option value="">All Boards</option>
                  {BOARDS.map(b => <option key={b}>{b}</option>)}
                </select>
                <select
                  value={filter.grade}
                  onChange={e => setFilter(f => ({ ...f, grade: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-900"
                >
                  <option value="">All Grades</option>
                  {GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Filter by subject…"
                  value={filter.subject}
                  onChange={e => setFilter(f => ({ ...f, subject: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-900 flex-1 min-w-32"
                />
              </div>

              {/* List */}
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
                </div>
              ) : docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <AlertCircle className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">No documents uploaded yet</p>
                  <p className="text-xs mt-1">Upload PDFs to power AI question generation</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {docs.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
                    >
                      <div className="w-9 h-9 bg-primary-900/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-primary-900" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{doc.title}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            <Layers className="w-2.5 h-2.5" /> {doc.board} · Gr {doc.grade}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            <BookOpen className="w-2.5 h-2.5" /> {doc.subject}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                            {doc.chunk_count} chunks
                          </span>
                        </div>
                        {doc.topics?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {doc.topics.map(t => (
                              <span key={t} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                                <Tag className="w-2.5 h-2.5" /> {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        disabled={deleting === doc.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                        title="Delete document"
                      >
                        {deleting === doc.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
