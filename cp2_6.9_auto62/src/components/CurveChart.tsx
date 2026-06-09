import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SentenceResult, LABEL_INFO } from '../types';

interface CurveChartProps {
  data: SentenceResult[];
  selectedIndex: number | null;
  onSelectIndex: (index: number | null) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: SentenceResult | null;
}

interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

const PADDING = { top: 30, right: 30, bottom: 40, left: 50 };
const NODE_RADIUS = 6;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

function interpolateColor(t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const colors = [
    { pos: 0, r: 229, g: 62, b: 62 },
    { pos: 0.5, r: 237, g: 242, b: 247 },
    { pos: 1, r: 56, g: 161, b: 105 },
  ];

  let c1 = colors[0];
  let c2 = colors[colors.length - 1];

  for (let i = 0; i < colors.length - 1; i++) {
    if (clampedT >= colors[i].pos && clampedT <= colors[i + 1].pos) {
      c1 = colors[i];
      c2 = colors[i + 1];
      break;
    }
  }

  const range = c2.pos - c1.pos;
  const localT = range === 0 ? 0 : (clampedT - c1.pos) / range;

  const r = Math.round(c1.r + (c2.r - c1.r) * localT);
  const g = Math.round(c1.g + (c2.g - c1.g) * localT);
  const b = Math.round(c1.b + (c2.b - c1.b) * localT);

  return `rgb(${r}, ${g}, ${b})`;
}

const CurveChart: React.FC<CurveChartProps> = ({
  data,
  selectedIndex,
  onSelectIndex,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });
  const [view, setView] = useState<ViewState>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const animationRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 0, height: 0, dpr: 1 };
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      dpr,
    };
  }, []);

  const dataToCanvas = useCallback(
    (index: number, score: number, width: number, height: number): { x: number; y: number } => {
      const chartWidth = width - PADDING.left - PADDING.right;
      const chartHeight = height - PADDING.top - PADDING.bottom;
      const n = Math.max(data.length - 1, 1);
      const x = PADDING.left + (index / n) * chartWidth * view.scale + view.offsetX;
      const y = PADDING.top + chartHeight / 2 - (score * chartHeight) / 2 + view.offsetY;
      return { x, y };
    },
    [data.length, view]
  );

  const canvasToData = useCallback(
    (canvasX: number, canvasY: number, width: number, height: number): { index: number; score: number } | null => {
      const chartWidth = width - PADDING.left - PADDING.right;
      const chartHeight = height - PADDING.top - PADDING.bottom;
      const n = Math.max(data.length - 1, 1);

      const dataX = ((canvasX - PADDING.left - view.offsetX) / view.scale) * (n / chartWidth);
      const dataY = -((canvasY - PADDING.top - view.offsetY - chartHeight / 2) * 2) / chartHeight;

      const idx = Math.round(dataX);
      if (idx < 0 || idx >= data.length) return null;

      return { index: idx, score: dataY };
    },
    [data, view]
  );

  const findNearestNode = useCallback(
    (canvasX: number, canvasY: number, width: number, height: number): number | null => {
      let nearestIndex: number | null = null;
      let nearestDist = Infinity;
      const hitRadius = NODE_RADIUS + 8;

      for (let i = 0; i < data.length; i++) {
        const { x, y } = dataToCanvas(i, data[i].score, width, height);
        const dist = Math.sqrt((x - canvasX) ** 2 + (y - canvasY) ** 2);
        if (dist < hitRadius && dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = i;
        }
      }

      return nearestIndex;
    },
    [data, dataToCanvas]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height, dpr } = getCanvasSize();
    if (width === 0 || height === 0) return;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const chartWidth = width - PADDING.left - PADDING.right;
    const chartHeight = height - PADDING.top - PADDING.bottom;

    ctx.strokeStyle = '#EDF2F7';
    ctx.lineWidth = 1;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#A0AEC0';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = [-1, -0.5, 0, 0.5, 1];
    for (const tick of yTicks) {
      const y = PADDING.top + chartHeight / 2 - (tick * chartHeight) / 2 + view.offsetY;
      if (y >= PADDING.top && y <= height - PADDING.bottom) {
        ctx.beginPath();
        ctx.moveTo(PADDING.left + view.offsetX, y);
        ctx.lineTo(width - PADDING.right + view.offsetX, y);
        ctx.stroke();
        ctx.fillText(tick.toFixed(1), PADDING.left - 8, y);
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (data.length > 0) {
      const step = Math.max(1, Math.floor(data.length / 5));
      for (let i = 0; i < data.length; i += step) {
        const x = PADDING.left + (i / Math.max(data.length - 1, 1)) * chartWidth * view.scale + view.offsetX;
        if (x >= PADDING.left && x <= width - PADDING.right) {
          ctx.fillText(`#${i + 1}`, x, height - PADDING.bottom + 12);
        }
      }
    }

    if (data.length === 0) {
      ctx.fillStyle = '#A0AEC0';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('点击"分析情感"按钮生成情感曲线', width / 2, height / 2);
      return;
    }

    if (data.length === 1) {
      const { x, y } = dataToCanvas(0, data[0].score, width, height);
      const color = interpolateColor((data[0].score + 1) / 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    for (let i = 0; i < data.length - 1; i++) {
      const p1 = dataToCanvas(i, data[i].score, width, height);
      const p2 = dataToCanvas(i + 1, data[i + 1].score, width, height);

      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      gradient.addColorStop(0, interpolateColor((data[i].score + 1) / 2));
      gradient.addColorStop(1, interpolateColor((data[i + 1].score + 1) / 2));

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    for (let i = 0; i < data.length; i++) {
      const { x, y } = dataToCanvas(i, data[i].score, width, height);
      const color = LABEL_INFO[data[i].label].color;

      if (i === selectedIndex) {
        ctx.beginPath();
        ctx.arc(x, y, NODE_RADIUS + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(26, 32, 44, 0.08)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [data, selectedIndex, view, getCanvasSize, dataToCanvas]);

  const animate = useCallback(
    (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= 1000 / 60) {
        draw();
        lastFrameTimeRef.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(animate);
    },
    [draw]
  );

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [animate]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, height } = getCanvasSize();

    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setView((prev) => ({
        ...prev,
        offsetX: dragStartRef.current.offsetX + dx,
        offsetY: dragStartRef.current.offsetY + dy,
      }));
      setTooltip((prev) => ({ ...prev, visible: false }));
      return;
    }

    const nearest = findNearestNode(x, y, width, height);
    if (nearest !== null) {
      const nodeData = data[nearest];
      const pos = dataToCanvas(nearest, nodeData.score, width, height);
      setTooltip({
        visible: true,
        x: pos.x,
        y: pos.y - NODE_RADIUS - 12,
        data: nodeData,
      });
      canvas.style.cursor = 'pointer';
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }));
      canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, height } = getCanvasSize();

    const nearest = findNearestNode(x, y, width, height);
    if (nearest !== null) {
      onSelectIndex(nearest === selectedIndex ? null : nearest);
      return;
    }

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: view.offsetX,
      offsetY: view.offsetY,
    };
    canvas.style.cursor = 'grabbing';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setView((prev) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * delta));
      return { ...prev, scale: newScale };
    });
  };

  const handleDoubleClick = () => {
    setView({ offsetX: 0, offsetY: 0, scale: 1 });
  };

  return (
    <div className="chart-section">
      <div className="chart-header">
        <span className="chart-title">情感曲线</span>
        <div className="chart-legend">
          {Object.entries(LABEL_INFO).map(([key, info]) => (
            <div key={key} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: info.color }} />
              <span>{info.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="chart-canvas"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: 'grab' }}
        />
        {tooltip.visible && tooltip.data && (
          <div
            className="chart-tooltip"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="tooltip-label">
              <span
                className="tooltip-dot"
                style={{ backgroundColor: LABEL_INFO[tooltip.data.label].color }}
              />
              {LABEL_INFO[tooltip.data.label].name}
            </div>
            <div className="tooltip-score">情感分值: {tooltip.data.score.toFixed(3)}</div>
            <div className="tooltip-sentence">{tooltip.data.sentence}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurveChart;
