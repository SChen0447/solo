import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CONSTELLATION_TYPES } from '../utils/starData';

interface ExplosionParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

interface FlyingFragment {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  progress: number;
}

interface MeteorCollectorProps {
  bottlePosition: { x: number; y: number };
  onCollect: () => void;
  children: React.ReactNode;
}

export function MeteorCollector({ bottlePosition, onCollect, children }: MeteorCollectorProps) {
  const [explosions, setExplosions] = useState<{ id: number; particles: ExplosionParticle[]; x: number; y: number }[]>([]);
  const [fragments, setFragments] = useState<FlyingFragment[]>([]);
  const particleIdRef = useRef(0);
  const fragmentIdRef = useRef(0);
  const animationFrameRef = useRef<number>(0);

  const triggerExplosion = useCallback((x: number, y: number) => {
    const particleCount = 12 + Math.floor(Math.random() * 7);
    const particles: ExplosionParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 30 + Math.random() * 50;
      const colorIndex = Math.floor(Math.random() * CONSTELLATION_TYPES.length);
      
      particles.push({
        id: particleIdRef.current++,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: CONSTELLATION_TYPES[colorIndex].color,
        size: 4 + Math.random() * 4,
      });
    }

    const explosionId = Date.now();
    setExplosions(prev => [...prev, { id: explosionId, particles, x, y }]);

    setTimeout(() => {
      setExplosions(prev => prev.filter(e => e.id !== explosionId));
    }, 1000);

    const fragmentColor = CONSTELLATION_TYPES[Math.floor(Math.random() * CONSTELLATION_TYPES.length)].color;
    const fragmentId = fragmentIdRef.current++;
    
    setFragments(prev => [...prev, {
      id: fragmentId,
      startX: x,
      startY: y,
      endX: bottlePosition.x,
      endY: bottlePosition.y,
      color: fragmentColor,
      progress: 0,
    }]);

    setTimeout(() => {
      setFragments(prev => prev.filter(f => f.id !== fragmentId));
      onCollect();
    }, 800);
  }, [bottlePosition, onCollect]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9998';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      setExplosions(prevExplosions => {
        prevExplosions.forEach(explosion => {
          explosion.particles.forEach(particle => {
            const t = 0.016;
            particle.x += particle.vx * t * 60;
            particle.y += particle.vy * t * 60;
            particle.vy += 100 * t;
            particle.size *= 0.98;
          });
        });
        return [...prevExplosions];
      });

      explosions.forEach(explosion => {
        explosion.particles.forEach(particle => {
          ctx.beginPath();
          ctx.arc(
            explosion.x + particle.x,
            explosion.y + particle.y,
            Math.max(0, particle.size),
            0,
            Math.PI * 2
          );
          ctx.fillStyle = particle.color;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(
            explosion.x + particle.x,
            explosion.y + particle.y,
            Math.max(0, particle.size * 2),
            0,
            Math.PI * 2
          );
          const gradient = ctx.createRadialGradient(
            explosion.x + particle.x,
            explosion.y + particle.y,
            0,
            explosion.x + particle.x,
            explosion.y + particle.y,
            particle.size * 2
          );
          gradient.addColorStop(0, particle.color + '80');
          gradient.addColorStop(1, particle.color + '00');
          ctx.fillStyle = gradient;
          ctx.fill();
        });
      });

      setFragments(prevFragments => {
        return prevFragments.map(fragment => {
          const newProgress = Math.min(fragment.progress + 0.025, 1);
          return { ...fragment, progress: newProgress };
        });
      });

      fragments.forEach(fragment => {
        const t = fragment.progress;
        const cpX = fragment.startX + (fragment.endX - fragment.startX) * 0.3;
        const cpY = Math.min(fragment.startY, fragment.endY) - 100;
        
        const x = (1 - t) * (1 - t) * fragment.startX + 2 * (1 - t) * t * cpX + t * t * fragment.endX;
        const y = (1 - t) * (1 - t) * fragment.startY + 2 * (1 - t) * t * cpY + t * t * fragment.endY;

        const size = 8 + Math.sin(t * Math.PI) * 4;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = fragment.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
        glowGradient.addColorStop(0, fragment.color + '80');
        glowGradient.addColorStop(1, fragment.color + '00');
        ctx.fillStyle = glowGradient;
        ctx.fill();

        if (t > 0.1) {
          const trailLength = 5;
          for (let i = 1; i <= trailLength; i++) {
            const trailT = t - i * 0.02;
            if (trailT < 0) break;
            const tx = (1 - trailT) * (1 - trailT) * fragment.startX + 2 * (1 - trailT) * trailT * cpX + trailT * trailT * fragment.endX;
            const ty = (1 - trailT) * (1 - trailT) * fragment.startY + 2 * (1 - trailT) * trailT * cpY + trailT * trailT * fragment.endY;
            
            ctx.beginPath();
            ctx.arc(tx, ty, size * (1 - i / trailLength) * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = fragment.color + Math.floor((1 - i / trailLength) * 128).toString(16).padStart(2, '0');
            ctx.fill();
          }
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      document.body.removeChild(canvas);
    };
  }, [explosions, fragments]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
    </div>
  );
}
