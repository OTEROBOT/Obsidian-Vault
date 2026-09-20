import { Category, Comment, MediaItem, SearchFilters, SystemConfig, Tag, UserProfile } from '../types';
import { DEFAULT_CONFIG, INITIAL_CATEGORIES, INITIAL_COMMENTS, INITIAL_ITEMS, INITIAL_TAGS, INITIAL_USER } from '../data/initialData';
import { ADMIN_EMAIL } from './supabase';
import { decodeHtmlEntities } from './text';

const KEYS = {
  ITEMS: 'obsidian_vault_items_v1',
  CATEGORIES: 'obsidian_vault_categories_v1',
  TAGS: 'obsidian_vault_tags_v1',
  COMMENTS: 'obsidian_vault_comments_v1',
  USER: 'obsidian_vault_user_v1',
  RECENTLY_VIEWED: 'obsidian_vault_recent_v1',
  CONFIG: 'obsidian_vault_config_v1',
  DELETED_IDS: 'obsidian_vault_deleted_ids_v1',
  DELETED_CATEGORY_IDS: 'obsidian_vault_deleted_cat_ids_v1',
  DELETED_TAG_IDS: 'obsidian_vault_deleted_tag_ids_v1',
  CUSTOM_CATEGORIES: 'obsidian_vault_custom_cats_v1',
  CUSTOM_TAGS: 'obsidian_vault_custom_tags_v1',
  CARD_IMAGE_FITS: 'obsidian_vault_card_image_fits_v1',
  GLOBAL_IMAGE_FIT: 'obsidian_vault_global_image_fit_v1',
  SAVED_FILTERS: 'obsidian_vault_filters_v1',
  VIEW_MODE: 'obsidian_vault_view_mode',
};

// Safe storage wrapper that handles sandboxed iframe environments
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const memoryStorageInstance = new MemoryStorage();

function getStorage(): Storage | MemoryStorage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__vault_test_storage__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch (e) {
    // Storage access blocked or restricted in sandboxed iframe
  }
  return memoryStorageInstance;
}

const storage = getStorage();

export interface RecentlyViewedRecord {
  itemId: string;
  viewedAt: string;
  viewCount: number;
}

export function getDeletedItemIds(): Set<string> {
  try {
    const raw = storage.getItem(KEYS.DELETED_IDS);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

export function markItemAsDeleted(id: string): void {
  try {
    const ids = getDeletedItemIds();
    ids.add(id);
    storage.setItem(KEYS.DELETED_IDS, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('Failed to store deleted id:', e);
  }
}

/**
 * Assigns stable, deterministic 1-based sequential item numbers (Post #1, #2, ... #N)
 * ordered chronologically from oldest (Post #1) to newest (Post #N).
 * Guarantees every single item in the entire vault has a unique, positive integer ID.
 */
export function assignSequentialItemNumbers(items: MediaItem[]): MediaItem[] {
  if (!items || items.length === 0) return [];

  // Sort items in chronological order: oldest to newest
  const sorted = [...items].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  // Map each unique item ID to its 1-based position in history
  const idToNumberMap = new Map<string, number>();
  sorted.forEach((item, index) => {
    idToNumberMap.set(item.id, index + 1);
  });

  return items.map((item) => {
    const cleanTitle = decodeHtmlEntities(item.title);
    const cleanDesc = decodeHtmlEntities(item.description);
    return {
      ...item,
      title: cleanTitle,
      description: cleanDesc,
      itemNumber: idToNumberMap.get(item.id) || 1,
    };
  });
}

export function ensureItemNumber(item: MediaItem, existingItems?: MediaItem[]): number {
  if (typeof item.itemNumber === 'number' && item.itemNumber > 0) {
    return item.itemNumber;
  }
  if (existingItems && existingItems.length > 0) {
    const max = Math.max(0, ...existingItems.map((i) => i.itemNumber || 0));
    return max + 1;
  }
  return 1;
}

export function loadItems(): MediaItem[] {
  try {
    const raw = storage.getItem(KEYS.ITEMS);
    const deleted = getDeletedItemIds();
    let parsedList: MediaItem[] = [];
    if (raw === null) {
      parsedList = INITIAL_ITEMS.filter((i) => !deleted.has(i.id));
    } else {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsedList = parsed.filter((i) => !deleted.has(i.id));
      } else {
        parsedList = INITIAL_ITEMS.filter((i) => !deleted.has(i.id));
      }
    }

    // Assign clean sequential numbers and decode HTML entities
    const assigned = assignSequentialItemNumbers(parsedList);
    return assigned;
  } catch (e) {
    console.error('Failed to load items from storage:', e);
    return assignSequentialItemNumbers(INITIAL_ITEMS);
  }
}

export function saveItems(items: MediaItem[]): void {
  try {
    storage.setItem(KEYS.ITEMS, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save items to storage:', e);
  }
}

export function getDeletedCategoryIds(): Set<string> {
  try {
    const raw = storage.getItem(KEYS.DELETED_CATEGORY_IDS);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

export function markCategoryAsDeleted(id: string): void {
  try {
    const ids = getDeletedCategoryIds();
    ids.add(id);
    storage.setItem(KEYS.DELETED_CATEGORY_IDS, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('Failed to store deleted category id:', e);
  }
}

export function getDeletedTagIds(): Set<string> {
  try {
    const raw = storage.getItem(KEYS.DELETED_TAG_IDS);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

export function markTagAsDeleted(id: string): void {
  try {
    const ids = getDeletedTagIds();
    ids.add(id);
    storage.setItem(KEYS.DELETED_TAG_IDS, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('Failed to store deleted tag id:', e);
  }
}

export function loadCategories(): Category[] {
  try {
    const raw = storage.getItem(KEYS.CATEGORIES);
    const deleted = getDeletedCategoryIds();

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((c) => !deleted.has(c.id));
        }
      } catch {}
    }

    return INITIAL_CATEGORIES.filter((c) => !deleted.has(c.id));
  } catch (e) {
    return INITIAL_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  try {
    const deleted = getDeletedCategoryIds();
    const clean = categories.filter((c) => !deleted.has(c.id));
    storage.setItem(KEYS.CATEGORIES, JSON.stringify(clean));
    const initialIds = new Set(INITIAL_CATEGORIES.map((c) => c.id));
    const custom = clean.filter((c) => !initialIds.has(c.id));
    storage.setItem(KEYS.CUSTOM_CATEGORIES, JSON.stringify(custom));
  } catch (e) {
    console.error('Failed to save categories:', e);
  }
}

export function loadTags(): Tag[] {
  try {
    const raw = storage.getItem(KEYS.TAGS);
    const deleted = getDeletedTagIds();

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((t) => !deleted.has(t.id));
        }
      } catch {}
    }

    return INITIAL_TAGS.filter((t) => !deleted.has(t.id));
  } catch (e) {
    return INITIAL_TAGS;
  }
}

export function saveTags(tags: Tag[]): void {
  try {
    const deleted = getDeletedTagIds();
    const clean = tags.filter((t) => !deleted.has(t.id));
    storage.setItem(KEYS.TAGS, JSON.stringify(clean));
    const initialIds = new Set(INITIAL_TAGS.map((t) => t.id));
    const custom = clean.filter((t) => !initialIds.has(t.id));
    storage.setItem(KEYS.CUSTOM_TAGS, JSON.stringify(custom));
  } catch (e) {
    console.error('Failed to save tags:', e);
  }
}

export function loadComments(): Comment[] {
  try {
    const raw = storage.getItem(KEYS.COMMENTS);
    if (!raw) return INITIAL_COMMENTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_COMMENTS;
  } catch (e) {
    return INITIAL_COMMENTS;
  }
}

export function saveComments(comments: Comment[]): void {
  try {
    storage.setItem(KEYS.COMMENTS, JSON.stringify(comments));
  } catch (e) {
    console.error('Failed to save comments:', e);
  }
}

export function loadUser(): UserProfile {
  try {
    const raw = storage.getItem(KEYS.USER);
    if (!raw) return INITIAL_USER;
    const parsed = JSON.parse(raw);
    // Strict admin guard: only authorized admin can hold admin role
    if (parsed.role === 'admin' && parsed.email?.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
      return INITIAL_USER;
    }
    return parsed;
  } catch (e) {
    return INITIAL_USER;
  }
}

export function saveUser(user: UserProfile): void {
  try {
    storage.setItem(KEYS.USER, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user:', e);
  }
}

export function getUserLikesKey(user?: UserProfile): string {
  if (user && user.isLoggedIn && user.email) {
    return `obsidian_vault_likes_${user.email.toLowerCase().trim()}`;
  }
  // Persistent guest device UUID
  let guestId = storage.getItem('obsidian_vault_guest_uid');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    storage.setItem('obsidian_vault_guest_uid', guestId);
  }
  return `obsidian_vault_likes_${guestId}`;
}

export function loadUserLikes(user?: UserProfile): string[] {
  try {
    const key = getUserLikesKey(user);
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveUserLikes(user: UserProfile, likedIds: string[]): void {
  try {
    const key = getUserLikesKey(user);
    storage.setItem(key, JSON.stringify(likedIds));
  } catch (e) {
    console.error('Failed to save user likes:', e);
  }
}

export function loadRecentlyViewed(): RecentlyViewedRecord[] {
  try {
    const raw = storage.getItem(KEYS.RECENTLY_VIEWED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Ensure all records have valid viewCount
    return parsed.map((item) => ({
      itemId: item.itemId,
      viewedAt: item.viewedAt || new Date().toISOString(),
      viewCount: typeof item.viewCount === 'number' && item.viewCount > 0 ? item.viewCount : 1,
    }));
  } catch (e) {
    return [];
  }
}

export function recordRecentlyViewed(itemId: string): RecentlyViewedRecord[] {
  try {
    const current = loadRecentlyViewed();
    const existing = current.find((r) => r.itemId === itemId);
    const previousViews = existing?.viewCount || 0;
    const filtered = current.filter((r) => r.itemId !== itemId);

    const updatedRecord: RecentlyViewedRecord = {
      itemId,
      viewedAt: new Date().toISOString(),
      viewCount: previousViews + 1,
    };

    const updated = [updatedRecord, ...filtered].slice(0, 50);
    storage.setItem(KEYS.RECENTLY_VIEWED, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to record recently viewed:', e);
    return [];
  }
}

export function removeRecentlyViewedItem(itemId: string): RecentlyViewedRecord[] {
  try {
    const current = loadRecentlyViewed();
    const updated = current.filter((r) => r.itemId !== itemId);
    storage.setItem(KEYS.RECENTLY_VIEWED, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to remove recently viewed item:', e);
    return [];
  }
}

export function pruneStaleRecentlyViewed(validItemIds: Set<string>): RecentlyViewedRecord[] {
  try {
    const current = loadRecentlyViewed();
    const valid = current.filter((r) => validItemIds.has(r.itemId));
    if (valid.length !== current.length) {
      storage.setItem(KEYS.RECENTLY_VIEWED, JSON.stringify(valid));
    }
    return valid;
  } catch (e) {
    return [];
  }
}

export function clearRecentlyViewed(): void {
  try {
    storage.removeItem(KEYS.RECENTLY_VIEWED);
  } catch (e) {
    console.error('Failed to clear recently viewed:', e);
  }
}

export function loadConfig(): SystemConfig {
  try {
    const raw = storage.getItem(KEYS.CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: SystemConfig): void {
  try {
    storage.setItem(KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

export function resetAllData(): void {
  try {
    storage.setItem(KEYS.ITEMS, JSON.stringify(INITIAL_ITEMS));
    storage.setItem(KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    storage.setItem(KEYS.TAGS, JSON.stringify(INITIAL_TAGS));
    storage.setItem(KEYS.COMMENTS, JSON.stringify(INITIAL_COMMENTS));
    storage.setItem(KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
    storage.removeItem(KEYS.RECENTLY_VIEWED);
  } catch (e) {
    console.error('Failed to reset data:', e);
  }
}

/**
 * Safely parse a hostname from any URL string without throwing TypeError on malformed strings
 */
export function getDomainFromUrl(url?: string): string {
  if (!url) return 'vault.local';
  try {
    const raw = url.trim();
    if (raw.startsWith('local://')) {
      return 'Local Vault Asset';
    }
    const target = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    const parsed = new URL(target);
    return parsed.hostname.replace(/^www\./, '') || 'vault.local';
  } catch {
    return 'vault.local';
  }
}

/**
 * Safe confirm helper that doesn't throw if window.confirm is restricted in iframe sandboxes
 */
export function safeConfirm(message: string): boolean {
  try {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message);
    }
  } catch {
    // If blocked by iframe sandbox, treat as confirmed
  }
  return true;
}

/**
 * Load individual card image fit overrides from persistent storage
 */
export function loadCardImageFits(): Record<string, 'cover' | 'contain'> {
  try {
    const raw = storage.getItem(KEYS.CARD_IMAGE_FITS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Save individual card image fit overrides to persistent storage
 */
export function saveCardImageFits(fits: Record<string, 'cover' | 'contain'>): void {
  try {
    storage.setItem(KEYS.CARD_IMAGE_FITS, JSON.stringify(fits));
  } catch (e) {
    console.warn('Failed to save card image fits:', e);
  }
}

/**
 * Load global card image expand / fit mode from persistent storage
 */
export function loadGlobalImageFit(): 'cover' | 'contain' {
  try {
    const raw = storage.getItem(KEYS.GLOBAL_IMAGE_FIT);
    if (raw === 'cover' || raw === 'contain') return raw;
  } catch {}
  return 'cover';
}

/**
 * Save global card image expand / fit mode to persistent storage
 */
export function saveGlobalImageFit(fit: 'cover' | 'contain'): void {
  try {
    storage.setItem(KEYS.GLOBAL_IMAGE_FIT, fit);
  } catch (e) {
    console.warn('Failed to save global image fit:', e);
  }
}

/**
 * Load user filter settings from persistent storage (excluding transient query)
 */
export function loadSavedFilters(): Partial<SearchFilters> {
  try {
    const raw = storage.getItem(KEYS.SAVED_FILTERS);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

/**
 * Save user filter settings to persistent storage
 */
export function saveSavedFilters(filters: SearchFilters): void {
  try {
    const { query, ...persisted } = filters;
    storage.setItem(KEYS.SAVED_FILTERS, JSON.stringify(persisted));
  } catch (e) {
    console.warn('Failed to save filters:', e);
  }
}

/**
 * Load view mode from persistent storage
 */
export function loadViewMode(): 'grid' | 'large' | 'compact' {
  try {
    const raw = storage.getItem(KEYS.VIEW_MODE);
    if (raw === 'grid' || raw === 'large' || raw === 'compact') return raw;
  } catch {}
  return 'grid';
}

/**
 * Save view mode to persistent storage
 */
export function saveViewMode(mode: 'grid' | 'large' | 'compact'): void {
  try {
    storage.setItem(KEYS.VIEW_MODE, mode);
  } catch (e) {
    console.warn('Failed to save view mode:', e);
  }
}


