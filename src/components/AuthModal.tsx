import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  User, 
  Mail, 
  Lock, 
  Check, 
  ArrowRight
} from 'lucide-react';
import { UserProfile } from '../types';
import { signInWithGoogleOAuth, ADMIN_EMAIL, supabase, mapSupabaseUserToProfile } from '../utils/supabase';
import { useTranslation } from '../context/LanguageContext';

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
  const { t } = useTranslation();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const [oauthLoading, setOauthLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    setMessage(t.auth.authenticating);
    try {
      const { error } = await signInWithGoogleOAuth();
      if (error) {
        console.warn('Google OAuth error:', error);
        setMessage(`OAuth Notice: ${typeof error === 'string' ? error : (error as any)?.message || 'Check Google Client ID in Supabase Auth'}`);
      }
    } catch (err: any) {
      console.warn('OAuth trigger exception:', err);
      setMessage('Failed to initiate Google OAuth. Please check Supabase configuration.');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setMessage(null);

    if (tab === 'signup') {
      setMessage(t.auth.authenticating);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name } },
        });

        if (error) {
          setMessage(`Sign up error: ${error.message}`);
          return;
        }

        if (data.user) {
          const profile = mapSupabaseUserToProfile(data.user);
          if (profile) {
            onLogin(profile);
            onClose();
          } else {
            setMessage('Account created! Please check your email to verify.');
          }
        }
      } catch (err: any) {
        setMessage(err.message || 'Failed to sign up');
      }
    } else {
      setMessage(t.auth.authenticating);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setMessage(`Authentication failed: ${error.message}`);
          return;
        }

        if (data.user) {
          const profile = mapSupabaseUserToProfile(data.user);
          if (profile) {
            onLogin(profile);
            onClose();
          }
        }
      } catch (err: any) {
        setMessage(err.message || 'Failed to sign in');
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#0d1018] dark:bg-[#0d1018] border border-cyan-500/30 shadow-2xl p-5 sm:p-8 space-y-5 sm:space-y-6 transform-gpu gpu-layer animate-in fade-in-50 zoom-in-95 duration-150"
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
                {t.auth.title}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t.auth.desc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-target"
            aria-label={t.common.close}
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
              className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 touch-target"
            >
              {t.nav.signOut}
            </button>
          </div>
        )}

        {/* Google OAuth Provider Button */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-md disabled:opacity-50 active:scale-[0.99] touch-target"
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
            <span>{t.auth.signInGoogle}</span>
          </button>
          
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 font-mono">
            <span>{t.auth.adminAccount}:</span>
            <span className="text-amber-400/90 font-semibold">{ADMIN_EMAIL}</span>
          </div>

          {message && (
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 text-center font-mono">
              {message}
            </div>
          )}
        </div>

        {/* Traditional Email / Password Form */}
        <div className="space-y-4 pt-2 border-t border-white/5">
          <div className="flex border-b border-white/10 pb-2 gap-4 text-xs font-semibold">
            <button
              onClick={() => setTab('signin')}
              className={`pb-1 transition-colors touch-target ${tab === 'signin' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
            >
              {t.auth.emailSignIn}
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`pb-1 transition-colors touch-target ${tab === 'signup' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
            >
              {t.auth.createAccount}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">{t.auth.name}</label>
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
              <label className="text-[11px] text-slate-400">{t.auth.email}</label>
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
              <label className="text-[11px] text-slate-400">{t.auth.password}</label>
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
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5 touch-target"
            >
              <span>{tab === 'signin' ? t.auth.signInToVault : t.auth.createAccount}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
