import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateAndSavePaper, fastapiClient } from '../lib/api';
import toast from 'react-hot-toast';
import { Sparkles, FileText, Download, Edit, BookOpen, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PaywallModal from '../components/payment/PaywallModal';

const LOADING_STEPS = [
  "Reading through your curriculum content...",
  "Picking the best topics for your paper...",
  "Crafting thoughtful questions...",
  "Balancing difficulty levels...",
  "Organising sections and marks...",
  "Verifying answers for accuracy...",
  "Almost done — polishing your paper!",
];

function StudentAnimation({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <style>{`
        @keyframes writeArm {
          0%,100% { transform: rotate(-10deg); }
          50%      { transform: rotate(8deg) translateX(3px); }
        }
        @keyframes floatStudent {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes blinkEye {
          0%,88%,100% { transform: scaleY(1); }
          92%         { transform: scaleY(0.1); }
        }
        @keyframes lineDraw {
          0%   { stroke-dashoffset: 80; }
          100% { stroke-dashoffset: 0; }
        }
        .arm-write   { animation: writeArm 0.75s ease-in-out infinite; transform-origin: 100px 118px; }
        .float-wrap  { animation: floatStudent 3s ease-in-out infinite; }
        .eye-blink   { animation: blinkEye 4s ease-in-out infinite; }
        .paper-line  { stroke-dasharray: 80; animation: lineDraw 1.2s ease-in-out infinite alternate; }
        .paper-line2 { stroke-dasharray: 60; animation: lineDraw 1.2s 0.4s ease-in-out infinite alternate; }
        .paper-line3 { stroke-dasharray: 50; animation: lineDraw 1.2s 0.8s ease-in-out infinite alternate; }
      `}</style>

      <div className="float-wrap">
        <svg width="240" height="210" viewBox="0 0 240 210" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Desk legs */}
          <rect x="30" y="155" width="10" height="45" rx="3" fill="#92400E" />
          <rect x="200" y="155" width="10" height="45" rx="3" fill="#92400E" />
          {/* Desk top */}
          <rect x="15" y="145" width="210" height="12" rx="4" fill="#B45309" />

          {/* Paper on desk */}
          <rect x="95" y="128" width="105" height="20" rx="3" fill="white" stroke="#D1D5DB" strokeWidth="1.5" />
          {/* Animated writing lines */}
          <line className="paper-line"  x1="102" y1="134" x2="182" y2="134" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
          <line className="paper-line2" x1="102" y1="140" x2="168" y2="140" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
          <line className="paper-line3" x1="102" y1="146" x2="155" y2="146" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />

          {/* Chair */}
          <rect x="55" y="160" width="60" height="7" rx="3" fill="#4B5563" />
          <rect x="65" y="165" width="10" height="28" rx="3" fill="#4B5563" />
          <rect x="95" y="165" width="10" height="28" rx="3" fill="#4B5563" />
          <rect x="56" y="130" width="8" height="36" rx="3" fill="#4B5563" />

          {/* Body */}
          <rect x="62" y="112" width="46" height="52" rx="14" fill="#2563EB" />

          {/* Head */}
          <circle cx="85" cy="90" r="22" fill="#FDE68A" />
          {/* Hair */}
          <ellipse cx="85" cy="70" rx="22" ry="11" fill="#1C1917" />
          <rect x="63" y="68" width="7" height="18" rx="3.5" fill="#1C1917" />

          {/* Eyes */}
          <g className="eye-blink">
            <ellipse cx="78" cy="93" rx="3.2" ry="3.8" fill="#1C1917" />
            <ellipse cx="92" cy="93" rx="3.2" ry="3.8" fill="#1C1917" />
            {/* Eye shine */}
            <circle cx="79.5" cy="91.5" r="1" fill="white" />
            <circle cx="93.5" cy="91.5" r="1" fill="white" />
          </g>
          {/* Focused brow */}
          <path d="M74 87 Q78 84.5 82 87" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M88 87 Q92 84.5 96 87" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Smile */}
          <path d="M78 101 Q85 106 92 101" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* Left arm — resting */}
          <path d="M65 122 Q52 133 50 145" stroke="#FDE68A" strokeWidth="11" strokeLinecap="round" fill="none" />

          {/* Right arm — writing (animated) */}
          <g className="arm-write">
            <path d="M100 118 Q120 130 132 138" stroke="#FDE68A" strokeWidth="11" strokeLinecap="round" fill="none" />
            <circle cx="133" cy="139" r="6" fill="#FDE68A" />
            {/* Pencil */}
            <rect x="127" y="122" width="5" height="22" rx="2.5" fill="#FCD34D" transform="rotate(35 127 122)" />
            <polygon points="138,133 142,137 136,140" fill="#1C1917" />
            <rect x="124" y="120" width="5" height="6" rx="1" fill="#F87171" transform="rotate(35 124 120)" />
          </g>

          {/* Floating sparkles */}
          <circle cx="185" cy="55" r="4" fill="#818CF8">
            <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="r" values="4;6;4" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="28" cy="75" r="3" fill="#34D399">
            <animate attributeName="opacity" values="1;0.2;1" dur="2.1s" repeatCount="indefinite" />
            <animate attributeName="r" values="3;5;3" dur="2.1s" repeatCount="indefinite" />
          </circle>
          <circle cx="170" cy="38" r="3.5" fill="#F472B6">
            <animate attributeName="opacity" values="1;0.1;1" dur="1.9s" repeatCount="indefinite" />
            <animate attributeName="r" values="3.5;5.5;3.5" dur="1.9s" repeatCount="indefinite" />
          </circle>
          <circle cx="45" cy="110" r="2.5" fill="#FB923C">
            <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      <div className="mt-2 text-center px-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Creating Your Paper</h2>
        <p className="text-blue-600 font-medium text-sm min-h-[22px] transition-all">{message}</p>
        <div className="flex justify-center gap-2 mt-5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-5">This usually takes 20–40 seconds</p>
      </div>
    </div>
  );
}

const BOARDS = ["CBSE", "ICSE", "Maharashtra"];
const GRADES = ["8", "9", "10", "11", "12"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const DURATIONS = [
  { value: 60,  label: "1 hour" },
  { value: 90,  label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
];

const SUBJECTS_BY_GRADE = {
  "8": {
    "CBSE":        ["Mathematics", "Science", "English", "History", "Geography", "Civics"],
    "ICSE":        ["Mathematics", "Science", "English", "History & Civics", "Geography"],
    "Maharashtra": ["Mathematics", "Science & Technology", "English", "History & Political Science", "Geography"],
  },
  "9": {
    "CBSE":        ["Mathematics", "Science", "English", "History", "Geography", "Economics"],
    "ICSE":        ["Mathematics", "Science", "English", "History & Civics", "Geography"],
    "Maharashtra": ["Mathematics", "Science & Technology", "English", "History & Political Science", "Geography"],
  },
  "10": {
    "CBSE":        ["Mathematics", "Science", "English", "History", "Geography"],
    "ICSE":        ["Mathematics", "Science", "English", "History & Civics", "Geography"],
    "Maharashtra": ["Mathematics", "Science & Technology", "English", "History & Political Science", "Geography"],
  },
  "11": {
    "CBSE":        ["Physics", "Chemistry", "Mathematics", "Biology"],
    "ICSE":        ["Physics", "Chemistry", "Mathematics", "Biology"],
    "Maharashtra": ["Physics", "Chemistry", "Mathematics", "Biology"],
  },
  "12": {
    "CBSE":        ["Physics", "Chemistry", "Mathematics", "Biology"],
    "ICSE":        ["Physics", "Chemistry", "Mathematics", "Biology"],
    "Maharashtra": ["Physics", "Chemistry", "Mathematics", "Biology"],
  },
};

const TOPICS_BY_GRADE_SUBJECT = {
  "8": {
    "Mathematics": [
      "Rational Numbers", "Linear Equations in One Variable", "Understanding Quadrilaterals",
      "Data Handling", "Squares and Square Roots", "Cubes and Cube Roots",
      "Comparing Quantities", "Algebraic Expressions and Identities",
      "Mensuration", "Exponents and Powers", "Direct and Inverse Proportions",
      "Factorisation", "Introduction to Graphs",
    ],
    "Science": [
      "Crop Production and Management", "Microorganisms", "Synthetic Fibres and Plastics",
      "Materials: Metals and Non-Metals", "Coal and Petroleum", "Combustion and Flame",
      "Conservation of Plants and Animals", "Cell", "Reproduction in Animals",
      "Reaching the Age of Adolescence", "Force and Pressure", "Friction",
      "Sound", "Chemical Effects of Electric Current", "Some Natural Phenomena", "Light",
    ],
    "Science & Technology": [
      "Living World and Classification", "Health and Disease", "Force and Pressure",
      "Current Electricity", "Inside the Atom", "Metals and Nonmetals",
      "Pollution", "Cell and Cell Organelles", "Ecosystem",
    ],
    "English": ["Prose", "Poetry", "Grammar", "Writing Skills"],
    "History": [
      "How, When and Where", "From Trade to Territory", "Ruling the Countryside",
      "Tribals, Dikus and the Vision of a Golden Age", "When People Rebel",
      "Women, Caste and Reform", "The Making of the National Movement", "India After Independence",
    ],
    "Geography": [
      "Resources", "Land, Soil, Water, Natural Vegetation and Wildlife",
      "Mineral and Power Resources", "Agriculture", "Industries", "Human Resources",
    ],
    "History & Civics": [
      "The Modern Age in Europe", "The British Empire in India", "Struggle for Independence",
      "The Indian Constitution", "Parliament", "The Judiciary",
    ],
    "History & Political Science": ["History of Modern India", "Indian Constitution", "Social Issues"],
    "Civics": ["The Indian Constitution", "Parliament", "The Judiciary", "Social Justice"],
  },
  "9": {
    "Mathematics": [
      "Number Systems", "Polynomials", "Coordinate Geometry",
      "Linear Equations in Two Variables", "Introduction to Euclid's Geometry",
      "Lines and Angles", "Triangles", "Quadrilaterals", "Circles",
      "Heron's Formula", "Surface Areas and Volumes", "Statistics",
    ],
    "Science": [
      "Matter in Our Surroundings", "Is Matter Around Us Pure",
      "Atoms and Molecules", "Structure of the Atom",
      "The Fundamental Unit of Life", "Tissues", "Motion", "Force and Laws of Motion",
      "Gravitation", "Work and Energy", "Sound", "Improvement in Food Resources",
    ],
    "Science & Technology": [
      "Laws of Motion", "Gravitation", "Current Electricity", "Magnetic Effect",
      "Atoms and Molecules", "Carbon Compounds", "Classification of Plants and Animals",
      "Economic Importance of Biology",
    ],
    "English": ["Prose", "Poetry", "Drama", "Grammar", "Writing Skills"],
    "History": [
      "The French Revolution", "Socialism in Europe and the Russian Revolution",
      "Nazism and the Rise of Hitler", "Forest Society and Colonialism",
      "Pastoralists in the Modern World",
    ],
    "Geography": [
      "India – Size and Location", "Physical Features of India", "Drainage",
      "Climate", "Natural Vegetation and Wildlife", "Population",
    ],
    "Economics": [
      "The Story of Village Palampur", "People as Resource",
      "Poverty as a Challenge", "Food Security in India",
    ],
    "History & Civics": [
      "The French Revolution", "Russian Revolution", "Rise of Nazism",
      "Electoral Politics", "Working of Institutions", "Democratic Rights",
    ],
    "History & Political Science": ["Modern Indian History", "Democratic Politics", "Social Issues"],
  },
  "10": {
    "Mathematics": [
      "Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables",
      "Quadratic Equations", "Arithmetic Progressions", "Triangles",
      "Coordinate Geometry", "Introduction to Trigonometry",
      "Applications of Trigonometry", "Circles", "Areas Related to Circles",
      "Surface Areas and Volumes", "Statistics", "Probability",
    ],
    "Science": [
      "Chemical Reactions and Equations", "Acids, Bases and Salts",
      "Metals and Non-metals", "Carbon and its Compounds",
      "Life Processes", "Control and Coordination", "Reproduction",
      "Heredity and Evolution", "Light – Reflection and Refraction",
      "Human Eye and Colourful World", "Electricity",
      "Magnetic Effects of Electric Current", "Our Environment",
    ],
    "Science & Technology": [
      "Gravitation", "Periodic Classification of Elements",
      "Chemical Reactions and Equations", "Effects of Electric Current",
      "Heat", "Sound", "Refraction of Light", "Human Eye",
      "Carbon Compounds", "Space Missions",
      "Heredity and Evolution", "Life Processes",
    ],
    "English": [
      "First Flight – Prose", "First Flight – Poetry",
      "Footprints Without Feet", "Writing Skills", "Grammar",
    ],
    "History": [
      "The Rise of Nationalism in Europe", "Nationalism in India",
      "The Making of a Global World", "The Age of Industrialisation",
      "Print Culture and the Modern World",
    ],
    "History & Civics": [
      "The Rise of Nationalism in Europe", "Nationalism in India",
      "World War I", "Rise of Dictatorship and World War II",
      "The United Nations", "Modern Age in Europe", "Parliamentary Democracy",
    ],
    "History & Political Science": [
      "Renaissance", "Religious Reformation in Europe",
      "Industrial Revolution", "World Wars",
      "Indian Constitution", "Social and Political Life",
    ],
    "Geography": [
      "Resources and Development", "Forest and Wildlife Resources",
      "Water Resources", "Agriculture",
      "Minerals and Energy Resources", "Manufacturing Industries",
      "Lifelines of National Economy",
    ],
  },
  "11": {
    "Physics": [
      "Physical World and Measurement", "Kinematics",
      "Laws of Motion", "Work, Energy and Power",
      "System of Particles and Rotational Motion", "Gravitation",
      "Mechanical Properties of Solids", "Mechanical Properties of Fluids",
      "Thermal Properties of Matter", "Thermodynamics",
      "Kinetic Theory", "Oscillations", "Waves",
    ],
    "Chemistry": [
      "Some Basic Concepts of Chemistry", "Structure of Atom",
      "Classification of Elements and Periodicity in Properties",
      "Chemical Bonding and Molecular Structure",
      "States of Matter", "Thermodynamics", "Equilibrium",
      "Redox Reactions", "Hydrogen", "s-Block Elements",
      "Some p-Block Elements", "Organic Chemistry – Basic Principles",
      "Hydrocarbons", "Environmental Chemistry",
    ],
    "Mathematics": [
      "Sets", "Relations and Functions", "Trigonometric Functions",
      "Principle of Mathematical Induction",
      "Complex Numbers and Quadratic Equations", "Linear Inequalities",
      "Permutations and Combinations", "Binomial Theorem",
      "Sequences and Series", "Straight Lines", "Conic Sections",
      "Introduction to Three Dimensional Geometry",
      "Limits and Derivatives", "Statistics", "Probability",
    ],
    "Biology": [
      "The Living World", "Biological Classification",
      "Plant Kingdom", "Animal Kingdom",
      "Morphology of Flowering Plants", "Anatomy of Flowering Plants",
      "Structural Organisation in Animals", "Cell: The Unit of Life",
      "Biomolecules", "Cell Cycle and Cell Division",
      "Transport in Plants", "Mineral Nutrition",
      "Photosynthesis in Higher Plants", "Respiration in Plants",
      "Plant Growth and Development", "Digestion and Absorption",
      "Breathing and Exchange of Gases", "Body Fluids and Circulation",
      "Excretory Products and their Elimination",
      "Locomotion and Movement", "Neural Control and Coordination",
      "Chemical Coordination and Integration",
    ],
  },
  "12": {
    "Physics": [
      "Electric Charges and Fields",
      "Electrostatic Potential and Capacitance", "Current Electricity",
      "Moving Charges and Magnetism", "Magnetism and Matter",
      "Electromagnetic Induction", "Alternating Current",
      "Electromagnetic Waves", "Ray Optics and Optical Instruments",
      "Wave Optics", "Dual Nature of Radiation and Matter",
      "Atoms", "Nuclei", "Semiconductor Electronics",
    ],
    "Chemistry": [
      "Solid State", "Solutions", "Electrochemistry",
      "Chemical Kinetics", "Surface Chemistry",
      "General Principles and Processes of Isolation of Elements",
      "p-Block Elements", "d and f Block Elements",
      "Coordination Compounds", "Haloalkanes and Haloarenes",
      "Alcohols, Phenols and Ethers",
      "Aldehydes, Ketones and Carboxylic Acids",
      "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life",
    ],
    "Mathematics": [
      "Relations and Functions", "Inverse Trigonometric Functions",
      "Matrices", "Determinants",
      "Continuity and Differentiability", "Application of Derivatives",
      "Integrals", "Application of Integrals",
      "Differential Equations", "Vector Algebra",
      "Three Dimensional Geometry", "Linear Programming", "Probability",
    ],
    "Biology": [
      "Reproduction in Organisms",
      "Sexual Reproduction in Flowering Plants",
      "Human Reproduction", "Reproductive Health",
      "Principles of Inheritance and Variation",
      "Molecular Basis of Inheritance", "Evolution",
      "Human Health and Disease",
      "Strategies for Enhancement in Food Production",
      "Microbes in Human Welfare",
      "Biotechnology – Principles and Processes",
      "Biotechnology and its Applications",
      "Organisms and Populations", "Ecosystem",
      "Biodiversity and Conservation", "Environmental Issues",
    ],
  },
};

export default function PaperGenerator() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [animMsg, setAnimMsg] = useState(LOADING_STEPS[0]);
  const [generationError, setGenerationError] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState('papers');
  const isFree = !profile?.plan || profile?.plan === 'free';
  const [selectedTopics, setSelectedTopics] = useState([]);
  const animTimerRef = useRef(null);

  // Cycle through loading messages while generating
  useEffect(() => {
    if (loading) {
      setAnimMsg(LOADING_STEPS[0]);
      let idx = 0;
      animTimerRef.current = setInterval(() => {
        idx = (idx + 1) % LOADING_STEPS.length;
        setAnimMsg(LOADING_STEPS[idx]);
      }, 4500);
    } else {
      clearInterval(animTimerRef.current);
    }
    return () => clearInterval(animTimerRef.current);
  }, [loading]);

  // Dynamic data from DB
  const [availableBoards, setAvailableBoards] = useState([]);
  const [availableGrades, setAvailableGrades] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);

  const [form, setForm] = useState({
    board: "",
    grade: "",
    subject: "",
    total_marks: 80,
    duration_minutes: 180,
    difficulty: "medium",
    include_answer_key: false,
    num_mcq: "",
    num_short: "",
    num_long: "",
    marks_per_mcq: 1,
    marks_per_short: 2,
    marks_per_long: 5,
  });

  const allSelected = selectedTopics.length === 0;

  // Load boards on mount
  useEffect(() => {
    fastapiClient.get('/api/documents/meta/boards').then(res => {
      setAvailableBoards(res.data);
      if (res.data.length > 0) setForm(f => ({ ...f, board: res.data[0] }));
    }).catch(() => {
      toast.error('Could not load available content. Please refresh the page.');
    }).finally(() => setDbLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load grades when board changes
  useEffect(() => {
    if (!form.board) return;
    fastapiClient.get(`/api/documents/meta/grades?board=${form.board}`).then(res => {
      setAvailableGrades(res.data);
      setForm(f => ({ ...f, grade: res.data[0] || '', subject: '' }));
      setSelectedTopics([]);
    }).catch(() => {});
  }, [form.board]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load subjects when board or grade changes
  useEffect(() => {
    if (!form.board || !form.grade) return;
    fastapiClient.get(`/api/documents/meta/subjects?board=${form.board}&grade=${form.grade}`).then(res => {
      setAvailableSubjects(res.data);
      setForm(f => ({ ...f, subject: res.data[0] || '' }));
      setSelectedTopics([]);
    }).catch(() => {});
  }, [form.board, form.grade]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load topics when subject changes
  useEffect(() => {
    if (!form.board || !form.grade || !form.subject) return;
    fastapiClient.get(`/api/documents/meta/topics?board=${form.board}&grade=${form.grade}&subject=${encodeURIComponent(form.subject)}`).then(res => {
      setAvailableTopics(res.data);
      setSelectedTopics([]);
    }).catch(() => {});
  }, [form.subject]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTopic = (topic) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  // Derive question_types from whichever count fields have a value
  const explicitCounts = form.num_mcq !== "" || form.num_short !== "" || form.num_long !== "";
  const derivedTypes = explicitCounts
    ? [
        ...(form.num_mcq !== "" && Number(form.num_mcq) > 0 ? ["MCQ"] : []),
        ...(form.num_short !== "" && Number(form.num_short) > 0 ? ["short_answer"] : []),
        ...(form.num_long !== "" && Number(form.num_long) > 0 ? ["long_answer"] : []),
      ]
    : ["MCQ", "short_answer", "long_answer"];

  const computedMarks = explicitCounts
    ? (Number(form.num_mcq) || 0) * (form.marks_per_mcq || 1)
      + (Number(form.num_short) || 0) * (form.marks_per_short || 2)
      + (Number(form.num_long) || 0) * (form.marks_per_long || 5)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject) return toast.error("Please select a subject");

    const effectiveMarks = computedMarks !== null ? computedMarks : form.total_marks;
    if (!effectiveMarks || effectiveMarks < 1) return toast.error("Total marks must be at least 1");
    if (derivedTypes.length === 0) return toast.error("Enter a count for at least one question type");

    // Topics: if none selected → pass full topic list; if specific → pass those
    const topicsPayload = selectedTopics.length > 0 ? selectedTopics : (availableTopics.length > 0 ? availableTopics : null);

    setGenerationError(false);
    setLoading(true);
    try {
      const payload = {
        board: form.board,
        grade: form.grade,
        subject: form.subject,
        topics: topicsPayload,
        total_marks: effectiveMarks,
        duration_minutes: form.duration_minutes,
        difficulty: form.difficulty,
        include_answer_key: form.include_answer_key,
        question_types: derivedTypes,
        num_mcq: form.num_mcq !== "" ? Number(form.num_mcq) : null,
        num_short: form.num_short !== "" ? Number(form.num_short) : null,
        num_long: form.num_long !== "" ? Number(form.num_long) : null,
        marks_per_mcq: form.marks_per_mcq,
        marks_per_short: form.marks_per_short,
        marks_per_long: form.marks_per_long,
      };

      const paper = await generateAndSavePaper(payload);
      toast.success("Paper generated successfully!");
      navigate(`/editor/${paper.id}`);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'object' ? detail?.message : detail;

      if (status === 402) {
        const code = typeof detail === 'object' ? detail?.code : '';
        setPaywallReason(code === 'DOWNLOAD_LIMIT_REACHED' ? 'downloads' : 'papers');
        setShowPaywall(true);
      } else if (status === 403) {
        toast.error(msg || 'This grade requires a higher plan. Please upgrade.');
      } else if (status === 422) {
        toast.error(msg || 'Invalid request. Please check your inputs and try again.');
      } else {
        // 500 / 413 / network — show friendly retry screen
        setGenerationError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Full-screen generating animation
  if (loading) return <StudentAnimation message={animMsg} />;

  // Friendly retry screen on unexpected errors
  if (generationError) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="text-6xl mb-4">😅</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Oops, Our AI Got a Bit Busy!</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Our AI is handling a lot of papers right now and couldn't finish yours in time.
          Don't worry — your settings are saved. Just give it a moment and try again!
        </p>
        <button
          onClick={() => setGenerationError(false)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-2 border border-white/20 shadow-sm">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-semibold text-gray-800">AI Paper Generator</span>
            </div>
            <p className="text-gray-600 mt-2">Create professional exam papers powered by AI</p>
          </div>

          {/* Main Form */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {dbLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-400">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm">Loading available content...</p>
              </div>
            ) : availableBoards.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-semibold text-gray-500 mb-2">No content uploaded yet</p>
                <p className="text-sm">Admin needs to upload PDFs before AI generation is available.</p>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Board, Grade & Subject */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Board</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.board}
                    onChange={(e) => setForm({ ...form, board: e.target.value })}
                  >
                    {availableBoards.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.grade}
                    onChange={(e) => {
                      const g = e.target.value;
                      if (isFree && (g === '11' || g === '12')) {
                        toast.error('Grade 11 & 12 require Basic or higher plan.');
                        return;
                      }
                      setForm({ ...form, grade: g });
                    }}
                  >
                    {availableGrades.map((g) => (
                      <option key={g} value={g} disabled={isFree && (g === '11' || g === '12')}>
                        Grade {g}{isFree && (g === '11' || g === '12') ? ' 🔒' : ''}
                      </option>
                    ))}
                  </select>
                  {isFree && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Grade 11 & 12 require Basic plan.{' '}
                      <button type="button" onClick={() => navigate('/payment')} className="underline font-semibold">Upgrade</button>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  >
                    {availableSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Topics / Units */}
              {availableTopics.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Topics / Units</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTopics([])}
                        className={`text-xs px-3 py-1 rounded-full font-medium border transition-all ${
                          allSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        All Topics
                      </button>
                      {!allSelected && (
                        <span className="text-xs text-gray-500">
                          {selectedTopics.length} selected
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableTopics.map((topic) => {
                      const active = selectedTopics.includes(topic);
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => toggleTopic(topic)}
                          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                          }`}
                        >
                          {topic}
                        </button>
                      );
                    })}
                  </div>
                  {!allSelected && (
                    <p className="text-xs text-blue-600 mt-3 font-medium">
                      AI will generate questions from: {selectedTopics.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Question Configuration */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Question Configuration</h3>

                {/* Question Counts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Questions</label>
                    <input
                      type="number" min="0" placeholder="e.g. 40"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={form.num_mcq}
                      onChange={(e) => setForm({ ...form, num_mcq: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Short Answer</label>
                    <input
                      type="number" min="0" placeholder="e.g. 5"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={form.num_short}
                      onChange={(e) => setForm({ ...form, num_short: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Long Answer</label>
                    <input
                      type="number" min="0" placeholder="e.g. 3"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={form.num_long}
                      onChange={(e) => setForm({ ...form, num_long: e.target.value })}
                    />
                  </div>
                </div>

                {/* Marks per Question */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marks per MCQ</label>
                    <input
                      type="number" min="1"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={form.marks_per_mcq}
                      onChange={(e) => setForm({ ...form, marks_per_mcq: Number(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marks per Short</label>
                    <input
                      type="number" min="1"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={form.marks_per_short}
                      onChange={(e) => setForm({ ...form, marks_per_short: Number(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marks per Long</label>
                    <input
                      type="number" min="1"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={form.marks_per_long}
                      onChange={(e) => setForm({ ...form, marks_per_long: Number(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                {/* Total Marks Display */}
                {explicitCounts && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-800">Total Marks (Auto-calculated)</span>
                      <span className="text-2xl font-bold text-blue-900">{computedMarks}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Difficulty & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d} type="button"
                        onClick={() => setForm({ ...form, difficulty: d })}
                        className={`py-3 px-4 rounded-lg text-sm font-medium border transition-all ${
                          form.difficulty === d
                            ? d === "easy" ? "bg-green-500 text-white border-green-500"
                              : d === "hard" ? "bg-red-500 text-white border-red-500"
                              : "bg-blue-500 text-white border-blue-500"
                            : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                  >
                    {DURATIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Answer Key option */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    checked={form.include_answer_key}
                    onChange={(e) => setForm({ ...form, include_answer_key: e.target.checked })}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Include Answer Key</p>
                    <p className="text-xs text-gray-500">Attach answers to downloaded PDF</p>
                  </div>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-3">
                  <Sparkles className="w-5 h-5" />
                  Generate Paper &amp; Edit
                </div>
              </button>
            </form>
            )}
          </div>

          {/* Feature cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <FileText className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">AI Generated Papers</h3>
              <p className="text-gray-600 text-sm">Professional exam papers created with advanced AI technology</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <Edit className="w-8 h-8 text-purple-600 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">LaTeX Editor</h3>
              <p className="text-gray-600 text-sm">Edit and customize your papers with powerful LaTeX tools</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <Download className="w-8 h-8 text-green-600 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Multiple Formats</h3>
              <p className="text-gray-600 text-sm">Download in PDF, PPT, or LaTeX formats</p>
            </div>
          </div>

        </div>
      </div>

      {showPaywall && (
        <PaywallModal reason={paywallReason} onClose={() => setShowPaywall(false)} />
      )}
    </div>
  );
}
