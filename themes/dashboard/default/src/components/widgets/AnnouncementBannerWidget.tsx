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
  text_align?: 'left' | 'center' | 'right';

  // Title
  title: string;
  title_use_gradient: boolean;
  title_color: string;
  title_gradient_from?: string;
  title_gradient_via?: string;
  title_gradient_to?: string;
  title_gradient_dir?: string;
  title_gradient_stops?: number;
  title_font_family?: string;
  title_font_size?: string;
  title_font_weight?: string;

  // Subtitle
  subtitle: string;
  subtitle_use_gradient: boolean;
  subtitle_color: string;
  subtitle_gradient_from?: string;
  subtitle_gradient_via?: string;
  subtitle_gradient_to?: string;
  subtitle_gradient_dir?: string;
  subtitle_gradient_stops?: number;
  subtitle_font_family?: string;
  subtitle_font_size?: string;
  subtitle_font_weight?: string;

  // Description
  description: string;
  description_use_gradient: boolean;
  description_color: string;
  description_gradient_from?: string;
  description_gradient_via?: string;
  description_gradient_to?: string;
  description_gradient_dir?: string;
  description_gradient_stops?: number;
  description_font_family?: string;
  description_font_size?: string;
  description_font_weight?: string;

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

const buildTextStyle = (
  useGradient: boolean,
  solidColor: string,
  gradientDir?: string,
  gradientFrom?: string,
  gradientVia?: string,
  gradientTo?: string,
  gradientStops?: number,
  fontFamily?: string,
  fontWeight?: string
): React.CSSProperties => {
  const style: React.CSSProperties = {};

  if (fontFamily === 'serif') {
    style.fontFamily = 'Georgia, Cambria, "Times New Roman", serif';
  } else if (fontFamily === 'mono') {
    style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  } else if (fontFamily === 'display') {
    style.fontFamily = 'system-ui, -apple-system, sans-serif';
  } else if (fontFamily === 'sans') {
    style.fontFamily = 'var(--font-sans)';
  }

  if (fontWeight) {
    const weightMap: Record<string, string | number> = {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    };
    if (weightMap[fontWeight]) {
      style.fontWeight = weightMap[fontWeight];
    }
  }

  if (useGradient) {
    const dir = gradientDir || 'to right';
    const from = gradientFrom || '#7c3aed';
    const to = gradientTo || '#4f46e5';
    const stops = Number(gradientStops) || 2;
    let grad: string;

    if (stops === 3 && gradientVia) {
      grad = `linear-gradient(${dir}, ${from}, ${gradientVia}, ${to})`;
    } else {
      grad = `linear-gradient(${dir}, ${from}, ${to})`;
    }

    style.backgroundImage = grad;
    style.WebkitBackgroundClip = 'text';
    style.backgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.color = 'transparent';
    style.display = 'inline-block';
  } else {
    style.color = solidColor || '#0f172a';
  }

  return style;
};

const getTitleFontSize = (size?: string): string => {
  switch (size) {
    case 'xl':
      return 'text-xl md:text-2xl';
    case '2xl':
      return 'text-2xl md:text-3xl';
    case '4xl':
      return 'text-4xl md:text-5xl';
    case '5xl':
      return 'text-5xl md:text-6xl';
    case '3xl':
    default:
      return 'text-2xl md:text-3xl lg:text-4xl';
  }
};

const getSubtitleFontSize = (size?: string): string => {
  switch (size) {
    case 'sm':
      return 'text-xs sm:text-sm';
    case 'base':
      return 'text-sm sm:text-base';
    case 'xs':
    default:
      return 'text-[11px] sm:text-xs';
  }
};

const getDescFontSize = (size?: string): string => {
  switch (size) {
    case 'xs':
      return 'text-xs';
    case 'base':
      return 'text-base md:text-lg';
    case 'lg':
      return 'text-lg md:text-xl';
    case 'sm':
    default:
      return 'text-sm md:text-base';
  }
};

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

  const textAlign = activeSlide.text_align || 'left';
  const alignContainerClass =
    textAlign === 'center'
      ? 'items-center text-center'
      : textAlign === 'right'
      ? 'items-end text-right'
      : 'items-start text-left';

  const alignButtonsClass =
    textAlign === 'center'
      ? 'justify-center'
      : textAlign === 'right'
      ? 'justify-end'
      : 'justify-start';

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

      {/* Slide Content: Full Width */}
      <div className={`relative z-10 space-y-3 w-full max-w-none flex flex-col ${alignContainerClass} animate-in fade-in duration-300`}>
        {/* Subtitle Badge */}
        {activeSlide.subtitle && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs ${getSubtitleFontSize(activeSlide.subtitle_font_size)}`}>
            <span
              style={buildTextStyle(
                activeSlide.subtitle_use_gradient,
                activeSlide.subtitle_color,
                activeSlide.subtitle_gradient_dir,
                activeSlide.subtitle_gradient_from,
                activeSlide.subtitle_gradient_via,
                activeSlide.subtitle_gradient_to,
                activeSlide.subtitle_gradient_stops,
                activeSlide.subtitle_font_family,
                activeSlide.subtitle_font_weight
              )}
            >
              {activeSlide.subtitle}
            </span>
          </div>
        )}

        {/* Title: Full Width */}
        <h2 className={`w-full font-extrabold tracking-tight ${getTitleFontSize(activeSlide.title_font_size)}`}>
          <span
            style={buildTextStyle(
              activeSlide.title_use_gradient,
              activeSlide.title_color,
              activeSlide.title_gradient_dir,
              activeSlide.title_gradient_from,
              activeSlide.title_gradient_via,
              activeSlide.title_gradient_to,
              activeSlide.title_gradient_stops,
              activeSlide.title_font_family,
              activeSlide.title_font_weight
            )}
          >
            {activeSlide.title}
          </span>
        </h2>

        {/* Description: Full Width */}
        <p className={`w-full max-w-none leading-relaxed ${getDescFontSize(activeSlide.description_font_size)}`}>
          <span
            style={buildTextStyle(
              activeSlide.description_use_gradient,
              activeSlide.description_color,
              activeSlide.description_gradient_dir,
              activeSlide.description_gradient_from,
              activeSlide.description_gradient_via,
              activeSlide.description_gradient_to,
              activeSlide.description_gradient_stops,
              activeSlide.description_font_family,
              activeSlide.description_font_weight
            )}
          >
            {activeSlide.description}
          </span>
        </p>

        {/* Action Buttons */}
        {activeSlide.buttons && activeSlide.buttons.length > 0 && (
          <div className={`flex flex-wrap items-center gap-2.5 pt-2 w-full ${alignButtonsClass}`}>
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
