import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Star } from '../types';
import { getRandomColor, getRandomSize, distance } from '../utils/constants';
import { playCreateSound, playDeleteSound } from '../utils/audio';

interface StarFieldProps {
  stars: Star[];
  selectedStarId: string | null;
  deletingStarId: string | null;
  savingStarId: string | null;
  onStarClick: (id: string) => void;
  onCreateStar: (x: number, y: number, color: string, size: number) => Promise<Star | null>;
  onUpdateStar: (id: string, data: Partial<Star>) => Promise<Star | null>;
  totalStars: number;
}

interface GalaxyDot {
  id: number;
  x: number;
  y: number;
  opacity: number;
  size: number;
}

interface Fragment {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
}

const StarField: React.FC<StarFieldProps> = ({
  stars,
  selectedStarId,
  deletingStarId,
  savingStarId,
  onStarClick,
  onCreateStar,
  onUpdateStar,
  totalStars,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [creatingStars, setCreatingStars] = useState<Set<string>>(new Set());
  const [savingStars, setSavingStars] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [galaxyDots, setGalaxyDots] = useState<GalaxyDot[]>([]);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [fadingStars, setFadingStars] = useState<Set<string>>(new Set());
  const animationFrameRef = useRef<number>(0);
  const dotIdRef = useRef(0);
  const fragmentIdRef = useRef(0);
  const dragStartRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0 });
  const hasMovedRef = useRef(false);

  const twinklePeriods = useMemo(() => {
    const map = new Map<string, number>();
    stars.forEach(s => {
      if (!map.has(s.id)) {
        map.set(s.id, 1.5 + Math.random() * 1.5);
      }
    });
    return map;
  }, [stars]);

  useEffect(() => {
    if (totalStars > 16) {
      const addDot = () => {
        if (Math.random() < 0.02 && galaxyDots.length < 80) {
          const container = containerRef.current;
          if (container) {
            const dot: GalaxyDot = {
              id: dotIdRef.current++,
              x: Math.random() * container.clientWidth,
              y: Math.random() * container.clientHeight,
              opacity: 0.3 + Math.random() * 0.7,
              size: 1 + Math.random() * 1.5,
            };
            setGalaxyDots(prev => [...prev, dot]);
          }
        }
        animationFrameRef.current = requestAnimationFrame(addDot);
      };
      animationFrameRef.current = requestAnimationFrame(addDot);
      return () => cancelAnimationFrame(animationFrameRef.current);
    } else {
      setGalaxyDots([]);
    }
  }, [totalStars, galaxyDots.length]);

  useEffect(() => {
    if (stars.length > 50) {
      const excess = stars.slice(0, stars.length - 50);
      excess.forEach(star => {
        if (!fadingStars.has(star.id)) {
          setFadingStars(prev => new Set([...prev, star.id]));
        }
      });
    }
  }, [stars, fadingStars]);

  const pushAwayStars = useCallback((targetId: string, targetX: number, targetY: number) => {
    const minDistance = 100;
    stars.forEach(star => {
      if (star.id === targetId) return;
      const dist = distance(targetX, targetY, star.x, star.y);
      if (dist < minDistance && dist > 0) {
        const angle = Math.atan2(star.y - targetY, star.x - targetX);
        const pushDistance = (minDistance - dist) / 2;
        const newX = star.x + Math.cos(angle) * pushDistance;
        const newY = star.y + Math.sin(angle) * pushDistance;
        onUpdateStar(star.id, { x: newX, y: newY });
      }
    });
  }, [stars, onUpdateStar]);

  const handleContainerClick = useCallback(async (e: React.MouseEvent) => {
    if (draggingId) return;
    if (hasMovedRef.current) return;
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedOnStar = stars.some(star => {
      const dist = distance(x, y, star.x, star.y);
      return dist < star.size / 2 + 10;
    });

    if (clickedOnStar) return;

    const color = getRandomColor();
    const size = getRandomSize();

    const tempId = 'temp_' + Date.now();
    const tempStar: Star = {
      id: tempId,
      userId: '',
      x,
      y,
      color,
      size,
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setCreatingStars(prev => new Set([...prev, tempId]));
    playCreateSound();

    const newStar = await onCreateStar(x, y, color, size);
    
    setTimeout(() => {
      setCreatingStars(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }, 600);

    if (newStar) {
      pushAwayStars(newStar.id, newStar.x, newStar.y);
    }
  }, [draggingId, stars, onCreateStar, pushAwayStars]);

  const handleStarMouseDown = useCallback((e: React.MouseEvent, starId: string) => {
    e.stopPropagation();
    const star = stars.find(s => s.id === starId);
    if (!star) return;

    setDraggingId(starId);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: star.x,
      origY: star.y,
    };
    setDragPos({ x: star.x, y: star.y });
    setTrail([{ x: star.x, y: star.y, opacity: 1 }]);
  }, [stars]);

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }

      const newX = Math.max(30, Math.min(rect.width - 30, dragStartRef.current.origX + dx));
      const newY = Math.max(30, Math.min(rect.height - 30, dragStartRef.current.origY + dy));

      setDragPos({ x: newX, y: newY });

      setTrail(prev => {
        const newTrail = [...prev, { x: newX, y: newY, opacity: 1 }];
        if (newTrail.length > 10) {
          newTrail.shift();
        }
        return newTrail.map((p, i) => ({
          ...p,
          opacity: (i + 1) / newTrail.length * 0.5,
        }));
      });
    };

    const handleMouseUp = () => {
      if (hasMovedRef.current) {
        onUpdateStar(draggingId, { x: dragPos.x, y: dragPos.y });
        pushAwayStars(draggingId, dragPos.x, dragPos.y);
      } else {
        onStarClick(draggingId);
      }
      setDraggingId(null);
      setTrail([]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragPos, onUpdateStar, onStarClick, pushAwayStars]);

  const triggerDeleteAnimation = useCallback((star: Star) => {
    const newFragments: Fragment[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      newFragments.push({
        id: fragmentIdRef.current++,
        x: star.x,
        y: star.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 1,
        color: star.color,
      });
    }
    setFragments(prev => [...prev, ...newFragments]);
    playDeleteSound();

    let frame = 0;
    const maxFrames = 48;
    const animate = () => {
      frame++;
      setFragments(prev => 
        prev
          .filter(f => newFragments.some(nf => nf.id === f.id))
          .map(f => {
            if (!newFragments.some(nf => nf.id === f.id)) return f;
            return {
              ...f,
              x: f.x + f.vx,
              y: f.y + f.vy + frame * 0.15,
            };
          })
      );
      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        setFragments(prev => prev.filter(f => !newFragments.some(nf => nf.id === f.id)));
      }
    };
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (deletingStarId) {
      const star = stars.find(s => s.id === deletingStarId);
      if (star) {
        triggerDeleteAnimation(star);
      }
    }
  }, [deletingStarId, stars, triggerDeleteAnimation]);

  useEffect(() => {
    if (savingStarId) {
      setSavingStars(prev => new Set([...prev, savingStarId]));
      setTimeout(() => {
        setSavingStars(prev => {
          const next = new Set(prev);
          next.delete(savingStarId);
          return next;
        });
      }, 500);
    }
  }, [savingStarId]);

  const renderStarSvg = (size: number, color: string) => {
    const halfSize = size / 2;
    const innerRadius = halfSize * 0.38;
    
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const outerAngle = (i * 60 - 90) * Math.PI / 180;
      const innerAngle = ((i * 60) + 30 - 90) * Math.PI / 180;
      points.push(`${halfSize + Math.cos(outerAngle) * halfSize},${halfSize + Math.sin(outerAngle) * halfSize}`);
      points.push(`${halfSize + Math.cos(innerAngle) * innerRadius},${halfSize + Math.sin(innerAngle) * innerRadius}`);
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id={`glow-${color.replace('#', '')}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon
          points={points.join(' ')}
          fill={color}
          filter={`url(#glow-${color.replace('#', '')})`}
        />
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      className="starfield-container"
      onClick={handleContainerClick}
    >
      {galaxyDots.map(dot => (
        <div
          key={dot.id}
          className="galaxy-dot"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity * 0.6,
            animation: `twinkle ${2 + Math.random() * 2}s ease-in-out infinite`,
          }}
        />
      ))}

      {trail.map((point, index) => (
        draggingId && (
          <div
            key={index}
            className="star-trail"
            style={{
              left: point.x,
              top: point.y,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: stars.find(s => s.id === draggingId)?.color || '#fff',
              opacity: point.opacity * 0.3,
              transform: 'translate(-50%, -50%)',
              filter: 'blur(4px)',
            }}
          />
        )
      ))}

      {fragments.map(frag => (
        <div
          key={frag.id}
          className="star-fragment"
          style={{
            left: frag.x,
            top: frag.y,
            background: frag.color,
            boxShadow: `0 0 10px ${frag.color}`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {stars.map(star => {
        const isDragging = draggingId === star.id;
        const isCreating = creatingStars.has(star.id);
        const isDeleting = deletingStarId === star.id;
        const isSaving = savingStars.has(star.id);
        const isFading = fadingStars.has(star.id);
        const isSelected = selectedStarId === star.id;
        const period = twinklePeriods.get(star.id) || 2;

        const displayX = isDragging ? dragPos.x : star.x;
        const displayY = isDragging ? dragPos.y : star.y;

        return (
          <div
            key={star.id}
            className={`star ${isDragging ? 'dragging' : ''} ${isCreating ? 'creating' : ''} ${isDeleting ? 'deleting' : ''} ${isSaving ? 'saving' : ''}`}
            style={{
              left: displayX,
              top: displayY,
              color: star.color,
              opacity: isFading ? 0 : 1,
              transition: isFading ? 'opacity 0.5s' : undefined,
              animation: isCreating || isDeleting || isSaving ? undefined : `twinkle ${period}s ease-in-out infinite`,
              transform: isDragging ? 'translate(-50%, -50%) scale(1.15)' : undefined,
              zIndex: isSelected ? 30 : undefined,
            }}
            onMouseDown={(e) => handleStarMouseDown(e, star.id)}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasMovedRef.current) {
                onStarClick(star.id);
              }
            }}
          >
            {renderStarSvg(star.size, star.color)}
          </div>
        );
      })}

      <style>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.7;
            filter: drop-shadow(0 0 5px currentColor);
          }
          50% {
            opacity: 1;
            filter: drop-shadow(0 0 15px currentColor) drop-shadow(0 0 25px currentColor);
          }
        }
      `}</style>
    </div>
  );
};

export default StarField;
