import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, X, Share, PlusSquare, Info, Copy, Check, Compass } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [browserTab, setBrowserTab] = useState<'safari' | 'brave'>('safari');
  const [copied, setCopied] = useState(false);

  // Detect if user might be on Brave/Chrome on iOS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/brave/.test(ua) || (window.navigator as any).brave !== undefined || /crios/.test(ua)) {
        setBrowserTab('brave');
      }
    }
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!showIOSGuide) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowIOSGuide(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIOSGuide]);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 transition-all font-medium active:scale-95 cursor-pointer touch-target select-none shadow-[0_0_15px_rgba(6,182,212,0.15)] ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        } ${className}`}
        title="ติดตั้งแอปลงบนเครื่อง (Install App)"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>{compact ? 'ติดตั้ง' : 'ติดตั้งแอป (Install)'}</span>
      </button>
    );
  }

  // iOS Safari / iPadOS flow (WebKit does not support beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 transition-all font-medium active:scale-95 cursor-pointer touch-target select-none shadow-[0_0_15px_rgba(6,182,212,0.15)] ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
          } ${className}`}
          title="วิธีติดตั้งบน iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{compact ? 'ติดตั้ง' : 'ติดตั้งบน iOS'}</span>
        </button>

        {showIOSGuide &&
          createPortal(
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
              onClick={() => setShowIOSGuide(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#0e121d] border border-cyan-500/40 p-5 sm:p-6 shadow-2xl relative text-left my-auto max-h-[92vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors z-10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3.5 mb-4 shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="pr-6">
                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                      วิธีติดตั้งบน iPhone / iPad
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ติดตั้งเป็นแอปบนหน้าจอโฮม เปิดเร็ว ไม่มีแถบเบราว์เซอร์
                    </p>
                  </div>
                </div>

                {/* Explanation note why this modal appears on iOS */}
                <div className="mb-4 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-start gap-2.5 text-xs text-cyan-200/90 leading-relaxed shrink-0">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-cyan-300">ทำไม iOS ถึงมีขั้นตอนนี้?</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      ระบบ iOS ของ Apple ไม่อนุญาตให้กดติดตั้งอัตโนมัติด้วย 1 คลิกเหมือน Android จึงต้องเพิ่มผ่านเมนูแชร์ของเครื่องตามขั้นตอนด้านล่างครับ
                    </p>
                  </div>
                </div>

                {/* Browser Select Tabs */}
                <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/10 mb-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBrowserTab('safari')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      browserTab === 'safari'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Safari (แนะนำ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrowserTab('brave')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      browserTab === 'brave'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Brave / Chrome</span>
                  </button>
                </div>

                {/* Steps Content - Scrollable if screen is very short */}
                <div className="overflow-y-auto space-y-3 pr-1 flex-1 text-xs sm:text-sm text-slate-200">
                  {browserTab === 'safari' ? (
                    <>
                      <div className="flex items-start gap-3 bg-white/[0.03] border border-white/5 p-3 rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/40">
                          1
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                            แตะปุ่มแชร์ <Share className="w-3.5 h-3.5 text-cyan-400 inline" /> (Share)
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            บน iPad อยู่ที่แถบมุมขวาบน หรือบน iPhone อยู่ที่แถบเครื่องมือด้านล่าง
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-white/[0.03] border border-white/5 p-3 rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/40">
                          2
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                            เลือก <PlusSquare className="w-3.5 h-3.5 text-cyan-400 inline" /> &ldquo;เพิ่มไปยังหน้าจอโฮม&rdquo;
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            (Add to Home Screen) เลื่อนรายการเมนูลงมาเล็กน้อยเพื่อค้นหา
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-white/[0.03] border border-white/5 p-3 rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/40">
                          3
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white">
                            แตะ &ldquo;เพิ่ม&rdquo; (Add) ที่มุมขวาบน
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            ไอคอน Obsidian Vault จะปรากฏบนหน้าจอโฮมของคุณเหมือนแอปแท้
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 bg-white/[0.03] border border-white/5 p-3 rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/40">
                          1
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white">
                            แตะปุ่มเมนู <span className="font-mono text-cyan-400">···</span> หรือไอคอนแชร์
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            อยู่ที่แถบที่อยู่ด้านบนหรือมุมขวาล่างของเบราว์เซอร์ Brave/Chrome
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-white/[0.03] border border-white/5 p-3 rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/40">
                          2
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white">
                            เลือก &ldquo;แชร์...&rdquo; แล้วเลือก &ldquo;เพิ่มไปยังหน้าจอโฮม&rdquo;
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            หรือกด &ldquo;Add to Home Screen&rdquo; ในเมนู
                          </p>
                        </div>
                      </div>

                      {/* Recommend Safari tip */}
                      <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-xs">
                        <p className="font-semibold text-amber-300 mb-1">
                          💡 คำแนะนำพิเศษสำหรับ iOS / iPad:
                        </p>
                        <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
                          การเปิดด้วย <strong>Safari</strong> แล้วเพิ่มลงหน้าจอโฮม จะทำให้แอปทำงานแบบ <strong>Full-screen PWA แท้</strong> (ไม่มีขอบหรือแถบเบราว์เซอร์มากวนใจ)
                        </p>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="w-full py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">คัดลอกลิงก์แล้ว! นำไปวางใน Safari ได้เลย</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>คัดลอกลิงก์ไปเปิดใน Safari</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-bold py-2.5 text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer shrink-0 active:scale-[0.98]"
                >
                  เข้าใจแล้ว
                </button>
              </div>
            </div>,
            document.body
          )}
      </>
    );
  }

  return null;
};
