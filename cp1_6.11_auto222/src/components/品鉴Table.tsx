import React from 'react';
import { motion } from 'framer-motion';

interface PinJianTableProps {
  scores: {
    density: number;
    uniformity: number;
    complexity: number;
    swipeRatio: number;
    total: number;
  };
}

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = (angleDeg - 90) * Math.PI / 180.0;
  return {
    x: cx + (r * Math.cos(rad)),
    y: cy + (r * Math.sin(rad))
  };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

const RING_COLORS = [
  { inner: '#a8d4a8', outer: '#3d6b54', name: '密度' },
  { inner: '#d4d4a8', outer: '#8a8a4a', name: '均匀' },
  { inner: '#d4b8a8', outer: '#8a5a3a', name: '复杂' },
  { inner: '#e8d4a8', outer: '#a8783a', name: '涂抹' },
  { inner: '#d4a8a8', outer: '#6b3a3a', name: '综合' }
];

const PinJianTable: React.FC<PinJianTableProps> = ({ scores }) => {
  const cx = 140;
  const cy = 140;
  const maxR = 125;
  const ringWidth = 20;
  const gap = 3;

  const scoreValues = [
    scores.density,
    scores.uniformity,
    scores.complexity,
    scores.swipeRatio,
    scores.total
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <h3 className="ink-title" style={{ fontSize: '22px', margin: 0 }}>
        · 品鉴罗盘 ·
      </h3>

      <svg width="280" height="280" viewBox="0 0 280 280">
        <defs>
          <radialGradient id="compassBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5f0e0" />
            <stop offset="85%" stopColor="#e8dcc0" />
            <stop offset="100%" stopColor="#d4c090" />
          </radialGradient>
          {RING_COLORS.map((c, i) => (
            <linearGradient key={i} id={`ringGrad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={c.inner} />
              <stop offset="100%" stopColor={c.outer} />
            </linearGradient>
          ))}
        </defs>

        <circle cx={cx} cy={cy} r={maxR + 8} fill="#d4a017" opacity="0.3" />
        <circle cx={cx} cy={cy} r={maxR + 4} fill="url(#compassBg)" stroke="#8a6a2a" strokeWidth="2.5" />
        <circle cx={cx} cy={cy} r={maxR} fill="none" stroke="#a88a3a" strokeWidth="0.8" strokeDasharray="2 4" />

        {[...Array(24)].map((_, i) => {
          const angle = i * 15;
          const p1 = polarToCartesian(cx, cy, maxR - 1, angle);
          const p2 = polarToCartesian(cx, cy, maxR - 8, angle);
          const isMajor = i % 4 === 0;
          return (
            <line
              key={i}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={isMajor ? '#6b4423' : '#8a7a4a'}
              strokeWidth={isMajor ? 1.5 : 0.8}
              opacity={isMajor ? 0.8 : 0.4}
            />
          );
        })}

        {scoreValues.map((score, i) => {
          const outerR = maxR - i * (ringWidth + gap);
          const innerR = outerR - ringWidth;
          const angle = score * 3.6;

          return (
            <g key={i}>
              <circle
                cx={cx} cy={cy} r={(outerR + innerR) / 2}
                fill="none"
                stroke="#6b5e3a"
                strokeWidth="0.5"
                opacity="0.3"
              />
              {angle > 0.5 && (
                <motion.path
                  d={describeArc(cx, cy, (outerR + innerR) / 2, 0, Math.max(0.5, angle))}
                  stroke={`url(#ringGrad${i})`}
                  strokeWidth={ringWidth - 2}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }}
                  opacity="0.92"
                />
              )}
              <text
                x={cx}
                y={cy - outerR + ringWidth / 2 + 3}
                textAnchor="middle"
                fontSize="8"
                fill="#3d2817"
                fontWeight="700"
                opacity="0.6"
              >
                {RING_COLORS[i].name}
              </text>
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r="26" fill="url(#compassBg)" stroke="#8a6a2a" strokeWidth="1.5" />
        <motion.text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          fontSize="20"
          fontWeight="800"
          fill="#2b4d3e"
          fontFamily="'Ma Shan Zheng', cursive"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8, type: 'spring' }}
        >
          {Math.round(scores.total)}
        </motion.text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontSize="7"
          fill="#6b4423"
          opacity="0.7"
        >
          分
        </text>

        {[0, 90, 180, 270].map((a, i) => {
          const p = polarToCartesian(cx, cy, maxR - 10, a);
          const chars = ['子', '卯', '午', '酉'];
          return (
            <text
              key={i}
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              fontSize="9"
              fill="#6b4423"
              fontWeight="700"
              fontFamily="'Ma Shan Zheng', cursive"
              opacity="0.75"
            >
              {chars[i]}
            </text>
          );
        })}
      </svg>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '6px',
        width: '100%'
      }}>
        {RING_COLORS.map((c, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 4px',
            background: 'rgba(245, 240, 224, 0.6)',
            borderRadius: '8px',
            border: '1px solid rgba(212, 160, 23, 0.3)'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${c.inner}, ${c.outer})`,
              marginBottom: '4px',
              border: '1px solid rgba(107, 68, 35, 0.3)'
            }} />
            <span style={{ fontSize: '10px', opacity: 0.8 }}>{c.name}</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#2b4d3e' }}>
              {Math.round(scoreValues[i])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PinJianTable;
