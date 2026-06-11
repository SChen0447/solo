import React, { useRef, useState, useEffect } from 'react';
import { PixelCard as PixelCardType } from '../types';

interface PixelCardProps {
  card: PixelCardType;
  cellSize: number;
  onClick: () => void;
  onLongPress: () => void;
}

export const PixelCard: React.FC<PixelCardProps> = ({ card, cellSize, onClick, onLongPress }) => {
  const [isPressed, setIsPressed] = useState(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const cardSize = 128;
  const scale = (cellSize - 10) / cardSize;

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsPressed(true);
    longPressTriggered.current = false;
    pressTimerRef.current = setTimeout(() => {
      longPressTriggered.current = true;
      onLongPress();
    }, 500);
  };

  const handlePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsPressed(false);
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (!longPressTriggered.current) {
      onClick();
    }
  };

  const handlePressMove = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPressed(false);
  };

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        width: cardSize,
        height: cardSize,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressMove}
      onMouseMove={isPressed ? handlePressMove : undefined}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchMove={handlePressMove}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          border: '2px solid #fff',
          borderRadius: 8,
          backgroundColor: '#1a1a2e',
          boxShadow: isPressed
            ? '0 4px 20px rgba(0,204,136,0.4)'
            : '0 2px 10px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
          transition: 'box-shadow 0.2s ease'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(32, 1fr)`,
            width: '100%',
            height: '100%'
          }}
        >
          {card.pixelData.flat().map((color, i) => (
            <div
              key={i}
              style={{
                backgroundColor: color === 'transparent' ? '#2a2a3e' : color
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 6,
            color: '#999',
            fontSize: 10,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none'
          }}
        >
          {card.authorName}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            color: '#fff',
            fontSize: 11,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none'
          }}
        >
          <span>❤️</span>
          <span>{card.likes}</span>
        </div>
      </div>
    </div>
  );
};

export default PixelCard;
