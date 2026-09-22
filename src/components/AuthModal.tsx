import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  User, 
  Mail, 
  Lock, 
  Check, 
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  Send,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { 
  signInWithGoogleOAuth, 
  signInWithMagicLink, 
  ADMIN_EMAIL, 
  supabase, 
  mapSupabaseUserToProfile,
  createAdminProfile 
} from '../utils/supabase';
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
  const [tab, setTab] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');

  const [oauthLoading, setOauthLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [providerDisabled, setProviderDisabled] = useState(false);
  const [showProviderGuide, setShowProviderGuide] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    setMessage(t.auth.authenticating);
    setMessageType('info');
    setProviderDisabled(false);

    try {
      const res = await signInWithGoogleOAuth();
      if (res.error) {
        if (res.providerDisabled) {
          setProviderDisabled(true);
          setMessage('Google OAuth provider is not enabled in your Supabase project.');
          setMessageType('error');
        } else {
          setMessage(`OAuth Notice: ${res.error}`);
          setMessageType('error');
        }
      } else {
        setMessage('Redirecting to Google Sign-In...');
        setMessageType('info');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Google OAuth failed';
      const isProviderDisabled = 
        errMsg.toLowerCase().includes('unsupported provider') || 
        errMsg.toLowerCase().includes('provider is not enabled');
      
      if (isProviderDisabled) {
        setProviderDisabled(true);
        setMessage('Google OAuth provider is not enabled in your Supabase project.');
        setMessageType('error');
      } else {
        setMessage(errMsg);
        setMessageType('error');
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setMagicLoading(true);
    setMessage(t.auth.authenticating);
    setMessageType('info');

    try {
      const res = await signInWithMagicLink(email.trim());
      if (res.error) {
        setMessage(`Magic link error: ${res.error}`);
        setMessageType('error');
      } else {
        setMessage(`Magic link sent! Check your inbox at ${email.trim()}`);
        setMessageType('success');
      }
    } catch (err: any) {
      setMessage(err.message || 'Failed to send magic link');
      setMessageType('error');
    } finally {
      setMagicLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setMessage(null);

    if (tab === 'signup') {
      setMessage(t.auth.authenticating);
      setMessageType('info');
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name } },
        });

        if (error) {
          setMessage(`Sign up error: ${error.message}`);
          setMessageType('error');
          return;
        }

        if (data.user) {
          const profile = mapSupabaseUserToProfile(data.user);
          if (profile) {
            onLogin(profile);
            onClose();
          } else {
            setMessage('Account created! Please check your email to verify.');
            setMessageType('success');
          }
        }
      } catch (err: any) {
        setMessage(err.message || 'Failed to sign up');
        setMessageType('error');
      }
    } else {
      setMessage(t.auth.authenticating);
      setMessageType('info');
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setMessage(`Authentication failed: ${error.message}`);
          setMessageType('error');
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
        setMessageType('error');
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#0d1018] dark:bg-[#0d1018] border border-cyan-500/30 shadow-2xl p-5 sm:p-7 space-y-5 transform-gpu gpu-layer animate-in fade-in-50 zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                    currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {currentUser.role} Role
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{currentUser.email}</span>
                </div>
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

        {/* Quick Admin Access Button (Instant 1-Click Access for oterobot@gmail.com) */}
        {(!currentUser.isLoggedIn || currentUser.role !== 'admin') && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-amber-500/15 border border-amber-500/40 shadow-lg space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>เข้าสู่ระบบด่วนในฐานะ Admin</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                ADMIN_ACCESS
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              สำหรับผู้ดูแลระบบ (<strong className="text-amber-300 font-mono">{ADMIN_EMAIL}</strong>) สามารถเข้าสู่ระบบเพื่อจัดการลิงก์ แบนเนอร์ และฐานข้อมูลได้ทันที 100% โดยไม่ต้องรอการยืนยันอีเมล
            </p>
            <button
              type="button"
              onClick={() => {
                const adminProfile = createAdminProfile();
                onLogin(adminProfile);
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-md shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2 touch-target"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>เข้าสู่ระบบเป็น Admin ({ADMIN_EMAIL}) ทันที</span>
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
            <span>{oauthLoading ? t.auth.authenticating : t.auth.signInGoogle}</span>
          </button>

          {/* Provider Disabled Diagnosis & Quick Action Banner */}
          {providerDisabled && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-300 text-xs">
                    Supabase Provider Not Enabled
                  </p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Google OAuth returns <code className="text-amber-300/90 font-mono bg-black/40 px-1 py-0.5 rounded">400 validation_failed</code> because Google provider is currently disabled in your Supabase project. You can still sign in using the <strong className="text-cyan-300">Magic Link</strong> tab below!
                  </p>
                </div>
              </div>

              {/* Guide Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowProviderGuide(!showProviderGuide)}
                  className="text-[11px] text-amber-400/90 hover:text-amber-300 underline flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>{showProviderGuide ? 'Hide Supabase setup steps' : 'How to enable Google Provider in Supabase'}</span>
                </button>

                {showProviderGuide && (
                  <div className="mt-2 p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-1.5 text-[11px] text-slate-300">
                    <p className="font-semibold text-white">To enable Google OAuth in Supabase:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-400 text-[10px]">
                      <li>Open <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-2.5 h-2.5" /></a></li>
                      <li>Go to <strong className="text-slate-200">Authentication</strong> → <strong className="text-slate-200">Providers</strong></li>
                      <li>Click <strong className="text-slate-200">Google</strong>, switch <strong className="text-emerald-400">Enabled</strong> to ON</li>
                      <li>Add your Google Cloud OAuth Client ID & Secret</li>
                      <li>Click Save and reload this page</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {message && !providerDisabled && (
            <div className={`p-2.5 rounded-xl text-[11px] text-center font-mono ${
              messageType === 'error' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                : messageType === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Auth Tabs: Password Sign-in, Sign-up, Magic Link */}
        <div className="space-y-4 pt-2 border-t border-white/5">
          <div className="flex border-b border-white/10 pb-2 gap-4 text-xs font-semibold">
            <button
              onClick={() => { setTab('signin'); setMessage(null); }}
              className={`pb-1 transition-colors touch-target ${tab === 'signin' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t.auth.emailSignIn}
            </button>
            <button
              onClick={() => { setTab('signup'); setMessage(null); }}
              className={`pb-1 transition-colors touch-target ${tab === 'signup' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t.auth.createAccount}
            </button>
            <button
              onClick={() => { setTab('magic'); setMessage(null); }}
              className={`pb-1 transition-colors touch-target ${tab === 'magic' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Magic Link
            </button>
          </div>

          {/* Magic Link Form */}
          {tab === 'magic' ? (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">{t.auth.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="oterobot@gmail.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  We'll email you a password-free sign-in link via Supabase Auth.
                </p>
              </div>

              <button
                type="submit"
                disabled={magicLoading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5 touch-target disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{magicLoading ? 'Sending link...' : 'Send Magic Sign-In Link'}</span>
              </button>
            </form>
          ) : (
            /* Traditional Email / Password Form */
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

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5 touch-target"
              >
                <span>{tab === 'signin' ? t.auth.signInToVault : t.auth.createAccount}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
