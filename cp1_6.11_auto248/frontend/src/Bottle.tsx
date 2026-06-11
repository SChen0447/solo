import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bottle } from './types';

interface BottleComponentProps {
  bottle: Bottle;
  onClick: () => void;
}

const BottleComponent: React.FC<BottleComponentProps> = ({ bottle, onClick }) => {
  const [time, setTime] = useState(0);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const animate = () => {
      setTime(t => t + 0.05);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  const floatY = Math.sin(time + bottle.waveOffset) * 4;
  const floatRotation = Math.sin(time * 0.7 + bottle.waveOffset) * 3;
  const waveRotation = time * 30;
  
  const frequencies = bottle.soundWaves[0]?.frequencies || [];

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: bottle.x,
        top: bottle.y + floatY,
        transform: `translate(-50%, -50%) rotate(${bottle.rotation * 57.3 + floatRotation}deg)`,
        cursor: 'pointer',
        zIndex: Math.floor(bottle.y / 100) + 10,
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg width="60" height="30" viewBox="0 0 60 30" style={{ overflow: 'visible' }}>
        <defs>
          <clipPath id="bottleClip">
            <ellipse cx="30" cy="15" rx="26" ry="10" />
          </clipPath>
          
          <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.7)" />
            <stop offset="30%" stopColor="rgba(200, 230, 201, 0.2)" />
            <stop offset="70%" stopColor="rgba(255, 255, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(200, 230, 201, 0.4)" />
          </linearGradient>
          
          <linearGradient id="corkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c19a6b" />
            <stop offset="50%" stopColor="#a0522d" />
            <stop offset="100%" stopColor="#8b4513" />
          </linearGradient>
        </defs>
        
        <g clipPath="url(#bottleClip)">
          <g transform={`rotate(${waveRotation}, 30, 15)`}>
            {frequencies.length > 0 ? (
              frequencies.map((freq, i) => {
                const hue = (i / frequencies.length) * 360;
                const color = `hsla(${hue}, 80%, 60%, 0.7)`;
                const yOffset = (i - frequencies.length / 2) * 3;
                return (
                  <path
                    key={i}
                    d={`M 5 ${15 + yOffset} Q 15 ${15 + yOffset - freq * 8}, 30 ${15 + yOffset} T 55 ${15 + yOffset}`}
                    stroke={color}
                    strokeWidth="1.5"
                    fill="none"
                    opacity={0.6 + freq * 0.4}
                  />
                );
              })
            ) : (
              <path
                d="M 10 15 Q 20 8, 30 15 T 50 15"
                stroke={bottle.color}
                strokeWidth="2"
                fill="none"
                opacity="0.8"
              />
            )}
          </g>
          
          <ellipse
            cx="22"
            cy="10"
            rx="8"
            ry="4"
            fill="rgba(255, 255, 255, 0.3)"
            transform="rotate(-20, 22, 10)"
          />
        </g>
        
        <ellipse
          cx="30"
          cy="15"
          rx="28"
          ry="12"
          fill="url(#glassGrad)"
          stroke={bottle.color}
          strokeWidth="1.5"
          opacity="0.8"
        />
        
        <ellipse
          cx="30"
          cy="15"
          rx="28"
          ry="12"
          fill="none"
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="0.5"
        />
        
        <rect x="25" y="1" width="10" height="5" rx="1.5" fill="url(#corkGrad)" />
        <rect x="26" y="2" width="8" height="1" fill="rgba(255,255,255,0.3)" rx="0.5" />
        
        <ellipse cx="30" cy="6" rx="5" ry="1.5" fill="rgba(0,0,0,0.2)" />
      </svg>
      
      {bottle.soundWaves.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            right: -5,
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
          }}
        >
          {bottle.soundWaves.length}
        </div>
      )}
    </motion.div>
  );
};

export default BottleComponent;
