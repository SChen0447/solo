import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { EnvironmentParams, SnowflakeData, Particle, BranchPoint } from '@/utils/snowflakeAlgorithm';
import { generateSnowflakePaths, generateParticles, getBranchColor } from '@/utils/snowflakeAlgorithm';
import { exportSnowflakeSVG } from '@/utils/svgExporter';

const CANVAS_SIZE = 800;
const MAX_LAYERS = 6;
const GROWTH_INTERVAL = 500;
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

interface SnowflakeCanvasProps {
  params: EnvironmentParams;
  isGrowing: boolean;
  onGrowthComplete: () => void;
  onGrowthStart: () => void;
  onGrowthUpdate: (data: { currentLayer: number; totalBranches: number; symmetry: number }) => void;
}

export interface SnowflakeCanvasRef {
  exportSVG: () => void;
  reset: () => void;
}

export default forwardRef<SnowflakeCanvasRef, SnowflakeCanvasProps>(function SnowflakeCanvas(
  { params, isGrowing, onGrowthComplete, onGrowthStart, onGrowthUpdate },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nucleusPos, setNucleusPos] = useState({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringNucleus, setIsHoveringNucleus] = useState(false);
  const [seed, setSeed] = useState(Date.now());

  const animationRef = useRef<number>();
  const lastFrameRef = useRef<number>(0);
  const growthStartTimeRef = useRef<number>(0);
  const currentLayerRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const snowflakeDataRef = useRef<SnowflakeData | null>(null);
  const branchAnimProgressRef = useRef<Map<string, number>>(new Map());
  const timeRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    exportSVG: () => {
      if (snowflakeDataRef.current) {
        const data = {
          ...snowflakeDataRef.current,
          centerX: nucleusPos.x,
          centerY: nucleusPos.y,
        };
        exportSnowflakeSVG(data);
      }
    },
    reset: () => {
      cancelAnimationFrame(animationRef.current!);
      currentLayerRef.current = 0;
      growthStartTimeRef.current = 0;
      snowflakeDataRef.current = null;
      branchAnimProgressRef.current.clear();
      particlesRef.current = generateParticles(CANVAS_SIZE / 2, CANVAS_SIZE / 2, 50);
      setSeed(Date.now());
      setNucleusPos({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 });
    },
  }));

  const drawHexagon = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      radius: number,
      fillColor: string,
      strokeColor?: string
    ) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = ((i * 60 - 30) * Math.PI) / 180;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    },
    []
  );

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a4e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, []);

  const drawGlow = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) => {
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(232, 248, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(232, 248, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    },
    []
  );

  const drawBranch = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      branch: BranchPoint,
      progress: number,
      totalLayers: number,
      offsetX: number,
      offsetY: number
    ) => {
      const color = getBranchColor(branch.layer, totalLayers);
      const startX = branch.startX + offsetX;
      const startY = branch.startY + offsetY;
      const currentEndX = startX + (branch.endX - branch.startX) * progress;
      const currentEndY = startY + (branch.endY - branch.startY) * progress;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(currentEndX, currentEndY);
      ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.stroke();

      if (progress >= 0.95) {
        ctx.beginPath();
        ctx.arc(currentEndX, currentEndY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`;
        ctx.fill();
      }
    },
    []
  );

  const drawParticles = useCallback(
    (ctx: CanvasRenderingContext2D, particles: Particle[], time: number) => {
      particles.forEach((p) => {
        const opacity = 0.1 + Math.sin(time * p.speed + p.phase) * 0.1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 248, 255, ${Math.max(0.05, opacity)})`;
        ctx.fill();
      });
    },
    []
  );

  const isPointInNucleus = useCallback(
    (px: number, py: number, nx: number, ny: number) => {
      const dx = px - nx;
      const dy = py - ny;
      return Math.sqrt(dx * dx + dy * dy) < 16;
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isGrowing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (isPointInNucleus(x, y, nucleusPos.x, nucleusPos.y)) {
        setIsDragging(true);
      }
    },
    [isGrowing, nucleusPos, isPointInNucleus]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (isDragging && !isGrowing) {
        setNucleusPos({
          x: Math.max(50, Math.min(CANVAS_SIZE - 50, x)),
          y: Math.max(50, Math.min(CANVAS_SIZE - 50, y)),
        });
      } else {
        setIsHoveringNucleus(isPointInNucleus(x, y, nucleusPos.x, nucleusPos.y));
      }
    },
    [isDragging, isGrowing, nucleusPos, isPointInNucleus]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isGrowing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (isPointInNucleus(x, y, nucleusPos.x, nucleusPos.y)) {
        onGrowthStart();
      }
    },
    [isGrowing, nucleusPos, isPointInNucleus, onGrowthStart]
  );

  useEffect(() => {
    if (isGrowing && !snowflakeDataRef.current) {
      const offsetX = nucleusPos.x - CANVAS_SIZE / 2;
      const offsetY = nucleusPos.y - CANVAS_SIZE / 2;

      snowflakeDataRef.current = generateSnowflakePaths(params, seed);
      snowflakeDataRef.current.centerX = nucleusPos.x;
      snowflakeDataRef.current.centerY = nucleusPos.y;

      particlesRef.current = generateParticles(nucleusPos.x, nucleusPos.y, 50);
      growthStartTimeRef.current = performance.now();
      currentLayerRef.current = 0;
      branchAnimProgressRef.current.clear();
    }
  }, [isGrowing, params, seed, nucleusPos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const offsetX = nucleusPos.x - CANVAS_SIZE / 2;
    const offsetY = nucleusPos.y - CANVAS_SIZE / 2;

    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastFrameRef.current;
      if (deltaTime >= FRAME_INTERVAL) {
        lastFrameRef.current = timestamp;
        timeRef.current = timestamp / 1000;

        drawBackground(ctx);
        drawGlow(ctx, nucleusPos.x, nucleusPos.y, 40);

        if (isGrowing && snowflakeDataRef.current) {
          const elapsed = timestamp - growthStartTimeRef.current;
          const targetLayer = Math.min(MAX_LAYERS, Math.floor(elapsed / GROWTH_INTERVAL) + 1);

          if (targetLayer > currentLayerRef.current) {
            currentLayerRef.current = targetLayer;
          }

          let totalBranchesDrawn = 0;
          snowflakeDataRef.current.layers.forEach((layer, layerIdx) => {
            if (layerIdx < currentLayerRef.current) {
              layer.branches.forEach((branch, branchIdx) => {
                const key = `${layerIdx}-${branchIdx}`;
                let progress = branchAnimProgressRef.current.get(key) || 0;

                if (progress < 1) {
                  const layerStartTime = layerIdx * GROWTH_INTERVAL;
                  const branchElapsed = elapsed - layerStartTime;
                  progress = Math.min(1, branchElapsed / GROWTH_INTERVAL);
                  branchAnimProgressRef.current.set(key, progress);
                }

                drawBranch(
                  ctx,
                  branch,
                  progress,
                  MAX_LAYERS,
                  offsetX,
                  offsetY
                );
                totalBranchesDrawn++;
              });
            }
          });

          onGrowthUpdate({
            currentLayer: currentLayerRef.current,
            totalBranches: totalBranchesDrawn,
            symmetry: snowflakeDataRef.current.symmetry,
          });

          if (currentLayerRef.current >= MAX_LAYERS) {
            const allComplete = snowflakeDataRef.current.layers.every((layer, layerIdx) =>
              layer.branches.every((_, branchIdx) => {
                const key = `${layerIdx}-${branchIdx}`;
                return branchAnimProgressRef.current.get(key) === 1;
              })
            );
            if (allComplete) {
              onGrowthComplete();
            }
          }
        }

        drawParticles(ctx, particlesRef.current, timeRef.current);

        const nucleusScale = isHoveringNucleus && !isGrowing ? 1.05 : 1;
        const nucleusSize = 4 * nucleusScale;
        drawHexagon(
          ctx,
          nucleusPos.x,
          nucleusPos.y,
          nucleusSize,
          '#e8f8ff',
          '#c0e8f0'
        );
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    isGrowing,
    nucleusPos,
    isHoveringNucleus,
    drawBackground,
    drawGlow,
    drawBranch,
    drawParticles,
    drawHexagon,
    onGrowthComplete,
    onGrowthUpdate,
  ]);

  useEffect(() => {
    particlesRef.current = generateParticles(CANVAS_SIZE / 2, CANVAS_SIZE / 2, 50);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: `${CANVAS_SIZE}px`,
          aspectRatio: '1 / 1',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            boxShadow: '0 0 40px rgba(176, 224, 230, 0.2)',
            cursor: isGrowing
              ? 'default'
              : isHoveringNucleus
              ? 'grab'
              : 'default',
            transition: 'box-shadow 0.3s ease',
          }}
        />
      </div>
    </div>
  );
});
