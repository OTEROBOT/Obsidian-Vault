import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

export const ScrollNavigation: React.FC = () => {
  const { language } = useTranslation();
  const [showNav, setShowNav] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

      // Show buttons once scrolled down slightly or if page has ample scroll height
      if (scrollHeight > 250) {
        setShowNav(true);
      } else {
        setShowNav(scrollY > 120);
      }

      setIsAtTop(scrollY < 60);
      setIsAtBottom(scrollHeight > 0 && scrollY >= scrollHeight - 60);

      if (scrollHeight > 0) {
        const progress = Math.min(100, Math.max(0, Math.round((scrollY / scrollHeight) * 100)));
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  if (!showNav) return null;

  const topLabel = language === 'th' ? 'เลื่อนขึ้นบนสุด' : 'Scroll to top';
  const bottomLabel = language === 'th' ? 'เลื่อนลงล่างสุด' : 'Scroll to bottom';

  return (
    <div
      className="fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 z-40 flex flex-col items-center gap-1.5 p-1 rounded-2xl bg-[#090b10]/85 backdrop-blur-xl border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 select-none animate-in fade-in slide-in-from-bottom-3 duration-200"
      role="region"
      aria-label="Scroll Navigation"
    >
      {/* Scroll to Top Button */}
      <button
        type="button"
        onClick={scrollToTop}
        title={topLabel}
        aria-label={topLabel}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group touch-manipulation ${
          isAtTop
            ? 'opacity-40 hover:opacity-75 text-slate-400 hover:text-slate-200 bg-white/5'
            : 'text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/25 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.35)] active:scale-95'
        }`}
      >
        <ChevronUp className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
      </button>

      {/* Progress Indicator */}
      <div 
        className="w-7 text-[10px] font-mono text-center text-cyan-400/80 font-bold py-0.5 leading-none select-none cursor-default"
        title={`${scrollProgress}%`}
      >
        {scrollProgress}%
      </div>

      {/* Scroll to Bottom Button */}
      <button
        type="button"
        onClick={scrollToBottom}
        title={bottomLabel}
        aria-label={bottomLabel}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group touch-manipulation ${
          isAtBottom
            ? 'opacity-40 hover:opacity-75 text-slate-400 hover:text-slate-200 bg-white/5'
            : 'text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/25 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.35)] active:scale-95'
        }`}
      >
        <ChevronDown className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
      </button>
    </div>
  );
};
