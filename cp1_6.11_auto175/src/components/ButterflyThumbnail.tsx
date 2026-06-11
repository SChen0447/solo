import React, { useRef, useEffect } from 'react';
import { Butterfly } from '../types';
import { drawButterflyThumbnail } from '../utils/butterflyRenderer';

interface ButterflyThumbnailProps {
  butterfly: Butterfly;
  size?: number;
  selected?: boolean;
  reserved?: boolean;
  onClick?: () => void;
}

const ButterflyThumbnail: React.FC<ButterflyThumbnailProps> = ({
  butterfly,
  size = 80,
  selected = false,
  reserved = false,
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    drawButterflyThumbnail(ctx, butterfly, size, size);
  }, [butterfly, size]);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size + 30,
        cursor: onClick ? 'pointer' : 'default',
        border: selected
          ? '2px solid #f39c12'
          : reserved
          ? '2px solid #ffd700'
          : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 4,
        transition: 'all 0.2s',
        boxShadow: reserved ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none',
        animation: reserved ? 'pulse-gold 0.3s ease-out' : undefined
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = selected
            ? '#f39c12'
            : reserved
            ? '#ffd700'
            : 'rgba(255,255,255,0.1)';
        }
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size - 8, height: size - 8 }}
      />
      <div style={{
        textAlign: 'center',
        fontSize: 11,
        color: '#bdc3c7',
        marginTop: 2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {butterfly.speciesName}
      </div>
      {reserved && (
        <div style={{
          position: 'absolute',
          top: 2,
          right: 2,
          fontSize: 10,
          color: '#ffd700'
        }}>
          ★
        </div>
      )}
    </div>
  );
};

export default ButterflyThumbnail;
