import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VictoryScreenProps {
  isVisible: boolean;
  winnerName: string;
  finalGrid: any[][];
  onRestart: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  isVisible,
  winnerName,
  finalGrid,
  onRestart,
}) => {
  if (!isVisible) return null;

  const particleCount = 50;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10, 8, 30, 0.9)',
          zIndex: 200,
        }}
      >
        <VictoryParticles count={particleCount} />

        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#ffd700',
            fontFamily: 'Georgia, serif',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
            marginBottom: '20px',
          }}
        >
          🏆 {winnerName} 胜利！
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          style={{
            marginBottom: '30px',
            padding: '20px',
            background: 'rgba(30, 25, 60, 0.8)',
            borderRadius: '12px',
            border: '2px solid #d4af37',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '12px', color: '#c0b8d0', fontFamily: 'Georgia, serif' }}>
            最终星盘
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(7, 40px)`,
              gridTemplateRows: `repeat(7, 40px)`,
              gap: '2px',
            }}
          >
            {finalGrid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  style={{
                    width: '40px',
                    height: '40px',
                    border: cell ? '2px solid #ffd700' : '0.5px dashed rgba(212, 175, 55, 0.3)',
                    borderRadius: '4px',
                    background: cell
                      ? 'radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)'
                      : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    boxShadow: cell ? '0 0 10px rgba(255, 215, 0, 0.4)' : 'none',
                  }}
                >
                  {cell ? cell.symbol : ''}
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.button
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          onClick={onRestart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '14px 40px',
            fontSize: '18px',
            fontFamily: 'Georgia, serif',
            background: 'linear-gradient(135deg, #d4af37 0%, #f5c842 100%)',
            color: '#1a1530',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)',
          }}
        >
          再来一局
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
};

const VictoryParticles: React.FC<{ count: number }> = ({ count }) => {
  const particles = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const distance = 150 + Math.random() * 200;
    const delay = Math.random() * 0.5;
    const size = 4 + Math.random() * 8;

    return { angle, distance, delay, size, index: i };
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.index}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2.5,
            delay: p.delay,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: `hsl(${45 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`,
            boxShadow: `0 0 ${p.size * 2}px #ffd700`,
          }}
        />
      ))}
    </div>
  );
};

export default VictoryScreen;
