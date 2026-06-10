import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  CanvasElement,
  ToolType,
  CoauthorCursor,
  Point,
  drawRect,
  drawCircle,
  drawPath,
  drawSticky
} from './utils';

interface CanvasProps {
  elements: CanvasElement[];
  selectedTool: ToolType;
  color: string;
  coauthors: CoauthorCursor[];
  onDrawingStart: (worldPoint: Point) => void;
  onDrawingMove: (worldPoint: Point) => void;
  onDrawingEnd: (worldPoint: Point) => void;
  onStickyClick: (worldPoint: Point) => void;
  isDrawing: boolean;
  onIsPanningChange: (panning: boolean) => void;
}

export interface CanvasHandle {
  screenToWorld: (screenPoint: Point) => Point;
  getViewport: () => { offsetX: number; offsetY: number; scale: number };
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const isPanningRef = useRef(false);
  const lastPanRef = useRef<Point | null>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const drawingActiveRef = useRef(false);

  const {
    elements,
    selectedTool,
    color: _color,
    coauthors,
    onDrawingStart,
    onDrawingMove,
    onDrawingEnd,
    onStickyClick,
    isDrawing,
    onIsPanningChange
  } = props;

  useEffect(() => {
    drawingActiveRef.current = isDrawing;
  }, [isDrawing]);

  const screenToWorld = useCallback((screenPoint: Point): Point => {
    return {
      x: (screenPoint.x - offsetRef.current.x) / scaleRef.current,
      y: (screenPoint.y - offsetRef.current.y) / scaleRef.current
    };
  }, []);

  useImperativeHandle(ref, () => ({
    screenToWorld,
    getViewport: () => ({
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
      scale: scaleRef.current
    })
  }), [screenToWorld]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const scale = scaleRef.current;
    const offsetX = offsetRef.current.x;
    const offsetY = offsetRef.current.y;
    const gridSize = 40 * scale;
    ctx.save();
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    const startX = -((-offsetX) % gridSize);
    const startY = -((-offsetY) % gridSize);
    ctx.beginPath();
    for (let x = startX; x <= w; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = startY; y <= h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawCursor = useCallback((ctx: CanvasRenderingContext2D, c: CoauthorCursor) => {
    ctx.save();
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'bottom';
    const label = c.name;
    const metrics = ctx.measureText(label);
    const padding = 4;
    const labelX = c.x + 10;
    const labelY = c.y - 2;
    ctx.fillStyle = c.color;
    ctx.fillRect(labelX, labelY - 14, metrics.width + padding * 2, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, labelX + padding, labelY);
    ctx.restore();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = sizeRef.current;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height);
    ctx.save();
    ctx.translate(offsetRef.current.x, offsetRef.current.y);
    ctx.scale(scaleRef.current, scaleRef.current);
    elements.forEach((el) => {
      if (el.type === 'rect') drawRect(ctx, el);
      else if (el.type === 'circle') drawCircle(ctx, el);
      else if (el.type === 'path') drawPath(ctx, el);
      else if (el.type === 'sticky') drawSticky(ctx, el);
    });
    ctx.restore();
    coauthors.forEach((c) => drawCursor(ctx, c));
    rafRef.current = requestAnimationFrame(render);
  }, [elements, coauthors, drawGrid, drawCursor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { width: w, height: h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [render]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const screenPoint = getMousePos(e);
    const worldPoint = screenToWorld(screenPoint);
    if (selectedTool === 'sticky') {
      onStickyClick(worldPoint);
      return;
    }
    if (selectedTool === 'rect' || selectedTool === 'circle' || selectedTool === 'path' || selectedTool === 'handwrite') {
      onDrawingStart(worldPoint);
      return;
    }
    isPanningRef.current = true;
    lastPanRef.current = screenPoint;
    onIsPanningChange(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const screenPoint = getMousePos(e);
    const worldPoint = screenToWorld(screenPoint);
    if (drawingActiveRef.current) {
      onDrawingMove(worldPoint);
      return;
    }
    if (isPanningRef.current && lastPanRef.current) {
      const dx = screenPoint.x - lastPanRef.current.x;
      const dy = screenPoint.y - lastPanRef.current.y;
      offsetRef.current.x += dx;
      offsetRef.current.y += dy;
      lastPanRef.current = screenPoint;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const screenPoint = getMousePos(e);
    const worldPoint = screenToWorld(screenPoint);
    if (drawingActiveRef.current) {
      onDrawingEnd(worldPoint);
    }
    if (isPanningRef.current) {
      isPanningRef.current = false;
      lastPanRef.current = null;
      onIsPanningChange(false);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const screenPoint = getMousePos(e);
    const worldPoint = screenToWorld(screenPoint);
    if (drawingActiveRef.current) {
      onDrawingEnd(worldPoint);
    }
    if (isPanningRef.current) {
      isPanningRef.current = false;
      lastPanRef.current = null;
      onIsPanningChange(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const screenPoint = getMousePos(e);
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(0.5, Math.min(4, scaleRef.current * (1 + delta)));
    const ratio = newScale / scaleRef.current;
    offsetRef.current.x = screenPoint.x - (screenPoint.x - offsetRef.current.x) * ratio;
    offsetRef.current.y = screenPoint.y - (screenPoint.y - offsetRef.current.y) * ratio;
    scaleRef.current = newScale;
  };

  const cursorStyle = selectedTool === 'sticky' || selectedTool === 'rect' || selectedTool === 'circle' || selectedTool === 'path' || selectedTool === 'handwrite'
    ? 'crosshair'
    : (isPanningRef.current ? 'grabbing' : 'grab');

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        cursor: cursorStyle,
        transition: 'cursor 0.2s ease'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    />
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
