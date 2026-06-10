import React, { useMemo } from 'react';
import type { Sticker, Rarity } from './types';
import { RARITY_COLORS, RARITY_LABELS } from './types';

interface ProgressDashboardProps {
  stickers: Sticker[];
  collectedIds: string[];
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  stickers,
  collectedIds
}) => {
  const stats = useMemo(() => {
    const total = stickers.length;
    const collected = collectedIds.length;
    const overallPercent = total === 0 ? 0 : (collected / total) * 100;

    const byRarity: Record<Rarity, { total: number; collected: number; percent: number }> = {
      common: { total: 0, collected: 0, percent: 0 },
      rare: { total: 0, collected: 0, percent: 0 },
      legendary: { total: 0, collected: 0, percent: 0 }
    };

    stickers.forEach(s => {
      byRarity[s.rarity].total++;
      if (collectedIds.includes(s.id)) {
        byRarity[s.rarity].collected++;
      }
    });

    (Object.keys(byRarity) as Rarity[]).forEach(r => {
      const { total, collected } = byRarity[r];
      byRarity[r].percent = total === 0 ? 0 : (collected / total) * 100;
    });

    return { total, collected, overallPercent, byRarity };
  }, [stickers, collectedIds]);

  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (stats.overallPercent / 100) * circumference;

  return (
    <div style={styles.container} className="fade-in">
      <div style={styles.header}>
        <span style={styles.title}>收藏进度</span>
      </div>

      <div style={styles.content}>
        <div style={styles.chartSection}>
          <svg width={size} height={size} style={styles.svg}>
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5c6bc0" />
                <stop offset="100%" stopColor="#7c4dff" />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#e0e0e0"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={styles.percentText}
            >
              {stats.overallPercent.toFixed(0)}%
            </text>
            <text
              x="50%"
              y="60%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={styles.countText}
            >
              {stats.collected} / {stats.total}
            </text>
          </svg>
        </div>

        <div style={styles.barsSection}>
          {(Object.keys(stats.byRarity) as Rarity[]).map(rarity => {
            const data = stats.byRarity[rarity];
            return (
              <div key={rarity} style={styles.barRow}>
                <div style={styles.barHeader}>
                  <span style={{ ...styles.barLabel, color: RARITY_COLORS[rarity] }}>
                    {RARITY_LABELS[rarity]}
                  </span>
                  <span style={styles.barCount}>
                    {data.collected} / {data.total}
                  </span>
                </div>
                <div style={styles.progressBg}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${data.percent}%`,
                      backgroundColor: RARITY_COLORS[rarity]
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 2px 12px rgba(93, 64, 55, 0.08)'
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#5d4037'
  },
  content: {
    display: 'flex',
    gap: 40,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  chartSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  svg: {
    filter: 'drop-shadow(0 2px 8px rgba(92, 107, 192, 0.2))'
  },
  percentText: {
    fontSize: 36,
    fontWeight: 700,
    fill: '#5d4037'
  },
  countText: {
    fontSize: 14,
    fill: '#a1887f'
  },
  barsSection: {
    flex: 1,
    minWidth: 280,
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  barRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  barHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  barLabel: {
    fontSize: 14,
    fontWeight: 600
  },
  barCount: {
    fontSize: 13,
    color: '#a1887f'
  },
  progressBg: {
    width: '100%',
    height: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    transition: 'width 0.6s ease'
  }
};

export default ProgressDashboard;
