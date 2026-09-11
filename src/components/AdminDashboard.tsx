import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  Layers, 
  FolderPlus, 
  Tag as TagIcon, 
  MessageSquare, 
  Settings, 
  Database, 
  Code, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  Pin, 
  Plus, 
  Eye, 
  Heart, 
  FileText, 
  Download, 
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Category, Comment, MediaItem, SystemConfig, Tag } from '../types';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  categories: Category[];
  tags: Tag[];
  comments: Comment[];
  config: SystemConfig;
  onSaveConfig: (cfg: SystemConfig) => void;
  onAddNewLink: () => void;
  onEditLink: (item: MediaItem) => void;
  onDeleteLink: (itemId: string) => void;
  onTogglePin: (itemId: string) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddTag: (tag: Omit<Tag, 'id'>) => void;
  onDeleteTag: (tagId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onResetSampleData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  items,
  categories,
  tags,
  comments,
  config,
  onSaveConfig,
  onAddNewLink,
  onEditLink,
  onDeleteLink,
  onTogglePin,
  onAddCategory,
  onDeleteCategory,
  onAddTag,
  onDeleteTag,
  onDeleteComment,
  onResetSampleData,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'taxonomies' | 'comments' | 'config' | 'schema'>('overview');
  const [copiedSql, setCopiedSql] = useState(false);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatColor, setNewCatColor] = useState('#22d3ee');
  const [newCatIcon, setNewCatIcon] = useState('Compass');

  // New Tag State
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#38bdf8');

  // Config editing state
  const [vaultNameInput, setVaultNameInput] = useState(config.vaultName);
  const [vaultTaglineInput, setVaultTaglineInput] = useState(config.vaultTagline);
  const [allowGuestComments, setAllowGuestComments] = useState(config.allowGuestComments);

  if (!isOpen) return null;

  // Compute metrics
  const totalViews = items.reduce((acc, i) => acc + (i.viewsCount || 0), 0);
  const totalLikes = items.reduce((acc, i) => acc + (i.likesCount || 0), 0);
  const videoCount = items.filter((i) => i.mediaType === 'video').length;
  const audioCount = items.filter((i) => i.mediaType === 'audio').length;
  const imageCount = items.filter((i) => i.mediaType === 'image').length;
  const webCount = items.filter((i) => i.mediaType === 'web').length;

  const handleSaveConfigForm = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...config,
      vaultName: vaultNameInput.trim() || 'Obsidian Vault',
      vaultTagline: vaultTaglineInput.trim(),
      allowGuestComments,
    });
    alert('System configuration updated successfully!');
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory({
      name: newCatName.trim(),
      slug: newCatSlug.trim() || newCatName.toLowerCase().replace(/\s+/g, '-'),
      color: newCatColor,
      icon: newCatIcon,
    });
    setNewCatName('');
    setNewCatSlug('');
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    onAddTag({
      name: newTagName.trim().replace(/^#/, ''),
      color: newTagColor,
    });
    setNewTagName('');
  };

  const exportBackupJson = () => {
    const backup = {
      vaultName: config.vaultName,
      exportedAt: new Date().toISOString(),
      items,
      categories,
      tags,
      comments,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obsidian-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  // Complete PostgreSQL Schema & RLS Policies SQL Script
  const POSTGRES_SCHEMA_SQL = `-- =========================================================================
-- OBSIDIAN VAULT (VOIDMARK) - PRODUCTION POSTGRESQL & SUPABASE SCHEMA
-- Features: Row Level Security (RLS), Role RBAC (Single Admin vs Guests),
-- Full-Text GIN Index Search, and Automated Trigger Updaters
-- =========================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For ultra-fast fuzzy proximity search

-- 2. User Profiles Table (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'Compass',
  color TEXT DEFAULT '#38bdf8',
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Custom Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#22d3ee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Media & Links Table
CREATE TABLE IF NOT EXISTS public.links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('web', 'image', 'video', 'audio')),
  thumbnail_url TEXT,
  media_url TEXT, -- Direct storage or stream URL for uploaded media
  embed_type TEXT DEFAULT 'none' CHECK (embed_type IN ('none', 'youtube', 'vimeo', 'html5_video', 'audio', 'image', 'iframe')),
  embed_id TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  site_name TEXT,
  favicon TEXT,
  views_count BIGINT DEFAULT 0,
  likes_count BIGINT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'url' CHECK (source IN ('url', 'upload')),
  file_name TEXT,
  file_size TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Generated Full-Text Search column with English dictionary
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(site_name, '')), 'C')
  ) STORED
);

-- 6. Link Tags Association Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.link_tags (
  link_id UUID REFERENCES public.links(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (link_id, tag_id)
);

-- 7. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  author_email TEXT,
  is_google_user BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Indexes for Ultra-Fast Queries
CREATE INDEX IF NOT EXISTS idx_links_search ON public.links USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_links_category ON public.links (category_id);
CREATE INDEX IF NOT EXISTS idx_links_media_type ON public.links (media_type);
CREATE INDEX IF NOT EXISTS idx_links_pinned_created ON public.links (is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_link ON public.comments (link_id, created_at DESC);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Links Policies (Public Read, Admin Full Write)
CREATE POLICY "Anyone can view public links" 
  ON public.links FOR SELECT USING (true);

CREATE POLICY "Only admins can insert links" 
  ON public.links FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update links" 
  ON public.links FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete links" 
  ON public.links FOR DELETE USING (public.is_admin());

-- 3. Categories & Tags Policies
CREATE POLICY "Categories are readable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Only admins can modify categories" ON public.categories FOR ALL USING (public.is_admin());

CREATE POLICY "Tags are readable by everyone" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Only admins can modify tags" ON public.tags FOR ALL USING (public.is_admin());

-- 4. Comments Policies (Public / Authenticated can insert; Admins can delete)
CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Anyone or authenticated can add comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins or authors can delete comments" ON public.comments FOR DELETE 
  USING (public.is_admin() OR auth.uid() = author_id);
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(POSTGRES_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <div 
        className="relative w-full max-w-5xl rounded-3xl glass-panel border border-amber-500/30 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Dashboard Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#090a0f]/95">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-display tracking-wide flex items-center gap-2">
                <span>ADMIN COMMAND NEXUS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  SINGLE ADMIN CONTROL
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                CRUD management, system configurations, and Supabase / Next.js architecture
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-black/40 px-6 gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Metrics', icon: <Layers className="w-4 h-4" /> },
            { id: 'links', label: 'Manage Links', icon: <FileText className="w-4 h-4" /> },
            { id: 'taxonomies', label: 'Categories & Tags', icon: <FolderPlus className="w-4 h-4" /> },
            { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-4 h-4" /> },
            { id: 'config', label: 'System Config', icon: <Settings className="w-4 h-4" /> },
            { id: 'schema', label: 'PostgreSQL DDL & Next.js', icon: <Database className="w-4 h-4 text-cyan-400" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: OVERVIEW METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl glass-panel-subtle p-4 border border-white/10 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Total Links</span>
                  <p className="text-2xl font-bold font-mono text-cyan-400">{items.length}</p>
                </div>
                <div className="rounded-2xl glass-panel-subtle p-4 border border-white/10 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Total Views</span>
                  <p className="text-2xl font-bold font-mono text-emerald-400">{totalViews.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl glass-panel-subtle p-4 border border-white/10 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Total Likes</span>
                  <p className="text-2xl font-bold font-mono text-rose-400">{totalLikes.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl glass-panel-subtle p-4 border border-white/10 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Comments</span>
                  <p className="text-2xl font-bold font-mono text-purple-400">{comments.length}</p>
                </div>
              </div>

              {/* Media Distribution Breakdown */}
              <div className="rounded-2xl glass-panel-subtle p-6 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Vault Media Type Distribution
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-rose-500/20">
                    <span className="text-xs text-rose-400 font-semibold">Videos (YT & MP4)</span>
                    <p className="text-lg font-bold text-slate-200 mt-1">{videoCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-purple-500/20">
                    <span className="text-xs text-purple-400 font-semibold">Audio Streams</span>
                    <p className="text-lg font-bold text-slate-200 mt-1">{audioCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-amber-500/20">
                    <span className="text-xs text-amber-400 font-semibold">Visual Images</span>
                    <p className="text-lg font-bold text-slate-200 mt-1">{imageCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-emerald-500/20">
                    <span className="text-xs text-emerald-400 font-semibold">Web Articles</span>
                    <p className="text-lg font-bold text-slate-200 mt-1">{webCount}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onAddNewLink();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Link / Upload Media</span>
                </button>
                <button
                  onClick={exportBackupJson}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10 transition-all"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Export Vault JSON Backup</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE LINKS & POSTS (CRUD) */}
          {activeTab === 'links' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">
                  All Vault Entries ({items.length})
                </h3>
                <button
                  onClick={() => {
                    onClose();
                    onAddNewLink();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Link</span>
                </button>
              </div>

              <div className="rounded-2xl glass-panel-subtle border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-black/60 border-b border-white/10 text-[11px] font-mono text-slate-400 uppercase">
                      <tr>
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Views/Likes</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {items.map((item) => {
                        const cat = categories.find((c) => c.id === item.categoryId);
                        return (
                          <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.thumbnailUrl}
                                  alt=""
                                  className="w-10 h-8 rounded-lg object-cover bg-black shrink-0"
                                />
                                <div className="min-w-0 max-w-xs">
                                  <p className="font-semibold text-slate-200 truncate">{item.title}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{item.url}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono uppercase text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300">
                                {item.mediaType}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[11px] text-slate-300">
                                {cat?.name || 'General'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                              {item.viewsCount} / {item.likesCount}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => onTogglePin(item.id)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    item.isPinned ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-amber-300'
                                  }`}
                                  title="Toggle Pin"
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    onClose();
                                    onEditLink(item);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete "${item.title}"?`)) {
                                      onDeleteLink(item.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES & TAGS (CRUD) */}
          {activeTab === 'taxonomies' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Category CRUD */}
              <div className="rounded-2xl glass-panel-subtle p-5 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-cyan-400" />
                  <span>Category Management</span>
                </h3>

                {/* Add Category Form */}
                <form onSubmit={handleCreateCategory} className="space-y-3 p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Category Name"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs glass-input text-slate-100 placeholder-slate-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Slug (optional)"
                      value={newCatSlug}
                      onChange={(e) => setNewCatSlug(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs glass-input text-slate-100 placeholder-slate-500"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Color:</span>
                      <input
                        type="color"
                        value={newCatColor}
                        onChange={(e) => setNewCatColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    >
                      Add Category
                    </button>
                  </div>
                </form>

                {/* Category List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs font-medium text-slate-200">{cat.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">/{cat.slug}</span>
                      </div>
                      {cat.id !== 'cat-all' && (
                        <button
                          onClick={() => onDeleteCategory(cat.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Delete category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags CRUD */}
              <div className="rounded-2xl glass-panel-subtle p-5 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-cyan-400" />
                  <span>Tags Management</span>
                </h3>

                {/* Add Tag Form */}
                <form onSubmit={handleCreateTag} className="flex gap-2 p-3 rounded-xl bg-black/40 border border-white/5">
                  <input
                    type="text"
                    placeholder="New Tag Name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs glass-input text-slate-100 placeholder-slate-500"
                    required
                  />
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 self-center"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  >
                    Add Tag
                  </button>
                </form>

                {/* Tags Grid */}
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                  {tags.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-white/[0.04] border border-white/10 text-slate-300"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                      <span>#{t.name}</span>
                      <button
                        onClick={() => onDeleteTag(t.id)}
                        className="text-slate-500 hover:text-rose-400 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: COMMENT MODERATION */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">
                All Comments Across Vault ({comments.length})
              </h3>
              <div className="rounded-2xl glass-panel-subtle border border-white/10 divide-y divide-white/5 overflow-hidden">
                {comments.length === 0 ? (
                  <p className="p-8 text-center text-xs text-slate-500">No comments found.</p>
                ) : (
                  comments.map((cmt) => {
                    const relatedItem = items.find((i) => i.id === cmt.itemId);
                    return (
                      <div key={cmt.id} className="p-4 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-200">{cmt.authorName}</span>
                            {cmt.isAdmin && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                                Admin
                              </span>
                            )}
                            {cmt.isGoogleUser && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                                Google User
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500">
                              on <span className="text-cyan-300">{relatedItem?.title || 'Unknown Item'}</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">{cmt.content}</p>
                        </div>
                        <button
                          onClick={() => onDeleteComment(cmt.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Comment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM CONFIG */}
          {activeTab === 'config' && (
            <div className="max-w-xl space-y-6">
              <form onSubmit={handleSaveConfigForm} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Vault Title</label>
                  <input
                    type="text"
                    value={vaultNameInput}
                    onChange={(e) => setVaultNameInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Tagline / Mission</label>
                  <input
                    type="text"
                    value={vaultTaglineInput}
                    onChange={(e) => setVaultTaglineInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={allowGuestComments}
                      onChange={(e) => setAllowGuestComments(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-white/20 text-cyan-500"
                    />
                    <span>Allow Guest Nickname Comments (No OAuth required)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md transition-all"
                >
                  Save Configuration
                </button>
              </form>

              {/* Data Reset */}
              <div className="pt-6 border-t border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono">
                  Danger Zone
                </h4>
                <p className="text-xs text-slate-400">
                  Reset your local vault back to initial cyber aesthetic demo entries.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Reset all vault entries, categories, and comments to default?')) {
                      onResetSampleData();
                      alert('Data restored to initial seeds!');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restore Sample Seeds</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: POSTGRESQL DDL & NEXT.JS APP ROUTER ARCHITECTURE */}
          {activeTab === 'schema' && (
            <div className="space-y-6">
              
              {/* Architecture Overview */}
              <div className="rounded-2xl glass-panel-subtle p-5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Code className="w-5 h-5" />
                    <h3 className="text-sm font-bold text-slate-100 font-mono">
                      Production Next.js (App Router) + Supabase Tech Stack
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    PostgreSQL 16 + RLS
                  </span>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed font-mono bg-black/60 p-4 rounded-xl border border-white/5 space-y-1">
                  <p className="text-cyan-400 font-bold">// Recommended Next.js App Router Structure:</p>
                  <p>app/</p>
                  <p>├── api/scrape-og/route.ts &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// OpenGraph Metadata Web Scraper</p>
                  <p>├── api/auth/callback/route.ts &nbsp;&nbsp;&nbsp;&nbsp;// Supabase / NextAuth OAuth Handlers</p>
                  <p>├── dashboard/page.tsx &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// Protected Single-Admin Dashboard</p>
                  <p>├── vault/[id]/page.tsx &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// Dedicated SEO Link & Media Landing</p>
                  <p>├── layout.tsx &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// Root Cyber Glass Layout & Theme Provider</p>
                  <p>└── page.tsx &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// Ultra-Fast Main Vault Explorer</p>
                </div>
              </div>

              {/* PostgreSQL DDL SQL Schema */}
              <div className="rounded-2xl glass-panel-subtle border border-white/10 overflow-hidden">
                <div className="px-5 py-3 bg-black/80 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-slate-200">
                      supabase-schema.sql (Fully Defined DDL + RLS Policies)
                    </span>
                  </div>
                  <button
                    onClick={copySqlToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
                  </button>
                </div>

                <pre className="p-4 text-[11px] font-mono text-slate-300 bg-[#07090e] overflow-x-auto max-h-96 leading-relaxed">
                  <code>{POSTGRES_SCHEMA_SQL}</code>
                </pre>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
