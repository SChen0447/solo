import React from 'react';
import { motion } from 'framer-motion';
import { paletteColors } from '../utils/colorUtils';

interface BrushPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const BrushPalette: React.FC<BrushPaletteProps> = ({ selectedColor, onColorSelect }) => {
  const containerSize = 200;
  const colorSize = 40;
  const radius = 70;
  const centerX = containerSize / 2;
  const centerY = containerSize / 2;

  return (
    <div className="brush-palette-container">
      <svg
        width={containerSize}
        height={containerSize}
        viewBox={`0 0 ${containerSize} ${containerSize}`}
      >
        <defs>
          <radialGradient id="paletteBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#faf0e6" />
            <stop offset="100%" stopColor="#d7ccc8" />
          </radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 20}
          fill="url(#paletteBg)"
          filter="url(#shadow)"
          stroke="#a1887f"
          strokeWidth="3"
        />

        <circle
          cx={centerX}
          cy={centerY}
          r={30}
          fill="#faf0e6"
          stroke="#a1887f"
          strokeWidth="2"
        />

        {paletteColors.map((color, index) => {
          const angle = (index / paletteColors.length) * Math.PI * 2 - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const isSelected = color.hex === selectedColor;

          return (
            <g key={color.hex}>
              <motion.circle
                cx={x}
                cy={y}
                r={isSelected ? 26 : 22}
                fill="none"
                stroke="#5d4037"
                strokeWidth="2"
                initial={false}
                animate={{ r: isSelected ? 26 : 22 }}
                transition={{ duration: 0.15 }}
              />
              <motion.circle
                cx={x}
                cy={y}
                r={colorSize / 2}
                fill={color.hex}
                stroke={isSelected ? '#fff' : '#8d6e63'}
                strokeWidth={isSelected ? 3 : 1}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
                onClick={() => onColorSelect(color.hex)}
                className="btn-press"
              />
              {isSelected && (
                <motion.circle
                  cx={x}
                  cy={y}
                  r={colorSize / 2 + 6}
                  fill="none"
                  stroke="#faf0e6"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
            </g>
          );
        })}

        <text
          x={centerX}
          y={centerY + 4}
          textAnchor="middle"
          fontSize="12"
          fill="#5d4037"
          fontFamily="KaiTi, STKaiti, serif"
        >
          调色盘
        </text>
      </svg>
    </div>
  );
};

export default BrushPalette;
