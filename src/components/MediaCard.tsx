import React, { useState } from 'react';
import { 
  Play, 
  Volume2, 
  Image as ImageIcon, 
  Globe, 
  ExternalLink, 
  Maximize2, 
  Heart, 
  MessageSquare, 
  Pin, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Eye, 
  HardDrive
} from 'lucide-react';
import { Category, MediaItem, UserProfile } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { getDomainFromUrl, safeConfirm } from '../utils/storage';
import { ADMIN_EMAIL } from '../utils/supabase';

interface MediaCardProps {
  item: MediaItem;
  category?: Category;
  user: UserProfile;
  commentCount: number;
  onPreview: (item: MediaItem) => void;
  onLike: (itemId: string) => void;
  onEdit?: (item: MediaItem) => void;
  onDelete?: (itemId: string) => void;
  onTogglePin?: (itemId: string) => void;
  onSelectTag?: (tag: string) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  category,
  user,
  commentCount,
  onPreview,
  onLike,
  onEdit,
  onDelete,
  onTogglePin,
  onSelectTag,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const isRealAdmin = user.isLoggedIn && user.role === 'admin' && user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMediaTypeBadge = () => {
    switch (item.mediaType) {
      case 'video':
        return {
          icon: <Play className="w-3 h-3 fill-current" />,
          label: item.embedType === 'youtube' ? 'YouTube' : t.filters.video,
          bgColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        };
      case 'audio':
        return {
          icon: <Volume2 className="w-3 h-3" />,
          label: t.card.audioStream,
          bgColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        };
      case 'image':
        return {
          icon: <ImageIcon className="w-3 h-3" />,
          label: t.card.visualArt,
          bgColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'web':
      default:
        return {
          icon: <Globe className="w-3 h-3" />,
          label: t.card.webArchive,
          bgColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
    }
  };

  const badge = getMediaTypeBadge();

  return (
    <div
      tabIndex={0}
      className="group relative flex flex-col rounded-2xl glass-card virtual-card-item overflow-hidden hover:border-cyan-500/40 hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)] hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowAdminMenu(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) {
          onPreview(item);
        }
      }}
    >
      {/* Pinned Marker - High Performance Solid/Semi-opaque without nested blur */}
      {item.isPinned && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono shadow-md card-badge">
          <Pin className="w-3 h-3 fill-current" />
          <span>{t.card.pinned}</span>
        </div>
      )}

      {/* Admin Action Overlay Button */}
      {isRealAdmin && (
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAdminMenu(!showAdminMenu);
            }}
            className="p-1.5 rounded-lg bg-[#090a0f]/80 hover:bg-[#090a0f] text-slate-300 hover:text-white border border-white/15 transition-colors touch-target shadow-sm"
            title={t.card.adminActions}
            aria-label={t.card.adminActions}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showAdminMenu && (
            <div className="absolute right-0 mt-1 w-36 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-1 z-30 transform-gpu animate-in fade-in-50 zoom-in-95 duration-150">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin?.(item.id);
                  setShowAdminMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-amber-300 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Pin className="w-3.5 h-3.5" />
                <span>{item.isPinned ? t.card.unpin : t.card.pinToTop}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(item);
                  setShowAdminMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-cyan-300 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t.card.editLink}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (safeConfirm(t.card.deleteConfirm)) {
                    onDelete?.(item.id);
                  }
                  setShowAdminMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.card.deleteLink}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Thumbnail & Media Action Center */}
      <div 
        className="relative aspect-video w-full overflow-hidden bg-slate-950 cursor-pointer"
        onClick={() => onPreview(item)}
      >
        <img
          src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover object-center transform-gpu will-change-transform transition-transform duration-200 ease-out group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.failed) {
              target.dataset.failed = 'true';
              target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
            }
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-black/30 pointer-events-none" />

        {/* Media Type Tag on thumbnail - Safari optimized without nested blur */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 pointer-events-none">
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border card-badge ${badge.bgColor}`}>
            {badge.icon}
            <span>{badge.label}</span>
          </span>

          {item.source === 'upload' && item.fileSize && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono bg-[#090a0f]/85 text-slate-300 border border-white/10 card-badge">
              <HardDrive className="w-2.5 h-2.5" />
              {item.fileSize}
            </span>
          )}
        </div>

        {/* Quick Embedded Play/Preview hover overlay button - purely transform & opacity */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-500/30 transform-gpu translate-y-2 group-hover:translate-y-0 transition-transform duration-200 ease-out">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{t.card.openViewer}</span>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        
        <div>
          {/* Domain & Category Row */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1.5">
            <div className="flex items-center gap-1.5 truncate">
              {item.favicon ? (
                <img 
                  src={item.favicon} 
                  alt="" 
                  loading="lazy"
                  decoding="async"
                  className="w-3.5 h-3.5 rounded-sm object-contain" 
                />
              ) : (
                <Globe className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="font-mono text-[11px] text-slate-400 truncate">
                {item.siteName || getDomainFromUrl(item.url)}
              </span>
            </div>

            {category && (
              <span 
                className="text-[10px] px-2 py-0.5 rounded-full border"
                style={{ borderColor: `${category.color}40`, color: category.color, backgroundColor: `${category.color}15` }}
              >
                {category.name}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 
            onClick={() => onPreview(item)}
            className="font-semibold text-slate-100 text-sm leading-snug line-clamp-2 hover:text-cyan-300 transition-colors cursor-pointer"
            title={item.title}
          >
            {item.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
              {item.tags.map((tg, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTag?.(tg);
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors touch-target"
                >
                  #{tg}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer: Metrics & Split Action Switch */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
          
          {/* Views, Likes, Comments */}
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1" title={`${item.viewsCount} ${t.card.views}`}>
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-[11px]">{item.viewsCount}</span>
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(item.id);
              }}
              className="flex items-center gap-1 hover:text-rose-400 transition-colors group/heart touch-target"
              title={`${item.likesCount} ${t.card.likes}`}
            >
              <Heart className="w-3.5 h-3.5 text-slate-500 group-hover/heart:text-rose-500 group-hover/heart:fill-rose-500" />
              <span className="font-mono text-[11px]">{item.likesCount}</span>
            </button>

            <button
              onClick={() => onPreview(item)}
              className="flex items-center gap-1 hover:text-cyan-400 transition-colors touch-target"
              title={`${commentCount} ${t.card.comments}`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-[11px]">{commentCount}</span>
            </button>
          </div>

          {/* Action Buttons: Embedded Preview vs External Link */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors touch-target"
              title={t.card.copyUrl}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Embedded Preview Toggle Button */}
            <button
              onClick={() => onPreview(item)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all touch-target"
              title={t.card.openViewer}
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden xs:inline">{t.card.preview}</span>
            </button>

            {/* Direct External Link Navigation */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all touch-target"
              title={t.card.source}
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">{t.card.source}</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
