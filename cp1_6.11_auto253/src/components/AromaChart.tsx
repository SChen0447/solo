import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { NoteInfo, BlendResult } from '@/types';

interface AromaChartProps {
  result: BlendResult | null;
}

interface PyramidLayer {
  label: string;
  notes: NoteInfo[];
  y: number;
  height: number;
  topWidth: number;
  bottomWidth: number;
}

export default function AromaChart({ result }: AromaChartProps) {
  const chartWidth = 400;
  const chartHeight = 350;
  const centerX = chartWidth / 2;
  const layerGap = 6;

  const layers = useMemo<PyramidLayer[]>(() => {
    if (!result) return [];

    const layerHeight = (chartHeight - layerGap * 2) / 3;

    return [
      {
        label: '前调',
        notes: result.topNotes,
        y: 0,
        height: layerHeight,
        topWidth: layerHeight * 0.6,
        bottomWidth: layerHeight * 1.4,
      },
      {
        label: '中调',
        notes: result.middleNotes,
        y: layerHeight + layerGap,
        height: layerHeight,
        topWidth: layerHeight * 1.4,
        bottomWidth: layerHeight * 2.2,
      },
      {
        label: '后调',
        notes: result.baseNotes,
        y: (layerHeight + layerGap) * 2,
        height: layerHeight,
        topWidth: layerHeight * 2.2,
        bottomWidth: layerHeight * 3,
      },
    ];
  }, [result]);

  const generateSectors = (
    notes: NoteInfo[],
    topWidth: number,
    bottomWidth: number,
    y: number,
    height: number
  ) => {
    if (notes.length === 0) return [];

    const total = notes.reduce((sum, n) => sum + n.ratio, 0);
    const sectors: JSX.Element[] = [];
    let currentTopOffset = -topWidth / 2;
    let currentBottomOffset = -bottomWidth / 2;

    notes.forEach((note, index) => {
      const ratio = note.ratio / total;
      const topSectorWidth = topWidth * ratio;
      const bottomSectorWidth = bottomWidth * ratio;

      const x1Top = centerX + currentTopOffset;
      const x2Top = x1Top + topSectorWidth;
      const x1Bottom = centerX + currentBottomOffset;
      const x2Bottom = x1Bottom + bottomSectorWidth;

      const pathD = `
        M ${x1Top} ${y}
        L ${x2Top} ${y}
        L ${x2Bottom} ${y + height}
        L ${x1Bottom} ${y + height}
        Z
      `;

      const gradientId = `gradient-${note.name}-${index}`;

      sectors.push(
        <g key={`${note.name}-${index}`}>
          <defs>
            <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={note.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={note.color} stopOpacity="0.3" />
            </radialGradient>
          </defs>
          <motion.path
            d={pathD}
            fill={`url(#${gradientId})`}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: index * 0.15, ease: 'easeOut' }}
            whileHover={{ opacity: 0.85 }}
          />
          <text
            x={(x1Top + x2Top) / 2}
            y={y + height / 2 + 4}
            textAnchor="middle"
            fill="#fff"
            fontSize="11"
            fontWeight="500"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {note.ratio}%
          </text>
          <text
            x={(x1Top + x2Top) / 2}
            y={y + height / 2 + 20}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize="10"
          >
            {note.name}
          </text>
        </g>
      );

      currentTopOffset += topSectorWidth;
      currentBottomOffset += bottomSectorWidth;
    });

    return sectors;
  };

  if (!result) {
    return (
      <div className="aroma-chart-section">
        <h2 className="section-title">香气金字塔</h2>
        <div className="empty-state">
          <div className="empty-state-icon">🔺</div>
          <p>混合完成后将显示香气金字塔</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="aroma-chart-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="section-title">香气金字塔</h2>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {layers.map((layer, layerIndex) => (
            <g key={layer.label}>
              {generateSectors(
                layer.notes.length > 0 ? layer.notes : [{ name: '无', ratio: 100, color: '#333' }],
                layer.topWidth,
                layer.bottomWidth,
                layer.y,
                layer.height
              )}

              <text
                x={centerX - layer.bottomWidth / 2 - 10}
                y={layer.y + layer.height / 2 + 4}
                textAnchor="end"
                fill="var(--accent-copper)"
                fontSize="12"
                fontWeight="500"
                style={{ letterSpacing: '2px' }}
              >
                {layer.label}
              </text>
            </g>
          ))}

          <line
            x1={centerX - 150}
            y1={chartHeight - 2}
            x2={centerX + 150}
            y2={chartHeight - 2}
            stroke="var(--accent-copper)"
            strokeWidth="2"
            opacity="0.5"
          />
        </svg>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          marginTop: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            综合评分
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              color: 'var(--accent-gold)',
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
            }}
          >
            {result.totalScore}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            持久度
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              color: 'var(--accent-gold)',
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
            }}
          >
            {result.longevity}%
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            扩散力
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              color: 'var(--accent-gold)',
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
            }}
          >
            {result.projection}%
          </div>
        </div>
      </div>
    </motion.div>
  );
}
