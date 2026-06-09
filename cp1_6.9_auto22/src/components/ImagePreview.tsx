import { useEffect, useRef, useState, useCallback } from 'react';
import { FilterConfig, applyFilter } from '../utils/filterEngine';

interface ImagePreviewProps {
  image: HTMLImageElement | null;
  filterConfig: FilterConfig | null;
  isComparing: boolean;
  resetTrigger: number;
}

export default function ImagePreview({
  image,
  filterConfig,
  isComparing,
  resetTrigger,
}: ImagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [compareOpacity, setCompareOpacity] = useState(1);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    ctx.drawImage(image, 0, 0);

    if (filterConfig && !isComparing) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const filtered = applyFilter(imageData, filterConfig);
      ctx.putImageData(filtered, 0, 0);
    }
  }, [image, filterConfig, isComparing]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    setCompareOpacity(isComparing ? 0 : 1);
  }, [isComparing]);

  useEffect(() => {
    if (resetTrigger > 0) {
      setFadeOpacity(0);
      const timer = setTimeout(() => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
        setFadeOpacity(1);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [resetTrigger]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.max(0.5, Math.min(3, prev * delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!image) return;
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    },
    [image, offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setOffset({
        x: dragStart.current.offsetX + (e.clientX - dragStart.current.x),
        y: dragStart.current.offsetY + (e.clientY - dragStart.current.y),
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      className="image-preview"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {!image ? (
        <div className="empty-state">
          <p>点击或拖拽图片到此处</p>
          <p className="hint">支持 JPEG / PNG，最大 5MB</p>
        </div>
      ) : (
        <div
          className="canvas-wrapper"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            opacity: fadeOpacity,
            transition: 'opacity 0.3s ease',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              opacity: compareOpacity,
              transition: 'opacity 0.2s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
