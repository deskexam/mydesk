import { useState } from 'react';
import { Eye, EyeOff, Key, ExternalLink, CheckCircle } from 'lucide-react';
import Navbar from '../components/auth/Navbar';

const GEMINI_KEY = 'gemini_api_key';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(GEMINI_KEY) || '');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isActive, setIsActive] = useState(() => !!localStorage.getItem(GEMINI_KEY));

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_KEY, trimmed);
      setIsActive(true);
    } else {
      localStorage.removeItem(GEMINI_KEY);
      setIsActive(false);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClear = () => {
    localStorage.removeItem(GEMINI_KEY);
    setApiKey('');
    setIsActive(false);
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-2xl mx-auto px-6 py-10">

          <h1 className="font-serif text-3xl font-bold text-primary-900 mb-1">Settings</h1>
          <p className="text-gray-400 text-sm mb-8">Configure AI integrations and preferences</p>

          {/* Gemini API Key Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">🤖</div>
              <div>
                <h2 className="font-semibold text-primary-900">Google Gemini API Key</h2>
                <p className="text-gray-400 text-xs">Enables AI math extraction from PDFs and handwritten photos</p>
              </div>
              {isActive && (
                <span className="ml-auto flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 font-semibold">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              )}
            </div>

            {/* Input */}
            <div className="relative mb-3">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={show ? 'text' : 'password'}
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setSaved(false); }}
                placeholder="AIzaSy..."
                className="w-full border border-gray-200 rounded-xl pl-10 pr-12 py-3 text-sm font-mono focus:outline-none focus:border-primary-900 focus:ring-1 focus:ring-primary-900/20"
              />
              <button
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title={show ? 'Hide key' : 'Show key'}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={handleSave}
                className={`text-sm py-2 px-5 rounded-xl font-semibold transition-all ${
                  saved
                    ? 'bg-green-500 text-white'
                    : 'bg-primary-900 text-white hover:bg-primary-800'
                }`}
              >
                {saved ? '✓ Saved' : 'Save Key'}
              </button>
              {apiKey && (
                <button
                  onClick={handleClear}
                  className="text-sm py-2 px-4 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800">
              <p className="font-semibold mb-2">How to get your free Gemini API key:</p>
              <ol className="list-decimal ml-4 space-y-1.5">
                <li>
                  Go to{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline inline-flex items-center gap-0.5"
                  >
                    aistudio.google.com/apikey <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Sign in with your Google account (free)</li>
                <li>Click <strong>"Create API Key"</strong> and copy it</li>
                <li>Paste it above and click Save</li>
              </ol>
              <div className="mt-3 bg-blue-100 rounded-lg px-3 py-2 font-medium">
                ✅ Free tier: <strong>1,500 requests/day</strong> — more than enough for classroom use!
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              🔒 Your key is stored only in your browser (localStorage). It is never sent to our servers.
            </p>
          </div>

          {/* What it enables */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-primary-900 text-sm mb-3">What Gemini AI unlocks:</h3>
            <div className="space-y-2.5">
              {[
                { icon: '📄', text: 'Extract math questions (√, fractions, Greek letters) from any PDF — even scanned papers' },
                { icon: '📷', text: 'Photo → LaTeX: convert handwritten questions to LaTeX code instantly' },
                { icon: '🔢', text: 'Understands complex notation: ∫, Σ, vectors, matrices, trigonometry' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                  <span className="text-base leading-none mt-0.5">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}