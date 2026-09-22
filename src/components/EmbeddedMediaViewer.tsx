import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Heart, 
  MessageSquare, 
  Volume2, 
  Globe, 
  Send, 
  User, 
  Trash2, 
  Calendar, 
  Eye, 
  Tag as TagIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  Bookmark
} from 'lucide-react';
import { Comment, MediaItem, UserProfile } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { getDomainFromUrl } from '../utils/storage';
import { ADMIN_EMAIL } from '../utils/supabase';
import { isTwitterOrX, isPixiv, getSafeImageUrl } from '../utils/mediaProxy';
import { decodeHtmlEntities } from '../utils/text';
import { TwitterEmbed } from './TwitterEmbed';
import { PixivViewer } from './PixivViewer';

// Domains that strictly prohibit iframe embedding via X-Frame-Options: DENY or CSP frame-ancestors
const BLOCKED_IFRAME_DOMAINS = [
  'x.com',
  'twitter.com',
  't.co',
  'instagram.com',
  'facebook.com',
  'fb.com',
  'threads.net',
  'tiktok.com',
  'reddit.com',
  'pixiv.net',
  'discord.com',
  'github.com',
  'linkedin.com',
  'pinterest.com',
  'dlsite.com',
  'bilibili.com',
  'rule34video.com',
  'rule34.xxx',
  'kemono.su',
  'coomer.su',
  'e-hentai.org',
  'exhentai.org',
  'nhentai.net',
  'danbooru.donmai.us',
  'gelbooru.com',
  'sankakucomplex.com',
  'yande.re',
  'fanbox.cc',
  'patreon.com',
  'booth.pm',
  'iwara.tv',
  'hitomi.la',
  'luscious.net',
  'spankbang.com',
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'missav.com',
  'javdb.com',
  't.me',
  'telegram.org',
  'medium.com',
  'google.com'
];

const isKnownIframeBlocked = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return BLOCKED_IFRAME_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
};

interface EmbeddedMediaViewerProps {
  item: MediaItem;
  user: UserProfile;
  comments: Comment[];
  isLiked?: boolean;
  isBookmarked?: boolean;
  onClose: () => void;
  onLike: (itemId: string) => void;
  onToggleBookmark?: (itemId: string) => void;
  onAddComment: (itemId: string, content: string, guestNickname?: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onOpenAuth: () => void;
}

export const EmbeddedMediaViewer: React.FC<EmbeddedMediaViewerProps> = ({
  item,
  user,
  comments,
  isLiked = false,
  isBookmarked = false,
  onClose,
  onLike,
  onToggleBookmark,
  onAddComment,
  onDeleteComment,
  onOpenAuth,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [guestNickname, setGuestNickname] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [webIframeFailed, setWebIframeFailed] = useState(false);

  // Strict DOM refs for Safari hardware decoder and memory cleanup
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  const webIframeRef = useRef<HTMLIFrameElement>(null);

  const isRealAdmin = user.isLoggedIn && user.role === 'admin' && user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  // Strict memory disposal for Safari on iOS / iPadOS
  const disposeMedia = useCallback(() => {
    // 1. Release HTML5 Video buffer & decoders
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load(); // Forces WebKit to free hardware video decoders and RAM
      } catch {
        // Safe catch for detached nodes
      }
    }

    // 2. Release HTML5 Audio buffer & context
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch {
        // Safe catch for detached nodes
      }
    }

    // 3. Clear YouTube Iframe to dismantle WebKit JS execution contexts
    if (youtubeIframeRef.current) {
      try {
        youtubeIframeRef.current.src = 'about:blank';
      } catch {
        // Safe catch
      }
    }

    // 4. Clear Web Iframe
    if (webIframeRef.current) {
      try {
        webIframeRef.current.src = 'about:blank';
      } catch {
        // Safe catch
      }
    }
  }, []);

  const handleSafeClose = useCallback(() => {
    disposeMedia();
    onClose();
  }, [disposeMedia, onClose]);

  // Cleanup on unmount or item ID change
  useEffect(() => {
    setWebIframeFailed(false);
    setImageZoom(1);
    return () => {
      disposeMedia();
    };
  }, [disposeMedia, item.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSafeClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSafeClose]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!user.isLoggedIn && !guestNickname.trim()) {
      setCommentError(t.comments.guestNameRequired);
      return;
    }

    setCommentError(null);
    onAddComment(item.id, commentText.trim(), guestNickname.trim());
    setCommentText('');
  };

  // Render the specific media player based on embedType or mediaType
  const renderMediaContent = () => {
    // 1. YouTube Embed
    if (item.embedType === 'youtube' && item.embedId) {
      return (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 gpu-layer">
          <iframe
            ref={youtubeIframeRef}
            src={`https://www.youtube-nocookie.com/embed/${item.embedId}?autoplay=1&rel=0&modestbranding=1`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      );
    }

    // 2. HTML5 Video Player with Hardware Decoder Disposer
    if (item.embedType === 'html5_video' || (item.mediaType === 'video' && item.mediaUrl)) {
      const src = item.mediaUrl || item.url;
      return (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center gpu-layer">
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            src={src}
            className="w-full h-full object-contain"
          >
            Your browser does not support HTML5 video playback.
          </video>
        </div>
      );
    }

    // 3. Audio Player with Frequency Visualizer
    if (item.embedType === 'audio' || item.mediaType === 'audio') {
      const audioSrc = item.mediaUrl || item.url;
      return (
        <div className="w-full rounded-2xl glass-panel p-6 md:p-8 flex flex-col items-center justify-center space-y-6 border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)] gpu-layer">
          <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <img
              src={item.thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover animate-pulse"
            />
            <div className="absolute inset-0 bg-purple-950/40 flex items-center justify-center">
              <Volume2 className="w-12 h-12 text-purple-300" />
            </div>
          </div>

          <div className="text-center space-y-1 max-w-md">
            <span className="text-[11px] font-mono uppercase tracking-widest text-purple-400">
              {t.card.audioStream}
            </span>
            <h4 className="text-base font-bold text-slate-100">{item.title}</h4>
            <p className="text-xs text-slate-400">{item.siteName || 'Obsidian Vault Sound Library'}</p>
          </div>

          {/* Animated Frequency Bars Graphic */}
          <div className="flex items-end justify-center gap-1.5 h-12 w-full max-w-md">
            {[40, 75, 55, 90, 65, 80, 45, 95, 70, 85, 60, 100, 50, 90, 65, 80].map((height, i) => (
              <div
                key={i}
                className="w-2 rounded-full bg-gradient-to-t from-purple-600 to-cyan-400 gpu-layer"
                style={{
                  height: `${height}%`,
                  opacity: 0.85,
                  animation: `pulse 1.2s ease-in-out infinite alternate ${i * 0.08}s`
                }}
              />
            ))}
          </div>

          <audio
            ref={audioRef}
            controls
            autoPlay
            src={audioSrc}
            className="w-full max-w-md accent-cyan-400"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    // 4. Dedicated Interactive Pixiv Viewer (High-res, Multi-page album, Anti-403 Proxy)
    if (isPixiv(item.url)) {
      return (
        <PixivViewer
          url={item.url}
          title={item.title}
          thumbnailUrl={item.thumbnailUrl}
          description={item.description}
        />
      );
    }

    // 5. Dedicated Interactive X (Twitter) oEmbed Viewer
    if (isTwitterOrX(item.url)) {
      return (
        <TwitterEmbed
          url={item.url}
          title={item.title}
          description={item.description}
          thumbnailUrl={item.thumbnailUrl}
        />
      );
    }

    // 6. Image Lightbox with GPU Scale Transform
    if (item.embedType === 'image' || item.mediaType === 'image') {
      const rawSrc = item.mediaUrl || item.thumbnailUrl || item.url;
      const imgSrc = getSafeImageUrl(rawSrc);
      return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-black/80 border border-white/10 flex flex-col items-center justify-center min-h-[360px] max-h-[70vh]">
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-black/80 p-1 rounded-xl border border-white/10 shadow-lg">
            <button
              onClick={() => setImageZoom((z) => Math.min(z + 0.25, 2.5))}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors touch-target"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1">
              {Math.round(imageZoom * 100)}%
            </span>
            <button
              onClick={() => setImageZoom((z) => Math.max(z - 0.25, 0.75))}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors touch-target"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImageZoom(1)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors touch-target"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
            <img
              src={imgSrc}
              alt={item.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (item.thumbnailUrl && target.src !== item.thumbnailUrl) {
                  target.src = item.thumbnailUrl;
                } else {
                  target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
                }
              }}
              style={{ 
                transform: `translate3d(0, 0, 0) scale(${imageZoom})`, 
                transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform'
              }}
              className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      );
    }

    const isBlocked = isKnownIframeBlocked(item.url);

    // 6. Web / Article / OpenGraph Reader View
    return (
      <div className="w-full space-y-4">
        {/* Rich OpenGraph Card */}
        <div className="rounded-2xl glass-panel p-4 sm:p-6 border border-emerald-500/20 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            {item.thumbnailUrl && (
              <img
                src={item.thumbnailUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full md:w-64 aspect-video object-cover rounded-xl border border-white/10 shadow-lg"
              />
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <Globe className="w-4 h-4" />
                <span>{item.siteName || getDomainFromUrl(item.url)}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">{decodeHtmlEntities(item.title)}</h3>
              {item.description && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{decodeHtmlEntities(item.description)}</p>
              )}
              
              <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all touch-target"
                >
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t.card.source}</span>
                </a>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all touch-target"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t.card.copied : t.card.copyUrl}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Iframe Sandbox Preview or Direct External Link Notice */}
        {isBlocked ? (
          <div className="rounded-2xl glass-panel p-6 sm:p-8 border border-white/10 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <ExternalLink className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h4 className="text-sm sm:text-base font-bold text-slate-100">
                เว็บไซต์นี้ไม่สามารถแสดงผลผ่าน Iframe ได้
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                กรุณากดลิงก์ด้านล่างเพื่อเปิดไปยังเว็บไซต์ {item.siteName || getDomainFromUrl(item.url)} โดยตรง
              </p>
            </div>
            <div className="flex items-center justify-center pt-1">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all touch-target shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                <span>กดเพื่อไปยังเว็บไซต์ {item.siteName || getDomainFromUrl(item.url)}</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl glass-panel overflow-hidden border border-white/10">
            <div className="px-4 py-2.5 bg-black/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span className="font-mono text-[11px] truncate max-w-sm">Iframe: {item.url}</span>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline touch-target"
              >
                <span>{t.viewer.openExternal || 'เปิดหน้าต่างใหม่'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {!webIframeFailed ? (
              <div 
                className="relative h-[380px] sm:h-[420px] w-full bg-[#090a0f]"
                style={{ backgroundColor: '#090a0f', colorScheme: 'dark' }}
              >
                <iframe
                  ref={webIframeRef}
                  src={item.url}
                  title={item.title}
                  sandbox="allow-scripts allow-popups allow-forms allow-presentation allow-same-origin"
                  onError={() => setWebIframeFailed(true)}
                  className="w-full h-full border-0"
                  style={{ backgroundColor: '#090a0f' }}
                />
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-3">
                <p className="text-sm font-semibold text-slate-200">
                  เว็บไซต์นี้ไม่อนุญาตให้แสดงผลผ่าน Iframe
                </p>
                <p className="text-xs text-slate-400">
                  กรุณากดลิงก์ด้านล่างเพื่อเปิดไปยังเว็บไซต์โดยตรง
                </p>
                <div className="pt-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all touch-target shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                  >
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>กดเพื่อไปยังเว็บไซต์ {item.siteName || getDomainFromUrl(item.url)}</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={handleSafeClose}
    >
      <div 
        className="relative w-full max-w-5xl rounded-2xl sm:rounded-3xl glass-panel border border-cyan-500/30 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden my-auto max-h-[95vh] flex flex-col gpu-layer animate-in fade-in-50 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header Bar */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-white/10 flex items-center justify-between gap-2 sm:gap-3 bg-[#090a0f]/90">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 truncate">
            <span className="text-[11px] sm:text-xs font-mono font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0 select-all shadow-sm">
              #{item.itemNumber || 1}
            </span>
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
              {item.mediaType.toUpperCase()}
            </span>
            <h2 className="text-xs sm:text-base font-bold text-slate-100 truncate" title={decodeHtmlEntities(item.title)}>
              {decodeHtmlEntities(item.title)}
            </h2>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors touch-target"
              title={t.card.copyUrl}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors touch-target"
              title={t.card.source}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.card.source}</span>
            </a>

            <button
              onClick={handleSafeClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-colors touch-target"
              title={t.common.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Center Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* Main Media Player / Embed */}
          {renderMediaContent()}

          {/* Details & Interactive Commenting Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 pt-2">
            
            {/* Metadata Information (Left Col) */}
            <div className="lg:col-span-1 rounded-2xl glass-panel-subtle p-4 sm:p-5 space-y-4 border border-white/5">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                  Description
                </span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {item.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {t.card.views}</span>
                  <span className="font-mono text-slate-200">{item.viewsCount}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date Added</span>
                  <span className="font-mono text-slate-200">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><TagIcon className="w-3.5 h-3.5" /> Source Type</span>
                  <span className="font-mono text-slate-200 uppercase">{item.source}</span>
                </div>
              </div>

              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                    {t.filters.tags}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.map((tg, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                        #{tg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Smart Toggle Like Button */}
              <button
                onClick={() => onLike(item.id)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all touch-target active:scale-98 ${
                  isLiked
                    ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                    : 'bg-white/5 text-slate-300 hover:bg-rose-500/15 hover:text-rose-300 border border-white/10 hover:border-rose-500/30'
                }`}
                title={isLiked ? 'ยกเลิกการถูกใจ (Unlike)' : 'กดถูกใจ (Like)'}
              >
                <Heart className={`w-4 h-4 transition-transform duration-200 ${isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400'}`} />
                <span>
                  {isLiked ? 'ถูกใจแล้ว (คลิกเพื่อยกเลิก)' : t.card.likes} ({Math.max(item.likesCount || 0, isLiked ? 1 : 0)})
                </span>
              </button>

              {/* Smart Toggle Bookmark Button */}
              {onToggleBookmark && (
                <button
                  onClick={() => onToggleBookmark(item.id)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all touch-target active:scale-98 ${
                    isBookmarked
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
                      : 'bg-white/5 text-slate-300 hover:bg-amber-500/15 hover:text-amber-300 border border-white/10 hover:border-amber-500/30'
                  }`}
                  title={isBookmarked ? 'ลบออกจากบุ๊กมาร์ก' : 'บันทึกลงบุ๊กมาร์ก'}
                >
                  <Bookmark className={`w-4 h-4 transition-transform duration-200 ${isBookmarked ? 'fill-amber-400 text-amber-400 scale-110' : 'text-slate-400'}`} />
                  <span>
                    {isBookmarked ? 'บันทึกลงบุ๊กมาร์กแล้ว' : 'บันทึกลงบุ๊กมาร์ก (Save)'}
                  </span>
                </button>
              )}
            </div>

            {/* Comment Section (Right 2 Cols) */}
            <div className="lg:col-span-2 rounded-2xl glass-panel-subtle p-4 sm:p-5 border border-white/5 flex flex-col justify-between space-y-4">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-semibold text-slate-100">{t.comments.title}</h4>
                  <span className="text-xs font-mono text-slate-500">({comments.length})</span>
                </div>
                {!user.isLoggedIn && (
                  <button
                    onClick={onOpenAuth}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 touch-target"
                  >
                    <User className="w-3 h-3" />
                    <span>{t.comments.signInToComment}</span>
                  </button>
                )}
              </div>

              {/* Comments List */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    {t.comments.noComments}
                  </p>
                ) : (
                  comments.map((cmt) => (
                    <div
                      key={cmt.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 transition-colors hover:border-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={cmt.authorAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cmt.authorName}`}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10"
                          />
                          <span className="text-xs font-medium text-slate-200">{cmt.authorName}</span>
                          {cmt.isAdmin && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Admin
                            </span>
                          )}
                          {cmt.isGoogleUser && !cmt.isAdmin && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{new Date(cmt.createdAt).toLocaleDateString()}</span>
                          {isRealAdmin && onDeleteComment && (
                            <button
                              onClick={() => onDeleteComment(cmt.id)}
                              className="text-slate-600 hover:text-rose-400 p-0.5 touch-target"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 pl-8 leading-relaxed">
                        {cmt.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input Form */}
              <form onSubmit={handleCommentSubmit} className="space-y-2 pt-3 border-t border-white/5">
                {commentError && (
                  <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <span>{commentError}</span>
                  </div>
                )}
                {!user.isLoggedIn && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t.comments.guestPlaceholder}
                      value={guestNickname}
                      onChange={(e) => setGuestNickname(e.target.value)}
                      className="w-full sm:w-64 px-3 py-1.5 rounded-lg text-xs glass-input text-slate-100 placeholder-slate-500"
                    />
                    <span className="text-[10px] text-slate-500 hidden sm:inline">{t.comments.orSignIn}</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={user.isLoggedIn ? `${t.comments.writeComment} (${user.name})...` : t.comments.writeComment}
                    className="flex-1 px-3 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 touch-target"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.comments.send}</span>
                  </button>
                </div>
              </form>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
