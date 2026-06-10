import React, { useEffect } from 'react';
import type { Theme } from '../types';

interface ThemeCardProps {
  theme: Theme;
  timeLeft: number;
  onTimeout: () => void;
  isTimeUp: boolean;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, timeLeft, onTimeout, isTimeUp }) => {
  useEffect(() => {
    if (timeLeft === 0 && !isTimeUp) {
      onTimeout();
    }
  }, [timeLeft, isTimeUp, onTimeout]);

  const progress = (timeLeft / 60) * 100;
  const circumference = 2 * Math.PI * 34;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#d4a373',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 4px 16px rgba(139, 105, 66, 0.25)',
      minWidth: 240,
      flexShrink: 0
    },
    label: {
      fontSize: 12,
      color: '#6b4f35',
      fontWeight: 500,
      letterSpacing: 1,
      textTransform: 'uppercase'
    },
    themeName: {
      fontSize: 20,
      fontWeight: 700,
      color: '#3d2c1a',
      textAlign: 'center',
      lineHeight: 1.3
    },
    themeDesc: {
      fontSize: 13,
      color: '#5a4230',
      textAlign: 'center'
    },
    progressContainer: {
      position: 'relative',
      width: 80,
      height: 80,
      marginTop: 4
    },
    progressSvg: {
      transform: 'rotate(-90deg)',
      width: 80,
      height: 80
    },
    progressBg: {
      fill: 'none',
      stroke: 'rgba(255,255,255,0.3)',
      strokeWidth: 6
    },
    progressBar: {
      fill: 'none',
      stroke: '#e07a5f',
      strokeWidth: 6,
      strokeLinecap: 'round',
      strokeDasharray: circumference,
      strokeDashoffset: strokeDashoffset,
      transition: 'stroke-dashoffset 1s linear'
    },
    timeText: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: 20,
      fontWeight: 700,
      color: isTimeUp ? '#999' : '#3d2c1a'
    },
    timeLabel: {
      fontSize: 11,
      color: '#6b4f35',
      marginTop: -4
    }
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>🎯 今日挑战主题</span>
      <h2 style={styles.themeName}>{theme.name}</h2>
      <p style={styles.themeDesc}>{theme.description}</p>
      <div style={styles.progressContainer}>
        <svg style={styles.progressSvg}>
          <circle cx="40" cy="40" r="34" style={styles.progressBg} />
          <circle
            cx="40" cy="40" r="34" style={styles.progressBar} />
        </svg>
        <span style={styles.timeText}>{timeLeft}s</span>
      </div>
      <span style={styles.timeLabel}>剩余时间</span>
    </div>
  );
};

export default ThemeCard;
