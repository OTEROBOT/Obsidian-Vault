import { Category, Comment, MediaItem, SystemConfig, Tag, UserProfile } from '../types';
import { DEFAULT_CONFIG, INITIAL_CATEGORIES, INITIAL_COMMENTS, INITIAL_ITEMS, INITIAL_TAGS, INITIAL_USER } from '../data/initialData';
import { ADMIN_EMAIL } from './supabase';

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

export function loadItems(): MediaItem[] {
  try {
    const raw = storage.getItem(KEYS.ITEMS);
    const deleted = getDeletedItemIds();
    if (raw === null) {
      return INITIAL_ITEMS.filter((i) => !deleted.has(i.id));
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((i) => !deleted.has(i.id));
    }
    return INITIAL_ITEMS.filter((i) => !deleted.has(i.id));
  } catch (e) {
    console.error('Failed to load items from storage:', e);
    return INITIAL_ITEMS;
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

    // Check backup of custom categories
    let customCats: Category[] = [];
    try {
      const customRaw = storage.getItem(KEYS.CUSTOM_CATEGORIES);
      if (customRaw) {
        customCats = JSON.parse(customRaw);
      }
    } catch {}

    let list: Category[] = INITIAL_CATEGORIES;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }

    // Ensure custom categories are preserved even if main key was refreshed
    const existingIds = new Set(list.map((c) => c.id));
    for (const cc of customCats) {
      if (!existingIds.has(cc.id) && !deleted.has(cc.id)) {
        list.push(cc);
      }
    }

    return list.filter((c) => !deleted.has(c.id));
  } catch (e) {
    return INITIAL_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  try {
    storage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    const initialIds = new Set(INITIAL_CATEGORIES.map((c) => c.id));
    const custom = categories.filter((c) => !initialIds.has(c.id));
    storage.setItem(KEYS.CUSTOM_CATEGORIES, JSON.stringify(custom));
  } catch (e) {
    console.error('Failed to save categories:', e);
  }
}

export function loadTags(): Tag[] {
  try {
    const raw = storage.getItem(KEYS.TAGS);
    const deleted = getDeletedTagIds();

    let customTags: Tag[] = [];
    try {
      const customRaw = storage.getItem(KEYS.CUSTOM_TAGS);
      if (customRaw) {
        customTags = JSON.parse(customRaw);
      }
    } catch {}

    let list: Tag[] = INITIAL_TAGS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }

    const existingIds = new Set(list.map((t) => t.id));
    for (const ct of customTags) {
      if (!existingIds.has(ct.id) && !deleted.has(ct.id)) {
        list.push(ct);
      }
    }

    return list.filter((t) => !deleted.has(t.id));
  } catch (e) {
    return INITIAL_TAGS;
  }
}

export function saveTags(tags: Tag[]): void {
  try {
    storage.setItem(KEYS.TAGS, JSON.stringify(tags));
    const initialIds = new Set(INITIAL_TAGS.map((t) => t.id));
    const custom = tags.filter((t) => !initialIds.has(t.id));
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

