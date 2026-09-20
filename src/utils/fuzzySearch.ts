import { MediaItem } from '../types';

/**
 * Bidirectional QWERTY <-> Thai Kedmanee Keyboard mapping
 * Fixes accidental language layout slips (e.g. 'ัสนะีิำ' -> 'youtube', 'giy\'g' -> 'เพลง')
 */
const EN_QWERTY = "1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:\"ZXCVBNM<>?";
const TH_KEDMANEE = "ๅ/-ภถุึคตจขชๆไำพะัีรนยบลฃฟหกดเ้่าสวงผปแอิืทมใฝ+๑๒๓๔ู฿๕๖๗๘๙๐\"ฎฑธํ๊ณฯญีฐ,ฤฆฏโฌ็๋ษศศซ.?()ฉฮฺ์?ฒฬฦ";

export function convertKeyboardLayout(text: string): { enToTh: string; thToEn: string } {
  let enToTh = '';
  let thToEn = '';

  for (const char of text) {
    // EN -> TH
    const enIdx = EN_QWERTY.indexOf(char);
    enToTh += enIdx !== -1 && enIdx < TH_KEDMANEE.length ? TH_KEDMANEE[enIdx] : char;

    // TH -> EN
    const thIdx = TH_KEDMANEE.indexOf(char);
    thToEn += thIdx !== -1 && thIdx < EN_QWERTY.length ? EN_QWERTY[thIdx] : char;
  }

  return { enToTh, thToEn };
}

/**
 * Normalizes text for typo-tolerant, case-insensitive, and accent-insensitive matching.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove latin diacritics
    .trim();
}

/**
 * Remove Thai tone marks and vowel marks for phonetic typo-tolerance
 */
export function stripThaiDiacritics(text: string): string {
  return text.replace(/[\u0e31\u0e34-\u0e39\u0e47-\u0e4e]/g, '');
}

/**
 * Damerau-Levenshtein distance calculating insertions, deletions, substitutions,
 * and character transpositions (e.g., 'teh' -> 'the', 'spofity' -> 'spotify').
 */
export function damerauLevenshtein(a: string, b: string): number {
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
 * Fuzzy Subsequence Matching (FZF / VS Code style)
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

  if (qi < query.length) return 0;

  const span = matchIndices[matchIndices.length - 1] - matchIndices[0] + 1;
  const compactness = query.length / span;
  const startBonus = matchIndices[0] === 0 ? 15 : Math.max(0, 10 - matchIndices[0]);

  return Math.min(80, Math.round(32 * compactness + consecutiveBonus + startBonus));
}

/**
 * Sliding Window Distance for substring typo tolerance
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
 * Sorensen-Dice Bigram Similarity
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
 * Computes deep fuzzy score between single query and target string
 */
export function computeIntelligentScore(query: string, target: string): number {
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

  // 4. Subsequence score
  const subseq = subsequenceScore(q, t);

  // 5. Sliding window Damerau-Levenshtein similarity
  const windowSim = slidingWindowSimilarity(q, t);
  const windowScore = windowSim >= 0.5 ? Math.round(windowSim * 72) : 0;

  // 6. Bigram similarity
  const bgSim = bigramSimilarity(q, t);
  const bgScore = bgSim >= 0.35 ? Math.round(bgSim * 50) : 0;

  // 7. Consonant skeleton matching (dropping vowels for typo tolerance like 'chrar' -> 'cherachera')
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
    wordScore = Math.round((totalWordMatches / Math.max(1, qWords.length)) * 1.5);
  }

  return Math.max(subseq, windowScore, bgScore, skeletonScore, thaiScore, wordScore);
}

/**
 * Extract distinct words/tokens across all media items to build a live dynamic dictionary
 */
export function buildVaultDictionary(items: MediaItem[]): Set<string> {
  const dict = new Set<string>();

  // Curated common tech / media words
  const baseWords = [
    'cyberpunk', 'synthwave', 'modular', 'synthesizer', 'youtube', 'pixiv',
    'twitter', 'gemini', 'deepmind', 'vimeo', 'supabase', 'postgresql',
    'tachikoma', 'blade', 'runner', 'vangelis', 'video', 'audio', 'image',
    'illustration', 'artwork', 'social', 'architecture', 'interface',
    'วิดีโอ', 'เพลง', 'ภาพ', 'รูปภาพ', 'อนิเมะ', 'ศิลปะ', 'บทความ', 'ไซเบอร์'
  ];
  baseWords.forEach((w) => dict.add(normalizeText(w)));

  for (const item of items) {
    // Add words from title
    const titleTokens = item.title.split(/[\s\-_\/.,;:'"!?()\[\]{}]+/).filter((w) => w.length >= 2);
    titleTokens.forEach((t) => dict.add(normalizeText(t)));

    // Add tags
    if (Array.isArray(item.tags)) {
      item.tags.forEach((tg) => dict.add(normalizeText(tg)));
    }

    // Add siteName
    if (item.siteName) {
      item.siteName.split(/\s+/).forEach((w) => dict.add(normalizeText(w)));
    }

    // Add filename
    if (item.fileName) {
      item.fileName.replace(/\.[^/.]+$/, '').split(/[\s\-_]+/).forEach((w) => dict.add(normalizeText(w)));
    }
  }

  return dict;
}

/**
 * Find the closest vocabulary word if user has a typo (e.g. 'cuberpunk' -> 'cyberpunk')
 */
export function findTypoCorrection(token: string, dictionary: Set<string>): string | null {
  const norm = normalizeText(token);
  if (!norm || norm.length < 3 || /^\d+$/.test(norm)) return null;
  if (dictionary.has(norm)) return null; // exact match already, no correction needed

  let bestCandidate: string | null = null;
  let minDistance = Infinity;
  let maxSim = 0;

  for (const word of dictionary) {
    if (Math.abs(word.length - norm.length) > 2) continue;

    const dist = damerauLevenshtein(norm, word);
    const sim = 1 - dist / Math.max(norm.length, word.length);

    // If edit distance is 1 or 2 with high similarity
    if (dist <= 2 && sim >= 0.70) {
      if (dist < minDistance || (dist === minDistance && sim > maxSim)) {
        minDistance = dist;
        maxSim = sim;
        bestCandidate = word;
      }
    }
  }

  return bestCandidate;
}

/**
 * Result structure of the Google-grade intelligent search
 */
export interface IntelligentSearchResult {
  items: MediaItem[];
  suggestedQuery?: string;
  isAutoCorrected?: boolean;
  matchReasons: Record<string, string>;
  exactIdMatch?: MediaItem;
  totalMatches: number;
  extractedId?: number;
}

/**
 * Intelligent Google-grade search engine:
 * 1. Detects numeric ID (#45, 45, id:45, no. 45) -> Prioritizes post #45 at absolute top #1!
 * 2. Thai <-> English keyboard slip translation (e.g. 'แถทเน' -> 'vault')
 * 3. Dynamic vocabulary spelling correction & Google-style "Did you mean?" suggestions
 * 4. Multi-token scoring across ID, title, tags, description, site, url, category, and mediaType
 */
export function intelligentSearch(items: MediaItem[], query: string): IntelligentSearchResult {
  const matchReasons: Record<string, string> = {};

  if (!query || !query.trim()) {
    return {
      items,
      matchReasons,
      totalMatches: items.length,
    };
  }

  const cleanQuery = query.trim();
  const lowerQuery = cleanQuery.toLowerCase();

  // 1. Check for ID search pattern: #45, 45, id:45, # 45, no. 45, โพสต์ 45, เลข 45
  const idMatch = cleanQuery.match(/^(?:#|id\s*:?\s*|no\.?\s*|โพสต์\s*:?\s*|เลข\s*:?\s*)?(\d+)$/i);
  let targetNumber: number | null = null;
  if (idMatch && idMatch[1]) {
    targetNumber = parseInt(idMatch[1], 10);
  }

  // 2. Dynamic dictionary for spell checking
  const dictionary = buildVaultDictionary(items);

  // Check keyboard layout conversion if no direct match or for suggestion
  const { enToTh, thToEn } = convertKeyboardLayout(cleanQuery);
  let convertedSuggestion: string | null = null;

  // 3. Calculate query corrections
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);
  let hasCorrection = false;
  const correctedTokens = tokens.map((tk) => {
    const correction = findTypoCorrection(tk, dictionary);
    if (correction && correction !== tk.toLowerCase()) {
      hasCorrection = true;
      return correction;
    }
    return tk;
  });

  let suggestedQuery: string | undefined = undefined;
  if (hasCorrection) {
    suggestedQuery = correctedTokens.join(' ');
  } else if (thToEn !== cleanQuery && thToEn.length >= 3) {
    // If typing English on Thai keyboard (e.g. 'ัสนะีิำ' -> 'youtube')
    for (const word of dictionary) {
      if (thToEn.toLowerCase().includes(word) || word.includes(thToEn.toLowerCase())) {
        convertedSuggestion = thToEn.toLowerCase();
        break;
      }
    }
    if (convertedSuggestion) suggestedQuery = convertedSuggestion;
  }

  // 4. Score all items
  const scored = items.map((item) => {
    let score = 0;
    const reasons: string[] = [];

    const itemNum = item.itemNumber || 0;

    // --- RULE 1: EXACT ID NUMBER MATCH (Massive Top Priority) ---
    if (targetNumber !== null && itemNum === targetNumber) {
      score += 1000000; // Unbeatable score, appears #1
      reasons.push(`ตรงกับรหัสโพสต์ #${targetNumber} โดยตรง (อันดับ 1)`);
    } else if (targetNumber !== null && item.id.includes(String(targetNumber))) {
      score += 500000;
      reasons.push(`ตรงกับรหัสอ้างอิง ${targetNumber}`);
    } else if (targetNumber !== null && item.url.includes(String(targetNumber))) {
      score += 300000;
      reasons.push(`URL มีรหัสตัวเลข #${targetNumber}`);
    }

    // --- RULE 2: TITLE MATCHING (High weight) ---
    const titleScore = computeIntelligentScore(cleanQuery, item.title);
    if (titleScore > 0) {
      score += titleScore * 4.0;
      if (titleScore >= 70) reasons.push('ตรงกับชื่อรายการ');
    }

    // --- RULE 3: TAG MATCHING ---
    let bestTagScore = 0;
    let matchedTagName = '';
    if (Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        const s = computeIntelligentScore(cleanQuery, tag);
        if (s > bestTagScore) {
          bestTagScore = s;
          matchedTagName = tag;
        }
      }
    }
    if (bestTagScore > 0) {
      score += bestTagScore * 3.5;
      if (bestTagScore >= 60) reasons.push(`ตรงกับแท็ก #${matchedTagName}`);
    }

    // --- RULE 4: DESCRIPTION MATCHING ---
    if (item.description) {
      const descScore = computeIntelligentScore(cleanQuery, item.description);
      if (descScore > 0) {
        score += descScore * 1.5;
      }
    }

    // --- RULE 5: URL & DOMAIN / SITENAME MATCHING ---
    const siteScore = computeIntelligentScore(cleanQuery, item.siteName || '');
    if (siteScore > 0) {
      score += siteScore * 2.0;
      if (siteScore >= 70) reasons.push(`ตรงกับแหล่งที่มา ${item.siteName}`);
    }

    const urlScore = computeIntelligentScore(cleanQuery, item.url);
    if (urlScore > 0) {
      score += urlScore * 1.6;
    }

    // --- RULE 6: MEDIA TYPE & CATEGORY MATCHING ---
    const mediaTypeScore = computeIntelligentScore(cleanQuery, item.mediaType);
    if (mediaTypeScore >= 70) {
      score += mediaTypeScore * 1.2;
      reasons.push(`ประเภทสื่อ ${item.mediaType}`);
    }

    // --- RULE 7: MULTI-TOKEN ALL-MATCH BONUS ---
    if (tokens.length > 1) {
      const allTokensMatch = tokens.every((tk) => {
        const tScore = Math.max(
          computeIntelligentScore(tk, item.title),
          computeIntelligentScore(tk, item.description || ''),
          computeIntelligentScore(tk, item.siteName || ''),
          ...((item.tags || []).map((t) => computeIntelligentScore(tk, t)))
        );
        return tScore >= 35;
      });

      if (allTokensMatch) {
        score *= 2.0; // 2x proximity boost when all search tokens are present
        reasons.push('ตรงกับคำค้นหาครบทุกคำ');
      }
    }

    // If query has a suggestion, also give partial credit for the suggestion
    if (suggestedQuery && score < 15) {
      const sScore = computeIntelligentScore(suggestedQuery, item.title);
      if (sScore >= 60) {
        score += sScore * 2.0;
        reasons.push(`ใกล้เคียงกับ "${suggestedQuery}"`);
      }
    }

    if (reasons.length > 0) {
      matchReasons[item.id] = reasons.join(' • ');
    }

    return { item, score };
  });

  // Filter and sort
  const matched = scored
    .filter((entry) => entry.score >= 15)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  // Check if an exact ID matched
  const exactIdMatch = targetNumber !== null ? matched.find((i) => i.itemNumber === targetNumber) : undefined;

  // Auto-correct fallback if original query found 0 results but suggestion has results!
  if (matched.length === 0 && suggestedQuery && suggestedQuery !== cleanQuery) {
    const fallbackResults = intelligentSearch(items, suggestedQuery);
    if (fallbackResults.items.length > 0) {
      return {
        items: fallbackResults.items,
        suggestedQuery,
        isAutoCorrected: true,
        matchReasons: fallbackResults.matchReasons,
        totalMatches: fallbackResults.items.length,
        extractedId: targetNumber || undefined,
      };
    }
  }

  return {
    items: matched,
    suggestedQuery: suggestedQuery !== cleanQuery ? suggestedQuery : undefined,
    isAutoCorrected: false,
    matchReasons,
    exactIdMatch,
    totalMatches: matched.length,
    extractedId: targetNumber || undefined,
  };
}

/**
 * Drop-in replacement for existing fuzzySearchMedia: returns the items list
 */
export function fuzzySearchMedia(items: MediaItem[], query: string): MediaItem[] {
  return intelligentSearch(items, query).items;
}
