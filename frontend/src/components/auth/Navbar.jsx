import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Layers, File, CreditCard, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSubscribed = ['monthly', 'yearly'].includes(profile?.subscription_status) &&
    new Date(profile?.subscription_end) > new Date();

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { path: '/editor', label: 'New Paper', icon: <FileText className="w-4 h-4" /> },
    { path: '/templates', label: 'Templates', icon: <Layers className="w-4 h-4" /> },
    { path: '/pdf-tools', label: 'PDF Tools', icon: <File className="w-4 h-4" /> },
  ];

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  return (
    <nav className="bg-primary-900 text-white h-16 flex items-center px-6 gap-4 fixed top-0 left-0 right-0 z-50 shadow-xl">
      {/* Logo */}
      <button onClick={() => navigate('/')} className="flex items-center gap-2 mr-4">
        <img src="/s2.webp" alt="Deskexam" className="w-8 h-8 rounded-lg object-contain" />
        <span className="font-serif font-bold text-lg hidden sm:block">Deskexam</span>
      </button>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-1 flex-1">
        {navLinks.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              location.pathname.startsWith(link.path)
                ? 'bg-white/20 text-white'
                : 'text-blue-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            {link.icon} {link.label}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {/* Credit/Status badge */}
        {isSubscribed ? (
          <div className="hidden sm:flex items-center gap-1.5 bg-green-500/20 border border-green-400/30 rounded-full px-3 py-1 text-xs font-semibold text-green-300">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            {profile?.subscription_status === 'yearly' ? 'Yearly Pro' : 'Monthly Pro'}
          </div>
        ) : (
          <button
            onClick={() => navigate('/payment')}
            className="hidden sm:flex items-center gap-1.5 bg-gold/20 border border-gold/40 rounded-full px-3 py-1 text-xs font-bold text-gold hover:bg-gold/30 transition-all"
          >
            ⚡ {profile?.credits ?? 0} credits
          </button>
        )}

        {/* Upgrade if not subscribed */}
        {!isSubscribed && (
          <button onClick={() => navigate('/payment')} className="hidden sm:block btn-gold text-xs py-2 px-4">
            Upgrade ₹200
          </button>
        )}

        {/* Avatar */}
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
          {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
        </div>


        {/* Logout */}
        <button onClick={handleLogout} className="text-blue-300 hover:text-white transition-colors" title="Sign out">
          <LogOut className="w-4 h-4" />
        </button>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 bg-primary-900 border-t border-blue-800 md:hidden z-50">
          {navLinks.map(link => (
            <button
              key={link.path}
              onClick={() => { navigate(link.path); setMobileOpen(false); }}
              className="flex items-center gap-3 w-full px-6 py-4 text-blue-200 hover:bg-white/10 hover:text-white transition-all"
            >
              {link.icon} {link.label}
            </button>
          ))}
          <button
            onClick={() => { navigate('/payment'); setMobileOpen(false); }}
            className="flex items-center gap-3 w-full px-6 py-4 text-gold hover:bg-white/10 transition-all border-t border-blue-800"
          >
            <CreditCard className="w-4 h-4" /> Upgrade Plan
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-6 py-4 text-blue-300 hover:bg-white/10 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
