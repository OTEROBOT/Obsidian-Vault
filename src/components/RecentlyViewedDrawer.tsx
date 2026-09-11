import React from 'react';
import { 
  X, 
  Clock, 
  Trash2, 
  ExternalLink, 
  Maximize2, 
  Play, 
  Volume2, 
  Image as ImageIcon, 
  Globe 
} from 'lucide-react';
import { MediaItem } from '../types';
import { RecentlyViewedRecord } from '../utils/storage';

interface RecentlyViewedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recentRecords: RecentlyViewedRecord[];
  allItems: MediaItem[];
  onPreview: (item: MediaItem) => void;
  onClearHistory: () => void;
}

function formatRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Recently';
  }
}

export const RecentlyViewedDrawer: React.FC<RecentlyViewedDrawerProps> = ({
  isOpen,
  onClose,
  recentRecords,
  allItems,
  onPreview,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  // Map records to full media items
  const itemsMap = new Map<string, MediaItem>(allItems.map((i) => [i.id, i]));
  const recentItems = recentRecords
    .map((record) => {
      const item = itemsMap.get(record.itemId);
      return item ? { item, viewedAt: record.viewedAt } : null;
    })
    .filter(Boolean) as { item: MediaItem; viewedAt: string }[];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md h-full glass-panel border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#090a0f]/90">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-display tracking-wider">
                RECENTLY VIEWED
              </h3>
              <p className="text-[11px] text-slate-400">
                Synced in local device memory ({recentItems.length} links)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {recentItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">No recent activity</p>
              <p className="text-xs text-slate-500 max-w-xs">
                As you preview videos, listen to audio streams, or inspect web bookmarks, they will appear here.
              </p>
            </div>
          ) : (
            recentItems.map(({ item, viewedAt }) => (
              <div
                key={item.id}
                className="group relative flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all cursor-pointer"
                onClick={() => {
                  onPreview(item);
                  onClose();
                }}
              >
                {/* Thumbnail */}
                <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-black">
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="font-mono uppercase text-cyan-400/80">{item.mediaType}</span>
                    <span>{formatRelativeTime(viewedAt)}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    {item.siteName || new URL(item.url || 'https://vault.local').hostname}
                  </p>
                </div>

                {/* External link button */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                  title="Open source"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer with Clear Button */}
        {recentItems.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-[#090a0f]/90 flex items-center justify-between">
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-medium bg-white/10 text-slate-300 hover:bg-white/20"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
