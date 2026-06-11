import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePetalPath, ProjectionSpot } from '../utils/projection';

interface WindowSection {
  id: string;
  index: number;
  color: string | null;
}

interface RoseWindowProps {
  sections: WindowSection[];
  projections: ProjectionSpot[];
  isResetting: boolean;
  onSectionClick: (index: number) => void;
  onReset: () => void;
}

const RoseWindow: React.FC<RoseWindowProps> = ({
  sections,
  projections,
  isResetting,
  onSectionClick,
  onReset,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: 600,
        height: 600,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 30,
          left: 30,
          width: 600,
          height: 600,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <AnimatePresence>
          {projections.map((spot) => (
            <motion.div
              key={spot.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: spot.opacity,
                scale: 1,
                x: spot.x - 70,
                y: spot.y - 70,
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                type: 'spring',
                stiffness: 80,
                damping: 20,
              }}
              style={{
                position: 'absolute',
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${spot.color}cc 0%, ${spot.color}66 40%, transparent 70%)`,
                filter: `blur(${spot.blur}px)`,
                mixBlendMode: 'screen',
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        onClick={onReset}
        whileHover={{ scale: 1.1, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'absolute',
          top: -10,
          left: -10,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid rgba(255, 248, 231, 0.4)',
          background: 'rgba(61, 61, 61, 0.5)',
          color: '#fff8e7',
          cursor: 'pointer',
          fontSize: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          opacity: 0.7,
          backdropFilter: 'blur(4px)',
        }}
        aria-label="重置花窗"
        title="重置花窗"
      >
        ↺
      </motion.button>

      <svg
        width="600"
        height="600"
        viewBox="0 0 600 600"
        style={{
          position: 'relative',
          zIndex: 1,
          filter: 'drop-shadow(0 8px 32px rgba(0, 0, 0, 0.4))',
        }}
      >
        <defs>
          <radialGradient id="glassHighlight" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.1)" />
          </radialGradient>
          <clipPath id="outerCircle">
            <circle cx="300" cy="300" r="290" />
          </clipPath>
        </defs>

        <circle
          cx="300"
          cy="300"
          r="295"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="6"
        />
        <circle
          cx="300"
          cy="300"
          r="288"
          fill="none"
          stroke="#2a2a2a"
          strokeWidth="2"
        />

        <g clipPath="url(#outerCircle)">
          <AnimatePresence>
            {sections.map((section) => {
              const pathD = generatePetalPath(section.index);
              return (
                <motion.g
                  key={section.id}
                  initial={false}
                  animate={
                    isResetting && section.color
                      ? { opacity: 0 }
                      : { opacity: 1 }
                  }
                  transition={{
                    delay: isResetting ? section.index * 0.2 : 0,
                    duration: 0.4,
                  }}
                >
                  <motion.path
                    d={pathD}
                    onClick={() => onSectionClick(section.index)}
                    whileHover={{
                      fill: section.color
                        ? section.color
                        : 'rgba(255, 248, 231, 0.15)',
                      cursor: 'pointer',
                    }}
                    animate={{
                      fill: section.color || 'rgba(255, 248, 231, 0.06)',
                    }}
                    initial={false}
                    transition={{
                      fill: { duration: 0.3, ease: 'easeOut' },
                    }}
                    style={{
                      transformOrigin: '300px 300px',
                      willChange: 'fill',
                    }}
                  />
                  {section.color && (
                    <motion.path
                      d={pathD}
                      fill="url(#glassHighlight)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      pointerEvents="none"
                    />
                  )}
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="2.5"
                    pointerEvents="none"
                    style={{
                      transformOrigin: '300px 300px',
                    }}
                  />
                </motion.g>
              );
            })}
          </AnimatePresence>
        </g>

        <circle
          cx="300"
          cy="300"
          r="55"
          fill="rgba(255, 248, 231, 0.08)"
          stroke="#1a1a1a"
          strokeWidth="3"
        />
        <circle
          cx="300"
          cy="300"
          r="30"
          fill="rgba(255, 248, 231, 0.1)"
          stroke="#2a2a2a"
          strokeWidth="1.5"
        />
        <circle
          cx="300"
          cy="300"
          r="10"
          fill="#1a1a1a"
        />
      </svg>
    </div>
  );
};

export default React.memo(RoseWindow);
