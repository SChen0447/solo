import React, { useState, useRef, useEffect } from 'react';
import { Capsule, EMOTION_COLORS, EMOTION_LABELS } from '../backend/types';

interface PrismViewerProps {
  capsule: Capsule;
  index: number;
  isExpanded: boolean;
  isHighlighted: boolean;
  isGlowing: boolean;
  onToggleExpand: (id: string | null) => void;
}

const PrismViewer: React.FC<PrismViewerProps> = ({
  capsule,
  index,
  isExpanded,
  isHighlighted,
  isGlowing,
  onToggleExpand,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const color = EMOTION_COLORS[capsule.emotion];
  const label = EMOTION_LABELS[capsule.emotion];

  const rotationDelay = index * 0.3;
  const floatOffset = Math.sin(index * 1.2) * 20;

  const handlePrismClick = (): void => {
    if (!isExpanded) {
      onToggleExpand(capsule.id);
    }
  };

  return (
    <div
      style={{
        position: 'relative' as const,
        width: '80px',
        height: '80px',
        transformStyle: 'preserve-3d' as const,
        cursor: 'pointer',
        opacity: isHighlighted ? 1 : 0.3,
        transition: 'opacity 0.3s ease-in-out',
        '@media (max-width: 768px)': {
          width: '60px',
          height: '60px',
        } as React.CSSProperties,
      }}
      className="prism-wrapper"
    >
      <div
        onClick={handlePrismClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'absolute' as const,
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d' as const,
          transform: isExpanded
            ? 'rotateY(0deg) scale(3.5) translateZ(100px)'
            : isHovered
            ? `scale(1.2) translateY(${floatOffset}px)`
            : `translateY(${floatOffset}px)`,
          transition: 'transform 0.8s ease-in-out',
          animation: !isHovered && !isExpanded ? `prismSpin 4s linear infinite` : 'none',
          animationDelay: `${rotationDelay}s`,
        }}
        className={`prism-3d ${isGlowing ? 'glow-pulse' : ''}`}
      >
        {[0, 1, 2, 3, 4, 5].map((face) => {
          const rotateY = face * 60;
          return (
            <div
              key={face}
              style={{
                position: 'absolute' as const,
                width: '80px',
                height: '80px',
                background: `linear-gradient(135deg, ${color}80, ${color}40)`,
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                boxShadow: '0 0 15px rgba(255,255,255,0.1)',
                transform: `rotateY(${rotateY}deg) translateZ(40px)`,
                backfaceVisibility: 'hidden' as const,
                '@media (max-width: 768px)': {
                  width: '60px',
                  height: '60px',
                  transform: `rotateY(${rotateY}deg) translateZ(30px)`,
                } as React.CSSProperties,
              }}
            />
          );
        })}
      </div>

      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute' as const,
            width: '280px',
            height: '340px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) translateZ(150px)',
            background: `linear-gradient(180deg, ${color}cc, ${color}e6)`,
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center' as const,
            gap: '16px',
            boxShadow: `0 0 30px ${color}66, 0 10px 40px rgba(0,0,0,0.3)`,
            border: '1px solid rgba(255,255,255,0.3)',
            transition: 'all 0.8s ease-in-out',
            zIndex: 1000,
          }}
          className="expanded-card"
        >
          <div
            style={{
              fontSize: '20px',
              color: 'white',
              fontWeight: 'bold',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              letterSpacing: '2px',
            }}
          >
            {label}
          </div>

          <div
            style={{
              width: '120px',
              height: '80px',
              borderRadius: '8px',
              overflow: 'hidden' as const,
              background: 'rgba(255,255,255,0.1)',
              position: 'relative' as const,
              flexShrink: 0,
            }}
          >
            {!imageLoaded && (
              <div
                style={{
                  position: 'absolute' as const,
                  inset: 0,
                  background: `linear-gradient(90deg, ${color}40, ${color}80, ${color}40)`,
                  backgroundSize: '200% 100%',
                  animation: 'pulsePlaceholder 1.5s ease-in-out infinite',
                  borderRadius: '8px',
                }}
              />
            )}
            {capsule.image ? (
              <img
                src={capsule.image}
                alt="memory"
                onLoad={() => setImageLoaded(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover' as const,
                  display: imageLoaded ? 'block' : 'none',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center' as const,
                  justifyContent: 'center' as const,
                  fontSize: '36px',
                }}
              >
                ✨
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: '14px',
              color: 'white',
              lineHeight: 1.6,
              textAlign: 'left' as const,
              maxHeight: '160px',
              overflowY: 'auto' as const,
              paddingRight: '8px',
              wordBreak: 'break-word' as const,
            }}
          >
            {capsule.text}
          </div>

          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.7)',
              marginTop: 'auto',
            }}
          >
            {new Date(capsule.createdAt).toLocaleDateString('zh-CN')}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrismViewer;
