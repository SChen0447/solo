import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import Card from './Card';
import { CardData, Action } from '../types';

const GRID_SIZE = 20;
const SNAP_DISTANCE = 20;
const SIDEBAR_WIDTH = 240;

interface BoardProps {
  cards: CardData[];
  activeCategory: string | null;
  colors: string[];
  dispatch: React.Dispatch<Action>;
}

interface DragState {
  cardId: string;
  startX: number;
  startY: number;
  cardStartX: number;
  cardStartY: number;
  hasMoved: boolean;
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Board({ cards, activeCategory, colors, dispatch }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, width: 0, height: 0 });
  const rafRef = useRef<number | null>(null);
  const repelVelocities = useRef<Map<string, { vx: number; vy: number }>>(new Map());

  const isCardActive = useCallback(
    (card: CardData) => {
      if (!activeCategory) return true;
      return card.category === activeCategory;
    },
    [activeCategory]
  );

  const visibleCards = useMemo(() => {
    const margin = 300;
    return cards.filter((card) => {
      const screenX = card.x + panOffset.x;
      const screenY = card.y + panOffset.y;
      return (
        screenX + card.width > -margin &&
        screenX < viewport.width + margin &&
        screenY + card.height > -margin &&
        screenY < viewport.height + margin
      );
    });
  }, [cards, panOffset, viewport]);

  useEffect(() => {
    const updateViewport = () => {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        setViewport({
          x: -panOffset.x,
          y: -panOffset.y,
          width: rect.width,
          height: rect.height,
        });
      }
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [panOffset]);

  const snapToGrid = useCallback((value: number): number => {
    const remainder = value % GRID_SIZE;
    if (Math.abs(remainder) < SNAP_DISTANCE) {
      return value - remainder;
    }
    if (Math.abs(remainder - GRID_SIZE) < SNAP_DISTANCE) {
      return value - remainder + GRID_SIZE;
    }
    return value;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.card-element')) return;

      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left - panOffset.x - 120;
      const y = e.clientY - rect.top - panOffset.y - 70;

      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const id = uuidv4();

      dispatch({
        type: 'ADD_CARD',
        payload: { x, y, color: randomColor, id },
      });
    },
    [colors, dispatch, panOffset]
  );

  const handleCardMouseDown = useCallback(
    (e: React.MouseEvent, cardId: string) => {
      e.preventDefault();
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;

      setDragState({
        cardId,
        startX: e.clientX,
        startY: e.clientY,
        cardStartX: card.x,
        cardStartY: card.y,
        hasMoved: false,
      });

      dispatch({ type: 'BRING_TO_FRONT', payload: { id: cardId } });
    },
    [cards, dispatch]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragState) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        if (!dragState.hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          setDragState((prev) => (prev ? { ...prev, hasMoved: true } : null));
        }

        const card = cards.find((c) => c.id === dragState.cardId);
        if (!card) return;

        let newX = dragState.cardStartX + dx;
        let newY = dragState.cardStartY + dy;

        if (card.isPinned) {
          newX = snapToGrid(newX);
          newY = snapToGrid(newY);
        }

        dispatch({
          type: 'MOVE_CARD',
          payload: { id: dragState.cardId, x: newX, y: newY },
        });

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          const movedCard = cards.find((c) => c.id === dragState.cardId);
          if (!movedCard) return;

          cards.forEach((other) => {
            if (other.id === dragState.cardId) return;

            const dx = movedCard.x + movedCard.width / 2 - (other.x + other.width / 2);
            const dy = movedCard.y + movedCard.height / 2 - (other.y + other.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = (movedCard.width + other.width) / 2 * 0.6;

            if (dist < minDist && dist > 0) {
              const force = (minDist - dist) / minDist * 3;
              const nx = dx / dist;
              const ny = dy / dist;

              const currentVel = repelVelocities.current.get(other.id) || { vx: 0, vy: 0 };
              repelVelocities.current.set(other.id, {
                vx: currentVel.vx + nx * force,
                vy: currentVel.vy + ny * force,
              });
            }
          });
        });
      } else if (panState) {
        const dx = e.clientX - panState.startX;
        const dy = e.clientY - panState.startY;
        setPanOffset({
          x: panState.panX + dx,
          y: panState.panY + dy,
        });
      }
    },
    [dragState, panState, cards, snapToGrid, dispatch]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setPanState(null);
  }, []);

  const handleBoardMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('.card-element')) return;

      setPanState({
        startX: e.clientX,
        startY: e.clientY,
        panX: panOffset.x,
        panY: panOffset.y,
      });
    },
    [panOffset]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    let animId: number;
    const animate = () => {
      let hasActive = false;
      repelVelocities.current.forEach((vel, id) => {
        if (Math.abs(vel.vx) > 0.01 || Math.abs(vel.vy) > 0.01) {
          hasActive = true;
          const card = cards.find((c) => c.id === id);
          if (card && !dragState?.cardId) {
            dispatch({
              type: 'MOVE_CARD',
              payload: { id, x: card.x + vel.vx, y: card.y + vel.vy },
            });
          }
          repelVelocities.current.set(id, {
            vx: vel.vx * 0.85,
            vy: vel.vy * 0.85,
          });
        }
      });

      if (hasActive || dragState) {
        animId = requestAnimationFrame(animate);
      }
    };

    if (dragState || repelVelocities.current.size > 0) {
      animId = requestAnimationFrame(animate);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [dragState, cards, dispatch]);

  const gridPattern = useMemo(() => {
    return `
      linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
    `;
  }, []);

  return (
    <div
      ref={boardRef}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleBoardMouseDown}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        cursor: panState ? 'grabbing' : (dragState ? 'grabbing' : 'grab'),
        marginLeft: SIDEBAR_WIDTH,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: gridPattern,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          backgroundPosition: `${panOffset.x % GRID_SIZE}px ${panOffset.y % GRID_SIZE}px`,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: '0 0',
        }}
      >
        <AnimatePresence>
          {visibleCards.map((card) => (
            <div key={card.id} className="card-element">
              <Card
                card={card}
                isActive={isCardActive(card)}
                onMouseDown={handleCardMouseDown}
                onUpdate={(id, updates) =>
                  dispatch({ type: 'UPDATE_CARD', payload: { id, updates } })
                }
                onDelete={(id) => dispatch({ type: 'DELETE_CARD', payload: { id } })}
                onVote={(id) => dispatch({ type: 'TOGGLE_VOTE', payload: { cardId: id } })}
                onBringToFront={(id) =>
                  dispatch({ type: 'BRING_TO_FRONT', payload: { id } })
                }
              />
            </div>
          ))}
        </AnimatePresence>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#9CA3AF',
          fontSize: 13,
          pointerEvents: 'none',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
          padding: '8px 16px',
          borderRadius: 8,
        }}
      >
        双击空白处创建灵感卡片 · 拖动空白处平移画布
      </div>
    </div>
  );
}
