/**
 * Core type definitions for Obsidian Vault (VoidMark)
 */

export type Language = 'en' | 'th' | 'ja' | 'zh' | 'es';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export type MediaType = 'web' | 'image' | 'video' | 'audio';

export type EmbedType = 'none' | 'youtube' | 'vimeo' | 'html5_video' | 'audio' | 'image' | 'iframe';

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  url: string;
  mediaType: MediaType;
  thumbnailUrl: string;
  mediaUrl?: string; // Direct URL for HTML5 video, audio, or image
  embedType: EmbedType;
  embedId?: string; // e.g., YouTube ID (dQw4w9WgXcQ) or Vimeo ID
  categoryId: string;
  tags: string[];
  siteName?: string;
  favicon?: string;
  viewsCount: number;
  likesCount: number;
  createdAt: string; // ISO 8601
  updatedAt: string;
  isPinned?: boolean;
  imageFit?: 'cover' | 'contain';
  source: 'url' | 'upload';
  fileName?: string;
  fileSize?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string; // Lucide icon name
  parentId?: string | null;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  itemId: string;
  authorName: string;
  authorAvatar?: string;
  authorEmail?: string;
  isGoogleUser: boolean;
  isAdmin: boolean;
  content: string;
  createdAt: string;
  likes: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'user' | 'guest';
  isLoggedIn: boolean;
}

export interface SearchFilters {
  query: string;
  categoryId: string; // 'all' or specific id
  tag: string; // 'all' or tag name
  mediaType: 'all' | MediaType;
  sortBy: 'newest' | 'oldest' | 'views' | 'likes' | 'title';
  pinnedOnly: boolean;
}

export interface ScrapedMetadata {
  title: string;
  description: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  mediaType: MediaType;
  fallback?: boolean;
}

export interface BannerSlide {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  linkUrl?: string;
  // Position & Scale
  positionX?: number; // 0 to 100% (default 50)
  positionY?: number; // 0 to 100% (default 50)
  scale?: number;     // 0.3 to 2.5 (default 1.0)
  fitMode?: 'cover' | 'contain' | 'custom';
  overlayOpacity?: number; // 0 to 0.95
}

export interface SystemConfig {
  vaultName: string;
  vaultTagline: string;
  allowGuestComments: boolean;
  defaultViewMode: 'grid' | 'large' | 'compact';
  autoScrapeOpenGraph: boolean;
  // Visual Branding Customizations
  logoUrl?: string;
  faviconUrl?: string;
  bannerBgUrl?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerBadge?: string;
  bannerOverlayOpacity?: number; // 0.1 to 0.95
  showBanner?: boolean;
  // Advanced Banner Slider & Repositioning System
  bannerSlides?: BannerSlide[];
  bannerAutoSlide?: boolean;
  bannerSlideInterval?: number; // In seconds (default: 5)
  bannerHeight?: 'compact' | 'standard' | 'tall' | 'cinematic'; // compact: 180px, standard: 240px, tall: 320px
  bannerTransitionEffect?: 'slide' | 'fade';
}

