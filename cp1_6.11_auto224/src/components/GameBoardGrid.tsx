import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameGrid, Card as CardType } from '../types';
import { CardComponent } from './Card';

interface GameBoardGridProps {
  grid: GameGrid;
  pulsingCells: { row: number; col: number }[];
  onCellClick: (row: number, col: number) => void;
  selectedCard: CardType | null;
  isBurstMode: boolean;
  burstTargetCells: { row: number; col: number }[];
  isGameOver: boolean;
  winner: number | null;
}

const GRID_SIZE = 7;
const CELL_SIZE = 60;

export const GameBoardGrid: React.FC<GameBoardGridProps> = ({
  grid,
  pulsingCells,
  onCellClick,
  selectedCard,
  isBurstMode,
  burstTargetCells,
  isGameOver,
  winner,
}) => {
  const isPulsing = (row: number, col: number): boolean => {
    return pulsingCells.some((c) => c.row === row && c.col === col);
  };

  const isBurstTarget = (row: number, col: number): boolean => {
    return burstTargetCells.some((c) => c.row === row && c.col === col);
  };

  const isWinnerHighlight = (row: number, col: number): boolean => {
    return isGameOver && winner !== null && grid[row][col] !== null;
  };

  const getCellOwner = (row: number, col: number): number | null => {
    const card = grid[row][col];
    if (!card) return null;
    return 0;
  };

  return (
    <div
      style={{
        position: 'relative',
        padding: '20px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gap: '0px',
          position: 'relative',
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const pulsing = isPulsing(rowIndex, colIndex);
            const burstTarget = isBurstTarget(rowIndex, colIndex);
            const winnerHighlight = isWinnerHighlight(rowIndex, colIndex);
            const canPlace =
              !cell && (selectedCard !== null || isBurstMode);

            return (
              <motion.div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  width: `${CELL_SIZE}px`,
                  height: `${CELL_SIZE}px`,
                  border: '0.5px dashed rgba(212, 175, 55, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  cursor: canPlace && !isGameOver ? 'pointer' : 'default',
                  background: cell
                    ? 'radial-gradient(circle, rgba(245, 200, 66, 0.3) 0%, transparent 70%)'
                    : 'transparent',
                  transition: 'background 0.3s ease',
                }}
                whileHover={
                  canPlace && !isGameOver
                    ? {
                        background:
                          'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%)',
                      }
                    : {}
                }
                onClick={() => {
                  if (!isGameOver) {
                    onCellClick(rowIndex, colIndex);
                  }
                }}
              >
                {cell && (
                  <motion.div
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{
                      scale: 1,
                      rotateY: 0,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    <CardComponent
                      card={cell}
                      isPulsing={pulsing}
                      isSmall
                    />
                  </motion.div>
                )}

                {burstTarget && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(255, 100, 100, 0.3)',
                      border: '2px solid #ff6b6b',
                      borderRadius: '4px',
                    }}
                  />
                )}

                {winnerHighlight && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{
                      position: 'absolute',
                      top: -2,
                      left: -2,
                      right: -2,
                      bottom: -2,
                      border: '2px solid #ffd700',
                      borderRadius: '6px',
                      boxShadow: '0 0 15px rgba(255, 215, 0, 0.6)',
                    }}
                  />
                )}
              </motion.div>
            );
          }
        )}
      </div>

      <EnergyRing />
    </div>
  );
};

const EnergyRing: React.FC = () => {
  const dots = 12;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: dots }).map((_, i) => {
        const angle = (i / dots) * 360;
        return (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#d4af37',
              boxShadow: '0 0 8px #d4af37',
              left: '50%',
              top: '50%',
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.08,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
};

export default GameBoardGrid;
