import { MediaItem } from '../types';
import { intelligentSearch, IntelligentSearchResult } from './fuzzySearch';
import type { SearchWorkerRequest, SearchWorkerResponse } from '../workers/search.worker';

let worker: Worker | null = null;
let currentRequestId = 0;
let lastItemsRef: MediaItem[] = [];
let lastQueryRef = '';
const pendingCallbacks = new Map<number, (res: IntelligentSearchResult) => void>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!worker) {
    try {
      worker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.addEventListener('message', (e: MessageEvent<SearchWorkerResponse>) => {
        const { id, result } = e.data;
        const cb = pendingCallbacks.get(id);
        if (cb) {
          cb(result);
          pendingCallbacks.delete(id);
        }
      });
      worker.addEventListener('error', (err) => {
        console.warn('Search worker error, falling back to main thread:', err);
        for (const [, cb] of pendingCallbacks) {
          try {
            cb(intelligentSearch(lastItemsRef, lastQueryRef));
          } catch {
            // fallback
          }
        }
        pendingCallbacks.clear();
        worker = null;
      });
    } catch {
      worker = null;
    }
  }
  return worker;
}

/**
 * Offloads intelligent fuzzy search to a dedicated Web Worker.
 * If Web Workers are unavailable or fail, gracefully falls back to synchronous execution.
 */
export function runIntelligentSearch(
  items: MediaItem[],
  query: string
): Promise<IntelligentSearchResult> {
  const trimmed = (query || '').trim();
  lastItemsRef = items;
  lastQueryRef = trimmed;

  if (!trimmed) {
    return Promise.resolve({
      items,
      matchReasons: {},
      exactIdMatch: null,
      totalMatches: items.length,
    });
  }

  const w = getWorker();
  if (!w) {
    return Promise.resolve(intelligentSearch(items, trimmed));
  }

  return new Promise((resolve) => {
    currentRequestId++;
    const reqId = currentRequestId;

    // Remove any older pending requests that were superseded
    for (const [id] of pendingCallbacks) {
      if (id < reqId) {
        pendingCallbacks.delete(id);
      }
    }

    pendingCallbacks.set(reqId, resolve);
    w.postMessage({ id: reqId, items, query: trimmed } as SearchWorkerRequest);
  });
}
