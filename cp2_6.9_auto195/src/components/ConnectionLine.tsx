import React, { useRef, useEffect } from 'react';
import type { BookNodePosition, ConnectionLineData } from '../types';

interface ConnectionLineProps {
  connections: ConnectionLineData[];
  positions: Map<string, BookNodePosition>;
  highlightedId: string | null;
  relatedIds: Set<string>;
  draggingId: string | null;
}

const DARK_BLUE = 'rgba(26, 35, 126, 0.4)';
const PURPLE = 'rgba(123, 31, 162, 0.6)';
const PURPLE_DRAG = 'rgba(123, 31, 162, 0.8)';

const lerpColor = (c1: string, c2: string, t: number): string => {
  const parse = (s: string) => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return [0, 0, 0, 1];
    return [
      parseInt(m[1], 10),
      parseInt(m[2], 10),
      parseInt(m[3], 10),
      m[4] !== undefined ? parseFloat(m[4]) : 1,
    ];
  };
  const a = parse(c1);
  const b = parse(c2);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  const al = (a[3] + (b[3] - a[3]) * t).toFixed(2);
  return `rgba(${r}, ${g}, ${bl}, ${al})`;
};

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connections,
  positions,
  highlightedId,
  relatedIds,
  draggingId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      connections.forEach((conn) => {
        const source = positions.get(conn.sourceId);
        const target = positions.get(conn.targetId);
        if (!source || !target) return;

        const involvesHighlighted =
          highlightedId === conn.sourceId || highlightedId === conn.targetId;
        const involvesRelated =
          (highlightedId && (relatedIds.has(conn.sourceId) || relatedIds.has(conn.targetId))) ||
          false;
        const involvesDragging =
          draggingId === conn.sourceId || draggingId === conn.targetId;

        let lineColor: string;
        let lineWidth: number;
        let isDashed = false;

        if (involvesDragging) {
          lineColor = lerpColor(DARK_BLUE, PURPLE_DRAG, conn.strength);
          lineWidth = 1 + conn.strength * 3;
        } else if (involvesHighlighted) {
          lineColor = lerpColor(DARK_BLUE, PURPLE, conn.strength);
          lineWidth = 1 + conn.strength * 3;
          isDashed = true;
        } else if (highlightedId && !involvesRelated) {
          lineColor = 'rgba(26, 35, 126, 0.08)';
          lineWidth = 0.5;
        } else {
          lineColor = lerpColor(DARK_BLUE, PURPLE, conn.strength * 0.6);
          lineWidth = 0.8 + conn.strength * 1.5;
        }

        const sx = source.x;
        const sy = source.y;
        const tx = target.x;
        const ty = target.y;
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;
        const dx = tx - sx;
        const dy = ty - sy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const curveHeight = dist * 0.15;
        const cx1 = midX - (dy / dist) * curveHeight;
        const cy1 = midY + (dx / dist) * curveHeight;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cx1, cy1, tx, ty);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';

        if (isDashed) {
          ctx.setLineDash([6, 6]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
      });
    };

    draw();

    return () => ro.disconnect();
  }, [connections, positions, highlightedId, relatedIds, draggingId]);

  return (
    <div ref={containerRef} className="connection-canvas-container">
      <canvas ref={canvasRef} className="connection-canvas" />
    </div>
  );
};

export default ConnectionLine;
