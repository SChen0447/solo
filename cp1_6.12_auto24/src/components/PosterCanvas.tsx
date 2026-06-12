import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { PosterConfig } from '../types';

interface PosterCanvasProps {
  config: PosterConfig;
}

export interface PosterCanvasRef {
  getCanvas: () => HTMLCanvasElement | null;
}

const PosterCanvas = forwardRef<PosterCanvasRef, PosterCanvasProps>(({ config }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const opacityRef = useRef<number>(1);
  const targetOpacityRef = useRef<number>(1);
  const lastFontRef = useRef<string>(config.font);
  const configRef = useRef<PosterConfig>(config);

  configRef.current = config;

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    if (config.font !== lastFontRef.current) {
      lastFontRef.current = config.font;
      opacityRef.current = 0;
      targetOpacityRef.current = 1;
    }
  }, [config.font]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentConfig = configRef.current;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawBackground(ctx, width, height, currentConfig.background);

      if (opacityRef.current < targetOpacityRef.current) {
        opacityRef.current = Math.min(opacityRef.current + 0.06, targetOpacityRef.current);
      } else if (opacityRef.current > targetOpacityRef.current) {
        opacityRef.current = Math.max(opacityRef.current - 0.06, targetOpacityRef.current);
      }

      ctx.globalAlpha = opacityRef.current;
      drawText(ctx, width, height, currentConfig);
      ctx.globalAlpha = 1;

      if (opacityRef.current !== targetOpacityRef.current) {
        animationRef.current = requestAnimationFrame(render);
      }
    };

    animationRef.current = requestAnimationFrame(render);

    const resizeObserver = new ResizeObserver(() => {
      animationRef.current = requestAnimationFrame(render);
    });
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      drawBackground(ctx, width, height, config.background);
      ctx.globalAlpha = opacityRef.current;
      drawText(ctx, width, height, config);
      ctx.globalAlpha = 1;
    });
  }, [config]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      />
    </div>
  );
});

PosterCanvas.displayName = 'PosterCanvas';

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: PosterConfig['background']
) {
  const { type, color1, color2 } = background;

  if (type === 'solid') {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  let gradient: CanvasGradient;

  switch (type) {
    case 'horizontal':
      gradient = ctx.createLinearGradient(0, 0, width, 0);
      break;
    case 'diagonal':
      gradient = ctx.createLinearGradient(0, 0, width, height);
      break;
    case 'radial':
      gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) / 2
      );
      break;
    default:
      ctx.fillStyle = color1;
      ctx.fillRect(0, 0, width, height);
      return;
  }

  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: PosterConfig
) {
  const { text, font, fontSize, textColor } = config;

  if (!text) return;

  ctx.font = `${fontSize}px "${font}"`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = text.split('\n');
  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  let startY = (height - totalHeight) / 2 + lineHeight / 2;

  lines.forEach((line) => {
    ctx.fillText(line, width / 2, startY);
    startY += lineHeight;
  });
}

export default PosterCanvas;
