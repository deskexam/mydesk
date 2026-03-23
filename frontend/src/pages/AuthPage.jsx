import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { signUpWithPassword, signInWithPassword, forgotPassword, resetPassword, googleSignIn, verifyEmail, resendVerification as resendVerificationApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshProfile } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot' | 'reset' | 'verifying'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  // Check for reset/verify/unverified in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reset = params.get('reset');
    const verify = params.get('verify');
    const unverified = params.get('unverified');
    if (reset) {
      setResetToken(reset);
      setMode('reset');
    } else if (verify) {
      setMode('verifying');
      verifyEmail(verify).then(({ error: err }) => {
        if (err) setError(err.message);
        else setSuccess('Your email has been verified! You can now sign in.');
        setMode('signin');
      });
    } else if (unverified) {
      setError('Please verify your email before accessing the dashboard. Check your inbox for the verification link.');
    }
  }, [location.search]);

  useEffect(() => {
    if (user && user.emailVerified) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const reset = () => { setError(''); setSuccess(''); setUnverifiedEmail(''); };

  const handleResendFromLogin = async () => {
    setLoading(true);
    const { error: err } = await resendVerificationApi(unverifiedEmail);
    if (!err) { setSuccess('Verification email sent! Check your inbox.'); setUnverifiedEmail(''); setError(''); }
    else setError('Could not resend. Please try again.');
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (mode === 'signup') {
      if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
      const { error: err } = await signUpWithPassword(email, password, name.trim());
      if (err) setError(err.message);
      else {
        // Don't log in — require email verification first
        localStorage.removeItem('ss_token');
        setSuccess('Account created! Please check your email and click the verification link before signing in.');
        setMode('signin');
      }

    } else if (mode === 'signin') {
      const { error: err } = await signInWithPassword(email, password);
      if (err) {
        if (err.unverified) setUnverifiedEmail(email);
        setError(err.message);
      } else { await refreshProfile(); }

    } else if (mode === 'forgot') {
      const { error: err } = await forgotPassword(email);
      if (err) setError(err.message);
      else setSuccess('If this email exists, a reset link has been sent. Check your inbox.');

    } else if (mode === 'reset') {
      if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
      const { error: err } = await resetPassword(resetToken, newPassword);
      if (err) setError(err.message);
      else { await refreshProfile(); }
    }

    setLoading(false);
  };

  const handleGoogle = async (credentialResponse) => {
    setLoading(true);
    setError('');
    const { error: err } = await googleSignIn(credentialResponse.credential);
    if (err) setError(err.message);
    else await refreshProfile();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-blue-900 to-primary-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4">
            <img src="/s2.webp" alt="Deskexam" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white">Deskexam</h1>
          <p className="text-blue-300 mt-1">Professional Question Paper Creator</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">

          {/* Tabs — only for signin/signup */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button type="button" onClick={() => { setMode('signin'); reset(); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'signin' ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Sign In
              </button>
              <button type="button" onClick={() => { setMode('signup'); reset(); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'signup' ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Create Account
              </button>
            </div>
          )}

          {/* Forgot password header */}
          {mode === 'forgot' && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-primary-900">Reset Password</h2>
              <p className="text-gray-500 text-sm mt-1">Enter your email and we'll send a reset link.</p>
            </div>
          )}

          {/* Reset password header */}
          {mode === 'reset' && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-primary-900">Set New Password</h2>
              <p className="text-gray-500 text-sm mt-1">Enter your new password below.</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Name — signup only */}
            {mode === 'signup' && (
              <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary-900 transition-colors">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  className="flex-1 outline-none text-gray-800 text-sm bg-transparent" autoComplete="name" />
              </div>
            )}

            {/* Email — all modes except reset */}
            {mode !== 'reset' && (
              <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary-900 transition-colors">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 outline-none text-gray-800 text-sm bg-transparent"
                  required autoComplete="email" />
              </div>
            )}

            {/* Password — signin / signup */}
            {(mode === 'signin' || mode === 'signup') && (
              <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary-900 transition-colors">
                <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Create a password (min 6 chars)' : 'Password'}
                  className="flex-1 outline-none text-gray-800 text-sm bg-transparent"
                  required minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'signin' && (
              <div className="text-right">
                <button type="button" onClick={() => { setMode('forgot'); reset(); }}
                  className="text-xs text-primary-900 hover:underline font-medium">
                  Forgot password?
                </button>
              </div>
            )}

            {/* New password — reset mode */}
            {mode === 'reset' && (
              <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary-900 transition-colors">
                <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type={showNewPassword ? 'text' : 'password'} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="flex-1 outline-none text-gray-800 text-sm bg-transparent"
                  required minLength={6} autoComplete="new-password" />
                <button type="button" onClick={() => setShowNewPassword(v => !v)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                {error}
                {unverifiedEmail && (
                  <button type="button" onClick={handleResendFromLogin} disabled={loading}
                    className="mt-2 block w-full text-center text-xs font-semibold text-red-700 underline hover:text-red-900 disabled:opacity-60">
                    Resend verification email
                  </button>
                )}
              </div>
            )}
            {success && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">{success}</div>}

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                mode === 'signup' ? <><User className="w-4 h-4" /> Create Account</> :
                mode === 'forgot' ? <><Mail className="w-4 h-4" /> Send Reset Link</> :
                mode === 'reset' ? <><Lock className="w-4 h-4" /> Set New Password</> :
                <><ArrowRight className="w-4 h-4" /> Sign In</>}
            </button>
          </form>

          {/* Google login — signin / signup only */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400">or continue with</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <div className="flex justify-center">
                <GoogleLogin onSuccess={handleGoogle} onError={() => setError('Google sign-in failed.')}
                  shape="rectangular" size="large" width="320" />
              </div>
            </>
          )}

          {/* Back link for forgot/reset */}
          {(mode === 'forgot' || mode === 'reset') && (
            <button type="button" onClick={() => { setMode('signin'); reset(); }}
              className="mt-4 text-xs text-gray-400 hover:text-primary-900 w-full text-center">
              ← Back to Sign In
            </button>
          )}

          <p className="text-center text-xs text-gray-400 mt-5">
            New users get <strong>3 free PDF downloads</strong> 🎓
          </p>
        </div>

        <button type="button" onClick={() => navigate('/')}
          className="mt-6 text-center w-full text-blue-300 text-sm hover:text-white transition-colors">
          ← Back to home
        </button>
      </div>
    </div>
  );
}
