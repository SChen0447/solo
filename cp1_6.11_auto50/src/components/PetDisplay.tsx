import React, { useEffect, useRef, useState } from 'react';
import { FaUtensils, FaFrown, FaTint, FaBed, FaCat, FaDog } from 'react-icons/fa';
import {
  PetType,
  InteractionType,
  NegativeState,
  ThemeType,
} from '../types';

interface PetDisplayProps {
  petType: PetType;
  currentInteraction: InteractionType | null;
  negativeStates: Set<NegativeState>;
  theme: ThemeType;
  energy: number;
  onInteractionComplete: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const CatSVG: React.FC = () => (
  <svg viewBox="0 0 200 200" className="pet-svg">
    <defs>
      <style>
        {`
          .body { fill: var(--pet-body); }
          .ear { fill: var(--pet-ear); transform-origin: 50px 70px; }
          .ear-right { transform-origin: 150px 70px; }
          .eye { fill: var(--pet-eye); transform-origin: center; }
          .nose { fill: var(--pet-nose); }
          .tail { fill: var(--pet-tail); }
        `}
      </style>
    </defs>

    <g className="tail" style={{ transformOrigin: '160px 130px' }}>
      <path d="M 160 130 Q 185 120 180 95 Q 175 80 165 85" stroke="var(--pet-tail)" strokeWidth="12" fill="none" strokeLinecap="round" />
    </g>

    <ellipse className="body" cx="100" cy="140" rx="50" ry="35" />
    <circle className="body" cx="100" cy="80" r="50" />

    <polygon className="ear" points="50,70 65,35 80,65" />
    <polygon className="ear ear-right" points="150,70 135,35 120,65" />

    <g className="eye" style={{ transformOrigin: '75px 80px' }}>
      <ellipse cx="75" cy="80" rx="8" ry="10" />
    </g>
    <g className="eye" style={{ transformOrigin: '125px 80px', animationDelay: '0.5s' }}>
      <ellipse cx="125" cy="80" rx="8" ry="10" />
    </g>

    <ellipse className="nose" cx="100" cy="95" rx="6" ry="4" />
    <path d="M 100 100 Q 95 108 90 105 M 100 100 Q 105 108 110 105" stroke="var(--pet-nose)" strokeWidth="2" fill="none" />

    <line x1="45" y1="95" x2="20" y2="85" stroke="var(--pet-nose)" strokeWidth="1.5" />
    <line x1="45" y1="100" x2="18" y2="100" stroke="var(--pet-nose)" strokeWidth="1.5" />
    <line x1="45" y1="105" x2="20" y2="115" stroke="var(--pet-nose)" strokeWidth="1.5" />
    <line x1="155" y1="95" x2="180" y2="85" stroke="var(--pet-nose)" strokeWidth="1.5" />
    <line x1="155" y1="100" x2="182" y2="100" stroke="var(--pet-nose)" strokeWidth="1.5" />
    <line x1="155" y1="105" x2="180" y2="115" stroke="var(--pet-nose)" strokeWidth="1.5" />
  </svg>
);

const DogSVG: React.FC = () => (
  <svg viewBox="0 0 200 200" className="pet-svg">
    <defs>
      <style>
        {`
          .body { fill: var(--pet-body); }
          .ear { fill: var(--pet-ear); transform-origin: 60px 80px; }
          .ear-right { transform-origin: 140px 80px; }
          .eye { fill: var(--pet-eye); transform-origin: center; }
          .nose { fill: var(--pet-nose); }
          .tail { fill: var(--pet-tail); }
        `}
      </style>
    </defs>

    <g className="tail" style={{ transformOrigin: '155px 125px' }}>
      <ellipse className="tail" cx="175" cy="110" rx="15" ry="8" transform="rotate(-30 175 110)" />
    </g>

    <ellipse className="body" cx="100" cy="140" rx="55" ry="38" />
    <circle className="body" cx="100" cy="85" r="55" />

    <ellipse className="ear" cx="60" cy="80" rx="18" ry="25" transform="rotate(-15 60 80)" />
    <ellipse className="ear ear-right" cx="140" cy="80" rx="18" ry="25" transform="rotate(15 140 80)" />

    <g className="eye" style={{ transformOrigin: '75px 80px' }}>
      <circle cx="75" cy="80" r="7" />
    </g>
    <g className="eye" style={{ transformOrigin: '125px 80px', animationDelay: '0.3s' }}>
      <circle cx="125" cy="80" r="7" />
    </g>

    <ellipse className="nose" cx="100" cy="100" rx="12" ry="8" />
    <circle cx="96" cy="97" r="2" fill="#FFF" opacity="0.5" />
    <path d="M 100 108 Q 100 118 90 120 M 100 108 Q 100 118 110 120" stroke="var(--pet-nose)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

    <ellipse cx="100" cy="115" rx="15" ry="10" fill="var(--pet-ear)" opacity="0.5" />
  </svg>
);

const negativeIcons: Record<NegativeState, React.ReactNode> = {
  [NegativeState.HUNGRY]: <FaUtensils title="饥饿" style={{ color: '#FF6B6B' }} />,
  [NegativeState.UNHAPPY]: <FaFrown title="不快乐" style={{ color: '#FFE066' }} />,
  [NegativeState.DIRTY]: <FaTint title="肮脏" style={{ color: '#74C0FC' }} />,
  [NegativeState.TIRED]: <FaBed title="疲惫" style={{ color: '#B197FC' }} />,
};

const PetDisplay: React.FC<PetDisplayProps> = ({
  petType,
  currentInteraction,
  negativeStates,
  theme,
  energy,
  onInteractionComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showBall, setShowBall] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [showWaterDrops, setShowWaterDrops] = useState(false);
  const [waterDrops, setWaterDrops] = useState<Array<{ id: number; x: number; delay: number }>>([]);
  const animationFrameRef = useRef<number>();
  const particleIdRef = useRef(0);
  const ballTimeRef = useRef(0);

  useEffect(() => {
    if (currentInteraction === InteractionType.FEED) {
      startFeedAnimation();
    } else if (currentInteraction === InteractionType.PLAY) {
      startPlayAnimation();
    } else if (currentInteraction === InteractionType.CLEAN) {
      startCleanAnimation();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentInteraction]);

  const startFeedAnimation = () => {
    const particleCount = 8;
    const newParticles: Particle[] = [];
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const bottomY = rect.height * 0.8;
    const mouthY = rect.height * 0.45;

    for (let i = 0; i < particleCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;
      const speed = 2 + Math.random() * 2;
      newParticles.push({
        id: particleIdRef.current++,
        x: centerX + (Math.random() - 0.5) * 40,
        y: bottomY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 0,
        maxLife: 80 + Math.random() * 20,
      });
    }
    setParticles(newParticles);

    let frame = 0;
    const animate = () => {
      frame++;
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.15,
          life: p.life + 1,
        })).filter(p => p.life < p.maxLife && p.y < mouthY + 50);

        if (updated.length === 0) {
          setTimeout(() => onInteractionComplete(), 200);
          return updated;
        }
        return updated;
      });

      if (frame < 120) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    if (theme === ThemeType.SCIFI) {
      setTimeout(() => createExplosionParticles(centerX, mouthY), 600);
    }
  };

  const startPlayAnimation = () => {
    setShowBall(true);
    ballTimeRef.current = 0;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const speedMultiplier = 0.5 + (energy / 100) * 1.5;
    let frame = 0;

    const animate = () => {
      frame++;
      ballTimeRef.current += 0.03 * speedMultiplier;
      const t = ballTimeRef.current;
      const x = rect.width * 0.2 + (Math.sin(t) * 0.5 + 0.5) * rect.width * 0.6;
      const y = rect.height * 0.6 - Math.abs(Math.sin(t * 2)) * rect.height * 0.35;
      setBallPosition({ x, y });

      if (frame < 200) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setShowBall(false);
        if (theme === ThemeType.SCIFI) {
          createExplosionParticles(x, y);
        }
        setTimeout(() => onInteractionComplete(), 300);
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const startCleanAnimation = () => {
    setShowWaterDrops(true);
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dropCount = 15;
    const drops = Array.from({ length: dropCount }, (_, i) => ({
      id: i,
      x: rect.width * 0.3 + Math.random() * rect.width * 0.4,
      delay: Math.random() * 1.5,
    }));
    setWaterDrops(drops);

    setTimeout(() => {
      setShowWaterDrops(false);
      if (theme === ThemeType.SCIFI) {
        createExplosionParticles(rect.width / 2, rect.height * 0.5);
      }
      setTimeout(() => onInteractionComplete(), 200);
    }, 3000);
  };

  const createExplosionParticles = (x: number, y: number) => {
    const count = 20;
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 4;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 40 + Math.random() * 20,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);

    let frame = 0;
    const animate = () => {
      frame++;
      setParticles(prev => {
        return prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1,
          life: p.life + 1,
        })).filter(p => p.life < p.maxLife);
      });

      if (frame < 80) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div className="pet-display-container" ref={containerRef}>
      {negativeStates.size > 0 && (
        <div className="negative-icons">
          {Array.from(negativeStates).map(state => (
            <span key={state}>{negativeIcons[state]}</span>
          ))}
        </div>
      )}

      {currentInteraction === InteractionType.CLEAN && showWaterDrops && (
        <>
          <div className="shower-head">🚿</div>
          {waterDrops.map(drop => (
            <div
              key={drop.id}
              className="water-drop"
              style={{
                left: `${drop.x}px`,
                top: '15%',
                animationDelay: `${drop.delay}s`,
              }}
            />
          ))}
        </>
      )}

      {petType === PetType.CAT ? <CatSVG /> : <DogSVG />}

      {currentInteraction === InteractionType.FEED && (
        <div className="food-tray" style={{ fontSize: '48px' }}>
          🍽️
        </div>
      )}

      {particles.map(particle => (
        <div
          key={particle.id}
          className={`${currentInteraction === InteractionType.FEED ? 'food-particle' : 'particle'}`}
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            opacity: 1 - particle.life / particle.maxLife,
            transform: `scale(${1 - particle.life / particle.maxLife * 0.5})`,
          }}
        />
      ))}

      {showBall && (
        <div
          className={`ball ${theme === ThemeType.SCIFI ? 'scifi' : ''}`}
          style={{
            left: `${ballPosition.x}px`,
            top: `${ballPosition.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </div>
  );
};

export default React.memo(PetDisplay);
