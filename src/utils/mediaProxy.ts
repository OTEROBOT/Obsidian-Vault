/**
 * Helper utilities for Twitter/X and Pixiv media detection and image proxying
 */

export const isTwitterOrX = (url: string): boolean => {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return host === 'x.com' || host === 'twitter.com' || host === 't.co' || host.endsWith('.x.com') || host.endsWith('.twitter.com');
  } catch {
    return false;
  }
};

export const getTwitterStatusId = (url: string): string | null => {
  if (!url) return null;
  try {
    const match = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

export const getTwitterHandle = (url: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length > 0 && !['home', 'explore', 'notifications', 'messages', 'i', 'hashtag', 'search'].includes(parts[0].toLowerCase())) {
      return `@${parts[0]}`;
    }
    return null;
  } catch {
    return null;
  }
};

export const isPixiv = (url: string): boolean => {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return host === 'pixiv.net' || host.endsWith('.pixiv.net') || host === 'i.pximg.net' || host.endsWith('.pximg.net');
  } catch {
    return false;
  }
};

export const getPixivIllustId = (url: string): string | null => {
  if (!url) return null;
  try {
    // Match /artworks/12345678 or /en/artworks/12345678
    const artworkMatch = url.match(/artworks\/(\d+)/i);
    if (artworkMatch) return artworkMatch[1];

    // Match illust_id=12345678
    const paramMatch = url.match(/[?&]illust_id=(\d+)/i);
    if (paramMatch) return paramMatch[1];

    // Match numeric path or decorate url
    const decorateMatch = url.match(/decorate\.php\?illust_id=(\d+)/i);
    if (decorateMatch) return decorateMatch[1];

    return null;
  } catch {
    return null;
  }
};

/**
 * Ensures Pixiv images from i.pximg.net pass through our backend proxy
 * with proper Referer headers, preventing 403 Forbidden errors.
 */
export const getSafeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const trimmed = url.trim();

  // If already proxied, return as-is
  if (trimmed.startsWith('/api/pixiv-image')) {
    return trimmed;
  }

  // If it's a direct pximg image, proxy it
  if (trimmed.includes('pximg.net') || trimmed.includes('i.pximg.net')) {
    return `/api/pixiv-image?url=${encodeURIComponent(trimmed)}`;
  }

  // If it's a Pixiv artwork URL without a direct image, use decorate.php or proxy
  const illustId = getPixivIllustId(trimmed);
  if (illustId && !trimmed.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return `https://embed.pixiv.net/decorate.php?illust_id=${illustId}`;
  }

  return trimmed;
};
