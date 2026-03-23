import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, Lock } from 'lucide-react';

export default function PaywallModal({ onClose }) {
  const navigate = useNavigate();

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
          <h2 className="font-serif text-2xl font-bold text-primary-900 mb-2">Credits Exhausted!</h2>
          <p className="text-gray-500 text-sm">You've used all 3 free downloads. Upgrade to continue creating unlimited papers.</p>
        </div>

        <div className="grid gap-3 mb-6">
          {/* Monthly */}
          <div className="border-2 border-primary-900 rounded-2xl p-4 relative">
            <div className="absolute -top-2.5 right-4 bg-primary-900 text-white text-xs font-bold px-3 py-0.5 rounded-full">POPULAR</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-primary-900">Monthly Pro</div>
                <div className="text-gray-500 text-xs">Unlimited for 30 days</div>
              </div>
              <div className="text-2xl font-serif font-bold text-primary-900">₹200</div>
            </div>
            <ul className="text-xs text-gray-600 mt-3 space-y-1">
              {['Unlimited PDF downloads', 'All 11 templates', 'PDF Tools access', 'Photo to LaTeX'].map(f => (
                <li key={f} className="flex items-center gap-2"><span className="text-green-500">✓</span>{f}</li>
              ))}
            </ul>
          </div>

          {/* Yearly */}
          <div className="border-2 border-gold rounded-2xl p-4 bg-amber-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-primary-900 flex items-center gap-1">
                  Yearly Pro <span className="credit-badge ml-2">BEST VALUE</span>
                </div>
                <div className="text-gray-500 text-xs">Save ₹400 vs monthly</div>
              </div>
              <div className="text-2xl font-serif font-bold text-primary-900">₹2000</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => { navigate('/payment'); onClose(); }}
          className="btn-gold w-full py-3 text-lg flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" /> Upgrade Now
        </button>

        <p className="text-center text-gray-400 text-xs mt-4">
          UPI Payment • Instant activation • Cancel anytime
        </p>
      </div>
    </div>
  );
}
