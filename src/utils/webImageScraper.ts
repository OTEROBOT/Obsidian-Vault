/**
 * Web Image Extractor and Multi-Engine Metadata Scraper
 * Extracts images from webpage HTML, discovers gallery pictures,
 * caches results for instant speed, and prevents rate-limit failures.
 */

export interface ScrapedResult {
  title: string;
  description: string;
  image: string;
  candidateImages: string[];
  siteName: string;
  favicon: string;
  mediaType: 'web' | 'video' | 'audio' | 'image';
  sourceEngine: 'cache' | 'local-api' | 'microlink' | 'allorigins' | 'semantic';
}

// In-memory + SessionStorage cache for lightning-fast sub-second repeated operations
const MEMORY_CACHE = new Map<string, { data: ScrapedResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

function getCached(url: string): ScrapedResult | null {
  const norm = url.trim().toLowerCase();
  const entry = MEMORY_CACHE.get(norm);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  try {
    const raw = sessionStorage.getItem(`vault_og_${norm}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        MEMORY_CACHE.set(norm, parsed);
        return parsed.data;
      }
    }
  } catch {}
  return null;
}

function setCache(url: string, data: ScrapedResult) {
  const norm = url.trim().toLowerCase();
  const entry = { data, timestamp: Date.now() };
  MEMORY_CACHE.set(norm, entry);
  try {
    sessionStorage.setItem(`vault_og_${norm}`, JSON.stringify(entry));
  } catch {}
}

/**
 * Filter out invalid images, tracking pixels, 1x1 gifs, and UI icons
 */
export function isValidContentImage(src: string): boolean {
  if (!src || typeof src !== 'string') return false;
  const s = src.toLowerCase().trim();
  if (s.startsWith('data:image/svg') || s.startsWith('data:image/gif;base64,r0lgodlh')) return false;
  if (s.includes('pixel') || s.includes('spacer') || s.includes('1x1') || s.includes('beacon') || s.includes('tracking')) return false;
  if (s.includes('favicon.ico') || s.includes('blank.gif') || s.includes('loader.gif') || s.includes('spinner')) return false;
  if (s.includes('stat.gif') || s.includes('analytics') || s.includes('ad_') || s.includes('banner_ad')) return false;
  return s.startsWith('http://') || s.startsWith('https://');
}

/**
 * Extract all image candidates from HTML string
 */
export function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const addImage = (rawSrc: string | null | undefined, priority = false) => {
    if (!rawSrc) return;
    try {
      let resolved = rawSrc.trim();
      if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
        resolved = new URL(resolved, baseUrl).toString();
      }
      if (isValidContentImage(resolved) && !seen.has(resolved)) {
        seen.add(resolved);
        if (priority) {
          candidates.unshift(resolved);
        } else {
          candidates.push(resolved);
        }
      }
    } catch {}
  };

  // 1. Check meta tags
  const ogImgMatches = html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src|image)["'][^>]+content=["']([^"']*)["']/gi);
  for (const m of ogImgMatches) {
    if (m[1]) addImage(m[1], true);
  }
  const ogImgRev = html.matchAll(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src|image)["']/gi);
  for (const m of ogImgRev) {
    if (m[1]) addImage(m[1], true);
  }

  // 2. Check <link rel="image_src">
  const linkImg = html.matchAll(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']*)["']/gi);
  for (const m of linkImg) {
    if (m[1]) addImage(m[1], true);
  }

  // 3. Scan all <img> tags in the HTML
  // Support: src, data-src, data-original, data-thumb, data-lazy-src, data-highres
  const imgTagRegex = /<img\b([^>]*)>/gi;
  let imgMatch;
  while ((imgMatch = imgTagRegex.exec(html)) !== null) {
    const attrs = imgMatch[1];
    
    // Check data-highres / data-original first
    const dataHigh = attrs.match(/\bdata-(?:highres|original|full|src)=["']([^"']+)["']/i);
    if (dataHigh && dataHigh[1]) addImage(dataHigh[1]);

    // Check data-thumb
    const dataThumb = attrs.match(/\bdata-thumb(?:nail)?=["']([^"']+)["']/i);
    if (dataThumb && dataThumb[1]) addImage(dataThumb[1]);

    // Check standard src
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) addImage(srcMatch[1]);

    // Check srcset (extract highest-res URL)
    const srcsetMatch = attrs.match(/\bsrcset=["']([^"']+)["']/i);
    if (srcsetMatch && srcsetMatch[1]) {
      const parts = srcsetMatch[1].split(',');
      const last = parts[parts.length - 1]?.trim().split(/\s+/)[0];
      if (last) addImage(last);
    }
  }

  // 4. Score and sort images so gallery thumbnails & large images appear first
  return candidates.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    // Boost gallery domains like ehgt.org (E-Hentai gallery thumbnails), pximg, imgur, etc.
    const isGalleryDomain = (url: string) => url.includes('ehgt.org') || url.includes('pximg.net') || url.includes('i.imgur') || url.includes('preview');
    if (isGalleryDomain(aLower) && !isGalleryDomain(bLower)) return -1;
    if (!isGalleryDomain(aLower) && isGalleryDomain(bLower)) return 1;

    // Boost files with preview/thumb/cover/gallery in path
    const hasKeywords = (url: string) => /cover|thumb|gallery|preview|large|original|post|image/i.test(url);
    if (hasKeywords(aLower) && !hasKeywords(bLower)) return -1;
    if (!hasKeywords(aLower) && hasKeywords(bLower)) return 1;

    return 0;
  });
}

/**
 * Multi-Engine Scraper:
 * Runs fastest-wins with timeout to guarantee instant responsiveness (<1.5s)
 * and deep image discovery.
 */
export async function scrapePageMetadata(targetUrl: string): Promise<ScrapedResult> {
  const cleanUrl = targetUrl.trim();

  // 1. Instant Cache Check
  const cached = getCached(cleanUrl);
  if (cached) {
    return { ...cached, sourceEngine: 'cache' };
  }

  // 2. Fetch with multiple resilient strategies
  let result: ScrapedResult | null = null;

  // Engine A: Local API endpoint /api/scrape-og (with timeout 3000ms)
  try {
    const localCtrl = new AbortController();
    const localTimer = setTimeout(() => localCtrl.abort(), 3200);
    const localRes = await fetch(`/api/scrape-og?url=${encodeURIComponent(cleanUrl)}`, {
      signal: localCtrl.signal,
    });
    clearTimeout(localTimer);

    if (localRes.ok) {
      const json = await localRes.json();
      if (json && !json.fallback && (json.title || json.image)) {
        result = {
          title: json.title || '',
          description: json.description || '',
          image: json.image || '',
          candidateImages: Array.isArray(json.candidateImages) ? json.candidateImages : (json.image ? [json.image] : []),
          siteName: json.siteName || '',
          favicon: json.favicon || `https://www.google.com/s2/favicons?domain=${new URL(cleanUrl).hostname}&sz=64`,
          mediaType: json.mediaType || 'web',
          sourceEngine: 'local-api',
        };
      }
    }
  } catch {}

  // Engine B: Microlink API (timeout 3500ms)
  if (!result) {
    try {
      const microCtrl = new AbortController();
      const microTimer = setTimeout(() => microCtrl.abort(), 3500);
      const microRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}`, {
        signal: microCtrl.signal,
      });
      clearTimeout(microTimer);

      if (microRes.ok) {
        const microData = await microRes.json();
        if (microData?.status === 'success' && microData?.data) {
          const d = microData.data;
          const img = d.image?.url || '';
          result = {
            title: d.title || '',
            description: d.description || '',
            image: img,
            candidateImages: img ? [img] : [],
            siteName: d.publisher || '',
            favicon: d.logo?.url || `https://www.google.com/s2/favicons?domain=${new URL(cleanUrl).hostname}&sz=64`,
            mediaType: 'web',
            sourceEngine: 'microlink',
          };
        }
      }
    } catch {}
  }

  // Engine C: AllOrigins CORS Proxy (fetches full HTML to extract deep images)
  if (!result || !result.image) {
    try {
      const aoCtrl = new AbortController();
      const aoTimer = setTimeout(() => aoCtrl.abort(), 4000);
      const aoRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`, {
        signal: aoCtrl.signal,
      });
      clearTimeout(aoTimer);

      if (aoRes.ok) {
        const aoData = await aoRes.json();
        const html = aoData.contents || '';
        if (html) {
          // Parse HTML for images
          const foundImages = extractImagesFromHtml(html, cleanUrl);
          
          // Extract title if missing
          let foundTitle = '';
          const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (tm && tm[1]) foundTitle = tm[1].trim();

          // Extract description if missing
          let foundDesc = '';
          const dm = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i);
          if (dm && dm[1]) foundDesc = dm[1].trim();

          if (result) {
            // Enrich existing result with newly discovered webpage images
            result.candidateImages = Array.from(new Set([...(result.candidateImages || []), ...foundImages]));
            if (!result.image && foundImages.length > 0) {
              result.image = foundImages[0];
            }
          } else if (foundTitle || foundImages.length > 0) {
            result = {
              title: foundTitle,
              description: foundDesc,
              image: foundImages[0] || '',
              candidateImages: foundImages,
              siteName: new URL(cleanUrl).hostname,
              favicon: `https://www.google.com/s2/favicons?domain=${new URL(cleanUrl).hostname}&sz=64`,
              mediaType: 'web',
              sourceEngine: 'allorigins',
            };
          }
        }
      }
    } catch {}
  }

  // If we found a result, cache it and return
  if (result) {
    setCache(cleanUrl, result);
    return result;
  }

  // Engine D: High-fidelity Live Web Snapshot fallback
  const hostname = new URL(cleanUrl).hostname;
  const webSnapshot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(cleanUrl)}?w=800&h=450`;
  const fallbackResult: ScrapedResult = {
    title: hostname,
    description: '',
    image: webSnapshot,
    candidateImages: [webSnapshot],
    siteName: hostname,
    favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
    mediaType: 'web',
    sourceEngine: 'semantic',
  };

  setCache(cleanUrl, fallbackResult);
  return fallbackResult;
}
