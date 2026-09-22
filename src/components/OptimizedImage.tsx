import React, { useState, useEffect, useRef } from 'react';
import { getOptimizedImageUrl, generateResponsiveSrcSet } from '../utils/imageOptimizer';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  aspectRatio?: string;
  fallbackSrc?: string;
  containerClassName?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  enableBlurUp?: boolean;
  sizes?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  priority = false,
  aspectRatio,
  fallbackSrc,
  containerClassName = '',
  className = '',
  objectFit = 'cover',
  enableBlurUp = true,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  onError,
  onLoad,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync state when incoming src changes
  useEffect(() => {
    setCurrentSrc(src);
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  // Clean up any memory on unmount
  useEffect(() => {
    return () => {
      if (imgRef.current) {
        imgRef.current.onload = null;
        imgRef.current.onerror = null;
      }
    };
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // If transformed URL failed, try original raw src
    if (currentSrc !== src) {
      setCurrentSrc(src);
      return;
    }
    // If original failed and fallback provided, try fallback
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    setHasError(true);
    setIsLoaded(true); // Stop skeleton pulsing
    onError?.(e);
  };

  // Generate responsive srcset only when supported
  const srcSet = generateResponsiveSrcSet(currentSrc, [400, 800, 1200]);
  const defaultOptimizedUrl = getOptimizedImageUrl(currentSrc, { width: priority ? 1200 : 800 });

  return (
    <div
      className={`relative overflow-hidden ${containerClassName}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* 1. Low-Quality Image Placeholder (LQIP) / Shimmer Skeleton to eliminate CLS */}
      {enableBlurUp && !isLoaded && !hasError && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-[#0d1017] bg-gradient-to-r from-slate-900/80 via-slate-800/40 to-slate-900/80 animate-pulse pointer-events-none"
        >
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <svg
              className="w-8 h-8 text-cyan-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        </div>
      )}

      {/* 2. Error Fallback Card if image fails completely */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 text-slate-500 p-2 text-center select-none">
          <svg
            className="w-8 h-8 text-cyan-500/40 mb-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{alt || 'Image Preview'}</span>
        </div>
      )}

      {/* 3. Main High-Performance Image Element */}
      <picture>
        {srcSet ? (
          <>
            <source
              type="image/avif"
              srcSet={srcSet}
              sizes={sizes}
            />
            <source
              type="image/webp"
              srcSet={srcSet}
              sizes={sizes}
            />
          </>
        ) : null}
        <img
          ref={imgRef}
          src={defaultOptimizedUrl || currentSrc}
          srcSet={srcSet || undefined}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full transition-opacity duration-300 ease-out transform-gpu will-change-transform ${
            isLoaded && !hasError ? 'opacity-100' : 'opacity-0'
          } ${
            objectFit === 'contain'
              ? 'object-contain'
              : objectFit === 'fill'
              ? 'object-fill'
              : 'object-cover'
          } ${className}`}
          {...props}
        />
      </picture>
    </div>
  );
};
