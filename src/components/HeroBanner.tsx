import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Pause, 
  Play, 
  Move, 
  Check, 
  RotateCcw, 
  Database, 
  Plus, 
  ExternalLink,
  Sliders,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { BannerSlide, SystemConfig } from '../types';

interface HeroBannerProps {
  config: SystemConfig;
  isRealAdmin: boolean;
  onOpenAdmin: () => void;
  onOpenAddLink: () => void;
  onUpdateSlidePosition?: (slideId: string, posX: number, posY: number, scale?: number) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  config,
  isRealAdmin,
  onOpenAdmin,
  onOpenAddLink,
  onUpdateSlidePosition,
}) => {
  // Normalize slides from config (fallback to bannerBgUrl or default obsidian slide)
  const slides: BannerSlide[] = React.useMemo(() => {
    if (config.bannerSlides && config.bannerSlides.length > 0) {
      return config.bannerSlides;
    }
    // Fallback if user previously only had bannerBgUrl
    return [
      {
        id: 'default-slide-1',
        imageUrl: config.bannerBgUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80',
        title: config.bannerTitle || config.vaultName || 'OBSIDIAN VAULT',
        subtitle: config.bannerSubtitle || config.vaultTagline || 'Ultra-fast, luxury cyber-dark link and media repository',
        badge: config.bannerBadge || 'คลังไซเบอร์ความเร็วสูง',
        positionX: 50,
        positionY: 50,
        scale: 1.0,
        fitMode: 'cover',
        overlayOpacity: config.bannerOverlayOpacity ?? 0.75,
      },
    ];
  }, [
    config.bannerSlides,
    config.bannerBgUrl,
    config.bannerTitle,
    config.vaultName,
    config.bannerSubtitle,
    config.vaultTagline,
    config.bannerBadge,
    config.bannerOverlayOpacity,
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);

  // Active slide
  const activeSlide = slides[currentIndex] || slides[0];

  // Drag Repositioning state for active slide
  const [dragPosX, setDragPosX] = useState<number>(activeSlide?.positionX ?? 50);
  const [dragPosY, setDragPosY] = useState<number>(activeSlide?.positionY ?? 50);
  const [dragScale, setDragScale] = useState<number>(activeSlide?.scale ?? 1.0);
  const isDraggingRef = useRef(false);
  const dragStartCoords = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number }>({
    startX: 0,
    startY: 0,
    initPosX: 50,
    initPosY: 50,
  });

  // Sync drag coords when active slide changes
  useEffect(() => {
    if (activeSlide) {
      setDragPosX(activeSlide.positionX ?? 50);
      setDragPosY(activeSlide.positionY ?? 50);
      setDragScale(activeSlide.scale ?? 1.0);
    }
  }, [currentIndex, activeSlide]);

  const intervalSeconds = Math.max(2, config.bannerSlideInterval || 5);
  const isAutoSlide = config.bannerAutoSlide !== false && slides.length > 1;

  // Next & Previous slide triggers
  const paginate = useCallback((newDirection: number) => {
    if (slides.length <= 1) return;
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = slides.length - 1;
      if (next >= slides.length) next = 0;
      return next;
    });
  }, [slides.length]);

  const goToSlide = (idx: number) => {
    if (idx === currentIndex) return;
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  // Auto-slide timer with cleanup
  useEffect(() => {
    if (!isAutoSlide || isPaused || isRepositioning) return;

    const timer = setInterval(() => {
      paginate(1);
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [isAutoSlide, isPaused, isRepositioning, intervalSeconds, paginate]);

  // Height preset classes
  const heightClass = React.useMemo(() => {
    switch (config.bannerHeight) {
      case 'compact':
        return 'min-h-[170px] sm:min-h-[195px] md:min-h-[210px]';
      case 'tall':
        return 'min-h-[290px] sm:min-h-[330px] md:min-h-[370px]';
      case 'cinematic':
        return 'min-h-[350px] sm:min-h-[410px] md:min-h-[460px]';
      case 'standard':
      default:
        return 'min-h-[225px] sm:min-h-[255px] md:min-h-[285px]';
    }
  }, [config.bannerHeight]);

  // Handle Drag to Reposition
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRepositioning) return;
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartCoords.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: dragPosX,
      initPosY: dragPosY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRepositioning || !isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartCoords.current.startX;
    const deltaY = e.clientY - dragStartCoords.current.startY;
    
    // Sensitivity factor: 1 pixel ~ 0.15% offset
    const sensitivity = 0.15 / dragScale;
    const newX = Math.min(100, Math.max(0, dragStartCoords.current.initPosX - deltaX * sensitivity));
    const newY = Math.min(100, Math.max(0, dragStartCoords.current.initPosY - deltaY * sensitivity));
    
    setDragPosX(Math.round(newX));
    setDragPosY(Math.round(newY));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch drag support for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isRepositioning || e.touches.length === 0) return;
    isDraggingRef.current = true;
    dragStartCoords.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      initPosX: dragPosX,
      initPosY: dragPosY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isRepositioning || !isDraggingRef.current || e.touches.length === 0) return;
    const deltaX = e.touches[0].clientX - dragStartCoords.current.startX;
    const deltaY = e.touches[0].clientY - dragStartCoords.current.startY;
    const sensitivity = 0.18 / dragScale;
    const newX = Math.min(100, Math.max(0, dragStartCoords.current.initPosX - deltaX * sensitivity));
    const newY = Math.min(100, Math.max(0, dragStartCoords.current.initPosY - deltaY * sensitivity));
    setDragPosX(Math.round(newX));
    setDragPosY(Math.round(newY));
  };

  const handleSaveReposition = () => {
    if (onUpdateSlidePosition && activeSlide) {
      onUpdateSlidePosition(activeSlide.id, dragPosX, dragPosY, dragScale);
    }
    setIsRepositioning(false);
  };

  const handleResetReposition = () => {
    setDragPosX(50);
    setDragPosY(50);
    setDragScale(1.0);
  };

  // Slide transition variants for motion
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 1.02,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 260, damping: 28 },
        opacity: { duration: 0.5 },
        scale: { duration: 0.6 },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: 'spring', stiffness: 260, damping: 28 },
        opacity: { duration: 0.4 },
      },
    }),
  };

  const fadeVariants = {
    enter: { opacity: 0, scale: 1.03 },
    center: { opacity: 1, scale: 1, transition: { duration: 0.65, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.45, ease: 'easeIn' } },
  };

  const activeVariants = config.bannerTransitionEffect === 'fade' ? fadeVariants : slideVariants;

  return (
    <div 
      className={`group relative rounded-2xl sm:rounded-3xl glass-panel overflow-hidden border border-cyan-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.45)] transition-all duration-300 select-none ${heightClass}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        isDraggingRef.current = false;
      }}
    >
      {/* Background Slides with AnimatePresence */}
      <div 
        className={`absolute inset-0 overflow-hidden ${isRepositioning ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={activeSlide.id + (isRepositioning ? '-edit' : '')}
            custom={direction}
            variants={activeVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 w-full h-full"
          >
            {/* Dual layer for 'contain' or standard for 'cover'/'custom' */}
            {activeSlide.fitMode === 'contain' ? (
              <>
                {/* Ambient Blurred Backdrop */}
                <div 
                  className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-125 opacity-40 transition-all duration-700"
                  style={{ backgroundImage: `url(${activeSlide.imageUrl})` }}
                />
                {/* Sharp Contained Center Image */}
                <img
                  src={activeSlide.imageUrl}
                  alt={activeSlide.title || 'Banner'}
                  className="w-full h-full object-contain relative z-10 transition-transform duration-300 pointer-events-none"
                  style={{
                    transform: `scale(${isRepositioning ? dragScale : (activeSlide.scale ?? 1)})`,
                    objectPosition: `${isRepositioning ? dragPosX : (activeSlide.positionX ?? 50)}% ${isRepositioning ? dragPosY : (activeSlide.positionY ?? 50)}%`,
                  }}
                  draggable={false}
                />
              </>
            ) : (
              <img
                src={activeSlide.imageUrl}
                alt={activeSlide.title || 'Banner'}
                className="w-full h-full object-cover relative z-0 transition-transform duration-150 pointer-events-none"
                style={{
                  transform: (isRepositioning ? dragScale : (activeSlide.scale ?? 1)) !== 1
                    ? `scale(${isRepositioning ? dragScale : (activeSlide.scale ?? 1)})`
                    : undefined,
                  objectPosition: `${isRepositioning ? dragPosX : (activeSlide.positionX ?? 50)}% ${isRepositioning ? dragPosY : (activeSlide.positionY ?? 50)}%`,
                }}
                draggable={false}
              />
            )}

            {/* Dark gradient overlay for legibility */}
            <div 
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                backgroundColor: '#090a0f',
                opacity: activeSlide.overlayOpacity ?? config.bannerOverlayOpacity ?? 0.70,
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cyber Glow Accents */}
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none z-10" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-purple-500/15 blur-3xl pointer-events-none z-10" />

      {/* Interactive Reposition Guide Overlay (When Admin is Repositioning) */}
      {isRepositioning && (
        <div className="absolute inset-0 z-30 pointer-events-none border-2 border-dashed border-cyan-400/80 bg-cyan-950/20 backdrop-blur-[1px] flex flex-col justify-between p-4">
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 border border-cyan-400 text-cyan-300 text-xs font-mono shadow-xl">
              <Move className="w-3.5 h-3.5 animate-pulse" />
              <span>โหมดจัดวางภาพอิสระ: คลิกเมาส์ค้างแล้วลากเพื่อเลื่อนตำแหน่ง</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-lg bg-black/80 text-[11px] font-mono text-slate-300 border border-white/10">
                X: <span className="text-cyan-400 font-bold">{dragPosX}%</span> | Y: <span className="text-cyan-400 font-bold">{dragPosY}%</span> | Zoom: <span className="text-cyan-400 font-bold">{Math.round(dragScale * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Center Crosshair Marker */}
          <div className="self-center flex flex-col items-center justify-center pointer-events-none opacity-60">
            <div className="w-10 h-10 rounded-full border border-cyan-400/60 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
          </div>

          {/* Reposition Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-black/90 border border-cyan-500/40 pointer-events-auto backdrop-blur-md">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs text-slate-400">ขนาดภาพ (Zoom):</span>
              <button
                type="button"
                onClick={() => setDragScale((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200"
                title="ย่อขนาด"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.05"
                value={dragScale}
                onChange={(e) => setDragScale(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <button
                type="button"
                onClick={() => setDragScale((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))))}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200"
                title="ขยายขนาด"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetReposition}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/10 hover:bg-white/20 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ตกึ่งกลาง</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRepositioning(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveReposition}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>บันทึกตำแหน่งนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Foreground Content (Title, Subtitle, Badge, Buttons) */}
      <div className="relative z-10 p-5 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 pointer-events-none">
        <div className="space-y-1.5 sm:space-y-2 max-w-2xl pointer-events-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-500/30 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{activeSlide.badge || config.bannerBadge || 'คลังไซเบอร์ความเร็วสูง'}</span>
          </div>

          {/* Heading */}
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display tracking-wide text-slate-100 drop-shadow-md">
            {activeSlide.title || config.bannerTitle || config.vaultName || 'OBSIDIAN VAULT'}
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed drop-shadow-sm max-w-xl">
            {activeSlide.subtitle || config.bannerSubtitle || config.vaultTagline || 'ศูนย์รวมคลังข้อมูลและมัลติมีเดียความเร็วสูง'}
          </p>

          {/* Click-through link if configured for this slide */}
          {activeSlide.linkUrl && (
            <div className="pt-1">
              <a
                href={activeSlide.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200 underline underline-offset-4 decoration-cyan-400/50"
              >
                <span>เรียนรู้เพิ่มเติม / เปิดลิงก์</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Action Controls & Admin Tools */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap pointer-events-auto">
          {isRealAdmin && !isRepositioning && (
            <>
              {/* Quick Mouse Reposition Toggle for Admin */}
              <button
                type="button"
                onClick={() => setIsRepositioning(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-md transition-all shadow-md touch-target"
                title="คลิกเพื่อเปิดโหมดลากเมาส์เลื่อนตำแหน่งภาพอย่างอิสระ"
              >
                <Move className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">จัดวางภาพด้วยเมาส์</span>
              </button>

              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-100 border border-white/20 hover:border-cyan-500/40 backdrop-blur-md transition-all shadow-md touch-target"
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>จัดการระบบ</span>
              </button>

              <button
                onClick={onOpenAddLink}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 hover:from-cyan-300 hover:to-teal-300 transition-all shadow-lg shadow-cyan-500/20 touch-target"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มลิงก์</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Arrows (Prev / Next) - Only show when multiple slides exist */}
      {slides.length > 1 && !isRepositioning && (
        <>
          <button
            type="button"
            onClick={() => paginate(-1)}
            className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-panel border border-white/15 bg-black/40 hover:bg-cyan-500/20 hover:border-cyan-400/50 text-slate-200 hover:text-cyan-300 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-lg backdrop-blur-md touch-target"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => paginate(1)}
            className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full glass-panel border border-white/15 bg-black/40 hover:bg-cyan-500/20 hover:border-cyan-400/50 text-slate-200 hover:text-cyan-300 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-lg backdrop-blur-md touch-target"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Bottom Indicators & Timer Progress Bar */}
      {slides.length > 1 && !isRepositioning && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-lg">
          {/* Play/Pause control */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="text-slate-400 hover:text-cyan-300 transition-colors p-0.5"
            title={isPaused ? 'เล่นสไลด์อัตโนมัติ' : 'หยุดสไลด์ชั่วคราว'}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>

          {/* Dots / Pills with active progress */}
          <div className="flex items-center gap-1.5">
            {slides.map((s, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={s.id || idx}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className="relative h-2 rounded-full transition-all duration-300 overflow-hidden"
                  style={{ width: isActive ? '28px' : '8px' }}
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  {/* Background pill */}
                  <div className={`w-full h-full rounded-full ${isActive ? 'bg-cyan-950' : 'bg-white/20 hover:bg-white/40'}`} />
                  
                  {/* Active Progress fill */}
                  {isActive && (
                    <motion.div
                      key={`progress-${currentIndex}-${isPaused}`}
                      className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full"
                      initial={{ width: '0%' }}
                      animate={!isPaused && isAutoSlide ? { width: '100%' } : { width: '100%' }}
                      transition={
                        !isPaused && isAutoSlide
                          ? { duration: intervalSeconds, ease: 'linear' }
                          : { duration: 0.2 }
                      }
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Slide counter */}
          <span className="text-[10px] font-mono text-slate-400 pl-1 border-l border-white/10">
            {currentIndex + 1}/{slides.length}
          </span>
        </div>
      )}
    </div>
  );
};
