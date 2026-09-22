import { MediaItem } from '../types';
import { intelligentSearch, IntelligentSearchResult } from '../utils/fuzzySearch';

export interface SearchWorkerRequest {
  id: number;
  items: MediaItem[];
  query: string;
}

export interface SearchWorkerResponse {
  id: number;
  result: IntelligentSearchResult;
}

// Listen for search requests offloaded from the main thread
self.addEventListener('message', (e: MessageEvent<SearchWorkerRequest>) => {
  const { id, items, query } = e.data;

  try {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      const emptyResult: IntelligentSearchResult = {
        items,
        matchReasons: {},
        exactIdMatch: null,
        totalMatches: items.length,
      };
      self.postMessage({ id, result: emptyResult } as SearchWorkerResponse);
      return;
    }

    const result = intelligentSearch(items, trimmed);
    self.postMessage({ id, result } as SearchWorkerResponse);
  } catch (err) {
    console.error('Search worker error:', err);
    // Return unsearched items in case of calculation failure
    self.postMessage({
      id,
      result: {
        items,
        matchReasons: {},
        exactIdMatch: null,
        totalMatches: items.length,
      },
    } as SearchWorkerResponse);
  }
});
