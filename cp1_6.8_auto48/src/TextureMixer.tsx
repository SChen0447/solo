import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { MixState, TEXTURE_LIST, BLEND_MODES } from './types';
import { getColoredTexture } from './utils/textureGenerator';
import { applyBlendMode, resetBlendMode } from './utils/blendModes';
import '../styles/TextureMixer.css';

export interface TextureMixerRef {
  getCanvas: () => HTMLCanvasElement | null;
  captureThumbnail: (size: number) => string;
}

interface TextureMixerProps {
  mixState: MixState;
  transitionType: 'none' | 'dissolve' | 'wipe';
  onTransitionEnd?: () => void;
}

export const TextureMixer = forwardRef<TextureMixerRef, TextureMixerProps>(
  function TextureMixer({ mixState, transitionType, onTransitionEnd }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const prevCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const transitionProgressRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      captureThumbnail: (size: number) => {
        if (!canvasRef.current) return '';
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.drawImage(canvasRef.current, 0, 0, size, size);
        return canvas.toDataURL('image/png');
      },
    }));

    const getTextureName = (type: string) => {
      return TEXTURE_LIST.find(t => t.id === type)?.name || type;
    };

    const getBlendModeName = (mode: string) => {
      return BLEND_MODES.find(m => m.id === mode)?.name || mode;
    };

    const renderTexture = (ctx: CanvasRenderingContext2D, state: MixState) => {
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      const textureA = getColoredTexture(state.textureA, state.colorA);
      const textureB = getColoredTexture(state.textureB, state.colorB);

      ctx.globalAlpha = state.opacityA / 100;
      ctx.drawImage(textureA, 0, 0, w, h);

      applyBlendMode(ctx, state.blendMode);
      ctx.globalAlpha = (state.opacityB / 100) * (state.intensity / 100);
      ctx.drawImage(textureB, 0, 0, w, h);

      resetBlendMode(ctx);
      ctx.globalAlpha = 1;

      const formulaText = `${getBlendModeName(state.blendMode)}: ${getTextureName(state.textureA)}(${state.opacityA}%) + ${getTextureName(state.textureB)}(${state.opacityB}%)`;
      
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(8, 8, ctx.measureText(formulaText).width + 20, 28);
      
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      ctx.fillText(formulaText, 16, 13);
    };

    const startDissolveTransition = (newState: MixState) => {
      if (!canvasRef.current || !prevCanvasRef.current) return;

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const prevCtx = prevCanvasRef.current.getContext('2d');
      if (!prevCtx) return;

      prevCtx.canvas.width = ctx.canvas.width;
      prevCtx.canvas.height = ctx.canvas.height;
      prevCtx.drawImage(ctx.canvas, 0, 0);

      setIsTransitioning(true);
      transitionProgressRef.current = 0;

      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        transitionProgressRef.current = progress;

        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(prevCtx.canvas, 0, 0);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          renderTexture(tempCtx, newState);
          
          const imageData = tempCtx.getImageData(0, 0, w, h);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % w;
            const y = Math.floor((i / 4) / w);
            const hash = (x * 13 + y * 7) % 100 / 100;
            if (hash > progress) {
              data[i + 3] = 0;
            }
          }
          
          tempCtx.putImageData(imageData, 0, 0);
        }

        ctx.globalAlpha = progress;
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.globalAlpha = 1;

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setIsTransitioning(false);
          renderTexture(ctx, newState);
          onTransitionEnd?.();
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const startWipeTransition = (newState: MixState) => {
      if (!canvasRef.current || !prevCanvasRef.current) return;

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const prevCtx = prevCanvasRef.current.getContext('2d');
      if (!prevCtx) return;

      prevCtx.canvas.width = ctx.canvas.width;
      prevCtx.canvas.height = ctx.canvas.height;
      prevCtx.drawImage(ctx.canvas, 0, 0);

      setIsTransitioning(true);
      transitionProgressRef.current = 0;

      const duration = 400;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        transitionProgressRef.current = progress;

        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const wipeX = w * progress;

        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.beginPath();
        ctx.rect(wipeX, 0, w - wipeX, h);
        ctx.clip();
        ctx.drawImage(prevCtx.canvas, 0, 0);
        ctx.restore();

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          renderTexture(tempCtx, newState);
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, wipeX, h);
        ctx.clip();
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setIsTransitioning(false);
          renderTexture(ctx, newState);
          onTransitionEnd?.();
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      if (isTransitioning) return;

      if (transitionType === 'dissolve') {
        startDissolveTransition(mixState);
      } else if (transitionType === 'wipe') {
        startWipeTransition(mixState);
      } else {
        renderTexture(ctx, mixState);
      }
    }, [mixState, transitionType]);

    useEffect(() => {
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, []);

    return (
      <div className="texture-mixer">
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            className="preview-canvas"
          />
          <canvas
            ref={prevCanvasRef}
            width={512}
            height={512}
            className="hidden-canvas"
          />
        </div>
      </div>
    );
  }
);
