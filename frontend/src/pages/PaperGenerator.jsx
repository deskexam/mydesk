import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateAndSavePaper } from '../lib/api';
import toast from 'react-hot-toast';
import { Sparkles, FileText, Download, Edit, BookOpen, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const BOARDS = ["CBSE", "ICSE", "Maharashtra"];
const GRADES = ["10", "11", "12"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const DURATIONS = [
  { value: 60,  label: "1 hour" },
  { value: 90,  label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
];

const SUBJECTS_BY_GRADE = {
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
  const isFree = !profile?.plan || profile?.plan === 'free';
  const [selectedTopics, setSelectedTopics] = useState([]);

  const [form, setForm] = useState({
    board: "CBSE",
    grade: "10",
    subject: "Mathematics",
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

  const subjects = SUBJECTS_BY_GRADE[form.grade]?.[form.board] || [];
  const topicList = TOPICS_BY_GRADE_SUBJECT[form.grade]?.[form.subject] || [];
  const allSelected = selectedTopics.length === 0;

  // Reset subject + topics when grade or board changes
  useEffect(() => {
    const list = SUBJECTS_BY_GRADE[form.grade]?.[form.board] || [];
    setForm(f => ({ ...f, subject: list[0] || '' }));
    setSelectedTopics([]);
  }, [form.grade, form.board]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset topics when subject changes
  useEffect(() => {
    setSelectedTopics([]);
  }, [form.subject]);

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

    const mcqCount = form.num_mcq !== "" ? Number(form.num_mcq) : 0;
    const numBatches = Math.ceil(mcqCount / 50);
    const loadingMsg = mcqCount > 50
      ? `Generating ${mcqCount} MCQ in ${numBatches} batches... ~${numBatches * 20}–${numBatches * 30}s`
      : "Generating paper with AI... This may take 15–30 seconds.";

    // Topics: if none selected → pass full topic list; if specific → pass those
    const topicsPayload = selectedTopics.length > 0 ? selectedTopics : (topicList.length > 0 ? topicList : null);

    setLoading(true);
    const toastId = toast.loading(loadingMsg);
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
      toast.dismiss(toastId);
      toast.success("Paper generated successfully!");
      navigate(`/editor/${paper.id}`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.detail || "Failed to generate paper");
    } finally {
      setLoading(false);
    }
  };

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
                    {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
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
                    {GRADES.map((g) => (
                      <option key={g} value={g} disabled={isFree && (g === '11' || g === '12')}>
                        {g}{isFree && (g === '11' || g === '12') ? ' 🔒' : ''}
                      </option>
                    ))}
                  </select>
                  {isFree && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Grade 11 & 12 require Basic plan or higher.{' '}
                      <button onClick={() => navigate('/payment')} className="underline font-semibold">Upgrade</button>
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
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Topics / Units */}
              {topicList.length > 0 && (
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
                    {topicList.map((topic) => {
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
                  {loading ? "Generating..." : "Generate Paper & Edit"}
                </div>
              </button>
            </form>
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
    </div>
  );
}
