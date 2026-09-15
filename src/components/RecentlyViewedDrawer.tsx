import React, { useState, useMemo } from 'react';
import { 
  X, 
  Clock, 
  Trash2, 
  ExternalLink, 
  Maximize2,
  Search,
  Eye,
  Sparkles,
  History
} from 'lucide-react';
import { MediaItem } from '../types';
import { RecentlyViewedRecord, getDomainFromUrl } from '../utils/storage';
import { useTranslation } from '../context/LanguageContext';

interface RecentlyViewedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recentRecords: RecentlyViewedRecord[];
  allItems: MediaItem[];
  onPreview: (item: MediaItem) => void;
  onRecordView?: (item: MediaItem) => void;
  onRemoveItem?: (itemId: string) => void;
  onClearHistory: () => void;
}

export const RecentlyViewedDrawer: React.FC<RecentlyViewedDrawerProps> = ({
  isOpen,
  onClose,
  recentRecords,
  allItems,
  onPreview,
  onRecordView,
  onRemoveItem,
  onClearHistory,
}) => {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  function formatRelativeTime(isoString: string): string {
    try {
      const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (language === 'th') {
        if (minutes < 1) return 'เมื่อสักครู่';
        if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
        if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
        return `${days} วันที่แล้ว`;
      }
      if (language === 'ja') {
        if (minutes < 1) return 'たった今';
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        return `${days}日前`;
      }

      if (minutes < 1) return t.recent.justNow || 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    } catch {
      return t.recent.justNow || 'Just now';
    }
  }

  function formatViewCountText(count: number): string {
    if (language === 'th') return `เข้าชม ${count} ครั้ง`;
    if (language === 'ja') return `${count}回 閲覧`;
    return `Viewed ${count} ${count === 1 ? 'time' : 'times'}`;
  }

  // Map records to full media items with strict item existence verification
  const itemsMap = new Map<string, MediaItem>(allItems.map((i) => [i.id, i]));
  
  // Intelligent resolution: map records preserving exact chronological order and accurate view frequency
  const mappedRecentItems = useMemo(() => {
    return recentRecords
      .map((record) => {
        const item = itemsMap.get(record.itemId);
        if (!item) return null;
        return {
          item,
          viewedAt: record.viewedAt,
          viewCount: typeof record.viewCount === 'number' && record.viewCount > 0 ? record.viewCount : 1,
        };
      })
      .filter(Boolean) as { item: MediaItem; viewedAt: string; viewCount: number }[];
  }, [recentRecords, allItems]);

  // Quick search filter within recently viewed history
  const filteredRecentItems = useMemo(() => {
    if (!searchQuery.trim()) return mappedRecentItems;
    const q = searchQuery.toLowerCase().trim();
    return mappedRecentItems.filter(({ item }) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = (item.description || '').toLowerCase().includes(q);
      const siteMatch = (item.siteName || '').toLowerCase().includes(q);
      const tagMatch = (item.tags || []).some((tag) => tag.toLowerCase().includes(q));
      return titleMatch || descMatch || siteMatch || tagMatch;
    });
  }, [mappedRecentItems, searchQuery]);

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md h-full bg-[#0d1018] dark:bg-[#0d1018] border-l border-white/10 flex flex-col shadow-2xl gpu-layer animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#090a0f]/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 font-display tracking-wider">
                  {t.recent.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {mappedRecentItems.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>
                  {mappedRecentItems.length === 1 
                    ? (language === 'th' ? 'มี 1 รายการในประวัติ' : '1 recorded item') 
                    : (language === 'th' ? `ตรวจพบล่าสุด ${mappedRecentItems.length} รายการ` : `${mappedRecentItems.length} recorded items`)}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-target"
            aria-label={t.common.close}
            title={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search Bar when user has items */}
        {mappedRecentItems.length > 3 && (
          <div className="px-4 py-2.5 border-b border-white/5 bg-[#090a0f]/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'th' ? 'ค้นหาในประวัติการดู...' : 'Filter history...'}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Drawer List Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {mappedRecentItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
                <History className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-slate-200">{t.recent.empty}</p>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                {t.recent.emptyDesc || 'รายการที่คุณเปิดดู พรีวิว หรือกดเข้าชมจะถูกบันทึกที่นี่แบบเรียลไทม์'}
              </p>
            </div>
          ) : filteredRecentItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              ไม่พบรายการที่ค้นหาในประวัติ
            </div>
          ) : (
            filteredRecentItems.map(({ item, viewedAt, viewCount }) => (
              <div
                key={item.id}
                className="group relative flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all touch-target"
              >
                {/* Thumbnail Preview Trigger */}
                <div 
                  className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-black cursor-pointer border border-white/5 group-hover:border-cyan-500/30 transition-colors"
                  onClick={() => {
                    onPreview(item);
                    onClose();
                  }}
                  title="คลิกเพื่อพรีวิว"
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600 text-xs font-mono">
                      {item.mediaType}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>

                {/* Details */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    onPreview(item);
                    onClose();
                  }}
                >
                  {/* Top Metadata: Media Type & Time */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span className="font-mono uppercase px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                      {item.mediaType}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {formatRelativeTime(viewedAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h4>

                  {/* Subtitle & Smart View Frequency Badge */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                      {item.siteName || getDomainFromUrl(item.url)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10" title="จำนวนครั้งที่คุณเปิดเข้าชม">
                      <Eye className="w-3 h-3 text-cyan-400" />
                      {formatViewCountText(viewCount)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  {/* External Visit */}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRecordView?.(item);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-target"
                    title={t.card.source}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Individual Item Remove from History */}
                  {onRemoveItem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(item.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors touch-target"
                      title={language === 'th' ? 'ลบรายการนี้ออกจากประวัติ' : 'Remove from history'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer with Clear All Button */}
        {mappedRecentItems.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-[#090a0f]/95 flex items-center justify-between sticky bottom-0 z-10">
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-xl transition-all touch-target border border-transparent hover:border-rose-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.recent.clearHistory}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white transition-all touch-target"
            >
              {t.common.done}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
