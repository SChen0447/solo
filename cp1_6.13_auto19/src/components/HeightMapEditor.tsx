import React, { useRef, useEffect, useState, useCallback } from 'react';
import { findPath, Point } from '../utils/aiPathFinder';

const GRID_SIZE = 32;
const CANVAS_SIZE = 640;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
const SMALL_CANVAS = 360;
const SMALL_CELL = SMALL_CANVAS / GRID_SIZE;

type BrushType = 'raise' | 'lower' | 'smooth';

const BRUSH_RADII = [2, 4, 6];

function heightToColor(h: number): [number, number, number] {
  const t = Math.max(0, Math.min(255, h)) / 255;
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const s = t / 0.5;
    r = Math.round(0 + s * 0);
    g = Math.round(20 + s * 180);
    b = Math.round(139 - s * 39);
  } else {
    const s = (t - 0.5) / 0.5;
    r = Math.round(0 + s * 255);
    g = Math.round(200 + s * 55);
    b = Math.round(100 + s * 155);
  }
  return [r, g, b];
}

function bilinearSample(
  heightMap: number[][],
  fx: number,
  fy: number
): [number, number, number] {
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(x0 + 1, GRID_SIZE - 1);
  const y1 = Math.min(y0 + 1, GRID_SIZE - 1);
  const tx = fx - x0;
  const ty = fy - y0;

  const c00 = heightToColor(heightMap[y0]?.[x0] ?? 0);
  const c10 = heightToColor(heightMap[y0]?.[x1] ?? 0);
  const c01 = heightToColor(heightMap[y1]?.[x0] ?? 0);
  const c11 = heightToColor(heightMap[y1]?.[x1] ?? 0);

  const r = c00[0] * (1 - tx) * (1 - ty) + c10[0] * tx * (1 - ty) + c01[0] * (1 - tx) * ty + c11[0] * tx * ty;
  const g = c00[1] * (1 - tx) * (1 - ty) + c10[1] * tx * (1 - ty) + c01[1] * (1 - tx) * ty + c11[1] * tx * ty;
  const b = c00[2] * (1 - tx) * (1 - ty) + c10[2] * tx * (1 - ty) + c01[2] * (1 - tx) * ty + c11[2] * tx * ty;

  return [Math.round(r), Math.round(g), Math.round(b)];
}

const BRUSH_LABELS: Record<BrushType, string> = {
  raise: '抬升',
  lower: '沉降',
  smooth: '平滑',
};

const BRUSH_ICONS: Record<BrushType, string> = {
  raise: '▲',
  lower: '▼',
  smooth: '◆',
};

export default function HeightMapEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const heightMapRef = useRef<number[][]>(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
  );
  const [brushType, setBrushType] = useState<BrushType>('raise');
  const [brushRadius, setBrushRadius] = useState(2);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [endPoint, setEndPoint] = useState<Point | null>(null);
  const [path, setPath] = useState<Point[]>([]);
  const [isPainting, setIsPainting] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [prevBrush, setPrevBrush] = useState<BrushType>('raise');
  const [brushAnim, setBrushAnim] = useState(false);
  const timeRef = useRef(0);
  const lastPaintPos = useRef<{ x: number; y: number } | null>(null);
  const pathGlowRef = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setIsSmall(window.innerWidth < 800);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canvasSize = isSmall ? SMALL_CANVAS : CANVAS_SIZE;
  const cellSz = isSmall ? SMALL_CELL : CELL_SIZE;

  const applyBrush = useCallback(
    (gridX: number, gridY: number) => {
      const hm = heightMapRef.current;
      const r = brushRadius;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = gridX + dx;
          const ny = gridY + dy;
          if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > r) continue;
          const falloff = 1 - dist / (r + 0.5);
          if (brushType === 'raise') {
            hm[ny][nx] = Math.min(255, hm[ny][nx] + falloff * 12);
          } else if (brushType === 'lower') {
            hm[ny][nx] = Math.max(0, hm[ny][nx] - falloff * 12);
          } else {
            let sum = 0;
            let count = 0;
            for (let sy = -2; sy <= 2; sy++) {
              for (let sx = -2; sx <= 2; sx++) {
                const px = nx + sx;
                const py = ny + sy;
                if (px >= 0 && px < GRID_SIZE && py >= 0 && py < GRID_SIZE) {
                  sum += hm[py][px];
                  count++;
                }
              }
            }
            const avg = sum / count;
            hm[ny][nx] = hm[ny][nx] + (avg - hm[ny][nx]) * falloff * 0.3;
          }
        }
      }
    },
    [brushType, brushRadius]
  );

  const recomputePath = useCallback(() => {
    const sp = startPoint;
    const ep = endPoint;
    if (sp && ep) {
      const result = findPath(heightMapRef.current, sp, ep);
      setPath(result);
      pathGlowRef.current = 0;
    } else {
      setPath([]);
    }
  }, [startPoint, endPoint]);

  useEffect(() => {
    recomputePath();
  }, [recomputePath]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hm = heightMapRef.current;
    const sz = canvasSize;
    const cs = cellSz;
    timeRef.current += 0.016;

    const imageData = ctx.createImageData(sz, sz);
    const data = imageData.data;

    const samplesPerCell = 4;
    const pixelStep = cs / samplesPerCell;

    for (let py = 0; py < sz; py++) {
      for (let px = 0; px < sz; px++) {
        const fx = (px / cs) - 0.5;
        const fy = (py / cs) - 0.5;
        const clampedFx = Math.max(0, Math.min(GRID_SIZE - 1, fx));
        const clampedFy = Math.max(0, Math.min(GRID_SIZE - 1, fy));
        const [r, g, b] = bilinearSample(hm, clampedFx, clampedFy);
        const idx = (py * sz + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    if (path.length > 1) {
      pathGlowRef.current = Math.min(1, pathGlowRef.current + 0.03);
      const glow = pathGlowRef.current;

      ctx.save();
      ctx.shadowColor = 'rgba(255, 220, 50, 0.6)';
      ctx.shadowBlur = 12 * glow;
      ctx.strokeStyle = `rgba(255, 220, 50, ${0.8 * glow})`;
      ctx.lineWidth = cs * 0.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(path[0].x * cs + cs / 2, path[0].y * cs + cs / 2);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * cs + cs / 2, path[i].y * cs + cs / 2);
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(255, 255, 100, 0.3)';
      ctx.shadowBlur = 20 * glow;
      ctx.strokeStyle = `rgba(255, 240, 80, ${0.4 * glow})`;
      ctx.lineWidth = cs * 0.8;
      ctx.beginPath();
      ctx.moveTo(path[0].x * cs + cs / 2, path[0].y * cs + cs / 2);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * cs + cs / 2, path[i].y * cs + cs / 2);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (startPoint) {
      const pulse = 0.6 + 0.4 * Math.sin(timeRef.current * 3);
      const spx = startPoint.x * cs + cs / 2;
      const spy = startPoint.y * cs + cs / 2;
      const spr = cs * 0.4 * (0.8 + 0.2 * Math.sin(timeRef.current * 3));

      ctx.save();
      ctx.shadowColor = 'rgba(50, 255, 100, 0.8)';
      ctx.shadowBlur = 10 + 5 * pulse;
      ctx.beginPath();
      ctx.arc(spx, spy, spr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(50, 255, 100, ${0.7 + 0.3 * pulse})`;
      ctx.fill();
      ctx.restore();
    }

    if (endPoint) {
      const blink = 0.5 + 0.5 * Math.sin(timeRef.current * 5);
      const epx = endPoint.x * cs + cs / 2;
      const epy = endPoint.y * cs + cs / 2;
      const epr = cs * 0.35;

      ctx.save();
      ctx.shadowColor = 'rgba(255, 60, 60, 0.8)';
      ctx.shadowBlur = 10 + 5 * blink;
      ctx.beginPath();
      ctx.arc(epx, epy, epr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 60, ${0.6 + 0.4 * blink})`;
      ctx.fill();
      ctx.restore();

      const arrowSize = cs * 0.5;
      const angle = timeRef.current * 2;
      ctx.save();
      ctx.translate(epx, epy - cs * 0.7);
      ctx.rotate(Math.sin(angle) * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, -arrowSize * (0.5 + 0.15 * Math.sin(angle)));
      ctx.lineTo(-arrowSize * 0.35, 0);
      ctx.lineTo(arrowSize * 0.35, 0);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 80, 80, ${0.5 + 0.5 * blink})`;
      ctx.fill();
      ctx.restore();
    }

    animFrameRef.current = requestAnimationFrame(renderCanvas);
  }, [canvasSize, cellSz, path, startPoint, endPoint]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(renderCanvas);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [renderCanvas]);

  const getGridPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasSize / rect.width;
      const scaleY = canvasSize / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      const gx = Math.floor(px / cellSz);
      const gy = Math.floor(py / cellSz);
      if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return null;
      return { x: gx, y: gy };
    },
    [canvasSize, cellSz]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 0) {
        const pos = getGridPos(e);
        if (pos) {
          setIsPainting(true);
          lastPaintPos.current = pos;
          applyBrush(pos.x, pos.y);
        }
      }
    },
    [getGridPos, applyBrush]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPainting) return;
      const pos = getGridPos(e);
      if (pos) {
        if (lastPaintPos.current) {
          const dx = pos.x - lastPaintPos.current.x;
          const dy = pos.y - lastPaintPos.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const steps = Math.max(1, Math.ceil(dist));
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const ix = Math.round(lastPaintPos.current.x + dx * t);
            const iy = Math.round(lastPaintPos.current.y + dy * t);
            applyBrush(ix, iy);
          }
        } else {
          applyBrush(pos.x, pos.y);
        }
        lastPaintPos.current = pos;
      }
    },
    [isPainting, getGridPos, applyBrush]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 0) {
        setIsPainting(false);
        lastPaintPos.current = null;
      }
    },
    []
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const pos = getGridPos(e);
      if (!pos) return;
      if (!startPoint || (startPoint && endPoint)) {
        setStartPoint(pos);
        setEndPoint(null);
        setPath([]);
      } else {
        setEndPoint(pos);
      }
    },
    [getGridPos, startPoint, endPoint]
  );

  const handleBrushChange = useCallback(
    (type: BrushType) => {
      if (type !== brushType) {
        setPrevBrush(brushType);
        setBrushType(type);
        setBrushAnim(true);
        setTimeout(() => setBrushAnim(false), 300);
      }
    },
    [brushType]
  );

  const handleReset = useCallback(() => {
    setIsResetting(true);
    setTimeout(() => {
      heightMapRef.current = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(0)
      );
      setStartPoint(null);
      setEndPoint(null);
      setPath([]);
      pathGlowRef.current = 0;
      setTimeout(() => setIsResetting(false), 300);
    }, 300);
  }, []);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'heightmap.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const toolbarItems = [
    { type: 'raise' as BrushType, label: BRUSH_LABELS.raise, icon: BRUSH_ICONS.raise },
    { type: 'lower' as BrushType, label: BRUSH_LABELS.lower, icon: BRUSH_ICONS.lower },
    { type: 'smooth' as BrushType, label: BRUSH_LABELS.smooth, icon: BRUSH_ICONS.smooth },
  ];

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: isSmall ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isSmall ? '12px' : '20px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: isSmall ? 'row' : 'column',
          gap: isSmall ? '8px' : '12px',
          padding: isSmall ? '8px 12px' : '16px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: isSmall ? '10px' : '12px',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            marginBottom: isSmall ? 0 : 4,
            letterSpacing: 1,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          笔刷
        </div>

        {toolbarItems.map((item) => (
          <button
            key={item.type}
            onClick={() => handleBrushChange(item.type)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              width: isSmall ? '48px' : '60px',
              height: isSmall ? '48px' : '60px',
              border: brushType === item.type
                ? '1.5px solid rgba(255, 220, 80, 0.7)'
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              background: brushType === item.type
                ? 'rgba(255, 220, 80, 0.15)'
                : 'rgba(255,255,255,0.04)',
              color: brushType === item.type ? '#ffdc50' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: isSmall ? '16px' : '20px',
              transition: 'all 0.2s ease',
              transform:
                brushType === item.type && brushAnim
                  ? 'rotate(90deg) scale(0.8)'
                  : brushType === item.type
                  ? 'scale(1.05)'
                  : 'scale(1)',
              boxShadow:
                brushType === item.type
                  ? '0 4px 16px rgba(255, 220, 80, 0.2)'
                  : 'none',
              animation:
                brushType === item.type && brushAnim
                  ? 'brushSwitch 0.3s ease forwards'
                  : 'none',
            }}
            onMouseEnter={(e) => {
              if (brushType !== item.type) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (brushType !== item.type) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <span>{item.icon}</span>
            <span style={{ fontSize: isSmall ? '8px' : '10px' }}>{item.label}</span>
          </button>
        ))}

        <div
          style={{
            width: '100%',
            height: '1px',
            background: 'rgba(255,255,255,0.1)',
            margin: isSmall ? '0 4px' : '4px 0',
          }}
        />

        <div
          style={{
            fontSize: isSmall ? '9px' : '11px',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          半径
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: isSmall ? 'row' : 'column',
            gap: 4,
          }}
        >
          {BRUSH_RADII.map((r) => (
            <button
              key={r}
              onClick={() => setBrushRadius(r)}
              style={{
                width: isSmall ? '28px' : '36px',
                height: isSmall ? '28px' : '36px',
                border:
                  brushRadius === r
                    ? '1.5px solid rgba(100, 200, 255, 0.7)'
                    : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                background:
                  brushRadius === r
                    ? 'rgba(100, 200, 255, 0.15)'
                    : 'rgba(255,255,255,0.04)',
                color:
                  brushRadius === r
                    ? 'rgba(100, 200, 255, 1)'
                    : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: isSmall ? '10px' : '13px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (brushRadius !== r) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (brushRadius !== r) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <div
          style={{
            width: '100%',
            height: '1px',
            background: 'rgba(255,255,255,0.1)',
            margin: isSmall ? '0 4px' : '4px 0',
          }}
        />

        <button
          onClick={handleReset}
          style={{
            width: isSmall ? '52px' : '60px',
            height: isSmall ? '32px' : '36px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            background: 'rgba(255, 80, 80, 0.1)',
            color: 'rgba(255, 150, 150, 0.9)',
            cursor: 'pointer',
            fontSize: isSmall ? '9px' : '11px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 80, 80, 0.25)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 80, 80, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 80, 80, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          重置
        </button>

        <button
          onClick={handleExport}
          style={{
            width: isSmall ? '52px' : '60px',
            height: isSmall ? '32px' : '36px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            background: 'rgba(80, 200, 255, 0.1)',
            color: 'rgba(150, 220, 255, 0.9)',
            cursor: 'pointer',
            fontSize: isSmall ? '9px' : '11px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(80, 200, 255, 0.25)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(80, 200, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(80, 200, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          导出
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          opacity: isResetting ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          style={{
            width: isSmall ? Math.min(SMALL_CANVAS, window.innerWidth - 32) : CANVAS_SIZE,
            height: isSmall ? Math.min(SMALL_CANVAS, window.innerWidth - 32) : CANVAS_SIZE,
            cursor: 'crosshair',
            borderRadius: '4px',
            display: 'block',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: isSmall ? 8 : 16,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.35)',
          fontSize: isSmall ? '9px' : '11px',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        左键拖拽绘制地形 · 右键设置起点/终点
      </div>

      <style>{`
        @keyframes brushSwitch {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(90deg) scale(0.8); }
          100% { transform: rotate(0deg) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
