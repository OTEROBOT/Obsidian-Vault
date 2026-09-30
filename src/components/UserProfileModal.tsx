import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, 
  User, 
  Heart, 
  Bookmark, 
  MessageSquare, 
  ExternalLink, 
  LogOut, 
  Trash2, 
  Clock, 
  Sparkles, 
  Eye, 
  Search,
  CheckCircle,
  Maximize2,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { Comment, MediaItem, UserProfile } from '../types';
import { decodeHtmlEntities } from '../utils/text';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  items: MediaItem[];
  comments: Comment[];
  userLikedItemIds: Set<string>;
  userBookmarkedItemIds: Set<string>;
  onLike?: (itemId: string) => void;
  onUnlike?: (itemId: string) => void;
  onToggleBookmark?: (itemId: string) => void;
  onUnbookmark?: (itemId: string) => void;
  onPreview?: (item: MediaItem) => void;
  onPreviewItem?: (item: MediaItem) => void;
  onDeleteComment?: (commentId: string) => void;
  onClearLikes?: () => void;
  onClearBookmarks?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  items,
  comments,
  userLikedItemIds,
  userBookmarkedItemIds,
  onLike,
  onUnlike,
  onToggleBookmark,
  onUnbookmark,
  onPreview,
  onPreviewItem,
  onDeleteComment,
  onClearLikes,
  onClearBookmarks,
  onOpenAuth,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'likes' | 'bookmarks' | 'comments'>(() => {
    try {
      const saved = localStorage.getItem('vault_profile_active_tab');
      if (saved === 'likes' || saved === 'bookmarks' || saved === 'comments') {
        return saved;
      }
    } catch (e) {}
    return 'likes';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Two-Step Confirmation Safety State (Prevents accidental mass deletions)
  const [clearTarget, setClearTarget] = useState<'likes' | 'bookmarks' | null>(null);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState('');

  const targetCount = clearTarget === 'likes' ? userLikedItemIds.size : userBookmarkedItemIds.size;
  const targetLabel = clearTarget === 'likes' ? 'โพสต์ที่ถูกใจ' : 'บุ๊กมาร์กที่บันทึก';

  const handleStartClear = (target: 'likes' | 'bookmarks') => {
    setClearTarget(target);
    setConfirmStep(1);
    setConfirmInput('');
  };

  const handleCancelClear = () => {
    setClearTarget(null);
    setConfirmStep(1);
    setConfirmInput('');
  };

  const handleExecuteClear = () => {
    const trimmed = confirmInput.trim().toUpperCase();
    if (trimmed !== 'CLEAR' && confirmInput.trim() !== 'ลบ') {
      return;
    }
    if (clearTarget === 'likes') {
      onClearLikes?.();
    } else if (clearTarget === 'bookmarks') {
      onClearBookmarks?.();
    }
    handleCancelClear();
  };

  const handlePreviewAction = onPreview || onPreviewItem;
  const handleLikeAction = onLike || onUnlike;
  const handleBookmarkAction = onToggleBookmark || onUnbookmark;

  // Tab change with scroll saving
  const handleTabChange = (tab: 'likes' | 'bookmarks' | 'comments') => {
    if (scrollContainerRef.current) {
      const currentScroll = scrollContainerRef.current.scrollTop;
      try {
        sessionStorage.setItem(`vault_profile_scroll_${activeTab}`, String(currentScroll));
        localStorage.setItem(`vault_profile_scroll_${activeTab}`, String(currentScroll));
      } catch (e) {}
    }
    setActiveTab(tab);
    try {
      localStorage.setItem('vault_profile_active_tab', tab);
    } catch (e) {}
  };

  // Restore scroll position whenever modal opens or activeTab changes
  useEffect(() => {
    if (!isOpen) return;
    const key = `vault_profile_scroll_${activeTab}`;
    const savedStr = sessionStorage.getItem(key) || localStorage.getItem(key);
    const saved = parseInt(savedStr || '0', 10);
    if (saved > 0) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = saved;
        }
      });
    }
  }, [isOpen, activeTab]);

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    try {
      sessionStorage.setItem(`vault_profile_scroll_${activeTab}`, String(top));
      localStorage.setItem(`vault_profile_scroll_${activeTab}`, String(top));
    } catch (e) {}
  };

  // Open preview while preserving modal and scroll position
  const handleOpenCard = (item: MediaItem) => {
    if (scrollContainerRef.current) {
      const top = scrollContainerRef.current.scrollTop;
      try {
        sessionStorage.setItem(`vault_profile_scroll_${activeTab}`, String(top));
        localStorage.setItem(`vault_profile_scroll_${activeTab}`, String(top));
      } catch (e) {}
    }
    handlePreviewAction?.(item);
  };

  const handleLogoutClick = () => {
    if (typeof onLogout === 'function') {
      try {
        onLogout();
      } catch (err) {
        console.warn('Logout execution error:', err);
      }
    }
    onClose();
  };

  // Map items by ID for quick O(1) retrieval
  const itemsMap = useMemo(() => {
    const map = new Map<string, MediaItem>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  // Liked items list
  const likedItems = useMemo(() => {
    return Array.from(userLikedItemIds)
      .map((id) => itemsMap.get(id))
      .filter((item): item is MediaItem => Boolean(item));
  }, [userLikedItemIds, itemsMap]);

  // Bookmarked items list
  const bookmarkedItems = useMemo(() => {
    return Array.from(userBookmarkedItemIds)
      .map((id) => itemsMap.get(id))
      .filter((item): item is MediaItem => Boolean(item));
  }, [userBookmarkedItemIds, itemsMap]);

  // Comments created by this user
  const userComments = useMemo(() => {
    if (!user.isLoggedIn) return [];
    const userEmail = user.email?.toLowerCase().trim();
    const userName = user.name?.toLowerCase().trim();

    return comments.filter((c) => {
      const matchEmail = c.authorEmail && c.authorEmail.toLowerCase().trim() === userEmail;
      const matchName = c.authorName && c.authorName.toLowerCase().trim() === userName;
      return matchEmail || matchName;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [comments, user]);

  // Filtered results based on search query inside the active tab
  const filteredLikedItems = useMemo(() => {
    if (!searchQuery.trim()) return likedItems;
    const q = searchQuery.toLowerCase().trim();
    return likedItems.filter((i) => 
      i.title.toLowerCase().includes(q) || 
      i.description?.toLowerCase().includes(q) ||
      i.itemNumber?.toString() === q ||
      `#${i.itemNumber}` === q
    );
  }, [likedItems, searchQuery]);

  const filteredBookmarkedItems = useMemo(() => {
    if (!searchQuery.trim()) return bookmarkedItems;
    const q = searchQuery.toLowerCase().trim();
    return bookmarkedItems.filter((i) => 
      i.title.toLowerCase().includes(q) || 
      i.description?.toLowerCase().includes(q) ||
      i.itemNumber?.toString() === q ||
      `#${i.itemNumber}` === q
    );
  }, [bookmarkedItems, searchQuery]);

  const filteredComments = useMemo(() => {
    if (!searchQuery.trim()) return userComments;
    const q = searchQuery.toLowerCase().trim();
    return userComments.filter((c) => {
      const parentItem = itemsMap.get(c.itemId);
      return (
        c.content.toLowerCase().includes(q) ||
        (parentItem && parentItem.title.toLowerCase().includes(q))
      );
    });
  }, [userComments, searchQuery, itemsMap]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl rounded-2xl sm:rounded-3xl bg-[#0b0e17] border border-cyan-500/30 shadow-2xl overflow-hidden my-auto transform-gpu gpu-layer animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="relative px-4 sm:px-7 py-3.5 sm:py-5 border-b border-white/10 bg-gradient-to-r from-[#101524] via-[#0b0e17] to-[#121626] flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            <div className="relative shrink-0">
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                alt={user.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-[#0b0e17] flex items-center justify-center" title="Online">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-bold text-slate-100 font-display truncate max-w-[140px] sm:max-w-none">
                  {user.name}
                </h2>
                <span className={`text-[10px] font-mono whitespace-nowrap shrink-0 font-bold px-2 py-0.5 rounded-full border ${
                  user.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                }`}>
                  {user.role === 'admin' ? '🛡️ ผู้ดูแลระบบ' : '⭐ สมาชิกทั่วไป'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono mt-0.5 truncate">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors touch-target"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-3 border-b border-white/10 bg-white/[0.02] shrink-0 divide-x divide-white/10">
          <button
            onClick={() => handleTabChange('likes')}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 text-center transition-colors ${
              activeTab === 'likes' ? 'bg-rose-500/10' : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-rose-400 font-mono text-sm sm:text-base font-bold">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>{likedItems.length}</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-medium truncate">
              <span className="sm:hidden">ถูกใจ</span>
              <span className="hidden sm:inline">โพสต์ที่กดถูกใจ</span>
            </p>
          </button>

          <button
            onClick={() => handleTabChange('bookmarks')}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 text-center transition-colors ${
              activeTab === 'bookmarks' ? 'bg-amber-500/10' : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-mono text-sm sm:text-base font-bold">
              <Bookmark className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{bookmarkedItems.length}</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-medium truncate">
              <span className="sm:hidden">บุ๊กมาร์ก</span>
              <span className="hidden sm:inline">บุ๊กมาร์กที่บันทึก</span>
            </p>
          </button>

          <button
            onClick={() => handleTabChange('comments')}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 text-center transition-colors ${
              activeTab === 'comments' ? 'bg-cyan-500/10' : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-cyan-400 font-mono text-sm sm:text-base font-bold">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>{userComments.length}</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-medium truncate">
              <span className="sm:hidden">ความคิดเห็น</span>
              <span className="hidden sm:inline">ความคิดเห็นของฉัน</span>
            </p>
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="px-3.5 sm:px-7 py-2.5 sm:py-3 border-b border-white/10 bg-[#0e121d] flex flex-col gap-2.5 shrink-0">
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 w-full">
            <button
              onClick={() => handleTabChange('likes')}
              className={`py-1.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'likes'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${activeTab === 'likes' ? 'fill-rose-400' : ''}`} />
              <span className="truncate">ถูกใจ ({likedItems.length})</span>
            </button>

            <button
              onClick={() => handleTabChange('bookmarks')}
              className={`py-1.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'bookmarks'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Bookmark className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${activeTab === 'bookmarks' ? 'fill-amber-400' : ''}`} />
              <span className="truncate">บุ๊กมาร์ก ({bookmarkedItems.length})</span>
            </button>

            <button
              onClick={() => handleTabChange('comments')}
              className={`py-1.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === 'comments'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">คอมเมนต์ ({userComments.length})</span>
            </button>
          </div>

          {/* Mini Search & Clear Actions inside profile */}
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาในประวัตินี้..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-900/90 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {activeTab === 'likes' && likedItems.length > 0 && onClearLikes && (
              <button
                type="button"
                onClick={() => handleStartClear('likes')}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                title="ยกเลิกการถูกใจทั้งหมดของฉัน (มีระบบยืนยัน 2 ขั้นตอน)"
              >
                <Trash2 className="w-3 h-3" />
                <span>ล้างทั้งหมด</span>
              </button>
            )}

            {activeTab === 'bookmarks' && bookmarkedItems.length > 0 && onClearBookmarks && (
              <button
                type="button"
                onClick={() => handleStartClear('bookmarks')}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                title="ลบรายการบุ๊กมาร์กทั้งหมดของฉัน (มีระบบยืนยัน 2 ขั้นตอน)"
              >
                <Trash2 className="w-3 h-3" />
                <span>ล้างทั้งหมด</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content List Area */}
        <div ref={scrollContainerRef} onScroll={handleContainerScroll} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          
          {/* TAB 1: LIKED ITEMS */}
          {activeTab === 'likes' && (
            <div>
              {filteredLikedItems.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {searchQuery ? 'ไม่พบโพสต์ที่ตรงกับคำค้นหา' : 'ยังไม่มีโพสต์ที่คุณกดถูกใจ'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    คลิกรูปหัวใจ ❤️ ที่การ์ดใดก็ได้ในคลัง เพื่อบันทึกโพสต์โปรดของคุณไว้ที่นี่
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredLikedItems.map((item) => {
                    const cleanTitle = decodeHtmlEntities(item.title);
                    const displayId = item.itemNumber || 1;

                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-2xl bg-[#0e121d] border border-white/10 hover:border-rose-500/30 p-3 flex gap-3 transition-all hover:bg-[#121726]"
                      >
                        {/* Thumbnail */}
                        <div 
                          onClick={() => handleOpenCard(item)}
                          className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-950 cursor-pointer"
                        >
                          <img
                            src={item.thumbnailUrl}
                            alt={cleanTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/80 font-mono text-[9px] font-bold text-cyan-400">
                            #{displayId}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 
                              onClick={() => handleOpenCard(item)}
                              className="text-xs font-semibold text-slate-200 hover:text-cyan-300 transition-colors line-clamp-2 cursor-pointer leading-snug"
                            >
                              {cleanTitle}
                            </h4>
                            <p className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                              {item.siteName || 'Media Vault'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                            <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1">
                              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                              {item.likesCount || 1} ใจ
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleLikeAction?.(item.id)}
                                className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                                title="ยกเลิกการถูกใจ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenCard(item)}
                                className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span>ดู</span>
                                <Maximize2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BOOKMARKED ITEMS */}
          {activeTab === 'bookmarks' && (
            <div>
              {filteredBookmarkedItems.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                    <Bookmark className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {searchQuery ? 'ไม่พบบุ๊กมาร์กที่ตรงกับคำค้นหา' : 'ยังไม่มีรายการที่คุณบุ๊กมาร์กไว้'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    คลิกไอคอนบุ๊กมาร์ก 🔖 บนการ์ดใดก็ได้ เพื่อบันทึกลิงก์ไว้เปิดดูภายหลังได้อย่างรวดเร็ว
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredBookmarkedItems.map((item) => {
                    const cleanTitle = decodeHtmlEntities(item.title);
                    const displayId = item.itemNumber || 1;

                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-2xl bg-[#0e121d] border border-white/10 hover:border-amber-500/30 p-3 flex gap-3 transition-all hover:bg-[#121726]"
                      >
                        {/* Thumbnail */}
                        <div 
                          onClick={() => handleOpenCard(item)}
                          className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-950 cursor-pointer"
                        >
                          <img
                            src={item.thumbnailUrl}
                            alt={cleanTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/80 font-mono text-[9px] font-bold text-cyan-400">
                            #{displayId}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 
                              onClick={() => handleOpenCard(item)}
                              className="text-xs font-semibold text-slate-200 hover:text-cyan-300 transition-colors line-clamp-2 cursor-pointer leading-snug"
                            >
                              {cleanTitle}
                            </h4>
                            <p className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                              {item.siteName || 'Media Vault'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                            <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                              <Bookmark className="w-3 h-3 fill-amber-400 text-amber-400" />
                              บันทึกแล้ว
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleBookmarkAction?.(item.id)}
                                className="p-1 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors"
                                title="ลบออกจากบุ๊กมาร์ก"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenCard(item)}
                                className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span>เปิด</span>
                                <Maximize2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MY COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-2.5">
              {filteredComments.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {searchQuery ? 'ไม่พบคอมเมนต์ที่ตรงกับคำค้นหา' : 'คุณยังไม่เคยแสดงความคิดเห็นในโพสต์ใดๆ'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    เปิดดูโพสต์ใดก็ได้แล้วพิมพ์ข้อความพูดคุยในช่องคอมเมนต์ ประวัติจะแสดงที่นี่ทันที
                  </p>
                </div>
              ) : (
                filteredComments.map((comment) => {
                  const parentItem = itemsMap.get(comment.itemId);
                  const cleanParentTitle = parentItem ? decodeHtmlEntities(parentItem.title) : 'โพสต์ที่ถูกลบหรือไม่มีข้อมูล';
                  const parentId = parentItem?.itemNumber;

                  return (
                    <div
                      key={comment.id}
                      className="p-3.5 rounded-2xl bg-[#0e121d] border border-white/10 hover:border-cyan-500/30 transition-all"
                    >
                      {/* Parent Post Reference Header */}
                      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shrink-0">
                            {parentId ? `#${parentId}` : 'LINK'}
                          </span>
                          <span 
                            onClick={() => {
                              if (parentItem) {
                                handleOpenCard(parentItem);
                              }
                            }}
                            className="text-xs font-medium text-slate-300 hover:text-cyan-300 cursor-pointer truncate"
                            title={cleanParentTitle}
                          >
                            ในโพสต์: {cleanParentTitle}
                          </span>
                        </div>

                        {parentItem && (
                          <button
                            onClick={() => handleOpenCard(parentItem)}
                            className="shrink-0 text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            เปิดโพสต์ &rarr;
                          </button>
                        )}
                      </div>

                      {/* Comment text */}
                      <p className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>

                      {/* Comment footer */}
                      <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(comment.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>

                        {comment.likes > 0 && (
                          <span className="flex items-center gap-1 text-rose-400">
                            <Heart className="w-2.5 h-2.5 fill-rose-500" />
                            {comment.likes} ถูกใจ
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-white/10 bg-[#090a0f] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all active:scale-95 touch-target shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>ออกจากระบบ (Sign Out)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-colors touch-target"
          >
            ปิดหน้าต่าง
          </button>
        </div>

        {/* Two-Step Confirmation Safety Modal */}
        {clearTarget && (
          <div 
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in-50 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-w-md rounded-2xl bg-[#0e121d] border border-rose-500/40 shadow-2xl p-5 sm:p-6 text-center animate-in zoom-in-95 duration-150">
              {confirmStep === 1 ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3.5">
                    <AlertTriangle className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-mono font-bold mb-2">
                    ขั้นตอนที่ 1 จาก 2 : ยืนยันความตั้งใจ
                  </div>
                  <h3 className="text-base font-bold text-slate-100">
                    ล้างรายการ{targetLabel}ทั้งหมด?
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    คุณกำลังจะลบรายการ{targetLabel}ทั้งหมดจำนวน <strong className="text-rose-400 font-mono text-sm">{targetCount}</strong> รายการ ข้อมูลนี้จะถูกล้างออกจากเครื่องและคลาวด์อย่างถาวร
                  </p>

                  <div className="flex items-center gap-2.5 mt-5">
                    <button
                      type="button"
                      onClick={handleCancelClear}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmStep(2)}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>ไปยังขั้นตอนยืนยันสุดท้าย</span>
                      <span>→</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3.5 animate-pulse">
                    <ShieldAlert className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold mb-2">
                    ขั้นตอนที่ 2 จาก 2 : ความปลอดภัยขั้นสูงสุด
                  </div>
                  <h3 className="text-base font-bold text-slate-100">
                    ยืนยันคำสั่งลบถาวร
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    เพื่อป้องกันการแตะโดนโดยไม่ตั้งใจ โปรดพิมพ์คำว่า <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">CLEAR</span> หรือ <span className="font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">ลบ</span> เพื่อปลดล็อกปุ่มลบ:
                  </p>

                  <div className="mt-3.5">
                    <input
                      type="text"
                      autoFocus
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      placeholder="พิมพ์ CLEAR หรือ ลบ ที่นี่..."
                      className="w-full text-center py-2 px-3 rounded-xl text-sm font-mono bg-slate-950 border border-rose-500/40 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 mt-5">
                    <button
                      type="button"
                      onClick={() => setConfirmStep(1)}
                      className="py-2 px-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-400 transition-colors cursor-pointer"
                    >
                      ← ย้อนกลับ
                    </button>
                    <button
                      type="button"
                      disabled={confirmInput.trim().toUpperCase() !== 'CLEAR' && confirmInput.trim() !== 'ลบ'}
                      onClick={handleExecuteClear}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-35 disabled:hover:bg-rose-600 text-white shadow-lg shadow-rose-900/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ยืนยันลบทั้งหมดถาวร</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
