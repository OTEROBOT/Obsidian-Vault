import React from 'react';
import { 
  Home, 
  Search, 
  Clock, 
  Plus, 
  Shield, 
  Menu,
  Globe
} from 'lucide-react';
import { UserProfile } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { ADMIN_EMAIL } from '../utils/supabase';

interface BottomNavBarProps {
  user: UserProfile;
  onOpenMobileMenu: () => void;
  onOpenRecent: () => void;
  onOpenAddLink: () => void;
  onOpenAdmin: () => void;
  onScrollToTop: () => void;
  onFocusSearch: () => void;
  recentCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  user,
  onOpenMobileMenu,
  onOpenRecent,
  onOpenAddLink,
  onOpenAdmin,
  onScrollToTop,
  onFocusSearch,
  recentCount,
}) => {
  const { t } = useTranslation();
  const isRealAdmin = user.isLoggedIn && user.role === 'admin' && user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090a0f]/90 dark:bg-[#090a0f]/90 border-t border-white/10 backdrop-blur-2xl safe-bottom"
    >
      <div className="grid grid-cols-5 h-14 max-w-md mx-auto items-center px-1">
        
        {/* Home / Top */}
        <button
          onClick={onScrollToTop}
          className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-cyan-300 transition-colors touch-target"
          aria-label={t.bottomNav.home}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">{t.bottomNav.home}</span>
        </button>

        {/* Quick Search */}
        <button
          onClick={onFocusSearch}
          className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-cyan-300 transition-colors touch-target"
          aria-label={t.bottomNav.search}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">{t.bottomNav.search}</span>
        </button>

        {/* Action Button: Add Link (if admin) or Direct Recent */}
        {isRealAdmin ? (
          <button
            onClick={onOpenAddLink}
            className="relative -top-3 flex flex-col items-center justify-center mx-auto w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-300 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] border-2 border-[#090a0f] active:scale-95 transition-transform touch-target"
            aria-label={t.bottomNav.add}
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        ) : (
          <button
            onClick={onOpenRecent}
            className="relative flex flex-col items-center justify-center h-full text-slate-400 hover:text-cyan-300 transition-colors touch-target"
            aria-label={t.bottomNav.recent}
          >
            <Clock className="w-5 h-5" />
            {recentCount > 0 && (
              <span className="absolute top-1.5 right-4 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                {recentCount}
              </span>
            )}
            <span className="text-[10px] mt-0.5 font-medium">{t.bottomNav.recent}</span>
          </button>
        )}

        {/* Admin or Recent */}
        {isRealAdmin ? (
          <button
            onClick={onOpenAdmin}
            className="flex flex-col items-center justify-center h-full text-amber-400 hover:text-amber-300 transition-colors touch-target"
            aria-label={t.bottomNav.admin}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">{t.bottomNav.admin}</span>
          </button>
        ) : (
          <button
            onClick={onOpenMobileMenu}
            className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-cyan-300 transition-colors touch-target"
            aria-label={t.nav.language}
          >
            <Globe className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">{t.nav.language}</span>
          </button>
        )}

        {/* Menu (Theme, Language, Account) */}
        <button
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-white transition-colors touch-target"
          aria-label={t.bottomNav.menu}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">{t.bottomNav.menu}</span>
        </button>

      </div>
    </nav>
  );
};
