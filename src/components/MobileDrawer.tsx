import React from 'react';
import { 
  X, 
  Compass, 
  Clock, 
  Shield, 
  Plus, 
  User, 
  LogOut, 
  Globe, 
  Moon, 
  Sun, 
  Laptop,
  ExternalLink,
  Check
} from 'lucide-react';
import { UserProfile } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { ADMIN_EMAIL } from '../utils/supabase';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenAddLink: () => void;
  onOpenAdmin: () => void;
  onOpenRecent: () => void;
  recentCount: number;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  onOpenAddLink,
  onOpenAdmin,
  onOpenRecent,
  recentCount,
}) => {
  const { t, language, setLanguage, languages } = useTranslation();
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const isRealAdmin = user.isLoggedIn && user.role === 'admin' && user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-[#0d1018] dark:bg-[#0d1018] border-l border-white/10 shadow-2xl flex flex-col z-10 transform-gpu gpu-layer animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-slate-100 tracking-wider">
                {t.common.appName}
              </h2>
              <p className="text-[10px] text-cyan-400 font-mono">
                {t.nav.brandTagline}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 touch-target"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-white/10 bg-white/[0.02]">
          {user.isLoggedIn ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-cyan-500/40"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{user.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        user.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {user.role}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.email}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors touch-target"
                  title={t.nav.signOut}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {onOpenProfile && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenProfile();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold tracking-wide transition-all shadow-sm"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>โปรไฟล์ของฉัน (ถูกใจ, บุ๊กมาร์ก, คอมเมนต์)</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenAuth();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold tracking-wide transition-all touch-target"
            >
              <User className="w-4 h-4" />
              <span>{t.nav.signIn}</span>
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Action Links */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 mb-1">
              Navigation
            </div>
            
            <button
              onClick={() => {
                onOpenRecent();
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all touch-target"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium">{t.nav.recent}</span>
              </div>
              {recentCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300">
                  {recentCount}
                </span>
              )}
            </button>

            {isRealAdmin && (
              <button
                onClick={() => {
                  onOpenAdmin();
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-all touch-target"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold">{t.nav.admin}</span>
              </button>
            )}

            {isRealAdmin && (
              <button
                onClick={() => {
                  onOpenAddLink();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-300 text-slate-950 font-semibold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] touch-target"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t.nav.addLink}</span>
              </button>
            )}
          </div>

          {/* 🌐 Language Switcher on Mobile */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.nav.language}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all touch-target ${
                    language === lang.code
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </span>
                  {language === lang.code && (
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 🌓 Theme Switcher on Mobile */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2">
              {t.theme.mode}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs transition-all touch-target ${
                  theme === 'dark'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-medium'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px]">{t.theme.dark}</span>
              </button>

              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs transition-all touch-target ${
                  theme === 'light'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-[10px]">{t.theme.light}</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs transition-all touch-target ${
                  theme === 'system'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-medium'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Laptop className="w-4 h-4 text-purple-400" />
                <span className="text-[10px]">{t.theme.system}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-slate-500 font-mono">
            Obsidian Vault • Multi-Device Ready
          </p>
        </div>

      </div>
    </div>
  );
};
