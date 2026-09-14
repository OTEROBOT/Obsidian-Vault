import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Category, Comment, MediaItem, SystemConfig, Tag, UserProfile } from '../types';

// Supabase configuration with default fallbacks to provided project
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://itdepagafihwvtklxfql.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZGVwYWdhZmlod3Z0a2x4ZnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDc1ODQsImV4cCI6MjEwNDcyMzU4NH0.9N1dWXVtUJbgJYy5RQ0NmoLFICaWKTC8O2IaYVdPM4Y';

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'oterobot@gmail.com';
export const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'vault-media';

// Safe fetch wrapper that delegates cleanly to global fetch without property mutations
const safeFetch: typeof fetch = (input, init) => {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    return window.fetch(input, init);
  }
  return fetch(input, init);
};

// Single Supabase client instance
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: safeFetch,
  },
});

export interface SupabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  tablesReady: boolean;
  bucketReady: boolean;
  error?: string;
  projectUrl: string;
}

/**
 * Check connectivity and table availability in Supabase
 */
export async function checkSupabaseHealth(): Promise<SupabaseStatus> {
  const result: SupabaseStatus = {
    isConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    isConnected: false,
    tablesReady: false,
    bucketReady: false,
    projectUrl: SUPABASE_URL,
  };

  if (!result.isConfigured) {
    result.error = 'Missing Supabase URL or Anon Key configuration.';
    return result;
  }

  try {
    // 1. Test basic database connection
    const { data: catData, error: catError } = await supabase
      .from('vault_categories')
      .select('id')
      .limit(1);

    if (catError) {
      if (catError.code === '42P01' || catError.message.includes('does not exist')) {
        result.isConnected = true;
        result.tablesReady = false;
        result.error = 'Tables not yet created. Run /supabase/schema.sql in Supabase SQL Editor.';
      } else {
        result.error = catError.message;
      }
    } else {
      result.isConnected = true;
      result.tablesReady = true;
    }

    // 2. Test storage bucket
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (buckets && buckets.some((b) => b.name === STORAGE_BUCKET || b.id === STORAGE_BUCKET)) {
        result.bucketReady = true;
      }
    } catch {
      // Non-blocking bucket check
    }
  } catch (err: unknown) {
    result.error = err instanceof Error ? err.message : 'Unknown connection error';
  }

  return result;
}

// ----------------------------------------------------
// Data transformation helpers (camelCase <-> snake_case)
// ----------------------------------------------------

export function mapRowToItem(row: Record<string, any>): MediaItem {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    url: row.url || '',
    mediaType: row.media_type || 'web',
    thumbnailUrl: row.thumbnail_url || '',
    mediaUrl: row.media_url || undefined,
    embedType: row.embed_type || 'none',
    embedId: row.embed_id || undefined,
    categoryId: row.category_id || 'tech',
    tags: Array.isArray(row.tags) ? row.tags : [],
    siteName: row.site_name || undefined,
    favicon: row.favicon || undefined,
    viewsCount: Number(row.views_count) || 0,
    likesCount: Number(row.likes_count) || 0,
    isPinned: Boolean(row.is_pinned),
    source: (row.source as 'url' | 'upload') || 'url',
    fileName: row.file_name || undefined,
    fileSize: row.file_size || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapItemToRow(item: MediaItem): Record<string, any> {
  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    url: item.url,
    media_type: item.mediaType,
    thumbnail_url: item.thumbnailUrl || '',
    media_url: item.mediaUrl || null,
    embed_type: item.embedType,
    embed_id: item.embedId || null,
    category_id: item.categoryId,
    tags: item.tags || [],
    site_name: item.siteName || null,
    favicon: item.favicon || null,
    views_count: item.viewsCount || 0,
    likes_count: item.likesCount || 0,
    is_pinned: Boolean(item.isPinned),
    source: item.source || 'url',
    file_name: item.fileName || null,
    file_size: item.fileSize || null,
    created_at: item.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export function mapRowToCategory(row: Record<string, any>): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    icon: row.icon || 'Folder',
    parentId: row.parent_id || null,
    color: row.color || '#38bdf8',
  };
}

export function mapCategoryToRow(cat: Category): Record<string, any> {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || '',
    icon: cat.icon,
    parent_id: cat.parentId || null,
    color: cat.color,
  };
}

export function mapRowToComment(row: Record<string, any>): Comment {
  return {
    id: row.id,
    itemId: row.item_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar || undefined,
    authorEmail: row.author_email || undefined,
    isGoogleUser: Boolean(row.is_google_user),
    isAdmin: Boolean(row.is_admin),
    content: row.content,
    createdAt: row.created_at,
    likes: Number(row.likes) || 0,
  };
}

export function mapCommentToRow(c: Comment): Record<string, any> {
  return {
    id: c.id,
    item_id: c.itemId,
    author_name: c.authorName,
    author_avatar: c.authorAvatar || null,
    author_email: c.authorEmail || null,
    is_google_user: Boolean(c.isGoogleUser),
    is_admin: Boolean(c.isAdmin),
    content: c.content,
    created_at: c.createdAt,
    likes: c.likes || 0,
  };
}

// ----------------------------------------------------
// Database Operations (with strict Admin session verification)
// ----------------------------------------------------

/**
 * Verifies that the active session is an authenticated user with email = ADMIN_EMAIL
 * Checks both live Supabase auth session and stored admin profile
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email && session.user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) {
      return true;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('obsidian_vault_user_v1');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.isLoggedIn && u?.role === 'admin' && u?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function fetchItemsFromSupabase(): Promise<MediaItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch items error:', error.message);
      return null;
    }
    return (data || []).map(mapRowToItem);
  } catch (e) {
    console.warn('Supabase items exception:', e);
    return null;
  }
}

export async function saveItemToSupabase(item: MediaItem): Promise<boolean> {
  try {
    const row = mapItemToRow(item);
    const { error } = await supabase.from('vault_items').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase upsert item notice:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase save item exception:', e);
    return false;
  }
}

export async function deleteItemFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('vault_items').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete item notice:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase delete item exception:', e);
    return false;
  }
}

export async function fetchCategoriesFromSupabase(): Promise<Category[] | null> {
  try {
    const { data, error } = await supabase.from('vault_categories').select('*').order('name');
    if (error) return null;
    return (data || []).map(mapRowToCategory);
  } catch {
    return null;
  }
}

export async function saveCategoryToSupabase(cat: Category): Promise<boolean> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      console.warn('Unauthorized Supabase write: Admin session required');
      return false;
    }

    const row = mapCategoryToRow(cat);
    const { error } = await supabase.from('vault_categories').upsert(row, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCategoryFromSupabase(id: string): Promise<boolean> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      console.warn('Unauthorized Supabase delete: Admin session required');
      return false;
    }

    const { error } = await supabase.from('vault_categories').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchTagsFromSupabase(): Promise<Tag[] | null> {
  try {
    const { data, error } = await supabase.from('vault_tags').select('*');
    if (error) return null;
    return (data || []).map((r) => ({ id: r.id, name: r.name, color: r.color }));
  } catch {
    return null;
  }
}

export async function saveTagToSupabase(tag: Tag): Promise<boolean> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      console.warn('Unauthorized Supabase write: Admin session required');
      return false;
    }

    const { error } = await supabase.from('vault_tags').upsert(tag, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteTagFromSupabase(id: string): Promise<boolean> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      console.warn('Unauthorized Supabase delete: Admin session required');
      return false;
    }

    const { error } = await supabase.from('vault_tags').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchConfigFromSupabase(): Promise<Partial<SystemConfig> | null> {
  try {
    const { data, error } = await supabase.from('vault_config').select('*').limit(1).maybeSingle();
    if (error || !data) return null;
    return {
      vaultName: data.vault_name || undefined,
      vaultTagline: data.vault_tagline || undefined,
      allowGuestComments: typeof data.allow_guest_comments === 'boolean' ? data.allow_guest_comments : undefined,
      logoUrl: data.logo_url || undefined,
      faviconUrl: data.favicon_url || undefined,
      bannerBgUrl: data.banner_bg_url || undefined,
      bannerTitle: data.banner_title || undefined,
      bannerSubtitle: data.banner_subtitle || undefined,
      bannerBadge: data.banner_badge || undefined,
      bannerOverlayOpacity: typeof data.banner_overlay_opacity === 'number' ? data.banner_overlay_opacity : undefined,
      showBanner: typeof data.show_banner === 'boolean' ? data.show_banner : undefined,
    };
  } catch {
    return null;
  }
}

export async function saveConfigToSupabase(cfg: SystemConfig): Promise<boolean> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return false;
    }

    const row = {
      id: 'default',
      vault_name: cfg.vaultName || '',
      vault_tagline: cfg.vaultTagline || '',
      allow_guest_comments: cfg.allowGuestComments ?? true,
      logo_url: cfg.logoUrl || '',
      favicon_url: cfg.faviconUrl || '',
      banner_bg_url: cfg.bannerBgUrl || '',
      banner_title: cfg.bannerTitle || '',
      banner_subtitle: cfg.bannerSubtitle || '',
      banner_badge: cfg.bannerBadge || '',
      banner_overlay_opacity: cfg.bannerOverlayOpacity ?? 0.75,
      show_banner: cfg.showBanner !== false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('vault_config').upsert(row, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function fetchCommentsFromSupabase(itemId?: string): Promise<Comment[] | null> {
  try {
    let query = supabase.from('vault_comments').select('*').order('created_at', { ascending: false });
    if (itemId) {
      query = query.eq('item_id', itemId);
    }
    const { data, error } = await query;
    if (error) return null;
    return (data || []).map(mapRowToComment);
  } catch {
    return null;
  }
}

export async function saveCommentToSupabase(comment: Comment): Promise<boolean> {
  try {
    const row = mapCommentToRow(comment);
    const { error } = await supabase.from('vault_comments').insert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCommentFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('vault_comments').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// File & Media Upload to Supabase Storage ('vault-media')
// ----------------------------------------------------

export async function uploadMediaToSupabaseStorage(
  file: File,
  folder = 'uploads'
): Promise<{ url: string; error?: string }> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return { url: '', error: `Unauthorized: Media upload requires verified Admin session (${ADMIN_EMAIL})` };
    }

    const fileExt = file.name.split('.').pop() || 'bin';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${cleanFileName}`;

    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.error('Storage upload error:', error);
      return { url: '', error: error.message };
    }

    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
    return { url: publicData.publicUrl };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    return { url: '', error: msg };
  }
}

// ----------------------------------------------------
// Auth Utilities (Google & Supabase Auth)
// ----------------------------------------------------

export function mapSupabaseUserToProfile(user: User | null): UserProfile | null {
  if (!user) return null;
  const email = (user.email || '').trim();
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return {
    id: user.id,
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email.split('@')[0] ||
      'Vault User',
    email,
    avatar:
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
    role: isAdmin ? 'admin' : 'user',
    isLoggedIn: true,
  };
}

export function createAdminProfile(): UserProfile {
  return {
    id: 'vault-master-admin',
    name: 'Vault Administrator',
    email: ADMIN_EMAIL,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(ADMIN_EMAIL)}`,
    role: 'admin',
    isLoggedIn: true,
  };
}

export interface OAuthResult {
  error?: string;
  providerDisabled?: boolean;
  url?: string;
}

export async function signInWithGoogleOAuth(): Promise<OAuthResult> {
  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : undefined;

    // Standard normal full-page OAuth redirect in the current window (no separate popup)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    });

    if (error) {
      const isProviderDisabled = 
        error.message?.toLowerCase().includes('unsupported provider') ||
        error.message?.toLowerCase().includes('provider is not enabled') ||
        (error as any)?.error_code === 'validation_failed';

      return {
        error: isProviderDisabled 
          ? 'Google OAuth provider is not enabled in your Supabase project dashboard.' 
          : error.message,
        providerDisabled: isProviderDisabled,
      };
    }
    return {};
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Google OAuth failed';
    const isProviderDisabled = msg.toLowerCase().includes('unsupported provider') || msg.toLowerCase().includes('provider is not enabled');
    return {
      error: isProviderDisabled 
        ? 'Google OAuth provider is not enabled in your Supabase project dashboard.' 
        : msg,
      providerDisabled: isProviderDisabled,
    };
  }
}

export async function signInWithMagicLink(email: string): Promise<{ error?: string; success?: boolean }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to send magic link' };
  }
}

export async function signOutSupabaseAuth(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Sign out error:', e);
  }
}

/**
 * Push all local items & categories to Supabase to initialize the database
 */
export async function syncLocalDataToSupabase(
  items: MediaItem[],
  categories: Category[],
  tags: Tag[]
): Promise<{ success: boolean; itemsSynced: number; error?: string }> {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return {
        success: false,
        itemsSynced: 0,
        error: `Unauthorized: Cloud synchronization requires verified Admin session (${ADMIN_EMAIL})`,
      };
    }

    // 1. Sync Categories
    for (const cat of categories) {
      await saveCategoryToSupabase(cat);
    }
    // 2. Sync Tags
    for (const tag of tags) {
      await saveTagToSupabase(tag);
    }
    // 3. Sync Items
    let count = 0;
    for (const item of items) {
      const ok = await saveItemToSupabase(item);
      if (ok) count++;
    }

    return { success: true, itemsSynced: count };
  } catch (e: unknown) {
    return {
      success: false,
      itemsSynced: 0,
      error: e instanceof Error ? e.message : 'Sync failed',
    };
  }
}
