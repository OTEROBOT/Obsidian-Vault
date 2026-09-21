import React, { useRef, useState } from 'react';
import { 
  Flame, 
  Trophy, 
  Medal, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Heart, 
  Eye, 
  Sparkles,
  ExternalLink,
  Layers,
  X
} from 'lucide-react';
import { Category, MediaItem } from '../types';
import { decodeHtmlEntities } from '../utils/text';

interface TopTenSliderProps {
  items: MediaItem[];
  categories: Category[];
  userLikedItemIds: Set<string>;
  onLike: (id: string) => void;
  onPreview: (item: MediaItem) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const TopTenSlider: React.FC<TopTenSliderProps> = ({
  items,
  categories,
  userLikedItemIds,
  onLike,
  onPreview,
  isCollapsed,
  onToggleCollapse,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Compute Top 10 items based on like count, then views count, then newest
  const topTenItems = React.useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const likesA = a.likesCount || 0;
      const likesB = b.likesCount || 0;
      if (likesB !== likesA) return likesB - likesA;
      const viewsA = a.viewsCount || 0;
      const viewsB = b.viewsCount || 0;
      if (viewsB !== viewsA) return viewsB - viewsA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list.slice(0, 10);
  }, [items]);

  const checkScrollButtons = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScrollButtons, 350);
  };

  const categoryMap = React.useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  if (topTenItems.length === 0) return null;

  return (
    <section 
      aria-label="Top 10 Popular Media"
      className="relative mb-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-b from-[#101423]/90 via-[#0a0d16]/80 to-[#07090e]/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300"
    >
      {/* Decorative cyber ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-28 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute top-0 right-1/4 w-96 h-28 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />

      {/* Header bar */}
      <div className="relative z-10 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-slate-950 shadow-[0_0_16px_rgba(244,63,94,0.35)] shrink-0">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 font-display tracking-wide flex items-center gap-1.5">
                <span>10 อันดับโพสต์ยอดนิยม</span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  TOP 10
                </span>
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-mono">
              จัดอันดับตามจำนวนกดใจ ❤️ สูงสุดในคลัง
            </p>
          </div>
        </div>

        {/* Controls: Prev/Next & Minimize/Close Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!isCollapsed && (
            <>
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Previous Top Posts"
                className={`p-1.5 sm:p-2 rounded-xl border border-white/10 transition-all ${
                  canScrollLeft
                    ? 'text-slate-200 hover:text-white hover:bg-white/10 active:scale-95'
                    : 'text-slate-600 opacity-40 cursor-not-allowed'
                }`}
                title="เลื่อนไปทางซ้าย"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Next Top Posts"
                className={`p-1.5 sm:p-2 rounded-xl border border-white/10 transition-all ${
                  canScrollRight
                    ? 'text-slate-200 hover:text-white hover:bg-white/10 active:scale-95'
                    : 'text-slate-600 opacity-40 cursor-not-allowed'
                }`}
                title="เลื่อนไปทางขวา"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Minimize / Expand Toggle Button ("ปุ่มกดเพื่อปิดปิดสไลดเพราะเผื่อเกะกะ") */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isCollapsed
                ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-white/10'
            }`}
            title={isCollapsed ? 'ขยายแถบ 10 อันดับยอดนิยม' : 'ซ่อนสไลด์นี้เพื่อประหยัดพื้นที่'}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-rose-400" />
                <span>แสดงสไลด์</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ซ่อนสไลด์</span>
                <span className="sm:hidden">ซ่อน</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsed State Quick Preview Bar */}
      {isCollapsed ? (
        <div 
          onClick={onToggleCollapse}
          className="px-4 sm:px-6 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors group"
        >
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">อันดับ #1 ปัจจุบัน:</span>
            <span className="text-cyan-300 font-semibold truncate max-w-xs sm:max-w-md">
              {decodeHtmlEntities(topTenItems[0]?.title || '')}
            </span>
            <span className="text-rose-400 font-mono text-[11px] flex items-center gap-0.5">
              ❤️ {topTenItems[0]?.likesCount || 0}
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 group-hover:underline flex items-center gap-1">
            คลิกเพื่อเปิดดู 10 อันดับ <ChevronDown className="w-3 h-3" />
          </span>
        </div>
      ) : (
        /* Horizontal Carousel of Cards */
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
          className="px-4 sm:px-6 py-4 flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {topTenItems.map((item, index) => {
            const rank = index + 1;
            const isLiked = userLikedItemIds.has(item.id);
            const category = categoryMap.get(item.categoryId);
            const cleanTitle = decodeHtmlEntities(item.title);
            const displayId = item.itemNumber || 1;

            // Rank Styling
            let rankBadgeClass = 'bg-slate-800/90 text-slate-300 border-slate-700';
            let rankIcon = null;
            let borderGlow = 'border-white/10 hover:border-cyan-500/40';

            if (rank === 1) {
              rankBadgeClass = 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)] border-amber-300';
              rankIcon = <Trophy className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />;
              borderGlow = 'border-amber-500/40 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.12)]';
            } else if (rank === 2) {
              rankBadgeClass = 'bg-gradient-to-r from-slate-200 to-zinc-400 text-slate-950 font-black shadow-[0_0_15px_rgba(226,232,240,0.4)] border-slate-200';
              rankIcon = <Medal className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />;
              borderGlow = 'border-slate-400/40 hover:border-slate-300 shadow-[0_0_15px_rgba(226,232,240,0.08)]';
            } else if (rank === 3) {
              rankBadgeClass = 'bg-gradient-to-r from-amber-700 to-orange-600 text-white font-black shadow-[0_0_15px_rgba(217,119,6,0.3)] border-orange-500';
              rankIcon = <Medal className="w-3.5 h-3.5 text-white stroke-[2.5]" />;
              borderGlow = 'border-amber-600/40 hover:border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.08)]';
            } else {
              rankBadgeClass = 'bg-cyan-950/80 text-cyan-300 font-bold border-cyan-500/30';
            }

            return (
              <div
                key={item.id}
                onClick={() => onPreview(item)}
                className={`snap-start shrink-0 w-64 sm:w-72 rounded-2xl bg-[#0e121d]/90 border ${borderGlow} flex flex-col justify-between overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1`}
              >
                {/* Image / Thumbnail Container */}
                <div className="relative aspect-[16/10] w-full bg-slate-950 overflow-hidden">
                  <img
                    src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'}
                    alt={cleanTitle}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e121d] via-black/20 to-transparent pointer-events-none" />

                  {/* Rank Badge */}
                  <div className={`absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono border backdrop-blur-md z-10 ${rankBadgeClass}`}>
                    {rankIcon}
                    <span>#{rank}</span>
                  </div>

                  {/* Post ID Tag */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/30 z-10">
                    #{displayId}
                  </div>

                  {/* Likes pill on thumbnail */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 backdrop-blur-md border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold z-10">
                    <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                    <span>{item.likesCount || 0}</span>
                  </div>

                  {/* Media Type pill */}
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 text-slate-300 text-[10px] uppercase font-mono border border-white/10 z-10">
                    {item.mediaType}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Category */}
                    {category && (
                      <p className="text-[10px] font-mono text-cyan-400/80 mb-1 truncate">
                        {category.name}
                      </p>
                    )}
                    {/* Title */}
                    <h3 
                      className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors"
                      title={cleanTitle}
                    >
                      {cleanTitle}
                    </h3>
                  </div>

                  {/* Action row */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                      <span className="flex items-center gap-1" title={`${item.viewsCount} ยอดเข้าชม`}>
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>{item.viewsCount}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLike(item.id);
                        }}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isLiked
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-white/5 border-transparent'
                        }`}
                        title={isLiked ? 'ยกเลิกการถูกใจ' : 'กดถูกใจ'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>

                      <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        ดูเนื้อหา &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
