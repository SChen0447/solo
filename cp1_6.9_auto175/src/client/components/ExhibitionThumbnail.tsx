import { useState } from 'react';
import type { Exhibition, Exhibit } from '../../shared/types';

interface Props {
  exhibition: Exhibition;
  exhibits: Exhibit[];
  onClick: () => void;
}

export default function ExhibitionThumbnail({ exhibition, exhibits, onClick }: Props) {
  const [hovering, setHovering] = useState(false);
  const thumbW = 280;
  const thumbH = 200;
  const centerX = thumbW / 2;
  const centerY = thumbH / 2;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        width: thumbW,
        cursor: 'pointer',
        position: 'relative'
      }}
    >
      <div
        style={{
          width: '100%',
          height: thumbH,
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          background: `radial-gradient(ellipse at center, ${exhibition.themeColor}22 0%, #0a0a14 70%)`,
          border: `1px solid ${hovering ? exhibition.themeColor + '88' : 'rgba(68, 85, 170, 0.3)'}`,
          boxShadow: hovering
            ? `0 0 40px ${exhibition.themeColor}55, inset 0 0 60px ${exhibition.themeColor}11`
            : '0 4px 20px rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease'
        }}
      >
        {exhibits.length > 0 && (
          <svg width={thumbW} height={thumbH} style={{ position: 'absolute', inset: 0 }}>
            {exhibits.slice(0, 5).map((ex, i) => {
              const scaleX = thumbW / 1000;
              const scaleY = thumbH / 600;
              const cx = centerX + (ex.x - 500) * scaleX * 0.8;
              const cy = centerY + (ex.y - 300) * scaleY * 0.8;
              const r = 18;
              return (
                <g key={ex.id}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 6}
                    fill={ex.glowColor}
                    opacity={0.15}
                  >
                    <animate attributeName="r" values={`${r + 4};${r + 12};${r + 4}`} dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="#1a1a2e"
                    stroke={ex.glowColor}
                    strokeWidth={2}
                    opacity={0.9}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 0.6}
                    fill={ex.glowColor}
                    opacity={0.6}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {hovering && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 80,
              height: 4,
              borderRadius: 2,
              background: 'linear-gradient(90deg, #ffaa66, #66aaff, #ffaa66)',
              backgroundSize: '200% 100%',
              animation: 'glowShift 2s ease-in-out infinite',
              boxShadow: '0 0 20px #ffaa66, 0 0 30px #66aaff'
            }}
          />
        )}

        <style>{`
          @keyframes glowShift {
            0%, 100% { background-position: 0% 50%; opacity: 0.7; }
            50% { background-position: 100% 50%; opacity: 1; }
          }
        `}</style>
      </div>

      <div style={{ padding: '14px 4px' }}>
        <h3 style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#e0e0ff',
          marginBottom: 6
        }}>
          {exhibition.name}
        </h3>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#8080a0' }}>
          <span>❤ {exhibition.likes}</span>
          <span>👁 {exhibition.visitors.length}</span>
          <span>⬢ {exhibits.length} 件展品</span>
        </div>
      </div>
    </div>
  );
}
