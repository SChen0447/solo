import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RecipeElements, RecipeConditions } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  type: 'stardust' | 'lightdust' | 'darkmatter';
  alpha: number;
  life: number;
  maxLife: number;
}

interface EffectParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

interface WaveEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface Props {
  elements: RecipeElements;
  conditions: RecipeConditions;
  onDrop: (type: keyof RecipeElements) => void;
  onShake?: () => void;
  synthesisTrigger: number;
  synthesisSuccess: boolean | null;
  onSynthesisAnimEnd: () => void;
}

const FLASK_COLORS = {
  stardust: '#ffcc66',
  lightdust: '#66aaff',
  darkmatter: '#6633cc'
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mixLiquidColor(elements: RecipeElements): string {
  const total = elements.stardust + elements.lightdust + elements.darkmatter;
  if (total === 0) return 'rgba(30, 20, 60, 0.3)';
  let r = 0, g = 0, b = 0;
  (['stardust', 'lightdust', 'darkmatter'] as const).forEach(key => {
    const [cr, cg, cb] = hexToRgb(FLASK_COLORS[key]);
    r += cr * elements[key];
    g += cg * elements[key];
    b += cb * elements[key];
  });
  return `rgba(${Math.round(r / total)}, ${Math.round(g / total)}, ${Math.round(b / total)}, 0.45)`;
}

export default function Flask({
  elements, conditions, onDrop, onShake,
  synthesisTrigger, synthesisSuccess, onSynthesisAnimEnd
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const effectParticlesRef = useRef<EffectParticle[]>([]);
  const wavesRef = useRef<WaveEffect[]>([]);
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ w: 400, h: 500 });
  const lastElementsRef = useRef(elements);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [draggingOver, setDraggingOver] = useState(false);

  const spawnParticle = useCallback((type: 'stardust' | 'lightdust' | 'darkmatter') => {
    const { w, h } = sizeRef.current;
    const cx = w / 2;
    const liquidY = h * 0.55;
    const count = type === 'darkmatter' ? 5 : type === 'lightdust' ? 7 : 6;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      particlesRef.current.push({
        x: cx + (Math.random() - 0.5) * w * 0.3,
        y: liquidY + (Math.random() - 0.5) * h * 0.2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        size: type === 'darkmatter' ? 4 + Math.random() * 4 : type === 'lightdust' ? 6 + Math.random() * 5 : 3 + Math.random() * 3,
        color: FLASK_COLORS[type],
        type,
        alpha: 0.7 + Math.random() * 0.3,
        life: 0,
        maxLife: 300 + Math.random() * 400
      });
    }
  }, []);

  useEffect(() => {
    const diff = {
      stardust: elements.stardust - lastElementsRef.current.stardust,
      lightdust: elements.lightdust - lastElementsRef.current.lightdust,
      darkmatter: elements.darkmatter - lastElementsRef.current.darkmatter
    };
    (['stardust', 'lightdust', 'darkmatter'] as const).forEach(key => {
      for (let i = 0; i < diff[key]; i++) spawnParticle(key);
    });
    if (diff.stardust > 0 || diff.lightdust > 0 || diff.darkmatter > 0) {
      setShakeTrigger(s => s + 1);
      onShake?.();
    }
    lastElementsRef.current = elements;
  }, [elements, spawnParticle, onShake]);

  const triggerExplosion = useCallback(() => {
    const { w, h } = sizeRef.current;
    const cx = w / 2;
    const cy = h * 0.55;
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      const t = Math.random();
      const r = Math.round(255 * (1 - t) + 68 * t);
      const g = Math.round(68 * (1 - t) + 34 * t);
      const b = Math.round(34 * (1 - t) + 255 * t);
      effectParticlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        color: `rgb(${r},${g},${b})`,
        alpha: 1,
        life: 0
      });
    }
  }, []);

  const triggerWave = useCallback(() => {
    const { w, h } = sizeRef.current;
    wavesRef.current.push({
      x: w / 2,
      y: h * 0.55,
      radius: 5,
      maxRadius: Math.max(w, h) * 0.8,
      alpha: 1
    });
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const t = Math.random();
      const r = Math.round(255 * (1 - t) + 136 * t);
      const g = Math.round(221 * (1 - t) + 221 * t);
      const b = Math.round(136 * (1 - t) + 255 * t);
      effectParticlesRef.current.push({
        x: w / 2,
        y: h * 0.55,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: `rgb(${r},${g},${b})`,
        alpha: 1,
        life: 0
      });
    }
  }, []);

  useEffect(() => {
    if (synthesisTrigger === 0) return;
    if (synthesisSuccess === true) {
      triggerWave();
    } else if (synthesisSuccess === false) {
      triggerExplosion();
      setShakeTrigger(s => s + 1);
    }
    const timer = setTimeout(() => onSynthesisAnimEnd(), 2000);
    return () => clearTimeout(timer);
  }, [synthesisTrigger, synthesisSuccess, triggerWave, triggerExplosion, onSynthesisAnimEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    let lastTime = performance.now();

    const drawFlaskShape = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.save();
      const cx = w / 2;
      const neckTop = h * 0.08;
      const neckBottom = h * 0.28;
      const neckWidth = w * 0.18;
      const bodyTop = neckBottom;
      const bodyBottom = h * 0.92;
      const bodyRadius = w * 0.42;

      ctx.beginPath();
      ctx.moveTo(cx - neckWidth / 2, neckTop);
      ctx.lineTo(cx - neckWidth / 2, neckBottom);
      ctx.quadraticCurveTo(cx - bodyRadius * 0.7, neckBottom + 20, cx - bodyRadius, bodyBottom - bodyRadius * 0.6);
      ctx.quadraticCurveTo(cx - bodyRadius * 1.05, bodyBottom + 10, cx, bodyBottom);
      ctx.quadraticCurveTo(cx + bodyRadius * 1.05, bodyBottom + 10, cx + bodyRadius, bodyBottom - bodyRadius * 0.6);
      ctx.quadraticCurveTo(cx + bodyRadius * 0.7, neckBottom + 20, cx + neckWidth / 2, neckBottom);
      ctx.lineTo(cx + neckWidth / 2, neckTop);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      return { cx, neckTop, neckBottom, neckWidth, bodyTop, bodyBottom, bodyRadius };
    };

    const isInsideFlask = (x: number, y: number, shape: ReturnType<typeof drawFlaskShape>) => {
      const { cx, bodyBottom, bodyRadius } = shape;
      const cy = bodyBottom - bodyRadius * 0.5;
      const dx = x - cx;
      const dy = y - cy;
      return (dx * dx) / (bodyRadius * bodyRadius) + (dy * dy) / ((bodyRadius * 0.85) ** 2) < 0.92;
    };

    const animate = (time: number) => {
      const dt = Math.min(32, time - lastTime) / 16;
      lastTime = time;
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      const shape = drawFlaskShape(ctx, w, h);
      const { cx, bodyBottom, bodyRadius } = shape;
      const cy = bodyBottom - bodyRadius * 0.5;
      const liquidColor = mixLiquidColor(elements);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, bodyRadius * 0.92, bodyRadius * 0.78, 0, 0, Math.PI * 2);
      ctx.clip();

      const grad = ctx.createLinearGradient(cx, cy - bodyRadius, cx, cy + bodyRadius);
      grad.addColorStop(0, liquidColor);
      grad.addColorStop(1, liquidColor.replace(/[\d.]+\)/, '0.7)'));
      ctx.fillStyle = grad;
      ctx.fillRect(cx - bodyRadius, cy - bodyRadius, bodyRadius * 2, bodyRadius * 2);

      const stirRate = conditions.stirRate / 100;
      const tempFactor = conditions.temperature / 100;
      const pressureFactor = conditions.pressure;

      particlesRef.current = particlesRef.current.filter(p => {
        p.life += dt;
        if (p.life > p.maxLife) return false;

        const rotSpeed = (0.01 + stirRate * 0.04) * dt;
        const dx = p.x - cx;
        const dy = p.y - cy;
        const cos = Math.cos(rotSpeed);
        const sin = Math.sin(rotSpeed);
        const nx = dx * cos - dy * sin;
        const ny = dx * sin + dy * cos;
        p.x = cx + nx + p.vx * dt * (1 + stirRate * 2);
        p.y = cy + ny + p.vy * dt * (1 + stirRate * 2);

        p.vy += (0.02 + tempFactor * 0.03) * dt;
        p.vx *= 0.99;
        p.vy *= 0.99;

        const rdx = p.x - cx;
        const rdy = p.y - cy;
        const distSq = rdx * rdx / (bodyRadius * bodyRadius * 0.82) + rdy * rdy / ((bodyRadius * 0.7) ** 2);
        if (distSq > 1) {
          const angle = Math.atan2(rdy, rdx);
          p.x = cx + Math.cos(angle) * bodyRadius * 0.7;
          p.y = cy + Math.sin(angle) * bodyRadius * 0.6;
          p.vx = -p.vx * 0.5;
          p.vy = -p.vy * 0.5;
        }
        if (p.y < cy - bodyRadius * 0.6) {
          p.y = cy - bodyRadius * 0.6;
          p.vy = Math.abs(p.vy) * 0.4;
        }

        const glowIntensity = 0.4 + stirRate * 0.3 + pressureFactor * 0.1;
        ctx.save();
        ctx.globalAlpha = p.alpha * glowIntensity;
        if (p.type === 'lightdust') {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, p.color + '00');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'stardust') {
          ctx.shadowBlur = 12;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          for (let i = 0; i < 3; i++) {
            ctx.globalAlpha = p.alpha * 0.5 * glowIntensity;
            ctx.beginPath();
            ctx.arc(p.x + (Math.random() - 0.5) * p.size, p.y + (Math.random() - 0.5) * p.size, p.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        return true;
      });

      wavesRef.current = wavesRef.current.filter(wave => {
        wave.radius += (wave.maxRadius - wave.radius) * 0.04 * dt;
        wave.alpha -= 0.012 * dt;
        if (wave.alpha <= 0) return false;
        ctx.save();
        ctx.globalAlpha = wave.alpha;
        const t = 1 - wave.radius / wave.maxRadius;
        const r = Math.round(255 * t + 136 * (1 - t));
        const g = Math.round(221);
        const b = Math.round(136 * t + 255 * (1 - t));
        const gradient = ctx.createRadialGradient(wave.x, wave.y, wave.radius * 0.8, wave.x, wave.y, wave.radius);
        gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
        gradient.addColorStop(0.8, `rgba(${r},${g},${b},${wave.alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${wave.alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        return true;
      });

      effectParticlesRef.current = effectParticlesRef.current.filter(ep => {
        ep.life += dt;
        ep.x += ep.vx * dt;
        ep.y += ep.vy * dt;
        ep.vy += 0.08 * dt;
        ep.alpha -= 0.018 * dt;
        if (ep.alpha <= 0) return false;
        ctx.save();
        ctx.globalAlpha = ep.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ep.color;
        ctx.fillStyle = ep.color;
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      if (conditions.temperature < 0) {
        ctx.save();
        const frostAlpha = Math.min(0.5, -conditions.temperature / 150);
        ctx.globalAlpha = frostAlpha;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.5;
        const seed = Math.floor(time / 100) % 100;
        for (let i = 0; i < 15; i++) {
          const angle = ((seed + i * 37) % 360) * Math.PI / 180;
          const rx = cx + Math.cos(angle) * bodyRadius * 0.85;
          const ry = cy + Math.sin(angle) * bodyRadius * 0.7;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          for (let j = 0; j < 4; j++) {
            const len = 10 + ((seed * (i + 1) + j * 13) % 15);
            const a = angle + (j - 1.5) * 0.4;
            ctx.lineTo(rx + Math.cos(a) * len, ry + Math.sin(a) * len);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      if (conditions.temperature > 100) {
        ctx.save();
        const steamAlpha = Math.min(0.6, (conditions.temperature - 100) / 200);
        for (let i = 0; i < 8; i++) {
          const phase = (time / 1000 + i * 0.3) % 1;
          const sx = cx + ((i * 37 + Math.floor(time / 500)) % 80) - 40;
          const sy = cy - bodyRadius * 0.5 - phase * bodyRadius * 0.6;
          const ss = 10 + phase * 25;
          const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, ss);
          gradient.addColorStop(0, `rgba(255,255,255,${steamAlpha * (1 - phase) * 0.6})`);
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(sx, sy, ss, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();

      const highlightGrad = ctx.createLinearGradient(cx - bodyRadius, cy, cx + bodyRadius, cy);
      highlightGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
      highlightGrad.addColorStop(0.3, 'rgba(255,255,255,0)');
      highlightGrad.addColorStop(0.7, 'rgba(255,255,255,0)');
      highlightGrad.addColorStop(1, 'rgba(255,255,255,0.08)');
      ctx.fillStyle = highlightGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, bodyRadius * 0.9, bodyRadius * 0.76, 0, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [elements, conditions]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(true);
  };
  const handleDragLeave = () => setDraggingOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(false);
    const type = e.dataTransfer.getData('element-type') as keyof RecipeElements;
    if (type && (type === 'stardust' || type === 'lightdust' || type === 'darkmatter')) {
      onDrop(type);
    }
  };

  return (
    <div
      ref={containerRef}
      className={shakeTrigger % 2 === 0 ? 'shake' : ''}
      key={shakeTrigger}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 480,
        background: 'linear-gradient(180deg, #0a0a1a, #1a1a2a)',
        borderRadius: 24,
        border: draggingOver ? '3px solid rgba(255,204,102,0.6)' : '3px solid rgba(255,255,255,0.08)',
        boxShadow: draggingOver
          ? '0 0 40px rgba(255,204,102,0.25), inset 0 0 60px rgba(255,204,102,0.08)'
          : 'inset 0 0 80px rgba(0,0,0,0.4)',
        transition: 'all 0.3s var(--ease-out)',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <div style={{
        position: 'absolute', top: 20, left: 0, right: 0,
        textAlign: 'center', pointerEvents: 'none'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 16px',
          background: 'rgba(10,5,24,0.6)',
          borderRadius: 20,
          border: '1px solid var(--border-light)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(4px)'
        }}>
          {draggingOver ? '✦ 松开以添加元素 ✦' : '拖拽元素到此处 ✧'}
        </div>
      </div>
    </div>
  );
}
