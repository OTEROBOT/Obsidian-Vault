import React, { useState, useRef, useEffect } from 'react';
import { 
  Compass, 
  Search, 
  Clock, 
  Plus, 
  Shield, 
  User, 
  Globe,
  Sun,
  Moon,
  Laptop,
  Check,
  Menu,
  X,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { UserProfile } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { ADMIN_EMAIL } from '../utils/supabase';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  user: UserProfile;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenAddLink: () => void;
  onOpenAdmin: () => void;
  onOpenRecent: () => void;
  recentCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  vaultName: string;
  logoUrl?: string;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  onOpenAddLink,
  onOpenAdmin,
  onOpenRecent,
  recentCount,
  searchQuery,
  onSearchChange,
  vaultName,
  logoUrl,
  onOpenMobileMenu,
}) => {
  const { t, language, setLanguage, languages } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isRealAdmin = user.isLoggedIn && user.role === 'admin' && user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090a0f]/85 dark:bg-[#090a0f]/85 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl 2xl:max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand Logo */}
        <div 
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group min-w-0" 
          onClick={() => onSearchChange('')}
          title={t.common.appName}
        >
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-slate-900 to-purple-600/20 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] group-hover:border-cyan-400/60 transition-all duration-300 overflow-hidden shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={vaultName || 'Logo'}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <>
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 group-hover:rotate-45 transition-transform duration-500" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              </>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display font-bold text-sm sm:text-lg tracking-wider text-slate-100 group-hover:text-cyan-300 transition-colors truncate max-w-[125px] xs:max-w-[170px] sm:max-w-none">
                {vaultName || t.common.appName}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hidden md:inline-block">
                v2.5
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block truncate max-w-[200px] lg:max-w-none">
              {t.nav.brandTagline}
            </p>
          </div>
        </div>

        {/* Global Fast Search Bar (Desktop / Tablet) */}
        <div className="hidden md:flex flex-1 min-w-[140px] max-w-md lg:max-w-xl 2xl:max-w-2xl mx-2 sm:mx-3 lg:mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.nav.searchPlaceholder}
              className="w-full pl-10 pr-16 lg:pr-20 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm glass-input text-slate-100 placeholder-slate-500 focus:text-white"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  onClick={() => onSearchChange('')}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-white"
                >
                  ESC
                </button>
              ) : (
                <span className="hidden xl:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-white/5 border border-white/10 text-slate-400">
                  {t.nav.searchKbd}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Navigation & Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2.5 shrink-0">
          
          {/* Mobile Search Button (shows/hides quick input on small screens) */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
            aria-label={t.common.search}
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* 🌐 Language Switcher Dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => {
                setIsLangOpen(!isLangOpen);
                setIsThemeOpen(false);
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 lg:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-all active:scale-95"
              aria-label={t.nav.language}
              title={t.nav.language}
            >
              <span className="text-sm sm:text-base leading-none">{currentLangObj.flag}</span>
              <span className="hidden sm:inline font-mono uppercase font-semibold">{currentLangObj.code}</span>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Language Menu */}
            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-48 py-1.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 border border-white/15 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
                  {t.nav.language} / Select Language
                </div>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsLangOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                      language === lang.code
                        ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-base">{lang.flag}</span>
                      <span>{lang.nativeName}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">({lang.name})</span>
                    </span>
                    {language === lang.code && (
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 🌓 Theme Mode Toggle (Dark / Light / System) */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => {
                setIsThemeOpen(!isThemeOpen);
                setIsLangOpen(false);
              }}
              className="flex items-center justify-center p-2 sm:px-2.5 sm:py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-all active:scale-95"
              aria-label={t.theme.mode}
              title={t.theme.mode}
            >
              {theme === 'dark' && <Moon className="w-4 h-4 text-cyan-400" />}
              {theme === 'light' && <Sun className="w-4 h-4 text-amber-400" />}
              {theme === 'system' && <Laptop className="w-4 h-4 text-purple-400" />}
            </button>

            {/* Theme Dropdown */}
            {isThemeOpen && (
              <div className="absolute right-0 mt-2 w-44 py-1.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 border border-white/15 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
                  {t.theme.mode}
                </div>
                <button
                  onClick={() => {
                    setTheme('dark');
                    setIsThemeOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                    theme === 'dark'
                      ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.theme.dark}</span>
                  </span>
                  {theme === 'dark' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>

                <button
                  onClick={() => {
                    setTheme('light');
                    setIsThemeOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                    theme === 'light'
                      ? 'bg-amber-500/15 text-amber-300 font-semibold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.theme.light}</span>
                  </span>
                  {theme === 'light' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>

                <button
                  onClick={() => {
                    setTheme('system');
                    setIsThemeOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                    theme === 'system'
                      ? 'bg-purple-500/15 text-purple-300 font-semibold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Laptop className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t.theme.system}</span>
                  </span>
                  {theme === 'system' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Recently Viewed Trigger */}
          <button
            onClick={onOpenRecent}
            title={t.nav.recent}
            className="hidden sm:flex relative items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="hidden lg:inline">{t.nav.recent}</span>
            {recentCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {recentCount}
              </span>
            )}
          </button>

          {/* Admin Dashboard Trigger - ONLY for authenticated oterobot@gmail.com */}
          {isRealAdmin && (
            <button
              onClick={onOpenAdmin}
              title={t.nav.admin}
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline">{t.nav.admin}</span>
            </button>
          )}

          {/* Add Link Button (Admin only) */}
          {isRealAdmin && (
            <button
              onClick={onOpenAddLink}
              title={t.nav.addLink}
              className="hidden sm:flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden lg:inline">{t.nav.addLink}</span>
            </button>
          )}

          {/* PWA Install Button (Chromium, Android & iOS Safari) */}
          <PWAInstallButton compact={true} className="hidden sm:flex" />

          {/* User Profile / Auth Toggle */}
          {user.isLoggedIn ? (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-white/10">
              <button
                onClick={onOpenProfile || onOpenAuth}
                className="flex items-center gap-2 text-left group hover:opacity-90 transition-opacity"
                title="ดูโปรไฟล์และประวัติการกดถูกใจ/บุ๊กมาร์ก/คอมเมนต์"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover ring-1 ring-cyan-500/40 group-hover:ring-cyan-400 transition-all"
                />
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 transition-colors truncate max-w-[100px]">
                    {user.name}
                  </p>
                  <span className={`text-[10px] uppercase font-mono px-1 py-0.2 rounded ${
                    user.role === 'admin' ? 'text-amber-400 bg-amber-500/10' : 'text-cyan-400 bg-cyan-500/10'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenProfile || onOpenAuth}
                title="โปรไฟล์และประวัติของฉัน"
                className="hidden sm:block p-1.5 text-cyan-400 hover:text-cyan-200 rounded-lg hover:bg-cyan-500/15 border border-cyan-500/25 transition-colors"
              >
                <User className="w-4 h-4" />
              </button>

              {/* Direct Logout Button in Navbar */}
              <button
                type="button"
                onClick={onLogout}
                title={t.nav.signOut || 'ออกจากระบบ'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all active:scale-95 touch-target shadow-sm"
                aria-label={t.nav.signOut || 'ออกจากระบบ'}
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden md:inline">{t.nav.signOut || 'ออกจากระบบ'}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{t.nav.signIn}</span>
            </button>
          )}

          {/* Mobile Drawer Hamburger (on smartphones/tablets) */}
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="sm:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-all touch-target"
              aria-label={t.nav.menu}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

        </div>
      </div>

      {/* Mobile Search Dropdown Bar */}
      {isMobileSearchOpen && (
        <div className="md:hidden px-4 py-2.5 border-t border-white/10 bg-[#090a0f] animate-in fade-in slide-in-from-top-1">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.nav.searchPlaceholder}
              autoFocus
              className="w-full pl-9 pr-16 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
              >
                {t.common.reset}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
