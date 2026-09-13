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

export function loadCategories(): Category[] {
  try {
    const raw = storage.getItem(KEYS.CATEGORIES);
    if (!raw) return INITIAL_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CATEGORIES;
  } catch (e) {
    return INITIAL_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  try {
    storage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories:', e);
  }
}

export function loadTags(): Tag[] {
  try {
    const raw = storage.getItem(KEYS.TAGS);
    if (!raw) return INITIAL_TAGS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TAGS;
  } catch (e) {
    return INITIAL_TAGS;
  }
}

export function saveTags(tags: Tag[]): void {
  try {
    storage.setItem(KEYS.TAGS, JSON.stringify(tags));
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

export function loadRecentlyViewed(): RecentlyViewedRecord[] {
  try {
    const raw = storage.getItem(KEYS.RECENTLY_VIEWED);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function recordRecentlyViewed(itemId: string): RecentlyViewedRecord[] {
  try {
    const current = loadRecentlyViewed();
    const filtered = current.filter((r) => r.itemId !== itemId);
    const updated = [{ itemId, viewedAt: new Date().toISOString() }, ...filtered].slice(0, 30);
    storage.setItem(KEYS.RECENTLY_VIEWED, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to record recently viewed:', e);
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

