import { MediaItem } from '../types';

/**
 * Normalizes text for typo-tolerant, case-insensitive, and accent-insensitive matching.
 * Also cleans Thai diacritics / tone marks for phonetic fallback.
 */
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove latin diacritics
    .trim();
}

/**
 * Remove Thai tone marks and short vowel marks for phonetic typo-tolerance
 */
function stripThaiDiacritics(text: string): string {
  // \u0e31 (mai han-akat), \u0e34-\u0e39 (sara i, ii, ue, uee, u, uu), \u0e47-\u0e4e (mai tai khu, tone marks, thanthakhat)
  return text.replace(/[\u0e31\u0e34-\u0e39\u0e47-\u0e4e]/g, '');
}

/**
 * Damerau-Levenshtein distance calculating insertions, deletions, substitutions,
 * and character transpositions (e.g., 'teh' -> 'the', 'spofity' -> 'spotify').
 */
function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;

  const d: number[][] = [];
  for (let i = 0; i <= al; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[al][bl];
}

/**
 * Fuzzy Subsequence Matching (FZF / VS Code style):
 * Determines if characters of the query appear in order in the target text.
 * Gives bonuses for compactness, consecutive runs, and word boundary matches.
 * Example: 'chrar' matches 'cherachera' because c-h-...-r-a-...-r appear in sequence!
 */
function subsequenceScore(query: string, target: string): number {
  if (!query || !target || query.length > target.length) return 0;

  let qi = 0;
  let ti = 0;
  const matchIndices: number[] = [];
  let consecutive = 0;
  let consecutiveBonus = 0;

  while (qi < query.length && ti < target.length) {
    if (query[qi] === target[ti]) {
      matchIndices.push(ti);
      if (matchIndices.length > 1 && matchIndices[matchIndices.length - 2] === ti - 1) {
        consecutive++;
        consecutiveBonus += consecutive * 6;
      } else {
        consecutive = 0;
      }
      qi++;
    }
    ti++;
  }

  if (qi < query.length) return 0; // Not a complete subsequence

  const span = matchIndices[matchIndices.length - 1] - matchIndices[0] + 1;
  const compactness = query.length / span; // 1.0 = adjacent
  const startBonus = matchIndices[0] === 0 ? 15 : Math.max(0, 10 - matchIndices[0]);

  return Math.min(80, Math.round(32 * compactness + consecutiveBonus + startBonus));
}

/**
 * Sliding Window Distance:
 * Evaluates the query against substrings of the target with similar length.
 * Tolerates typos within large words or sentences.
 */
function slidingWindowSimilarity(query: string, target: string): number {
  const qLen = query.length;
  const tLen = target.length;
  if (qLen === 0 || tLen === 0) return 0;

  if (tLen <= qLen + 2) {
    const d = damerauLevenshtein(query, target);
    const maxL = Math.max(qLen, tLen);
    return Math.max(0, 1 - d / maxL);
  }

  let bestSim = 0;
  const minWindow = Math.max(2, qLen - 2);
  const maxWindow = Math.min(tLen, qLen + 3);

  for (let len = minWindow; len <= maxWindow; len++) {
    for (let i = 0; i <= tLen - len; i++) {
      const window = target.slice(i, i + len);
      const dist = damerauLevenshtein(query, window);
      const sim = 1 - dist / Math.max(qLen, len);
      if (sim > bestSim) bestSim = sim;
    }
  }
  return bestSim;
}

/**
 * Sorensen-Dice Bigram Similarity:
 * Measures lexical overlap regardless of small insertions or deletions.
 */
function bigramSimilarity(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return 0;

  const getBigrams = (str: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      map.set(bg, (map.get(bg) || 0) + 1);
    }
    return map;
  };

  const bgA = getBigrams(a);
  const bgB = getBigrams(b);
  let intersection = 0;

  for (const [bg, count] of bgA.entries()) {
    if (bgB.has(bg)) {
      intersection += Math.min(count, bgB.get(bg)!);
    }
  }

  const total = (a.length - 1) + (b.length - 1);
  return total > 0 ? (2 * intersection) / total : 0;
}

/**
 * Computes comprehensive fuzzy relevance score between query and a single target string.
 * Combines exact, prefix, substring, subsequence, sliding-window edit distance,
 * consonant skeleton, and bigram similarity.
 */
function computeIntelligentScore(query: string, target: string): number {
  if (!query || !target) return 0;

  const q = normalizeText(query);
  const t = normalizeText(target);

  // 1. Exact match
  if (t === q) return 100;

  // 2. Starts with query
  if (t.startsWith(q)) return 88;

  // 3. Substring match
  const subIdx = t.indexOf(q);
  if (subIdx !== -1) {
    return Math.max(60, 80 - Math.min(subIdx, 20));
  }

  // 4. Subsequence score (e.g. 'chrar' in 'cherachera')
  const subseq = subsequenceScore(q, t);

  // 5. Sliding window Damerau-Levenshtein similarity
  const windowSim = slidingWindowSimilarity(q, t);
  const windowScore = windowSim >= 0.5 ? Math.round(windowSim * 72) : 0;

  // 6. Bigram similarity
  const bgSim = bigramSimilarity(q, t);
  const bgScore = bgSim >= 0.35 ? Math.round(bgSim * 50) : 0;

  // 7. Consonant skeleton matching (dropping vowels for English typos like 'chrar' -> 'cherachera')
  const qSkeleton = q.replace(/[aeiouy]/g, '');
  const tSkeleton = t.replace(/[aeiouy]/g, '');
  let skeletonScore = 0;
  if (qSkeleton.length >= 2 && tSkeleton.length >= 2) {
    if (tSkeleton.includes(qSkeleton)) {
      skeletonScore = 48;
    } else {
      const sSub = subsequenceScore(qSkeleton, tSkeleton);
      if (sSub > 0) skeletonScore = Math.round(sSub * 0.85);
    }
  }

  // 8. Thai diacritics / tone mark normalized matching
  let thaiScore = 0;
  const qThai = stripThaiDiacritics(q);
  const tThai = stripThaiDiacritics(t);
  if (qThai !== q || tThai !== t) {
    if (tThai === qThai) thaiScore = 90;
    else if (tThai.startsWith(qThai)) thaiScore = 80;
    else if (tThai.includes(qThai)) thaiScore = 65;
  }

  // 9. Word-by-word token matching
  const qWords = q.split(/[\s\-_\/]+/).filter(Boolean);
  const tWords = t.split(/[\s\-_\/]+/).filter(Boolean);
  let wordScore = 0;

  if (qWords.length > 1 || tWords.length > 1) {
    let totalWordMatches = 0;
    for (const qw of qWords) {
      let bestSingle = 0;
      for (const tw of tWords) {
        if (tw === qw) bestSingle = Math.max(bestSingle, 35);
        else if (tw.startsWith(qw)) bestSingle = Math.max(bestSingle, 30);
        else if (tw.includes(qw)) bestSingle = Math.max(bestSingle, 22);
        else {
          const wSim = slidingWindowSimilarity(qw, tw);
          if (wSim >= 0.6) bestSingle = Math.max(bestSingle, Math.round(wSim * 25));
        }
      }
      totalWordMatches += bestSingle;
    }
    wordScore = Math.round((totalWordMatches / qWords.length) * 1.5);
  }

  return Math.max(subseq, windowScore, bgScore, skeletonScore, thaiScore, wordScore);
}

/**
 * Intelligent Proximity & Typo-Tolerant Search on MediaItems
 */
export function fuzzySearchMedia(items: MediaItem[], query: string): MediaItem[] {
  if (!query || !query.trim()) return items;

  const cleanQuery = query.trim();

  const scored = items.map((item) => {
    // Score across all key searchable fields
    const titleScore = computeIntelligentScore(cleanQuery, item.title) * 2.8;
    const descScore = computeIntelligentScore(cleanQuery, item.description || '') * 1.2;
    const urlScore = computeIntelligentScore(cleanQuery, item.url) * 1.5;
    const siteScore = computeIntelligentScore(cleanQuery, item.siteName || '') * 1.3;

    // Highest tag score with bonus
    let tagScore = 0;
    if (Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        const s = computeIntelligentScore(cleanQuery, tag);
        if (s > tagScore) tagScore = s * 1.8;
      }
    }

    // Media type score if user typed 'video', 'youtube', 'audio', etc.
    const mediaTypeScore = computeIntelligentScore(cleanQuery, item.mediaType) * 0.8;

    const totalScore = titleScore + descScore + urlScore + siteScore + tagScore + mediaTypeScore;

    return { item, score: totalScore };
  });

  // Keep items that match with sufficient confidence (score > 15)
  // and sort descending by calculated relevance score
  return scored
    .filter((entry) => entry.score >= 15)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
