import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Download, Shield, Star, FileText, Layers, Sparkles, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleLogout = () => { signOut(); };

  const features = [
    { icon: <Sparkles className="w-6 h-6" />, title: 'AI Question Generation', desc: 'Describe your topic, board, and difficulty — AI generates a full question paper in seconds. CBSE, ICSE, Maharashtra State Board grades 8–12.', primary: true },
    { icon: <Layers className="w-6 h-6" />, title: '11 Professional Templates', desc: 'Pick any template — Classic, Modern, Two-Column, Olympiad and more. One click and the paper is styled instantly.', primary: true },
    { icon: <Download className="w-6 h-6" />, title: 'Instant PDF Download', desc: 'Pixel-perfect PDF in seconds. Looks exactly like a printed exam paper. Download unlimited papers.', primary: true },
    { icon: <FileText className="w-6 h-6" />, title: 'LaTeX Question Editor', desc: 'Write complex formulas with live preview. Physics, Chemistry, Calculus — all beautifully rendered.' },
    { icon: <Zap className="w-6 h-6" />, title: 'PDF Import & Edit', desc: 'Import any PDF question paper into the editor. Convert to PPT or LaTeX.' },
    { icon: <Shield className="w-6 h-6" />, title: 'Cloud Library', desc: 'All your papers saved securely. Re-edit, re-download anytime from any device.' },
  ];

  const testimonials = [
    { name: 'Rajesh Kumar', role: 'Physics Teacher, Delhi', text: 'I generated a full Class 12 CBSE mock paper in under 2 minutes. The AI questions are surprisingly good and the PDF looks professional.', stars: 5 },
    { name: 'Priya Sharma', role: 'Coaching Director, Kota', text: 'Our institute saves 3 hours per paper. We just pick a template and download — done. The AI generation is a game changer.', stars: 5 },
    { name: 'Anand Verma', role: 'Math Tutor, Pune', text: 'Best investment for my coaching. AI generates 30 questions in seconds and the LaTeX rendering is flawless.', stars: 5 },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/s2.webp" alt="Deskexam" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-serif text-xl font-bold text-primary-900">Deskexam</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-primary-900">Features</a>
            <a href="#how-it-works" className="hover:text-primary-900">How it Works</a>
            <a href="#pricing" className="hover:text-primary-900">Pricing</a>
            <a href="#contact" className="hover:text-primary-900">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="w-8 h-8 bg-primary-900 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
                </div>
                <span className="text-primary-900 font-semibold text-sm hidden sm:block">
                  {profile?.full_name || profile?.email}
                </span>
                <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm py-2">
                  Dashboard →
                </button>
                <button onClick={handleLogout} className="text-gray-500 hover:text-primary-900 transition-colors" title="Sign out">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/auth')} className="text-primary-900 font-semibold text-sm">Login</button>
                <button onClick={() => navigate('/auth')} className="btn-primary text-sm py-2">
                  Start Free →
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-6 hero-section relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gold rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-blue-400 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-gold text-sm font-medium mb-6">
            <Star className="w-4 h-4 fill-current" /> Trusted by 10,000+ teachers across India
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Generate Question Papers<br />
            <span className="text-gold">with AI — Download Instantly</span>
          </h1>
          <p className="text-blue-200 text-xl mb-10 max-w-2xl mx-auto">
            Pick a topic, choose a template, let AI build your question paper.
            Download a print-ready PDF in under 2 minutes. CBSE, ICSE, Maharashtra State Board — grades 8 to 12.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/auth')} className="btn-gold text-lg px-8 py-3">
              Generate Your First Paper Free 🎓
            </button>
            <button onClick={() => navigate('/auth')} className="border border-white/30 text-white rounded-lg px-8 py-3 font-semibold hover:bg-white/10 transition-all">
              See Templates →
            </button>
          </div>
          <p className="text-blue-300 text-sm mt-4">No credit card required • 15-day free trial included</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-primary-900 border-y border-blue-800">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[['10,000+','Teachers'], ['50,000+','Papers Generated'], ['11','Templates'], ['₹299/mo','Starting Price']].map(([num, label]) => (
            <div key={label}>
              <div className="font-serif text-3xl font-bold text-gold">{num}</div>
              <div className="text-blue-300 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-primary-900 mb-4">Ready in 3 Simple Steps</h2>
            <p className="text-gray-600 text-lg">From idea to printed paper in under 2 minutes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', icon: '🧠', title: 'Describe Your Paper', desc: 'Enter subject, topic, board (CBSE/ICSE/Maharashtra), grade (8–12), difficulty, and number of questions.' },
              { step: '2', icon: '✨', title: 'AI Generates Questions', desc: 'Our AI creates MCQs, short answers, and long answers — with accurate answers and marking.' },
              { step: '3', icon: '📄', title: 'Pick Template & Download', desc: 'Choose from 11 professional templates. Download a pixel-perfect PDF instantly.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-16 h-16 bg-primary-900 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">{s.icon}</div>
                <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Step {s.step}</div>
                <h3 className="font-bold text-primary-900 text-xl mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button onClick={() => navigate('/auth')} className="btn-primary text-lg px-10 py-3">
              Try It Now — Free
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-primary-900 mb-4">Everything You Need</h2>
            <p className="text-gray-600 text-lg">Powerful tools designed specifically for Indian educators</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="rounded-2xl p-6 border hover:shadow-lg transition-all feature-card"
                style={f.primary ? {
                  background: 'linear-gradient(135deg, #1a365d 0%, #0f2240 100%)',
                  border: '1px solid #2a4a7f'
                } : {
                  background: '#ffffff',
                  border: '1px solid #f1f5f9'
                }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={f.primary ? { background: 'rgba(255,255,255,0.1)', color: '#F7C948' } : { background: '#eff6ff', color: '#1a365d' }}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: f.primary ? '#ffffff' : '#1a365d' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: f.primary ? '#bfdbfe' : '#6b7280' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-primary-900 mb-4">Simple, Honest Pricing</h2>
            <p className="text-gray-600">Every new account gets a <strong>15-day free trial</strong> of Basic — no credit card required.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {/* Free */}
            <div className="border-2 border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-lg text-gray-800 mb-1">Free Starter</h3>
              <div className="text-3xl font-serif font-bold text-primary-900 mb-1">₹0</div>
              <p className="text-gray-400 text-xs mb-4">After trial ends</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                {['5 papers (lifetime)', '3 PDF downloads', 'Grade 8–10 only', 'Our watermark'].map(i => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span>{i}</li>
                ))}
              </ul>
              <button onClick={() => navigate('/auth')} className="w-full border-2 border-primary-900 text-primary-900 rounded-xl py-2 text-sm font-semibold hover:bg-primary-900 hover:text-white transition-all">
                Start Free Trial
              </button>
            </div>
            {/* Basic */}
            <div className="border-2 border-primary-900 rounded-2xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-900 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
              <h3 className="font-bold text-lg text-gray-800 mb-1">Basic</h3>
              <div className="text-3xl font-serif font-bold text-primary-900 mb-1">₹299<span className="text-base font-normal text-gray-500">/mo</span></div>
              <p className="text-gray-400 text-xs mb-4">The Professional</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                {['50 papers/month', '25 PDF downloads', 'Grade 8–12', 'No watermark', 'All templates', 'Cloud library'].map(i => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span>{i}</li>
                ))}
              </ul>
              <button onClick={() => navigate('/payment')} className="btn-primary w-full py-2 text-sm">
                Get Basic
              </button>
            </div>
            {/* Pro */}
            <div className="border-2 border-purple-400 rounded-2xl p-6 relative bg-purple-50">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">INSTITUTE</div>
              <h3 className="font-bold text-lg text-gray-800 mb-1">Pro</h3>
              <div className="text-3xl font-serif font-bold text-primary-900 mb-1">₹599<span className="text-base font-normal text-gray-500">/mo</span></div>
              <p className="text-gray-400 text-xs mb-4">The Institute</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                {['100 papers/month', '50 PDF downloads', 'Grade 8–12', 'Custom institute logo', 'All templates', 'Priority support'].map(i => (
                  <li key={i} className="flex items-center gap-2"><span className="text-purple-500">✓</span>{i}</li>
                ))}
              </ul>
              <button onClick={() => navigate('/payment')} className="w-full bg-purple-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-purple-700 transition-all">
                Get Pro
              </button>
            </div>
            {/* Yearly */}
            <div className="border-2 border-yellow-400 rounded-2xl p-6 bg-amber-50 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</div>
              <h3 className="font-bold text-lg text-gray-800 mb-1">Yearly</h3>
              <div className="text-3xl font-serif font-bold text-primary-900 mb-1">₹6000<span className="text-base font-normal text-gray-500">/yr</span></div>
              <p className="text-gray-400 text-xs mb-4">Pro features, save ₹1188</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                {['1000 papers/year', '500 PDF downloads', 'Grade 8–12', 'Custom institute logo', 'Early access features', 'Dedicated support'].map(i => (
                  <li key={i} className="flex items-center gap-2"><span className="text-amber-600">✓</span>{i}</li>
                ))}
              </ul>
              <button onClick={() => navigate('/payment')} className="btn-gold w-full py-2 text-sm">
                Get Yearly
              </button>
            </div>
          </div>
          <p className="text-center text-gray-500 text-sm mt-6">All new accounts get a <strong>15-day Basic trial</strong> automatically. No credit card needed.</p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-4xl font-bold text-primary-900 text-center mb-12">Loved by Teachers</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-3">{[...Array(t.stars)].map((_, j) => <Star key={j} className="w-4 h-4 text-gold fill-current" />)}</div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-primary-900 text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-primary-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-4xl font-bold text-white mb-4">Generate Your First Paper in 2 Minutes</h2>
          <p className="text-blue-200 text-lg mb-8">AI question generation · 11 templates · Instant PDF download</p>
          <button onClick={() => navigate('/auth')} className="btn-gold text-lg px-10 py-4">
            Start Free — No Credit Card 🚀
          </button>
        </div>
      </section>

      {/* Contact Us */}
      <section id="contact" className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-4xl font-bold text-primary-900 mb-4">Contact Us</h2>
          <p className="text-gray-600 text-lg mb-10">Have questions or need help? We're here for you.</p>
          <div className="grid sm:grid-cols-2 gap-6">
            <a href="mailto:deskexamsupporter@gmail.com"
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-primary-900 group-hover:bg-blue-100 transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-primary-900 mb-1">Email Support</div>
                <div className="text-blue-600 text-sm">deskexamsupporter@gmail.com</div>
              </div>
            </a>
            <a href="https://wa.me/918625969689" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-100 rounded-2xl hover:border-green-200 hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-primary-900 mb-1">WhatsApp Support</div>
                <div className="text-green-600 text-sm">+91 86259 69689</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/s2.webp" alt="Deskexam" className="w-6 h-6 rounded object-contain" />
            <span className="font-serif font-bold text-white">Deskexam</span>
          </div>
          <p className="text-sm">© 2024 Deskexam. Made with ❤️ for Indian Teachers.</p>
          <div className="flex gap-4 text-sm">
            <a href="mailto:deskexamsupporter@gmail.com" className="hover:text-white">deskexamsupporter@gmail.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
