import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, signOut as apiSignOut } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    // FIX: was 'ss_token' — api.js saves under 'token'
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    // FIX: was getProfile() → /api/users/profile (needs separate user route)
    // Now uses getMe() → /api/auth/me which always works with a valid JWT
    const { data, error } = await getMe();
    if (error || !data) {
      localStorage.removeItem('token');
      setUser(null);
      setProfile(null);
    } else {
      const normalized = normalizeUser(data);
      setUser(normalized);
      setProfile(normalized);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshProfile = () => fetchProfile();

  const signOut = () => {
    apiSignOut();
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
  };

  const canDownload = () => {
    if (!profile) return false;
    if (typeof profile.downloads_remaining === 'number') {
      return profile.downloads_remaining > 0;
    }
    if (['monthly', 'yearly'].includes(profile.subscription_status)) {
      return new Date(profile.subscription_end) > new Date();
    }
    return (profile.credits ?? 0) > 0;
  };

  // Pro or Yearly active subscription
  const isPro = () => {
    if (!profile) return false;
    if (['monthly', 'yearly'].includes(profile.subscription_status)) {
      if (profile.subscription_end && new Date(profile.subscription_end) > new Date()) return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signOut, canDownload, isPro }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// ── Normalize backend response → consistent shape for all components ──────────
// Backend (Python) returns snake_case. We keep BOTH so legacy code still works.
function normalizeUser(u) {
  if (!u) return null;
  return {
    ...u,
    // IDs
    id: u.id || u._id,
    // Names
    fullName: u.full_name || u.name || '',
    full_name: u.full_name || u.name || '',
    // Email verification — AuthPage checks emailVerified (camelCase)
    emailVerified: u.email_verified ?? false,
    email_verified: u.email_verified ?? false,
    // Google
    googleId: u.google_id ?? null,
    google_id: u.google_id ?? null,
    // Logo
    custom_logo_url: u.custom_logo_url ?? null,
    // Credits & subscription
    credits: u.credits ?? 3,
    subscription_status: u.subscription_status ?? 'free',
    subscriptionStatus: u.subscription_status ?? 'free',
    subscription_end: u.subscription_end ?? null,
    subscriptionEnd: u.subscription_end ?? null,
    // Stats
    total_papers_created: u.total_papers_created ?? 0,
    totalPapersCreated: u.total_papers_created ?? 0,
  };
}