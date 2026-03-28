import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Download, Shield, Star, FileText, Layers, Sparkles, LogOut, Check, ArrowRight, BookOpen, Clock, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: '#080d1a', color: '#e2e8f0', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(8,13,26,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/s2.webp" alt="Deskexam" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>Deskexam</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden-mobile-nav">
            {['Features','How it Works','Pricing','Contact'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`}
                style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#F7C948'}
                onMouseLeave={e => e.target.style.color = '#94a3b8'}
              >{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user ? (
              <>
                <button onClick={() => navigate('/dashboard')} style={styles.btnGold}>Dashboard →</button>
                <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 6 }} title="Sign out">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/auth')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Login</button>
                <button onClick={() => navigate('/auth')} style={styles.btnGold}>Start Free →</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 100, paddingLeft: 24, paddingRight: 24, position: 'relative', overflow: 'hidden' }}>
        {/* Background orbs */}
        <div style={{ position: 'absolute', top: 60, left: '10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(247,201,72,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 100, right: '5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '30%', width: 600, height: 300, background: 'radial-gradient(circle, rgba(247,201,72,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(247,201,72,0.1)', border: '1px solid rgba(247,201,72,0.25)',
            borderRadius: 999, padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#F7C948',
            marginBottom: 28, backdropFilter: 'blur(10px)'
          }}>
            <Star size={14} fill="#F7C948" /> Trusted by 10,000+ teachers across India
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(42px, 6vw, 72px)',
            fontWeight: 800, lineHeight: 1.1, marginBottom: 24,
            background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 60%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            Generate Question Papers<br />
            <span style={{
              background: 'linear-gradient(135deg, #F7C948 0%, #FFB347 50%, #FF6B35 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>with AI — Download Instantly</span>
          </h1>

          <p style={{ color: '#94a3b8', fontSize: 20, lineHeight: 1.7, marginBottom: 44, maxWidth: 620, margin: '0 auto 44px' }}>
            Pick a topic, choose a template, let AI build your question paper.
            Download a print-ready PDF in under 2 minutes. CBSE, ICSE, Maharashtra boards.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 20 }}>
            <button onClick={() => navigate('/auth')} style={{ ...styles.btnGoldLarge, fontSize: 16 }}>
              Generate Your First Paper Free 🎓
            </button>
            <button onClick={() => navigate('/auth')} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0', borderRadius: 12, padding: '14px 28px', fontWeight: 600, fontSize: 15,
              cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s'
            }}>
              See Templates →
            </button>
          </div>
          <p style={{ color: '#475569', fontSize: 13 }}>No credit card required • 15-day free trial included</p>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ padding: '40px 24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
          {[
            { num: '10,000+', label: 'Teachers', icon: <Users size={18} /> },
            { num: '50,000+', label: 'Papers Generated', icon: <FileText size={18} /> },
            { num: '11', label: 'Templates', icon: <Layers size={18} /> },
            { num: '₹299/mo', label: 'Starting Price', icon: <Zap size={18} /> },
          ].map(({ num, label, icon }) => (
            <div key={label}>
              <div style={{ color: '#64748b', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{icon}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, background: 'linear-gradient(135deg, #F7C948, #FF9D4A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{num}</div>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#F7C948', fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Simple Process</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: '-0.01em' }}>Ready in 3 Simple Steps</h2>
            <p style={{ color: '#64748b', fontSize: 17 }}>From idea to printed paper in under 2 minutes</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { step: '01', emoji: '🧠', title: 'Describe Your Paper', desc: 'Enter subject, topic, board (CBSE/ICSE/Maharashtra), difficulty, and number of questions.' },
              { step: '02', emoji: '✨', title: 'AI Generates Questions', desc: 'Our AI creates MCQs, short answers, and long answers — with accurate marking schemes.' },
              { step: '03', emoji: '📄', title: 'Pick Template & Download', desc: 'Choose from 11 professional templates. Download a pixel-perfect PDF instantly.' },
            ].map((s) => (
              <div key={s.step} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  position: 'absolute', top: 20, right: 20,
                  fontFamily: "'Playfair Display', serif", fontSize: 56, fontWeight: 800,
                  color: 'rgba(247,201,72,0.06)', lineHeight: 1
                }}>{s.step}</div>
                <div style={{ fontSize: 36, marginBottom: 20 }}>{s.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#F7C948', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Step {s.step}</div>
                <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{s.title}</h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button onClick={() => navigate('/auth')} style={styles.btnPrimary}>
              Try It Now — Free <ArrowRight size={16} style={{ display: 'inline', marginLeft: 6 }} />
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '100px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#F7C948', fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Features</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>Everything You Need</h2>
            <p style={{ color: '#64748b', fontSize: 17 }}>Powerful tools designed specifically for Indian educators</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {[
              { icon: <Sparkles size={22} />, title: 'AI Question Generation', desc: 'Describe topic, board, difficulty — AI generates a full paper in seconds. CBSE, ICSE, Maharashtra, JEE, NEET.', primary: true },
              { icon: <Layers size={22} />, title: '11 Professional Templates', desc: 'Classic, Modern, Two-Column, JEE, NEET, Olympiad. One click styles your paper instantly.', primary: true },
              { icon: <Download size={22} />, title: 'Instant PDF Download', desc: 'Pixel-perfect PDF in seconds. Looks exactly like a printed exam paper ready to photocopy.', primary: true },
              { icon: <FileText size={22} />, title: 'LaTeX Question Editor', desc: 'Write complex formulas with live preview. Physics, Chemistry, Calculus — beautifully rendered.' },
              { icon: <Zap size={22} />, title: 'PDF Import & Edit', desc: 'Import any PDF question paper into the editor. Convert and customize with ease.' },
              { icon: <Shield size={22} />, title: 'Cloud Library', desc: 'All your papers saved securely. Re-edit, re-download anytime from any device.' },
            ].map((f, i) => (
              <div key={i} style={{
                borderRadius: 20, padding: 28, border: '1px solid',
                background: f.primary
                  ? 'linear-gradient(135deg, rgba(247,201,72,0.08) 0%, rgba(255,107,53,0.05) 100%)'
                  : 'rgba(255,255,255,0.02)',
                borderColor: f.primary ? 'rgba(247,201,72,0.2)' : 'rgba(255,255,255,0.07)',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20, background: f.primary ? 'rgba(247,201,72,0.15)' : 'rgba(255,255,255,0.05)',
                  color: f.primary ? '#F7C948' : '#94a3b8'
                }}>{f.icon}</div>
                <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#F7C948', fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>Simple, Honest Pricing</h2>
            <p style={{ color: '#64748b', fontSize: 17 }}>Every new account gets a <strong style={{ color: '#F7C948' }}>15-day free trial</strong> — no credit card required.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20, alignItems: 'start' }}>
            {/* Free */}
            <PricingCard
              title="Free Starter"
              price="₹0"
              sub="After trial ends"
              features={['5 papers (lifetime)', '3 PDF downloads', 'Grade 8–10 only', 'Watermark on PDF']}
              buttonText="Start Free Trial"
              onClick={() => navigate('/auth')}
              accentColor="#64748b"
            />
            {/* Basic */}
            <PricingCard
              title="Basic"
              price="₹299"
              period="/mo"
              sub="Most Popular"
              features={['50 papers/month', '25 PDF downloads', 'Grade 8–12', 'No watermark', 'All templates', 'Cloud library']}
              buttonText="Get Basic"
              onClick={() => navigate('/payment')}
              highlight
              accentColor="#6366f1"
              badge="POPULAR"
            />
            {/* Pro */}
            <PricingCard
              title="Pro"
              price="₹599"
              period="/mo"
              sub="For Institutes"
              features={['100 papers/month', '50 PDF downloads', 'Grade 8–12', 'Custom institute logo', 'All templates', 'Priority support']}
              buttonText="Get Pro"
              onClick={() => navigate('/payment')}
              accentColor="#a855f7"
              badge="INSTITUTE"
            />
            {/* Yearly */}
            <PricingCard
              title="Yearly Pro"
              price="₹6000"
              period="/yr"
              sub="Save ₹1188"
              features={['1000 papers/year', '500 PDF downloads', 'Grade 8–12', 'Custom institute logo', 'Early access features', 'Dedicated support']}
              buttonText="Get Yearly"
              onClick={() => navigate('/payment')}
              accentColor="#F7C948"
              badge="BEST VALUE"
              gold
            />
          </div>
          <p style={{ textAlign: 'center', color: '#475569', fontSize: 13, marginTop: 32 }}>
            All new accounts get a <strong style={{ color: '#F7C948' }}>15-day Basic trial</strong> automatically. No credit card needed.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '100px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#F7C948', fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Testimonials</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#fff' }}>Loved by Teachers</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { name: 'Rajesh Kumar', role: 'Physics Teacher, Delhi', text: 'I generated a full mock paper in under 2 minutes. The AI questions are surprisingly good and the PDF looks professional.' },
              { name: 'Priya Sharma', role: 'Coaching Director, Kota', text: 'Our institute saves 3 hours per paper. We just pick a template and download — done. The AI generation is a game changer.' },
              { name: 'Anand Verma', role: 'Math Tutor, Pune', text: 'Best investment for my coaching. AI generates 30 questions in seconds and the LaTeX rendering is flawless.' },
            ].map((t, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: 28
              }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} fill="#F7C948" color="#F7C948" />)}
                </div>
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 20, fontStyle: 'italic' }}>"{t.text}"</p>
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                  <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(247,201,72,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: '-0.01em' }}>
            Generate Your First Paper<br />
            <span style={{ background: 'linear-gradient(135deg, #F7C948, #FF9D4A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>in 2 Minutes</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: 17, marginBottom: 40 }}>AI question generation · 11 templates · Instant PDF download</p>
          <button onClick={() => navigate('/auth')} style={{ ...styles.btnGoldLarge, fontSize: 17, padding: '16px 40px' }}>
            Start Free — No Credit Card 🚀
          </button>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Contact Us</h2>
          <p style={{ color: '#64748b', fontSize: 16, marginBottom: 40 }}>Have questions or need help? We're here for you.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <a href="mailto:deskexamsupporter@gmail.com" style={styles.contactCard}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>✉️</div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 6 }}>Email Support</div>
              <div style={{ color: '#6366f1', fontSize: 13 }}>deskexamsupporter@gmail.com</div>
            </a>
            <a href="https://wa.me/918625969689" target="_blank" rel="noopener noreferrer" style={styles.contactCard}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>💬</div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 6 }}>WhatsApp Support</div>
              <div style={{ color: '#22c55e', fontSize: 13 }}>+91 86259 69689</div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/s2.webp" alt="Deskexam" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#fff', fontSize: 16 }}>Deskexam</span>
          </div>
          <p style={{ color: '#374151', fontSize: 13 }}>© 2024 Deskexam. Made with ❤️ for Indian Teachers.</p>
          <a href="mailto:deskexamsupporter@gmail.com" style={{ color: '#475569', fontSize: 13, textDecoration: 'none' }}>deskexamsupporter@gmail.com</a>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ title, price, period, sub, features, buttonText, onClick, highlight, gold, accentColor, badge }) {
  return (
    <div style={{
      borderRadius: 20, padding: 28,
      background: gold
        ? 'linear-gradient(135deg, rgba(247,201,72,0.08) 0%, rgba(255,107,53,0.05) 100%)'
        : highlight
        ? 'rgba(99,102,241,0.07)'
        : 'rgba(255,255,255,0.02)',
      border: `1px solid ${gold ? 'rgba(247,201,72,0.3)' : highlight ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
      position: 'relative',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: gold ? '#F7C948' : highlight ? '#6366f1' : accentColor,
          color: gold ? '#0a0f1a' : '#fff',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          padding: '4px 12px', borderRadius: 999
        }}>{badge}</div>
      )}
      <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 8, marginTop: badge ? 8 : 0 }}>{title}</h3>
      <div style={{ marginBottom: 4 }}>
        <span style={{
          fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800,
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
        }}>{price}</span>
        {period && <span style={{ color: '#475569', fontSize: 14 }}>{period}</span>}
      </div>
      <p style={{ color: '#475569', fontSize: 12, marginBottom: 24 }}>{sub}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8' }}>
            <Check size={14} color={accentColor} style={{ flexShrink: 0 }} /> {f}
          </li>
        ))}
      </ul>
      <button onClick={onClick} style={{
        width: '100%', padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
        cursor: 'pointer', border: 'none', transition: 'all 0.2s',
        background: gold
          ? 'linear-gradient(135deg, #F7C948, #FF9D4A)'
          : highlight
          ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
          : `rgba(${accentColor === '#64748b' ? '100,116,139' : '168,85,247'},0.15)`,
        color: gold ? '#0a0f1a' : '#fff',
        border: gold || highlight ? 'none' : `1px solid ${accentColor}44`,
      }}>{buttonText}</button>
    </div>
  );
}

const styles = {
  btnGold: {
    background: 'linear-gradient(135deg, #F7C948, #FF9D4A)',
    color: '#0a0f1a', borderRadius: 10, padding: '9px 20px',
    fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(247,201,72,0.3)', letterSpacing: '0.3px',
    transition: 'all 0.2s'
  },
  btnGoldLarge: {
    background: 'linear-gradient(135deg, #F7C948, #FF9D4A)',
    color: '#0a0f1a', borderRadius: 14, padding: '14px 32px',
    fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer',
    boxShadow: '0 8px 32px rgba(247,201,72,0.35)', letterSpacing: '0.3px',
    transition: 'all 0.2s'
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff', borderRadius: 12, padding: '13px 32px',
    fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
    boxShadow: '0 6px 24px rgba(99,102,241,0.3)',
    transition: 'all 0.2s'
  },
  contactCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: 28, borderRadius: 20, textDecoration: 'none',
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
    transition: 'all 0.2s'
  }
};
