import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  AlertCircle, 
  Inbox, 
  CheckCircle2, 
  Clock,
  Compass,
  ArrowUpRight,
  Database
} from 'lucide-react';
import { 
  Category, 
  Comment, 
  MediaItem, 
  SearchFilters, 
  SystemConfig, 
  Tag, 
  UserProfile 
} from './types';
import { 
  clearRecentlyViewed, 
  loadCategories, 
  loadComments, 
  loadConfig, 
  loadItems, 
  loadRecentlyViewed, 
  loadTags, 
  loadUser, 
  recordRecentlyViewed, 
  resetAllData, 
  saveCategories, 
  saveComments, 
  saveConfig, 
  saveItems, 
  saveTags, 
  saveUser 
} from './utils/storage';
import { fuzzySearchMedia } from './utils/fuzzySearch';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { MediaCard } from './components/MediaCard';
import { EmbeddedMediaViewer } from './components/EmbeddedMediaViewer';
import { AddEditLinkModal } from './components/AddEditLinkModal';
import { AdminDashboard } from './components/AdminDashboard';
import { RecentlyViewedDrawer } from './components/RecentlyViewedDrawer';
import { AuthModal } from './components/AuthModal';

export default function App() {
  // Core Persistent State
  const [items, setItems] = useState<MediaItem[]>(() => loadItems());
  const [categories, setCategories] = useState<Category[]>(() => loadCategories());
  const [tags, setTags] = useState<Tag[]>(() => loadTags());
  const [comments, setComments] = useState<Comment[]>(() => loadComments());
  const [user, setUser] = useState<UserProfile>(() => loadUser());
  const [recentRecords, setRecentRecords] = useState(() => loadRecentlyViewed());
  const [config, setConfig] = useState<SystemConfig>(() => loadConfig());

  // Search & Filter State
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    categoryId: 'cat-all',
    tag: 'all',
    mediaType: 'all',
    sortBy: 'newest',
    pinnedOnly: false,
  });

  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');

  // Modal & Drawer visibility
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Floating Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Keyboard shortcut listener for fast search (Ctrl + K or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Fuzzy search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Category item counts calculation
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
    }
    return counts;
  }, [items]);

  // Comment counts map by itemId
  const commentCountsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of comments) {
      map[c.itemId] = (map[c.itemId] || 0) + 1;
    }
    return map;
  }, [comments]);

  // Advanced Multi-filtering & Fuzzy Ranking Pipeline
  const filteredItems = useMemo(() => {
    // 1. Fuzzy Search Filtering
    let result = fuzzySearchMedia(items, filters.query);

    // 2. Category Filter
    if (filters.categoryId !== 'cat-all') {
      result = result.filter((item) => item.categoryId === filters.categoryId);
    }

    // 3. Media Type Filter (Video, Audio, Image, Web)
    if (filters.mediaType !== 'all') {
      result = result.filter((item) => item.mediaType === filters.mediaType);
    }

    // 4. Tag Filter
    if (filters.tag !== 'all') {
      result = result.filter((item) => item.tags.includes(filters.tag));
    }

    // 5. Pinned Only Filter
    if (filters.pinnedOnly) {
      result = result.filter((item) => item.isPinned);
    }

    // 6. Sorting Pipeline
    return [...result].sort((a, b) => {
      // Pinned items bubble to top by default unless specific sort applied
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      switch (filters.sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'views':
          return (b.viewsCount || 0) - (a.viewsCount || 0);
        case 'likes':
          return (b.likesCount || 0) - (a.likesCount || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [items, filters]);

  // Handlers
  const handleOpenPreview = (item: MediaItem) => {
    // Increment view count
    const updatedItems = items.map((i) => 
      i.id === item.id ? { ...i, viewsCount: (i.viewsCount || 0) + 1 } : i
    );
    setItems(updatedItems);
    saveItems(updatedItems);

    // Record in recently viewed
    const updatedRecents = recordRecentlyViewed(item.id);
    setRecentRecords(updatedRecents);

    // Set preview item
    setPreviewItem({ ...item, viewsCount: (item.viewsCount || 0) + 1 });
  };

  const handleLikeItem = (itemId: string) => {
    const updated = items.map((i) =>
      i.id === itemId ? { ...i, likesCount: (i.likesCount || 0) + 1 } : i
    );
    setItems(updated);
    saveItems(updated);
    showToast('Vault link liked!');
  };

  const handleTogglePin = (itemId: string) => {
    const updated = items.map((i) =>
      i.id === itemId ? { ...i, isPinned: !i.isPinned } : i
    );
    setItems(updated);
    saveItems(updated);
    showToast('Pin state updated');
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = items.filter((i) => i.id !== itemId);
    setItems(updated);
    saveItems(updated);
    if (previewItem?.id === itemId) setPreviewItem(null);
    showToast('Entry removed from vault');
  };

  const handleSaveLink = (data: Partial<MediaItem>) => {
    if (editingItem) {
      // Update existing
      const updated = items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              ...data,
              updatedAt: new Date().toISOString(),
            }
          : i
      );
      setItems(updated);
      saveItems(updated);
      showToast('Vault link updated successfully');
    } else {
      // Create new
      const newItem: MediaItem = {
        id: `vault-item-${Date.now()}`,
        title: data.title || 'Untitled Bookmark',
        description: data.description || '',
        url: data.url || '',
        mediaType: data.mediaType || 'web',
        thumbnailUrl: data.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        mediaUrl: data.mediaUrl,
        embedType: data.embedType || 'none',
        embedId: data.embedId,
        categoryId: data.categoryId || categories[1]?.id || categories[0]?.id || 'cat-all',
        tags: data.tags || [],
        siteName: data.siteName,
        favicon: data.favicon,
        viewsCount: 1,
        likesCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: data.isPinned || false,
        source: data.source || 'url',
        fileName: data.fileName,
        fileSize: data.fileSize,
      };

      const updated = [newItem, ...items];
      setItems(updated);
      saveItems(updated);
      showToast('New media link vaulted!');
    }

    setIsAddEditOpen(false);
    setEditingItem(null);
  };

  const handleAddComment = (itemId: string, content: string, guestNickname?: string) => {
    const newComment: Comment = {
      id: `cmt-${Date.now()}`,
      itemId,
      authorName: user.isLoggedIn ? user.name : (guestNickname || 'Guest Explorer'),
      authorAvatar: user.isLoggedIn ? user.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${guestNickname || 'Guest'}`,
      authorEmail: user.isLoggedIn ? user.email : undefined,
      isGoogleUser: user.isLoggedIn && user.email.includes('@gmail.com'),
      isAdmin: user.role === 'admin',
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    const updated = [newComment, ...comments];
    setComments(updated);
    saveComments(updated);
    showToast('Comment published to discussion');
  };

  const handleDeleteComment = (commentId: string) => {
    const updated = comments.filter((c) => c.id !== commentId);
    setComments(updated);
    saveComments(updated);
    showToast('Comment deleted');
  };

  // Category & Tag Handlers
  const handleAddCategory = (catData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      ...catData,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCategories(updated);
    showToast(`Category "${newCat.name}" created`);
  };

  const handleDeleteCategory = (catId: string) => {
    const updated = categories.filter((c) => c.id !== catId);
    setCategories(updated);
    saveCategories(updated);
    showToast('Category deleted');
  };

  const handleAddTag = (tagData: Omit<Tag, 'id'>) => {
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      ...tagData,
    };
    const updated = [...tags, newTag];
    setTags(updated);
    saveTags(updated);
    showToast(`Tag #${newTag.name} created`);
  };

  const handleDeleteTag = (tagId: string) => {
    const updated = tags.filter((t) => t.id !== tagId);
    setTags(updated);
    saveTags(updated);
    showToast('Tag deleted');
  };

  const handleSaveConfig = (newConfig: SystemConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    showToast('System configuration saved');
  };

  const handleResetSampleData = () => {
    resetAllData();
    setItems(loadItems());
    setCategories(loadCategories());
    setTags(loadTags());
    setComments(loadComments());
    setConfig(loadConfig());
    setRecentRecords([]);
    showToast('Vault reset to demo seeds');
  };

  const handleClearHistory = () => {
    clearRecentlyViewed();
    setRecentRecords([]);
    showToast('Recently viewed history cleared');
  };

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    saveUser(newUser);
    showToast(`Signed in as ${newUser.name} (${newUser.role.toUpperCase()})`);
  };

  const handleLogout = () => {
    const guestUser: UserProfile = {
      id: 'usr-guest',
      name: 'Guest Explorer',
      email: 'guest@obsidian.local',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
      role: 'guest',
      isLoggedIn: false,
    };
    setUser(guestUser);
    saveUser(guestUser);
    showToast('Signed out of vault');
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Sleek Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-panel border border-cyan-500/50 shadow-2xl text-xs font-semibold text-cyan-300 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenAddLink={() => {
          setEditingItem(null);
          setIsAddEditOpen(true);
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenRecent={() => setIsRecentOpen(true)}
        recentCount={recentRecords.length}
        searchQuery={filters.query}
        onSearchChange={(q) => setFilters({ ...filters, query: q })}
        vaultName={config.vaultName}
      />

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Hero Banner Strip */}
        <div className="relative rounded-3xl glass-panel p-6 sm:p-8 overflow-hidden border border-cyan-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hyper-Indexed Cyber Vault</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-wide text-slate-100">
                {config.vaultName}
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                {config.vaultTagline}
              </p>
            </div>

            {/* Quick Stats & Architecture Shortcut */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsAdminOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-cyan-500/30 transition-all shadow-md"
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>View Schema SQL</span>
              </button>

              {user.role === 'admin' ? (
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddEditOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 hover:from-cyan-300 hover:to-teal-300 transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Vault New Link</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all"
                >
                  <span>Admin Mode (Unlock Full CRUD)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Multi-Filters & Taxonomy Bar */}
        <FilterBar
          categories={categories}
          tags={tags}
          filters={filters}
          onFilterChange={setFilters}
          categoryCounts={categoryCounts}
          totalItemCount={items.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Search Query Feedback Badge */}
        {filters.query && (
          <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
            <span>
              Fuzzy search results for <strong className="font-mono text-white">"{filters.query}"</strong>
            </span>
            <span className="font-mono">({filteredItems.length} matches found)</span>
          </div>
        )}

        {/* Media Bookmarks Grid / List */}
        {filteredItems.length === 0 ? (
          <div className="rounded-3xl glass-panel p-12 text-center flex flex-col items-center justify-center space-y-4 border border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-200">No vault entries matched</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Try loosening your search terms, changing the media category, or resetting active filters.
              </p>
            </div>
            <button
              onClick={() => setFilters({
                query: '',
                categoryId: 'cat-all',
                tag: 'all',
                mediaType: 'all',
                sortBy: 'newest',
                pinnedOnly: false,
              })}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredItems.map((item) => {
              const category = categories.find((c) => c.id === item.categoryId);
              return (
                <MediaCard
                  key={item.id}
                  item={item}
                  category={category}
                  user={user}
                  commentCount={commentCountsMap[item.id] || 0}
                  onPreview={handleOpenPreview}
                  onLike={handleLikeItem}
                  onEdit={(it) => {
                    setEditingItem(it);
                    setIsAddEditOpen(true);
                  }}
                  onDelete={handleDeleteItem}
                  onTogglePin={handleTogglePin}
                  onSelectTag={(t) => setFilters({ ...filters, tag: t })}
                />
              );
            })}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-8 mt-12 text-center text-xs text-slate-500 space-y-2">
        <p className="font-mono text-[11px] text-slate-400">
          OBSIDIAN VAULT • ARCHITECTURAL LINK & EMBEDDED MEDIA VAULT
        </p>
        <p className="text-[11px] text-slate-600">
          Powered by Next.js App Router Architecture, Supabase PostgreSQL RLS, and OpenGraph Microservices.
        </p>
      </footer>

      {/* Embedded Media Viewer Modal */}
      {previewItem && (
        <EmbeddedMediaViewer
          item={previewItem}
          user={user}
          comments={comments.filter((c) => c.itemId === previewItem.id)}
          onClose={() => setPreviewItem(null)}
          onLike={handleLikeItem}
          onAddComment={handleAddComment}
          onDeleteComment={user.role === 'admin' ? handleDeleteComment : undefined}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      )}

      {/* Add / Edit Link Modal */}
      {isAddEditOpen && (
        <AddEditLinkModal
          initialItem={editingItem}
          categories={categories}
          tags={tags}
          onSave={handleSaveLink}
          onClose={() => {
            setIsAddEditOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Admin Command Nexus Dashboard */}
      {isAdminOpen && (
        <AdminDashboard
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          items={items}
          categories={categories}
          tags={tags}
          comments={comments}
          config={config}
          onSaveConfig={handleSaveConfig}
          onAddNewLink={() => {
            setEditingItem(null);
            setIsAddEditOpen(true);
          }}
          onEditLink={(it) => {
            setEditingItem(it);
            setIsAddEditOpen(true);
          }}
          onDeleteLink={handleDeleteItem}
          onTogglePin={handleTogglePin}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddTag={handleAddTag}
          onDeleteTag={handleDeleteTag}
          onDeleteComment={handleDeleteComment}
          onResetSampleData={handleResetSampleData}
        />
      )}

      {/* Recently Viewed Links Drawer */}
      <RecentlyViewedDrawer
        isOpen={isRecentOpen}
        onClose={() => setIsRecentOpen(false)}
        recentRecords={recentRecords}
        allItems={items}
        onPreview={handleOpenPreview}
        onClearHistory={handleClearHistory}
      />

      {/* Identity / Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

    </div>
  );
}
