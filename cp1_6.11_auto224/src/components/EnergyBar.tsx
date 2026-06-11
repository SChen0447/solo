import React from 'react';
import { motion } from 'framer-motion';

interface EnergyBarProps {
  currentEnergy: number;
  maxEnergy: number;
  isFull: boolean;
  playerId: number;
  label?: string;
}

export const EnergyBar: React.FC<EnergyBarProps> = ({
  currentEnergy,
  maxEnergy,
  isFull,
  playerId,
  label = '能量',
}) => {
  const percentage = (currentEnergy / maxEnergy) * 100;
  const isLeft = playerId === 0;

  const gradientColor = isFull
    ? 'linear-gradient(90deg, #ffd700 0%, #ffec8b 50%, #ffd700 100%)'
    : 'linear-gradient(90deg, #4a3c8c 0%, #7c6fc4 50%, #9b8fd6 100%)';

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: '12px',
          color: '#c0b8d0',
          fontFamily: 'Georgia, serif',
        }}
      >
        <span>{label}</span>
        <span style={{ color: isFull ? '#ffd700' : '#9b8fd6', fontWeight: 'bold' }}>
          {Math.floor(currentEnergy)} / {maxEnergy}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: '12px',
          background: 'rgba(30, 25, 60, 0.8)',
          borderRadius: '6px',
          border: '1px solid #4a4070',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: `${percentage}%`,
            background: gradientColor,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: '5px',
            position: 'relative',
            float: isLeft ? 'left' : 'right',
          }}
        >
          {isFull && (
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default EnergyBar;
