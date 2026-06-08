import { useRef, useCallback, useEffect } from 'react';
import debounce from 'lodash/debounce';
import { MixState } from '../types';
import { getColoredTexture } from '../utils/textureGenerator';
import { applyBlendMode, resetBlendMode } from '../utils/blendModes';

interface UseTextureMixerOptions {
  canvasSize?: number;
  debounceMs?: number;
}

export function useTextureMixer(options: UseTextureMixerOptions = {}) {
  const { canvasSize = 512, debounceMs = 16 } = options;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderRequestRef = useRef<number | null>(null);

  const render = useCallback((state: MixState) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

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
  }, []);

  const debouncedRender = useRef(
    debounce((state: MixState) => {
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
      renderRequestRef.current = requestAnimationFrame(() => {
        render(state);
        renderRequestRef.current = null;
      });
    }, debounceMs, { leading: false, trailing: true })
  ).current;

  const renderImmediate = useCallback((state: MixState) => {
    render(state);
  }, [render]);

  useEffect(() => {
    return () => {
      debouncedRender.cancel();
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
    };
  }, [debouncedRender]);

  return {
    canvasRef,
    render: debouncedRender,
    renderImmediate,
  };
}
