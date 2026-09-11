import React from 'react';
import { 
  Compass, 
  Search, 
  Clock, 
  Plus, 
  Shield, 
  User, 
  SlidersHorizontal,
  Sparkles,
  LogOut,
  FolderOpen
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAddLink: () => void;
  onOpenAdmin: () => void;
  onOpenRecent: () => void;
  recentCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  vaultName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onOpenAddLink,
  onOpenAdmin,
  onOpenRecent,
  recentCount,
  searchQuery,
  onSearchChange,
  vaultName,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090a0f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={() => onSearchChange('')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-slate-900 to-purple-600/20 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] group-hover:border-cyan-400/60 transition-all duration-300">
            <Compass className="w-5 h-5 text-cyan-400 group-hover:rotate-45 transition-transform duration-500" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg tracking-wider text-slate-100 group-hover:text-cyan-300 transition-colors">
                {vaultName || 'OBSIDIAN VAULT'}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Cyber-Dark Media & Link Nexus
            </p>
          </div>
        </div>

        {/* Global Fast Search Bar */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Fuzzy search titles, tags, domains, descriptions..."
              className="w-full pl-10 pr-20 py-2 rounded-xl text-sm glass-input text-slate-100 placeholder-slate-500 focus:text-white"
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
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/5 border border-white/10 text-slate-400">
                  Ctrl K
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Navigation & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Recently Viewed Trigger */}
          <button
            onClick={onOpenRecent}
            title="Recently Viewed Links"
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">Recent</span>
            {recentCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {recentCount}
              </span>
            )}
          </button>

          {/* Admin Dashboard Trigger */}
          {user.role === 'admin' ? (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          ) : (
            <button
              onClick={onOpenAdmin}
              title="Architecture & Schema Reference"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/10 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Schema & Docs</span>
            </button>
          )}

          {/* Add Link Button (Admin or privileged) */}
          {user.role === 'admin' && (
            <button
              onClick={onOpenAddLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Link</span>
            </button>
          )}

          {/* User Profile / Auth Toggle */}
          {user.isLoggedIn ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-cyan-500/40"
              />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-slate-200 truncate max-w-[100px]">
                  {user.name}
                </p>
                <span className={`text-[10px] uppercase font-mono px-1 py-0.2 rounded ${
                  user.role === 'admin' ? 'text-amber-400 bg-amber-500/10' : 'text-cyan-400 bg-cyan-500/10'
                }`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={onOpenAuth}
                title="Switch Account / Role"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <User className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
