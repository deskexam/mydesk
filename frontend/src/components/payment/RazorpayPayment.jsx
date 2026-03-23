import React, { useState } from 'react';
import { Shield, Smartphone, Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../lib/api';

const RazorpayPayment = ({ selectedPlan, onSuccess, onCancel }) => {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plans = {
    monthly: { label: 'Monthly Pro', amount: 200, duration: '30 days', savings: null },
    yearly: { label: 'Yearly Pro', amount: 2000, duration: '365 days', savings: 'Save ₹400 vs monthly!' },
  };

  const plan = plans[selectedPlan];

  const handleRazorpayPayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please sign in first.');
      }

      // Create Razorpay order
      const orderRes = await createRazorpayOrder(selectedPlan, plan.amount);
      const orderData = orderRes.data;

      if (!orderData || !orderData.order_id) {
        throw new Error('Failed to create payment order');
      }

      // Load Razorpay SDK
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Deskexam',
          description: `${plan.label} Subscription`,
          order_id: orderData.order_id,
          handler: async function(response) {
            try {
              // Verify payment
              const { error: verifyError } = await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: selectedPlan,
              });

              if (verifyError) {
                throw new Error(verifyError.message || 'Payment verification failed');
              }

              // Refresh user profile to get updated subscription status
              await refreshProfile();
              
              // Call success callback
              if (onSuccess) {
                onSuccess();
              }
            } catch (err) {
              setError(err.message || 'Payment verification failed');
            }
          },
          prefill: {
            name: user?.fullName || '',
            email: user?.email || '',
          },
          theme: {
            color: '#2563eb'
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
              if (onCancel) {
                onCancel();
              }
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };

      document.body.appendChild(script);
    } catch (err) {
      setError(err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-primary-900 text-lg">Pay with Razorpay</h3>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-500" />
          <span className="text-sm text-gray-500">Secure Payment</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Plan</span>
          <span className="font-semibold">{plan.label}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Amount</span>
          <span className="text-2xl font-bold text-primary-900">₹{plan.amount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Duration</span>
          <span className="text-sm text-gray-500">{plan.duration}</span>
        </div>
        {plan.savings && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-700 text-sm font-semibold">🎉 {plan.savings}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleRazorpayPayment}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Pay ₹{plan.amount} with Razorpay
          </>
        )}
      </button>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-800 font-semibold text-sm mb-1">Secure Payment</p>
            <p className="text-blue-700 text-xs">Your payment is secured with Razorpay's PCI DSS compliant payment gateway</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { icon: <Shield className="w-4 h-4 text-green-500" />, text: 'Secure' },
          { icon: <CreditCard className="w-4 h-4 text-blue-500" />, text: 'Multiple Cards' },
          { icon: <Smartphone className="w-4 h-4 text-purple-500" />, text: 'Mobile Friendly' },
        ].map((t, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="flex justify-center mb-1">{t.icon}</div>
            <p className="text-xs text-gray-600">{t.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RazorpayPayment;