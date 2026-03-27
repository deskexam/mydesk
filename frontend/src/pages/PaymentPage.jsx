import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Shield, Smartphone, CreditCard } from 'lucide-react';
import Navbar from '../components/auth/Navbar';
import { useAuth } from '../hooks/useAuth';
import RazorpayPayment from '../components/payment/RazorpayPayment';

const PLANS = {
  basic: {
    label: 'Basic Professional',
    amount: 299,
    duration: '30 days',
    savings: null,
    features: ['50 papers/month', '25 PDF downloads', 'Grade 8–12', 'No watermark', 'All templates', 'Cloud library'],
  },
  pro: {
    label: 'Pro Institute',
    amount: 599,
    duration: '30 days',
    savings: null,
    features: ['100 papers/month', '50 PDF downloads', 'Grade 8–12', 'Custom institute logo', 'All templates', 'Priority support'],
  },
  yearly: {
    label: 'Yearly Pro',
    amount: 6000,
    duration: '365 days',
    savings: 'Save ₹1188 vs monthly Pro!',
    features: ['1000 papers/year', '500 PDF downloads', 'Grade 8–12', 'Custom institute logo', 'Early access features', 'Dedicated support'],
  },
};

export default function PaymentPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = React.useState('basic');

  const plan = PLANS[selectedPlan];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-6 py-10">

          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 text-sm mb-6 hover:text-primary-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Plan Selection */}
            <div>
              <h1 className="font-serif text-3xl font-bold text-primary-900 mb-2">Choose Your Plan</h1>
              <p className="text-gray-500 mb-6">Unlock full access to AI question generation</p>

              <div className="space-y-3 mb-6">
                {Object.entries(PLANS).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`w-full text-left border-2 rounded-2xl p-4 transition-all ${
                      selectedPlan === key ? 'border-primary-900 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary-900">{p.label}</span>
                        {key === 'yearly' && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">BEST VALUE</span>}
                        {key === 'pro' && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">INSTITUTE</span>}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === key ? 'border-primary-900 bg-primary-900' : 'border-gray-300'}`}>
                        {selectedPlan === key && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div className="text-2xl font-serif font-bold text-primary-900">
                      ₹{p.amount.toLocaleString()}
                      <span className="text-sm text-gray-400 font-sans font-normal"> / {key === 'yearly' ? 'year' : 'month'}</span>
                    </div>
                    {p.savings && <p className="text-green-600 text-xs font-semibold mt-1">🎉 {p.savings}</p>}
                  </button>
                ))}
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              <RazorpayPayment
                selectedPlan={selectedPlan}
                onSuccess={() => { refreshProfile(); navigate('/dashboard'); }}
                onCancel={() => setSelectedPlan('basic')}
              />
            </div>

            {/* Right: Order Summary */}
            <div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-bold text-primary-900 mb-1">Order Summary</h3>
                <p className="text-gray-500 text-sm mb-6">Processed securely via Razorpay</p>

                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold">{plan.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Duration</span>
                    <span className="text-sm text-gray-500">{plan.duration}</span>
                  </div>
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="text-gray-600 font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary-900">₹{plan.amount.toLocaleString()}</span>
                  </div>
                  {plan.savings && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-700 text-sm font-semibold">🎉 {plan.savings}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-800 font-semibold text-sm mb-1">Secure Payment</p>
                      <p className="text-blue-700 text-xs">PCI DSS compliant — your card details are never stored</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Shield className="w-4 h-4 text-green-500" />, text: 'Secure' },
                    { icon: <CreditCard className="w-4 h-4 text-blue-500" />, text: 'All Cards' },
                    { icon: <Smartphone className="w-4 h-4 text-purple-500" />, text: 'UPI / Net Banking' },
                  ].map((t, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="flex justify-center mb-1">{t.icon}</div>
                      <p className="text-xs text-gray-600">{t.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
