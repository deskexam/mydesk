import { useNavigate } from 'react-router-dom';
import { Sparkles, PenLine } from 'lucide-react';
import Navbar from '../components/auth/Navbar';

export default function NewPaperPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-primary-900">
      <Navbar />
      <div className="pt-24 pb-16 px-6 flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-serif font-bold text-white mb-2 text-center">Create New Paper</h1>
        <p className="text-blue-300 mb-12 text-center">Choose how you want to create your question paper</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* AI Generate */}
          <button
            onClick={() => navigate('/generate')}
            className="group bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/60 rounded-2xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-500/30 transition-all">
              <Sparkles className="w-7 h-7 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">AI Generate</h2>
            <p className="text-blue-300 text-sm leading-relaxed">
              Upload your syllabus or notes and let AI automatically generate a complete question paper with sections and marks.
            </p>
            <div className="mt-6 text-blue-400 text-sm font-semibold group-hover:text-blue-300 transition-colors">
              Generate with AI →
            </div>
          </button>

          {/* Design Yourself */}
          <button
            onClick={() => navigate('/editor')}
            className="group bg-gradient-to-br from-gold/10 to-amber-600/10 border border-gold/30 hover:border-gold/60 rounded-2xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-gold/10"
          >
            <div className="w-14 h-14 bg-gold/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-gold/20 transition-all">
              <PenLine className="w-7 h-7 text-gold" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Design Yourself</h2>
            <p className="text-blue-300 text-sm leading-relaxed">
              Start with a blank editor and manually craft your question paper with full control over layout, sections, and formatting.
            </p>
            <div className="mt-6 text-gold text-sm font-semibold group-hover:text-amber-300 transition-colors">
              Open Editor →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
