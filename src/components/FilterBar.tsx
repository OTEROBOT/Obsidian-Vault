import React from 'react';
import { 
  Compass, 
  Cpu, 
  Terminal, 
  Film, 
  Radio, 
  Layers, 
  Globe, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Music, 
  Pin, 
  ArrowUpDown, 
  Tag as TagIcon,
  X,
  Grid,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Category, MediaType, SearchFilters, Tag } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface FilterBarProps {
  categories: Category[];
  tags: Tag[];
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  categoryCounts: Record<string, number>;
  totalItemCount: number;
  viewMode: 'grid' | 'large' | 'compact';
  onViewModeChange: (mode: 'grid' | 'large' | 'compact') => void;
  allCardsExpanded?: boolean;
  onToggleAllCardsImageFit?: () => void;
}

// Helper to map category icon string to Lucide component
const getCategoryIcon = (iconName: string) => {
  switch (iconName.toLowerCase()) {
    case 'cpu': return <Cpu className="w-4 h-4" />;
    case 'terminal': return <Terminal className="w-4 h-4" />;
    case 'film': return <Film className="w-4 h-4" />;
    case 'radio': return <Radio className="w-4 h-4" />;
    case 'layers': return <Layers className="w-4 h-4" />;
    default: return <Compass className="w-4 h-4" />;
  }
};

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  tags,
  filters,
  onFilterChange,
  categoryCounts,
  totalItemCount,
  viewMode,
  onViewModeChange,
  allCardsExpanded = false,
  onToggleAllCardsImageFit,
}) => {
  const { t } = useTranslation();

  const hasActiveFilters = 
    filters.categoryId !== 'all' && filters.categoryId !== 'cat-all' || 
    filters.mediaType !== 'all' || 
    filters.tag !== 'all' || 
    filters.pinnedOnly ||
    filters.query !== '';

  const clearAllFilters = () => {
    onFilterChange({
      ...filters,
      query: '',
      categoryId: 'all',
      tag: 'all',
      mediaType: 'all',
      pinnedOnly: false,
    });
  };

  const mediaTypes: { type: 'all' | MediaType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: 'all', label: t.filters.allMedia, icon: <Layers className="w-3.5 h-3.5" />, color: 'text-slate-300' },
    { type: 'video', label: t.filters.video, icon: <VideoIcon className="w-3.5 h-3.5" />, color: 'text-rose-400' },
    { type: 'audio', label: t.filters.audio, icon: <Music className="w-3.5 h-3.5" />, color: 'text-purple-400' },
    { type: 'image', label: t.filters.images, icon: <ImageIcon className="w-3.5 h-3.5" />, color: 'text-amber-400' },
    { type: 'web', label: t.filters.web, icon: <Globe className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
  ];

  return (
    <div className="w-full space-y-3 sm:space-y-4 py-2 sm:py-4">
      
      {/* Categories Horizontal Carousel */}
      <div 
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full min-w-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {categories.map((cat) => {
          const isSelected = filters.categoryId === cat.id || (cat.id === 'cat-all' && (filters.categoryId === 'all' || filters.categoryId === 'cat-all'));
          const count = cat.id === 'cat-all' ? totalItemCount : (categoryCounts[cat.id] || 0);
          const displayName = cat.id === 'cat-all' ? t.filters.allCategories : cat.name;

          return (
            <button
              key={cat.id}
              onClick={() => onFilterChange({ ...filters, categoryId: cat.id === 'cat-all' ? 'all' : cat.id })}
              className={`flex shrink-0 min-w-fit items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border select-none touch-target ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
              }`}
            >
              <span style={{ color: isSelected ? '#38bdf8' : cat.color }}>
                {getCategoryIcon(cat.icon)}
              </span>
              <span>{displayName}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isSelected ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/5 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Media Type Tabs & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pt-2 border-t border-white/5">
        
        {/* Media Type Tabs */}
        <div 
          className="flex items-center gap-1 bg-black/40 dark:bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {mediaTypes.map((item) => {
            const isActive = filters.mediaType === item.type;
            return (
              <button
                key={item.type}
                onClick={() => onFilterChange({ ...filters, mediaType: item.type })}
                className={`flex shrink-0 min-w-fit items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-target ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={item.color}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filters: Sort, Pinned, View Mode, Clear */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          
          {/* Pinned Only Toggle */}
          <button
            onClick={() => onFilterChange({ ...filters, pinnedOnly: !filters.pinnedOnly })}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all touch-target ${
              filters.pinnedOnly
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title={t.filters.pinned}
          >
            <Pin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.filters.pinned}</span>
          </button>

          {/* Sort By Dropdown */}
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
              aria-label={t.filters.sortBy}
              className="pl-8 pr-6 py-1.5 text-xs rounded-lg glass-input text-slate-300 appearance-none cursor-pointer focus:text-white"
            >
              <option value="newest" className="bg-slate-900 text-white">{t.filters.newest}</option>
              <option value="oldest" className="bg-slate-900 text-white">{t.filters.oldest}</option>
              <option value="views" className="bg-slate-900 text-white">{t.filters.views}</option>
              <option value="likes" className="bg-slate-900 text-white">{t.filters.likes}</option>
              <option value="title" className="bg-slate-900 text-white">{t.filters.titleAz}</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-black/40 dark:bg-black/40 p-0.5 rounded-lg border border-white/10 shadow-sm">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded text-xs transition-colors touch-target ${
                viewMode === 'grid' ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={t.filters.gridView}
              aria-label={t.filters.gridView}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('large')}
              className={`p-1.5 rounded text-xs transition-colors touch-target ${
                viewMode === 'large' ? 'bg-cyan-500/25 text-cyan-300 shadow-sm border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="โหมดภาพใหญ่ (Large Cover View)"
              aria-label="Large Cover View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('compact')}
              className={`p-1.5 rounded text-xs transition-colors touch-target ${
                viewMode === 'compact' ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={t.filters.compactView}
              aria-label={t.filters.compactView}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Global Card Image Expand / Fit Toggle Button */}
          {onToggleAllCardsImageFit && (
            <button
              type="button"
              onClick={onToggleAllCardsImageFit}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 touch-target ${
                allCardsExpanded
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-black/40 hover:bg-black/70 border-white/10 text-slate-300 hover:text-white'
              }`}
              title={
                allCardsExpanded
                  ? 'คลิกเพื่อย่อรูปทุกการ์ดกลับเป็นขนาดมาตรฐาน (Reset all card images to standard cover)'
                  : 'คลิกเพื่อขยายรูปภาพในการ์ดทั้งหมดให้เห็นรูปเต็มทุกการ์ด (Expand all card images to fit full)'
              }
              aria-label="Toggle All Card Images Fit"
            >
              {allCardsExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden md:inline font-mono">รูปเต็มทุกการ์ด</span>
                  <span className="md:hidden text-[11px]">ย่อรูป</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden md:inline font-mono">ขยายรูปทุกการ์ด</span>
                  <span className="md:hidden text-[11px]">ขยายรูป</span>
                </>
              )}
            </button>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all touch-target"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.filters.reset}</span>
            </button>
          )}

        </div>
      </div>

      {/* Tag Filter Chips Bar */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
            <TagIcon className="w-3 h-3 text-cyan-400" /> {t.filters.tags}
          </span>
          <button
            onClick={() => onFilterChange({ ...filters, tag: 'all' })}
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors touch-target ${
              filters.tag === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 bg-white/5 border border-transparent'
            }`}
          >
            {t.filters.allTags}
          </button>
          {tags.map((tg) => {
            const isTagActive = filters.tag === tg.name;
            return (
              <button
                key={tg.id}
                onClick={() => onFilterChange({ ...filters, tag: isTagActive ? 'all' : tg.name })}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all border touch-target ${
                  isTagActive
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:border-white/15'
                }`}
              >
                #{tg.name}
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
};
