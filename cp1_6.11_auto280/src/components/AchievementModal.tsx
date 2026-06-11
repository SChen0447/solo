import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award } from 'lucide-react';
import type { Achievement } from '@/types';
import { playSuccessSound } from '@/utils/audio';

interface AchievementModalProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const AchievementBadge: React.FC = () => (
  <motion.svg
    width="160"
    height="160"
    viewBox="0 0 160 160"
    initial={{ rotate: -10, scale: 0 }}
    animate={{ rotate: 0, scale: 1 }}
    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
  >
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffd700" />
        <stop offset="50%" stopColor="#ffb700" />
        <stop offset="100%" stopColor="#cd7f32" />
      </linearGradient>
      <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#ff4500" />
        <stop offset="50%" stopColor="#ff6f00" />
        <stop offset="100%" stopColor="#ffd700" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <circle cx="80" cy="80" r="70" fill="url(#goldGradient)" stroke="#8b5a2b" strokeWidth="4" filter="url(#glow)" />
    <circle cx="80" cy="80" r="58" fill="none" stroke="#8b5a2b" strokeWidth="2" strokeDasharray="4 2" />
    <g filter="url(#glow)">
      <path
        d="M80 45 C70 55, 60 65, 65 85 C67 95, 75 105, 80 115 C85 105, 93 95, 95 85 C100 65, 90 55, 80 45 Z"
        fill="url(#flameGradient)"
      />
      <path
        d="M80 55 C73 62, 67 70, 70 83 C72 90, 77 97, 80 105 C83 97, 88 90, 90 83 C93 70, 87 62, 80 55 Z"
        fill="#fff3a0"
        opacity="0.8"
      />
    </g>
    <text
      x="80"
      y="138"
      textAnchor="middle"
      fill="#5c2a2a"
      fontSize="12"
      fontWeight="bold"
      fontFamily="Cinzel, serif"
    >
      NOVICE
    </text>
  </motion.svg>
);

const AchievementModal: React.FC<AchievementModalProps> = ({ achievement, onClose }) => {
  React.useEffect(() => {
    if (achievement?.unlocked) {
      playSuccessSound();
    }
  }, [achievement]);

  return (
    <AnimatePresence>
      {achievement && achievement.unlocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative p-8 rounded-2xl text-center max-w-sm mx-4"
            style={{
              background: 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)',
              border: '2px solid #cd7f32',
              boxShadow: '0 0 60px rgba(205, 127, 50, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-3 right-3 p-1 rounded-full"
              style={{ color: '#aaa' }}
            >
              <X size={20} />
            </motion.button>

            <div className="flex justify-center mb-4">
              <AchievementBadge />
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award size={20} color="#ffd700" />
                <h2
                  className="text-2xl font-bold"
                  style={{ color: '#ffd700', fontFamily: 'Cinzel, serif', letterSpacing: 2 }}
                >
                  成就解锁！
                </h2>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#e0d0b0' }}>
                {achievement.name}
              </h3>
              <p className="text-sm mb-6 opacity-80" style={{ color: '#aaa' }}>
                {achievement.description}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="py-3 px-8 rounded-lg font-bold text-sm"
                style={{
                  background: 'linear-gradient(135deg, #cd7f32, #8b5a2b)',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(205, 127, 50, 0.4)'
                }}
              >
                继续探索
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementModal;
