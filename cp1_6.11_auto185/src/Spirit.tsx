import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Spirit, ELEMENT_INFO } from './types';

interface SpiritProps {
  spirit: Spirit;
  perfectResonance: boolean;
  onClick: () => void;
}

interface FireworkParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

const OrbitalParticle: React.FC<{
  angle: number;
  orbitRadiusX: number;
  orbitRadiusY: number;
  color: string;
  speed: number;
  size: number;
}> = ({ angle, orbitRadiusX, orbitRadiusY, color, speed, size }) => {
  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        animation: `orbitParticle ${4 / speed}s linear infinite`,
        left: '50%',
        top: '50%',
        transform: `rotate(${angle}deg) translateX(${orbitRadiusX}px) translateY(${orbitRadiusY * 0.4}px)`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
      }}
    />
  );
};

const Spirit: React.FC<SpiritProps> = ({ spirit, perfectResonance, onClick }) => {
  const [fireworks, setFireworks] = useState<FireworkParticle[]>([]);
  const [clicked, setClicked] = useState(false);
  const animRef = useRef<number>(0);
  const fireworksRef = useRef<FireworkParticle[]>([]);
  const startTimeRef = useRef<number>(0);

  const mixedColor = spirit.colors.length > 0 ? spirit.colors[0] : '#ffffff';

  useEffect(() => {
    if (!clicked) return;
    startTimeRef.current = Date.now();

    const count = perfectResonance ? 200 : 100;
    const baseSpeed = perfectResonance ? 1.5 : 1;
    const particles: FireworkParticle[] = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = (80 + Math.random() * 120) * baseSpeed;
      return {
        id: i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: spirit.colors[Math.floor(Math.random() * spirit.colors.length)],
        life: 3,
      };
    });

    fireworksRef.current = particles;
    setFireworks(particles);

    const lastTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      const elapsed = (now - startTimeRef.current) / 1000;

      if (elapsed > 3) {
        setFireworks([]);
        setClicked(false);
        fireworksRef.current = [];
        return;
      }

      fireworksRef.current = fireworksRef.current.map(p => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        vy: p.vy + 100 * dt,
        life: Math.max(0, 3 - elapsed),
      }));

      setFireworks([...fireworksRef.current]);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [clicked, spirit.colors, perfectResonance]);

  const handleClick = useCallback(() => {
    if (!clicked) {
      setClicked(true);
      onClick();
    }
  }, [clicked, onClick]);

  return (
    <div
      style={{
        position: 'relative',
        width: spirit.radius * 2 + 80,
        height: spirit.radius * 2 + 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={handleClick}
        style={{
          position: 'relative',
          width: spirit.radius * 2,
          height: spirit.radius * 2,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), ${mixedColor}88, ${mixedColor}44)`,
          boxShadow: `
            0 0 ${spirit.radius}px ${mixedColor}88,
            0 0 ${spirit.radius * 2}px ${mixedColor}44,
            inset 0 0 ${spirit.radius * 0.5}px rgba(255,255,255,0.2)
          `,
          backdropFilter: 'blur(4px)',
          cursor: 'pointer',
          animation: 'spiritFloat 3s ease-in-out infinite',
          transition: 'transform 0.1s',
          zIndex: 10,
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseDown={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1.1)')}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '20%',
            width: '30%',
            height: '25%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            filter: 'blur(3px)',
          }}
        />
      </div>

      {spirit.particles.map(p => (
        <OrbitalParticle
          key={p.id}
          angle={p.angle}
          orbitRadiusX={p.orbitRadiusX}
          orbitRadiusY={p.orbitRadiusY}
          color={p.color}
          speed={p.speed}
          size={p.size}
        />
      ))}

      {clicked && fireworks.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: spirit.radius + 40 + p.x,
            top: spirit.radius + 40 + p.y,
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 4px ${p.color}`,
            opacity: p.life / 3,
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
};

export const MiniSpirit: React.FC<{ spirit: Spirit }> = ({ spirit }) => {
  const mixedColor = spirit.colors.length > 0 ? spirit.colors[0] : '#ffffff';
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), ${mixedColor}88)`,
        boxShadow: `0 0 10px ${mixedColor}66`,
        flexShrink: 0,
        animation: 'spiritFloat 3s ease-in-out infinite',
      }}
    />
  );
};

export const SpiritDetailModal: React.FC<{
  spirit: Spirit;
  onClose: () => void;
}> = ({ spirit, onClose }) => {
  const mixedColor = spirit.colors.length > 0 ? spirit.colors[0] : '#ffffff';
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(30,25,20,0.95)',
          border: '1px solid #5a4a3a',
          borderRadius: 12,
          padding: 24,
          minWidth: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          boxShadow: `0 0 40px ${mixedColor}44`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), ${mixedColor}88, ${mixedColor}44)`,
            boxShadow: `0 0 30px ${mixedColor}88, 0 0 60px ${mixedColor}44, inset 0 0 20px rgba(255,255,255,0.2)`,
            animation: 'spiritFloat 3s ease-in-out infinite',
          }}
        />
        <div style={{ fontFamily: "'MedievalSharp', cursive", color: '#ffddaa', fontSize: 18, textShadow: `0 0 10px ${mixedColor}66` }}>
          {spirit.name}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {spirit.elements.map((el, i) => {
            const info = ELEMENT_INFO[el];
            return (
              <span
                key={i}
                style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: `${info.color}22`,
                  border: `1px solid ${info.color}66`,
                  color: info.glowColor,
                  fontSize: 13,
                }}
              >
                {info.symbol} {info.name}
              </span>
            );
          })}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,106,51,0.2)',
            border: '1px solid #ff6a3366',
            color: '#ff6a33',
            padding: '6px 20px',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: "'MedievalSharp', cursive",
            fontSize: 14,
          }}
        >
          关闭
        </button>
      </div>
    </div>
  );
};

export default Spirit;
