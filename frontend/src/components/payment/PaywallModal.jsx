import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, Lock } from 'lucide-react';

export default function PaywallModal({ onClose, reason = 'papers' }) {
  const navigate = useNavigate();

  const messages = {
    papers: {
      title: 'Paper Limit Reached',
      desc: 'You\'ve used all your paper generations for this period. Upgrade to generate more.',
    },
    downloads: {
      title: 'Download Limit Reached',
      desc: 'You\'ve used all your PDF downloads for this period. Upgrade to download more.',
    },
    grade: {
      title: 'Grade Locked',
      desc: 'Grade 11 & 12 papers are available on Basic, Pro, and Yearly plans.',
    },
  };

  const msg = messages[reason] || messages.papers;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-primary-900 mb-2">{msg.title}</h2>
          <p className="text-gray-500 text-sm">{msg.desc}</p>
        </div>

        <div className="grid gap-3 mb-6">
          {/* Basic */}
          <div className="border-2 border-primary-900 rounded-2xl p-4 relative">
            <div className="absolute -top-2.5 right-4 bg-primary-900 text-white text-xs font-bold px-3 py-0.5 rounded-full">POPULAR</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-primary-900">Basic Professional</div>
                <div className="text-gray-500 text-xs">50 papers · 25 downloads/month</div>
              </div>
              <div className="text-2xl font-serif font-bold text-primary-900">₹299<span className="text-sm font-normal text-gray-400">/mo</span></div>
            </div>
          </div>
          {/* Pro */}
          <div className="border-2 border-purple-300 rounded-2xl p-4 bg-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-primary-900">Pro Institute</div>
                <div className="text-gray-500 text-xs">100 papers · 50 downloads · Custom logo</div>
              </div>
              <div className="text-2xl font-serif font-bold text-primary-900">₹599<span className="text-sm font-normal text-gray-400">/mo</span></div>
            </div>
          </div>
          {/* Yearly */}
          <div className="border-2 border-gold rounded-2xl p-4 bg-amber-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-primary-900 flex items-center gap-1">
                  Yearly Pro <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full ml-1">BEST VALUE</span>
                </div>
                <div className="text-gray-500 text-xs">1000 papers · 500 downloads/year</div>
              </div>
              <div className="text-2xl font-serif font-bold text-primary-900">₹6000<span className="text-sm font-normal text-gray-400">/yr</span></div>
            </div>
          </div>
        </div>

        <button
          onClick={() => { navigate('/payment'); onClose(); }}
          className="btn-gold w-full py-3 text-lg flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" /> View Plans & Upgrade
        </button>

        <p className="text-center text-gray-400 text-xs mt-4">
          UPI · Cards · Net Banking • Instant activation
        </p>
      </div>
    </div>
  );
}
