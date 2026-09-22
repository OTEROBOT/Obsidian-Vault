import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Menu } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface ScrollNavigationProps {
  onOpenMobileMenu?: () => void;
}

export const ScrollNavigation: React.FC<ScrollNavigationProps> = ({ onOpenMobileMenu }) => {
  const { language } = useTranslation();
  const [showNav, setShowNav] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Store last progress to prevent redundant React re-renders during high-speed scrolling
  const lastProgressRef = useRef(0);
  const lastAtTopRef = useRef(true);
  const lastAtBottomRef = useRef(false);
  const lastShowNavRef = useRef(false);

  useEffect(() => {
    let rafId: number | null = null;

    const computeScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

      const shouldShow = scrollHeight > 250 || scrollY > 120;
      if (shouldShow !== lastShowNavRef.current) {
        lastShowNavRef.current = shouldShow;
        setShowNav(shouldShow);
      }

      const atTop = scrollY < 60;
      if (atTop !== lastAtTopRef.current) {
        lastAtTopRef.current = atTop;
        setIsAtTop(atTop);
      }

      const atBottom = scrollHeight > 0 && scrollY >= scrollHeight - 60;
      if (atBottom !== lastAtBottomRef.current) {
        lastAtBottomRef.current = atBottom;
        setIsAtBottom(atBottom);
      }

      if (scrollHeight > 0) {
        const progress = Math.min(100, Math.max(0, Math.round((scrollY / scrollHeight) * 100)));
        // Only update state when integer percentage actually shifts
        if (progress !== lastProgressRef.current) {
          lastProgressRef.current = progress;
          setScrollProgress(progress);
        }
      }
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        computeScroll();
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    computeScroll();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
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
    <aside
      className="hidden sm:flex fixed sm:bottom-20 lg:bottom-6 sm:right-3.5 z-30 flex-col items-center gap-1 p-1 rounded-xl bg-[#090b10]/90 border border-cyan-500/30 shadow-xl shadow-cyan-950/30 select-none opacity-85 hover:opacity-100 transition-all"
      role="region"
      aria-label="Scroll Navigation"
    >
      {/* Scroll to Top Button */}
      <button
        type="button"
        onClick={scrollToTop}
        title={topLabel}
        aria-label={topLabel}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 group touch-manipulation cursor-pointer ${
          isAtTop
            ? 'opacity-30 text-slate-400 bg-white/5 cursor-default'
            : 'text-cyan-300 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-400 active:scale-95'
        }`}
      >
        <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
      </button>

      {/* Progress Indicator */}
      <div 
        className="w-7 text-[9px] font-mono text-center text-cyan-400 font-bold py-0.5 leading-none select-none cursor-default"
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
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 group touch-manipulation cursor-pointer ${
          isAtBottom
            ? 'opacity-30 text-slate-400 bg-white/5 cursor-default'
            : 'text-cyan-300 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-400 active:scale-95'
        }`}
      >
        <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
      </button>

      {/* Quick Menu Button (iPad / Tablet / Small Desktop) */}
      {onOpenMobileMenu && (
        <button
          type="button"
          onClick={onOpenMobileMenu}
          title={language === 'th' ? 'เปิดเมนู' : 'Open menu'}
          aria-label={language === 'th' ? 'เปิดเมนู' : 'Open menu'}
          className="xl:hidden w-8 h-8 mt-0.5 rounded-lg flex items-center justify-center text-cyan-300 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 hover:border-cyan-300 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}
    </aside>
  );
};

