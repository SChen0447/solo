import { useState, useCallback, useRef } from 'react';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  color: string;
}

const PARTICLE_COLORS = ['#60A5FA', '#34D399', '#A78BFA', '#FBBF24', '#F87171'];

export function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  const clearParticles = useCallback(() => {
    setParticles([]);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const emitParticles = useCallback((x: number, y: number, count: number = 12) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: -Math.abs(Math.sin(angle) * speed) - 2,
        opacity: 1,
        size: 4 + Math.random() * 4,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);

    const animate = () => {
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15,
            opacity: p.opacity - 0.025,
            size: p.size * 0.97,
          }))
          .filter((p) => p.opacity > 0);
        if (updated.length > 0) {
          animationRef.current = requestAnimationFrame(animate);
        }
        return updated;
      });
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  return { particles, emitParticles, clearParticles };
}
