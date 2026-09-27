import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  RotateCcw as ResetIcon,
  Check,
  X,
  Move,
  Crop,
} from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  cropType: 'avatar' | 'banner';
  title?: string;
  onClose: () => void;
  onSave: (croppedBase64: string) => Promise<void> | void;
  isSaving?: boolean;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  cropType,
  title,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Transform states
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // in degrees
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging state
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Viewport dimensions
  const isAvatar = cropType === 'avatar';
  const canvasWidth = isAvatar ? 420 : 540;
  const canvasHeight = isAvatar ? 420 : 260;

  // Crop area dimensions (target inside viewport)
  const cropBoxWidth = isAvatar ? 300 : 480;
  const cropBoxHeight = isAvatar ? 300 : 180;

  // Reset transforms
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setOffset({ x: 0, y: 0 });
  };

  // Load image when imageSrc changes or modal opens
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      handleReset();
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc]);

  // Render canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Save before image transforms
    ctx.save();

    // Move to canvas center + pan offset
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);

    // Rotate
    ctx.rotate((rotation * Math.PI) / 180);

    // Flips
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Calculate base scale to fit inside crop box nicely
    const scaleToFit = Math.max(cropBoxWidth / image.naturalWidth, cropBoxHeight / image.naturalHeight);
    const renderScale = scaleToFit * zoom;

    const drawW = image.naturalWidth * renderScale;
    const drawH = image.naturalHeight * renderScale;

    // Draw transformed image
    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

    // Draw Crop Mask Overlay
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)'; // Dark slate overlay

    const cropX = (width - cropBoxWidth) / 2;
    const cropY = (height - cropBoxHeight) / 2;

    if (isAvatar) {
      // Circular crop hole
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = cropBoxWidth / 2;

      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      // Circular guide border
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#8b5cf6'; // Violet 500
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();

      // Center crosshair / guide circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    } else {
      // Rounded rectangular crop hole for banner
      const radius = 12;
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      // Cut out rounded rectangle
      ctx.moveTo(cropX + radius, cropY);
      ctx.lineTo(cropX + cropBoxWidth - radius, cropY);
      ctx.quadraticCurveTo(cropX + cropBoxWidth, cropY, cropX + cropBoxWidth, cropY + radius);
      ctx.lineTo(cropX + cropBoxWidth, cropY + cropBoxHeight - radius);
      ctx.quadraticCurveTo(cropX + cropBoxWidth, cropY + cropBoxHeight, cropX + cropBoxWidth - radius, cropY + cropBoxHeight);
      ctx.lineTo(cropX + radius, cropY + cropBoxHeight);
      ctx.quadraticCurveTo(cropX, cropY + cropBoxHeight, cropX, cropY + cropBoxHeight - radius);
      ctx.lineTo(cropX, cropY + radius);
      ctx.quadraticCurveTo(cropX, cropY, cropX + radius, cropY);
      ctx.closePath();
      ctx.fill();

      // Rectangular guide border
      ctx.beginPath();
      ctx.roundRect(cropX, cropY, cropBoxWidth, cropBoxHeight, radius);
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();

      // Rule of thirds grid lines
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      // Verticals
      ctx.beginPath();
      ctx.moveTo(cropX + cropBoxWidth / 3, cropY);
      ctx.lineTo(cropX + cropBoxWidth / 3, cropY + cropBoxHeight);
      ctx.moveTo(cropX + (cropBoxWidth * 2) / 3, cropY);
      ctx.lineTo(cropX + (cropBoxWidth * 2) / 3, cropY + cropBoxHeight);
      // Horizontals
      ctx.moveTo(cropX, cropY + cropBoxHeight / 3);
      ctx.lineTo(cropX + cropBoxWidth, cropY + cropBoxHeight / 3);
      ctx.moveTo(cropX, cropY + (cropBoxHeight * 2) / 3);
      ctx.lineTo(cropX + cropBoxWidth, cropY + (cropBoxHeight * 2) / 3);
      ctx.stroke();
    }

    ctx.restore();
  }, [image, zoom, rotation, flipH, flipV, offset, isAvatar, cropBoxWidth, cropBoxHeight]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse / Touch Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      offsetStartRef.current = { ...offset };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 4));
  };

  // Rotate 90 deg clockwise
  const handleRotateCw = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Rotate 90 deg counter-clockwise
  const handleRotateCcw = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  // Export cropped high-resolution image
  const handleExport = async () => {
    if (!image) return;

    // Output dimensions (high resolution export)
    const exportWidth = isAvatar ? 600 : 1200;
    const exportHeight = isAvatar ? 600 : 400;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Compute scale ratio between preview crop box and export resolution
    const exportScaleMultiplier = exportWidth / cropBoxWidth;

    ctx.save();

    // Position origin at center of export canvas
    ctx.translate(
      exportWidth / 2 + offset.x * exportScaleMultiplier,
      exportHeight / 2 + offset.y * exportScaleMultiplier
    );

    // Apply rotation and flips
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Calculate image dimensions
    const baseScale = Math.max(cropBoxWidth / image.naturalWidth, cropBoxHeight / image.naturalHeight);
    const totalScale = baseScale * zoom * exportScaleMultiplier;

    const drawW = image.naturalWidth * totalScale;
    const drawH = image.naturalHeight * totalScale;

    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const croppedBase64 = exportCanvas.toDataURL('image/png', 0.95);
    await onSave(croppedBase64);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {title || (isAvatar ? 'Edit Profile Picture' : 'Edit Cover Banner')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Drag to reposition • Scroll or use controls to zoom, rotate & flip
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport & Interactive Canvas */}
        <div className="p-4 sm:p-6 bg-slate-950 flex flex-col items-center justify-center select-none overflow-hidden relative">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800/60 bg-slate-900">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className="cursor-grab active:cursor-grabbing block touch-none max-w-full h-auto"
              style={{ maxHeight: isAvatar ? '340px' : '240px' }}
            />

            {/* Hint Overlay */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-slate-300 pointer-events-none flex items-center gap-1.5 border border-white/10">
              <Move className="w-3 h-3 text-violet-400" />
              <span>Drag to position inside crop guide</span>
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
          {/* Zoom Slider & Quick Adjustments */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(prev - 0.2, 0.5))}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-violet-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
              />
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 min-w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(prev + 0.2, 3.5))}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Transform Action Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Rotate Left */}
              <button
                type="button"
                onClick={handleRotateCcw}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Rotate 90° Left"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rotate Left</span>
              </button>

              {/* Rotate Right */}
              <button
                type="button"
                onClick={handleRotateCw}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Rotate 90° Right"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rotate Right</span>
              </button>

              {/* Flip Horizontal */}
              <button
                type="button"
                onClick={() => setFlipH((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  flipH
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Flip Horizontal"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip H</span>
              </button>

              {/* Flip Vertical */}
              <button
                type="button"
                onClick={() => setFlipV((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  flipV
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Flip Vertical"
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip V</span>
              </button>
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
              title="Reset all edits"
            >
              <ResetIcon className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving changes...' : 'Save changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
