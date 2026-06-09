import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Stroke, StrokePoint, Sticker } from '../types';

interface PaperCanvasProps {
  strokes: Stroke[];
  stickers: Sticker[];
  readonly: boolean;
  onStrokesChange: (strokes: Stroke[]) => void;
  onStickersChange: (stickers: Sticker[]) => void;
  width: number;
  height: number;
}

export interface PaperCanvasHandle {
  undo: () => void;
  clear: () => void;
}

const PaperCanvas = forwardRef<PaperCanvasHandle, PaperCanvasProps>((
  { strokes, stickers, readonly, onStrokesChange, onStickersChange, width, height },
  ref
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<{
    isDrawing: boolean;
    currentStroke: Stroke | null;
    dirtyRect: { x: number; y: number; w: number; h: number } | null;
    pendingPoints: { points: StrokePoint[]; timestamp: number }[];
  }>({
    isDrawing: false,
    currentStroke: null,
    dirtyRect: null,
    pendingPoints: []
  });

  const rafRef = useRef<number>();
  const [draggingSticker, setDraggingSticker] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [animatingStickers, setAnimatingStickers] = useState<Set<string>>(new Set());

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (strokes.length > 0) {
        onStrokesChange(strokes.slice(0, -1));
        requestFullRedraw();
      }
    },
    clear: () => {
      onStrokesChange([]);
      requestFullRedraw();
    }
  }));

  const requestFullRedraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current.dirtyRect = { x: 0, y: 0, w: width, h: height };
  }, [width, height]);

  const drawPaperBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#faf3e0';
    ctx.fillRect(0, 0, width, height);

    const lineGap = 24;
    ctx.strokeStyle = '#d9cbb8';
    ctx.lineWidth = 1;
    for (let y = lineGap; y < height; y += lineGap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(230, 126, 34, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, height);
    ctx.stroke();
  }, [width, height]);

  const interpolateColor = (t: number): string => {
    const r = Math.round(0x3a + (0x5a - 0x3a) * t);
    const g = Math.round(0x3a + (0x4a - 0x3a) * t);
    const b = Math.round(0x3a + (0x3a - 0x3a) * t);
    return `rgb(${r},${g},${b})`;
  };

  const drawStrokeSegment = useCallback((ctx: CanvasRenderingContext2D, points: StrokePoint[], withBlur: boolean) => {
    if (points.length < 2) return;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;

      const pressure = (prev.pressure + curr.pressure) / 2;
      const lineWidth = 2 + pressure * 3;
      const colorT = 0.3 + pressure * 0.5;

      if (withBlur) {
        ctx.save();
        ctx.strokeStyle = interpolateColor(colorT);
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = lineWidth + 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        ctx.stroke();
        ctx.restore();
      }

      ctx.strokeStyle = interpolateColor(colorT);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      ctx.stroke();

      if (i === points.length - 1) {
        ctx.beginPath();
        ctx.quadraticCurveTo(midX, midY, curr.x, curr.y);
        ctx.stroke();
      }
    }
  }, []);

  const drawSticker = useCallback((ctx: CanvasRenderingContext2D, sticker: Sticker, animating: boolean) => {
    ctx.save();
    ctx.translate(sticker.x, sticker.y);
    ctx.rotate((sticker.rotation * Math.PI) / 180;
    const scale = animating ? sticker.scale * 1.1 : sticker.scale;
    ctx.scale(scale, scale);
    ctx.font = '40px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.type, 0, 0);
    ctx.restore();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dirty = drawingRef.current.dirtyRect;
    if (!dirty) return;

    ctx.clearRect(dirty.x, dirty.y, dirty.w, dirty.h);

    if (dirty.x === 0 && dirty.y === 0 && dirty.w >= width && dirty.h >= height) {
      drawPaperBackground(ctx);
      strokes.forEach(s => drawStrokeSegment(ctx, s.points, true));
      stickers.forEach(s => drawSticker(ctx, s, animatingStickers.has(s.id)));
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(dirty.x, dirty.y, dirty.w, dirty.h);
      ctx.clip();
      drawPaperBackground(ctx);
      strokes.forEach(s => drawStrokeSegment(ctx, s.points, true));
      stickers.forEach(s => drawSticker(ctx, s, animatingStickers.has(s.id)));
      ctx.restore();
    }

    drawingRef.current.dirtyRect = null;
  }, [width, height, strokes, stickers, drawPaperBackground, drawStrokeSegment, drawSticker, animatingStickers]);

  const expandDirtyRect = (x: number, y: number, padding: number = 10) => {
    const d = drawingRef.current.dirtyRect;
    const nx = x - padding;
    const ny = y - padding;
    const nw = padding * 2;
    const nh = padding * 2;
    if (!d) {
      drawingRef.current.dirtyRect = { x: nx, y: ny, w: nw, h: nh };
    } else {
      const rx = Math.min(d.x, nx);
      const ry = Math.min(d.y, ny);
      drawingRef.current.dirtyRect = {
        x: rx,
        y: ry,
        w: Math.max(d.x + d.w, nx + nw) - rx,
        h: Math.max(d.y + d.h, ny + nh) - ry
      };
    }
  };

  useEffect(() => {
    const loop = () => {
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  useEffect(() => {
    requestFullRedraw();
  }, [strokes, stickers, requestFullRedraw]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: typeof e.pressure > 0 ? e.pressure : 0.5
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readonly) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const p = getCanvasPoint(e);
    drawingRef.current.isDrawing = true;
    drawingRef.current.currentStroke = {
      id: `stroke-${Date.now()}-${Math.random()}`,
      points: [p],
      color: '#3a3a3a'
    };
    expandDirtyRect(p.x, p.y, 12);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readonly || !drawingRef.current.isDrawing || !drawingRef.current.currentStroke) return;

    const p = getCanvasPoint(e);
    const stroke = drawingRef.current.currentStroke;
    stroke.points.push(p);
    expandDirtyRect(p.x, p.y, 12);
  };

  const handlePointerUp = () => {
    if (!drawingRef.current.isDrawing || !drawingRef.current.currentStroke) return;
    drawingRef.current.isDrawing = false;
    const finished = drawingRef.current.currentStroke;
    drawingRef.current.currentStroke = null;
    if (finished.points.length > 1) {
      onStrokesChange([...strokes, finished]);
    }
    requestFullRedraw();
  };

  const handleStickerMouseDown = (e: React.MouseEvent, stickerId: string) => {
    if (readonly) return;
    e.stopPropagation();
    const sticker = stickers.find(s => s.id === stickerId);
    if (!sticker) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingSticker(stickerId);
    setDragOffset({
      x: e.clientX - sticker.x,
      y: e.clientY - sticker.y
    });
  };

  useEffect(() => {
    if (!draggingSticker) return;
    const handleMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newStickers = stickers.map(s =>
        s.id === draggingSticker
          ? { ...s, x: e.clientX - rect.left, y: e.clientY - rect.top }
          : s
      );
      onStickersChange(newStickers);
    };
    const handleUp = () => setDraggingSticker(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingSticker, stickers, onStickersChange]);

  return (
    <div ref={containerRef} className="paper-container" style={{ width, height, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`paper-canvas ${readonly ? 'readonly' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      />
      {!readonly && stickers.map(s => (
        <div
          key={s.id}
          onMouseDown={e => handleStickerMouseDown(e, s.id)}
          style={{
            position: 'absolute',
            left: s.x - 24,
            top: s.y - 24,
            width: 48,
            height: 48,
            fontSize: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: draggingSticker === s.id ? 'grabbing' : 'grab',
            transform: `rotate(${s.rotation}deg) scale(${s.scale})`,
            transition: animatingStickers.has(s.id) ? 'transform 0.3s ease-out' : 'none',
            pointerEvents: readonly ? 'none' : 'auto',
            userSelect: 'none'
          }}
        >
          {s.type}
        </div>
      ))}
    </div>
  );
});

PaperCanvas.displayName = 'PaperCanvas';

export default PaperCanvas;
