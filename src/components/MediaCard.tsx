import React, { useState } from 'react';
import { 
  Play, 
  Volume2, 
  Image as ImageIcon, 
  Globe, 
  ExternalLink, 
  Maximize2, 
  Minimize2,
  Heart, 
  MessageSquare, 
  Pin, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Eye, 
  HardDrive,
  Hash,
  Sparkles
} from 'lucide-react';
import { Category, MediaItem, UserProfile } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { getDomainFromUrl, safeConfirm } from '../utils/storage';
import { ADMIN_EMAIL } from '../utils/supabase';
import { isPixiv, isTwitterOrX, getSafeImageUrl, getPixivIllustId } from '../utils/mediaProxy';

interface MediaCardProps {
  item: MediaItem;
  category?: Category;
  user: UserProfile;
  commentCount: number;
  isLiked?: boolean;
  viewMode?: 'grid' | 'large' | 'compact';
  imageFit?: 'cover' | 'contain';
  matchReason?: string;
  onToggleImageFit?: (itemId: string, newFit: 'cover' | 'contain') => void;
  onPreview: (item: MediaItem) => void;
  onLike: (itemId: string) => void;
  onRecordView?: (item: MediaItem) => void;
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
  isLiked = false,
  viewMode = 'grid',
  imageFit: imageFitProp,
  matchReason,
  onToggleImageFit,
  onPreview,
  onLike,
  onRecordView,
  onEdit,
  onDelete,
  onTogglePin,
  onSelectTag,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [localImageFit, setLocalImageFit] = useState<'cover' | 'contain'>(item.imageFit || 'cover');

  const currentImageFit = imageFitProp ?? localImageFit;
  const displayId = item.itemNumber || 1;

  const handleToggleFit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFit = currentImageFit === 'cover' ? 'contain' : 'cover';
    setLocalImageFit(nextFit);
    onToggleImageFit?.(item.id, nextFit);
  };

  const isRealAdmin = user.isLoggedIn && user.role === 'admin' && user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`#${displayId}`);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const getMediaTypeBadge = () => {
    if (isPixiv(item.url)) {
      return {
        icon: <ImageIcon className="w-3 h-3 text-purple-300" />,
        label: 'Pixiv',
        bgColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      };
    }

    if (isTwitterOrX(item.url)) {
      return {
        icon: <span className="font-bold text-[10px] leading-none">𝕏</span>,
        label: 'X (Twitter)',
        bgColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      };
    }

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
  const safeThumbnailUrl = getSafeImageUrl(item.thumbnailUrl) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
  const illustId = isPixiv(item.url) ? getPixivIllustId(item.url) : null;

  return (
    <div
      tabIndex={0}
      className={`group relative flex rounded-2xl glass-card virtual-card-item overflow-hidden hover:border-cyan-500/40 hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)] hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none select-none transition-all duration-200 ${
        viewMode === 'compact' ? 'flex-col sm:flex-row' : 'flex-col'
      }`}
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
      {/* Thumbnail & Media Action Center */}
      <div 
        className={`relative overflow-hidden bg-slate-950 cursor-pointer select-none transition-all ${
          viewMode === 'compact'
            ? 'w-full sm:w-64 md:w-72 shrink-0 aspect-[16/10] sm:aspect-auto sm:min-h-[170px]'
            : viewMode === 'large'
            ? 'w-full aspect-[4/3] sm:aspect-[16/10] min-h-[280px] sm:min-h-[360px] md:min-h-[420px]'
            : currentImageFit === 'contain'
            ? 'w-full aspect-[4/3] sm:aspect-[16/10] min-h-[250px] sm:min-h-[290px]'
            : 'w-full aspect-[4/3] sm:aspect-[16/11] min-h-[210px] sm:min-h-[250px]'
        }`}
        onClick={() => onPreview(item)}
      >
        {/* Soft Ambient Glow when in 'contain' mode to eliminate blank black margins */}
        {currentImageFit === 'contain' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 filter blur-xl scale-125">
            <img
              src={safeThumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-slate-950/60" />
          </div>
        )}

        <img
          src={safeThumbnailUrl}
          alt={item.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={`w-full h-full transform-gpu will-change-transform transition-all duration-300 ease-out ${
            currentImageFit === 'contain'
              ? 'object-contain relative z-10 p-2 sm:p-3'
              : 'object-cover object-center group-hover:scale-105'
          }`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.failed) {
              if (illustId) {
                target.dataset.failed = 'pixiv-decorate';
                target.src = `https://embed.pixiv.net/decorate.php?illust_id=${illustId}`;
              } else {
                target.dataset.failed = 'snapshot';
                target.src = `https://s0.wp.com/mshots/v1/${encodeURIComponent(item.url)}?w=800&h=450`;
              }
            } else if (target.dataset.failed === 'pixiv-decorate') {
              target.dataset.failed = 'snapshot';
              target.src = `https://s0.wp.com/mshots/v1/${encodeURIComponent(item.url)}?w=800&h=450`;
            } else if (target.dataset.failed === 'snapshot') {
              target.dataset.failed = 'final';
              target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
            }
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-black/30 pointer-events-none z-10" />

        {/* Top-Left Badges: Post ID Tag (#45) & Pinned Tag */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 flex-wrap">
          {/* Cyberpunk Post ID Badge */}
          <button
            type="button"
            onClick={handleCopyId}
            className="group/id flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black/95 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 text-[11px] font-mono font-bold shadow-[0_4px_12px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all active:scale-95 cursor-pointer touch-target select-none"
            title={`รหัสโพสต์ #${displayId} (คลิกเพื่อคัดลอกรหัส)`}
            aria-label={`Post ID #${displayId}`}
          >
            <Hash className="w-3 h-3 text-cyan-400 group-hover/id:rotate-12 transition-transform" />
            <span>{displayId}</span>
            {idCopied ? (
              <Check className="w-3 h-3 text-emerald-400 animate-in fade-in" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-cyan-400/60 opacity-0 group-hover/id:opacity-100 transition-opacity" />
            )}
          </button>

          {item.isPinned && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono shadow-md card-badge">
              <Pin className="w-3 h-3 fill-current" />
              <span>{t.card.pinned}</span>
            </div>
          )}
        </div>

        {/* Top-Right Quick Overlay Controls: Image Fit Toggle & Admin Menu */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          {/* Image Fit Switcher Button: Toggle between full uncropped image vs fill cover */}
          <button
            type="button"
            onClick={handleToggleFit}
            className={`h-7 px-2 rounded-lg border text-[10px] font-medium flex items-center gap-1 backdrop-blur-md shadow-md transition-all touch-target ${
              currentImageFit === 'contain'
                ? 'bg-cyan-500/30 border-cyan-400/60 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-black/60 hover:bg-black/85 border-white/20 text-slate-300 hover:text-white'
            }`}
            title={currentImageFit === 'contain' ? 'คลิกเพื่อย่อรูปกลับเป็นขนาดมาตรฐาน (Fill Frame)' : 'คลิกเพื่อขยายดูภาพเต็มรูปไม่ตัดขอบ (Fit Full Image)'}
            aria-label="Toggle Image Fit"
          >
            {currentImageFit === 'contain' ? (
              <>
                <Minimize2 className="w-3 h-3 text-cyan-300" />
                <span className="hidden sm:inline">เต็มรูป</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3 text-slate-300" />
                <span className="hidden sm:inline">รูปเต็ม</span>
              </>
            )}
          </button>

          {/* Admin Action Overlay Button */}
          {isRealAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAdminMenu(!showAdminMenu);
                }}
                className="w-7 h-7 rounded-lg bg-black/60 hover:bg-black/85 text-slate-300 hover:text-white border border-white/20 flex items-center justify-center backdrop-blur-md shadow-md transition-colors touch-target"
                title={t.card.adminActions}
                aria-label={t.card.adminActions}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showAdminMenu && (
                <div 
                  className="absolute right-0 top-8 w-38 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1 z-50 transform-gpu animate-in fade-in-50 zoom-in-95 duration-150 space-y-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onTogglePin?.(item.id);
                      setShowAdminMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-amber-300 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Pin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{item.isPinned ? t.card.unpin : t.card.pinToTop}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onEdit?.(item);
                      setShowAdminMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-cyan-300 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.card.editLink}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (safeConfirm(t.card.deleteConfirm)) {
                        onDelete?.(item.id);
                      }
                      setShowAdminMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/15 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.card.deleteLink}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Media Type Tag on thumbnail */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 pointer-events-none z-20">
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

        {/* Quick Embedded Play/Preview hover overlay button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 pointer-events-none z-20">
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
                  className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" 
                />
              ) : (
                <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="font-mono text-[11px] text-slate-400 truncate">
                {item.siteName || getDomainFromUrl(item.url)}
              </span>
            </div>

            {category && (
              <span 
                className="text-[10px] px-2 py-0.5 rounded-full border shrink-0"
                style={{ borderColor: `${category.color}40`, color: category.color, backgroundColor: `${category.color}15` }}
              >
                {category.name}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 
            onClick={() => onPreview(item)}
            className="font-semibold text-slate-100 text-sm leading-snug line-clamp-2 hover:text-cyan-300 transition-colors cursor-pointer flex items-baseline gap-1.5"
            title={item.title}
          >
            <span className="shrink-0 text-cyan-400 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 select-all">
              #{displayId}
            </span>
            <span>{item.title}</span>
          </h3>

          {/* Search match explanation badge */}
          {matchReason && (
            <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-cyan-300/90 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/25">
              <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">{matchReason}</span>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
              {item.tags.map((tg, idx) => (
                <button
                  key={idx}
                  type="button"
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

        {/* Card Footer: Metrics & Action Buttons in Harmonious Balance */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          
          {/* Views, Likes, Comments */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs text-slate-400 shrink-0">
            <span className="flex items-center gap-1 select-none" title={`${item.viewsCount} ${t.card.views}`}>
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-[11px]">{item.viewsCount}</span>
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLike(item.id);
              }}
              className={`h-7.5 inline-flex items-center gap-1.5 px-2 rounded-lg transition-all group/heart touch-target select-none ${
                isLiked
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)] font-semibold'
                  : 'hover:text-rose-400 hover:bg-white/5 border border-transparent text-slate-400'
              }`}
              title={isLiked ? 'ยกเลิกการถูกใจ (Unlike)' : `${item.likesCount || 0} ${t.card.likes}`}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-transform duration-200 group-hover/heart:scale-125 ${
                  isLiked
                    ? 'text-rose-500 fill-rose-500'
                    : 'text-slate-500 group-hover/heart:text-rose-400'
                }`}
              />
              <span className={`font-mono text-[11px] ${isLiked ? 'text-rose-300 font-bold' : ''}`}>
                {item.likesCount || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onPreview(item)}
              className="h-7.5 inline-flex items-center gap-1 px-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors touch-target select-none"
              title={`${commentCount} ${t.card.comments}`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-[11px]">{commentCount}</span>
            </button>
          </div>

          {/* Action Buttons: Copy Link, Preview, External Link */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Copy Link Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-7.5 h-7.5 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors touch-target"
              title={copied ? t.card.copied : t.card.copyUrl}
              aria-label="Copy Link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Embedded Preview Button */}
            <button
              type="button"
              onClick={() => onPreview(item)}
              className="h-7.5 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all shadow-sm touch-target"
              title={t.card.openViewer}
            >
              <Maximize2 className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">{t.card.preview}</span>
            </button>

            {/* Direct External Link */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onRecordView?.(item)}
              className="h-7.5 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-medium bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all touch-target"
              title={t.card.source}
            >
              <ExternalLink className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">{t.card.source}</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};

