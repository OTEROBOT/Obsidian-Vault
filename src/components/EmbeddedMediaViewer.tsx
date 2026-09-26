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
  Bookmark,
  RefreshCw,
  Zap,
  ShieldCheck,
  Camera
} from 'lucide-react';
import { Comment, MediaItem, UserProfile } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { getDomainFromUrl } from '../utils/storage';
import { ADMIN_EMAIL } from '../utils/supabase';
import { isTwitterOrX, isPixiv, getSafeImageUrl } from '../utils/mediaProxy';
import { decodeHtmlEntities } from '../utils/text';
import { TwitterEmbed } from './TwitterEmbed';
import { PixivViewer } from './PixivViewer';

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
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [showSnapshotView, setShowSnapshotView] = useState(false);

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
    setImageZoom(1);
    setIframeLoading(true);
    setShowSnapshotView(false);
    setIframeKey((k) => k + 1);
    return () => {
      disposeMedia();
    };
  }, [disposeMedia, item.id, item.url]);

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

    // 6. Full In-App Web Iframe Viewer with Smart Fallback for Blocked Sites
    const domain = getDomainFromUrl(item.url);
    const liveSnapshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(item.url)}?w=1280&h=720`;

    return (
      <div className="w-full space-y-3.5">
        {/* Main In-App Iframe Container */}
        <div className="rounded-2xl sm:rounded-3xl glass-panel overflow-hidden border border-cyan-500/30 shadow-2xl bg-[#090a0f] flex flex-col">
          
          {/* Top Control & Navigation Bar */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 bg-black/80 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 truncate min-w-0">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/30 shrink-0">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Iframe</span>
              </span>
              <span className="font-mono text-slate-300 font-medium text-xs truncate max-w-[180px] sm:max-w-xs md:max-w-md" title={item.url}>
                {item.url}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Toggle Web Snapshot */}
              <button
                type="button"
                onClick={() => setShowSnapshotView(!showSnapshotView)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                  showSnapshotView
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
                title="สลับดูภาพถ่ายหน้าเว็บสด (Snapshot) หาก iframe โดนบล็อก"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{showSnapshotView ? 'ดูแบบ Iframe' : 'ดูภาพ Snapshot'}</span>
              </button>

              {/* Reload Button */}
              {!showSnapshotView && (
                <button
                  type="button"
                  onClick={() => {
                    setIframeLoading(true);
                    setIframeKey((k) => k + 1);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 border border-white/10 transition-colors"
                  title="รีโหลดหน้าเว็บนี้ใหม่"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${iframeLoading ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              )}

              {/* Direct Open Button in header */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all hover:scale-105 active:scale-95"
                title="เปิดหน้าเว็บในแท็บใหม่ของเบราว์เซอร์"
              >
                <span>เปิดแท็บใหม่</span>
                <ExternalLink className="w-3 h-3 stroke-[2.5]" />
              </a>
            </div>
          </div>

          {/* Iframe Viewport Area */}
          <div 
            className="relative w-full h-[62vh] sm:h-[72vh] min-h-[480px] sm:min-h-[580px] bg-[#090a0f] overflow-hidden"
            style={{ backgroundColor: '#090a0f', colorScheme: 'dark' }}
          >
            {showSnapshotView ? (
              /* Snapshot Mode fallback */
              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#090a0f] overflow-auto">
                <img
                  src={liveSnapshotUrl}
                  alt={item.title}
                  className="max-h-full max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
                  onError={(e) => {
                    if (item.thumbnailUrl) {
                      (e.currentTarget as HTMLImageElement).src = item.thumbnailUrl;
                    }
                  }}
                />
              </div>
            ) : (
              <>
                {/* Cyber Dark Loading Screen */}
                {iframeLoading && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090a0f] p-6 text-center animate-in fade-in duration-150 pointer-events-none">
                    <div className="relative w-14 h-14 mb-3.5 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                      <Globe className="w-6 h-6 text-cyan-400 animate-pulse" />
                    </div>
                    <p className="text-xs font-bold text-slate-100 font-mono tracking-wide">
                      LOADING IN-APP IFRAME...
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                      กำลังเชื่อมต่อและโหลดหน้าเว็บ {domain} ภายใน Obsidian Vault
                    </p>
                  </div>
                )}

                {/* The In-App Live Iframe */}
                <iframe
                  key={iframeKey}
                  ref={webIframeRef}
                  src={item.url}
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  onLoad={() => setIframeLoading(false)}
                  className="w-full h-full border-0 relative z-10"
                  style={{ backgroundColor: '#090a0f' }}
                />
              </>
            )}
          </div>

          {/* Smart Fallback & Notice Bar - Tells user to open external link if blocked */}
          <div className="p-3 sm:p-4 bg-black/85 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  {decodeHtmlEntities(item.title)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  หากหน้านี้แสดงเป็นสีขาวหรือว่างเปล่า เกิดจากเว็บไซต์ปลายทาง ({domain}) ตั้งค่าบล็อก Iframe (X-Frame-Options) กรุณากดปุ่มเพื่อเปิดไปยังเว็บไซต์โดยตรง
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all touch-target"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t.card.copied : t.card.copyUrl}</span>
              </button>

              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 hover:from-cyan-300 hover:to-teal-300 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 touch-target font-display tracking-wider"
              >
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>เปิด {domain} ในแท็บใหม่ ↗</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
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
