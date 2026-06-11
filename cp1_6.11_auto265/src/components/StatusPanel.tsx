import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SimulationStats, COLORS, BACTERIA_COLORS, rgbToHex } from '../utils/constants';

interface StatusPanelProps {
  stats: SimulationStats;
  bacteriaColors: { color: string; count: number }[];
}

interface BacteriaChartProps {
  colors: { color: string; count: number }[];
}

const BacteriaChart: React.FC<BacteriaChartProps> = ({ colors }) => {
  const total = colors.reduce((sum, c) => sum + c.count, 0);
  
  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', color: COLORS.textGray, opacity: 0.5, fontSize: 12 }}>
        暂无共生菌群
      </div>
    );
  }

  let currentAngle = -Math.PI / 2;
  const size = 120;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={COLORS.sliderTrack}
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {colors.map((item, index) => {
          if (item.count === 0) return null;
          
          const angle = (item.count / total) * Math.PI * 2;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          const x1 = center + radius * Math.cos(startAngle);
          const y1 = center + radius * Math.sin(startAngle);
          const x2 = center + radius * Math.cos(endAngle);
          const y2 = center + radius * Math.sin(endAngle);
          
          const largeArc = angle > Math.PI ? 1 : 0;

          return (
            <motion.path
              key={index}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: index * 0.1 }}
              style={{
                filter: `drop-shadow(0 0 4px ${item.color})`,
              }}
            />
          );
        })}
        <circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2 - 5}
          fill="none"
          stroke={COLORS.glowCyan}
          strokeWidth={1}
          opacity={0.3}
        />
      </svg>
    </div>
  );
};

export const StatusPanel: React.FC<StatusPanelProps> = ({ stats, bacteriaColors }) => {
  const sortedColors = useMemo(() => {
    return [...bacteriaColors].filter(c => c.count > 0).sort((a, b) => b.count - a.count);
  }, [bacteriaColors]);

  return (
    <>
      <motion.div
        initial={{ x: 250, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.3 }}
        style={{
          position: 'absolute',
          right: 20,
          top: 20,
          width: 200,
          padding: 16,
          backgroundColor: COLORS.panelBg,
          backdropFilter: 'blur(10px)',
          borderRadius: 12,
          border: `2px solid ${COLORS.glowCyan}40`,
          boxShadow: `0 0 20px ${COLORS.glowCyan}30, inset 0 0 20px rgba(0,0,0,0.3)`,
          zIndex: 10,
        }}
      >
        <h3
          style={{
            color: COLORS.glowCyan,
            fontSize: 14,
            fontFamily: "'Courier New', monospace",
            marginBottom: 12,
            textAlign: 'center',
            textShadow: `0 0 8px ${COLORS.glowCyan}`,
            letterSpacing: 1,
          }}
        >
          实时数据
        </h3>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: COLORS.textGray, fontSize: 12, fontFamily: "'Courier New', monospace" }}>
              盲虾数量
            </span>
            <motion.span
              key={stats.shrimpCount}
              initial={{ scale: 1.2, color: '#00e5ff' }}
              animate={{ scale: 1, color: COLORS.textGray }}
              style={{
                color: '#ffffff',
                fontSize: 18,
                fontFamily: "'Courier New', monospace",
                fontWeight: 'bold',
              }}
            >
              {stats.shrimpCount}
            </motion.span>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: COLORS.textGray, fontSize: 12, fontFamily: "'Courier New', monospace" }}>
              菌群覆盖率
            </span>
            <motion.span
              key={stats.bacteriaCoverage}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              style={{
                color: '#00e676',
                fontSize: 16,
                fontFamily: "'Courier New', monospace",
                fontWeight: 'bold',
                textShadow: '0 0 8px rgba(0, 230, 118, 0.5)',
              }}
            >
              {stats.bacteriaCoverage.toFixed(1)}%
            </motion.span>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: COLORS.textGray, fontSize: 12, fontFamily: "'Courier New', monospace" }}>
              共生配对
            </span>
            <motion.span
              key={stats.symbiosisCount}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              style={{
                color: '#e040fb',
                fontSize: 16,
                fontFamily: "'Courier New', monospace",
                fontWeight: 'bold',
                textShadow: '0 0 8px rgba(224, 64, 251, 0.5)',
              }}
            >
              {stats.symbiosisCount}
            </motion.span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: COLORS.textGray, fontSize: 12, fontFamily: "'Courier New', monospace" }}>
              带菌盲虾
            </span>
            <motion.span
              key={stats.bacteriaWithShrimp}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              style={{
                color: '#ffd700',
                fontSize: 14,
                fontFamily: "'Courier New', monospace",
                fontWeight: 'bold',
                textShadow: '0 0 8px rgba(255, 215, 0, 0.5)',
              }}
            >
              {stats.bacteriaWithShrimp} / {stats.shrimpCount}
            </motion.span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.4 }}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 20,
          transform: 'translateX(-50%)',
          padding: '16px 24px',
          backgroundColor: COLORS.panelBg,
          backdropFilter: 'blur(10px)',
          borderRadius: 12,
          border: `2px solid ${COLORS.glowCyan}40`,
          boxShadow: `0 0 20px ${COLORS.glowCyan}30, inset 0 0 20px rgba(0,0,0,0.3)`,
          zIndex: 10,
        }}
      >
        <h3
          style={{
            color: COLORS.glowCyan,
            fontSize: 13,
            fontFamily: "'Courier New', monospace",
            marginBottom: 12,
            textAlign: 'center',
            textShadow: `0 0 8px ${COLORS.glowCyan}`,
            letterSpacing: 1,
          }}
        >
          菌群图谱
        </h3>
        
        <BacteriaChart colors={sortedColors} />

        {sortedColors.length > 0 && (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {sortedColors.slice(0, 6).map((item, index) => (
              <motion.div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    boxShadow: `0 0 6px ${item.color}`,
                  }}
                />
                <span
                  style={{
                    color: COLORS.textGray,
                    fontSize: 10,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {item.count}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
};
