import { useRef, useState, useEffect, useCallback } from 'react';
import gsap from 'gsap';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  baseOpacity: number;
  scale: number;
  glow: number;
}

export interface Trail {
  id: number;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  createdAt: number;
  opacity: number;
}

export interface PulseWave {
  id: number;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  color: string;
}

export interface Fragment {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  targetX: number;
  targetY: number;
  merging: boolean;
}

export interface BurstParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  createdAt: number;
}

const COLORS = ['#ff9ff3', '#54a0ff', '#a29bfe', '#f368e0', '#ffb142', '#4bcffa'];
const EDGE_COLORS = ['#ff6b6b', '#48dbfb', '#feca57'];
const ENERGY_COLORS = ['#ff6348', '#ff7f50', '#ffa502', '#ffd43b', '#a4b0be', '#7bed9f', '#70a1ff', '#5352ed', '#2ed573', '#ff6b81'];

const FURNACE_SIZE = 600;
const PARTICLE_COUNT = 60;

export const useFurnace = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const idCounter = useRef(0);

  const particlesRef = useRef<Particle[]>([]);
  const trailsRef = useRef<Trail[]>([]);
  const pulseWavesRef = useRef<PulseWave[]>([]);
  const fragmentsRef = useRef<Fragment[]>([]);
  const burstParticlesRef = useRef<BurstParticle[]>([]);
  const hoveredParticleId = useRef<number | null>(null);
  const hoveredTrailId = useRef<number | null>(null);
  const framePhaseRef = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });

  const [energy, setEnergy] = useState(0);
  const [flashOpacity, setFlashOpacity] = useState(0);

  const nextId = () => ++idCounter.current;

  const initParticles = useCallback((centerX: number, centerY: number) => {
    const half = FURNACE_SIZE / 2;
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        id: nextId(),
        x: centerX - half + Math.random() * FURNACE_SIZE,
        y: centerY - half + Math.random() * FURNACE_SIZE,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: 3 + Math.random() * 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0.5 + Math.random() * 0.4,
        baseOpacity: 0.5 + Math.random() * 0.4,
        scale: 1,
        glow: 1,
      });
    }
    particlesRef.current = particles;
  }, []);

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }, []);

  const addTrail = useCallback((startX: number, startY: number, endX: number, endY: number, color: string) => {
    const points: { x: number; y: number }[] = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: startX + (endX - startX) * t + (Math.random() - 0.5) * 30,
        y: startY + (endY - startY) * t + (Math.random() - 0.5) * 30,
      });
    }
    trailsRef.current.push({
      id: nextId(),
      points,
      color,
      width: 1 + Math.random(),
      createdAt: Date.now(),
      opacity: 1,
    });
    if (trailsRef.current.length > 30) {
      trailsRef.current.shift();
    }
  }, []);

  const addPulseWave = useCallback((x: number, y: number, color: string) => {
    pulseWavesRef.current.push({
      id: nextId(),
      x,
      y,
      radius: 5,
      opacity: 0.8,
      color,
    });
  }, []);

  const spawnBurst = useCallback((centerX: number, centerY: number) => {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      burstParticlesRef.current.push({
        id: nextId(),
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 1,
        createdAt: Date.now(),
      });
    }
  }, []);

  const triggerFullFlash = useCallback((centerX: number, centerY: number) => {
    gsap.to({ val: 0.5 }, {
      val: 0,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: function () {
        setFlashOpacity(this.targets()[0].val);
      },
    });
    spawnBurst(centerX, centerY);
  }, [spawnBurst]);

  const dropMaterial = useCallback((x: number, y: number, materialColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const half = FURNACE_SIZE / 2;

    if (
      x < centerX - half || x > centerX + half ||
      y < centerY - half || y > centerY + half
    ) {
      return;
    }

    const fragmentCount = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < fragmentCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      fragmentsRef.current.push({
        id: nextId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color: materialColor,
        opacity: 1,
        targetX: 0,
        targetY: 0,
        merging: false,
      });
    }

    setEnergy((prev) => {
      const next = Math.min(prev + 10, 100);
      if (next === 100 && prev < 100) {
        setTimeout(() => {
          triggerFullFlash(centerX, centerY);
          setEnergy(0);
        }, 300);
      }
      return next;
    });

    setTimeout(() => {
      addTrail(x, y, centerX + (Math.random() - 0.5) * 200, centerY + (Math.random() - 0.5) * 200, materialColor);
    }, 400);
  }, [addTrail, triggerFullFlash]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    mousePos.current = { x: mx, y: my };

    let foundParticle: number | null = null;
    for (const p of particlesRef.current) {
      const dx = mx - p.x;
      const dy = my - p.y;
      if (dx * dx + dy * dy < (p.radius + 8) * (p.radius + 8)) {
        foundParticle = p.id;
        break;
      }
    }

    let foundTrail: number | null = null;
    if (!foundParticle) {
      outer: for (const trail of trailsRef.current) {
        for (const pt of trail.points) {
          const dx = mx - pt.x;
          const dy = my - pt.y;
          if (dx * dx + dy * dy < 100) {
            foundTrail = trail.id;
            break outer;
          }
        }
      }
    }

    if (foundParticle !== hoveredParticleId.current) {
      if (foundParticle !== null) playBeep();
      hoveredParticleId.current = foundParticle;
    }
    if (foundTrail !== hoveredTrailId.current) {
      if (foundTrail !== null && foundParticle === null) playBeep();
      hoveredTrailId.current = foundTrail;
    }
  }, [playBeep]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let running = true;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particlesRef.current.length === 0) {
        initParticles(canvas.width / 2, canvas.height / 2);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const drawFurnaceFrame = (cx: number, cy: number, phase: number) => {
      const half = FURNACE_SIZE / 2;
      const depth = 0.35;
      const perspective = (z: number) => 1 + z * depth;

      const getEdgeColor = (t: number) => {
        const i = Math.floor(t);
        const f = t - i;
        const c1 = EDGE_COLORS[i % EDGE_COLORS.length];
        const c2 = EDGE_COLORS[(i + 1) % EDGE_COLORS.length];
        const hex = (s: string) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
        const [r1, g1, b1] = hex(c1);
        const [r2, g2, b2] = hex(c2);
        return `rgb(${Math.round(r1 + (r2 - r1) * f)},${Math.round(g1 + (g2 - g1) * f)},${Math.round(b1 + (b2 - b1) * f)})`;
      };

      const vertices3D: [number, number, number][] = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
      ];

      const project = (v: [number, number, number]) => {
        const s = perspective(v[2] * 0.5);
        return { x: cx + v[0] * half * s, y: cy + v[1] * half * s };
      };

      const projected = vertices3D.map(project);

      const edges: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];

      edges.forEach((edge, i) => {
        const t = phase + i * 0.08;
        const color = getEdgeColor(t);
        const [a, b] = edge;
        const pa = projected[a];
        const pb = projected[b];

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        ctx.restore();
      });

      ctx.save();
      const faceColor = `rgba(162, 155, 254, 0.04)`;
      ctx.fillStyle = faceColor;
      ctx.beginPath();
      ctx.moveTo(projected[0].x, projected[0].y);
      ctx.lineTo(projected[1].x, projected[1].y);
      ctx.lineTo(projected[2].x, projected[2].y);
      ctx.lineTo(projected[3].x, projected[3].y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      if (!running) return;
      framePhaseRef.current += 1 / (60 * 8);
      const phase = framePhaseRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const half = FURNACE_SIZE / 2;

      drawFurnaceFrame(cx, cy, phase);

      const now = Date.now();

      trailsRef.current = trailsRef.current.filter((t) => {
        const age = (now - t.createdAt) / 2000;
        if (age >= 1) return false;
        t.opacity = 1 - age;
        const isHovered = hoveredTrailId.current === t.id;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = t.opacity * (isHovered ? 1 : 0.8);
        ctx.strokeStyle = t.color;
        ctx.lineWidth = (isHovered ? t.width * 1.5 : t.width);
        ctx.shadowColor = t.color;
        ctx.shadowBlur = isHovered ? 20 : 10;
        ctx.beginPath();
        for (let i = 0; i < t.points.length; i++) {
          const p = t.points[i];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
        return true;
      });

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < cx - half + p.radius) { p.x = cx - half + p.radius; p.vx *= -1; }
        if (p.x > cx + half - p.radius) { p.x = cx + half - p.radius; p.vx *= -1; }
        if (p.y < cy - half + p.radius) { p.y = cy - half + p.radius; p.vy *= -1; }
        if (p.y > cy + half - p.radius) { p.y = cy + half - p.radius; p.vy *= -1; }

        p.vx += (Math.random() - 0.5) * 0.05;
        p.vy += (Math.random() - 0.5) * 0.05;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const maxSpeed = 2;
        const minSpeed = 0.5;
        if (speed > maxSpeed) { p.vx *= maxSpeed / speed; p.vy *= maxSpeed / speed; }
        if (speed < minSpeed && speed > 0) { p.vx *= minSpeed / speed; p.vy *= minSpeed / speed; }

        const isHovered = hoveredParticleId.current === p.id;
        const scale = isHovered ? 1.5 : 1;
        const glow = isHovered ? 2 : 1;

        ctx.save();
        ctx.globalAlpha = p.baseOpacity;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = (10 + p.radius * 2) * glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      pulseWavesRef.current = pulseWavesRef.current.filter((w) => {
        w.radius += 0.6;
        w.opacity -= 0.8 / 60;
        if (w.opacity <= 0 || w.radius > 40) return false;

        ctx.save();
        ctx.globalAlpha = w.opacity;
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return true;
      });

      fragmentsRef.current = fragmentsRef.current.filter((f) => {
        if (!f.merging) {
          f.x += f.vx;
          f.y += f.vy;
          f.vx *= 0.96;
          f.vy *= 0.96;

          if (Math.abs(f.vx) < 0.5 && Math.abs(f.vy) < 0.5) {
            f.merging = true;
            const nearest = particlesRef.current.reduce((best, p) => {
              const d = (p.x - f.x) ** 2 + (p.y - f.y) ** 2;
              return d < best.d ? { p, d } : best;
            }, { p: particlesRef.current[0], d: Infinity });
            f.targetX = nearest.p.x;
            f.targetY = nearest.p.y;
          }
        } else {
          const dx = f.targetX - f.x;
          const dy = f.targetY - f.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) {
            addPulseWave(f.x, f.y, f.color);
            return false;
          }
          f.x += (dx / dist) * 4;
          f.y += (dy / dist) * 4;
          f.opacity = Math.min(1, dist / 40);
        }

        ctx.save();
        ctx.globalAlpha = f.opacity;
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      burstParticlesRef.current = burstParticlesRef.current.filter((bp) => {
        const age = (now - bp.createdAt) / 10000;
        if (age >= 1) return false;
        bp.x += bp.vx;
        bp.y += bp.vy;
        bp.vx *= 0.995;
        bp.vy *= 0.995;
        bp.opacity = 1 - age;

        ctx.save();
        ctx.globalAlpha = bp.opacity;
        ctx.fillStyle = bp.color;
        ctx.shadowColor = bp.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, bp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [initParticles, addPulseWave]);

  return {
    canvasRef,
    energy,
    flashOpacity,
    dropMaterial,
    handleMouseMove,
    energyColors: ENERGY_COLORS,
    FURNACE_SIZE,
  };
};
