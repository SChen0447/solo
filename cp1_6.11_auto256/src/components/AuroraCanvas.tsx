import { useRef, useEffect, useCallback } from 'react';
import { useAurora, FallingParticle, StripData, Star } from '../hooks/useAurora';

interface AuroraCanvasProps {
  geomagneticIndex: number;
  solarWindSpeed: number;
  resetTrigger: number;
}

export default function AuroraCanvas({
  geomagneticIndex,
  solarWindSpeed,
  resetTrigger,
}: AuroraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const paramsRef = useRef({ geoIndex: geomagneticIndex, solarWind: solarWindSpeed });
  const sizeRef = useRef({ w: 0, h: 0 });
  const fadeInRef = useRef<number>(1);

  const aurora = useAurora();

  useEffect(() => {
    paramsRef.current = { geoIndex: geomagneticIndex, solarWind: solarWindSpeed };
  }, [geomagneticIndex, solarWindSpeed]);

  useEffect(() => {
    fadeInRef.current = 0;
    aurora.resetParticles();
  }, [resetTrigger, aurora]);

  const drawStars = useCallback(
    (ctx: CanvasRenderingContext2D, stars: Star[], time: number) => {
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        let alpha = star.baseAlpha;
        if (star.isTwinkling) {
          const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
          alpha = 0.3 + (twinkle * 0.5 + 0.5) * 0.7;
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }
    },
    [],
  );

  const drawAuroraLayer = useCallback(
    (ctx: CanvasRenderingContext2D, strips: StripData[], layerIdx: number) => {
      const layer = aurora.AURORA_LAYERS[layerIdx];

      for (let i = 0; i < strips.length; i++) {
        const strip = strips[i];
        const stripHeight = strip.bottomY - strip.topY;
        if (stripHeight <= 0) continue;

        const gradient = ctx.createLinearGradient(
          strip.x,
          strip.topY,
          strip.x,
          strip.bottomY,
        );

        const r = strip.colorR;
        const g = strip.colorG;
        const b = strip.colorB;
        const baseOpacity = layer.opacity;

        gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
        gradient.addColorStop(0.05, `rgba(${r},${g},${b},${baseOpacity * 0.3})`);
        gradient.addColorStop(0.15, `rgba(${r},${g},${b},${baseOpacity * 0.8})`);
        gradient.addColorStop(0.4, `rgba(${r},${g},${b},${baseOpacity})`);
        gradient.addColorStop(0.7, `rgba(${r},${g},${b},${baseOpacity * 0.6})`);
        gradient.addColorStop(0.9, `rgba(${r},${g},${b},${baseOpacity * 0.2})`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.beginPath();

        const leftX = strip.x;
        const rightX = strip.x + aurora.STRIP_WIDTH;

        ctx.moveTo(leftX + strip.jaggedOffsets[0], strip.topY);
        for (let j = 1; j < aurora.VERTICAL_SAMPLES; j++) {
          const jt = j / aurora.VERTICAL_SAMPLES;
          const y = strip.topY + jt * stripHeight;
          const offsetX = strip.jaggedOffsets[j];

          if (strip.hasFracture) {
            const fracStartT = strip.fractureY / stripHeight;
            const fracEndT = (strip.fractureY + strip.fractureHeight) / stripHeight;
            if (jt >= fracStartT && jt <= fracEndT) {
              if (jt <= fracStartT + 0.01) {
                ctx.lineTo(leftX + offsetX, y);
                ctx.lineTo(leftX + offsetX + aurora.STRIP_WIDTH * 0.3, y);
              }
              continue;
            }
          }

          ctx.lineTo(leftX + offsetX, y);
        }

        for (let j = aurora.VERTICAL_SAMPLES - 1; j >= 0; j--) {
          const jt = j / aurora.VERTICAL_SAMPLES;
          const y = strip.topY + jt * stripHeight;
          const offsetX = strip.jaggedOffsets[j] * 0.7;

          if (strip.hasFracture) {
            const fracStartT = strip.fractureY / stripHeight;
            const fracEndT = (strip.fractureY + strip.fractureHeight) / stripHeight;
            if (jt >= fracStartT && jt <= fracEndT) {
              if (jt >= fracEndT - 0.01) {
                ctx.lineTo(rightX + offsetX - aurora.STRIP_WIDTH * 0.3, y);
                ctx.lineTo(rightX + offsetX, y);
              }
              continue;
            }
          }

          ctx.lineTo(rightX + offsetX, y);
        }

        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    },
    [aurora],
  );

  const drawFallingParticle = useCallback(
    (ctx: CanvasRenderingContext2D, particle: FallingParticle) => {
      const lifeRatio = particle.life / particle.maxLife;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = particle.color.replace('rgb', 'rgba').replace(')', `,${lifeRatio})`);
      ctx.fill();

      if (particle.size > 4) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace('rgb', 'rgba').replace(')', `,${lifeRatio * 0.15})`);
        ctx.fill();
      }

      if (particle.trail.length > 1) {
        for (let i = 1; i < particle.trail.length; i++) {
          const prev = particle.trail[i - 1];
          const curr = particle.trail[i];
          const trailAlpha = (i / particle.trail.length) * lifeRatio * 0.6;
          const trailWidth = (i / particle.trail.length) * particle.size * 0.8;

          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.strokeStyle = particle.color.replace('rgb', 'rgba').replace(')', `,${trailAlpha})`);
          ctx.lineWidth = trailWidth;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }
    },
    [],
  );

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#050510');
    gradient.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      aurora.initStars(w, h);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
      }
      const dt = Math.min((timestamp - lastTimestampRef.current) / 1000, 0.05);
      lastTimestampRef.current = timestamp;
      timeRef.current += dt;

      if (fadeInRef.current < 1) {
        fadeInRef.current = Math.min(1, fadeInRef.current + dt * 2);
      }

      const { w, h } = sizeRef.current;
      const { geoIndex, solarWind } = paramsRef.current;
      const time = timeRef.current;

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = fadeInRef.current;

      drawBackground(ctx, w, h);

      drawStars(ctx, aurora.starsRef.current, time);

      const allStrips: StripData[][] = [];
      for (let layerIdx = 0; layerIdx < aurora.AURORA_LAYERS.length; layerIdx++) {
        const strips = aurora.computeStrips(layerIdx, w, h, time, geoIndex, solarWind);
        allStrips.push(strips);
      }

      for (let layerIdx = aurora.AURORA_LAYERS.length - 1; layerIdx >= 0; layerIdx--) {
        drawAuroraLayer(ctx, allStrips[layerIdx], layerIdx);
      }

      const mainStrips = allStrips[0];
      if (mainStrips) {
        aurora.spawnFallingParticles(mainStrips, geoIndex, solarWind, h);
      }

      const particles = aurora.updateFallingParticles(dt, h);
      for (let i = 0; i < particles.length; i++) {
        drawFallingParticle(ctx, particles[i]);
      }

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [aurora, drawBackground, drawStars, drawAuroraLayer, drawFallingParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="aurora-canvas"
    />
  );
}
