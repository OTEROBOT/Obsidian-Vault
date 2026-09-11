import { MediaItem } from '../types';

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; ++i) matrix[i] = [i];
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;

  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Computes a fuzzy match score between search query and target text.
 * Higher score means a closer and more relevant match.
 * Returns 0 if no match found.
 */
function computeFuzzyScore(query: string, target: string): number {
  if (!query || !target) return 0;

  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  // Exact match
  if (t === q) return 100;

  // Starts with full query
  if (t.startsWith(q)) return 85;

  // Contains exact substring
  const subIndex = t.indexOf(q);
  if (subIndex !== -1) {
    return 70 - Math.min(subIndex, 20);
  }

  // Word-by-word matching
  const queryWords = q.split(/\s+/).filter(Boolean);
  const targetWords = t.split(/[\s\-_\/]+/).filter(Boolean);

  let wordScore = 0;
  for (const qWord of queryWords) {
    let bestWordMatch = 0;
    for (const tWord of targetWords) {
      if (tWord === qWord) {
        bestWordMatch = Math.max(bestWordMatch, 30);
      } else if (tWord.startsWith(qWord)) {
        bestWordMatch = Math.max(bestWordMatch, 25);
      } else if (tWord.includes(qWord)) {
        bestWordMatch = Math.max(bestWordMatch, 15);
      } else if (qWord.length >= 3 && tWord.length >= 3) {
        // Levenshtein typo tolerance
        const dist = levenshteinDistance(qWord, tWord);
        const maxLen = Math.max(qWord.length, tWord.length);
        if (dist <= 2 && dist / maxLen <= 0.35) {
          bestWordMatch = Math.max(bestWordMatch, 10 - dist * 3);
        }
      }
    }
    wordScore += bestWordMatch;
  }

  return wordScore;
}

/**
 * Perform fuzzy proximity search on a collection of MediaItems
 */
export function fuzzySearchMedia(items: MediaItem[], query: string): MediaItem[] {
  if (!query || !query.trim()) return items;

  const scoredItems = items.map((item) => {
    const titleScore = computeFuzzyScore(query, item.title) * 2.5;
    const descScore = computeFuzzyScore(query, item.description) * 1.0;
    const urlScore = computeFuzzyScore(query, item.url) * 0.8;
    const siteScore = computeFuzzyScore(query, item.siteName || '') * 1.2;
    
    // Tag matching bonus
    let tagScore = 0;
    for (const tag of item.tags) {
      const match = computeFuzzyScore(query, tag);
      if (match > tagScore) tagScore = match * 1.5;
    }

    const totalScore = titleScore + descScore + urlScore + siteScore + tagScore;

    return { item, score: totalScore };
  });

  return scoredItems
    .filter((entry) => entry.score > 8)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
