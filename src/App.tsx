import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  Inbox, 
  CheckCircle2, 
  Clock,
  Compass,
  Database,
  ArrowUpRight
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
  removeRecentlyViewedItem,
  pruneStaleRecentlyViewed,
  loadUserLikes,
  saveUserLikes,
  loadUserBookmarks,
  saveUserBookmarks,
  loadTopTenCollapsed,
  saveTopTenCollapsed,
  resetAllData, 
  saveCategories, 
  saveComments, 
  saveConfig, 
  saveItems, 
  saveTags, 
  saveUser,
  getDeletedItemIds,
  markItemAsDeleted,
  getDeletedCategoryIds,
  markCategoryAsDeleted,
  getDeletedTagIds,
  markTagAsDeleted,
  loadCardImageFits,
  saveCardImageFits,
  loadGlobalImageFit,
  saveGlobalImageFit,
  loadSavedFilters,
  saveSavedFilters,
  loadViewMode,
  saveViewMode,
  assignSequentialItemNumbers
} from './utils/storage';
import { 
  supabase, 
  fetchItemsFromSupabase, 
  saveItemToSupabase, 
  deleteItemFromSupabase, 
  updateItemLikesInSupabase,
  updateItemViewsInSupabase,
  fetchCategoriesFromSupabase,
  saveCategoryToSupabase,
  deleteCategoryFromSupabase,
  fetchTagsFromSupabase,
  saveTagToSupabase,
  deleteTagFromSupabase,
  fetchConfigFromSupabase,
  saveConfigToSupabase,
  SYSTEM_CONFIG_ITEM_ID,
  mapSupabaseUserToProfile,
  signOutSupabaseAuth,
  ADMIN_EMAIL
} from './utils/supabase';
import { INITIAL_USER, INITIAL_ITEMS } from './data/initialData';
import { fuzzySearchMedia, intelligentSearch, IntelligentSearchResult } from './utils/fuzzySearch';
import { runIntelligentSearch } from './utils/searchWorkerManager';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { MediaCard } from './components/MediaCard';
import { MobileDrawer } from './components/MobileDrawer';
import { BottomNavBar } from './components/BottomNavBar';
import { HeroBanner } from './components/HeroBanner';
import { TopTenSlider } from './components/TopTenSlider';
import { ScrollNavigation } from './components/ScrollNavigation';
import { useTranslation } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';

// Dynamic Code Splitting for heavy dialogs & modals to ensure ultra-fast initial page load
const EmbeddedMediaViewer = React.lazy(() => import('./components/EmbeddedMediaViewer').then(m => ({ default: m.EmbeddedMediaViewer })));
const AddEditLinkModal = React.lazy(() => import('./components/AddEditLinkModal').then(m => ({ default: m.AddEditLinkModal })));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const RecentlyViewedDrawer = React.lazy(() => import('./components/RecentlyViewedDrawer').then(m => ({ default: m.RecentlyViewedDrawer })));
const AuthModal = React.lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const UserProfileModal = React.lazy(() => import('./components/UserProfileModal').then(m => ({ default: m.UserProfileModal })));

export default function App() {
  const { t } = useTranslation();
  const { theme, resolvedTheme } = useTheme();

  // Core Persistent State
  const [items, setItems] = useState<MediaItem[]>(() => loadItems());
  const [categories, setCategories] = useState<Category[]>(() => loadCategories());
  const [tags, setTags] = useState<Tag[]>(() => loadTags());
  const [comments, setComments] = useState<Comment[]>(() => loadComments());
  const [user, setUser] = useState<UserProfile>(() => loadUser());
  const [recentRecords, setRecentRecords] = useState(() => loadRecentlyViewed());
  const [config, setConfig] = useState<SystemConfig>(() => loadConfig());

  // 1 Account = 1 Like per item tracking state
  const [userLikedItemIds, setUserLikedItemIds] = useState<Set<string>>(() => new Set(loadUserLikes(user)));

  // User Bookmarked item IDs
  const [userBookmarkedItemIds, setUserBookmarkedItemIds] = useState<Set<string>>(() => new Set(loadUserBookmarks(user)));

  // Top 10 Popular Posts collapsed/minimized preference state
  const [isTopTenCollapsed, setIsTopTenCollapsed] = useState(() => loadTopTenCollapsed());

  // Logout state ref to prevent stale session reactivation
  const isLoggingOutRef = useRef(false);

  // Synchronize liked & bookmarked items whenever user identity or login status changes
  useEffect(() => {
    const likes = new Set(loadUserLikes(user));
    const bookmarks = new Set(loadUserBookmarks(user));
    setUserLikedItemIds(likes);
    setUserBookmarkedItemIds(bookmarks);

    // Reconcile items likesCount so any liked item has at least 1 like
    setItems((prevItems) => {
      let changed = false;
      const updated = prevItems.map((it) => {
        if (likes.has(it.id) && (!it.likesCount || it.likesCount === 0)) {
          changed = true;
          return { ...it, likesCount: 1 };
        }
        return it;
      });
      if (changed) {
        saveItems(updated);
        return updated;
      }
      return prevItems;
    });
  }, [user.id, user.email, user.isLoggedIn]);

  // Strictly valid recently viewed records where the target item exists in repository
  const validRecentRecords = useMemo(() => {
    const itemsMap = new Map(items.map((i) => [i.id, i]));
    return recentRecords.filter((r) => itemsMap.has(r.itemId));
  }, [recentRecords, items]);

  // Automatically prune any stale records from storage if items were deleted
  useEffect(() => {
    if (items.length > 0) {
      const validIds = new Set<string>(items.map((i) => i.id));
      const pruned = pruneStaleRecentlyViewed(validIds);
      if (pruned.length !== recentRecords.length) {
        setRecentRecords(pruned);
      }
    }
  }, [items]);

  // Strict verified administrator authorization check
  const isRealAdmin = useMemo(() => {
    return (
      user.isLoggedIn &&
      user.role === 'admin' &&
      user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()
    );
  }, [user]);

  // Search & Filter State (Restored from persistent storage)
  const [filters, setFilters] = useState<SearchFilters>(() => {
    const saved = loadSavedFilters();
    return {
      query: '',
      categoryId: saved.categoryId || 'cat-all',
      tag: saved.tag || 'all',
      mediaType: saved.mediaType || 'all',
      sortBy: saved.sortBy || 'newest',
      pinnedOnly: saved.pinnedOnly || false,
    };
  });

  // Automatically persist filter settings whenever user changes category, tag, sort, etc.
  useEffect(() => {
    saveSavedFilters(filters);
  }, [filters]);

  const [viewMode, setViewMode] = useState<'grid' | 'large' | 'compact'>(() => {
    const saved = loadViewMode();
    return saved || (config.defaultViewMode as any) || 'grid';
  });

  const handleViewModeChange = (mode: 'grid' | 'large' | 'compact') => {
    setViewMode(mode);
    saveViewMode(mode);
  };

  // Persistent Card Image Fit State (Individual card overrides + Global Expand toggle)
  const [globalImageFit, setGlobalImageFit] = useState<'cover' | 'contain'>(() => loadGlobalImageFit());
  const [cardImageFits, setCardImageFits] = useState<Record<string, 'cover' | 'contain'>>(() => loadCardImageFits());

  const handleToggleCardImageFit = useCallback((itemId: string, newFit: 'cover' | 'contain') => {
    setCardImageFits((prev) => {
      const updated = { ...prev, [itemId]: newFit };
      saveCardImageFits(updated);
      return updated;
    });
  }, []);

  const handleToggleAllCardsImageFit = useCallback(() => {
    const nextFit: 'cover' | 'contain' = globalImageFit === 'cover' ? 'contain' : 'cover';
    setGlobalImageFit(nextFit);
    saveGlobalImageFit(nextFit);

    // Apply fit to all loaded items and persist
    const updatedMap: Record<string, 'cover' | 'contain'> = {};
    for (const it of items) {
      updatedMap[it.id] = nextFit;
    }
    setCardImageFits(updatedMap);
    saveCardImageFits(updatedMap);

    showToast(
      nextFit === 'contain'
        ? 'ขยายรูปภาพในการ์ดทั้งหมดแล้ว (แสดงเต็มรูปไม่ตัดขอบทุกรายการ)'
        : 'ปรับรูปภาพในการ์ดทั้งหมดเป็นขนาดมาตรฐานแล้ว (Fill Frame)'
    );
  }, [globalImageFit, items]);

  // Modal & Drawer visibility
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Floating Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Keyboard shortcut listener for fast search (Ctrl + K or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for Supabase Authentication State Changes & Sync Data
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isLoggingOutRef.current) return;
        if (session?.user) {
          const profile = mapSupabaseUserToProfile(session.user);
          if (profile) {
            setUser(profile);
            saveUser(profile);
            showToast(`${t.toasts.welcome}, ${profile.name}`);
            setIsAuthOpen(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(INITIAL_USER);
          saveUser(INITIAL_USER);
        }
      }
    );

    // Hydrate remote links from Supabase cloud database with bidirectional merge
    // Prevents deleted items from resurrecting and prevents locally added links from disappearing
    fetchItemsFromSupabase()
      .then((remoteItems) => {
        if (remoteItems) {
          const deletedIds = getDeletedItemIds();

          // Filter out any items that the user previously deleted
          const validRemote = remoteItems.filter((r) => !deletedIds.has(r.id));

          // Ensure any deleted items that still exist on Supabase are permanently deleted
          deletedIds.forEach((delId) => {
            if (remoteItems.some((r) => r.id === delId)) {
              deleteItemFromSupabase(delId).catch(() => {});
            }
          });

          setItems((currentLocalItems) => {
            // Filter local items by deletedIds
            const validLocal = currentLocalItems.filter((loc) => !deletedIds.has(loc.id));
            const remoteMap = new Map(validRemote.map((r) => [r.id, r]));
            const localMap = new Map<string, MediaItem>(validLocal.map((l) => [l.id, l]));
            const userLikes = new Set(loadUserLikes(user));

            // Merge remote items with local items: KEEP the highest likesCount and viewsCount
            const mergedRemote = validRemote.map((r) => {
              const local = localMap.get(r.id);
              const isLiked = userLikes.has(r.id);
              const mergedLikes = Math.max(
                r.likesCount || 0,
                local?.likesCount || 0,
                isLiked ? 1 : 0
              );
              const mergedViews = Math.max(r.viewsCount || 0, local?.viewsCount || 0);

              // If local had more likes than Supabase, update Supabase
              if (mergedLikes > (r.likesCount || 0)) {
                updateItemLikesInSupabase(r.id, mergedLikes).catch(() => {});
              }

              return {
                ...r,
                likesCount: mergedLikes,
                viewsCount: mergedViews,
              };
            });

            // Only consider items that are truly custom local creations (NOT initial template items)
            const localOnly = validLocal
              .filter((loc) => !remoteMap.has(loc.id) && !INITIAL_ITEMS.some((init) => init.id === loc.id))
              .map((loc) => ({
                ...loc,
                likesCount: Math.max(loc.likesCount || 0, userLikes.has(loc.id) ? 1 : 0),
              }));

            // Automatically sync any custom local-only items up to Supabase
            if (localOnly.length > 0) {
              localOnly.forEach((item) => {
                saveItemToSupabase(item).catch(() => {});
              });
            }

            // Combine remote items with custom local items
            const combined = [...mergedRemote, ...localOnly];

            // Maintain sorting & pinning
            combined.sort((a, b) => {
              if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            const numbered = assignSequentialItemNumbers(combined);
            saveItems(numbered);
            return numbered;
          });
        }
      })
      .catch((err) => {
        console.warn('Supabase remote fetch warning:', err);
      });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [t]);

  // Dynamically update browser tab favicon and title from config
  useEffect(() => {
    const iconUrl = config.faviconUrl || config.logoUrl;
    if (iconUrl) {
      let link = document.getElementById('app-favicon') as HTMLLinkElement;
      if (!link) {
        link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      }
      if (link) {
        link.href = iconUrl;
      }
    }
    if (config.vaultName) {
      document.title = config.vaultName;
    }
  }, [config.faviconUrl, config.logoUrl, config.vaultName]);

  // Hydrate categories, tags, and config from Supabase cloud database
  useEffect(() => {
    // 1. Categories sync - Supabase is the cloud source of truth
    fetchCategoriesFromSupabase()
      .then((remoteCats) => {
        if (remoteCats && remoteCats.length > 0) {
          const deletedCats = getDeletedCategoryIds();
          const validRemote = remoteCats.filter((c) => !deletedCats.has(c.id));

          // Ensure any locally deleted categories that still exist in Supabase are purged
          deletedCats.forEach((delId) => {
            if (remoteCats.some((c) => c.id === delId)) {
              deleteCategoryFromSupabase(delId).catch(() => {});
            }
          });

          // Supabase is authoritative: never re-upload localOnly back to Supabase
          setCategories(validRemote);
          saveCategories(validRemote);
        }
      })
      .catch((err) => console.warn('Categories sync warning:', err));

    // 2. Tags sync - Supabase is the cloud source of truth
    fetchTagsFromSupabase()
      .then((remoteTags) => {
        if (remoteTags && remoteTags.length > 0) {
          const deletedTags = getDeletedTagIds();
          const validRemote = remoteTags.filter((t) => !deletedTags.has(t.id));

          // Ensure any locally deleted tags that still exist in Supabase are purged
          deletedTags.forEach((delId) => {
            if (remoteTags.some((t) => t.id === delId)) {
              deleteTagFromSupabase(delId).catch(() => {});
            }
          });

          // Supabase is authoritative: never re-upload localOnly back to Supabase
          setTags(validRemote);
          saveTags(validRemote);
        }
      })
      .catch((err) => console.warn('Tags sync warning:', err));

    // 3. Visual & System Config sync across all devices
    fetchConfigFromSupabase()
      .then((remoteCfg) => {
        if (remoteCfg && Object.keys(remoteCfg).length > 0) {
          setConfig((currentCfg) => {
            const merged = { ...currentCfg, ...remoteCfg };
            saveConfig(merged);
            return merged;
          });
        } else {
          // If remote cloud has no config yet, but this device (e.g. PC admin) has custom slides or settings,
          // push to Supabase immediately so other devices (e.g. iPad) can receive it!
          const localStored = loadConfig();
          if (localStored && (localStored.bannerSlides?.length || localStored.bannerBgUrl || localStored.bannerSubtitle)) {
            saveConfigToSupabase(localStored).catch(() => {});
          }
        }
      })
      .catch((err) => console.warn('Config fetch warning:', err));

    // 4. Supabase Realtime Live Synchronization (PC <-> iPad <-> Mobile)
    const realtimeItemsChannel = supabase
      .channel('vault_realtime_items_and_config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vault_items' },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow && newRow.id === SYSTEM_CONFIG_ITEM_ID) {
            try {
              if (newRow.description) {
                const parsedConfig = JSON.parse(newRow.description);
                if (parsedConfig && typeof parsedConfig === 'object') {
                  setConfig((currentCfg) => {
                    const merged = { ...currentCfg, ...parsedConfig };
                    saveConfig(merged);
                    return merged;
                  });
                  showToast('🔄 ซิงค์การตั้งค่าแบนเนอร์และระบบล่าสุดจาก Cloud แล้ว (Live Synced)');
                }
              }
            } catch (err) {
              console.warn('Realtime config parse error:', err);
            }
          }
        }
      )
      .subscribe();

    const realtimeConfigTableChannel = supabase
      .channel('vault_realtime_config_table')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vault_config' },
        () => {
          fetchConfigFromSupabase().then((remoteCfg) => {
            if (remoteCfg) {
              setConfig((currentCfg) => {
                const merged = { ...currentCfg, ...remoteCfg };
                saveConfig(merged);
                return merged;
              });
              showToast('🔄 ซิงค์การตั้งค่าแบนเนอร์ล่าสุดจาก Cloud แล้ว (Live Synced)');
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeItemsChannel);
      supabase.removeChannel(realtimeConfigTableChannel);
    };
  }, []);

  // Intelligent Google-grade Search offloaded to Web Worker to keep main thread at 60-120 FPS
  const [searchResult, setSearchResult] = useState<IntelligentSearchResult>(() => {
    return {
      items,
      matchReasons: {},
      exactIdMatch: null,
      totalMatches: items.length,
    };
  });

  useEffect(() => {
    let isCancelled = false;
    const q = filters.query.trim();

    if (!q) {
      setSearchResult({
        items,
        matchReasons: {},
        exactIdMatch: null,
        totalMatches: items.length,
      });
      return;
    }

    runIntelligentSearch(items, q).then((res) => {
      if (!isCancelled) {
        setSearchResult(res);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [items, filters.query]);

  // Filtered & Fuzzy Searched Items Memo
  const filteredItems = useMemo(() => {
    let result = filters.query.trim() ? [...searchResult.items] : [...items];

    // 2. Category filter
    if (filters.categoryId !== 'all' && filters.categoryId !== 'cat-all') {
      result = result.filter((item) => item.categoryId === filters.categoryId);
    }

    // 3. Media type filter
    if (filters.mediaType !== 'all') {
      result = result.filter((item) => item.mediaType === filters.mediaType);
    }

    // 4. Tag filter
    if (filters.tag !== 'all') {
      result = result.filter((item) => item.tags.includes(filters.tag));
    }

    // 5. Pinned only filter
    if (filters.pinnedOnly) {
      result = result.filter((item) => item.isPinned);
    }

    // 6. Sorting logic
    result.sort((a, b) => {
      // If user typed an exact ID number (e.g. 45 or #45), that card ALWAYS stays #1 at top!
      if (searchResult.exactIdMatch) {
        if (a.id === searchResult.exactIdMatch.id) return -1;
        if (b.id === searchResult.exactIdMatch.id) return 1;
      }

      // When search query is active and default sort ('newest') is active,
      // preserve intelligent relevance score order!
      if (filters.query.trim() && filters.sortBy === 'newest') {
        return 0;
      }

      // In normal view without search query, pinned items rise to the top
      if (!filters.query.trim() && a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'views':
          return (b.viewsCount || 0) - (a.viewsCount || 0);
        case 'likes':
          return (b.likesCount || 0) - (a.likesCount || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [items, filters, searchResult]);

  // Virtualized progressive windowing for 60-120 FPS rendering on Safari & iPad
  const [visibleCount, setVisibleCount] = useState(18);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination window when filters change
  useEffect(() => {
    setVisibleCount(18);
  }, [filters]);

  // Infinite progressive loading via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 12, filteredItems.length));
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredItems.length]);

  const renderedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  // Category counts memo
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Comment counts map
  const commentCountsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    comments.forEach((c) => {
      counts[c.itemId] = (counts[c.itemId] || 0) + 1;
    });
    return counts;
  }, [comments]);

  // Handlers - Intelligent Viewing & Interaction Tracker (Memoized for zero scroll jitter)
  const handleRecordView = useCallback((item: MediaItem) => {
    // 1. Record recently viewed with incremental viewCount & chronological ordering
    const updatedRecords = recordRecentlyViewed(item.id);
    setRecentRecords(updatedRecords);

    // 2. Increment local item viewsCount
    const newViewsCount = (item.viewsCount || 0) + 1;
    setItems((prevItems) => {
      const updated = prevItems.map((i) =>
        i.id === item.id ? { ...i, viewsCount: newViewsCount } : i
      );
      saveItems(updated);
      return updated;
    });

    // 3. Patch view count directly to Supabase Cloud
    updateItemViewsInSupabase(item.id, newViewsCount).catch(() => {});

    return newViewsCount;
  }, []);

  const handleOpenPreview = useCallback((item: MediaItem) => {
    const newViewsCount = handleRecordView(item);
    setPreviewItem({ ...item, viewsCount: newViewsCount });
  }, [handleRecordView]);

  // 1 Account = 1 Like Toggle System (Click to like, click again to remove like)
  const handleLikeItem = useCallback((itemId: string) => {
    setUserLikedItemIds((prevSet) => {
      const isCurrentlyLiked = prevSet.has(itemId);
      const nextLikesSet = new Set<string>(prevSet);

      if (isCurrentlyLiked) {
        nextLikesSet.delete(itemId);
        showToast('🤍 ยกเลิกการถูกใจแล้ว (-1)');
      } else {
        nextLikesSet.add(itemId);
        showToast('❤️ กดถูกใจรายการแล้ว (+1)');
      }

      saveUserLikes(user, Array.from(nextLikesSet));

      // Calculate the exact target likes count deterministically
      setItems((prevItems) => {
        let finalLikesCount = 0;
        const updated = prevItems.map((i) => {
          if (i.id === itemId) {
            const currentCount = i.likesCount || 0;
            finalLikesCount = isCurrentlyLiked 
              ? Math.max(0, currentCount - 1)
              : Math.max(1, currentCount + 1);
            return { ...i, likesCount: finalLikesCount };
          }
          return i;
        });

        saveItems(updated);

        // Sync likes count directly to Supabase Cloud with guaranteed count
        updateItemLikesInSupabase(itemId, finalLikesCount).catch((e) => {
          console.warn('Supabase likes count update notice:', e);
        });

        return updated;
      });

      // Update active modal preview item if open
      setPreviewItem((prev) => {
        if (!prev || prev.id !== itemId) return prev;
        const currentCount = prev.likesCount || 0;
        const nextCount = isCurrentlyLiked ? Math.max(0, currentCount - 1) : Math.max(1, currentCount + 1);
        return { ...prev, likesCount: nextCount };
      });

      return nextLikesSet;
    });
  }, [user]);

  // Toggle Bookmark Handler (Add/Remove from user's personal bookmarks)
  const handleToggleBookmark = useCallback((itemId: string) => {
    setUserBookmarkedItemIds((prev) => {
      const isBookmarked = prev.has(itemId);
      const nextSet = new Set<string>(prev);
      if (isBookmarked) {
        nextSet.delete(itemId);
        showToast('🔖 ยกเลิกการบุ๊กมาร์กแล้ว');
      } else {
        nextSet.add(itemId);
        showToast('🔖 บันทึกลงบุ๊กมาร์กเรียบร้อยแล้ว');
      }
      saveUserBookmarks(user, Array.from(nextSet));
      return nextSet;
    });
  }, [user]);

  // Stable handlers for editing and tags to ensure MediaCard memoization
  const handleEditItem = useCallback((it: MediaItem) => {
    setEditingItem(it);
    setIsAddEditOpen(true);
  }, []);

  const handleSelectTag = useCallback((tg: string) => {
    setFilters((prev) => ({ ...prev, tag: tg }));
  }, []);

  // Toggle Top 10 Popular Posts Slider (minimize/collapse to prevent clutter)
  const handleToggleTopTenCollapse = () => {
    setIsTopTenCollapsed((prev) => {
      const next = !prev;
      saveTopTenCollapsed(next);
      showToast(next ? 'ซ่อนแถบ 10 อันดับโพสต์ยอดนิยมแล้ว' : 'แสดงแถบ 10 อันดับโพสต์ยอดนิยม');
      return next;
    });
  };

  const handleRemoveRecentItem = (itemId: string) => {
    const updated = removeRecentlyViewedItem(itemId);
    setRecentRecords(updated);
    showToast('ลบรายการออกจากประวัติแล้ว');
  };

  const handleClearHistory = () => {
    clearRecentlyViewed();
    setRecentRecords([]);
    showToast('ล้างประวัติการเข้าชมทั้งหมดแล้ว');
  };

  const handleTogglePin = useCallback((itemId: string) => {
    if (!isRealAdmin) {
      showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
      return;
    }
    setItems((prevItems) => {
      const updated = prevItems.map((i) =>
        i.id === itemId ? { ...i, isPinned: !i.isPinned } : i
      );
      saveItems(updated);
      return updated;
    });
    showToast(t.toasts.pinUpdated);
  }, [isRealAdmin, t.toasts.permissionDenied, t.toasts.pinUpdated]);

  const handleDeleteItem = useCallback((itemId: string) => {
    if (!isRealAdmin) {
      showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
      return;
    }
    markItemAsDeleted(itemId);
    setItems((prevItems) => {
      const updated = prevItems.filter((i) => i.id !== itemId);
      saveItems(updated);
      return updated;
    });
    deleteItemFromSupabase(itemId).catch((e) => console.warn('Supabase delete sync notice:', e));
    setPreviewItem((prev) => (prev?.id === itemId ? null : prev));
    showToast(t.toasts.entryRemoved);
  }, [isRealAdmin, t.toasts.permissionDenied, t.toasts.entryRemoved]);

  const handleSaveLink = (data: Partial<MediaItem>) => {
    if (!isRealAdmin) {
      showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
      return;
    }

    if (editingItem) {
      // Update existing
      const updatedItem: MediaItem = {
        ...editingItem,
        ...data,
        itemNumber: editingItem.itemNumber || data.itemNumber || 1,
        updatedAt: new Date().toISOString(),
      };
      const updated = items.map((i) => (i.id === editingItem.id ? updatedItem : i));
      const numbered = assignSequentialItemNumbers(updated);
      setItems(numbered);
      saveItems(numbered);
      saveItemToSupabase(updatedItem).catch((e) => console.warn('Supabase update sync notice:', e));
      showToast(t.toasts.linkUpdated);
    } else {
      // Create new with sequential itemNumber
      const nextItemNumber = Math.max(0, ...items.map((i) => i.itemNumber || 0)) + 1;
      const newItem: MediaItem = {
        id: `vault-item-${Date.now()}`,
        itemNumber: data.itemNumber || nextItemNumber,
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
      const numbered = assignSequentialItemNumbers(updated);
      setItems(numbered);
      saveItems(numbered);
      saveItemToSupabase(newItem).catch((e) => console.warn('Supabase insert sync notice:', e));
      showToast(t.toasts.newLinkVaulted);
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
      isAdmin: isRealAdmin,
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    const updated = [newComment, ...comments];
    setComments(updated);
    saveComments(updated);
    showToast(t.toasts.commentPublished);
  };

  const handleDeleteComment = (commentId: string) => {
    const target = comments.find((c) => c.id === commentId);
    const canDelete =
      isRealAdmin ||
      (user.isLoggedIn &&
        target?.authorEmail &&
        user.email.toLowerCase().trim() === target.authorEmail.toLowerCase().trim());

    if (!canDelete) {
      showToast(t.toasts.permissionDenied);
      return;
    }

    const updated = comments.filter((c) => c.id !== commentId);
    setComments(updated);
    saveComments(updated);
    showToast(t.toasts.commentDeleted);
  };

  const handleAddCategory = (catData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...catData,
      id: `cat-${Date.now()}`,
    };
    const updated = [...categories, newCategory];
    setCategories(updated);
    saveCategories(updated);
    showToast(`Category "${newCategory.name}" created`);
    saveCategoryToSupabase(newCategory).catch(() => {});
  };

  const handleUpdateCategory = (cat: Category) => {
    const updated = categories.map((c) => (c.id === cat.id ? cat : c));
    setCategories(updated);
    saveCategories(updated);
    showToast(`Category "${cat.name}" updated`);
    saveCategoryToSupabase(cat).catch(() => {});
  };

  const handleDeleteCategory = (catId: string) => {
    if (catId === 'cat-all') {
      showToast('Default category cannot be removed');
      return;
    }
    markCategoryAsDeleted(catId);
    const updated = categories.filter((c) => c.id !== catId);
    setCategories(updated);
    saveCategories(updated);
    if (filters.categoryId === catId) {
      setFilters((prev) => ({ ...prev, categoryId: 'cat-all' }));
    }
    showToast('Category deleted');
    deleteCategoryFromSupabase(catId).catch(() => {});
  };

  const handleAddTag = (tagData: Omit<Tag, 'id'>) => {
    const newTag: Tag = {
      ...tagData,
      id: `tag-${Date.now()}`,
    };
    const updated = [...tags, newTag];
    setTags(updated);
    saveTags(updated);
    showToast(`Tag #${newTag.name} created`);
    saveTagToSupabase(newTag).catch(() => {});
  };

  const handleUpdateTag = (tag: Tag) => {
    const updated = tags.map((t) => (t.id === tag.id ? tag : t));
    setTags(updated);
    saveTags(updated);
    showToast(`Tag #${tag.name} updated`);
    saveTagToSupabase(tag).catch(() => {});
  };

  const handleDeleteTag = (tagId: string) => {
    markTagAsDeleted(tagId);
    const targetTag = tags.find((t) => t.id === tagId);
    const updated = tags.filter((t) => t.id !== tagId);
    setTags(updated);
    saveTags(updated);
    if (targetTag && filters.tag === targetTag.name) {
      setFilters((prev) => ({ ...prev, tag: 'all' }));
    }
    showToast('Tag deleted');
    deleteTagFromSupabase(tagId).catch(() => {});
  };

  const handleSaveConfig = async (newConfig: SystemConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    showToast('กำลังบันทึกและซิงค์ข้อมูลขึ้น Cloud...');
    try {
      const ok = await saveConfigToSupabase(newConfig);
      if (ok) {
        showToast('✅ ซิงค์การตั้งค่าขึ้น Cloud เรียบร้อยแล้ว (เชื่อมต่อทุกอุปกรณ์)');
      } else {
        showToast('บันทึกในเครื่องเรียบร้อย (ระบบจะซิงค์ให้อัตโนมัติ)');
      }
    } catch (e) {
      console.warn('saveConfig error:', e);
    }
  };

  const handleUpdateSlidePosition = (slideId: string, posX: number, posY: number, scale?: number) => {
    const currentSlides = config.bannerSlides && config.bannerSlides.length > 0
      ? config.bannerSlides
      : [
          {
            id: 'slide-1',
            imageUrl: config.bannerBgUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80',
            title: config.bannerTitle || config.vaultName || 'OBSIDIAN VAULT',
            subtitle: config.bannerSubtitle || config.vaultTagline || '',
            badge: config.bannerBadge || 'คลังไซเบอร์ความเร็วสูง',
            positionX: 50,
            positionY: 50,
            scale: 1.0,
            fitMode: 'cover',
            overlayOpacity: config.bannerOverlayOpacity ?? 0.70,
          },
        ];

    const updatedSlides = currentSlides.map((s) =>
      s.id === slideId ? { ...s, positionX: posX, positionY: posY, ...(scale ? { scale } : {}) } : s
    );

    const updatedConfig: SystemConfig = {
      ...config,
      bannerSlides: updatedSlides,
      ...(updatedSlides[0]?.id === slideId
        ? {
            bannerBgUrl: updatedSlides[0].imageUrl,
            bannerTitle: updatedSlides[0].title,
            bannerSubtitle: updatedSlides[0].subtitle,
            bannerBadge: updatedSlides[0].badge,
          }
        : {}),
    };

    handleSaveConfig(updatedConfig);
    showToast('บันทึกตำแหน่งจัดวางภาพเรียบร้อยแล้ว (Slide Position Saved)');
  };

  const handleResetSampleData = () => {
    if (window.confirm('Reset all vault links, categories and comments to initial defaults?')) {
      resetAllData();
      setItems(loadItems());
      setCategories(loadCategories());
      setTags(loadTags());
      setComments(loadComments());
      setConfig(loadConfig());
      showToast('Vault restored to default showcase state');
    }
  };

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    saveUser(newUser);
    showToast(`Welcome back, ${newUser.name}`);
  };

  const handleLogout = () => {
    isLoggingOutRef.current = true;

    // 1. Immediately reset state synchronously in React
    setUser(INITIAL_USER);
    saveUser(INITIAL_USER);

    // 2. Close all open overlays
    setIsProfileOpen(false);
    setIsAdminOpen(false);
    setIsMobileMenuOpen(false);
    setIsAuthOpen(false);

    // 3. Clear Supabase auth in background
    signOutSupabaseAuth()
      .catch((e) => console.warn('Logout background error:', e))
      .finally(() => {
        setTimeout(() => {
          isLoggingOutRef.current = false;
        }, 1500);
      });

    showToast(t.nav?.signOut || 'ออกจากระบบเรียบร้อยแล้ว (Signed Out)');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const focusSearchInput = () => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#090a0f] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Sleek Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-panel border border-cyan-500/50 shadow-2xl text-xs font-semibold text-cyan-300 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAddLink={() => {
          if (isRealAdmin) {
            setEditingItem(null);
            setIsAddEditOpen(true);
          } else {
            showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
          }
        }}
        onOpenAdmin={() => {
          if (isRealAdmin) {
            setIsAdminOpen(true);
          } else {
            showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
          }
        }}
        onOpenRecent={() => setIsRecentOpen(true)}
        recentCount={validRecentRecords.length}
        searchQuery={filters.query}
        onSearchChange={(q) => setFilters({ ...filters, query: q })}
        vaultName={config.vaultName}
        logoUrl={config.logoUrl}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Main Container Area - Responsive for Mobile, Tablet, Laptop, Desktop, and Smart TVs */}
      <main className="flex-1 w-full max-w-7xl 2xl:max-w-[1700px] 3xl:max-w-[2000px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20 md:pb-8 overflow-x-hidden">
        
        {/* Top Hero Banner Slider with Free Mouse Drag Repositioning & Smooth Transitions */}
        {config.showBanner !== false && (
          <HeroBanner
            config={config}
            isRealAdmin={isRealAdmin}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenAddLink={() => {
              setEditingItem(null);
              setIsAddEditOpen(true);
            }}
            onUpdateSlidePosition={handleUpdateSlidePosition}
          />
        )}

        {/* 10 อันดับโพสต์ยอดนิยม (Top 10 Most Liked Posts with Toggle/Collapse) */}
        <TopTenSlider
          items={items}
          categories={categories}
          user={user}
          userLikedItemIds={userLikedItemIds}
          userBookmarkedItemIds={userBookmarkedItemIds}
          isCollapsed={isTopTenCollapsed}
          onToggleCollapse={handleToggleTopTenCollapse}
          onPreview={handleOpenPreview}
          onLike={handleLikeItem}
          onToggleBookmark={handleToggleBookmark}
        />

        {/* Multi-Filters & Taxonomy Bar */}
        <FilterBar
          categories={categories}
          tags={tags}
          filters={filters}
          onFilterChange={setFilters}
          categoryCounts={categoryCounts}
          totalItemCount={items.length}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          allCardsExpanded={globalImageFit === 'contain'}
          onToggleAllCardsImageFit={handleToggleAllCardsImageFit}
        />

        {/* Intelligent Search Feedback Bar: ID Match, Did-you-mean, Auto-correct, and Typo Handling */}
        {filters.query.trim() && (
          <div className="rounded-2xl bg-[#0d131f]/90 border border-cyan-500/30 p-3 sm:p-4 text-xs space-y-2 backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
                <span className="text-slate-300">
                  {t.filters.searchResultsFor}{' '}
                  <strong className="font-mono text-cyan-200 font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    "{filters.query}"
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-medium">
                  {filteredItems.length} {t.filters.matchesFound}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, query: '' })}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  ล้างค้นหา
                </button>
              </div>
            </div>

            {/* Exact ID Match Notification */}
            {searchResult.exactIdMatch && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-[11px] sm:text-xs text-emerald-300 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                  🎯 รหัส #{searchResult.exactIdMatch.itemNumber}
                </span>
                <span className="truncate">
                  พบการ์ดตรงกับรหัสโพสต์ #{searchResult.exactIdMatch.itemNumber} นำขึ้นแสดงเป็นอันดับ 1 ทันที
                </span>
              </div>
            )}

            {/* Google-grade "Did you mean?" suggestion */}
            {searchResult.suggestedQuery && !searchResult.isAutoCorrected && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-xs text-amber-300">
                <span>คุณหมายถึง:</span>
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, query: searchResult.suggestedQuery! })}
                  className="font-bold underline text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                >
                  {searchResult.suggestedQuery}
                </button>
                <span className="text-slate-400">ใช่หรือไม่?</span>
              </div>
            )}

            {/* Auto-corrected fallback notification */}
            {searchResult.isAutoCorrected && searchResult.suggestedQuery && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-xs text-slate-300">
                <span className="text-cyan-300">แสดงผลลัพธ์ใกล้เคียงสำหรับ:</span>
                <strong className="font-bold text-cyan-200 font-mono">
                  {searchResult.suggestedQuery}
                </strong>
                <span className="text-slate-400">
                  (ไม่พบคำว่า "{filters.query}" ตรงตัว จึงค้นหาคำที่ใกล้เคียงที่สุดให้โดยอัตโนมัติ)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Media Bookmarks Grid / List - Fluid Cross-Device Breakpoints */}
        {filteredItems.length === 0 ? (
          <div className="rounded-3xl glass-panel p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 border border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-200">{t.empty.noEntries}</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {t.empty.noEntriesDesc}
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
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 transition-colors touch-target"
            >
              {t.empty.resetFilters}
            </button>
          </div>
        ) : (
          <>
            <div className={
              viewMode === 'large'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6 sm:gap-8'
                : viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5 sm:gap-6'
                : 'space-y-4'
            }>
              {renderedItems.map((item) => {
                const category = categories.find((c) => c.id === item.categoryId);
                const itemImageFit = cardImageFits[item.id] ?? globalImageFit;
                return (
                  <div key={item.id} className="virtual-card-item">
                    <MediaCard
                      item={item}
                      category={category}
                      user={user}
                      commentCount={commentCountsMap[item.id] || 0}
                      isLiked={userLikedItemIds.has(item.id)}
                      isBookmarked={userBookmarkedItemIds.has(item.id)}
                      viewMode={viewMode}
                      imageFit={itemImageFit}
                      matchReason={searchResult.matchReasons[item.id]}
                      onToggleImageFit={handleToggleCardImageFit}
                      onPreview={handleOpenPreview}
                      onLike={handleLikeItem}
                      onToggleBookmark={handleToggleBookmark}
                      onRecordView={handleRecordView}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                      onTogglePin={handleTogglePin}
                      onSelectTag={handleSelectTag}
                    />
                  </div>
                );
              })}
            </div>

            {/* Virtualization Sentinel & Progressive Loader */}
            {renderedItems.length < filteredItems.length && (
              <div 
                ref={sentinelRef}
                className="w-full py-8 flex flex-col items-center justify-center space-y-2 text-xs text-slate-400"
              >
                <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-slate-500">
                    {renderedItems.length} / {filteredItems.length} {t.filters.matchesFound}
                  </span>
                  <button
                    onClick={() => setVisibleCount(filteredItems.length)}
                    className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Load all
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-8 mt-8 text-center text-xs text-slate-500 space-y-2 pb-24 md:pb-8">
        <p className="font-mono text-[11px] text-slate-400">
          {config.vaultName || t.common.appName} • {t.footer.rights}
        </p>
        <p className="text-[11px] text-slate-600 max-w-xl mx-auto px-4">
          {t.footer.tagline}
        </p>
      </footer>

      {/* Mobile Bottom Navigation Bar (Smartphones & Handhelds) */}
      <BottomNavBar
        user={user}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenRecent={() => setIsRecentOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAddLink={() => {
          if (isRealAdmin) {
            setEditingItem(null);
            setIsAddEditOpen(true);
          } else {
            showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
          }
        }}
        onOpenAdmin={() => {
          if (isRealAdmin) {
            setIsAdminOpen(true);
          } else {
            showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
          }
        }}
        onScrollToTop={scrollToTop}
        onFocusSearch={focusSearchInput}
        recentCount={validRecentRecords.length}
      />

      {/* Mobile Slide-out Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        onOpenAddLink={() => {
          if (isRealAdmin) {
            setEditingItem(null);
            setIsAddEditOpen(true);
          } else {
            showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
          }
        }}
        onOpenAdmin={() => {
          if (isRealAdmin) {
            setIsAdminOpen(true);
          } else {
            showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
          }
        }}
        onOpenRecent={() => setIsRecentOpen(true)}
        recentCount={validRecentRecords.length}
      />

      {/* Embedded Media Viewer Modal */}
      <React.Suspense fallback={null}>
        {previewItem && (
          <EmbeddedMediaViewer
            item={previewItem}
            user={user}
            comments={comments.filter((c) => c.itemId === previewItem.id)}
            isLiked={userLikedItemIds.has(previewItem.id)}
            isBookmarked={userBookmarkedItemIds.has(previewItem.id)}
            onClose={() => setPreviewItem(null)}
            onLike={handleLikeItem}
            onToggleBookmark={handleToggleBookmark}
            onAddComment={handleAddComment}
            onDeleteComment={isRealAdmin ? handleDeleteComment : undefined}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {/* Add / Edit Link Modal (Restricted strictly to verified Admin) */}
        {isAddEditOpen && isRealAdmin && (
          <AddEditLinkModal
            initialItem={editingItem}
            categories={categories}
            tags={tags}
            currentUser={user}
            onSave={handleSaveLink}
            onClose={() => {
              setIsAddEditOpen(false);
              setEditingItem(null);
            }}
          />
        )}

        {/* Admin Command Nexus Dashboard (Restricted strictly to verified Admin) */}
        {isAdminOpen && isRealAdmin && (
          <AdminDashboard
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            currentUser={user}
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
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddTag={handleAddTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
            onDeleteComment={handleDeleteComment}
            onResetSampleData={handleResetSampleData}
            onLogout={handleLogout}
          />
        )}

        {/* Recently Viewed Links Drawer */}
        {isRecentOpen && (
          <RecentlyViewedDrawer
            isOpen={isRecentOpen}
            onClose={() => setIsRecentOpen(false)}
            recentRecords={validRecentRecords}
            allItems={items}
            onPreview={handleOpenPreview}
            onRecordView={handleRecordView}
            onRemoveItem={handleRemoveRecentItem}
            onClearHistory={handleClearHistory}
          />
        )}

        {/* Identity / Authentication Modal */}
        {isAuthOpen && (
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            currentUser={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        )}

        {/* User Profile & Activity Modal (Liked, Bookmarked, Comments) */}
        {isProfileOpen && (
          <UserProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            user={user}
            items={items}
            comments={comments}
            userLikedItemIds={userLikedItemIds}
            userBookmarkedItemIds={userBookmarkedItemIds}
            onPreview={handleOpenPreview}
            onPreviewItem={handleOpenPreview}
            onLike={handleLikeItem}
            onUnlike={handleLikeItem}
            onToggleBookmark={handleToggleBookmark}
            onUnbookmark={handleToggleBookmark}
            onDeleteComment={handleDeleteComment}
            onLogout={handleLogout}
            onOpenAuth={() => {
              setIsProfileOpen(false);
              setIsAuthOpen(true);
            }}
          />
        )}
      </React.Suspense>

      {/* Floating Scroll Navigation (Scroll to Top / Scroll to Bottom) */}
      <ScrollNavigation />

    </div>
  );
}
