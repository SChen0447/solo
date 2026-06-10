import { useEffect, useRef, useState, useCallback } from 'react';
import type { Artwork, TracePoint, LightTrace } from '../types';

interface CanvasDetailProps {
  artwork: Artwork;
  onBack: () => void;
}

interface ActiveTrace {
  id: string;
  points: TracePoint[];
  startTime: number;
  flowedDistance: number;
  alpha: number;
  isUserDrawing: boolean;
}

const FLOW_SPEED = 0.3;
const MAX_FLOW_DISTANCE = 150;
const TOTAL_DURATION = 5000;
const MAX_ACTIVE_TRACES = 200;
const DISCARD_COUNT = 10;
const API_BASE = 'http://localhost:5174';

function CanvasDetail({ artwork, onBack }: CanvasDetailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPointsRef = useRef<TracePoint[]>([]);
  const activeTracesRef = useRef<ActiveTrace[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsTimeRef = useRef<number>(0);

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent | Touch): TracePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const loadHistoricalTraces = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/artworks/${artwork.id}/traces`);
      if (res.ok) {
        const traces: LightTrace[] = await res.json();
        const now = Date.now();
        const historicalActive: ActiveTrace[] = traces.map((trace) => ({
          id: trace.id,
          points: trace.points,
          startTime: now,
          flowedDistance: 0,
          alpha: 1,
          isUserDrawing: false,
        }));
        activeTracesRef.current = [...historicalActive, ...activeTracesRef.current];
      }
    } catch (err) {
      console.error('Failed to load traces:', err);
    } finally {
      setLoading(false);
    }
  }, [artwork.id]);

  const saveTrace = useCallback(async (points: TracePoint[]) => {
    if (points.length < 2) return;
    try {
      await fetch(`${API_BASE}/api/artworks/${artwork.id}/traces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points }),
      });
    } catch (err) {
      console.error('Failed to save trace:', err);
    }
  }, [artwork.id]);

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
      ctx.scale(dpr, dpr);
    }
  }, []);

  const drawTraceSegment = useCallback((
    ctx: CanvasRenderingContext2D,
    points: TracePoint[],
    flowOffset: number,
    alpha: number
  ) => {
    if (points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < points.length - 1; i++) {
      const progress = i / (points.length - 1);
      const width = 18 - progress * 10;

      const gradient = ctx.createLinearGradient(
        points[i].x, points[i].y,
        points[i + 1].x, points[i + 1].y
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(1, `rgba(170, 221, 255, ${alpha})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(170, 221, 255, 0.8)';
      ctx.shadowBlur = 20;

      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);

      if (i + 2 < points.length) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        const xc2 = (points[i + 1].x + points[i + 2].x) / 2;
        const yc2 = (points[i + 1].y + points[i + 2].y) / 2;
        ctx.quadraticCurveTo(points[i + 1].x, points[i + 1].y, xc2, yc2);
      } else {
        ctx.lineTo(points[i + 1].x, points[i + 1].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  const calculateTraceLength = useCallback((points: TracePoint[]): number => {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  }, []);

  const renderLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    frameCountRef.current++;
    if (timestamp - fpsTimeRef.current >= 1000) {
      fpsTimeRef.current = timestamp;
      frameCountRef.current = 0;
    }

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const now = Date.now();
    const traces = activeTracesRef.current;

    if (traces.length > MAX_ACTIVE_TRACES) {
      traces.splice(0, DISCARD_COUNT);
    }

    const updatedTraces: ActiveTrace[] = [];

    for (const trace of traces) {
      const elapsed = now - trace.startTime;
      const totalLength = calculateTraceLength(trace.points);

      let flowDistance = trace.flowedDistance;
      if (!trace.isUserDrawing) {
        flowDistance += FLOW_SPEED * (deltaTime / 16.67);
      }

      let alpha = trace.alpha;
      if (flowDistance > MAX_FLOW_DISTANCE || elapsed > TOTAL_DURATION) {
        const fadeStart = Math.max(MAX_FLOW_DISTANCE, TOTAL_DURATION * 0.7);
        const fadeProgress = Math.min(1, Math.max(
          (flowDistance - MAX_FLOW_DISTANCE) / 50,
          (elapsed - TOTAL_DURATION * 0.7) / (TOTAL_DURATION * 0.3)
        ));
        alpha = Math.max(0, 1 - fadeProgress);
      }

      if (alpha <= 0) {
        continue;
      }

      updatedTraces.push({
        ...trace,
        flowedDistance: flowDistance,
        alpha,
      });

      drawTraceSegment(ctx, trace.points, flowDistance, alpha);
    }

    if (isDrawing && currentPointsRef.current.length >= 2) {
      drawTraceSegment(ctx, currentPointsRef.current, 0, 1);
    }

    activeTracesRef.current = updatedTraces;
    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, [calculateTraceLength, drawTraceSegment, isDrawing]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDrawing(true);
    const point = getCanvasCoords(e);
    currentPointsRef.current = [point];
  }, [getCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const point = getCanvasCoords(e);
    const points = currentPointsRef.current;
    const lastPoint = points[points.length - 1];
    if (!lastPoint || Math.abs(point.x - lastPoint.x) > 2 || Math.abs(point.y - lastPoint.y) > 2) {
      points.push(point);
    }
  }, [isDrawing, getCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const points = [...currentPointsRef.current];
    if (points.length >= 2) {
      const newTrace: ActiveTrace = {
        id: `trace-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        points,
        startTime: Date.now(),
        flowedDistance: 0,
        alpha: 1,
        isUserDrawing: false,
      };
      activeTracesRef.current.push(newTrace);
      saveTrace(points);
    }

    currentPointsRef.current = [];
  }, [isDrawing, saveTrace]);

  const handleMouseLeave = useCallback(() => {
    if (isDrawing) {
      handleMouseUp();
    }
  }, [isDrawing, handleMouseUp]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDrawing(true);
    const point = getCanvasCoords(touch);
    currentPointsRef.current = [point];
  }, [getCanvasCoords]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const point = getCanvasCoords(touch);
    const points = currentPointsRef.current;
    const lastPoint = points[points.length - 1];
    if (!lastPoint || Math.abs(point.x - lastPoint.x) > 2 || Math.abs(point.y - lastPoint.y) > 2) {
      points.push(point);
    }
  }, [isDrawing, getCanvasCoords]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  }, [handleMouseUp]);

  useEffect(() => {
    resizeCanvas();
    loadHistoricalTraces();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas, loadHistoricalTraces]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderLoop]);

  const bgStyle = {
    background: `radial-gradient(circle at center, ${artwork.color}22 0%, #0a0a12 70%)`,
  };

  return (
    <div className="canvas-detail" style={bgStyle}>
      <button className="btn btn-ghost canvas-back-btn" onClick={onBack}>
        ← 返回展厅
      </button>

      <div className="canvas-title-bar">
        <span className="canvas-title-text">{artwork.title}</span>
      </div>

      <div className="canvas-container" ref={containerRef}>
        <img
          src={artwork.imageData}
          alt={artwork.title}
          className="canvas-artwork"
          draggable={false}
        />
        <div className="canvas-overlay" />
        <canvas
          ref={canvasRef}
          className="canvas-draw"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {loading && <div className="loading">加载光迹中...</div>}
      </div>

      <div className="canvas-hint">
        ✨ 按下鼠标左键拖拽，在画布上留下流动的光迹留言
      </div>
    </div>
  );
}

export default CanvasDetail;
