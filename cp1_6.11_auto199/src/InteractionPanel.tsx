import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import type { CellPosition, TrailPoint, TouchEvent } from './types';
import { COLORS, GRID_SIZE, CELL_DIAMETER, CELL_GAP_DESKTOP, CELL_GAP_TABLET, CELL_GAP_MOBILE } from './types';

interface InteractionPanelProps {
  onCellTrigger: (position: CellPosition, velocity: number, type: 'click' | 'drag') => void;
  activeCells: Set<string>;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
}

function getLayoutConfig(breakpoint: 'desktop' | 'tablet' | 'mobile') {
  switch (breakpoint) {
    case 'desktop':
      return { panelSize: 480, gap: CELL_GAP_DESKTOP, cellSize: CELL_DIAMETER };
    case 'tablet':
      return { panelSize: 320, gap: CELL_GAP_TABLET, cellSize: Math.floor((320 - CELL_GAP_TABLET * 7) / 6) };
    case 'mobile':
      return { panelSize: 240, gap: CELL_GAP_MOBILE, cellSize: Math.floor((240 - CELL_GAP_MOBILE * 7) / 6) };
  }
}

export const InteractionPanel: React.FC<InteractionPanelProps> = ({
  onCellTrigger,
  activeCells,
  breakpoint,
}) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [trailPoints, setTrailPoints] = useState<TrailPoint[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragPathRef = useRef<CellPosition[]>([]);
  const lastDragTimeRef = useRef<number>(0);
  const trailCleanupRef = useRef<number>(0);

  const config = getLayoutConfig(breakpoint);

  const addTrailPoint = useCallback((position: CellPosition, index: number, total: number) => {
    const progress = total > 1 ? index / (total - 1) : 0;
    const radius = 20 - progress * 15;

    const startR = parseInt(COLORS.trailStart.slice(1, 3), 16);
    const startG = parseInt(COLORS.trailStart.slice(3, 5), 16);
    const startB = parseInt(COLORS.trailStart.slice(5, 7), 16);
    const endR = parseInt(COLORS.trailEnd.slice(1, 3), 16);
    const endG = parseInt(COLORS.trailEnd.slice(3, 5), 16);
    const endB = parseInt(COLORS.trailEnd.slice(5, 7), 16);

    const r = Math.round(startR + (endR - startR) * progress);
    const g = Math.round(startG + (endG - startG) * progress);
    const b = Math.round(startB + (endB - startB) * progress);
    const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    const x = position.col * (config.cellSize + config.gap) + config.cellSize / 2;
    const y = position.row * (config.cellSize + config.gap) + config.cellSize / 2;

    const point: TrailPoint = {
      id: uuidv4(),
      x,
      y,
      radius: Math.max(5, radius),
      color,
      opacity: 1,
      createdAt: performance.now(),
    };

    setTrailPoints((prev) => [...prev, point]);

    if (trailCleanupRef.current) {
      cancelAnimationFrame(trailCleanupRef.current);
    }
    trailCleanupRef.current = requestAnimationFrame(() => {
      setTimeout(() => {
        setTrailPoints((prev) => prev.filter((p) => p.id !== point.id));
      }, 800);
    });
  }, [config]);

  const handleCellMouseDown = useCallback((row: number, col: number) => {
    const pos: CellPosition = { row, col };
    setIsDragging(true);
    dragPathRef.current = [pos];
    lastDragTimeRef.current = performance.now();
    onCellTrigger(pos, 80, 'click');
  }, [onCellTrigger]);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (!isDragging) {
      setHoveredCell(`${row}-${col}`);
      return;
    }
    const pos: CellPosition = { row, col };
    const now = performance.now();
    const path = dragPathRef.current;
    const lastPos = path[path.length - 1];
    if (lastPos.row === row && lastPos.col === col) return;

    path.push(pos);
    const velocity = Math.max(20, Math.min(100, Math.round(5000 / Math.max(1, now - lastDragTimeRef.current))));
    lastDragTimeRef.current = now;
    onCellTrigger(pos, velocity, 'drag');
    addTrailPoint(pos, path.length - 1, path.length);
  }, [isDragging, onCellTrigger, addTrailPoint]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragPathRef.current = [];
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
    setIsDragging(false);
    dragPathRef.current = [];
  }, []);

  const cellKey = (row: number, col: number) => `${row}-${col}`;

  return (
    <div
      className="interaction-panel"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        width: config.panelSize,
        height: config.panelSize,
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, ${config.cellSize}px)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, ${config.cellSize}px)`,
        gap: config.gap,
        padding: config.gap,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '24px',
        border: '1px solid rgba(183, 110, 121, 0.15)',
      }}
    >
      {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;
        const key = cellKey(row, col);
        const isActive = activeCells.has(key);
        const isHovered = hoveredCell === key;

        return (
          <motion.div
            key={key}
            className="grid-cell"
            onMouseDown={() => handleCellMouseDown(row, col)}
            onMouseEnter={() => handleCellMouseEnter(row, col)}
            animate={{
              scale: isActive ? 1.2 : 1,
              backgroundColor: isActive ? COLORS.cellActive : COLORS.cellDefault,
              boxShadow: isActive
                ? `0 0 12px ${COLORS.cellActive}`
                : isHovered
                ? `0 0 8px ${COLORS.cellHoverGlow}`
                : `0 0 0px transparent`,
            }}
            transition={{
              duration: isActive ? 0.1 : 0.5,
              ease: 'easeOut',
            }}
            style={{
              width: config.cellSize,
              height: config.cellSize,
              borderRadius: '50%',
              cursor: 'pointer',
              transition: 'box-shadow 0.3s ease',
              userSelect: 'none',
            }}
          />
        );
      })}

      <AnimatePresence>
        {trailPoints.map((point) => (
          <motion.div
            key={point.id}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: point.x - point.radius / 2,
              top: point.y - point.radius / 2,
              width: point.radius * 2,
              height: point.radius * 2,
              borderRadius: '50%',
              backgroundColor: point.color,
              pointerEvents: 'none',
              filter: 'blur(1px)',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
