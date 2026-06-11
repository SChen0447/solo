import React from 'react';
import { motion } from 'framer-motion';
import { GLASS_COLORS } from '../utils/projection';

interface ColorPaletteProps {
  selectedColor: string | null;
  onSelectColor: (color: string) => void;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onSelectColor,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 24,
        background: 'rgba(255, 248, 231, 0.15)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          color: '#fff8e7',
          fontFamily: 'Georgia, serif',
          fontSize: 14,
          letterSpacing: 2,
          textTransform: 'uppercase',
          opacity: 0.9,
        }}
      >
        颜料盘
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        {GLASS_COLORS.map((color) => {
          const isSelected = selectedColor === color;
          return (
            <motion.button
              key={color}
              onClick={() => onSelectColor(color)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              animate={isSelected ? { scale: 1.3 } : { scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 15,
              }}
              style={{
                width: 30,
                height: 30,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: color,
                boxShadow: isSelected
                  ? `0 0 20px ${color}99, 0 0 8px ${color}cc, inset 0 0 4px rgba(255,255,255,0.4)`
                  : `inset 0 0 4px rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.3)`,
                padding: 0,
                outline: isSelected ? `2px solid #fff8e7` : 'none',
                outlineOffset: 2,
              }}
              aria-label={`选择颜色 ${color}`}
            />
          );
        })}
      </div>
      {selectedColor && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#fff8e7',
            fontSize: 12,
            fontFamily: 'Georgia, serif',
            opacity: 0.8,
          }}
        >
          <span>已选：</span>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: selectedColor,
              boxShadow: `0 0 10px ${selectedColor}88`,
            }}
          />
        </motion.div>
      )}
    </div>
  );
};

export default React.memo(ColorPalette);
