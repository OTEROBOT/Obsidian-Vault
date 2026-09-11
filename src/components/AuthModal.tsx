import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  User, 
  Mail, 
  Lock, 
  Check, 
  AlertCircle, 
  LogIn, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = () => {
    onLogin({
      id: 'usr-google-999',
      name: 'Cyber Voyager',
      email: 'voyager@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      role: 'user',
      isLoggedIn: true,
    });
    onClose();
  };

  const handleAdminQuickLogin = () => {
    onLogin({
      id: 'usr-admin-001',
      name: 'Void Architect',
      email: 'admin@obsidianvault.io',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      role: 'admin',
      isLoggedIn: true,
    });
    onClose();
  };

  const handleGuestMode = () => {
    onLogin({
      id: 'usr-guest',
      name: 'Guest Explorer',
      email: 'guest@obsidian.local',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
      role: 'guest',
      isLoggedIn: false,
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (tab === 'signup') {
      setMessage('Verification link dispatched to your email! (Simulated OAuth)');
      setTimeout(() => {
        onLogin({
          id: `usr-${Date.now()}`,
          name: name || email.split('@')[0],
          email,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
          role: 'user',
          isLoggedIn: true,
        });
        onClose();
      }, 1000);
    } else {
      // Check if logging in with admin email
      const isAdmin = email.toLowerCase().includes('admin');
      onLogin({
        id: `usr-${Date.now()}`,
        name: email.split('@')[0],
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        role: isAdmin ? 'admin' : 'user',
        isLoggedIn: true,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="relative w-full max-w-md rounded-3xl glass-panel border border-cyan-500/30 shadow-2xl p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-display">
                VAULT IDENTITY
              </h3>
              <p className="text-[11px] text-slate-400">
                Access privileges & comment verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Status Banner */}
        {currentUser.isLoggedIn && (
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt=""
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-cyan-500/40"
              />
              <div>
                <p className="text-xs font-bold text-slate-200">{currentUser.name}</p>
                <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded ${
                  currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                }`}>
                  {currentUser.role} Role
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20"
            >
              Log Out
            </button>
          </div>
        )}

        {/* Fast Switch Quick Actions for Developer & User Testing */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
            Quick Role Switcher (Simulation)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAdminQuickLogin}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all text-center"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Login as Admin</span>
            </button>
            <button
              type="button"
              onClick={handleGuestMode}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all text-center"
            >
              <User className="w-3.5 h-3.5" />
              <span>Guest / Public</span>
            </button>
          </div>
        </div>

        {/* Google OAuth Provider Button */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-md"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google Account</span>
          </button>
        </div>

        {/* Traditional Email / Password Form */}
        <div className="space-y-4 pt-2 border-t border-white/5">
          <div className="flex border-b border-white/10 pb-2 gap-4 text-xs font-semibold">
            <button
              onClick={() => setTab('signin')}
              className={`pb-1 transition-colors ${tab === 'signin' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
            >
              Email Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`pb-1 transition-colors ${tab === 'signup' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Full Name / Handle</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="NeonBlade"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
                  required
                />
              </div>
            </div>

            {message && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {message}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{tab === 'signin' ? 'Sign In to Vault' : 'Sign Up & Verify'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
