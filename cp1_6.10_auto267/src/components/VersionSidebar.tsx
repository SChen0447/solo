import React, { useState } from 'react';
import { RadarVersion, DIMENSION_KEYS, DIMENSION_LABELS } from '../types';

interface VersionSidebarProps {
  versions: RadarVersion[];
  currentVersionId: string;
  compareMode: boolean;
  compareVersionId: string | null;
  onVersionSelect: (versionId: string) => void;
  onCompareSelect: (versionId: string | null) => void;
  colorTheme: { start: string; end: string };
}

const VersionSidebar: React.FC<VersionSidebarProps> = ({
  versions,
  currentVersionId,
  compareMode,
  compareVersionId,
  onVersionSelect,
  onCompareSelect,
  colorTheme
}) => {
  const [showAll, setShowAll] = useState(false);

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const MiniRadar: React.FC<{ version: RadarVersion; size?: number }> = ({ version, size = 60 }) => {
    const sides = 5;
    const radius = size * 0.35;
    const cx = size / 2;
    const cy = size / 2;
    const angleStep = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2;

    const points: string[] = [];
    for (let i = 0; i < sides; i++) {
      const key = DIMENSION_KEYS[i];
      const value = version.dimensions[key];
      const angle = startAngle + i * angleStep;
      const r = (value / 10) * radius;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      points.push(`${x},${y}`);
    }

    const gradId = `grad-${version.id}`;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorTheme.start} stopOpacity="0.7" />
            <stop offset="100%" stopColor={colorTheme.end} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <polygon
          points={points.join(' ')}
          fill={`url(#${gradId})`}
          stroke="#7f5539"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  const sortedVersions = [...versions].sort((a, b) => b.timestamp - a.timestamp);
  const displayVersions = showAll ? sortedVersions : sortedVersions.slice(0, 3);
  const hasMore = sortedVersions.length > 3;

  return (
    <div
      style={{
        background: 'rgba(245, 240, 232, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '20px',
        maxHeight: '100%',
        overflowY: 'auto',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#5c3a21', fontSize: '16px', fontWeight: 600 }}>
          版本历史
        </h3>
        {sortedVersions.length > 0 && (
          <span style={{ fontSize: '12px', color: '#7f5539' }}>
            共 {sortedVersions.length} 个版本
          </span>
        )}
      </div>

      {sortedVersions.length === 0 ? (
        <div style={{ color: '#7f5539', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
          暂无版本记录
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayVersions.map((version, idx) => {
            const isCurrent = version.id === currentVersionId;
            const isCompare = version.id === compareVersionId;

            return (
              <div
                key={version.id}
                onClick={() => {
                  if (compareMode && !isCurrent) {
                    onCompareSelect(isCompare ? null : version.id);
                  } else {
                    onVersionSelect(version.id);
                  }
                }}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  background: isCurrent ? 'rgba(230, 204, 178, 0.5)' : 'rgba(255, 248, 240, 0.6)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: `2px solid ${isCompare ? '#e74c3c' : isCurrent ? '#b08968' : 'transparent'}`,
                  transition: 'all 0.2s ease-out',
                  boxShadow: isCurrent ? '0 4px 12px rgba(176, 137, 104, 0.2)' : '0 2px 8px rgba(0,0,0,0.06)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <MiniRadar version={version} size={60} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#5c3a21', fontSize: '13px' }}>
                      {version.isAdjusted ? `调整版本` : '初始版本'}
                    </span>
                    {idx === 0 && (
                      <span style={{
                        fontSize: '11px',
                        background: '#e6ccb2',
                        color: '#5c3a21',
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        最新
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f5539', marginBottom: '6px' }}>
                    {formatTime(version.timestamp)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#a0826d', lineHeight: 1.5 }}>
                    {DIMENSION_KEYS.map(k => (
                      <span key={k} style={{ marginRight: '8px' }}>
                        {DIMENSION_LABELS[k]}: {version.dimensions[k].toFixed(1)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '10px 16px',
            background: 'rgba(176, 137, 104, 0.15)',
            border: 'none',
            borderRadius: '8px',
            color: '#7f5539',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease-out',
            fontWeight: 500
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.background = 'rgba(176, 137, 104, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = 'rgba(176, 137, 104, 0.15)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {showAll ? '收起历史' : `查看全部历史（还有 ${sortedVersions.length - 3} 个）`}
        </button>
      )}
    </div>
  );
};

export default VersionSidebar;
