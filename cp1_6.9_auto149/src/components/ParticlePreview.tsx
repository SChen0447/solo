import React, { useEffect, useRef } from 'react';

interface ParticlePreviewProps {
  colors: string[];
  size?: number;
  particleCount?: number;
  interactive?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

const ParticlePreview: React.FC<ParticlePreviewProps> = ({
  colors,
  size = 380,
  particleCount = 500,
  interactive = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 4;

    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.95;
      particlesRef.current.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 1 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.4 + Math.random() * 0.6,
        life: Math.random()
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, size, size);

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#1a0f30');
      gradient.addColorStop(1, '#050208');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 0.005;

        if (interactive && mouseRef.current.active) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100 && dist > 0) {
            const force = (100 - dist) / 100 * 0.5;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        p.vx *= 0.99;
        p.vy *= 0.99;

        const dxC = p.x - centerX;
        const dyC = p.y - centerY;
        const distC = Math.sqrt(dxC * dxC + dyC * dyC);
        if (distC > radius - p.size) {
          const nx = dxC / distC;
          const ny = dyC / distC;
          p.x = centerX + nx * (radius - p.size);
          p.y = centerY + ny * (radius - p.size);
          const dot = p.vx * nx + p.vy * ny;
          p.vx -= 2 * dot * nx;
          p.vy -= 2 * dot * ny;
        }

        const alpha = p.alpha * (0.7 + 0.3 * Math.sin(p.life * Math.PI * 2));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [colors, size, particleCount, interactive]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  };

  const handleMouseEnter = () => {
    mouseRef.current.active = true;
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        borderRadius: '50%',
        cursor: interactive ? 'pointer' : 'default'
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export default ParticlePreview;
