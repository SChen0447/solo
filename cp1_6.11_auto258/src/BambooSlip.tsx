import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Point, Particle } from './types';
import { useAppStore } from './store';

interface BambooSlipProps {
  onImageData: (dataUrl: string) => void;
  carbonizationProgress: number;
  isCarbonizing: boolean;
  temperature: number;
}

export interface BambooSlipHandle {
  getCanvas: () => HTMLCanvasElement | null;
  clear: () => void;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;
const BAMBOO_COLOR = '#d4a373';
const INK_COLOR = '#2b1a0a';

const BambooSlip = forwardRef<BambooSlipHandle, BambooSlipProps>(
  ({ onImageData, carbonizationProgress, isCarbonizing, temperature }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<Point | null>(null);
    const animFrameRef = useRef<number>(0);
    const hasDrawnRef = useRef(false);

    const knifeSize = useAppStore((s) => s.knifeSize);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      clear: () => clearCanvas(),
    }));

    const drawBambooTexture = useCallback((ctx: CanvasRenderingContext2D) => {
      const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
      gradient.addColorStop(0, '#c9985c');
      gradient.addColorStop(0.3, '#d4a373');
      gradient.addColorStop(0.5, '#deb887');
      gradient.addColorStop(0.7, '#d4a373');
      gradient.addColorStop(1, '#c9985c');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      for (let i = 0; i < 40; i++) {
        const x = Math.random() * CANVAS_WIDTH;
        const y = Math.random() * CANVAS_HEIGHT;
        const w = 30 + Math.random() * 80;
        const h = 1 + Math.random() * 2;
        ctx.fillStyle = `rgba(120, 80, 40, ${0.05 + Math.random() * 0.1})`;
        ctx.fillRect(x, y, w, h);
      }

      for (let i = 0; i < 15; i++) {
        const x = (i * CANVAS_WIDTH) / 15 + (Math.random() - 0.5) * 10;
        ctx.strokeStyle = 'rgba(100, 65, 30, 0.08)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (Math.random() - 0.5) * 3, CANVAS_HEIGHT);
        ctx.stroke();
      }
    }, []);

    const clearCanvas = useCallback(() => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      drawBambooTexture(ctx);
      hasDrawnRef.current = false;
      emitImageData();
    }, [drawBambooTexture]);

    const emitImageData = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      onImageData(canvas.toDataURL('image/png'));
    }, [onImageData]);

    const spawnParticles = useCallback((x: number, y: number, pressure: number) => {
      const count = Math.floor(2 + pressure * 5);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2 * pressure;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          life: 1,
          maxLife: 12,
          size: 1 + Math.random() * 2,
          color: `rgba(${180 + Math.random() * 40}, ${140 + Math.random() * 30}, ${80 + Math.random() * 30}, 1)`,
        });
      }
    }, []);

    const drawStroke = useCallback(
      (from: Point, to: Point, pressure: number) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        const baseSize = knifeSize;
        const size = baseSize * (0.6 + pressure * 0.8);
        const alpha = 0.5 + pressure * 0.5;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = INK_COLOR;

        ctx.globalAlpha = alpha * 0.3;
        ctx.lineWidth = size * 1.3;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        ctx.globalAlpha = alpha;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        ctx.globalAlpha = 1;

        if (Math.random() < 0.4) {
          spawnParticles((from.x + to.x) / 2, (from.y + to.y) / 2, pressure);
        }

        hasDrawnRef.current = true;
      },
      [knifeSize, spawnParticles]
    );

    const getPointerData = useCallback((e: PointerEvent | React.PointerEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const nativeEvent = 'nativeEvent' in e ? (e.nativeEvent as PointerEvent) : e;
      const pressure = nativeEvent.pressure && nativeEvent.pressure > 0 ? nativeEvent.pressure : 0.5;
      return {
        x: (nativeEvent.clientX - rect.left) * scaleX,
        y: (nativeEvent.clientY - rect.top) * scaleY,
        pressure: Math.max(0.1, Math.min(1, pressure)),
      };
    }, []);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (isCarbonizing) return;
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        isDrawingRef.current = true;
        const pt = getPointerData(e);
        lastPointRef.current = pt;
      },
      [getPointerData, isCarbonizing]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isDrawingRef.current || isCarbonizing) return;
        const pt = getPointerData(e);
        const lastPt = lastPointRef.current;
        if (lastPt) {
          const dx = pt.x - lastPt.x;
          const dy = pt.y - lastPt.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.5) {
            const steps = Math.max(1, Math.floor(dist / 2));
            for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              const interPt: Point = {
                x: lastPt.x + dx * t,
                y: lastPt.y + dy * t,
                pressure: lastPt.pressure + (pt.pressure - lastPt.pressure) * t,
              };
              drawStroke(lastPointRef.current!, interPt, interPt.pressure);
              lastPointRef.current = interPt;
            }
          }
        }
        lastPointRef.current = pt;
      },
      [getPointerData, drawStroke, isCarbonizing]
    );

    const handlePointerUp = useCallback(() => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        lastPointRef.current = null;
        if (hasDrawnRef.current) {
          emitImageData();
        }
      }
    }, [emitImageData]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctxRef.current = ctx;
      drawBambooTexture(ctx);
      emitImageData();
    }, [drawBambooTexture, emitImageData]);

    useEffect(() => {
      const updateParticles = () => {
        const ctx = ctxRef.current;
        if (!ctx) {
          animFrameRef.current = requestAnimationFrame(updateParticles);
          return;
        }

        const particles = particlesRef.current;
        if (particles.length > 0) {
          const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life -= 1 / p.maxLife;

            if (p.life <= 0) {
              particles.splice(i, 1);
              continue;
            }

            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        animFrameRef.current = requestAnimationFrame(updateParticles);
      };

      animFrameRef.current = requestAnimationFrame(updateParticles);
      return () => cancelAnimationFrame(animFrameRef.current);
    }, []);

    const heatOpacity = isCarbonizing ? Math.min(0.4, (temperature / 800) * carbonizationProgress * 0.6) : 0;

    const getCarbonizedColor = () => {
      const p = carbonizationProgress;
      const r = Math.round(212 - p * 170);
      const g = Math.round(163 - p * 130);
      const b = Math.round(115 - p * 95);
      return `rgba(${r}, ${g}, ${b}, ${0.1 + p * 0.25})`;
    };

    return (
      <motion.div
        className="bamboo-wrapper"
        animate={
          isCarbonizing
            ? {
                scale: [1, 1 + 0.003 * Math.sin(Date.now() / 100), 1],
              }
            : {}
        }
        transition={{ repeat: isCarbonizing ? Infinity : 0, duration: 0.8 }}
      >
        <div className="bamboo-container">
          <div className="bamboo-lines left-lines">
            <div className="rope-line top" />
            <div className="rope-line bottom" />
          </div>

          <canvas
            ref={canvasRef}
            className={`bamboo-canvas ${isCarbonizing ? 'carbonizing' : ''}`}
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              maxWidth: '100%',
              touchAction: 'none',
              cursor: isCarbonizing ? 'not-allowed' : 'crosshair',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />

          {carbonizationProgress > 0 && (
            <div
              className="carbonization-overlay"
              style={{ backgroundColor: getCarbonizedColor() }}
            />
          )}

          {isCarbonizing && (
            <div
              className="heat-glow"
              style={{
                opacity: heatOpacity,
                background: `radial-gradient(circle at center, rgba(255, 80, 30, ${0.3 + (temperature / 800) * 0.4}) 0%, rgba(255, 50, 20, ${0.15 + (temperature / 800) * 0.2}) 40%, transparent 70%)`,
              }}
            />
          )}

          <div className="bamboo-lines right-lines">
            <div className="rope-line top" />
            <div className="rope-line bottom" />
          </div>
        </div>

        {!isCarbonizing && (
          <p className="canvas-hint">✒️ 按住鼠标或用触控笔在竹简上刻写隶书文字</p>
        )}
        {isCarbonizing && (
          <motion.p
            className="canvas-hint carbonizing-hint"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            🔥 正在火烤碳化中... {Math.round(carbonizationProgress * 100)}%
          </motion.p>
        )}
      </motion.div>
    );
  }
);

BambooSlip.displayName = 'BambooSlip';

export default BambooSlip;
