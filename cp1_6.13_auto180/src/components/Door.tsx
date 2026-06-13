import React from 'react';

interface DoorProps {
  isNight: boolean;
  onToggle: () => void;
}

const Door: React.FC<DoorProps> = ({ isNight, onToggle }) => {
  return (
    <div
      style={{
        ...styles.wrapper,
        cursor: 'pointer',
      }}
      onClick={onToggle}
      title={isNight ? '点击开启白昼' : '点击切换夜晚'}
    >
      <svg width="120" height="340" viewBox="0 0 120 340" style={styles.svg}>
        <defs>
          <linearGradient id="doorFrameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5d4037" />
            <stop offset="50%" stopColor="#6d4c41" />
            <stop offset="100%" stopColor="#5d4037" />
          </linearGradient>
          <pattern id="shojiPaper" patternUnits="userSpaceOnUse" width="40" height="60">
            <rect width="40" height="60" fill="rgba(255,248,240,0.75)" />
            <line x1="0" y1="0" x2="0" y2="60" stroke="rgba(188,170,164,0.4)" strokeWidth="1.5" />
            <line x1="40" y1="0" x2="40" y2="60" stroke="rgba(188,170,164,0.4)" strokeWidth="1.5" />
            <line x1="0" y1="30" x2="40" y2="30" stroke="rgba(188,170,164,0.4)" strokeWidth="1" />
          </pattern>
          <radialGradient id="nightGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isNight ? '#ffcc80' : 'transparent'} stopOpacity="0.7" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="120" height="340" fill="url(#nightGlow)" />

        <rect x="4" y="4" width="112" height="332" fill="url(#doorFrameGrad)" rx="2" />

        <rect x="14" y="14" width="92" height="312" fill="url(#shojiPaper)" />

        <line x1="60" y1="14" x2="60" y2="326" stroke="#5d4037" strokeWidth="2.5" />
        <line x1="14" y1="120" x2="106" y2="120" stroke="#5d4037" strokeWidth="2" />
        <line x1="14" y1="226" x2="106" y2="226" stroke="#5d4037" strokeWidth="2" />

        <line x1="37" y1="14" x2="37" y2="326" stroke="rgba(93,64,55,0.5)" strokeWidth="1" />
        <line x1="83" y1="14" x2="83" y2="326" stroke="rgba(93,64,55,0.5)" strokeWidth="1" />
        <line x1="14" y1="67" x2="106" y2="67" stroke="rgba(93,64,55,0.4)" strokeWidth="0.8" />
        <line x1="14" y1="173" x2="106" y2="173" stroke="rgba(93,64,55,0.4)" strokeWidth="0.8" />
        <line x1="14" y1="280" x2="106" y2="280" stroke="rgba(93,64,55,0.4)" strokeWidth="0.8" />

        <rect x="10" y="4" width="100" height="10" fill="#4e342e" rx="1" />
        <rect x="10" y="326" width="100" height="10" fill="#4e342e" rx="1" />

        <g transform="translate(70, 170)">
          <circle cx="0" cy="0" r="5" fill="#3e2723" />
          <circle cx="0" cy="0" r="3" fill="#6d4c41" />
        </g>

        <g transform="translate(32, 46)" opacity="0.55">
          {isNight ? (
            <>
              <circle cx="10" cy="10" r="9" fill="#fff9c4" opacity="0.9" />
              <circle cx="7" cy="8" r="2" fill="#fffde7" opacity="0.7" />
              <circle cx="13" cy="12" r="1.5" fill="#fffde7" opacity="0.7" />
            </>
          ) : (
            <>
              <circle cx="10" cy="10" r="9" fill="#fff9c4" />
              {[0, 60, 120, 180, 240, 300].map(a => (
                <line
                  key={a}
                  x1={10 + Math.cos(a * Math.PI / 180) * 11}
                  y1={10 + Math.sin(a * Math.PI / 180) * 11}
                  x2={10 + Math.cos(a * Math.PI / 180) * 14}
                  y2={10 + Math.sin(a * Math.PI / 180) * 14}
                  stroke="#fff9c4"
                  strokeWidth="1.5"
                />
              ))}
            </>
          )}
        </g>

        <text x="60" y="315" textAnchor="middle" fontSize="8" fill="#3e2723" opacity="0.6" letterSpacing="2">
          {isNight ? '夜' : '昼'}
        </text>
      </svg>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'absolute',
    left: '2%',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 20,
  },
  svg: {
    display: 'block',
    filter: 'drop-shadow(4px 4px 12px rgba(0,0,0,0.35))',
    transition: 'transform 0.3s ease',
  },
};

export default Door;
