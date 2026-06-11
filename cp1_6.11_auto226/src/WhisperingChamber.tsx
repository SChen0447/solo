import { useRef, useEffect, useCallback, useState } from 'react';
import { Particle, Crystal, INNER_RADIUS, OUTER_RADIUS } from './types';
import CrystalComp from './Crystal';

interface Props {
  particles: Particle[];
  setParticles: React.Dispatch<React.SetStateAction<Particle[]>>;
  crystals: Crystal[];
  setCrystals: React.Dispatch<React.SetStateAction<Crystal[]>>;
  onFireParticle: (x: number, y: number) => void;
  onCrystalHit: (crystalId: string, hitX: number, hitY: number) => void;
  reverbJitter: number;
  unlocked: boolean;
  hoveredElement: string | null;
  setHoveredElement: (el: string | null) => void;
}

function hueToHex(hue: number): string {
  const h = hue / 360;
  const s: number = 0.85;
  const l = 0.6;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function WhisperingChamber({
  particles,
  setParticles,
  crystals,
  setCrystals,
  onFireParticle,
  onCrystalHit,
  reverbJitter,
  unlocked,
  hoveredElement,
  setHoveredElement,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>(particles);
  const crystalsRef = useRef<Crystal[]>(crystals);
  const reverbJitterRef = useRef(reverbJitter);
  const [canvasSize, setCanvasSize] = useState({ w: 1024, h: 600 });
  const hoveredCrystal = useRef<string | null>(null);

  useEffect(() => {
    particlesRef.current = particles;
  }, [particles]);
  useEffect(() => {
    crystalsRef.current = crystals;
  }, [crystals]);
  useEffect(() => {
    reverbJitterRef.current = reverbJitter;
  }, [reverbJitter]);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      setCanvasSize({ w, h });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const centerX = canvasSize.w / 2;
  const centerY = canvasSize.h / 2;

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX - centerX;
      const y = (e.clientY - rect.top) * scaleY - centerY;
      onFireParticle(x, y);
    },
    [onFireParticle, centerX, centerY]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX - centerX;
      const y = (e.clientY - rect.top) * scaleY - centerY;
      let found: string | null = null;
      for (const c of crystalsRef.current) {
        const dx = x - c.x;
        const dy = y - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < c.size / 2 + 5) {
          found = c.id;
          break;
        }
      }
      if (found !== hoveredCrystal.current) {
        hoveredCrystal.current = found;
        setHoveredElement(found ? `crystal-${found}` : null);
      }
    },
    [centerX, centerY, setHoveredElement]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const render = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(0.033, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.translate(cx, cy);

      // Draw outer structure rings
      for (let r = OUTER_RADIUS - 48; r <= OUTER_RADIUS; r += 6) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(69, 162, 158, ${0.05 + (OUTER_RADIUS - r) / 100})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Main outer ring
      ctx.beginPath();
      ctx.arc(0, 0, OUTER_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = '#45a29e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner ring (wall)
      ctx.beginPath();
      ctx.arc(0, 0, INNER_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = '#45a29e';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Fine acoustic rings
      for (let i = 0; i < 8; i++) {
        const r = INNER_RADIUS + 5 + i * 6;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(69, 162, 158, ${0.1 + i * 0.02})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // 12 tick marks
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12 - Math.PI / 2;
        const tx = Math.cos(angle) * INNER_RADIUS;
        const ty = Math.sin(angle) * INNER_RADIUS;
        const ox = Math.cos(angle) * (INNER_RADIUS + 18);
        const oy = Math.sin(angle) * (INNER_RADIUS + 18);

        // tick line
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(ox, oy);
        ctx.strokeStyle = 'rgba(69, 162, 158, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // dot
        const dx = Math.cos(angle) * (INNER_RADIUS + 28);
        const dy = Math.sin(angle) * (INNER_RADIUS + 28);
        ctx.beginPath();
        ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(197, 198, 199, 0.5)';
        ctx.fill();
      }

      // Crystal ripples (drawn under crystals, handled by Crystal component)
      // Crystals are drawn as React components

      ctx.restore();

      // Physics update for particles
      const currentParticles = particlesRef.current;
      const currentCrystals = crystalsRef.current;
      const jitter = reverbJitterRef.current;
      let particlesChanged = false;
      const nextParticles: Particle[] = [];

      for (let idx = 0; idx < currentParticles.length; idx++) {
        let p = { ...currentParticles[idx] };
        p.trail = [...p.trail];

        // substep for better collision accuracy
        const steps = 3;
        const sdt = dt / steps;
        for (let s = 0; s < steps; s++) {
          // Save previous position for collision
          const prevX = p.x;
          const prevY = p.y;
          p.x += p.vx * sdt;
          p.y += p.vy * sdt;

          // Wall collision
          const dist = Math.sqrt(p.x * p.x + p.y * p.y);
          if (dist >= INNER_RADIUS - 5) {
            // Reflect: normal is radial
            const nx = p.x / dist;
            const ny = p.y / dist;
            const dot = p.vx * nx + p.vy * ny;
            let rvx = p.vx - 2 * dot * nx;
            let rvy = p.vy - 2 * dot * ny;

            // Add angle error ±2° and reverb jitter ±8°
            const baseAngleErr = (Math.random() - 0.5) * 4;
            const reverbErr = jitter > 0 ? (Math.random() - 0.5) * 2 * jitter : 0;
            const totalErr = (baseAngleErr + reverbErr) * (Math.PI / 180);
            const cosE = Math.cos(totalErr);
            const sinE = Math.sin(totalErr);
            const nvx = rvx * cosE - rvy * sinE;
            const nvy = rvx * sinE + rvy * cosE;
            p.vx = nvx;
            p.vy = nvy;

            // Push back inside
            const pushBack = INNER_RADIUS - 6;
            const newDist = Math.sqrt(p.x * p.x + p.y * p.y) || 1;
            p.x = (p.x / newDist) * pushBack;
            p.y = (p.y / newDist) * pushBack;

            // Update color and trail
            p.colorHue = (p.colorHue + 15) % 360;
            p.trailLength = Math.min(40, p.trailLength + 2);
            p.bounceCount++;
            particlesChanged = true;
          }

          // Crystal collision
          for (let ci = 0; ci < currentCrystals.length; ci++) {
            const c = currentCrystals[ci];
            if (c.hit) continue;
            const dx = p.x - c.x;
            const dy = p.y - c.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            const radius = c.size / 2 + 5;
            if (d < radius) {
              // Trigger hit
              const hitX = p.x;
              const hitY = p.y;
              setTimeout(() => onCrystalHit(c.id, hitX, hitY), 0);

              // Reflect particle off crystal
              const cnx = dx / (d || 1);
              const cny = dy / (d || 1);
              const cdot = p.vx * cnx + p.vy * cny;
              p.vx = p.vx - 2 * cdot * cnx;
              p.vy = p.vy - 2 * cdot * cny;

              // Push out
              p.x = c.x + cnx * (radius + 2);
              p.y = c.y + cny * (radius + 2);
              break;
            }
          }
        }

        // Update trail
        p.trail.unshift({ x: p.x, y: p.y });
        if (p.trail.length > p.trailLength) {
          p.trail.length = p.trailLength;
        }
        if (p.trail.length > 1 || p.bounceCount > 0) {
          particlesChanged = true;
        }

        nextParticles.push(p);
      }

      if (particlesChanged || nextParticles.length !== currentParticles.length) {
        setParticles(nextParticles);
      }

      // Draw particles (on top of everything)
      ctx.save();
      ctx.translate(cx, cy);

      for (const p of nextParticles) {
        // Draw trail
        if (p.trail.length > 1) {
          for (let i = 0; i < p.trail.length - 1; i++) {
            const t = i / p.trail.length;
            const alpha = 1 - t;
            ctx.beginPath();
            ctx.moveTo(p.trail[i].x, p.trail[i].y);
            ctx.lineTo(p.trail[i + 1].x, p.trail[i + 1].y);
            const col = hueToHex(p.colorHue);
            ctx.strokeStyle = hexWithAlpha(col, alpha * 0.8);
            ctx.lineWidth = 4 * (1 - t * 0.7);
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }

        // Draw particle
        const particleColor = hueToHex(p.colorHue);
        // glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 18);
        grad.addColorStop(0, hexWithAlpha(particleColor, 0.6));
        grad.addColorStop(1, hexWithAlpha(particleColor, 0));
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();

        // inner highlight
        ctx.beginPath();
        ctx.arc(p.x - 1.5, p.y - 1.5, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasSize, centerX, centerY, onCrystalHit, setParticles]);

  // Update crystal rotations and clean up old ripples
  useEffect(() => {
    const interval = setInterval(() => {
      setCrystals((prev) => {
        const now = Date.now();
        let changed = false;
        const next = prev.map((c) => {
          let nc = c;
          // rotation
          const newRot = (c.rotation + 0.5 / 6) % 360;
          if (newRot !== c.rotation) {
            nc = { ...nc, rotation: newRot };
            changed = true;
          }
          // filter ripples older than 1.5s
          if (c.ripples.length > 0) {
            const filtered = c.ripples.filter(
              (r) => now - r.startTime < 1500
            );
            if (filtered.length !== c.ripples.length) {
              nc = { ...nc, ripples: filtered };
              changed = true;
            }
          }
          return nc;
        });
        return changed ? next : prev;
      });
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [setCrystals]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: Math.min(canvasSize.w, canvasSize.h * 1.3),
          height: Math.min(canvasSize.h, canvasSize.w / 1.3),
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => {
            hoveredCrystal.current = null;
            setHoveredElement(null);
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            cursor: 'crosshair',
            width: '100%',
            height: '100%',
          }}
        />
        {/* Crystal overlays positioned absolutely relative to center */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            pointerEvents: 'none',
          }}
        >
          {crystals.map((c) => (
            <CrystalComp
              key={c.id}
              crystal={c}
              canvasW={canvasSize.w}
              canvasH={canvasSize.h}
              isHovered={hoveredElement === `crystal-${c.id}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex + a;
}
