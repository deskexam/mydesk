import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, FileText, BookOpen, Tag, Layers, Loader2, CheckCircle, AlertCircle, ShieldAlert, X, Pencil, Users, TrendingUp, BarChart2, LayoutDashboard, CreditCard, UserCheck, UserX, Calendar } from 'lucide-react';
import Navbar from '../components/auth/Navbar';
import { useAuth } from '../hooks/useAuth';
import { fastapiClient } from '../lib/api';
import toast from 'react-hot-toast';

const BOARDS = ['CBSE', 'ICSE', 'Maharashtra'];
const GRADES = ['8', '9', '10', '11', '12'];

const SUBJECTS_BY_GRADE = {
  '8': {
    'CBSE':        ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Civics'],
    'ICSE':        ['Mathematics', 'Physics', 'Chemistry', 'English'],
    'Maharashtra': ['Mathematics', 'Science & Technology', 'English', 'History & Political Science', 'Geography'],
  },
  '9': {
    'CBSE':        ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Economics'],
    'ICSE':        ['Mathematics', 'Physics', 'Chemistry', 'English'],
    'Maharashtra': ['Mathematics', 'Science & Technology', 'English', 'History & Political Science', 'Geography'],
  },
  '10': {
    'CBSE':        ['Mathematics', 'Science', 'English', 'History', 'Geography'],
    'ICSE':        ['Mathematics', 'Physics', 'Chemistry', 'English'],
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
  '8': {
    'Mathematics': [
      'Rational Numbers', 'Linear Equations in One Variable', 'Understanding Quadrilaterals',
      'Data Handling', 'Squares and Square Roots', 'Cubes and Cube Roots',
      'Comparing Quantities', 'Algebraic Expressions and Identities',
      'Mensuration', 'Exponents and Powers', 'Direct and Inverse Proportions',
      'Factorisation', 'Introduction to Graphs',
    ],
    'Physics': [
      'Matter', 'Physical Quantities and Measurement', 'Force and Pressure',
      'Energy', 'Light', 'Sound', 'Electricity', 'Heat Transfer',
    ],
    'Chemistry': [
      'Matter and its Composition', 'Physical and Chemical Changes',
      'Elements, Compounds and Mixtures', 'Atomic Structure',
      'Language of Chemistry', 'Chemical Reactions',
      'Hydrogen', 'Water', 'Carbon and its Compounds',
    ],
    'Science': [
      'Crop Production and Management', 'Microorganisms', 'Synthetic Fibres and Plastics',
      'Materials: Metals and Non-Metals', 'Coal and Petroleum', 'Combustion and Flame',
      'Conservation of Plants and Animals', 'Cell', 'Reproduction in Animals',
      'Reaching the Age of Adolescence', 'Force and Pressure', 'Friction',
      'Sound', 'Chemical Effects of Electric Current', 'Some Natural Phenomena', 'Light',
    ],
    'Science & Technology': [
      'Living World and Classification', 'Health and Disease', 'Force and Pressure',
      'Current Electricity', 'Inside the Atom', 'Metals and Nonmetals',
      'Pollution', 'Cell and Cell Organelles', 'Ecosystem',
    ],
    'English': ['Prose', 'Poetry', 'Grammar', 'Writing Skills'],
    'History': [
      'How, When and Where', 'From Trade to Territory', 'Ruling the Countryside',
      'Tribals, Dikus and the Vision of a Golden Age', 'When People Rebel',
      'Civilising the "Native"', 'Women, Caste and Reform', 'The Making of the National Movement',
      'India After Independence',
    ],
    'Geography': [
      'Resources', 'Land, Soil, Water, Natural Vegetation and Wildlife',
      'Mineral and Power Resources', 'Agriculture', 'Industries', 'Human Resources',
    ],
    'History & Civics': [
      'The Modern Age in Europe', 'The British Empire in India', 'Struggle for Independence',
      'The Indian Constitution', 'Parliament', 'The Judiciary',
    ],
    'History & Political Science': [
      'History of Modern India', 'Indian Constitution', 'Social Issues',
    ],
    'Civics': ['The Indian Constitution', 'Parliament', 'The Judiciary', 'Social Justice'],
    'Economics': ['Resources', 'Development'],
  },
  '9': {
    'Mathematics': [
      'Number Systems', 'Polynomials', 'Coordinate Geometry',
      'Linear Equations in Two Variables', 'Introduction to Euclid\'s Geometry',
      'Lines and Angles', 'Triangles', 'Quadrilaterals', 'Circles',
      'Heron\'s Formula', 'Surface Areas and Volumes', 'Statistics',
    ],
    'Physics': [
      'Measurements and Experimentation', 'Motion in One Dimension',
      'Laws of Motion', 'Fluids', 'Heat and Energy',
      'Light', 'Sound', 'Electricity and Magnetism',
    ],
    'Chemistry': [
      'Matter and its Composition', 'Elements, Compounds and Mixtures',
      'Atomic Structure and Chemical Bonding', 'Language of Chemistry',
      'Chemical Changes', 'Water', 'Carbon and its Compounds',
      'Acids, Bases and Salts', 'Analytical Chemistry',
    ],
    'Science': [
      'Matter in Our Surroundings', 'Is Matter Around Us Pure',
      'Atoms and Molecules', 'Structure of the Atom',
      'The Fundamental Unit of Life', 'Tissues', 'Motion', 'Force and Laws of Motion',
      'Gravitation', 'Work and Energy', 'Sound', 'Improvement in Food Resources',
    ],
    'Science & Technology': [
      'Laws of Motion', 'Gravitation', 'Current Electricity', 'Magnetic Effect',
      'Atoms and Molecules', 'Carbon Compounds', 'Classification of Plants and Animals',
      'Economic Importance of Biology',
    ],
    'English': ['Prose', 'Poetry', 'Drama', 'Grammar', 'Writing Skills'],
    'History': [
      'The French Revolution', 'Socialism in Europe and the Russian Revolution',
      'Nazism and the Rise of Hitler', 'Forest Society and Colonialism',
      'Pastoralists in the Modern World',
    ],
    'Geography': [
      'India – Size and Location', 'Physical Features of India', 'Drainage',
      'Climate', 'Natural Vegetation and Wildlife', 'Population',
    ],
    'Economics': [
      'The Story of Village Palampur', 'People as Resource',
      'Poverty as a Challenge', 'Food Security in India',
    ],
    'History & Civics': [
      'The French Revolution', 'Russian Revolution', 'Rise of Nazism',
      'Electoral Politics', 'Working of Institutions', 'Democratic Rights',
    ],
    'History & Political Science': [
      'Modern Indian History', 'Democratic Politics', 'Social Issues', 'Economics Basics',
    ],
  },
  '10': {
    'Mathematics': [
      'Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables',
      'Quadratic Equations', 'Arithmetic Progressions', 'Triangles',
      'Coordinate Geometry', 'Introduction to Trigonometry',
      'Applications of Trigonometry', 'Circles', 'Areas Related to Circles',
      'Surface Areas and Volumes', 'Statistics', 'Probability',
    ],
    'Physics': [
      'Force', 'Work, Energy and Power', 'Machines',
      'Refraction of Light at Plane Surfaces', 'Refraction through a Lens',
      'Spectrum', 'Sound', 'Electricity',
      'Magnetic Effect of Electric Current', 'Calorimetry', 'Nuclear Physics',
    ],
    'Chemistry': [
      'Periodic Table and Periodicity', 'Chemical Bonding',
      'Acids, Bases and Salts', 'Analytical Chemistry',
      'Mole Concept and Stoichiometry', 'Electrolysis',
      'Metallurgy', 'Study of Compounds – Ammonia', 'Study of Compounds – Nitric Acid',
      'Study of Compounds – Sulphuric Acid', 'Study of Compounds – Hydrogen Chloride',
      'Organic Chemistry',
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

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats,        setStats]       = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [docs,      setDocs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [editDoc,   setEditDoc]   = useState(null); // doc being edited
  const [editForm,  setEditForm]  = useState({});
  const [editTopics, setEditTopics] = useState([]);
  const [editFile,  setEditFile]  = useState(null);
  const [updating,  setUpdating]  = useState(false);
  const fileRef = useRef(null);
  const editFileRef = useRef(null);

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

  // Fetch admin stats
  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    setStatsLoading(true);
    fastapiClient.get('/api/users/admin/stats')
      .then(res => setStats(res.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setStatsLoading(false));
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const openEdit = (doc) => {
    setEditDoc(doc);
    setEditForm({ board: doc.board, grade: doc.grade, subject: doc.subject, title: doc.title });
    setEditTopics(doc.topics || []);
    setEditFile(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const fd = new FormData();
      fd.append('board',   editForm.board);
      fd.append('grade',   editForm.grade);
      fd.append('subject', editForm.subject);
      fd.append('title',   editForm.title);
      fd.append('topics',  JSON.stringify(editTopics));
      if (editFile) fd.append('file', editFile);
      await fastapiClient.put(`/api/documents/${editDoc.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document updated');
      setDocs(prev => prev.map(d => d.id === editDoc.id
        ? { ...d, ...editForm, topics: editTopics, ...(editFile ? {} : {}) }
        : d
      ));
      setEditDoc(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Update failed');
    }
    setUpdating(false);
  };

  if (profile && profile.role !== 'admin') return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <div className="pt-20 px-4 pb-12 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-900 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">Platform management &amp; vector store</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { id: 'dashboard', icon: <BarChart2 className="w-4 h-4" />, label: 'Dashboard' },
            { id: 'documents', icon: <BookOpen className="w-4 h-4" />, label: 'Documents' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-primary-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── Dashboard Tab ────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          statsLoading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading stats…
            </div>
          ) : stats ? (
            <div className="space-y-6">

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users',    value: stats.users.total,        icon: <Users className="w-5 h-5" />,       color: 'bg-blue-50 text-blue-700' },
                  { label: 'Paid Users',     value: stats.users.paid,         icon: <CreditCard className="w-5 h-5" />,  color: 'bg-green-50 text-green-700' },
                  { label: 'Trial Users',    value: stats.users.trial,        icon: <UserCheck className="w-5 h-5" />,   color: 'bg-amber-50 text-amber-700' },
                  { label: 'Free Users',     value: stats.users.free,         icon: <UserX className="w-5 h-5" />,       color: 'bg-gray-50 text-gray-600' },
                  { label: 'Monthly Plan',   value: stats.users.monthly,      icon: <Calendar className="w-5 h-5" />,    color: 'bg-violet-50 text-violet-700' },
                  { label: 'Yearly Plan',    value: stats.users.yearly,       icon: <TrendingUp className="w-5 h-5" />,  color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'New Today',      value: stats.users.new_today,    icon: <LayoutDashboard className="w-5 h-5" />, color: 'bg-sky-50 text-sky-700' },
                  { label: 'New This Week',  value: stats.users.new_this_week,icon: <LayoutDashboard className="w-5 h-5" />, color: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Papers Today',   value: stats.papers.today,       icon: <FileText className="w-5 h-5" />,    color: 'bg-rose-50 text-rose-700' },
                  { label: 'Papers (Week)',  value: stats.papers.this_week,   icon: <FileText className="w-5 h-5" />,    color: 'bg-pink-50 text-pink-700' },
                  { label: 'Total Papers',   value: stats.papers.total,       icon: <BarChart2 className="w-5 h-5" />,   color: 'bg-orange-50 text-orange-700' },
                  { label: 'Total Docs',     value: stats.documents.total,    icon: <Layers className="w-5 h-5" />,      color: 'bg-teal-50 text-teal-700' },
                ].map(card => (
                  <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.color}`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary-900">{card.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent users table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary-900" /> Recent Users
                    <span className="ml-1 text-xs text-gray-400 font-normal">(last 20)</span>
                  </h2>
                  <span className="text-xs text-gray-400">Verified: {stats.users.verified} / {stats.users.total}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-left font-medium">Email</th>
                        <th className="px-4 py-3 text-left font-medium">Plan</th>
                        <th className="px-4 py-3 text-left font-medium">Papers</th>
                        <th className="px-4 py-3 text-left font-medium">Institute</th>
                        <th className="px-4 py-3 text-left font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.recent_users.map(u => {
                        const planColor =
                          u.plan === 'Monthly' || u.plan === 'Yearly' ? 'bg-green-100 text-green-700' :
                          u.plan === 'Trial'   ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600';
                        const joinedDate = u.joined ? new Date(u.joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
                        return (
                          <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                              {u.name || '—'}
                              {!u.verified && <span className="ml-1.5 text-xs text-gray-400">(unverified)</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${planColor}`}>{u.plan}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 font-medium">{u.papers}</td>
                            <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]">{u.institute || '—'}</td>
                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{joinedDate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : null
        )}

        {/* ── Documents Tab ──────────────────────────────────────────────── */}
        {activeTab === 'documents' && (
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
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(doc)}
                          className="p-2 text-gray-400 hover:text-primary-900 hover:bg-blue-50 rounded-lg"
                          title="Edit document"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.title)}
                          disabled={deleting === doc.id}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          title="Delete document"
                        >
                          {deleting === doc.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
        )} {/* end documents tab */}

      </div>

      {/* ── Edit Document Modal ── */}
      {editDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-primary-900">Edit Document</h2>
              <button onClick={() => setEditDoc(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Board</label>
                  <select value={editForm.board} onChange={e => setEditForm(f => ({ ...f, board: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900">
                    {BOARDS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Grade</label>
                  <select value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900">
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Subject</label>
                  <input
                    value={editForm.subject}
                    onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Topics (comma separated)</label>
                <input
                  value={editTopics.join(', ')}
                  onChange={e => setEditTopics(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900"
                  placeholder="e.g. Algebra, Geometry, Trigonometry"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Replace PDF (optional)</label>
                <input
                  ref={editFileRef}
                  type="file"
                  accept=".pdf"
                  onChange={e => setEditFile(e.target.files[0] || null)}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-900 file:text-white file:text-xs file:font-semibold hover:file:bg-blue-800 cursor-pointer"
                />
                {editFile && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {editFile.name} — will replace existing PDF
                  </p>
                )}
                {!editFile && (
                  <p className="text-xs text-gray-400 mt-1">Leave empty to keep the existing PDF</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditDoc(null)}
                  className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={updating}
                  className="px-4 py-2 text-sm bg-primary-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2 disabled:opacity-60">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
