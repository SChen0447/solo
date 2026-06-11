import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card as CardType, Element } from '../types';

interface CardProps {
  card: CardType;
  isFlipped?: boolean;
  isPulsing?: boolean;
  isSelected?: boolean;
  isSmall?: boolean;
  onClick?: () => void;
  showBack?: boolean;
  ownerId?: number;
}

const elementColors: Record<Element, string> = {
  fire: '#ff6b35',
  water: '#4da6ff',
  wind: '#a8e6cf',
  earth: '#c9a227',
  major: '#d4af37',
};

const elementBackgrounds: Record<Element, string> = {
  fire: 'linear-gradient(135deg, #2d1810 0%, #4a2c1a 100%)',
  water: 'linear-gradient(135deg, #10202d 0%, #1a3a4a 100%)',
  wind: 'linear-gradient(135deg, #1a2d28 0%, #2a4a40 100%)',
  earth: 'linear-gradient(135deg, #2d2a10 0%, #4a421a 100%)',
  major: 'linear-gradient(135deg, #2d2410 0%, #4a3c1a 100%)',
};

export const CardComponent: React.FC<CardProps> = ({
  card,
  isFlipped = false,
  isPulsing = false,
  isSelected = false,
  isSmall = false,
  onClick,
  showBack = false,
  ownerId,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const width = isSmall ? 60 : 70;
  const height = isSmall ? 85 : 100;
  const fontSize = isSmall ? 10 : 12;

  const cardStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: '8px',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    transformStyle: 'preserve-3d',
    perspective: '1000px',
  };

  const backStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: '8px',
    background: '#4a1a2b',
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 4px)',
    border: '2px solid #6b2c3d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const frontStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: '8px',
    background: elementBackgrounds[card.element],
    border: `2px solid ${elementColors[card.element]}`,
    display: 'flex',
    flexDirection: 'column',
    padding: isSmall ? '4px' : '6px',
    transform: 'rotateY(180deg)',
    overflow: 'hidden',
  };

  return (
    <motion.div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{
        rotateY: showBack || isFlipped ? 0 : 180,
        y: isHovered && onClick ? -8 : 0,
        scale: isSelected ? 1.05 : 1,
        boxShadow: isPulsing
          ? `0 0 20px 8px ${elementColors[card.element]}80`
          : isSelected
          ? `0 0 15px 5px ${elementColors[card.element]}40`
          : '0 4px 8px rgba(0, 0, 0, 0.3)',
      }}
      transition={{
        rotateY: { duration: 0.4, ease: 'easeInOut' },
        y: { duration: 0.2, ease: 'easeOut' },
        scale: { duration: 0.2 },
        boxShadow: { duration: 0.3 },
      }}
    >
      <div style={backStyle}>
        <div
          style={{
            fontSize: isSmall ? 20 : 28,
            color: '#d4af37',
            textShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
          }}
        >
          ✦
        </div>
      </div>

      <div style={frontStyle}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isSmall ? 24 : 32,
          }}
        >
          {card.symbol}
        </div>

        <div
          style={{
            textAlign: 'center',
            fontSize: fontSize,
            fontWeight: 'bold',
            color: elementColors[card.element],
            fontFamily: 'Georgia, serif',
            marginBottom: isSmall ? 2 : 4,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {card.name}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isSmall ? 2 : 4,
            paddingTop: isSmall ? 2 : 4,
            borderTop: `1px solid ${elementColors[card.element]}40`,
          }}
        >
          <div
            style={{
              width: isSmall ? 6 : 8,
              height: isSmall ? 6 : 8,
              borderRadius: '50%',
              background: elementColors[card.element],
              boxShadow: `0 0 ${isSmall ? 4 : 6}px ${elementColors[card.element]}`,
            }}
          />
          <span
            style={{
              fontSize: isSmall ? 10 : 12,
              fontWeight: 'bold',
              color: elementColors[card.element],
            }}
          >
            +{card.energyValue}
          </span>
        </div>

        {card.suppressed && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(50, 50, 80, 0.7)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isSmall ? 16 : 20,
            }}
          >
            ⛔
          </div>
        )}
      </div>

      {isHovered && !showBack && onClick && (
        <Tooltip card={card} isSmall={isSmall} />
      )}
    </motion.div>
  );
};

const Tooltip: React.FC<{ card: CardType; isSmall: boolean }> = ({ card, isSmall }) => {
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: isSmall ? 150 : 200,
    padding: '8px 10px',
    background: 'rgba(20, 15, 40, 0.95)',
    border: '1px solid #d4af37',
    borderRadius: '6px',
    color: '#e8e0c8',
    fontSize: isSmall ? 10 : 12,
    fontFamily: 'Georgia, serif',
    lineHeight: 1.4,
    zIndex: 1000,
    pointerEvents: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    marginBottom: '8px',
  };

  return (
    <div style={tooltipStyle}>
      <div
        style={{
          fontWeight: 'bold',
          color: '#d4af37',
          marginBottom: '4px',
          textAlign: 'center',
        }}
      >
        {card.name}
      </div>
      <div style={{ color: '#a8a0b0', marginBottom: '4px' }}>
        {card.arcanaType === 'major' ? '大阿卡那' : '小阿卡那'} · {card.effect}
      </div>
      <div style={{ color: '#c0b8a8' }}>{card.description}</div>
      <div
        style={{
          position: 'absolute',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #d4af37',
        }}
      />
    </div>
  );
};

export default CardComponent;
