import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BurstEffectProps {
  isActive: boolean;
  onComplete?: () => void;
}

export const BurstEffect: React.FC<BurstEffectProps> = ({ isActive, onComplete }) => {
  if (!isActive) return null;

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
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 100,
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%)',
        }}
        onAnimationComplete={onComplete}
      >
        <StarRing />
      </motion.div>
    </AnimatePresence>
  );
};

const StarRing: React.FC = () => {
  const rings = 3;

  return (
    <div style={{ position: 'relative', width: '300px', height: '300px' }}>
      {Array.from({ length: rings }).map((_, ringIndex) => (
        <motion.div
          key={ringIndex}
          initial={{ scale: 0, rotate: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.2, 1],
            rotate: 360 * (ringIndex + 1),
            opacity: [0, 1, 0.8],
          }}
          transition={{
            duration: 1.2,
            ease: 'easeOut',
            delay: ringIndex * 0.15,
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: `${200 + ringIndex * 50}px`,
            height: `${200 + ringIndex * 50}px`,
            marginTop: `-${(200 + ringIndex * 50) / 2}px`,
            marginLeft: `-${(200 + ringIndex * 50) / 2}px`,
            border: `3px solid ${ringIndex === 0 ? '#ffd700' : ringIndex === 1 ? '#ffec8b' : '#fff8dc'}`,
            borderRadius: '50%',
            boxShadow: `0 0 20px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 215, 0, 0.3)`,
          }}
        >
          {Array.from({ length: 12 }).map((_, starIndex) => {
            const angle = (starIndex / 12) * Math.PI * 2;
            const radius = (200 + ringIndex * 50) / 2 - 10;
            return (
              <motion.div
                key={starIndex}
                style={{
                  position: 'absolute',
                  width: '12px',
                  height: '12px',
                  background: '#fff',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px #fff, 0 0 20px #ffd700',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: starIndex * 0.1,
                }}
              />
            );
          })}
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '60px',
          textShadow: '0 0 20px #ffd700, 0 0 40px #ffd700',
        }}
      >
        ✦
      </motion.div>
    </div>
  );
};

export default BurstEffect;
