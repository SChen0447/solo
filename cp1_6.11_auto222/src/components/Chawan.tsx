import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

export interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'transient' | 'permanent';
}

export interface SwipePath {
  id: number;
  points: { x: number; y: number }[];
  createdAt: number;
}

export interface ChawanRef {
  getBubbles: () => Bubble[];
  getSwipedArea: () => number;
  getCanvasData: () => ImageData | null;
}

interface ChawanProps {
  whiskFrequency: number;
  whiskAngle: number;
  teaRecipeId: string;
  temperature: number;
  waterAmount: number;
  onBubbleUpdate?: (bubbles: Bubble[]) => void;
  onSwipeUpdate?: (area: number) => void;
}

const BOWL_CENTER = { x: 200, y: 220 };
const BOWL_RADIUS = 100;
const TEA_SURFACE_Y = 180;
const TEA_RADIUS = 90;

const Chawan = forwardRef<ChawanRef, ChawanProps>(({
  whiskFrequency,
  whiskAngle,
  teaRecipeId,
  temperature,
  waterAmount,
  onBubbleUpdate,
  onSwipeUpdate
}, ref) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [swipePaths, setSwipePaths] = useState<SwipePath[]>([]);
  const [isWhisking, setIsWhisking] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [whiskVibrate, setWhiskVibrate] = useState(false);
  const [whiskPos, setWhiskPos] = useState({ x: 260, y: 160, angle: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>();
  const lastWhiskTime = useRef<number>(0);
  const bubbleIdRef = useRef(0);
  const pathIdRef = useRef(0);
  const swipedPixels = useRef<Set<string>>(new Set());
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const recipeParamsRef = useRef({
    bubbleCount: 100,
    minSize: 3,
    maxSize: 8,
    aggregation: 0.4,
    pattern: 'random' as 'random' | 'concentric' | 'spiral',
    hiddenPattern: false
  });

  useEffect(() => {
    const recipes: Record<string, any> = {
      thin: { bubbleCount: 60, minSize: 3, maxSize: 6, aggregation: 0.2, pattern: 'random' as const, hiddenPattern: false },
      thick: { bubbleCount: 140, minSize: 5, maxSize: 10, aggregation: 0.55, pattern: 'concentric' as const, hiddenPattern: false },
      dou: { bubbleCount: 200, minSize: 4, maxSize: 12, aggregation: 0.8, pattern: 'spiral' as const, hiddenPattern: true }
    };
    recipeParamsRef.current = recipes[teaRecipeId] || recipes.thin;
  }, [teaRecipeId]);

  useImperativeHandle(ref, () => ({
    getBubbles: () => bubbles,
    getSwipedArea: () => swipedPixels.current.size,
    getCanvasData: () => null
  }));

  const generatePermanentBubbles = useCallback((count?: number) => {
    const params = recipeParamsRef.current;
    const n = count || params.bubbleCount;
    const newBubbles: Bubble[] = [];

    for (let i = 0; i < n; i++) {
      let x: number, y: number;
      const agg = params.aggregation;
      const rand = Math.random();

      switch (params.pattern) {
        case 'concentric': {
          const ringIdx = Math.floor(rand * 5);
          const ringRadius = (TEA_RADIUS * 0.15) + (ringIdx * TEA_RADIUS * 0.17);
          const angle = Math.random() * Math.PI * 2;
          const jitter = (1 - agg) * 20;
          x = BOWL_CENTER.x + Math.cos(angle) * ringRadius + (Math.random() - 0.5) * jitter;
          y = TEA_SURFACE_Y + Math.sin(angle) * ringRadius * 0.55 + (Math.random() - 0.5) * jitter * 0.5;
          break;
        }
        case 'spiral': {
          const t = i / n;
          const spiralAngle = t * Math.PI * 4 + (Math.random() - 0.5) * 0.5;
          const spiralRadius = t * TEA_RADIUS * 0.9;
          const jitter = (1 - agg) * 15;
          x = BOWL_CENTER.x + Math.cos(spiralAngle) * spiralRadius + (Math.random() - 0.5) * jitter;
          y = TEA_SURFACE_Y + Math.sin(spiralAngle) * spiralRadius * 0.55 + (Math.random() - 0.5) * jitter * 0.5;
          break;
        }
        default: {
          const r = Math.pow(Math.random(), 0.5) * TEA_RADIUS * 0.9;
          const angle = Math.random() * Math.PI * 2;
          x = BOWL_CENTER.x + Math.cos(angle) * r;
          y = TEA_SURFACE_Y + Math.sin(angle) * r * 0.55;
        }
      }

      const size = params.minSize + Math.random() * (params.maxSize - params.minSize);
      const dist = Math.sqrt(Math.pow(x - BOWL_CENTER.x, 2) + Math.pow((y - TEA_SURFACE_Y) * 1.8, 2));

      if (dist < TEA_RADIUS) {
        newBubbles.push({
          id: bubbleIdRef.current++,
          x, y, size,
          opacity: 0.65 + Math.random() * 0.35,
          vx: 0, vy: 0,
          life: Infinity,
          maxLife: Infinity,
          type: 'permanent'
        });
      }
    }
    return newBubbles;
  }, []);

  useEffect(() => {
    const perms = generatePermanentBubbles();
    setBubbles(perms);
  }, [teaRecipeId, generatePermanentBubbles]);

  const spawnTransientBubbles = useCallback((whiskX: number, whiskY: number, count: number) => {
    const newBubbles: Bubble[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 25;
      newBubbles.push({
        id: bubbleIdRef.current++,
        x: whiskX + Math.cos(angle) * dist,
        y: whiskY + Math.sin(angle) * dist * 0.55,
        size: 2 + Math.random() * 4,
        opacity: 0.7,
        vx: Math.cos(angle) * (0.3 + Math.random() * 0.5),
        vy: Math.sin(angle) * (0.15 + Math.random() * 0.25),
        life: 3000,
        maxLife: 3000,
        type: 'transient'
      });
    }
    return newBubbles;
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      setBubbles(prev => {
        let updated = prev.map(b => {
          if (b.type === 'transient') {
            const newLife = b.life - dt;
            if (newLife <= 0) return null;
            return {
              ...b,
              x: b.x + b.vx,
              y: b.y + b.vy,
              life: newLife,
              opacity: Math.max(0, b.opacity * (newLife / b.maxLife)),
              size: b.size * (1 + (1 - newLife / b.maxLife) * 0.5)
            };
          }
          return b;
        }).filter((b): b is Bubble => b !== null);

        onBubbleUpdate?.(updated);
        return updated;
      });

      setSwipePaths(prev => prev.filter(p => time - p.createdAt < 2000));

      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [onBubbleUpdate]);

  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const loc = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: loc.x, y: loc.y };
  }, []);

  const isInTea = useCallback((x: number, y: number) => {
    const dist = Math.sqrt(Math.pow(x - BOWL_CENTER.x, 2) + Math.pow((y - TEA_SURFACE_Y) * 1.8, 2));
    return dist < TEA_RADIUS;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pt = getSVGPoint(e.clientX, e.clientY);
    if (!pt) return;

    if (e.button === 0 && isInTea(pt.x, pt.y)) {
      setIsSwiping(true);
      currentPathRef.current = [{ x: pt.x, y: pt.y }];
      markSwiped(pt.x, pt.y);
    } else if (e.button === 2) {
      setIsWhisking(true);
    }
  }, [getSVGPoint, isInTea]);

  const markSwiped = useCallback((x: number, y: number) => {
    const radius = 8;
    for (let dx = -radius; dx <= radius; dx += 2) {
      for (let dy = -radius; dy <= radius; dy += 2) {
        if (dx * dx + dy * dy <= radius * radius) {
          const key = `${Math.floor(x + dx)},${Math.floor(y + dy)}`;
          if (!swipedPixels.current.has(key)) {
            swipedPixels.current.add(key);
          }
        }
      }
    }
    const totalPixels = Math.PI * TEA_RADIUS * TEA_RADIUS * 0.55;
    const ratio = Math.min(1, swipedPixels.current.size / totalPixels);
    onSwipeUpdate?.(ratio);
  }, [onSwipeUpdate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pt = getSVGPoint(e.clientX, e.clientY);
    if (!pt) return;

    if (isWhisking) {
      const now = performance.now();
      const interval = Math.max(40, 200 - whiskFrequency * 1.5);
      setWhiskPos({ x: pt.x, y: pt.y, angle: whiskAngle });

      if (now - lastWhiskTime.current > interval) {
        lastWhiskTime.current = now;
        setWhiskVibrate(true);
        setTimeout(() => setWhiskVibrate(false), 200);

        const count = 8 + Math.floor(whiskFrequency / 12);
        const tempBoost = Math.max(0, (temperature - 60) / 60);
        const waterBoost = Math.max(0.5, waterAmount / 80);
        const spawnCount = Math.floor(count * (1 + tempBoost) * waterBoost);

        if (isInTea(pt.x, pt.y)) {
          setBubbles(prev => [...prev.filter(b => b.type === 'permanent' || b.life > 500), ...spawnTransientBubbles(pt.x, pt.y, spawnCount)]);
        }
      }
    }

    if (isSwiping && isInTea(pt.x, pt.y)) {
      currentPathRef.current.push({ x: pt.x, y: pt.y });
      markSwiped(pt.x, pt.y);

      setSwipePaths(prev => {
        const filtered = prev.filter((_, i) => i !== prev.length - 1 || prev.length === 0);
        return [...filtered, {
          id: pathIdRef.current,
          points: [...currentPathRef.current],
          createdAt: performance.now()
        }];
      });

      setBubbles(prev => prev.filter(b => {
        if (b.type !== 'permanent') return true;
        const last = currentPathRef.current[currentPathRef.current.length - 1];
        const dist = Math.sqrt(Math.pow(b.x - last.x, 2) + Math.pow(b.y - last.y, 2));
        return dist > 12;
      }));
    }
  }, [isWhisking, isSwiping, whiskFrequency, whiskAngle, temperature, waterAmount, getSVGPoint, isInTea, markSwiped, spawnTransientBubbles]);

  const handleMouseUp = useCallback(() => {
    if (isSwiping && currentPathRef.current.length > 1) {
      const newPath: SwipePath = {
        id: pathIdRef.current++,
        points: [...currentPathRef.current],
        createdAt: performance.now()
      };
      setSwipePaths(prev => [...prev, newPath]);
    }
    setIsSwiping(false);
    setIsWhisking(false);
    currentPathRef.current = [];
  }, [isSwiping]);

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const el = svgRef.current;
    el?.addEventListener('contextmenu', prevent);
    return () => el?.removeEventListener('contextmenu', prevent);
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 420"
      width="100%"
      height="100%"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isSwiping ? 'crosshair' : (isWhisking ? 'grabbing' : 'pointer'), userSelect: 'none' }}
    >
      <defs>
        <radialGradient id="bowlGradient" cx="30%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#f0efe9" />
          <stop offset="35%" stopColor="#d9d8cf" />
          <stop offset="70%" stopColor="#a8aba2" />
          <stop offset="100%" stopColor="#6d6d66" />
        </radialGradient>
        <radialGradient id="kilnEffect" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c4b99a" stopOpacity="0" />
          <stop offset="40%" stopColor="#b0a582" stopOpacity="0.25" />
          <stop offset="80%" stopColor="#8a7c5f" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6b5e46" stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id="teaGradient" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#d4d98b" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#9caa5e" stopOpacity="0.78" />
          <stop offset="100%" stopColor="#5d6b3c" stopOpacity="0.92" />
        </radialGradient>
        <radialGradient id="teaDepth" cx="50%" cy="90%" r="60%">
          <stop offset="0%" stopColor="#4a5230" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#2e341e" stopOpacity="0.95" />
        </radialGradient>
        <filter id="bubbleBlur">
          <feGaussianBlur stdDeviation="0.3" />
        </filter>
        <clipPath id="teaClip">
          <ellipse cx={BOWL_CENTER.x} cy={TEA_SURFACE_Y} rx={TEA_RADIUS} ry={TEA_RADIUS * 0.55} />
        </clipPath>
        <linearGradient id="hiddenBird" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8a7a4a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6b5e3a" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      <ellipse cx={BOWL_CENTER.x} cy="370" rx="95" ry="14" fill="#000" opacity="0.18" />

      <g>
        <ellipse cx={BOWL_CENTER.x} cy="360" rx="52" ry="10" fill="#8a8a82" />
        <ellipse cx={BOWL_CENTER.x} cy="358" rx="44" ry="7" fill="#5a5a54" />
        <path
          d={`M ${BOWL_CENTER.x - 100} ${BOWL_CENTER.y - 30}
              C ${BOWL_CENTER.x - 140} ${BOWL_CENTER.y + 10},
                ${BOWL_CENTER.x - 50} 360,
                ${BOWL_CENTER.x} 360
              C ${BOWL_CENTER.x + 50} 360,
                ${BOWL_CENTER.x + 140} ${BOWL_CENTER.y + 10},
                ${BOWL_CENTER.x + 100} ${BOWL_CENTER.y - 30}
              Z`}
          fill="url(#bowlGradient)"
        />
        <ellipse cx={BOWL_CENTER.x} cy={BOWL_CENTER.y - 30} rx="100" ry="22" fill="#5e5e56" />
        <ellipse cx={BOWL_CENTER.x} cy={BOWL_CENTER.y - 32} rx="92" ry="17" fill="#f0efe9" />
        <ellipse cx={BOWL_CENTER.x} cy={BOWL_CENTER.y - 30} rx="92" ry="17" fill="url(#kilnEffect)" />
        <ellipse cx={BOWL_CENTER.x - 35} cy={BOWL_CENTER.y - 35} rx="18" ry="4" fill="#fff" opacity="0.35" />
      </g>

      <g clipPath="url(#teaClip)">
        <ellipse cx={BOWL_CENTER.x} cy={TEA_SURFACE_Y} rx={TEA_RADIUS} ry={TEA_RADIUS * 0.55} fill="url(#teaGradient)" />
        <ellipse cx={BOWL_CENTER.x} cy={TEA_SURFACE_Y + 8} rx={TEA_RADIUS * 0.85} ry={TEA_RADIUS * 0.45} fill="url(#teaDepth)" />

        {[...Array(12)].map((_, i) => (
          <circle
            key={i}
            cx={BOWL_CENTER.x + (Math.sin(i * 1.3) * TEA_RADIUS * 0.5)}
            cy={TEA_SURFACE_Y + 15 + (Math.cos(i * 0.9) * TEA_RADIUS * 0.18)}
            r={2 + (i % 3)}
            fill="#3d4226"
            opacity={0.45 + (i % 5) * 0.1}
          />
        ))}

        {recipeParamsRef.current.hiddenPattern && (
          <g opacity="0.25">
            <path
              d="M 155 170 Q 168 155 185 162 Q 198 148 218 156 Q 235 145 245 160 Q 262 158 255 175 Q 250 188 232 185 Q 215 198 200 188 Q 182 196 170 185 Q 150 182 155 170 Z"
              fill="url(#hiddenBird)"
            />
            <circle cx="230" cy="166" r="2.5" fill="#2d2410" />
            <path d="M 188 185 Q 172 205 185 210 Q 200 202 200 188" fill="url(#hiddenBird)" />
          </g>
        )}

        <g filter="url(#bubbleBlur)">
          {bubbles.map(b => {
            const dist = Math.sqrt(Math.pow(b.x - BOWL_CENTER.x, 2) + Math.pow((b.y - TEA_SURFACE_Y) * 1.8, 2));
            if (dist > TEA_RADIUS) return null;
            return (
              <circle
                key={b.id}
                cx={b.x}
                cy={b.y}
                r={b.size}
                fill="#ffffff"
                opacity={b.opacity * 0.85}
              />
            );
          })}
        </g>

        {swipePaths.map(p => {
          const age = (performance.now() - p.createdAt) / 2000;
          const opacity = Math.max(0, 1 - age);
          if (p.points.length < 2) return null;
          const d = p.points.reduce((acc, pt, i) =>
            i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, ''
          );
          return (
            <path
              key={p.id}
              d={d}
              stroke="#d4a017"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity}
            />
          );
        })}
      </g>

      <g
        style={{
          transform: `translate(${whiskPos.x - 260 + (whiskVibrate ? 3 : 0)}px, ${whiskPos.y - 160}px) rotate(${whiskAngle}deg)`,
          transformOrigin: '260px 160px',
          transition: whiskVibrate ? 'none' : 'transform 0.08s ease-out'
        }}
      >
        <g transform="translate(260, 160)">
          <line x1="0" y1="-95" x2="0" y2="40" stroke="#8a5a3a" strokeWidth="7" strokeLinecap="round" />
          <line x1="0" y1="-95" x2="0" y2="40" stroke="#6b4423" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <rect x="-14" y="36" width="28" height="9" rx="3" fill="#5c3a1e" stroke="#3d2817" strokeWidth="1.5" />
          <ellipse cx="0" cy="55" rx="19" ry="6" fill="#5c3a1e" stroke="#3d2817" strokeWidth="1" opacity="0.6" />
          {[...Array(6)].map((_, i) => {
            const offset = (i - 2.5) * 5.5;
            return (
              <g key={i}>
                <line
                  x1={offset * 0.4} y1="48"
                  x2={offset} y2="115"
                  stroke="#8b6239"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <line
                  x1={offset * 0.4} y1="48"
                  x2={offset * 0.95} y2="110"
                  stroke="#c09060"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  opacity="0.7"
                />
              </g>
            );
          })}
          <line x1="-10" y1="75" x2="10" y2="75" stroke="#6b4423" strokeWidth="1.2" opacity="0.8" />
          <line x1="-11" y1="95" x2="11" y2="95" stroke="#6b4423" strokeWidth="1.2" opacity="0.6" />
        </g>
      </g>

      <text x={BOWL_CENTER.x} y="405" textAnchor="middle" fontSize="12" fill="#3d2817" opacity="0.65" fontFamily="'Noto Serif SC', serif">
        左键点茶·右键击拂
      </text>
    </svg>
  );
});

Chawan.displayName = 'Chawan';
export default Chawan;
