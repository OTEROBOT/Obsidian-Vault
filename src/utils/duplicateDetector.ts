import { MediaItem } from '../types';
import { decodeHtmlEntities } from './text';

/**
 * Normalizes a URL to a canonical identity string for accurate duplicate detection.
 * Handles protocols, trailing slashes, tracking parameters, and major platform identities.
 */
export function normalizeUrlForDeduplication(rawUrl: string): { canonicalKey: string; matchType: 'exact_url' | 'canonical_id' } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { canonicalKey: '', matchType: 'exact_url' };
  }

  let clean = rawUrl.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }

  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, ''); // Remove trailing slashes

    // 1. YouTube Canonicalization (youtu.be, youtube.com/watch, embed, v)
    const ytMatch = clean.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return { canonicalKey: `yt:${ytMatch[1]}`, matchType: 'canonical_id' };
    }

    // 2. Twitter / X Canonicalization (twitter.com / x.com / mobile.twitter.com)
    const twMatch = clean.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?([a-zA-Z0-9_]+)\/status\/(\d+)/i);
    if (twMatch && twMatch[2]) {
      return { canonicalKey: `tw:status:${twMatch[2]}`, matchType: 'canonical_id' };
    }

    // 3. Pixiv Canonicalization (artworks/ID or member_illust.php?illust_id=ID)
    const pxMatch = clean.match(/pixiv\.net\/(?:[a-zA-Z_-]+\/)?artworks\/(\d+)/i) ||
                    clean.match(/pixiv\.net\/member_illust\.php\?.*illust_id=(\d+)/i);
    if (pxMatch && pxMatch[1]) {
      return { canonicalKey: `px:${pxMatch[1]}`, matchType: 'canonical_id' };
    }

    // 4. E-Hentai / ExHentai Canonicalization (/g/ID/TOKEN)
    const ehMatch = clean.match(/(?:e-hentai\.org|exhentai\.org)\/g\/(\d+)\/([a-zA-Z0-9]+)/i);
    if (ehMatch && ehMatch[1] && ehMatch[2]) {
      return { canonicalKey: `eh:g:${ehMatch[1]}:${ehMatch[2]}`, matchType: 'canonical_id' };
    }

    // 5. Bilibili Canonicalization (video/BV... or av...)
    const biliMatch = clean.match(/bilibili\.com\/video\/([a-zA-Z0-9]+)/i);
    if (biliMatch && biliMatch[1]) {
      return { canonicalKey: `bili:${biliMatch[1]}`, matchType: 'canonical_id' };
    }

    // 6. Generic URLs: strip common tracking params (utm, fbclid, gclid, etc.)
    const trackingParams = new Set([
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'dclid', 'ref', 'spm', 'igshid', '_ga'
    ]);

    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (!trackingParams.has(lowerKey)) {
        cleanParams.append(lowerKey, val);
      }
    });

    cleanParams.sort();
    const queryString = cleanParams.toString();
    const canonicalKey = `${host}${pathname}${queryString ? '?' + queryString : ''}`.toLowerCase();

    return { canonicalKey, matchType: 'exact_url' };
  } catch {
    return {
      canonicalKey: clean.toLowerCase().replace(/\/+$/, ''),
      matchType: 'exact_url'
    };
  }
}

export interface DuplicateCluster {
  id: string;
  canonicalKey: string;
  matchType: 'exact_url' | 'canonical_id' | 'similar_title_domain';
  reasonThai: string;
  items: MediaItem[];
  masterItemId: string; // Recommended item to keep
}

export type DeduplicationStrategy = 'keep_highest_engagement' | 'keep_oldest' | 'keep_newest';

/**
 * Calculates a quality score for an item to recommend the best Master copy.
 */
export function calculateItemQualityScore(item: MediaItem, strategy: DeduplicationStrategy = 'keep_highest_engagement'): number {
  if (strategy === 'keep_oldest') {
    return -new Date(item.createdAt || 0).getTime();
  }
  if (strategy === 'keep_newest') {
    return new Date(item.createdAt || 0).getTime();
  }

  // Default: keep highest engagement and richest content
  let score = 0;
  score += (item.likesCount || 0) * 20;
  score += (item.viewsCount || 0) * 1;
  if (item.description && item.description.trim().length > 10) score += 15;
  if (item.tags && item.tags.length > 0) score += item.tags.length * 3;
  if (item.thumbnailUrl && !item.thumbnailUrl.includes('unsplash')) score += 10;
  if (item.isPinned) score += 30;

  // Tie-breaker: older original item
  score += (1 / (new Date(item.createdAt || 0).getTime() || 1)) * 1000;
  return score;
}

/**
 * Detects all duplicate item clusters in the vault.
 */
export function detectDuplicateClusters(items: MediaItem[]): DuplicateCluster[] {
  if (!items || items.length === 0) return [];

  // Group items by canonical key
  const keyMap = new Map<string, { items: MediaItem[]; matchType: 'exact_url' | 'canonical_id' }>();

  items.forEach((item) => {
    if (!item.url) return;
    const { canonicalKey, matchType } = normalizeUrlForDeduplication(item.url);
    if (!canonicalKey) return;

    const existing = keyMap.get(canonicalKey);
    if (existing) {
      existing.items.push(item);
    } else {
      keyMap.set(canonicalKey, { items: [item], matchType });
    }
  });

  const clusters: DuplicateCluster[] = [];
  let clusterCounter = 1;

  keyMap.forEach(({ items: groupItems, matchType }, canonicalKey) => {
    if (groupItems.length >= 2) {
      // Find the highest quality item to recommend as Master
      let bestItem = groupItems[0];
      let bestScore = calculateItemQualityScore(bestItem);

      for (let i = 1; i < groupItems.length; i++) {
        const score = calculateItemQualityScore(groupItems[i]);
        if (score > bestScore) {
          bestScore = score;
          bestItem = groupItems[i];
        }
      }

      let reasonThai = 'URL ปลายทางตรงกันทุกประการ (Exact URL Match)';
      if (matchType === 'canonical_id') {
        if (canonicalKey.startsWith('yt:')) {
          reasonThai = 'คลิปวิดีโอ YouTube เดียวกัน (Same Video ID)';
        } else if (canonicalKey.startsWith('tw:')) {
          reasonThai = 'ทวีตหรือโพสต์ X/Twitter เดียวกัน (Same Tweet ID)';
        } else if (canonicalKey.startsWith('px:')) {
          reasonThai = 'ภาพผลงาน Pixiv เดียวกัน (Same Artwork ID)';
        } else if (canonicalKey.startsWith('eh:')) {
          reasonThai = 'แกลเลอรี E-Hentai เดียวกัน (Same Gallery ID)';
        } else {
          reasonThai = 'รหัสปลายทางของแพลตฟอร์มตรงกัน (Same Resource ID)';
        }
      }

      clusters.push({
        id: `dup_cluster_${clusterCounter++}`,
        canonicalKey,
        matchType,
        reasonThai,
        items: groupItems,
        masterItemId: bestItem.id,
      });
    }
  });

  // Sort clusters: clusters with more duplicates or higher likes first
  clusters.sort((a, b) => {
    if (b.items.length !== a.items.length) {
      return b.items.length - a.items.length;
    }
    const totalLikesA = a.items.reduce((acc, it) => acc + (it.likesCount || 0), 0);
    const totalLikesB = b.items.reduce((acc, it) => acc + (it.likesCount || 0), 0);
    return totalLikesB - totalLikesA;
  });

  return clusters;
}

/**
 * Resolves a duplicate cluster by merging metadata into the chosen master item
 * and returning the items that should be removed.
 */
export function resolveDuplicateCluster(
  cluster: DuplicateCluster,
  strategy: DeduplicationStrategy = 'keep_highest_engagement',
  manualMasterId?: string
): {
  masterItem: MediaItem;
  itemsToDelete: MediaItem[];
  mergedLikesCount: number;
  mergedViewsCount: number;
} {
  const chosenMasterId = manualMasterId || cluster.masterItemId;
  let master = cluster.items.find((it) => it.id === chosenMasterId) || cluster.items[0];

  const itemsToDelete = cluster.items.filter((it) => it.id !== master.id);

  // Merge tags from all duplicates
  const allTags = new Set<string>(master.tags || []);
  itemsToDelete.forEach((dup) => {
    (dup.tags || []).forEach((tg) => allTags.add(tg));
  });

  // Merge engagement: accumulate likes and views
  let totalLikes = master.likesCount || 0;
  let totalViews = master.viewsCount || 0;

  itemsToDelete.forEach((dup) => {
    totalLikes += (dup.likesCount || 0);
    totalViews += (dup.viewsCount || 0);
  });

  // If master has no description but a duplicate has one, preserve it
  let description = master.description;
  if (!description || description.trim().length === 0) {
    const withDesc = itemsToDelete.find((it) => it.description && it.description.trim().length > 0);
    if (withDesc) {
      description = withDesc.description;
    }
  }

  // Preserve isPinned if any item was pinned
  const isPinned = master.isPinned || itemsToDelete.some((it) => it.isPinned);

  const updatedMaster: MediaItem = {
    ...master,
    tags: Array.from(allTags),
    likesCount: totalLikes,
    viewsCount: totalViews,
    description: description,
    isPinned: isPinned,
    updatedAt: new Date().toISOString(),
  };

  return {
    masterItem: updatedMaster,
    itemsToDelete,
    mergedLikesCount: totalLikes,
    mergedViewsCount: totalViews,
  };
}

/**
 * Related Posts Detection
 * Calculates similarity based on shared tags, category, domain, title tokens, and artist/series hints.
 */
export interface RelatedPostMatch {
  item: MediaItem;
  score: number;
  matchReasons: string[];
  isDuplicate?: boolean;
}

export function findRelatedPosts(
  currentItem: MediaItem,
  allItems: MediaItem[],
  limit = 8
): RelatedPostMatch[] {
  if (!currentItem || !allItems || allItems.length <= 1) return [];

  const currentTitle = decodeHtmlEntities(currentItem.title).toLowerCase();
  const currentTags = new Set((currentItem.tags || []).map((t) => t.toLowerCase().trim()));
  const currentCategory = currentItem.categoryId;
  const currentCanonical = normalizeUrlForDeduplication(currentItem.url);
  
  let currentDomain = '';
  try {
    currentDomain = new URL(currentItem.url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {}

  // Extract artist or group hints from brackets, e.g. [Artist], (Artist), artist:name
  const currentArtistHints: string[] = [];
  const bracketMatches = currentTitle.match(/\[(.*?)\]|\((.*?)\)/g);
  if (bracketMatches) {
    bracketMatches.forEach((m) => {
      const clean = m.replace(/[\[\]\(\)]/g, '').trim().toLowerCase();
      if (clean.length >= 2) currentArtistHints.push(clean);
    });
  }

  const matches: RelatedPostMatch[] = [];

  allItems.forEach((other) => {
    if (other.id === currentItem.id) return; // Skip self

    let score = 0;
    let isDuplicate = false;
    const matchReasons: string[] = [];

    // 0. Exact / Canonical Link Duplicate Detection (Highest priority!)
    const otherCanonical = normalizeUrlForDeduplication(other.url);
    if (
      currentCanonical.canonicalKey &&
      otherCanonical.canonicalKey &&
      currentCanonical.canonicalKey === otherCanonical.canonicalKey
    ) {
      isDuplicate = true;
      score += 200;
      matchReasons.push('🚨 ลิงก์และเนื้อหาเดียวกัน (Duplicate Post)');
    }

    // 1. Tag overlap (high relevance)
    const sharedTags: string[] = [];
    (other.tags || []).forEach((t) => {
      const cleanT = t.toLowerCase().trim();
      if (currentTags.has(cleanT)) {
        sharedTags.push(t);
      }
    });

    if (sharedTags.length > 0) {
      score += sharedTags.length * 15;
      matchReasons.push(`แท็กเดียวกัน (${sharedTags.slice(0, 3).map((t) => `#${t}`).join(', ')})`);
    }

    // 2. Same Category
    if (other.categoryId === currentCategory) {
      score += 12;
      matchReasons.push('หมวดหมู่เดียวกัน');
    }

    // 3. Same Domain / Source site
    if (currentDomain) {
      try {
        const otherDomain = new URL(other.url).hostname.toLowerCase().replace(/^www\./, '');
        if (otherDomain === currentDomain) {
          score += 10;
          matchReasons.push(`แหล่งที่มาเดียวกัน (${otherDomain})`);
        }
      } catch {}
    }

    // 4. Same Artist or Group hints in title
    const otherTitle = decodeHtmlEntities(other.title).toLowerCase();
    for (const hint of currentArtistHints) {
      if (otherTitle.includes(hint)) {
        score += 25;
        matchReasons.push(`ผู้สร้าง/กลุ่มเดียวกัน (${hint})`);
        break;
      }
    }

    // 5. Title word intersection (meaningful keywords with length >= 3)
    const currentWords = new Set(
      currentTitle
        .replace(/[^a-zA-Z0-9\u0E00-\u0E7F]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !['the', 'and', 'for', 'with', 'vol', 'part'].includes(w))
    );

    const otherWords = otherTitle
      .replace(/[^a-zA-Z0-9\u0E00-\u0E7F]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    const matchingWords = otherWords.filter((w) => currentWords.has(w));
    if (matchingWords.length > 0) {
      score += matchingWords.length * 8;
      if (!matchReasons.some((r) => r.includes('ผู้สร้าง'))) {
        matchReasons.push(`ชื่อเรื่องคล้ายกัน (${matchingWords.slice(0, 2).join(', ')})`);
      }
    }

    // 6. Media type similarity
    if (other.mediaType === currentItem.mediaType) {
      score += 4;
    }

    if (score >= 15) {
      matches.push({
        item: other,
        score,
        matchReasons,
        isDuplicate,
      });
    }
  });

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}
