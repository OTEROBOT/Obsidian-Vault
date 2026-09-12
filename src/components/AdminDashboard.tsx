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
import { Category, Comment, MediaItem, SystemConfig, Tag, UserProfile } from '../types';
import { 
  checkSupabaseHealth, 
  syncLocalDataToSupabase, 
  SUPABASE_URL, 
  ADMIN_EMAIL, 
  STORAGE_BUCKET 
} from '../utils/supabase';
import { POSTGRES_SCHEMA_SQL } from '../data/supabaseSchema';
import { safeConfirm } from '../utils/storage';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
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
  currentUser,
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

  // Supabase Cloud State
  const [healthStatus, setHealthStatus] = useState<{
    tested: boolean;
    loading: boolean;
    isConnected: boolean;
    tablesReady: boolean;
    bucketReady: boolean;
    error?: string;
  }>({
    tested: false,
    loading: false,
    isConnected: false,
    tablesReady: false,
    bucketReady: false,
  });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const isRealAdmin = currentUser?.isLoggedIn && currentUser?.role === 'admin' && currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  if (!isOpen) return null;

  if (!isRealAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <div className="w-full max-w-md p-8 rounded-3xl glass-panel border border-rose-500/40 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Shield className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-100 font-display">
              ADMIN AUTHORIZATION REQUIRED
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Administrative Command Nexus is restricted strictly to verified administrator{' '}
              <span className="text-amber-400 font-mono font-semibold">{ADMIN_EMAIL}</span> via Google Sign-In.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all"
          >
            Dismiss & Close
          </button>
        </div>
      </div>
    );
  }

  const handleTestSupabase = async () => {
    setHealthStatus(prev => ({ ...prev, loading: true }));
    const res = await checkSupabaseHealth();
    setHealthStatus({
      tested: true,
      loading: false,
      isConnected: res.isConnected,
      tablesReady: res.tablesReady,
      bucketReady: res.bucketReady,
      error: res.error,
    });
  };

  const handleSyncToSupabase = async () => {
    setSyncLoading(true);
    setSyncMessage('Syncing local vault data to Supabase database...');
    const res = await syncLocalDataToSupabase(items, categories, tags);
    if (res.success) {
      setSyncMessage(`Synced ${res.itemsSynced} links, categories & tags to Supabase!`);
    } else {
      setSyncMessage(`Sync notice: ${res.error || 'Please execute schema.sql in Supabase SQL editor'}`);
    }
    setSyncLoading(false);
    setTimeout(() => setSyncMessage(null), 6000);
  };

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
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

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
    setSaveNotice('System configuration updated successfully!');
    setTimeout(() => setSaveNotice(null), 3000);
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

  // POSTGRES_SCHEMA_SQL imported from ../data/supabaseSchema

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(POSTGRES_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl rounded-3xl glass-panel border border-amber-500/30 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden my-auto max-h-[92vh] flex flex-col transform-gpu gpu-layer animate-in fade-in-50 zoom-in-95 duration-150"
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
            { id: 'schema', label: 'Supabase Cloud & SQL', icon: <Database className="w-4 h-4 text-cyan-400" /> },
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
          {/* Toast Notification Banner */}
          {saveNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
              <span className="font-medium">{saveNotice}</span>
              <button 
                onClick={() => setSaveNotice(null)}
                className="text-emerald-400 hover:text-white ml-2 text-sm font-bold"
              >
                ×
              </button>
            </div>
          )}
          
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
                                    if (safeConfirm(`Delete "${item.title}"?`)) {
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
                    if (safeConfirm('Reset all vault entries, categories, and comments to default?')) {
                      onResetSampleData();
                      setSaveNotice('Data restored to initial seeds!');
                      setTimeout(() => setSaveNotice(null), 3000);
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

          {/* TAB 6: SUPABASE CLOUD & POSTGRESQL DDL */}
          {activeTab === 'schema' && (
            <div className="space-y-6">
              
              {/* Supabase Cloud Live Control & Diagnostics */}
              <div className="rounded-2xl glass-panel-subtle p-5 border border-cyan-500/30 space-y-4 bg-cyan-950/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Database className="w-5 h-5" />
                      <h3 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
                        Supabase Cloud Database & Storage Nexus
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Project ID: <span className="font-mono text-cyan-300">itdepagafihwvtklxfql</span> &bull; Bucket: <span className="font-mono text-cyan-300">{STORAGE_BUCKET}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleTestSupabase}
                      disabled={healthStatus.loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${healthStatus.loading ? 'animate-spin' : ''}`} />
                      <span>{healthStatus.loading ? 'Testing...' : 'Test Connection'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncToSupabase}
                      disabled={syncLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-all disabled:opacity-50"
                    >
                      <Download className={`w-3.5 h-3.5 ${syncLoading ? 'animate-bounce' : ''}`} />
                      <span>{syncLoading ? 'Syncing...' : 'Sync Local Data to Supabase'}</span>
                    </button>
                  </div>
                </div>

                {/* Health & Diagnostic Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Supabase Client API</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${healthStatus.tested ? (healthStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400') : 'bg-slate-500'}`} />
                      <span className="text-xs font-semibold text-slate-200 font-mono">
                        {healthStatus.tested ? (healthStatus.isConnected ? 'Connected (200 OK)' : 'Check Credentials') : 'Not Checked'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Database Tables (vault_items)</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${healthStatus.tested ? (healthStatus.tablesReady ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-500'}`} />
                      <span className="text-xs font-semibold text-slate-200 font-mono">
                        {healthStatus.tested ? (healthStatus.tablesReady ? 'Tables Ready' : 'Execute SQL in Supabase') : 'Pending Test'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Storage Bucket (vault-media)</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${healthStatus.tested ? (healthStatus.bucketReady ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-500'}`} />
                      <span className="text-xs font-semibold text-slate-200 font-mono">
                        {healthStatus.tested ? (healthStatus.bucketReady ? 'Bucket Active' : 'Created by SQL') : 'Pending Test'}
                      </span>
                    </div>
                  </div>
                </div>

                {syncMessage && (
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{syncMessage}</span>
                  </div>
                )}

                {/* Quick Link Buttons to Supabase Dashboard */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5 flex-wrap">
                  <span className="text-[11px] text-slate-400">Quick Dashboard Links:</span>
                  <a
                    href="https://supabase.com/dashboard/project/itdepagafihwvtklxfql/sql"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 underline font-mono px-2 py-0.5 rounded bg-cyan-500/10"
                  >
                    <span>Supabase SQL Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://supabase.com/dashboard/project/itdepagafihwvtklxfql/storage/buckets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 underline font-mono px-2 py-0.5 rounded bg-purple-500/10"
                  >
                    <span>Storage Buckets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://supabase.com/dashboard/project/itdepagafihwvtklxfql/auth/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline font-mono px-2 py-0.5 rounded bg-amber-500/10"
                  >
                    <span>Auth Providers (Google)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Instructions Banner */}
              <div className="rounded-2xl glass-panel-subtle p-4 border border-white/10 bg-black/40 space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  Setup Instructions (Run Once in Supabase):
                </h4>
                <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Click <span className="font-semibold text-cyan-300">"Copy SQL Script"</span> below.</li>
                  <li>Click <a href="https://supabase.com/dashboard/project/itdepagafihwvtklxfql/sql" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5"><span>Open Supabase SQL Editor</span> <ExternalLink className="w-2.5 h-2.5" /></a> and paste the SQL script into a new query.</li>
                  <li>Click <span className="font-semibold text-emerald-300">Run</span> (Cmd+Enter or Ctrl+Enter) to initialize tables (<code className="text-cyan-300">vault_items</code>, <code className="text-cyan-300">vault_categories</code>, etc.) and create the <code className="text-cyan-300">vault-media</code> storage bucket.</li>
                  <li>Return here and click <span className="font-semibold text-amber-300">"Sync Local Data to Supabase"</span> to push all existing links to the cloud database!</li>
                </ol>
              </div>

              {/* PostgreSQL DDL SQL Schema */}
              <div className="rounded-2xl glass-panel-subtle border border-white/10 overflow-hidden">
                <div className="px-5 py-3 bg-black/80 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-slate-200">
                      schema.sql (Complete Supabase Tables, RLS Policies & Storage)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copySqlToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
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
