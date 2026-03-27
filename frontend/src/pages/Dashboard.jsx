import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, Download, Trash2, Edit2, Star, TrendingUp, BookOpen, Zap, Layers, Camera, Cloud, Copy } from 'lucide-react';
import Navbar from '../components/auth/Navbar';
import { useAuth } from '../hooks/useAuth';
import { getPapers, deletePaper, savePaper, resendVerification } from '../lib/api';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    if (user) {
      getPapers(user.id).then(({ data }) => {
        setPapers(data || []);
        setLoading(false);
      });
    }
  }, [user]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this paper?')) return;
    await deletePaper(id);
    setPapers(papers.filter(p => p.id !== id));
  };

  const handleDuplicate = async (paper) => {
    const { id, _id, created_at, updated_at, ...rest } = paper;
    const { data } = await savePaper({ ...rest, title: `Copy of ${paper.title}` });
    if (data) setPapers(prev => [data, ...prev]);
  };

  const isPaid = profile?.plan && profile.plan !== 'free' && profile?.days_until_expiry !== 0;
  const showUpgradeBanner = profile?.show_upgrade_banner || (!isPaid && !profile?.trial_active);

  const subjectColors = {
    Mathematics: 'bg-blue-100 text-blue-700',
    Physics: 'bg-purple-100 text-purple-700',
    Chemistry: 'bg-green-100 text-green-700',
  };

  const handleResend = async () => {
    setResendStatus('sending');
    const { error } = await resendVerification(profile?.email);
    setResendStatus(error ? 'error' : 'sent');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Email verification banner */}
      {profile && !profile.emailVerified && !profile.googleId && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm" style={{ marginTop: '64px' }}>
          <span className="text-amber-800 font-medium">⚠️ Please verify your email address to unlock all features.</span>
          {resendStatus === 'sent' ? (
            <span className="text-green-700 font-semibold">✓ Verification email sent!</span>
          ) : (
            <button onClick={handleResend} disabled={resendStatus === 'sending'}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60">
              {resendStatus === 'sending' ? 'Sending...' : 'Resend Verification Email'}
            </button>
          )}
        </div>
      )}
      <div className={`${profile && !profile.emailVerified && !profile.googleId ? 'pt-0' : 'pt-16'}`}>
        <div className="max-w-6xl mx-auto px-6 py-8">

          {/* Welcome header */}
          <div className="bg-gradient-to-r from-primary-900 to-blue-800 rounded-3xl p-8 mb-8 text-white relative overflow-hidden">
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
              <BookOpen className="w-40 h-40" />
            </div>
            <div className="relative">
              <h1 className="font-serif text-3xl font-bold mb-1">
                Namaste, {profile?.full_name?.split(' ')[0] || 'Teacher'} 👋
              </h1>
              <p className="text-blue-200 mb-6">Ready to create today's question paper?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/generate')}
                  className="bg-white text-primary-900 font-semibold px-6 py-2.5 rounded-xl hover:shadow-lg transition-all"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    AI Generate Paper
                  </span>
                </button>
                <button
                  onClick={() => navigate('/editor')}
                  className="btn-gold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create New Paper
                </button>
              </div>
            </div>
          </div>

          {/* Expiry warning — only show when ≤5 days left */}
          {profile?.show_upgrade_banner && profile?.days_until_expiry >= 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <span className="text-amber-800 font-medium text-sm">
                ⚠️ Your {profile?.plan} plan expires in <strong>{profile.days_until_expiry} day{profile.days_until_expiry !== 1 ? 's' : ''}</strong>. Renew to keep access.
              </span>
              <button onClick={() => navigate('/payment')} className="btn-gold text-xs py-1.5 px-4 ml-4 whitespace-nowrap">
                Renew Now
              </button>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="text-3xl font-serif font-bold text-primary-900">{profile?.total_papers_created || 0}</div>
              <div className="text-gray-500 text-sm mt-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Papers Created</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="text-3xl font-serif font-bold text-primary-900">{papers.length}</div>
              <div className="text-gray-500 text-sm mt-1 flex items-center gap-1"><BookOpen className="w-3 h-3" /> In Library</div>
            </div>
            {/* Papers remaining */}
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 shadow-sm">
              <div className="text-3xl font-serif font-bold text-primary-900">
                {profile?.papers_remaining ?? '—'}
              </div>
              <div className="text-blue-600 text-sm mt-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Papers Left
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{profile?.papers_used ?? 0} / {profile?.papers_limit ?? 5} used</div>
            </div>
            {/* Downloads remaining */}
            <div className="bg-green-50 rounded-2xl p-5 border border-green-100 shadow-sm">
              <div className="text-3xl font-serif font-bold text-green-700">
                {profile?.downloads_remaining ?? '—'}
              </div>
              <div className="text-green-600 text-sm mt-1 flex items-center gap-1">
                <Download className="w-3 h-3" /> Downloads Left
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{profile?.downloads_used ?? 0} / {profile?.downloads_limit ?? 3} used</div>
            </div>
          </div>

          {/* Plan status bar */}
          <div className={`rounded-2xl p-4 mb-6 flex items-center justify-between ${isPaid ? 'bg-green-50 border border-green-200' : 'bg-gray-100 border border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <Star className={`w-4 h-4 ${isPaid ? 'text-green-600 fill-current' : 'text-gray-400'}`} />
              <div>
                <span className={`font-semibold text-sm ${isPaid ? 'text-green-800' : 'text-gray-600'}`}>
                  {profile?.trial_active ? `Basic Trial — ${profile?.days_until_expiry} days left` :
                   isPaid ? `${profile?.plan?.charAt(0).toUpperCase() + profile?.plan?.slice(1)} Plan Active` :
                   'Free Plan'}
                </span>
                {isPaid && profile?.subscription_end && (
                  <div className="text-xs text-gray-400">Renews {new Date(profile.subscription_end).toLocaleDateString('en-IN')}</div>
                )}
              </div>
            </div>
            {showUpgradeBanner && (
              <button onClick={() => navigate('/payment')} className="btn-gold text-xs py-1.5 px-4">
                ⚡ Upgrade
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: '📐', title: 'Math Paper', desc: 'Create a mathematics question paper', subject: 'Mathematics' },
              { icon: '⚗️', title: 'Chemistry Paper', desc: 'Create with chemical equations', subject: 'Chemistry' },
              { icon: '🔭', title: 'Physics Paper', desc: 'Create with formulas and diagrams', subject: 'Physics' },
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => navigate('/editor', { state: { subject: q.subject } })}
                className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all text-left template-card"
              >
                <div className="text-3xl mb-3">{q.icon}</div>
                <div className="font-semibold text-primary-900">{q.title}</div>
                <div className="text-gray-500 text-xs mt-1">{q.desc}</div>
              </button>
            ))}
          </div>

          {/* PDF Tools Banner */}
          <div className="bg-gradient-to-r from-saffron to-orange-500 rounded-2xl p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">🔄 PDF Power Tools</h3>
                <p className="text-orange-100 text-sm">Convert PDFs to editable papers • Photo to LaTeX • PDF to PPT</p>
              </div>
              <button onClick={() => navigate('/pdf-tools')} className="bg-white text-orange-600 font-bold text-sm px-5 py-2.5 rounded-xl hover:shadow-lg transition-all">
                Open Tools →
              </button>
            </div>
          </div>

          {/* What can you do here */}
          <div className="mb-8">
            <h2 className="font-serif text-2xl font-bold text-primary-900 mb-1">What can you do here?</h2>
            <p className="text-gray-400 text-sm mb-4">Everything you need to create professional question papers</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: <Edit2 className="w-5 h-5" />,
                  color: 'bg-blue-50 text-blue-600',
                  title: 'LaTeX Question Editor',
                  desc: 'Write complex math & chemistry equations with a live A4 preview. Supports MCQ, True/False, and subjective questions.',
                  action: 'Start Writing',
                  route: '/editor',
                },
                {
                  icon: <Layers className="w-5 h-5" />,
                  color: 'bg-purple-50 text-purple-600',
                  title: '11+ Paper Templates',
                  desc: 'Choose from CBSE, ICSE, JEE, NEET, Olympiad and coaching institute-ready templates — professionally designed.',
                  action: 'Browse Templates',
                  route: '/templates',
                },
                {
                  icon: <Camera className="w-5 h-5" />,
                  color: 'bg-rose-50 text-rose-600',
                  title: 'Photo → LaTeX AI',
                  desc: 'Upload a photo of a handwritten question and our AI converts it to LaTeX code automatically.',
                  action: 'Try It',
                  route: '/pdf-tools',
                },
                {
                  icon: <Cloud className="w-5 h-5" />,
                  color: 'bg-teal-50 text-teal-600',
                  title: 'Cloud Library',
                  desc: 'All your question papers are saved securely in the cloud. Re-open and edit them anytime from any device.',
                  action: 'My Library',
                  route: null,
                },
                {
                  icon: <Zap className="w-5 h-5" />,
                  color: 'bg-amber-50 text-amber-600',
                  title: 'Instant PDF Download',
                  desc: 'Export any paper as a clean, print-ready PDF in one click. Professional A4 layout with proper formatting.',
                  action: 'Create & Download',
                  route: '/editor',
                },
                // Only show the "Unlimited with Pro" card if user is not subscribed
                !isPaid && {
                  icon: <TrendingUp className="w-5 h-5" />,
                  color: 'bg-green-50 text-green-600',
                  title: 'Unlimited with Pro',
                  desc: 'Free plan gives 3 downloads. Upgrade to Pro for unlimited PDF exports, all templates, and priority support.',
                  action: 'See Plans',
                  route: '/payment',
                },
              ].filter(Boolean).map((feat, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all flex flex-col gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${feat.color}`}>
                    {feat.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-primary-900 text-sm mb-1">{feat.title}</div>
                    <p className="text-gray-400 text-xs leading-relaxed">{feat.desc}</p>
                  </div>
                  <button
                    onClick={() => feat.route ? navigate(feat.route) : window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    className="mt-auto text-xs font-semibold text-primary-900 hover:underline text-left"
                  >
                    {feat.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* My Library */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl font-bold text-primary-900">My Library</h2>
              <button onClick={() => navigate('/editor')} className="flex items-center gap-1.5 text-primary-900 text-sm font-semibold hover:underline">
                <Plus className="w-4 h-4" /> New Paper
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search papers by title, subject or class..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-900"
              />
            </div>

            {loading ? (
              <div className="grid md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-40 shimmer rounded-2xl"></div>)}
              </div>
            ) : papers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-gray-500 font-semibold mb-2">No papers yet</h3>
                <p className="text-gray-400 text-sm mb-4">Create your first question paper to get started</p>
                <button onClick={() => navigate('/editor')} className="btn-primary text-sm py-2 px-6">
                  Create First Paper
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {papers.filter(p => {
                  const q = search.toLowerCase();
                  return !q || p.title?.toLowerCase().includes(q) || p.subject?.toLowerCase().includes(q) || p.class_name?.toLowerCase().includes(q);
                }).map(paper => (
                  <div key={paper.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all template-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`text-xs font-semibold px-2 py-1 rounded-full ${subjectColors[paper.subject] || 'bg-gray-100 text-gray-600'}`}>
                        {paper.subject}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => navigate(`/editor/${paper.id}`)} title="Edit" className="p-1.5 text-gray-400 hover:text-primary-900 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDuplicate(paper)} title="Duplicate" className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(paper.id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-primary-900 mb-1 truncate">{paper.title}</h3>
                    <p className="text-gray-400 text-xs mb-3">{paper.class_name} • {paper.max_marks} marks • {paper.time_duration}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(paper.updated_at).toLocaleDateString('en-IN')}
                      </span>
                      <span className="text-xs text-gray-400">{paper.questions?.length || 0} questions</span>
                    </div>
                    <button
                      onClick={() => navigate(`/editor/${paper.id}`)}
                      className="mt-3 w-full bg-gray-50 hover:bg-primary-900 hover:text-white text-gray-600 text-xs font-semibold py-2 rounded-xl transition-all"
                    >
                      Open & Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 mt-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/s2.webp" alt="Deskexam" className="w-6 h-6 rounded object-contain" />
            <span className="font-serif font-bold text-white">Deskexam</span>
          </div>
          <p className="text-sm">© 2024 Deskexam. Made with ❤️ for Indian Teachers.</p>
          <div className="flex gap-4 text-sm">
            <a href="mailto:deskexamsupporter@gmail.com" className="hover:text-white">deskexamsupporter@gmail.com</a>
            <a href="https://wa.me/918625969689" target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
