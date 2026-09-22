import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

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

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all font-medium active:scale-95 cursor-pointer touch-target select-none ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
          } ${className}`}
          title="ติดตั้งบน iPhone/iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{compact ? 'ติดตั้ง' : 'ติดตั้งบน iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-[#0e121d] border border-cyan-500/30 p-6 shadow-2xl relative text-left">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ติดตั้งบน iPhone / iPad</h3>
                  <p className="text-xs text-slate-400">ใช้งานเหมือนแอปแท้ เปิดได้ทันใจ</p>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-300 bg-white/[0.03] border border-white/5 p-4 rounded-xl leading-relaxed">
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>แตะปุ่ม <strong>แชร์ (Share)</strong> ที่แถบด้านล่างของ Safari</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>เลื่อนลงมาแล้วเลือก <strong>เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</strong></span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>แตะ <strong>เพิ่ม (Add)</strong> ที่มุมขวาบน</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2.5 text-xs sm:text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
