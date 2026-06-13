import React from 'react';
import { getPoeticEvaluation, getScoreColor } from '../utils/teaTypes';

interface ScrollProps {
  score: number;
  deformationCount: number;
  pourCount: number;
  stirCount: number;
}

const Scroll: React.FC<ScrollProps> = ({ score, deformationCount, pourCount, stirCount }) => {
  const evaluation = getPoeticEvaluation(score);
  const textColor = getScoreColor(score);
  const pct = Math.min(100, (score / 300) * 100);

  return (
    <div style={styles.wrapper}>
      <svg width="200" height="300" viewBox="0 0 200 300" style={styles.svg}>
        <defs>
          <pattern id="ricePaperTex" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#f5f0e8" />
            <rect x="0" y="0" width="1" height="1" fill="rgba(188,170,164,0.15)" />
            <rect x="2" y="2" width="1" height="1" fill="rgba(188,170,164,0.1)" />
          </pattern>
          <linearGradient id="rodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6d4c41" />
            <stop offset="50%" stopColor="#5d4037" />
            <stop offset="100%" stopColor="#4e342e" />
          </linearGradient>
          <filter id="scrollShadow" x="-10%" y="-5%" width="120%" height="110%">
            <feDropShadow dx="3" dy="6" stdDeviation="4" floodColor="#3e2723" floodOpacity="0.4" />
          </filter>
        </defs>

        <g filter="url(#scrollShadow)">
          <rect x="10" y="8" width="180" height="16" rx="8" fill="url(#rodGrad)" />
          <circle cx="12" cy="16" r="7" fill="#3e2723" />
          <circle cx="188" cy="16" r="7" fill="#3e2723" />

          <rect x="18" y="20" width="164" height="256" fill="url(#ricePaperTex)" />
          <rect x="18" y="20" width="4" height="256" fill="rgba(141,110,99,0.3)" />
          <rect x="178" y="20" width="4" height="256" fill="rgba(141,110,99,0.3)" />
          <rect x="18" y="20" width="164" height="2" fill="rgba(141,110,99,0.2)" />
          <rect x="18" y="274" width="164" height="2" fill="rgba(141,110,99,0.2)" />

          <text x="100" y="60" textAnchor="middle" fontSize="14" fill="#8d6e63" letterSpacing="6" fontWeight="600">
            茶 道
          </text>
          <line x1="50" y1="72" x2="150" y2="72" stroke="#bcaaa4" strokeWidth="0.6" />

          <foreignObject x="28" y="92" width="144" height="80">
            <div style={{
              fontFamily: '"STXingkai", "KaiTi", "楷体", cursive',
              fontSize: '18px',
              color: textColor,
              textAlign: 'center',
              lineHeight: '1.5',
              letterSpacing: '2px',
              fontWeight: 600,
              textShadow: '1px 1px 0 rgba(188,170,164,0.5)',
              transition: 'color 0.5s ease',
            }}>
              {evaluation}
            </div>
          </foreignObject>

          <g transform="translate(28, 188)">
            <rect x="0" y="0" width="144" height="8" fill="rgba(188,170,164,0.3)" rx="4" />
            <rect x="0" y="0" width={144 * pct / 100} height="8" fill={textColor} rx="4" style={{ transition: 'all 0.6s ease' }} />
          </g>

          <text x="100" y="218" textAnchor="middle" fontSize="11" fill="#6d4c41" letterSpacing="2">
            茶心 · {score} / 300
          </text>

          <g transform="translate(32, 232)">
            <text x="0" y="14" fontSize="9" fill="#8d6e63">揉 {deformationCount}</text>
            <text x="48" y="14" fontSize="9" fill="#8d6e63">注 {pourCount}</text>
            <text x="96" y="14" fontSize="9" fill="#8d6e63">搅 {stirCount}</text>
          </g>

          <rect x="10" y="276" width="180" height="16" rx="8" fill="url(#rodGrad)" />
          <circle cx="12" cy="284" r="7" fill="#3e2723" />
          <circle cx="188" cy="284" r="7" fill="#3e2723" />
        </g>
      </svg>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'absolute',
    top: '3%',
    right: '3%',
    zIndex: 20,
    filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.3))',
  },
  svg: {
    display: 'block',
  },
};

export default Scroll;
