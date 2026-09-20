import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Move, 
  Upload, 
  ExternalLink, 
  Sliders, 
  RotateCcw, 
  Sparkles, 
  Clock, 
  Layers, 
  Maximize2,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  Copy,
  Eye,
  Check
} from 'lucide-react';
import { BannerSlide, SystemConfig } from '../types';
import { uploadMediaToSupabaseStorage, compressImageToDataUrl, saveConfigToSupabase } from '../utils/supabase';

interface BannerSlideEditorProps {
  config: SystemConfig;
  onSaveConfig: (updatedConfig: SystemConfig) => void;
  onClose?: () => void;
}

export const BannerSlideEditor: React.FC<BannerSlideEditorProps> = ({
  config,
  onSaveConfig,
}) => {
  // Initialize slides array from config or migrate single bannerBgUrl
  const [slides, setSlides] = useState<BannerSlide[]>(() => {
    if (config.bannerSlides && config.bannerSlides.length > 0) {
      return config.bannerSlides;
    }
    return [
      {
        id: 'slide-1',
        imageUrl: config.bannerBgUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80',
        title: config.bannerTitle || config.vaultName || 'OBSIDIAN VAULT',
        subtitle: config.bannerSubtitle || config.vaultTagline || 'Ultra-fast, luxury cyber-dark link and media repository',
        badge: config.bannerBadge || 'คลังไซเบอร์ความเร็วสูง',
        positionX: 50,
        positionY: 50,
        scale: 1.0,
        fitMode: 'cover',
        overlayOpacity: config.bannerOverlayOpacity ?? 0.70,
      },
    ];
  });

  const [activeSlideId, setActiveSlideId] = useState<string>(slides[0]?.id || 'slide-1');
  const [autoSlide, setAutoSlide] = useState(config.bannerAutoSlide !== false);
  const [slideInterval, setSlideInterval] = useState(config.bannerSlideInterval || 5);
  const [bannerHeight, setBannerHeight] = useState<'compact' | 'standard' | 'tall' | 'cinematic'>(config.bannerHeight || 'standard');
  const [transitionEffect, setTransitionEffect] = useState<'slide' | 'fade'>(config.bannerTransitionEffect || 'slide');
  const [showBanner, setShowBanner] = useState(config.showBanner !== false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'pc' | 'ipad' | 'mobile'>('pc');
  const [isSaving, setIsSaving] = useState(false);

  // Active slide being edited
  const activeSlide = slides.find((s) => s.id === activeSlideId) || slides[0];

  // Drag Canvas Reference & Logic
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingCanvasRef = useRef(false);
  const startDragCoord = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 50,
    initY: 50,
  });

  // Update specific fields of active slide
  const updateActiveSlide = (fields: Partial<BannerSlide>) => {
    if (!activeSlide) return;
    setSlides((prev) =>
      prev.map((s) => (s.id === activeSlide.id ? { ...s, ...fields } : s))
    );
  };

  // Add new slide
  const handleAddSlide = () => {
    const newSlideId = 'slide-' + Date.now();
    const newSlide: BannerSlide = {
      id: newSlideId,
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
      title: config.vaultName || 'OBSIDIAN VAULT',
      subtitle: 'สไลด์แบนเนอร์ใหม่ล่าสุด',
      badge: 'NEW SLIDE',
      positionX: 50,
      positionY: 50,
      scale: 1.0,
      fitMode: 'cover',
      overlayOpacity: 0.70,
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideId(newSlideId);
  };

  // Duplicate slide
  const handleDuplicateSlide = (slide: BannerSlide) => {
    const copyId = 'slide-' + Date.now();
    const copySlide: BannerSlide = {
      ...slide,
      id: copyId,
      title: `${slide.title || 'Slide'} (คัดลอก)`,
    };
    setSlides((prev) => [...prev, copySlide]);
    setActiveSlideId(copyId);
  };

  // Delete slide
  const handleDeleteSlide = (id: string) => {
    if (slides.length <= 1) {
      alert('ต้องมีแบนเนอร์อย่างน้อย 1 สไลด์ครับ');
      return;
    }
    const filtered = slides.filter((s) => s.id !== id);
    setSlides(filtered);
    if (activeSlideId === id) {
      setActiveSlideId(filtered[0]?.id || '');
    }
  };

  // Move slide position up / down in list
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    const reordered = [...slides];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setSlides(reordered);
  };

  // Handle uploading banner slide image
  const handleUploadSlideImage = async (file: File, slideId: string) => {
    setUploadingId(slideId);
    try {
      const res = await uploadMediaToSupabaseStorage(file, 'banners');
      if (res && res.url) {
        setSlides((prev) =>
          prev.map((s) => (s.id === slideId ? { ...s, imageUrl: res.url } : s))
        );
        return;
      }
    } catch (e) {
      console.warn('Storage upload error, falling back to data URL:', e);
    } finally {
      setUploadingId(null);
    }

    try {
      const dataUrl = await compressImageToDataUrl(file, 1600, 0.85);
      if (dataUrl) {
        setSlides((prev) =>
          prev.map((s) => (s.id === slideId ? { ...s, imageUrl: dataUrl } : s))
        );
        return;
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setSlides((prev) =>
          prev.map((s) => (s.id === slideId ? { ...s, imageUrl: dataUrl } : s))
        );
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag canvas handlers
  const onMouseDownCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingCanvasRef.current = true;
    startDragCoord.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: activeSlide?.positionX ?? 50,
      initY: activeSlide?.positionY ?? 50,
    };
  };

  const onMouseMoveCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCanvasRef.current || !activeSlide) return;
    const deltaX = e.clientX - startDragCoord.current.startX;
    const deltaY = e.clientY - startDragCoord.current.startY;
    const currentScale = activeSlide.scale ?? 1.0;
    
    // Smooth responsive sensitivity
    const sensitivity = 0.20 / Math.max(0.5, currentScale);
    const newX = Math.min(100, Math.max(0, startDragCoord.current.initX - deltaX * sensitivity));
    const newY = Math.min(100, Math.max(0, startDragCoord.current.initY - deltaY * sensitivity));

    updateActiveSlide({
      positionX: Math.round(newX),
      positionY: Math.round(newY),
    });
  };

  const onMouseUpCanvas = () => {
    isDraggingCanvasRef.current = false;
  };

  // Touch drag support for mobile / iPad
  const onTouchStartCanvas = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0 || !activeSlide) return;
    isDraggingCanvasRef.current = true;
    startDragCoord.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      initX: activeSlide.positionX ?? 50,
      initY: activeSlide.positionY ?? 50,
    };
  };

  const onTouchMoveCanvas = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingCanvasRef.current || !activeSlide || e.touches.length === 0) return;
    const deltaX = e.touches[0].clientX - startDragCoord.current.startX;
    const deltaY = e.touches[0].clientY - startDragCoord.current.startY;
    const currentScale = activeSlide.scale ?? 1.0;
    const sensitivity = 0.20 / Math.max(0.5, currentScale);
    const newX = Math.min(100, Math.max(0, startDragCoord.current.initX - deltaX * sensitivity));
    const newY = Math.min(100, Math.max(0, startDragCoord.current.initY - deltaY * sensitivity));
    updateActiveSlide({
      positionX: Math.round(newX),
      positionY: Math.round(newY),
    });
  };

  const onTouchEndCanvas = () => {
    isDraggingCanvasRef.current = false;
  };

  // Click on canvas to directly center on that point
  const onClickCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingCanvasRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    updateActiveSlide({
      positionX: Math.round(clickX),
      positionY: Math.round(clickY),
    });
  };

  // Save all visual slider settings to system config and synchronize across all devices
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveFeedback('กำลังบันทึกและเชื่อมโยงระบบ Cloud ทุกอุปกรณ์ (PC, iPad, Mobile)...');

    const updatedCfg: SystemConfig = {
      ...config,
      bannerSlides: slides,
      bannerAutoSlide: autoSlide,
      bannerSlideInterval: Number(slideInterval),
      bannerHeight: bannerHeight,
      bannerTransitionEffect: transitionEffect,
      showBanner: showBanner,
      // Keep backward compatibility for single fields
      bannerBgUrl: slides[0]?.imageUrl || config.bannerBgUrl,
      bannerTitle: slides[0]?.title || config.bannerTitle,
      bannerSubtitle: slides[0]?.subtitle || config.bannerSubtitle,
      bannerBadge: slides[0]?.badge || config.bannerBadge,
      bannerOverlayOpacity: slides[0]?.overlayOpacity ?? config.bannerOverlayOpacity,
    };

    onSaveConfig(updatedCfg);

    try {
      const ok = await saveConfigToSupabase(updatedCfg);
      if (ok) {
        setSaveFeedback('✅ บันทึกและซิงค์ข้อมูลขึ้น Cloud เรียบร้อยแล้ว! ทุกอุปกรณ์ (PC, iPad, มือถือ) จะเปลี่ยนตามทันที');
      } else {
        setSaveFeedback('บันทึกในเครื่องแล้ว (ระบบจะซิงค์กับ Cloud อัตโนมัติ)');
      }
    } catch {
      setSaveFeedback('บันทึกการตั้งค่าระบบสไลด์เรียบร้อยแล้ว');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice & Save Trigger */}
      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm font-display">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Interactive Banner Slider & Free-Drag Positioning</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            เพิ่มแบนเนอร์ได้ไม่จำกัดจำนวน, เลื่อนตำแหน่งภาพอิสระด้วยการคลิกลากเมาส์, ปรับขนาดความสูง และตั้งเวลาสไลด์อัตโนมัติ
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 hover:from-cyan-300 hover:to-teal-300 shadow-lg shadow-cyan-500/20 shrink-0 transition-all font-display disabled:opacity-60"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{isSaving ? 'กำลังเชื่อมโยง Cloud ทุกเครื่อง...' : 'บันทึกและซิงค์ทุกอุปกรณ์ (Save & Cloud Sync)'}</span>
        </button>
      </div>

      {saveFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Global Slider & Timing Settings Bar */}
      <div className="p-5 rounded-2xl glass-panel-subtle border border-white/10 space-y-4">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>การตั้งค่าเวลาและแอนิเมชันสไลด์ (Slide Timing & Animations)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Auto Slide Toggle */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
            <label className="flex items-center justify-between cursor-pointer select-none text-xs font-medium text-slate-300">
              <span>เลื่อนสไลด์อัตโนมัติ (Auto-Slide)</span>
              <input
                type="checkbox"
                checked={autoSlide}
                onChange={(e) => setAutoSlide(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-white/20 text-cyan-500"
              />
            </label>
            <p className="text-[11px] text-slate-400">
              เมื่อเปิดใช้งาน แบนเนอร์จะสลับไปภาพถัดไปอย่างต่อเนื่อง
            </p>
          </div>

          {/* 2. Slide Interval Duration (Seconds) */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">ระยะเวลาต่อภาพ (วินาที)</span>
              <span className="font-mono text-cyan-400 font-bold">{slideInterval} วินาที</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="2"
                max="20"
                step="1"
                value={slideInterval}
                onChange={(e) => setSlideInterval(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
            <div className="flex gap-1.5">
              {[3, 5, 8, 10].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSlideInterval(sec)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    slideInterval === sec ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* 3. Banner Height Selector */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
            <span className="text-xs font-medium text-slate-300 block">ความสูงแบนเนอร์ (Banner Height)</span>
            <select
              value={bannerHeight}
              onChange={(e) => setBannerHeight(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs glass-input text-slate-100 bg-slate-900 border-white/10"
            >
              <option value="compact">กะทัดรัด (Compact - ~180px)</option>
              <option value="standard">มาตรฐาน (Standard - ~240px)</option>
              <option value="tall">สูงพิเศษ (Tall - ~320px)</option>
              <option value="cinematic">โรงภาพยนตร์ (Cinematic - ~400px)</option>
            </select>
          </div>

          {/* 4. Animation Transition Effect */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
            <span className="text-xs font-medium text-slate-300 block">แอนิเมชันตอนเลื่อน (Smooth Animation)</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setTransitionEffect('slide')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  transitionEffect === 'slide'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                สไลด์ลื่นไหล (Slide)
              </button>
              <button
                type="button"
                onClick={() => setTransitionEffect('fade')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  transitionEffect === 'fade'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                เลือนจางนุ่ม (Fade)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Slides List (Left) + Interactive Visual Drag Repositioner (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 Cols): Slide Manager & List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>รายการแบนเนอร์ทั้งหมด ({slides.length} สไลด์)</span>
            </h4>
            <button
              type="button"
              onClick={handleAddSlide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มสไลด์ใหม่</span>
            </button>
          </div>

          {/* Slides Scrollable List */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {slides.map((slide, idx) => {
              const isSelected = slide.id === activeSlide?.id;
              return (
                <div
                  key={slide.id}
                  onClick={() => setActiveSlideId(slide.id)}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-400 shadow-lg shadow-cyan-500/10'
                      : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Thumbnail preview */}
                    <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title || 'Slide'}
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${slide.positionX ?? 50}% ${slide.positionY ?? 50}%`,
                        }}
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] text-cyan-300 font-bold">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {slide.title || 'Untitled Banner'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {slide.subtitle || 'ไม่มีคำโปรย'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                        <span>X: {slide.positionX ?? 50}%</span>
                        <span>Y: {slide.positionY ?? 50}%</span>
                        <span>Zoom: {Math.round((slide.scale ?? 1) * 100)}%</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSlide(idx, 'up');
                          }}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20"
                          title="เลื่อนขึ้น"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSlide(idx, 'down');
                          }}
                          disabled={idx === slides.length - 1}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20"
                          title="เลื่อนลง"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateSlide(slide);
                          }}
                          className="p-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300"
                          title="คัดลอกสไลด์"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {slides.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSlide(slide.id);
                            }}
                            className="p-1 rounded bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                            title="ลบสไลด์นี้"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 Cols): Interactive Drag-to-Position Canvas & Details */}
        {activeSlide && (
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Move className="w-4 h-4 text-cyan-400" />
                <span>พื้นที่จัดวางภาพด้วยเมาส์ลากอิสระ (Interactive Drag Canvas)</span>
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  X: {activeSlide.positionX ?? 50}% | Y: {activeSlide.positionY ?? 50}% | Zoom: {Math.round((activeSlide.scale ?? 1) * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => updateActiveSlide({ positionX: 50, positionY: 50, scale: 1.0 })}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>กึ่งกลาง</span>
                </button>
              </div>
            </div>

            {/* Device Framing Simulator Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-black/60 border border-white/10 text-xs">
              <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>จำลองมุมมองอุปกรณ์:</span>
              </span>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('pc')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    previewDevice === 'pc'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  💻 PC จอกว้าง (16:9)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('ipad')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    previewDevice === 'ipad'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📱 iPad / แท็บเล็ต (4:3)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    previewDevice === 'mobile'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📱 มือถือ
                </button>
              </div>
            </div>

            {/* INTERACTIVE DRAG STAGE */}
            <div className="space-y-2 bg-slate-950/40 p-3 rounded-2xl border border-white/5 flex flex-col items-center">
              <div
                ref={canvasRef}
                onMouseDown={onMouseDownCanvas}
                onMouseMove={onMouseMoveCanvas}
                onMouseUp={onMouseUpCanvas}
                onTouchStart={onTouchStartCanvas}
                onTouchMove={onTouchMoveCanvas}
                onTouchEnd={onTouchEndCanvas}
                onClick={onClickCanvas}
                className={`relative rounded-2xl overflow-hidden border-2 border-cyan-500/50 cursor-grab active:cursor-grabbing shadow-2xl bg-black select-none group transition-all duration-300 ${
                  previewDevice === 'ipad'
                    ? 'w-full max-w-[540px] h-72 sm:h-80'
                    : previewDevice === 'mobile'
                    ? 'w-full max-w-[320px] h-72'
                    : 'w-full h-64 sm:h-72'
                }`}
              >
                {/* Background Image Layer */}
                {activeSlide.fitMode === 'contain' ? (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center filter blur-xl scale-110 opacity-40"
                      style={{ backgroundImage: `url(${activeSlide.imageUrl})` }}
                    />
                    <img
                      src={activeSlide.imageUrl}
                      alt={activeSlide.title || 'Slide'}
                      className="w-full h-full object-contain relative z-10 transition-transform duration-75 pointer-events-none"
                      style={{
                        transform: `scale(${activeSlide.scale ?? 1})`,
                        objectPosition: `${activeSlide.positionX ?? 50}% ${activeSlide.positionY ?? 50}%`,
                      }}
                      draggable={false}
                    />
                  </>
                ) : (
                  <img
                    src={activeSlide.imageUrl}
                    alt={activeSlide.title || 'Slide'}
                    className="w-full h-full object-cover relative z-0 transition-transform duration-75 pointer-events-none"
                    style={{
                      transform: (activeSlide.scale ?? 1) !== 1 ? `scale(${activeSlide.scale ?? 1})` : undefined,
                      objectPosition: `${activeSlide.positionX ?? 50}% ${activeSlide.positionY ?? 50}%`,
                    }}
                    draggable={false}
                  />
                )}

                {/* Dark Legibility Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                  style={{
                    backgroundColor: '#090a0f',
                    opacity: activeSlide.overlayOpacity ?? 0.70,
                  }}
                />

                {/* Crosshair guide on hover/drag */}
                <div className="absolute inset-0 pointer-events-none border border-cyan-400/20 grid grid-cols-3 grid-rows-3 opacity-40 group-hover:opacity-80 transition-opacity">
                  <div className="border-r border-b border-cyan-400/20" />
                  <div className="border-r border-b border-cyan-400/20" />
                  <div className="border-b border-cyan-400/20" />
                  <div className="border-r border-b border-cyan-400/20" />
                  <div className="border-r border-b border-cyan-400/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full border border-cyan-400 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-cyan-400" />
                    </div>
                  </div>
                  <div className="border-b border-cyan-400/20" />
                  <div className="border-r border-cyan-400/20" />
                  <div className="border-r border-cyan-400/20" />
                  <div />
                </div>

                {/* Foreground Live Preview Texts */}
                <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none z-20">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] self-start uppercase">
                    <Sparkles className="w-3 h-3" />
                    <span>{activeSlide.badge || 'BADGE'}</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-bold font-display text-white drop-shadow-md">
                      {activeSlide.title || 'OBSIDIAN VAULT'}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-2 drop-shadow-sm">
                      {activeSlide.subtitle || 'คำโปรยแบนเนอร์...'}
                    </p>
                  </div>
                </div>

                {/* Helper overlay tag */}
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 border border-cyan-400/40 text-[10px] text-cyan-300 font-mono pointer-events-none z-30">
                  🖱️ คลิกแล้วลากเมาส์เพื่อเลื่อนตำแหน่ง
                </div>
              </div>

              {/* Zoom & Fit Control Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/10">
                {/* Fit Mode Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">โหมดการแสดงภาพ:</span>
                  <div className="flex rounded-lg bg-black/60 p-0.5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => updateActiveSlide({ fitMode: 'cover' })}
                      className={`px-2.5 py-1 rounded text-xs transition-all ${
                        activeSlide.fitMode !== 'contain'
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Cover (เต็มกรอบ)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveSlide({ fitMode: 'contain' })}
                      className={`px-2.5 py-1 rounded text-xs transition-all ${
                        activeSlide.fitMode === 'contain'
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Contain (เห็นทั้งภาพ)
                    </button>
                  </div>
                </div>

                {/* Zoom / Scale Controls */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">ขนาดซูม:</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveSlide({
                        scale: Math.max(0.4, Number(((activeSlide.scale ?? 1) - 0.1).toFixed(2))),
                      })
                    }
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300"
                    title="ย่อขนาดภาพ"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="0.4"
                    max="2.2"
                    step="0.05"
                    value={activeSlide.scale ?? 1.0}
                    onChange={(e) => updateActiveSlide({ scale: parseFloat(e.target.value) })}
                    className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveSlide({
                        scale: Math.min(2.5, Number(((activeSlide.scale ?? 1) + 0.1).toFixed(2))),
                      })
                    }
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300"
                    title="ขยายขนาดภาพ"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-cyan-400 w-10 text-right">
                    {Math.round((activeSlide.scale ?? 1) * 100)}%
                  </span>
                </div>

                {/* Overlay Darkness Opacity */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">ความมืด:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="0.95"
                    step="0.05"
                    value={activeSlide.overlayOpacity ?? 0.70}
                    onChange={(e) => updateActiveSlide({ overlayOpacity: parseFloat(e.target.value) })}
                    className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="font-mono text-slate-300">
                    {Math.round((activeSlide.overlayOpacity ?? 0.70) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Slide Metadata & Image URL Inputs */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              {/* Image Source (Upload / URL) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>ลิงก์รูปภาพของสไลด์นี้ (Image URL or Upload)</span>
                  {uploadingId === activeSlide.id && (
                    <span className="text-[11px] text-cyan-400 animate-pulse">กำลังอัปโหลด...</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={activeSlide.imageUrl}
                    onChange={(e) => updateActiveSlide({ imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
                  />
                  <label className="px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>อัปโหลด</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadSlideImage(file, activeSlide.id);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Title, Badge, Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400">หัวข้อหลักสไลด์ (Title)</label>
                  <input
                    type="text"
                    value={activeSlide.title || ''}
                    onChange={(e) => updateActiveSlide({ title: e.target.value })}
                    placeholder="OBSIDIAN VAULT"
                    className="w-full px-3 py-1.5 rounded-xl text-xs glass-input text-slate-100 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">ป้ายกำกับ (Badge)</label>
                  <input
                    type="text"
                    value={activeSlide.badge || ''}
                    onChange={(e) => updateActiveSlide({ badge: e.target.value })}
                    placeholder="คลังไซเบอร์ความเร็วสูง"
                    className="w-full px-3 py-1.5 rounded-xl text-xs glass-input text-slate-100 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400">คำโปรยแบนเนอร์ (Subtitle)</label>
                <input
                  type="text"
                  value={activeSlide.subtitle || ''}
                  onChange={(e) => updateActiveSlide({ subtitle: e.target.value })}
                  placeholder="ศูนย์รวมคลังข้อมูล มัลติมีเดีย และเว็บแอปพลิเคชัน..."
                  className="w-full px-3 py-1.5 rounded-xl text-xs glass-input text-slate-100 mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">ลิงก์ปลายทางเมื่อคลิกที่แบนเนอร์ (Optional Link URL)</label>
                <input
                  type="url"
                  value={activeSlide.linkUrl || ''}
                  onChange={(e) => updateActiveSlide({ linkUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 rounded-xl text-xs glass-input text-slate-100 mt-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
