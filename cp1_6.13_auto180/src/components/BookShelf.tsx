import React, { useState, useEffect } from 'react';
import { TeaSessionReport } from '../utils/teaTypes';

interface BookShelfProps {
  reports: TeaSessionReport[];
}

const BookShelf: React.FC<BookShelfProps> = ({ reports }) => {
  const [selectedReport, setSelectedReport] = useState<TeaSessionReport | null>(null);

  return (
    <>
      <div style={styles.wrapper}>
        <svg width="100%" height="100%" viewBox="0 0 280 400" preserveAspectRatio="xMidYMid meet" style={styles.svg}>
          <defs>
            <linearGradient id="shelfWood" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3e2723" />
              <stop offset="30%" stopColor="#4e342e" />
              <stop offset="70%" stopColor="#4e342e" />
              <stop offset="100%" stopColor="#3e2723" />
            </linearGradient>
            <linearGradient id="shelfHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="280" height="400" fill="url(#shelfWood)" rx="4" />
          <rect x="8" y="8" width="264" height="384" fill="rgba(0,0,0,0.15)" />

          {[128, 256].map(y => (
            <g key={y}>
              <rect x="8" y={y} width="264" height="10" fill="url(#shelfWood)" />
              <rect x="8" y={y} width="264" height="4" fill="url(#shelfHighlight)" />
            </g>
          ))}

          {[0, 1, 2].map(shelfIdx => {
            const startY = shelfIdx * 128 + 20;
            const shelfReports = reports.slice(shelfIdx * 5, (shelfIdx + 1) * 5);
            return (
              <g key={shelfIdx} transform={`translate(20, ${startY})`}>
                {shelfReports.map((report, i) => (
                  <g
                    key={report.id}
                    transform={`translate(${i * 50}, 0)`}
                    onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <polygon
                      points="20,0 38,10 38,88 20,98 2,88 2,10"
                      fill={i % 2 === 0 ? '#a1887f' : '#8d6e63'}
                      stroke="#5d4037"
                      strokeWidth="0.8"
                    />
                    <polygon
                      points="20,8 33,15 33,82 20,89 7,82 7,15"
                      fill="rgba(245,240,232,0.85)"
                    />
                    <line x1="20" y1="0" x2="20" y2="20" stroke="#5d4037" strokeWidth="0.5" />
                    <line x1="20" y1="85" x2="20" y2="98" stroke="#5d4037" strokeWidth="0.5" />
                    <text x="20" y="48" textAnchor="middle" fontSize="7" fill="#5d4037" fontWeight="600">
                      {report.date.slice(5).replace('-', '/')}
                    </text>
                    <text x="20" y="60" textAnchor="middle" fontSize="6" fill="#6d4c41">
                      {report.totalScore}分
                    </text>
                    {report.totalScore >= 200 && (
                      <circle cx="20" cy="30" r="4" fill="#ffd54f" opacity="0.8" />
                    )}
                  </g>
                ))}
                {Array.from({ length: Math.max(0, 5 - shelfReports.length) }).map((_, i) => (
                  <g key={`empty-${shelfIdx}-${i}`} transform={`translate(${(shelfReports.length + i) * 50}, 0)`}>
                    <polygon
                      points="20,5 35,14 35,84 20,93 5,84 5,14"
                      fill="rgba(0,0,0,0.15)"
                    />
                  </g>
                ))}
              </g>
            );
          })}

          <text x="140" y="392" textAnchor="middle" fontSize="8" fill="#a1887f" letterSpacing="3" opacity="0.6">
            茶 录 · 书 架
          </text>
        </svg>
      </div>

      {selectedReport && (
        <div style={styles.modalOverlay} onClick={() => setSelectedReport(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>茶艺日录</div>
              <div style={styles.modalClose} onClick={() => setSelectedReport(null)}>✕</div>
            </div>
            <div style={styles.modalDate}>{selectedReport.date}</div>

            <div style={styles.statGrid}>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{selectedReport.totalScore}</div>
                <div style={styles.statLabel}>茶心得分</div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{selectedReport.deformationCount}</div>
                <div style={styles.statLabel}>揉折次数</div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{selectedReport.pourCount}</div>
                <div style={styles.statLabel}>注水次数</div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{selectedReport.averageResponseTime?.toFixed(0) || '0'}ms</div>
                <div style={styles.statLabel}>平均应心</div>
              </div>
            </div>

            {selectedReport.scoreHistory && selectedReport.scoreHistory.length > 1 && (
              <div style={styles.chartWrap}>
                <div style={styles.chartTitle}>心路曲线</div>
                <svg width="100%" height="80" viewBox="0 0 260 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffd54f" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffd54f" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const data = selectedReport.scoreHistory;
                    const min = Math.min(...data.map(d => d.score), 100);
                    const max = Math.max(...data.map(d => d.score), 300);
                    const range = Math.max(1, max - min);
                    const len = data.length;
                    const points = data.map((d, i) => {
                      const x = (i / Math.max(1, len - 1)) * 240 + 10;
                      const y = 70 - ((d.score - min) / range) * 60;
                      return `${x},${y}`;
                    }).join(' ');
                    const area = `10,70 ${points} 250,70`;
                    return (
                      <>
                        <polygon points={area} fill="url(#chartGrad)" />
                        <polyline points={points} fill="none" stroke="#ff9800" strokeWidth="1.8" />
                        {data.map((d, i) => {
                          const x = (i / Math.max(1, len - 1)) * 240 + 10;
                          const y = 70 - ((d.score - min) / range) * 60;
                          return <circle key={i} cx={x} cy={y} r="1.8" fill="#5d4037" />;
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}

            <div style={styles.jsonWrap}>
              <div style={styles.jsonTitle}>茶录 (JSON)</div>
              <pre style={styles.jsonText}>{JSON.stringify(selectedReport, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'absolute',
    right: '2%',
    bottom: '2%',
    width: '25vw',
    maxWidth: '320px',
    height: '400px',
    zIndex: 20,
  },
  svg: {
    filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    background: 'linear-gradient(160deg, #f5f0e8 0%, #e8dcd1 100%)',
    borderRadius: '8px',
    padding: '24px 28px',
    width: 'min(480px, 92vw)',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
    border: '1px solid rgba(93,64,55,0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  modalTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#3e2723',
    letterSpacing: '0.3em',
  },
  modalClose: {
    fontSize: '1.2rem',
    color: '#8d6e63',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  modalDate: {
    fontSize: '0.85rem',
    color: '#6d4c41',
    letterSpacing: '0.2em',
    marginBottom: '18px',
    paddingBottom: '10px',
    borderBottom: '1px dashed rgba(93,64,55,0.3)',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '14px',
    marginBottom: '18px',
  },
  statItem: {
    padding: '14px',
    background: 'rgba(255,255,255,0.5)',
    borderRadius: '4px',
    textAlign: 'center',
    border: '1px solid rgba(188,170,164,0.4)',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#5d4037',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#8d6e63',
    marginTop: '4px',
    letterSpacing: '0.1em',
  },
  chartWrap: {
    marginBottom: '18px',
    padding: '12px',
    background: 'rgba(255,255,255,0.5)',
    borderRadius: '4px',
    border: '1px solid rgba(188,170,164,0.4)',
  },
  chartTitle: {
    fontSize: '0.8rem',
    color: '#6d4c41',
    marginBottom: '6px',
    letterSpacing: '0.1em',
  },
  jsonWrap: {
    padding: '12px',
    background: 'rgba(62,39,35,0.05)',
    borderRadius: '4px',
    border: '1px solid rgba(188,170,164,0.3)',
  },
  jsonTitle: {
    fontSize: '0.75rem',
    color: '#6d4c41',
    marginBottom: '6px',
    letterSpacing: '0.1em',
  },
  jsonText: {
    fontSize: '0.72rem',
    color: '#4e342e',
    lineHeight: '1.5',
    margin: 0,
    maxHeight: '120px',
    overflow: 'auto',
    fontFamily: '"Consolas", "Monaco", monospace',
  },
};

export default BookShelf;
