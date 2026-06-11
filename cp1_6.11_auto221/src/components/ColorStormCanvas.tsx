import { useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import gsap from 'gsap';
import type { Particle, MoodMode, PerformanceLevel, MouseState } from '../types';
import { PRESET_COLORS, MOOD_COLORS, MOOD_SPEEDS } from '../types';
import { shiftHexHue } from '../utils/colors';

interface Props {
  hueOffset: number;
  speedMultiplier: number;
  particleCount: number;
  mood: MoodMode;
  onPerformanceChange?: (level: PerformanceLevel) => void;
  onParticleCountChange?: (count: number) => void;
}

const VORTEX_RADIUS = 200;
const MAX_ROTATIONS_PER_SEC = 2;
const EXPLOSION_MAX_RADIUS = 600;
const EXPLOSION_EXPAND_DURATION = 0.5;
const EXPLOSION_CONTRACT_DURATION = 1.5;
const WHITE_FLASH_DURATION = 0.3;

export default function ColorStormCanvas({
  hueOffset,
  speedMultiplier,
  particleCount,
  mood,
  onPerformanceChange,
  onParticleCountChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<MouseState>({
    x: 0, y: 0, prevX: 0, prevY: 0, isDragging: false, moveSpeed: 0,
  });
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsTimesRef = useRef<number[]>([]);
  const configRef = useRef({ hueOffset, speedMultiplier, particleCount, mood });
  const joyfulSwitchRef = useRef({ lastSwitch: 0, currentPalette: [...PRESET_COLORS] });
  const explosionRef = useRef({ isActive: false, centerX: 0, centerY: 0, startTime: 0, isFlashWhite: false });

  configRef.current = { hueOffset, speedMultiplier, particleCount, mood };

  const getMoodPalette = useCallback((currentMood: MoodMode): string[] => {
    if (currentMood === null) return PRESET_COLORS;
    if (currentMood === 'joyful') return joyfulSwitchRef.current.currentPalette;
    return MOOD_COLORS[currentMood] || PRESET_COLORS;
  }, []);

  const getMoodOpacity = useCallback((baseOpacity: number, currentMood: MoodMode): number => {
    if (currentMood === 'melancholy') return 0.5;
    return baseOpacity;
  }, []);

  const getPerformanceBlurOpacity = useCallback((count: number) => {
    if (count > 500) return { blur: 1, opacity: 0.6 };
    return { blur: 2, opacity: 0.7 };
  }, []);

  const createParticle = useCallback((width: number, height: number): Particle => {
    const config = configRef.current;
    const palette = getMoodPalette(config.mood);
    const baseColor = palette[Math.floor(Math.random() * palette.length)];
    const perf = getPerformanceBlurOpacity(config.particleCount);
    const radius = 2 + Math.random() * 4;
    const x = Math.random() * width;
    const y = Math.random() * height;
    return {
      id: uuidv4(),
      x, y,
      baseX: x, baseY: y,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius,
      color: baseColor,
      baseColor,
      hue: 0,
      opacity: getMoodOpacity(perf.opacity, config.mood),
      baseOpacity: perf.opacity,
      blur: perf.blur,
      angle: Math.random() * Math.PI * 2,
      angularSpeed: 0,
      explosionOffsetX: 0,
      explosionOffsetY: 0,
      explosionProgress: 0,
    };
  }, [getMoodPalette, getMoodOpacity, getPerformanceBlurOpacity]);

  const initParticles = useCallback((count: number, width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(width, height));
    }
    particlesRef.current = particles;
    onParticleCountChange?.(particles.length);
  }, [createParticle, onParticleCountChange]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ece7e1');
    grad.addColorStop(1, '#d8dbe8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, []);

  const updateParticle = useCallback((p: Particle, dt: number, w: number, h: number) => {
    const config = configRef.current;
    const mouse = mouseRef.current;

    let effectiveSpeed = config.speedMultiplier;
    if (config.mood) {
      if (config.mood === 'joyful') {
        effectiveSpeed *= 0.8 + Math.random() * 1.7;
      } else {
        effectiveSpeed *= MOOD_SPEEDS[config.mood] || 1;
      }
    }

    const palette = getMoodPalette(config.mood);
    if (config.mood && palette.length > 0 && Math.random() < 0.002) {
      const newColor = palette[Math.floor(Math.random() * palette.length)];
      p.baseColor = newColor;
    }

    p.color = shiftHexHue(p.baseColor, config.hueOffset);

    const perf = getPerformanceBlurOpacity(config.particleCount);
    p.baseOpacity = perf.opacity;
    p.blur = perf.blur;
    p.opacity = getMoodOpacity(perf.opacity, config.mood);

    if (explosionRef.current.isActive) {
      const elapsed = (performance.now() - explosionRef.current.startTime) / 1000;
      if (elapsed < EXPLOSION_EXPAND_DURATION) {
        const t = elapsed / EXPLOSION_EXPAND_DURATION;
        p.explosionProgress = t;
        const angle = Math.atan2(p.baseY - explosionRef.current.centerY, p.baseX - explosionRef.current.centerX);
        const dist = EXPLOSION_MAX_RADIUS * t;
        p.explosionOffsetX = Math.cos(angle) * dist;
        p.explosionOffsetY = Math.sin(angle) * dist;
      } else if (elapsed < EXPLOSION_EXPAND_DURATION + EXPLOSION_CONTRACT_DURATION) {
        const t = (elapsed - EXPLOSION_EXPAND_DURATION) / EXPLOSION_CONTRACT_DURATION;
        const eased = 1 - (1 - t) * (1 - t);
        p.explosionProgress = 1 - eased;
        p.explosionOffsetX *= (1 - eased);
        p.explosionOffsetY *= (1 - eased);
      } else {
        explosionRef.current.isActive = false;
        p.explosionProgress = 0;
        p.explosionOffsetX = 0;
        p.explosionOffsetY = 0;
      }
    }

    if (explosionRef.current.isActive) {
      const elapsed = (performance.now() - explosionRef.current.startTime) / 1000;
      if (elapsed < WHITE_FLASH_DURATION) {
        p.color = '#ffffff';
      }
    }

    if (mouse.isDragging) {
      const dx = mouse.x - (p.x + p.explosionOffsetX);
      const dy = mouse.y - (p.y + p.explosionOffsetY);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < VORTEX_RADIUS && dist > 0) {
        const strength = 1 - dist / VORTEX_RADIUS;
        const rotSpeedFactor = Math.min(mouse.moveSpeed / 10, 1);
        const rotSpeed = MAX_ROTATIONS_PER_SEC * Math.PI * 2 * rotSpeedFactor * strength * effectiveSpeed;
        p.angularSpeed = rotSpeed * dt;

        const currentAngle = Math.atan2(dy, dx);
        const newAngle = currentAngle + p.angularSpeed * dt;
        const targetX = mouse.x - Math.cos(newAngle) * dist;
        const targetY = mouse.y - Math.sin(newAngle) * dist;

        p.x += (targetX - p.x - p.explosionOffsetX) * 0.15;
        p.y += (targetY - p.y - p.explosionOffsetY) * 0.15;
      } else if (dist > 0) {
        const pushStrength = (Math.min(dist, VORTEX_RADIUS * 3) / VORTEX_RADIUS) * 0.02 * effectiveSpeed;
        const nx = dx / dist;
        const ny = dy / dist;
        p.vx += nx * pushStrength * dt * 60;
        p.vy += ny * pushStrength * dt * 60;
      }
    }

    p.vx *= 0.98;
    p.vy *= 0.98;
    p.vx += (Math.random() - 0.5) * 0.02 * effectiveSpeed;
    p.vy += (Math.random() - 0.5) * 0.02 * effectiveSpeed;

    p.x += p.vx * effectiveSpeed * dt * 60;
    p.y += p.vy * effectiveSpeed * dt * 60;

    p.x += p.explosionOffsetX * 0.02;
    p.y += p.explosionOffsetY * 0.02;

    if (p.x < -p.radius * 2) p.x = w + p.radius * 2;
    if (p.x > w + p.radius * 2) p.x = -p.radius * 2;
    if (p.y < -p.radius * 2) p.y = h + p.radius * 2;
    if (p.y > h + p.radius * 2) p.y = -p.radius * 2;
  }, [getMoodPalette, getMoodOpacity, getPerformanceBlurOpacity]);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
    const drawX = p.x + p.explosionOffsetX;
    const drawY = p.y + p.explosionOffsetY;

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.shadowBlur = p.blur;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(drawX, drawY, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  const loop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05) : 0;
    lastTimeRef.current = timestamp;

    fpsTimesRef.current.push(timestamp);
    const cutoff = timestamp - 1000;
    fpsTimesRef.current = fpsTimesRef.current.filter((t) => t > cutoff);
    const fps = fpsTimesRef.current.length;

    const perfLevel: PerformanceLevel = configRef.current.particleCount > 500 ? 'reduced' : (fps >= 45 ? 'high' : 'reduced');
    onPerformanceChange?.(perfLevel);

    if (configRef.current.mood === 'joyful') {
      const now = performance.now();
      if (now - joyfulSwitchRef.current.lastSwitch > 2000) {
        joyfulSwitchRef.current.lastSwitch = now;
        const shuffled = [...PRESET_COLORS].sort(() => Math.random() - 0.5);
        joyfulSwitchRef.current.currentPalette = shuffled.slice(0, 2 + Math.floor(Math.random() * 3));
      }
    }

    const mouse = mouseRef.current;
    const mdx = mouse.x - mouse.prevX;
    const mdy = mouse.y - mouse.prevY;
    mouse.moveSpeed = Math.sqrt(mdx * mdx + mdy * mdy);
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    drawBackground(ctx, w, h);

    const particles = particlesRef.current;
    const targetCount = configRef.current.particleCount;

    if (particles.length !== targetCount) {
      if (particles.length < targetCount) {
        const toAdd = Math.min(targetCount - particles.length, 50);
        for (let i = 0; i < toAdd; i++) {
          particles.push(createParticle(w, h));
        }
      } else {
        particles.length = targetCount;
      }
      onParticleCountChange?.(particles.length);
    }

    for (const p of particles) {
      updateParticle(p, dt, w, h);
      drawParticle(ctx, p);
    }

    animFrameRef.current = requestAnimationFrame(loop);
  }, [createParticle, drawBackground, drawParticle, updateParticle, onPerformanceChange, onParticleCountChange]);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    mouseRef.current.x = clientX - rect.left;
    mouseRef.current.y = clientY - rect.top;
  }, []);

  const handleMouseDown = useCallback(() => {
    mouseRef.current.isDragging = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseRef.current.isDragging = false;
  }, []);

  const handleDoubleClick = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    explosionRef.current = {
      isActive: true,
      centerX: clientX - rect.left,
      centerY: clientY - rect.top,
      startTime: performance.now(),
      isFlashWhite: true,
    };

    for (const p of particlesRef.current) {
      const angle = Math.atan2(p.y - explosionRef.current.centerY, p.x - explosionRef.current.centerX);
      gsap.to(p, {
        explosionProgress: 1,
        duration: EXPLOSION_EXPAND_DURATION,
        ease: 'power2.out',
        onUpdate: function () {
          const progress = (this as unknown as { progress: number }).progress;
          const dist = EXPLOSION_MAX_RADIUS * progress;
          p.explosionOffsetX = Math.cos(angle) * dist;
          p.explosionOffsetY = Math.sin(angle) * dist;
        },
        onComplete: () => {
          gsap.to(p, {
            explosionOffsetX: 0,
            explosionOffsetY: 0,
            explosionProgress: 0,
            duration: EXPLOSION_CONTRACT_DURATION,
            ease: 'power2.out',
          });
        },
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = () => {
      resizeCanvas();
      const rect = canvas.getBoundingClientRect();
      initParticles(configRef.current.particleCount, rect.width, rect.height);
    };

    init();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('touchmove', handleMouseMove, { passive: true });
    canvas.addEventListener('touchstart', (e) => { handleMouseMove(e); handleMouseDown(); }, { passive: true });
    canvas.addEventListener('touchend', handleMouseUp);

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('orientationchange', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('touchmove', handleMouseMove);
      canvas.removeEventListener('touchstart', handleMouseDown as unknown as EventListener);
      canvas.removeEventListener('touchend', handleMouseUp);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [resizeCanvas, initParticles, handleMouseMove, handleMouseDown, handleMouseUp, handleDoubleClick, loop]);

  return <canvas ref={canvasRef} />;
}
