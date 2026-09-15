import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  markTagAsDeleted
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
import { fuzzySearchMedia } from './utils/fuzzySearch';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { MediaCard } from './components/MediaCard';
import { EmbeddedMediaViewer } from './components/EmbeddedMediaViewer';
import { AddEditLinkModal } from './components/AddEditLinkModal';
import { AdminDashboard } from './components/AdminDashboard';
import { RecentlyViewedDrawer } from './components/RecentlyViewedDrawer';
import { AuthModal } from './components/AuthModal';
import { MobileDrawer } from './components/MobileDrawer';
import { BottomNavBar } from './components/BottomNavBar';
import { HeroBanner } from './components/HeroBanner';
import { useTranslation } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';

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

  // Synchronize liked items whenever user identity or login status changes
  useEffect(() => {
    setUserLikedItemIds(new Set(loadUserLikes(user)));
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

            // Only consider items that are truly custom local creations (NOT initial template items)
            const localOnly = validLocal.filter(
              (loc) => !remoteMap.has(loc.id) && !INITIAL_ITEMS.some((init) => init.id === loc.id)
            );

            // Automatically sync any custom local-only items up to Supabase
            if (localOnly.length > 0) {
              localOnly.forEach((item) => {
                saveItemToSupabase(item).catch(() => {});
              });
            }

            // Combine remote items with custom local items
            const combined = [...validRemote, ...localOnly];

            // Maintain sorting & pinning
            combined.sort((a, b) => {
              if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            saveItems(combined);
            return combined;
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

  // Filtered & Fuzzy Searched Items Memo
  const filteredItems = useMemo(() => {
    let result = [...items];

    // 1. Fuzzy query filter
    if (filters.query.trim()) {
      result = fuzzySearchMedia(result, filters.query.trim());
    }

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
      // Pinned items always rise to the top unless specifically sorting differently
      if (a.isPinned !== b.isPinned) {
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
  }, [items, filters]);

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

  // Handlers - Intelligent Viewing & Interaction Tracker
  const handleRecordView = (item: MediaItem) => {
    // 1. Record recently viewed with incremental viewCount & chronological ordering
    const updatedRecords = recordRecentlyViewed(item.id);
    setRecentRecords(updatedRecords);

    // 2. Increment local item viewsCount
    const newViewsCount = (item.viewsCount || 0) + 1;
    const updated = items.map((i) =>
      i.id === item.id ? { ...i, viewsCount: newViewsCount } : i
    );
    setItems(updated);
    saveItems(updated);

    // 3. Patch view count directly to Supabase Cloud
    updateItemViewsInSupabase(item.id, newViewsCount).catch(() => {});

    return newViewsCount;
  };

  const handleOpenPreview = (item: MediaItem) => {
    const newViewsCount = handleRecordView(item);
    setPreviewItem({ ...item, viewsCount: newViewsCount });
  };

  // 1 Account = 1 Like Toggle System (Click to like, click again to remove like)
  const handleLikeItem = (itemId: string) => {
    const isLiked = userLikedItemIds.has(itemId);
    const nextLikesSet = new Set<string>(userLikedItemIds);

    let delta = 0;
    if (isLiked) {
      // Toggle OFF (Unlike)
      nextLikesSet.delete(itemId);
      delta = -1;
      showToast('🤍 ยกเลิกการถูกใจแล้ว (-1)');
    } else {
      // Toggle ON (Like)
      nextLikesSet.add(itemId);
      delta = 1;
      showToast('❤️ กดถูกใจรายการแล้ว (+1)');
    }

    // Persist per-account / per-device like state
    setUserLikedItemIds(nextLikesSet);
    saveUserLikes(user, Array.from(nextLikesSet));

    // Update item likes count
    let newLikesCount = 0;
    const updated = items.map((i) => {
      if (i.id === itemId) {
        newLikesCount = Math.max(0, (i.likesCount || 0) + delta);
        return { ...i, likesCount: newLikesCount };
      }
      return i;
    });

    setItems(updated);
    saveItems(updated);

    // Sync likes count directly to Supabase Cloud
    updateItemLikesInSupabase(itemId, newLikesCount).catch((e) => {
      console.warn('Supabase likes count update notice:', e);
    });

    // Update active modal preview item if open
    if (previewItem && previewItem.id === itemId) {
      setPreviewItem((prev) => (prev ? { ...prev, likesCount: newLikesCount } : null));
    }
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

  const handleTogglePin = (itemId: string) => {
    if (!isRealAdmin) {
      showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
      return;
    }
    const updated = items.map((i) =>
      i.id === itemId ? { ...i, isPinned: !i.isPinned } : i
    );
    setItems(updated);
    saveItems(updated);
    showToast(t.toasts.pinUpdated);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!isRealAdmin) {
      showToast(`${t.toasts.permissionDenied} (${ADMIN_EMAIL})`);
      return;
    }
    markItemAsDeleted(itemId);
    const updated = items.filter((i) => i.id !== itemId);
    setItems(updated);
    saveItems(updated);
    deleteItemFromSupabase(itemId).catch((e) => console.warn('Supabase delete sync notice:', e));
    if (previewItem?.id === itemId) setPreviewItem(null);
    showToast(t.toasts.entryRemoved);
  };

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
        updatedAt: new Date().toISOString(),
      };
      const updated = items.map((i) => (i.id === editingItem.id ? updatedItem : i));
      setItems(updated);
      saveItems(updated);
      saveItemToSupabase(updatedItem).catch((e) => console.warn('Supabase update sync notice:', e));
      showToast(t.toasts.linkUpdated);
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

  const handleLogout = async () => {
    await signOutSupabaseAuth();
    setUser(INITIAL_USER);
    saveUser(INITIAL_USER);
    showToast('Signed out of Obsidian Vault');
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
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      
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
      <main className="flex-1 w-full max-w-7xl 2xl:max-w-[1700px] 3xl:max-w-[2000px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20 md:pb-8">
        
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
              {t.filters.searchResultsFor} <strong className="font-mono text-white">"{filters.query}"</strong>
            </span>
            <span className="font-mono">({filteredItems.length} {t.filters.matchesFound})</span>
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
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 sm:gap-6'
                : 'space-y-4'
            }>
              {renderedItems.map((item) => {
                const category = categories.find((c) => c.id === item.categoryId);
                return (
                  <MediaCard
                    key={item.id}
                    item={item}
                    category={category}
                    user={user}
                    commentCount={commentCountsMap[item.id] || 0}
                    isLiked={userLikedItemIds.has(item.id)}
                    onPreview={handleOpenPreview}
                    onLike={handleLikeItem}
                    onRecordView={handleRecordView}
                    onEdit={(it) => {
                      setEditingItem(it);
                      setIsAddEditOpen(true);
                    }}
                    onDelete={handleDeleteItem}
                    onTogglePin={handleTogglePin}
                    onSelectTag={(tg) => setFilters({ ...filters, tag: tg })}
                  />
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
      {previewItem && (
        <EmbeddedMediaViewer
          item={previewItem}
          user={user}
          comments={comments.filter((c) => c.itemId === previewItem.id)}
          isLiked={userLikedItemIds.has(previewItem.id)}
          onClose={() => setPreviewItem(null)}
          onLike={handleLikeItem}
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
        />
      )}

      {/* Recently Viewed Links Drawer */}
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
