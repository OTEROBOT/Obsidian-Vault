import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Copy, Check, Loader2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { getTwitterHandle } from '../utils/mediaProxy';

interface TwitterEmbedProps {
  url: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  onClose?: () => void;
}

export const TwitterEmbed: React.FC<TwitterEmbedProps> = ({
  url,
  title,
  description,
  thumbnailUrl,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oembedData, setOembedData] = useState<{ author_name?: string; html?: string; url?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const handle = getTwitterHandle(url);
  const isPost = url.includes('/status/');

  // Load Twitter Widgets JS SDK
  const loadTwitterSDK = (): Promise<any> => {
    return new Promise((resolve) => {
      if ((window as any).twttr && (window as any).twttr.widgets) {
        resolve((window as any).twttr);
        return;
      }

      const existingScript = document.getElementById('twitter-wjs');
      if (existingScript) {
        const interval = setInterval(() => {
          if ((window as any).twttr && (window as any).twttr.widgets) {
            clearInterval(interval);
            resolve((window as any).twttr);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(interval);
          resolve((window as any).twttr || null);
        }, 4000);
        return;
      }

      const script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      script.onload = () => {
        resolve((window as any).twttr || null);
      };
      script.onerror = () => {
        resolve(null);
      };
      document.head.appendChild(script);
    });
  };

  const fetchOEmbed = async () => {
    setIsLoading(true);
    setError(null);
    setWidgetReady(false);

    try {
      const res = await fetch(`/api/twitter-oembed?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        throw new Error('ไม่สามารถโหลดทวีตผ่าน X oEmbed ได้');
      }
      const data = await res.json();
      setOembedData(data);
      setIsLoading(false);

      // Render the Twitter widget once HTML is mounted
      setTimeout(async () => {
        const twttr = await loadTwitterSDK();
        if (twttr && twttr.widgets && containerRef.current) {
          twttr.widgets.load(containerRef.current);
          setWidgetReady(true);
        }
      }, 100);
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการโหลดเนื้อหาจาก X');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isPost) {
      fetchOEmbed();
    } else {
      setIsLoading(false);
    }
  }, [url, isPost]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-4">
      <div className="rounded-2xl bg-black border border-white/15 p-5 sm:p-7 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/[0.07] rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-xl shadow-inner select-none">
              𝕏
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {isPost ? 'X Post / Tweet' : 'X Profile'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {isPost ? 'Interactive Widget' : 'Profile'}
                </span>
              </div>
              {handle && (
                <p className="text-xs text-sky-400 font-mono mt-0.5">
                  {handle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPost && (
              <button
                onClick={fetchOEmbed}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                title="รีเฟรชการ์ดทวีต"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-slate-200 transition-all shadow-md touch-target active:scale-95"
            >
              <span>เปิดบน 𝕏</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </a>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <p className="text-xs font-medium tracking-wide">กำลังเชื่อมต่อ X oEmbed Widget...</p>
          </div>
        )}

        {/* Interactive Tweet Widget Container */}
        {isPost && !isLoading && !error && oembedData?.html && (
          <div className="flex flex-col items-center justify-center min-h-[240px] w-full py-2">
            <div
              ref={containerRef}
              className="w-full flex justify-center [&_.twitter-tweet]:!mx-auto [&_.twitter-tweet]:!max-w-xl [&_.twitter-tweet]:!w-full"
              dangerouslySetInnerHTML={{ __html: oembedData.html }}
            />
          </div>
        )}

        {/* Fallback / Error State / Profile Card */}
        {(!isPost || error) && !isLoading && (
          <div className="flex flex-col md:flex-row gap-5 items-start">
            {thumbnailUrl && (
              <div className="relative w-full md:w-64 aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0 shadow-lg">
                <img
                  src={thumbnailUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 space-y-2.5 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                {title || (handle ? `Profile of ${handle}` : 'X Content')}
              </h3>
              {description && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              )}
              {error && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{error} - คุณสามารถเปิดดูบนเว็บไซต์หรือแอป 𝕏 ได้โดยตรง</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px]">
              {isPost ? 'Official X oEmbed Dynamic Frame' : 'X Profile Card'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all touch-target"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-slate-200 transition-all touch-target"
            >
              <span>เปิดดูบน 𝕏</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
