import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface Painting {
  id: string;
  title: string;
  artist: string;
  theme: string;
  description: string;
  petalCount: number;
}

interface HaloLayer {
  id: number;
  baseRadius: number;
  phase: number;
  period: number;
  colorIndex: number;
  offsetX: number;
  offsetY: number;
}

interface Petal {
  id: number;
  x: number;
  y: number;
  color: string;
  rotationSpeed: number;
  drift: number;
}

interface PaintingCardProps {
  painting: Painting;
  palette: string[];
  onAddPetal: (id: string) => void;
  onClick: (painting: Painting) => void;
}

const PETAL_COLORS = [
  '#f5a623', '#d0021b', '#7ed321', '#50e3c2',
  '#4a90e2', '#9013fe', '#bd10e0', '#f8e71c',
];

const generateHaloLayers = (palette: string[]): HaloLayer[] => {
  const count = 4 + Math.floor(Math.random() * 2);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    baseRadius: 30 + Math.random() * 50,
    phase: Math.random() * Math.PI * 2,
    period: 4000 + Math.random() * 4000,
    colorIndex: Math.floor(Math.random() * palette.length),
    offsetX: (Math.random() - 0.5) * 40,
    offsetY: (Math.random() - 0.5) * 40,
  }));
};

export const PaintingCard: React.FC<PaintingCardProps> = ({
  painting,
  palette,
  onAddPetal,
  onClick,
}) => {
  const [haloLayers] = useState<HaloLayer[]>(() => generateHaloLayers(palette));
  const [time, setTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [petals, setPetals] = useState<Petal[]>([]);
  const [petalBounce, setPetalBounce] = useState(false);
  const petalIdRef = useRef(0);
  const rafRef = useRef<number>();
  const prevPetalCount = useRef(painting.petalCount);

  useEffect(() => {
    const startTime = performance.now();
    const animate = () => {
      setTime(performance.now() - startTime);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (painting.petalCount > prevPetalCount.current) {
      setPetalBounce(true);
      const timer = setTimeout(() => setPetalBounce(false), 300);
      return () => clearTimeout(timer);
    }
    prevPetalCount.current = painting.petalCount;
  }, [painting.petalCount]);

  const addPetal = useCallback(() => {
    setPetals((prev) => {
      const activePetals = prev.length;
      if (activePetals >= 20) return prev;
      const toAdd = Math.min(5, 20 - activePetals);
      const newPetals: Petal[] = Array.from({ length: toAdd }, () => {
        petalIdRef.current += 1;
        return {
          id: petalIdRef.current,
          x: Math.random() * 100,
          y: 100 + Math.random() * 10,
          color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
          rotationSpeed: 0.5 + Math.random() * 1.0,
          drift: (Math.random() - 0.5) * 30,
        };
      });
      setTimeout(() => {
        setPetals((p) => p.filter((pet) => !newPetals.find((np) => np.id === pet.id)));
      }, 3000);
      return [...prev, ...newPetals];
    });
  }, []);

  const handlePetalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addPetal();
    onAddPetal(painting.id);
  };

  const borderGradient = `linear-gradient(135deg, ${palette[0]}, ${palette[palette.length - 1]})`;

  return (
    <div
      style={styles.cardContainer}
      onClick={() => onClick(painting)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          ...styles.haloWrapper,
          filter: isHovered ? 'blur(12px)' : 'blur(8px)',
          transition: 'filter 0.15s ease-out',
        }}
      >
        {haloLayers.map((layer) => {
          const t = (time % layer.period) / layer.period;
          const wave = Math.sin(t * Math.PI * 2 + layer.phase);
          const radius = layer.baseRadius + wave * 12;
          const opacity = 0.25 + wave * 0.15;
          const offsetX = layer.offsetX + Math.sin(t * Math.PI * 2) * 8;
          const offsetY = layer.offsetY + Math.cos(t * Math.PI * 2 + layer.phase * 0.5) * 8;
          return (
            <div
              key={layer.id}
              style={{
                position: 'absolute',
                width: radius * 2,
                height: radius * 2,
                borderRadius: '50%',
                background: palette[layer.colorIndex],
                opacity,
                left: `calc(50% - ${radius}px + ${offsetX}px)`,
                top: `calc(50% - ${radius}px + ${offsetY}px)`,
                mixBlendMode: 'screen' as const,
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          ...styles.card,
          border: isHovered
            ? `3px solid ${palette[0]}`
            : '2px solid rgba(255,255,255,0.25)',
          boxShadow: isHovered
            ? `0 5px 30px ${palette[0]}80, 0 0 20px ${palette[palette.length - 1]}40`
            : 'none',
          transition: 'all 0.15s ease-out',
          background: borderGradient,
          padding: '2px',
        }}
      >
        <div style={styles.cardInner}>
          <div style={styles.paintingFrame}>
            <div
              style={{
                ...styles.paintingImage,
                background: `linear-gradient(135deg, ${palette[Math.floor(palette.length / 2)]}40, ${palette[0]}60), radial-gradient(circle at 30% 30%, ${palette[palette.length - 1]}60, transparent 70%)`,
              }}
            >
              <div style={styles.themeBadge}>{painting.theme}</div>
            </div>
          </div>
          <div style={styles.cardTitle}>{painting.title}</div>
          <div style={styles.cardArtist}>—— {painting.artist}</div>

          <div
            style={styles.petalSection}
            onClick={handlePetalClick}
            onMouseEnter={(e) => { e.stopPropagation(); }}
          >
            <button style={styles.petalButton}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill={palette[1]}>
                <path d="M12 2C8 6 6 10 8 14c1 2 3 3 4 3s3-1 4-3c2-4 0-8-4-12zm0 15c-.5 1-1.5 2-3 2.5C11 21 13 22 12 22z" />
              </svg>
            </button>
            <span
              style={{
                ...styles.petalCount,
                transform: petalBounce ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {painting.petalCount}
            </span>
          </div>
        </div>
      </div>

      {petals.map((petal) => (
        <div
          key={petal.id}
          style={{
            ...styles.petal,
            left: `${petal.x}%`,
            top: `${petal.y}%`,
            background: petal.color,
            animation: `petalFall 3s ease-out forwards, petalSpin ${petal.rotationSpeed}s linear infinite`,
            ['--drift' as any]: `${petal.drift}px`,
          }}
        />
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  cardContainer: {
    position: 'relative',
    width: '150px',
    height: '200px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  haloWrapper: {
    position: 'absolute',
    inset: '-30px',
    overflow: 'hidden',
    pointerEvents: 'none',
    borderRadius: '24px',
  },
  card: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: '16px',
    overflow: 'hidden',
    zIndex: 1,
  },
  cardInner: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(160deg, #1a2240 0%, #0e1528 100%)',
    borderRadius: '14px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  paintingFrame: {
    width: '100%',
    flex: 1,
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '6px',
    background: '#0a0f1e',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  paintingImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '4px',
  },
  themeBadge: {
    fontSize: '10px',
    color: '#ffffff',
    background: 'rgba(0,0,0,0.5)',
    padding: '2px 8px',
    borderRadius: '10px',
    backdropFilter: 'blur(4px)',
    marginBottom: '2px',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 1.2,
    maxHeight: '32px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    whiteSpace: 'normal' as const,
  },
  cardArtist: {
    fontSize: '10px',
    color: '#8888a0',
    marginTop: '2px',
  },
  petalSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
    cursor: 'pointer',
  },
  petalButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))',
  },
  petalCount: {
    fontSize: '12px',
    color: '#a0a0b0',
    display: 'inline-block',
  },
  petal: {
    position: 'absolute',
    width: '10px',
    height: '14px',
    borderRadius: '50% 50% 50% 0',
    pointerEvents: 'none',
    zIndex: 10,
    boxShadow: '0 0 8px currentColor',
  },
};

const styleSheet = `
@keyframes petalFall {
  0% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(260px) translateX(var(--drift, 0)) scale(0.5);
    opacity: 0;
  }
}
@keyframes petalSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

if (typeof document !== 'undefined') {
  const existing = document.getElementById('petal-animation-styles');
  if (!existing) {
    const styleEl = document.createElement('style');
    styleEl.id = 'petal-animation-styles';
    styleEl.textContent = styleSheet;
    document.head.appendChild(styleEl);
  }
}
