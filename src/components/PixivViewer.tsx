import React, { useState, useEffect, useCallback } from 'react';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Loader2, 
  User, 
  Tag as TagIcon, 
  Sparkles,
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react';
import { getPixivIllustId, getSafeImageUrl } from '../utils/mediaProxy';

interface PixivArtworkData {
  id: string;
  title: string;
  description: string;
  userName: string;
  userId: string;
  userAvatar?: string;
  tags: string[];
  pageCount: number;
  width?: number;
  height?: number;
  createDate?: string;
  pages: Array<{
    index: number;
    regular: string;
    original: string;
    proxiedRegular: string;
    proxiedOriginal: string;
  }>;
  thumbnailUrl: string;
  decorateUrl: string;
}

interface PixivViewerProps {
  url: string;
  title?: string;
  thumbnailUrl?: string;
  description?: string;
}

export const PixivViewer: React.FC<PixivViewerProps> = ({
  url,
  title: initialTitle,
  thumbnailUrl: initialThumb,
  description: initialDesc,
}) => {
  const [data, setData] = useState<PixivArtworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const illustId = getPixivIllustId(url);

  const fetchArtworkInfo = useCallback(async () => {
    if (!illustId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setImageLoadError(false);

    try {
      const res = await fetch(`/api/pixiv-info?id=${illustId}`);
      if (!res.ok) {
        throw new Error(`ไม่สามารถดึงข้อมูล Pixiv #${illustId} ได้`);
      }
      const json: PixivArtworkData = await res.json();
      setData(json);
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถโหลดข้อมูล Pixiv ผ่านเซิร์ฟเวอร์');
      setIsLoading(false);
    }
  }, [illustId]);

  useEffect(() => {
    setCurrentPage(0);
    setImageZoom(1);
    fetchArtworkInfo();
  }, [fetchArtworkInfo]);

  // Keyboard navigation for multi-page illustrations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!data || data.pageCount <= 1) return;
      if (e.key === 'ArrowLeft') {
        setCurrentPage((p) => (p > 0 ? p - 1 : data.pageCount - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPage((p) => (p < data.pageCount - 1 ? p + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine current image URL
  const currentImageUrl = data?.pages?.[currentPage]?.proxiedRegular 
    || data?.decorateUrl 
    || (illustId ? `https://embed.pixiv.net/decorate.php?illust_id=${illustId}` : '')
    || getSafeImageUrl(initialThumb);

  const originalDownloadUrl = data?.pages?.[currentPage]?.proxiedOriginal || currentImageUrl;

  const handleDownloadImage = async () => {
    if (!currentImageUrl) return;
    setIsDownloading(true);
    try {
      const fetchUrl = originalDownloadUrl || currentImageUrl;
      const res = await fetch(fetchUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const filename = `pixiv_${illustId || 'art'}_p${currentPage + 1}.jpg`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(originalDownloadUrl || currentImageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Pixiv Artwork Glass Showcase */}
      <div className="rounded-2xl bg-black/90 border border-purple-500/25 p-4 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Soft Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/[0.08] rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 p-[1px] shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center text-cyan-400 font-bold text-sm tracking-tighter select-none">
                pixiv
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {data?.title || initialTitle || `Pixiv Artwork #${illustId || ''}`}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {data && data.pageCount > 1 ? `Album (${data.pageCount}P)` : 'Illustration'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                {data?.userName ? (
                  <a
                    href={`https://www.pixiv.net/users/${data.userId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-300 transition-colors flex items-center gap-1 font-medium text-slate-300"
                  >
                    <User className="w-3 h-3 text-cyan-400" />
                    <span>{data.userName}</span>
                  </a>
                ) : (
                  <span>pixiv.net</span>
                )}
                {illustId && (
                  <span className="text-[11px] font-mono text-slate-500">
                    #{illustId}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchArtworkInfo}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              title="รีเฟรชข้อมูล Pixiv"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-400 transition-all shadow-md touch-target active:scale-95"
            >
              <span>เปิดบน Pixiv</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </a>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-xs font-medium tracking-wide">กำลังเชื่อมต่อ Pixiv API และโหลดภาพความละเอียดสูง...</p>
          </div>
        )}

        {/* Main Artwork Stage */}
        {!isLoading && (
          <div className="space-y-4">
            {/* Interactive Image Frame */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 flex flex-col items-center justify-center min-h-[380px] max-h-[72vh] shadow-inner">
              {/* Zoom Controls Overlay */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-xl">
                <button
                  onClick={() => setImageZoom((z) => Math.min(z + 0.25, 3))}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors touch-target"
                  title="ซูมเข้า"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 px-1.5 min-w-[42px] text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  onClick={() => setImageZoom((z) => Math.max(z - 0.25, 0.75))}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors touch-target"
                  title="ซูมออก"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setImageZoom(1)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors touch-target"
                  title="รีเซ็ตขนาด"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Multi-page Navigation Overlays */}
              {data && data.pageCount > 1 && (
                <>
                  <button
                    onClick={() => setCurrentPage((p) => (p > 0 ? p - 1 : data.pageCount - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-90"
                    title="ภาพก่อนหน้า (หรือลูกศรซ้าย)"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={() => setCurrentPage((p) => (p < data.pageCount - 1 ? p + 1 : 0))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-90"
                    title="ภาพถัดไป (หรือลูกศรขวา)"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  {/* Page Pill Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-xs font-mono text-white shadow-xl flex items-center gap-1.5">
                    <span>{currentPage + 1}</span>
                    <span className="text-slate-500">/</span>
                    <span>{data.pageCount}</span>
                  </div>
                </>
              )}

              {/* Artwork Image */}
              <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
                <img
                  src={currentImageUrl}
                  alt={data?.title || initialTitle || 'Pixiv Artwork'}
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  style={{
                    transform: `translate3d(0, 0, 0) scale(${imageZoom})`,
                    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    willChange: 'transform',
                  }}
                  className="max-h-[66vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
                  onError={() => {
                    if (!imageLoadError && illustId) {
                      setImageLoadError(true);
                      // Fallback to Pixiv official decorate image
                      const imgElement = document.querySelector(`img[src="${currentImageUrl}"]`) as HTMLImageElement;
                      if (imgElement) {
                        imgElement.src = `https://embed.pixiv.net/decorate.php?illust_id=${illustId}`;
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Thumbnail Strip for Multi-Page Albums */}
            {data && data.pageCount > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-thin">
                {data.pages.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx)}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border shrink-0 transition-all ${
                      currentPage === idx
                        ? 'border-purple-400 ring-2 ring-purple-500/50 scale-105'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={p.proxiedRegular}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-0 right-0 px-1 text-[9px] font-mono bg-black/70 text-white rounded-tl">
                      {idx + 1}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Artwork Metadata & Tags */}
            <div className="space-y-3 pt-2">
              {/* Tags Cloud */}
              {data?.tags && data.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  {data.tags.map((t, i) => (
                    <a
                      key={i}
                      href={`https://www.pixiv.net/tags/${encodeURIComponent(t)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-colors"
                    >
                      #{t}
                    </a>
                  ))}
                </div>
              )}

              {/* Description */}
              {(data?.description || initialDesc) && (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: data?.description || initialDesc || '',
                    }}
                  />
                </div>
              )}

              {/* Dimensions and Info Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {data?.width && data?.height && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-[11px]">
                    {data.width} × {data.height} px
                  </span>
                )}
                {data?.createDate && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-[11px]">
                    {new Date(data.createDate).toLocaleDateString()}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Media Proxy Active (Bypass 403)</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading || !currentImageUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all touch-target shadow-md active:scale-95 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{isDownloading ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลดภาพความละเอียดสูง'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all touch-target"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
            </button>
          </div>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-400 transition-all touch-target shadow-lg shadow-blue-500/20"
          >
            <span>เปิดบน Pixiv</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
