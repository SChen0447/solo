import React from 'react';
import type { Sticker } from '../types';
import '../styles/sticker.scss';

interface Props {
  sticker: Sticker;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  showTooltip?: boolean;
  className?: string;
}

function StickerBadge({
  sticker,
  size = 'md',
  onClick,
  selected,
  showTooltip = false,
  className = '',
}: Props): JSX.Element {
  const [c1, c2] = sticker.colors;
  const warmYellow = '#ffd66b';
  const gradientId = `sticker-grad-${sticker.id}-${size}`;
  const clipId = `sticker-clip-${sticker.id}-${size}`;
  const filterId = `sticker-tear-${sticker.id}-${size}`;

  const sizeMap = {
    sm: { w: 100, h: 38, fs: 10 },
    md: { w: 160, h: 60, fs: 13 },
    lg: { w: 220, h: 82, fs: 16 },
  };
  const dims = sizeMap[size];

  return (
    <div
      className={`sticker-badge sticker-badge--${size} ${selected ? 'is-selected' : ''} ${onClick ? 'is-clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-tooltip={showTooltip ? `${sticker.albumTitle} · ${sticker.genre}` : undefined}
    >
      <svg
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        width={dims.w}
        height={dims.h}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="60%" stopColor={c2} />
            <stop offset="100%" stopColor={warmYellow} />
          </linearGradient>
          <filter id={filterId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed={sticker.id.charCodeAt(sticker.id.length - 1)} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" />
          </filter>
          <clipPath id={clipId}>
            <rect
              x="4"
              y="4"
              width={dims.w - 8}
              height={dims.h - 8}
              rx="4"
              filter={`url(#${filterId})`}
            />
          </clipPath>
          <pattern id={`stripe-${sticker.id}-${size}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          </pattern>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width={dims.w} height={dims.h} fill={`url(#${gradientId})`} />
          <rect x="0" y="0" width={dims.w} height={dims.h} fill={`url(#stripe-${sticker.id}-${size})`} />
          <rect
            x="0"
            y="0"
            width={dims.w}
            height={dims.h}
            fill="none"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="2"
          />
        </g>

        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="rgba(255,255,255,0.95)"
          fontSize={dims.fs}
          fontFamily="'Noto Serif SC', serif"
          fontWeight="600"
          letterSpacing="1.5"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {sticker.genre}
        </text>

        <g opacity="0.6">
          {Array.from({ length: 6 }).map((_, i) => (
            <circle
              key={i}
              cx={8 + i * ((dims.w - 16) / 5)}
              cy={2}
              r="1.2"
              fill="rgba(255,255,255,0.4)"
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <circle
              key={`b-${i}`}
              cx={8 + i * ((dims.w - 16) / 5)}
              cy={dims.h - 2}
              r="1.2"
              fill="rgba(255,255,255,0.4)"
            />
          ))}
        </g>
      </svg>

      {showTooltip && (
        <div className="sticker-bubble">
          <div className="bubble__genre">{sticker.genre}</div>
          <div className="bubble__album">{sticker.albumTitle}</div>
          <div className="bubble__time">
            {new Date(sticker.unlockedAt).toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div className="bubble__arrow" />
        </div>
      )}
    </div>
  );
}

export default StickerBadge;
