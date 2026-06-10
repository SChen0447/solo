import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  RadarDimensions,
  DIMENSION_KEYS,
  DIMENSION_LABELS
} from '../types';

interface RadarChartProps {
  dimensions: RadarDimensions;
  compareDimensions?: RadarDimensions | null;
  compareMode?: boolean;
  colorTheme: { start: string; end: string };
  onDimensionsChange?: (newDimensions: RadarDimensions) => void;
  size?: number;
}

interface HoverInfo {
  dimension: keyof RadarDimensions;
  value: number;
  x: number;
  y: number;
}

const RadarChart: React.FC<RadarChartProps> = ({
  dimensions,
  compareDimensions = null,
  compareMode = false,
  colorTheme,
  onDimensionsChange,
  size = 400
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const displayDimensionsRef = useRef<RadarDimensions>({ ...dimensions });
  const prevDimensionsRef = useRef<RadarDimensions>({ ...dimensions });

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const levels = 5;
  const sides = 5;
  const angleStep = (Math.PI * 2) / sides;
  const startAngle = -Math.PI / 2;

  const getPointForDimension = useCallback((index: number, value: number, r: number = radius) => {
    const angle = startAngle + index * angleStep;
    const dist = (value / 10) * r;
    return {
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist
    };
  }, [centerX, centerY, radius, angleStep, startAngle]);

  const interpolateDimensions = useCallback((from: RadarDimensions, to: RadarDimensions, t: number): RadarDimensions => {
    const result: Partial<RadarDimensions> = {};
    for (const key of DIMENSION_KEYS) {
      result[key] = from[key] + (to[key] - from[key]) * t;
    }
    return result as RadarDimensions;
  }, []);

  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

  useEffect(() => {
    prevDimensionsRef.current = displayDimensionsRef.current;
    progressRef.current = 0;

    const animate = () => {
      progressRef.current += 1 / (60 * 0.8);
      const t = Math.min(1, progressRef.current);
      const eased = easeOutCubic(t);
      displayDimensionsRef.current = interpolateDimensions(
        prevDimensionsRef.current,
        dimensions,
        eased
      );
      draw();
      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [dimensions, interpolateDimensions]);

  const drawPolygon = useCallback((
    ctx: CanvasRenderingContext2D,
    dims: RadarDimensions,
    fillStyle: string | CanvasGradient,
    strokeStyle: string,
    lineWidth: number = 2,
    dashed: boolean = false
  ) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const key = DIMENSION_KEYS[i];
      const point = getPointForDimension(i, dims[key]);
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.closePath();

    if (dashed) {
      ctx.setLineDash([8, 6]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.setLineDash([]);
  }, [getPointForDimension]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    for (let level = levels; level >= 1; level--) {
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = startAngle + i * angleStep;
        const r = (level / levels) * radius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(176, 137, 104, ${0.04 + (levels - level) * 0.015})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(176, 137, 104, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < sides; i++) {
      const angle = startAngle + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.strokeStyle = 'rgba(176, 137, 104, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const gradient = ctx.createLinearGradient(
      centerX - radius,
      centerY - radius,
      centerX + radius,
      centerY + radius
    );
    gradient.addColorStop(0, colorTheme.start + 'aa');
    gradient.addColorStop(1, colorTheme.end + 'aa');

    const currentDims = displayDimensionsRef.current;

    if (compareMode && compareDimensions) {
      drawPolygon(ctx, compareDimensions, 'rgba(200, 80, 80, 0.15)', '#c85050', 2, true);

      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const key = DIMENSION_KEYS[i];
        const p1 = getPointForDimension(i, currentDims[key]);
        const p2 = getPointForDimension(i, compareDimensions[key]);
        const diff = Math.abs(currentDims[key] - compareDimensions[key]);
        if (diff > 0.5) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    drawPolygon(ctx, currentDims, gradient, '#7f5539', 2.5, false);

    for (let i = 0; i < sides; i++) {
      const key = DIMENSION_KEYS[i];
      const point = getPointForDimension(i, currentDims[key]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff8f0';
      ctx.fill();
      ctx.strokeStyle = '#7f5539';
      ctx.lineWidth = 2;
      ctx.stroke();

      const labelAngle = startAngle + i * angleStep;
      const labelR = radius + 35;
      const labelX = centerX + Math.cos(labelAngle) * labelR;
      const labelY = centerY + Math.sin(labelAngle) * labelR;
      ctx.fillStyle = '#5c3a21';
      ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(DIMENSION_LABELS[key], labelX, labelY);
    }
  }, [size, centerX, centerY, radius, levels, sides, angleStep, startAngle,
      colorTheme, compareMode, compareDimensions, drawPolygon, getPointForDimension]);

  useEffect(() => {
    draw();
  }, [draw, compareMode, compareDimensions, colorTheme]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const findClosestDimension = (x: number, y: number): { index: number; dist: number } | null => {
    let closest: { index: number; dist: number } | null = null;
    for (let i = 0; i < sides; i++) {
      const key = DIMENSION_KEYS[i];
      const point = getPointForDimension(i, dimensions[key]);
      const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      if (dist < 20 && (!closest || dist < closest.dist)) {
        closest = { index: i, dist };
      }
    }
    return closest;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (draggingIndex !== null) {
      const key = DIMENSION_KEYS[draggingIndex];
      const angle = startAngle + draggingIndex * angleStep;
      const dx = pos.x - centerX;
      const dy = pos.y - centerY;
      const projection = dx * Math.cos(angle) + dy * Math.sin(angle);
      let newValue = Math.max(0, Math.min(10, (projection / radius) * 10));
      newValue = Math.round(newValue * 10) / 10;

      const newDimensions = { ...displayDimensionsRef.current, [key]: newValue };
      displayDimensionsRef.current = newDimensions;
      draw();
      return;
    }

    const closest = findClosestDimension(pos.x, pos.y);
    if (closest) {
      const key = DIMENSION_KEYS[closest.index];
      const point = getPointForDimension(closest.index, displayDimensionsRef.current[key]);
      setHoverInfo({
        dimension: key,
        value: Math.round(displayDimensionsRef.current[key] * 10) / 10,
        x: point.x,
        y: point.y - 20
      });
    } else {
      setHoverInfo(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const closest = findClosestDimension(pos.x, pos.y);
    if (closest) {
      setDraggingIndex(closest.index);
    }
  };

  const handleMouseUp = () => {
    if (draggingIndex !== null && onDimensionsChange) {
      onDimensionsChange(displayDimensionsRef.current);
    }
    setDraggingIndex(null);
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    setHoverInfo(null);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        style={{ cursor: draggingIndex !== null ? 'grabbing' : 'crosshair', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {hoverInfo && (
        <div
          style={{
            position: 'absolute',
            left: hoverInfo.x,
            top: hoverInfo.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(92, 58, 33, 0.92)',
            color: '#fff8f0',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 10
          }}
        >
          {DIMENSION_LABELS[hoverInfo.dimension]}: {hoverInfo.value.toFixed(1)}
        </div>
      )}
    </div>
  );
};

export default RadarChart;
