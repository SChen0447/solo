import React from 'react';
import type { Decoration } from '../types/card';

interface DecorationElementProps {
  decoration: Decoration;
  selected?: boolean;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  interactive?: boolean;
  style?: React.CSSProperties;
}

export const DecorationElement: React.FC<DecorationElementProps> = ({
  decoration,
  selected = false,
  onClick,
  onMouseDown,
  interactive = false,
  style = {},
}) => {
  const { type, color, scale, rotation, x, y } = decoration;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
    transformOrigin: 'center center',
    cursor: interactive ? 'move' : 'default',
    userSelect: 'none',
    ...style,
  };

  const renderShape = () => {
    switch (type) {
      case 'balloon':
        return (
          <svg width="40" height="55" viewBox="0 0 40 55" fill="none">
            <ellipse cx="20" cy="20" rx="18" ry="20" fill={color} />
            <ellipse cx="14" cy="14" rx="4" ry="5" fill="white" opacity="0.4" />
            <path d="M20 40 L18 50 L22 50 Z" fill={color} />
            <path d="M20 50 Q25 52 20 55 Q15 58 20 60" stroke={color} strokeWidth="1.5" fill="none" />
          </svg>
        );
      case 'star':
        return (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 2 L24 15 L38 15 L27 24 L31 38 L20 29 L9 38 L13 24 L2 15 L16 15 Z"
              fill={color}
            />
            <path
              d="M20 6 L22 14 L30 14 L24 20 L26 28 L20 23 L14 28 L16 20 L10 14 L18 14 Z"
              fill="white"
              opacity="0.3"
            />
          </svg>
        );
      case 'heart':
        return (
          <svg width="40" height="36" viewBox="0 0 40 36" fill="none">
            <path
              d="M20 35 C5 22 0 12 0 7 C0 2 4 0 9 0 C13 0 17 3 20 7 C23 3 27 0 31 0 C36 0 40 2 40 7 C40 12 35 22 20 35 Z"
              fill={color}
            />
            <ellipse cx="12" cy="10" rx="4" ry="3" fill="white" opacity="0.4" />
          </svg>
        );
      case 'flower':
        return (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <ellipse cx="20" cy="8" rx="6" ry="8" fill={color} />
            <ellipse cx="20" cy="32" rx="6" ry="8" fill={color} />
            <ellipse cx="8" cy="20" rx="8" ry="6" fill={color} />
            <ellipse cx="32" cy="20" rx="8" ry="6" fill={color} />
            <ellipse cx="11" cy="11" rx="6" ry="6" fill={color} opacity="0.8" />
            <ellipse cx="29" cy="11" rx="6" ry="6" fill={color} opacity="0.8" />
            <ellipse cx="11" cy="29" rx="6" ry="6" fill={color} opacity="0.8" />
            <ellipse cx="29" cy="29" rx="6" ry="6" fill={color} opacity="0.8" />
            <circle cx="20" cy="20" r="5" fill="#FFD93D" />
          </svg>
        );
      case 'ribbon':
        return (
          <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
            <path d="M0 10 L15 0 L15 20 Z" fill={color} />
            <rect x="15" y="5" width="30" height="10" fill={color} />
            <path d="M60 10 L45 0 L45 20 Z" fill={color} />
            <path d="M0 10 L15 0 L15 20 Z" fill="white" opacity="0.2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={containerStyle}
      onClick={onClick}
      onMouseDown={onMouseDown}
      className={selected ? 'decoration-selected' : ''}
    >
      {renderShape()}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            left: '-4px',
            right: '-4px',
            bottom: '-4px',
            border: '2px dashed #4D96FF',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};
