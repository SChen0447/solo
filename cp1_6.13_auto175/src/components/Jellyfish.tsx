import { useEffect, useRef, useCallback } from 'react';
import type { JellyfishStateData, Tentacle, TentacleJoint } from '../App';

interface JellyfishProps {
  state: JellyfishStateData;
  onStateUpdate: (updater: (prev: JellyfishStateData) => JellyfishStateData) => void;
  userId: string;
}

interface FoodParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface GlowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

const FOOD_COLORS = ['#ff6b9d', '#feca57', '#48dbfb', '#1dd1a1', '#ff9f43', '#5f27cd'];

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function Jellyfish({ state, onStateUpdate, userId }: JellyfishProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const stateRef = useRef<JellyfishStateData>(state);
  const lastTimeRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, hovering: false });
  const dragRef = useRef<{
    tentacleIdx: number;
    jointIdx: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const bounceAnimRef = useRef<{
    tentacleIdx: number;
    jointIdx: number;
    startTime: number;
    duration: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }[]>([]);
  const feedAnimRef = useRef<{ startTime: number; duration: number } | null>(null);
  const foodParticlesRef = useRef<FoodParticle[]>([]);
  const glowParticlesRef = useRef<GlowParticle[]>([]);
  const hoverFloatRef = useRef(0);
  const colorTransitionRef = useRef<{
    fromBody: string;
    toBody: string;
    fromGlow: string;
    toGlow: string;
    startTime: number;
    bodyDuration: number;
    glowStartTime: number;
    glowDuration: number;
    tentacleIndex: number;
  } | null>(null);
  const prevBodyColorRef = useRef(state.bodyColor);
  const prevGlowColorRef = useRef(state.glowColor);
  const sandNoiseRef = useRef<number[][] | null>(null);
  const dprRef = useRef(1);

  useEffect(() => {
    if (state.bodyColor !== prevBodyColorRef.current && colorTransitionRef.current === null) {
      colorTransitionRef.current = {
        fromBody: prevBodyColorRef.current,
        toBody: state.bodyColor,
        fromGlow: prevGlowColorRef.current,
        toGlow: state.glowColor,
        startTime: performance.now(),
        bodyDuration: 1500,
        glowStartTime: performance.now(),
        glowDuration: state.tentacles.length * 200 + 400,
        tentacleIndex: 0
      };
      prevBodyColorRef.current = state.bodyColor;
    }
    if (state.glowColor !== prevGlowColorRef.current && colorTransitionRef.current === null) {
      colorTransitionRef.current = {
        fromBody: prevBodyColorRef.current,
        toBody: state.bodyColor,
        fromGlow: prevGlowColorRef.current,
        toGlow: state.glowColor,
        startTime: performance.now(),
        bodyDuration: 1500,
        glowStartTime: performance.now(),
        glowDuration: state.tentacles.length * 200 + 400,
        tentacleIndex: 0
      };
      prevGlowColorRef.current = state.glowColor;
    }
    stateRef.current = state;
  }, [state]);

  const generateSandNoise = useCallback((w: number, h: number) => {
    const noise: number[][] = [];
    const step = 4;
    for (let y = 0; y < h; y += step) {
      const row: number[] = [];
      for (let x = 0; x < w; x += step) {
        row.push(Math.random());
      }
      noise.push(row);
    }
    sandNoiseRef.current = noise;
  }, []);

  const getEffectiveBodyColor = useCallback((now: number): string => {
    const ct = colorTransitionRef.current;
    if (!ct) return stateRef.current.bodyColor;
    const t = Math.min(1, (now - ct.startTime) / ct.bodyDuration);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return interpolateColor(ct.fromBody, ct.toBody, eased);
  }, []);

  const getEffectiveGlowColorForTentacle = useCallback((tentacleIdx: number, total: number, now: number): string => {
    const ct = colorTransitionRef.current;
    if (!ct) return stateRef.current.glowColor;
    const delay = tentacleIdx * 200;
    const localT = Math.max(0, Math.min(1, (now - ct.glowStartTime - delay) / 400));
    if (localT <= 0) return ct.fromGlow;
    if (localT >= 1) return ct.toGlow;
    return interpolateColor(ct.fromGlow, ct.toGlow, localT);
  }, []);

  function interpolateColor(c1: string, c2: string, t: number): string {
    const p1 = hexToRgb(c1);
    const p2 = hexToRgb(c2);
    if (!p1 || !p2) return c2;
    const r = Math.round(lerp(p1.r, p2.r, t));
    const g = Math.round(lerp(p1.g, p2.g, t));
    const b = Math.round(lerp(p1.b, p2.b, t));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  const handleFeed = useCallback(() => {
    const now = performance.now();
    feedAnimRef.current = { startTime: now, duration: 300 };
    const st = stateRef.current;
    const numParticles = 6;
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2 + Math.random() * 0.3;
      const dist = st.radius * 3 + Math.random() * 50;
      const startX = st.x + Math.cos(angle) * dist;
      const startY = st.y + Math.sin(angle) * dist;
      const dx = st.x - startX;
      const dy = (st.y - st.radius * 0.2) - startY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const speed = 180 + Math.random() * 60;
      foodParticlesRef.current.push({
        x: startX,
        y: startY,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        color: FOOD_COLORS[i % FOOD_COLORS.length],
        life: 0,
        maxLife: 1.2,
        size: 4 + Math.random() * 3
      });
    }
    onStateUpdate(prev => {
      const newFeedCount = prev.feedCount + 1;
      const sizeIncrements = Math.floor(newFeedCount / 5);
      const newBaseRadius = prev.baseRadius * (1 + sizeIncrements * 0.05);
      return {
        ...prev,
        feedCount: newFeedCount,
        radius: newBaseRadius,
        baseRadius: newBaseRadius,
        mood: Math.min(100, prev.mood + 5)
      };
    });
  }, [onStateUpdate]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sandH = Math.min(window.innerHeight * (window.innerWidth >= 1440 ? 0.3 : 0.25), window.innerHeight * 0.3);
    generateSandNoise(w, sandH);
  }, [generateSandNoise]);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mouseRef.current.x = mx;
    mouseRef.current.y = my;
    const st = stateRef.current;
    for (let ti = 0; ti < st.tentacles.length; ti++) {
      const tentacle = st.tentacles[ti];
      for (let ji = 0; ji < tentacle.joints.length; ji++) {
        const j = tentacle.joints[ji];
        const wx = st.x + j.x;
        const wy = st.y + j.y;
        const dx = mx - wx;
        const dy = my - wy;
        if (dx * dx + dy * dy < 144) {
          dragRef.current = {
            tentacleIdx: ti,
            jointIdx: ji,
            offsetX: dx,
            offsetY: dy
          };
          canvas.setPointerCapture(e.pointerId);
          return;
        }
      }
    }
    const dxc = mx - st.x;
    const dyc = my - st.y;
    const radius = getCurrentRadius();
    if (dxc * dxc + dyc * dyc < radius * radius) {
      handleFeed();
    }
  }, [handleFeed]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mouseRef.current.x = mx;
    mouseRef.current.y = my;
    const st = stateRef.current;
    const dx = mx - st.x;
    const dy = my - st.y;
    const r = getCurrentRadius();
    mouseRef.current.hovering = dx * dx + dy * dy < (r + 20) * (r + 20);
    if (dragRef.current) {
      const drag = dragRef.current;
      const newX = mx - drag.offsetX - st.x;
      const newY = my - drag.offsetY - st.y;
      onStateUpdate(prev => {
        const newTentacles = prev.tentacles.map((t, ti) => {
          if (ti !== drag.tentacleIdx) return t;
          return {
            joints: t.joints.map((j, ji) => {
              if (ji !== drag.jointIdx) return j;
              return { ...j, x: newX, y: newY };
            })
          };
        });
        return { ...prev, tentacles: newTentacles };
      });
    }
  }, [onStateUpdate]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (dragRef.current) {
      const canvas = canvasRef.current;
      if (canvas) canvas.releasePointerCapture(e.pointerId);
      const drag = dragRef.current;
      const st = stateRef.current;
      const joint = st.tentacles[drag.tentacleIdx].joints[drag.jointIdx];
      bounceAnimRef.current.push({
        tentacleIdx: drag.tentacleIdx,
        jointIdx: drag.jointIdx,
        startTime: performance.now(),
        duration: 500,
        startX: joint.x,
        startY: joint.y,
        endX: joint.baseX,
        endY: joint.baseY
      });
      dragRef.current = null;
    }
  }, []);

  function getCurrentRadius(): number {
    const st = stateRef.current;
    if (!feedAnimRef.current) return st.radius;
    const t = (performance.now() - feedAnimRef.startTime) / feedAnimRef.duration;
    if (t >= 1) {
      feedAnimRef.current = null;
      return st.radius;
    }
    return st.radius * (1 + 0.2 * Math.sin(t * Math.PI));
  }

  const render = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const waterH = h * (window.innerWidth >= 1440 ? 0.7 : 0.75);
    const sandH = h - waterH;

    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, waterH);
    bgGrad.addColorStop(0, '#0b1d3a');
    bgGrad.addColorStop(1, '#020a1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, waterH);

    for (let i = 0; i < 30; i++) {
      const px = ((i * 137.5 + now * 0.01) % w);
      const py = ((i * 73.3 + now * 0.005 * (i % 3 + 1)) % waterH);
      const size = 0.5 + (i % 3) * 0.4;
      const alpha = 0.1 + (i % 5) * 0.04;
      ctx.fillStyle = `rgba(150, 200, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const sandGrad = ctx.createLinearGradient(0, waterH, 0, h);
    sandGrad.addColorStop(0, '#2a3a2a');
    sandGrad.addColorStop(1, '#1a251a');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, waterH, w, sandH);

    if (sandNoiseRef.current) {
      const noise = sandNoiseRef.current;
      const step = 4;
      for (let y = 0; y < noise.length && y * step < sandH; y++) {
        const row = noise[y];
        for (let x = 0; x < row.length && x * step < w; x++) {
          const v = row[x];
          if (v < 0.15) {
            const alpha = (0.15 - v) * 2;
            ctx.fillStyle = `rgba(60, 80, 50, ${alpha})`;
            ctx.fillRect(x * step, waterH + y * step, step, step);
          } else if (v > 0.9) {
            const alpha = (v - 0.9) * 2;
            ctx.fillStyle = `rgba(120, 150, 100, ${alpha * 0.5})`;
            ctx.fillRect(x * step, waterH + y * step, step, step);
          }
        }
      }
    }

    const st = stateRef.current;
    const effectiveBodyColor = getEffectiveBodyColor(now);
    const radius = getCurrentRadius();

    let drawX = st.x;
    let drawY = st.y;
    if (mouseRef.current.hovering) {
      hoverFloatRef.current += 1 / 60;
      const floatY = Math.sin(hoverFloatRef.current * Math.PI) * 10;
      drawY += floatY;
    }

    glowParticlesRef.current = glowParticlesRef.current.filter(p => {
      p.life -= 1 / 60;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      if (p.life <= 0) return false;
      const alpha = Math.min(1, p.life * 2);
      const rgb = hexToRgb(effectiveBodyColor);
      const colorStr = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.7})` : `rgba(255,255,255,${alpha * 0.7})`;
      ctx.fillStyle = colorStr;
      ctx.shadowBlur = 8;
      ctx.shadowColor = colorStr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      return true;
    });

    foodParticlesRef.current = foodParticlesRef.current.filter(p => {
      p.life += 1 / 60;
      const t = Math.min(1, p.life / p.maxLife);
      p.x += p.vx * (1 / 60) * (1 - t * 0.5);
      p.y += p.vy * (1 / 60) * (1 - t * 0.5);
      if (p.life >= p.maxLife) return false;
      const alpha = 1 - t;
      const rgb = hexToRgb(p.color);
      const colorStr = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.fillStyle = colorStr;
      ctx.shadowBlur = 10;
      ctx.shadowColor = colorStr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      return true;
    });

    st.tentacles.forEach((tentacle, ti) => {
      const glowColor = getEffectiveGlowColorForTentacle(ti, st.tentacles.length, now);
      const rgb = hexToRgb(glowColor);
      ctx.beginPath();
      const firstJ = tentacle.joints[0];
      const attachX = drawX + firstJ.x * (radius / st.baseRadius);
      const attachY = drawY + radius * 0.4 + firstJ.y * 0.1;
      ctx.moveTo(attachX, attachY);
      tentacle.joints.forEach((j, ji) => {
        const wx = drawX + j.x * (radius / st.baseRadius);
        const wy = drawY + j.y * (radius / st.baseRadius);
        if (ji === 0) {
          const cpx = attachX;
          const cpy = attachY + 10;
          ctx.quadraticCurveTo(cpx, cpy, wx, wy);
        } else {
          const prevJ = tentacle.joints[ji - 1];
          const prevWx = drawX + prevJ.x * (radius / st.baseRadius);
          const prevWy = drawY + prevJ.y * (radius / st.baseRadius);
          const cpx = (prevWx + wx) / 2;
          const cpy = (prevWy + wy) / 2 + 5;
          ctx.quadraticCurveTo(cpx, cpy, wx, wy);
        }
      });
      ctx.strokeStyle = rgb
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
        : `rgba(255,255,255,0.5)`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = rgb
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
        : `rgba(255,255,255,0.15)`;
      ctx.lineWidth = 6;
      ctx.stroke();
      const lastJ = tentacle.joints[tentacle.joints.length - 1];
      const lastWx = drawX + lastJ.x * (radius / st.baseRadius);
      const lastWy = drawY + lastJ.y * (radius / st.baseRadius);
      if (Math.random() < 0.08) {
        glowParticlesRef.current.push({
          x: lastWx,
          y: lastWy,
          vx: (Math.random() - 0.5) * 0.8,
          vy: Math.random() * 0.6 + 0.2,
          life: 1.5 + Math.random(),
          size: 1.5 + Math.random() * 1.5
        });
      }
      const tipGrad = ctx.createRadialGradient(lastWx, lastWy, 0, lastWx, lastWy, 8);
      tipGrad.addColorStop(0, rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)` : 'rgba(255,255,255,0.9)');
      tipGrad.addColorStop(1, rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)` : 'rgba(255,255,255,0)');
      ctx.fillStyle = tipGrad;
      ctx.beginPath();
      ctx.arc(lastWx, lastWy, 8, 0, Math.PI * 2);
      ctx.fill();
      tentacle.joints.forEach((j, ji) => {
        const wx = drawX + j.x * (radius / st.baseRadius);
        const wy = drawY + j.y * (radius / st.baseRadius);
        let isDragging = false;
        if (dragRef.current && dragRef.current.tentacleIdx === ti && dragRef.current.jointIdx === ji) {
          isDragging = true;
        }
        if (isDragging || mouseRef.current.hovering) {
          ctx.fillStyle = isDragging ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)';
          ctx.shadowBlur = isDragging ? 15 : 6;
          ctx.shadowColor = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.arc(wx, wy, isDragging ? 6 : 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    });

    const bodyRgb = hexToRgb(effectiveBodyColor);
    const bodyGrad = ctx.createRadialGradient(
      drawX, drawY - radius * 0.15, 0,
      drawX, drawY, radius * 1.4
    );
    bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    bodyGrad.addColorStop(0.3, bodyRgb
      ? `rgba(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b}, 0.45)`
      : 'rgba(255,255,255,0.4)');
    bodyGrad.addColorStop(0.7, bodyRgb
      ? `rgba(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b}, 0.25)`
      : 'rgba(255,255,255,0.2)');
    bodyGrad.addColorStop(1, bodyRgb
      ? `rgba(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b}, 0.08)`
      : 'rgba(255,255,255,0.05)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(drawX, drawY, radius, radius * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bodyRgb
      ? `rgba(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b}, 0.18)`
      : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(drawX, drawY + radius * 0.55, radius * 0.75, radius * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(drawX, drawY, radius * (1 - i * 0.18), radius * 0.7 * (1 - i * 0.18), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const innerGrad = ctx.createRadialGradient(
      drawX, drawY, 0,
      drawX, drawY, radius * 0.5
    );
    innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(drawX, drawY - radius * 0.1, radius * 0.5, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    const eyeGrad = ctx.createRadialGradient(
      drawX, drawY - radius * 0.05, 0,
      drawX, drawY, radius * 2.2
    );
    eyeGrad.addColorStop(0, bodyRgb
      ? `rgba(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b}, 0.18)`
      : 'rgba(255,255,255,0.15)');
    eyeGrad.addColorStop(0.5, bodyRgb
      ? `rgba(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b}, 0.06)`
      : 'rgba(255,255,255,0.05)');
    eyeGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.arc(drawX, drawY, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }, [getEffectiveBodyColor, getEffectiveGlowColorForTentacle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    handleResize();
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('pointerleave', () => { mouseRef.current.hovering = false; });

    const loop = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;
      const st = stateRef.current;
      bounceAnimRef.current = bounceAnimRef.current.filter(anim => {
        const t = (now - anim.startTime) / anim.duration;
        if (t >= 1) return false;
        const eased = easeOutBounce(t);
        const nx = lerp(anim.startX, anim.endX, eased);
        const ny = lerp(anim.startY, anim.endY, eased);
        onStateUpdate(prev => {
          const newTentacles = prev.tentacles.map((t, ti) => {
            if (ti !== anim.tentacleIdx) return t;
            return {
              joints: t.joints.map((j, ji) => {
                if (ji !== anim.jointIdx) return j;
                return { ...j, x: nx, y: ny };
              })
            };
          });
          return { ...prev, tentacles: newTentacles };
        });
        return true;
      });
      if (colorTransitionRef.current) {
        const ct = colorTransitionRef.current;
        if (now - ct.startTime >= ct.bodyDuration && now - ct.glowStartTime >= ct.glowDuration) {
          colorTransitionRef.current = null;
        }
      }
      const hoverBoost = mouseRef.current.hovering ? 2 : 1;
      const moodDelta = mouseRef.current.hovering
        ? 1 * dt
        : -0.5 * dt;
      const waterH = window.innerHeight * (window.innerWidth >= 1440 ? 0.7 : 0.75);
      let newVx = st.velocityX;
      let newVy = st.velocityY;
      let newDirTimer = st.directionTimer + dt;
      if (mouseRef.current.hovering) {
        const dx = mouseRef.current.x - st.x;
        const dy = mouseRef.current.y - st.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          const targetSpeed = 1.5;
          newVx = lerp(newVx, (dx / dist) * targetSpeed, 0.05);
          newVy = lerp(newVy, (dy / dist) * targetSpeed, 0.05);
        }
      } else {
        if (newDirTimer >= 5) {
          newDirTimer = 0;
          const targetSpeed = 0.5 + Math.random() * 1.5;
          const angle = Math.random() * Math.PI * 2;
          newVx = Math.cos(angle) * targetSpeed;
          newVy = Math.sin(angle) * targetSpeed * 0.6;
        }
      }
      let newX = st.x + newVx * dt * 60;
      let newY = st.y + newVy * dt * 60;
      const r = st.radius;
      const minX = r + 20;
      const maxX = window.innerWidth - r - 20;
      const minY = r + 40;
      const maxY = waterH - r * 2.5;
      if (newX < minX) { newX = minX; newVx = Math.abs(newVx) * 0.8; }
      if (newX > maxX) { newX = maxX; newVx = -Math.abs(newVx) * 0.8; }
      if (newY < minY) { newY = minY; newVy = Math.abs(newVy) * 0.8; }
      if (newY > maxY) { newY = maxY; newVy = -Math.abs(newVy) * 0.8; }
      const newMood = Math.max(0, Math.min(100, st.mood + moodDelta));
      if (Math.abs(newX - st.x) > 0.01 || Math.abs(newY - st.y) > 0.01
        || Math.abs(newVx - st.velocityX) > 0.001 || Math.abs(newVy - st.velocityY) > 0.001
        || newDirTimer !== st.directionTimer || Math.abs(newMood - st.mood) > 0.01) {
        onStateUpdate(prev => ({
          ...prev,
          x: newX,
          y: newY,
          velocityX: newVx,
          velocityY: newVy,
          directionTimer: newDirTimer,
          mood: newMood
        }));
      }
      void hoverBoost;
      render(ctx, now);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [handleResize, handlePointerDown, handlePointerMove, handlePointerUp, render, onStateUpdate, userId]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: mouseRef.current.hovering ? 'pointer' : 'default'
      }}
    />
  );
}

export default Jellyfish;
