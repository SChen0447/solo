import React, { useRef, useEffect } from 'react';

interface DeliveryTrackerProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  currentPosition: { x: number; y: number } | null;
  visitedPath: { x: number; y: number }[];
  mapHeight?: number;
}

const GRID_COLS = 4;
const GRID_ROWS = 3;

const DeliveryTracker: React.FC<DeliveryTrackerProps> = ({
  startX,
  startY,
  endX,
  endY,
  currentPosition,
  visitedPath,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const gridToPixel = (gridX: number, gridY: number, w: number, h: number) => {
    const cellW = w / GRID_COLS;
    const cellH = h / GRID_ROWS;
    return {
      px: cellW * (gridX + 0.5),
      py: cellH * (gridY + 0.5),
    };
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    mapRef.current.appendChild(canvas);

    const draw = () => {
      if (!mapRef.current || !canvasRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      canvasRef.current.style.width = rect.width + 'px';
      canvasRef.current.style.height = rect.height + 'px';

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (visitedPath.length >= 2) {
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        const first = gridToPixel(visitedPath[0].x, visitedPath[0].y, rect.width, rect.height);
        ctx.moveTo(first.px, first.py);
        for (let i = 1; i < visitedPath.length; i++) {
          const p = gridToPixel(visitedPath[i].x, visitedPath[i].y, rect.width, rect.height);
          ctx.lineTo(p.px, p.py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (canvasRef.current && mapRef.current) {
        mapRef.current.removeChild(canvasRef.current);
      }
    };
  }, [visitedPath]);

  const getMarkerStyle = (gx: number, gy: number) => {
    if (!mapRef.current) return { left: '0px', top: '0px' };
    const rect = mapRef.current.getBoundingClientRect();
    const { px, py } = gridToPixel(gx, gy, rect.width, rect.height);
    return {
      left: `${px}px`,
      top: `${py}px`,
    };
  };

  return (
    <div className="delivery-map" ref={mapRef}>
      <div className="map-grid">
        {Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="map-grid-line"
            style={{
              left: `${(i / GRID_COLS) * 100}%`,
              top: 0,
              width: '1px',
              height: '100%',
            }}
          />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="map-grid-line"
            style={{
              top: `${(i / GRID_ROWS) * 100}%`,
              left: 0,
              height: '1px',
              width: '100%',
            }}
          />
        ))}
      </div>

      <div
        className="destination-marker"
        style={getMarkerStyle(endX, endY)}
        title="目的地"
      />

      {currentPosition && (
        <div
          className="delivery-marker"
          style={getMarkerStyle(currentPosition.x, currentPosition.y)}
          title="配送员"
        >
          🛵
        </div>
      )}
    </div>
  );
};

export default DeliveryTracker;
