/**
 * High-Performance Image Optimization Pipeline
 * 
 * Supports:
 * - Dynamic WebP / AVIF transformation
 * - Multi-resolution responsive `srcset` generation
 * - Provider-specific native CDN parameters (Unsplash, WordPress mshots, YouTube)
 * - Safe fallback URLs
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'auto';
  fit?: 'cover' | 'contain' | 'crop';
}

/**
 * Returns an optimized image URL by either applying native CDN parameters
 * or routing through the server-side Sharp optimizer endpoint.
 */
export function getOptimizedImageUrl(url: string, options: ImageOptimizationOptions = {}): string {
  if (!url) return '';
  const { width, height, quality = 80, format = 'auto', fit = 'cover' } = options;

  // 1. Data URLs or SVGs don't need raster transcoding
  if (url.startsWith('data:') || url.startsWith('blob:') || url.endsWith('.svg')) {
    return url;
  }

  try {
    // 2. Unsplash Native CDN Optimization
    if (url.includes('images.unsplash.com')) {
      const u = new URL(url);
      if (width) u.searchParams.set('w', width.toString());
      if (height) u.searchParams.set('h', height.toString());
      u.searchParams.set('q', quality.toString());
      u.searchParams.set('auto', 'format');
      if (fit) u.searchParams.set('fit', fit);
      return u.toString();
    }

    // 3. YouTube Thumbnail Optimization
    if (url.includes('img.youtube.com')) {
      // If requesting smaller width, hqdefault is 480x360, mqdefault is 320x180
      if (width && width <= 320) {
        return url.replace(/(?:hqdefault|maxresdefault|default)\.jpg/i, 'mqdefault.jpg');
      }
      return url;
    }

    // 4. WordPress mshots web snapshots
    if (url.includes('s0.wp.com/mshots/v1/')) {
      const u = new URL(url);
      if (width) u.searchParams.set('w', width.toString());
      if (height) u.searchParams.set('h', height.toString());
      return u.toString();
    }

    // 5. Internal Pixiv Image Proxy (only in development or if hosted backend exists)
    if (url.startsWith('/api/pixiv-image')) {
      return url;
    }

    // 6. Generic external HTTP/HTTPS images:
    // Return original URL directly without rewriting to server-side endpoints
    // to ensure 100% compatibility across static hosts (Vercel, GitHub Pages) and prevent 404s
    return url;
  } catch {
    return url;
  }
}

/**
 * Generates a standard responsive `srcSet` string for supported CDNs (e.g. Unsplash)
 */
export function generateResponsiveSrcSet(
  url: string,
  widths: number[] = [400, 800, 1200],
  quality = 80
): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.endsWith('.svg')) {
    return '';
  }

  // Only generate srcset if the URL is from a CDN that actually supports dynamic resizing query parameters!
  const isCdn = url.includes('images.unsplash.com') || url.includes('s0.wp.com/mshots/v1/');
  if (!isCdn) {
    return '';
  }

  return widths
    .map((w) => {
      const optUrl = getOptimizedImageUrl(url, { width: w, quality });
      return `${optUrl} ${w}w`;
    })
    .join(', ');
}
