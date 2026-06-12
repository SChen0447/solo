import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { ToolType, Shape, PenShape, RectangleShape, CircleShape, Point } from '../types';

interface CanvasProps {
  shapes: Shape[];
  currentTool: ToolType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  userId: string;
  onDrawComplete: (shape: Shape) => void;
}

export interface CanvasHandle {
  exportPNG: () => void;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { shapes, currentTool, strokeColor, fillColor, strokeWidth, userId, onDrawComplete },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<Point | null>(null);
  const currentPointsRef = useRef<Point[]>([]);
  const animFrameRef = useRef<number>(0);

  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = shape.strokeColor;
    ctx.lineWidth = shape.strokeWidth;

    if (shape.tool === 'pen') {
      if (shape.points.length < 2) {
        if (shape.points.length === 1) {
          ctx.beginPath();
          ctx.arc(shape.points[0].x, shape.points[0].y, shape.strokeWidth / 2, 0, Math.PI * 2);
          ctx.fillStyle = shape.strokeColor;
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length - 1; i++) {
          const xc = (shape.points[i].x + shape.points[i + 1].x) / 2;
          const yc = (shape.points[i].y + shape.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(shape.points[i].x, shape.points[i].y, xc, yc);
        }
        const last = shape.points[shape.points.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }
    } else if (shape.tool === 'rectangle') {
      if (shape.fillColor) {
        ctx.fillStyle = shape.fillColor;
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      }
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.tool === 'circle') {
      ctx.beginPath();
      ctx.arc(shape.cx, shape.cy, shape.radius, 0, Math.PI * 2);
      if (shape.fillColor) {
        ctx.fillStyle = shape.fillColor;
        ctx.fill();
      }
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  const drawPreview = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isDrawingRef.current || !startPointRef.current) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = 0.8;

    if (currentTool === 'pen' && currentPointsRef.current.length > 1) {
      const pts = currentPointsRef.current;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    } else if (currentTool === 'rectangle') {
      const start = startPointRef.current;
      const pts = currentPointsRef.current;
      const end = pts.length > 0 ? pts[pts.length - 1] : start;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, w, h);
      }
      ctx.strokeRect(x, y, w, h);
    } else if (currentTool === 'circle') {
      const start = startPointRef.current;
      const pts = currentPointsRef.current;
      const end = pts.length > 0 ? pts[pts.length - 1] : start;
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      const radius = Math.max(rx, ry);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [currentTool, strokeColor, fillColor, strokeWidth]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const shape of shapes) {
      drawShape(ctx, shape);
    }

    drawPreview(ctx);
  }, [shapes, drawShape, drawPreview]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      render();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    const point = getCanvasPoint(clientX, clientY);
    if (!point) return;
    isDrawingRef.current = true;
    startPointRef.current = point;
    currentPointsRef.current = [point];
  }, [getCanvasPoint]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return;
    const point = getCanvasPoint(clientX, clientY);
    if (!point) return;
    currentPointsRef.current.push(point);
  }, [getCanvasPoint]);

  const handleEnd = useCallback(() => {
    if (!isDrawingRef.current || !startPointRef.current) {
      isDrawingRef.current = false;
      return;
    }

    const points = currentPointsRef.current;
    const timestamp = Date.now();
    const baseId = `${userId}-${timestamp}`;

    let shape: Shape | null = null;

    if (currentTool === 'pen' && points.length > 0) {
      shape = {
        id: baseId,
        userId,
        tool: 'pen',
        strokeColor,
        strokeWidth,
        timestamp,
        points: [...points]
      } as PenShape;
    } else if (currentTool === 'rectangle' && points.length > 0) {
      const start = startPointRef.current;
      const end = points[points.length - 1];
      shape = {
        id: baseId,
        userId,
        tool: 'rectangle',
        strokeColor,
        strokeWidth,
        fillColor,
        timestamp,
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y)
      } as RectangleShape;
    } else if (currentTool === 'circle' && points.length > 0) {
      const start = startPointRef.current;
      const end = points[points.length - 1];
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      shape = {
        id: baseId,
        userId,
        tool: 'circle',
        strokeColor,
        strokeWidth,
        fillColor,
        timestamp,
        cx,
        cy,
        radius: Math.max(rx, ry)
      } as CircleShape;
    }

    if (shape) {
      onDrawComplete(shape);
    }

    isDrawingRef.current = false;
    startPointRef.current = null;
    currentPointsRef.current = [];
  }, [currentTool, strokeColor, strokeWidth, fillColor, userId, onDrawComplete]);

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `whiteboard-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }));

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => {
        if (e.touches.length > 0) {
          handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={handleEnd}
    >
      <canvas ref={canvasRef} className="whiteboard-canvas" />
      <style>{`
        .canvas-container {
          position: fixed;
          top: 50px;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #f5f5f5;
          cursor: crosshair;
          touch-action: none;
          overflow: hidden;
        }

        .whiteboard-canvas {
          display: block;
          width: 100%;
          height: 100%;
          background-color: #ffffff;
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
});

export default Canvas;
