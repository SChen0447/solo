import React, { useEffect, useRef, useState } from 'react';
import '../styles/confetti.scss';

interface Props {
  triggerKey: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: 'square' | 'circle' | 'triangle' | 'ribbon';
  rotation: number;
  rotSpeed: number;
  life: number;
  opacity: number;
}

const COLORS = [
  '#e94560',
  '#ffd700',
  '#00d4ff',
  '#7bff7b',
  '#ff6b9d',
  '#c471ff',
  '#ffab40',
  '#40c4ff',
];

const SHAPES: Particle['shape'][] = ['square', 'circle', 'triangle', 'ribbon'];

function createParticle(id: number, centerX: number, centerY: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 4 + Math.random() * 9;
  return {
    id,
    x: centerX,
    y: centerY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 3,
    size: 5 + Math.random() * 9,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 25,
    life: 1,
    opacity: 1,
  };
}

function Confetti({ triggerKey }: Props): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (triggerKey === 0) return;
    setActive(true);
    const w = window.innerWidth;
    const h = window.innerHeight;
    centerRef.current = { x: w / 2, y: h / 2 };
    const count = 120;
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push(createParticle(i, centerRef.current.x, centerRef.current.y));
    }
    particlesRef.current = newParticles;
  }, [triggerKey]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    const gravity = 0.28;
    const drag = 0.992;

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life -= 0.009;
        p.opacity = Math.max(0, p.life);

        if (p.life <= 0 || p.y > h + 50) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;

        switch (p.shape) {
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -p.size / 2);
            ctx.lineTo(p.size / 2, p.size / 2);
            ctx.lineTo(-p.size / 2, p.size / 2);
            ctx.closePath();
            ctx.fill();
            break;
          case 'ribbon':
            ctx.fillRect(-p.size, -p.size / 6, p.size * 2, p.size / 3);
            ctx.globalAlpha = p.opacity * 0.6;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-p.size * 0.7, -p.size / 10, p.size * 1.4, p.size / 6);
            break;
          case 'square':
          default:
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            break;
        }

        ctx.restore();
      }

      if (particles.length > 0) {
        rafRef.current = requestAnimationFrame(render);
      } else {
        setActive(false);
      }
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active && triggerKey === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="confetti-canvas"
      aria-hidden="true"
      style={{ display: active ? 'block' : 'none' }}
    />
  );
}

export default Confetti;
