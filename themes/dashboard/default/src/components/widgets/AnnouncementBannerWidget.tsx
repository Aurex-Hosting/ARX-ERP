import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export interface BannerButton {
  id: string;
  text: string;
  url: string;
  bg_color: string;
  text_color: string;
  style: 'solid' | 'gradient' | 'outline' | 'glass' | 'pill' | 'glow';
}

export interface BannerSlide {
  id: string;
  bg_image_url: string | null;
  overlay_opacity: number;
  bg_blur: number;
  title: string;
  title_use_gradient: boolean;
  title_color: string;
  title_gradient_from?: string;
  title_gradient_to?: string;
  title_gradient_dir?: string;
  subtitle: string;
  subtitle_use_gradient: boolean;
  subtitle_color: string;
  subtitle_gradient_from?: string;
  subtitle_gradient_to?: string;
  subtitle_gradient_dir?: string;
  description: string;
  description_use_gradient: boolean;
  description_color: string;
  description_gradient_from?: string;
  description_gradient_to?: string;
  description_gradient_dir?: string;
  buttons: BannerButton[];
}

export interface AnnouncementBannerWidgetProps {
  slideshowEnabled?: boolean;
  autoplay?: boolean;
  autoplayInterval?: number; // seconds
  slides: BannerSlide[];
  onButtonClick?: (url: string) => void;
  height?: '1/2-raw' | '2/2-raw' | '1/2' | '2/2';
}

export const AnnouncementBannerWidget: React.FC<AnnouncementBannerWidgetProps> = ({
  slideshowEnabled = true,
  autoplay = false,
  autoplayInterval = 5,
  slides,
  onButtonClick,
  height = '2/2-raw',
}) => {
  const isHalfRow = height === '1/2-raw' || height === '1/2';
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const timerRef = useRef<any>(null);

  const totalSlides = slides.length;
  const activeSlide = slides[currentSlideIndex] || slides[0];

  // Auto-rotation when autoplay is true and more than 1 slide
  useEffect(() => {
    if (autoplay && slideshowEnabled && totalSlides > 1) {
      timerRef.current = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
      }, Math.max(2, autoplayInterval) * 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [autoplay, slideshowEnabled, totalSlides, autoplayInterval]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
  };

  if (!activeSlide) return null;

  const bgStyle = activeSlide.bg_image_url
    ? { backgroundImage: `url(${activeSlide.bg_image_url})` }
    : {
        backgroundImage:
          'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95), rgba(237, 233, 254, 0.5))',
      };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl ${
        isHalfRow ? 'min-h-[190px] p-5 md:p-6' : 'min-h-[394px] h-full p-8 md:p-10'
      } flex flex-col justify-between shadow-sm bg-cover bg-center transition-all duration-500 group`}
      style={bgStyle}
    >
      {/* Background Overlay & Blur Filter Layer */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300 pointer-events-none"
        style={{
          opacity: activeSlide.overlay_opacity,
          backdropFilter: activeSlide.bg_blur ? `blur(${activeSlide.bg_blur}px)` : undefined,
          WebkitBackdropFilter: activeSlide.bg_blur ? `blur(${activeSlide.bg_blur}px)` : undefined,
        }}
      />

      {/* Slide Content */}
      <div className="relative z-10 space-y-3 max-w-2xl animate-in fade-in duration-300">
        {/* Subtitle Badge */}
        {activeSlide.subtitle && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs">
            <span
              style={{
                color: activeSlide.subtitle_use_gradient ? undefined : activeSlide.subtitle_color,
                backgroundImage: activeSlide.subtitle_use_gradient
                  ? `linear-gradient(${activeSlide.subtitle_gradient_dir || 'to right'}, ${
                      activeSlide.subtitle_gradient_from || '#7c3aed'
                    }, ${activeSlide.subtitle_gradient_to || '#ec4899'})`
                  : undefined,
              }}
              className={activeSlide.subtitle_use_gradient ? 'bg-clip-text text-transparent font-bold' : ''}
            >
              {activeSlide.subtitle}
            </span>
          </div>
        )}

        {/* Title */}
        <h2
          className="text-2xl md:text-3xl font-extrabold tracking-tight"
          style={{
            color: activeSlide.title_use_gradient ? undefined : activeSlide.title_color,
            backgroundImage: activeSlide.title_use_gradient
              ? `linear-gradient(${activeSlide.title_gradient_dir || 'to right'}, ${
                  activeSlide.title_gradient_from || '#7c3aed'
                }, ${activeSlide.title_gradient_to || '#4f46e5'})`
              : undefined,
          }}
        >
          <span className={activeSlide.title_use_gradient ? 'bg-clip-text text-transparent' : ''}>
            {activeSlide.title}
          </span>
        </h2>

        {/* Description */}
        <p
          className="text-sm md:text-base leading-relaxed max-w-xl"
          style={{
            color: activeSlide.description_use_gradient ? undefined : activeSlide.description_color,
            backgroundImage: activeSlide.description_use_gradient
              ? `linear-gradient(${activeSlide.description_gradient_dir || 'to right'}, ${
                  activeSlide.description_gradient_from || '#334155'
                }, ${activeSlide.description_gradient_to || '#64748b'})`
              : undefined,
          }}
        >
          <span className={activeSlide.description_use_gradient ? 'bg-clip-text text-transparent font-medium' : ''}>
            {activeSlide.description}
          </span>
        </p>

        {/* Action Buttons */}
        {activeSlide.buttons && activeSlide.buttons.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {activeSlide.buttons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => {
                  if (onButtonClick) {
                    onButtonClick(btn.url);
                  } else {
                    window.location.href = btn.url;
                  }
                }}
                className={`px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-95 ${
                  btn.style === 'pill'
                    ? 'rounded-full'
                    : btn.style === 'glass'
                    ? 'rounded-xl backdrop-blur-md border border-white/40 shadow-sm'
                    : btn.style === 'outline'
                    ? 'rounded-xl border'
                    : btn.style === 'glow'
                    ? 'rounded-xl shadow-lg shadow-violet-500/40'
                    : 'rounded-xl shadow-sm'
                }`}
                style={{
                  backgroundColor: btn.style === 'outline' ? 'transparent' : btn.bg_color,
                  borderColor: btn.style === 'outline' ? btn.bg_color : undefined,
                  color: btn.text_color,
                }}
              >
                <span>{btn.text}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Slideshow Controls (If multiple slides and slideshow enabled) */}
      {slideshowEnabled && totalSlides > 1 && (
        <div className="relative z-10 flex items-center justify-between pt-4 mt-2">
          {/* Indicator Dots */}
          <div className="flex items-center gap-1.5 bg-black/20 dark:bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                className={`transition-all rounded-full cursor-pointer ${
                  currentSlideIndex === idx ? 'w-5 h-2 bg-white shadow-xs' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md cursor-pointer transition-all active:scale-90"
              title="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md cursor-pointer transition-all active:scale-90"
              title="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
