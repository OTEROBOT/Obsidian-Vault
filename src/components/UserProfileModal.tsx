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
  Maximize2
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
        <div className="relative px-5 sm:px-7 py-5 border-b border-white/10 bg-gradient-to-r from-[#101524] via-[#0b0e17] to-[#121626] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                alt={user.name}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0b0e17] flex items-center justify-center" title="Online">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 font-display">
                  {user.name}
                </h2>
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${
                  user.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                }`}>
                  {user.role === 'admin' ? '🛡️ ผู้ดูแลระบบ' : '⭐ สมาชิกทั่วไป'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all active:scale-95 touch-target shadow-sm"
              title="ออกจากระบบ (Sign Out)"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>ออกจากระบบ</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors touch-target"
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
            className={`py-3 px-3 text-center transition-colors ${
              activeTab === 'likes' ? 'bg-rose-500/10' : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-rose-400 font-mono text-sm sm:text-base font-bold">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>{likedItems.length}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">โพสต์ที่กดถูกใจ</p>
          </button>

          <button
            onClick={() => handleTabChange('bookmarks')}
            className={`py-3 px-3 text-center transition-colors ${
              activeTab === 'bookmarks' ? 'bg-amber-500/10' : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-mono text-sm sm:text-base font-bold">
              <Bookmark className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{bookmarkedItems.length}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">บุ๊กมาร์กที่บันทึก</p>
          </button>

          <button
            onClick={() => handleTabChange('comments')}
            className={`py-3 px-3 text-center transition-colors ${
              activeTab === 'comments' ? 'bg-cyan-500/10' : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-cyan-400 font-mono text-sm sm:text-base font-bold">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>{userComments.length}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">ความคิดเห็นของฉัน</p>
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="px-5 sm:px-7 py-3 border-b border-white/10 bg-[#0e121d] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleTabChange('likes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'likes'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${activeTab === 'likes' ? 'fill-rose-400' : ''}`} />
              <span>ถูกใจ ({likedItems.length})</span>
            </button>

            <button
              onClick={() => handleTabChange('bookmarks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'bookmarks'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${activeTab === 'bookmarks' ? 'fill-amber-400' : ''}`} />
              <span>บุ๊กมาร์ก ({bookmarkedItems.length})</span>
            </button>

            <button
              onClick={() => handleTabChange('comments')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>ความคิดเห็น ({userComments.length})</span>
            </button>
          </div>

          {/* Mini Search inside profile */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาในประวัตินี้..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-900/90 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
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
      </div>
    </div>
  );
};
