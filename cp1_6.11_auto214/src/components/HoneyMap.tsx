import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import type { NectarSource } from '../types';

interface HoneyMapProps {
  nectarSources: NectarSource[];
  canClick: boolean;
  correctGridX: number;
  correctGridY: number;
  onCellClick: (gridX: number, gridY: number, pixelX: number, pixelY: number) => void;
  feedbackCell: { gridX: number; gridY: number; correct: boolean } | null;
  onFeedbackComplete?: () => void;
}

const MAP_SIZE = 400;
const GRID_COUNT = 6;
const CELL_SIZE = MAP_SIZE / GRID_COUNT;

interface Flower {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  angle: number;
  delay: number;
}

const HoneyMap: React.FC<HoneyMapProps> = ({
  nectarSources,
  canClick,
  correctGridX,
  correctGridY,
  onCellClick,
  feedbackCell,
  onFeedbackComplete,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const flowers = useMemo<Flower[]>(() => {
    const flowerColors = ['#ffdd66', '#ff99aa', '#ffcc88', '#ffff99'];
    const count = 5 + Math.floor(Math.random() * 4);
    const result: Flower[] = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: `flower-${i}-${uuidv4()}`,
        x: 20 + Math.random() * (MAP_SIZE - 40),
        y: 20 + Math.random() * (MAP_SIZE - 40),
        size: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
        color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
      });
    }
    return result;
  }, []);

  React.useEffect(() => {
    if (feedbackCell && feedbackCell.correct) {
      const centerX = feedbackCell.gridX * CELL_SIZE + CELL_SIZE / 2;
      const centerY = feedbackCell.gridY * CELL_SIZE + CELL_SIZE / 2;
      const newParticles: Particle[] = [];
      for (let i = 0; i < 8; i++) {
        newParticles.push({
          id: `particle-${uuidv4()}`,
          x: centerX,
          y: centerY,
          angle: (i / 8) * 360,
          delay: i * 0.02,
        });
      }
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onFeedbackComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    } else if (feedbackCell && !feedbackCell.correct) {
      const timer = setTimeout(() => {
        onFeedbackComplete?.();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [feedbackCell, onFeedbackComplete]);

  const renderFlower = (flower: Flower) => {
    const petals = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * 360;
      petals.push(
        <ellipse
          key={i}
          cx="0"
          cy={-flower.size * 0.6}
          rx={flower.size * 0.35}
          ry={flower.size * 0.55}
          fill={flower.color}
          transform={`rotate(${angle})`}
        />
      );
    }
    return (
      <g
        key={flower.id}
        transform={`translate(${flower.x}, ${flower.y}) rotate(${flower.rotation})`}
      >
        {petals}
        <circle cx="0" cy="0" r={flower.size * 0.3} fill="#ff8800" />
      </g>
    );
  };

  const handleClick = (gridX: number, gridY: number) => {
    if (!canClick) return;
    const pixelX = gridX * CELL_SIZE + CELL_SIZE / 2;
    const pixelY = gridY * CELL_SIZE + CELL_SIZE / 2;
    onCellClick(gridX, gridY, pixelX, pixelY);
  };

  const getCellFeedbackClass = (gridX: number, gridY: number): string => {
    if (!feedbackCell) return '';
    if (feedbackCell.gridX === gridX && feedbackCell.gridY === gridY) {
      return feedbackCell.correct ? 'correct' : 'wrong';
    }
    return '';
  };

  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < GRID_COUNT; y++) {
      for (let x = 0; x < GRID_COUNT; x++) {
        const feedbackClass = getCellFeedbackClass(x, y);
        cells.push(
          <button
            key={`cell-${x}-${y}`}
            className={`map-cell ${feedbackClass}`}
            disabled={!canClick}
            onClick={() => handleClick(x, y)}
            style={{
              gridColumn: x + 1,
              gridRow: y + 1,
            }}
          />
        );
      }
    }
    return cells;
  };

  return (
    <div className="map-container">
      <svg
        width={MAP_SIZE}
        height={MAP_SIZE}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="grassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7ec850" />
            <stop offset="100%" stopColor="#5a9e2f" />
          </linearGradient>
          <filter id="grassTexture">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.3
                      0 0 0 0 0.5
                      0 0 0 0 0.2
                      0 0 0 0.15 0"
            />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        <rect width={MAP_SIZE} height={MAP_SIZE} fill="url(#grassGradient)" />
        <rect width={MAP_SIZE} height={MAP_SIZE} fill="url(#grassGradient)" filter="url(#grassTexture)" opacity="0.6" />

        {flowers.map(renderFlower)}

        {nectarSources.map((source) => (
          <g key={source.id}>
            <circle
              cx={source.pixelX}
              cy={source.pixelY}
              r="16"
              fill="#f7c600"
              opacity="0.3"
            >
              <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        <line
          x1={MAP_SIZE / 2}
          y1={MAP_SIZE / 2}
          x2={MAP_SIZE / 2}
          y2={15}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        <text
          x={MAP_SIZE / 2}
          y={12}
          fill="rgba(255,255,255,0.8)"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
        >
          N
        </text>
      </svg>

      {nectarSources.map((source) => (
        <div
          key={`nectar-div-${source.id}`}
          className="nectar-source"
          style={{
            left: source.pixelX,
            top: source.pixelY,
          }}
        />
      ))}

      <div className="map-grid">{renderGrid()}</div>

      <div className="particles-container">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="particle"
              initial={{ left: p.x, top: p.y, opacity: 1, scale: 1 }}
              animate={{
                left: p.x + Math.cos((p.angle * Math.PI) / 180) * 50,
                top: p.y + Math.sin((p.angle * Math.PI) / 180) * 50 - 30,
                opacity: 0,
                scale: 0.5,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut', delay: p.delay }}
              style={{
                position: 'absolute',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HoneyMap;
