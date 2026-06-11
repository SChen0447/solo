import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { TeaBatch } from '../TeaBatchStore';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface CompareViewProps {
  batches: TeaBatch[];
  selectedIds: string[];
  onSelectBatch: (id: string) => void;
  onBack: () => void;
}

const CompareView: React.FC<CompareViewProps> = ({
  batches,
  selectedIds,
  onSelectBatch,
  onBack
}) => {
  const completedBatches = batches.filter(b => b.status === 'completed' && b.report);

  const tasteLabels: Record<string, string> = {
    sweetness: '甜度',
    bitterness: '苦度',
    astringency: '涩度',
    thickness: '厚度',
    aroma: '香气',
    aftertaste: '回甘'
  };

  const colors = [
    { bg: 'rgba(139, 94, 60, 0.2)', border: 'rgb(139, 94, 60)' },
    { bg: 'rgba(76, 175, 80, 0.2)', border: 'rgb(76, 175, 80)' },
    { bg: 'rgba(33, 150, 243, 0.2)', border: 'rgb(33, 150, 243)' },
    { bg: 'rgba(156, 39, 176, 0.2)', border: 'rgb(156, 39, 176)' },
    { bg: 'rgba(255, 152, 0, 0.2)', border: 'rgb(255, 152, 0)' }
  ];

  const radarData = {
    labels: Object.values(tasteLabels),
    datasets: selectedIds
      .map((id, index) => {
        const batch = batches.find(b => b.id === id);
        if (!batch?.report) return null;
        const color = colors[index % colors.length];
        return {
          label: batch.name,
          data: Object.keys(tasteLabels).map(key => batch.report!.tasteScores[key] || 0),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 2,
          pointBackgroundColor: color.border,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: color.border
        };
      })
      .filter(Boolean) as any[]
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 2,
          font: { family: "'Noto Serif SC', serif" }
        },
        pointLabels: {
          font: { family: "'Noto Serif SC', serif", size: 13 },
          color: '#6D4C41'
        },
        grid: {
          color: 'rgba(109, 76, 65, 0.2)'
        },
        angleLines: {
          color: 'rgba(109, 76, 65, 0.2)'
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: "'Noto Serif SC', serif", size: 12 },
          color: '#6D4C41'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(109, 76, 65, 0.9)',
        titleFont: { family: "'Noto Serif SC', serif" },
        bodyFont: { family: "'Noto Serif SC', serif" }
      }
    }
  };

  return (
    <div className="compare-view">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button className="nav-btn secondary" onClick={onBack}>
          ← 返回
        </button>
        <h2 style={{ fontFamily: "'Ma Shan Zheng', cursive", fontSize: '32px', color: 'var(--color-primary-dark)', marginLeft: '20px' }}>
          🍵 多批次对比品鉴
        </h2>
      </div>

      {completedBatches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-light)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍃</div>
          <p>暂无已完成的发酵批次</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>请先完成至少一批发酵后再进行对比</p>
        </div>
      ) : (
        <>
          <div className="compare-selector">
            <span style={{ alignSelf: 'center', color: 'var(--color-text-secondary)', marginRight: '8px' }}>
              选择要对比的批次：
            </span>
            {completedBatches.map(batch => (
              <div
                key={batch.id}
                className={`compare-item ${selectedIds.includes(batch.id) ? 'selected' : ''}`}
                onClick={() => onSelectBatch(batch.id)}
              >
                {batch.name}
                <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
                  ({batch.report?.overallScore}分)
                </span>
              </div>
            ))}
          </div>

          {selectedIds.length >= 2 && (
            <>
              <div className="report-section">
                <h3 style={{ fontSize: '18px', color: 'var(--color-primary-dark)', marginBottom: '16px' }}>
                  📊 口感对比雷达图
                </h3>
                <div className="chart-container" style={{ height: '350px' }}>
                  <Radar data={radarData} options={radarOptions as any} />
                </div>
              </div>

              <div className="report-section">
                <h3 style={{ fontSize: '18px', color: 'var(--color-primary-dark)', marginBottom: '16px' }}>
                  📋 综合评分对比
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(selectedIds.length, 3)}, 1fr)`, gap: '16px' }}>
                  {selectedIds.map((id, index) => {
                    const batch = batches.find(b => b.id === id);
                    if (!batch?.report) return null;
                    const color = colors[index % colors.length];
                    return (
                      <div
                        key={id}
                        style={{
                          background: 'white',
                          padding: '20px',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-sm)',
                          borderTop: `4px solid ${color.border}`
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px', fontSize: '15px' }}>
                          {batch.name}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '8px' }}>
                          {batch.report.varietyName}
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: 700, color: color.border, marginBottom: '12px' }}>
                          {batch.report.overallScore}
                          <span style={{ fontSize: '14px', color: 'var(--color-text-light)' }}> 分</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                          {batch.report.notes}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="report-section">
                <h3 style={{ fontSize: '18px', color: 'var(--color-primary-dark)', marginBottom: '16px' }}>
                  🍃 汤色对比
                </h3>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
                  {selectedIds.map((id, index) => {
                    const batch = batches.find(b => b.id === id);
                    if (!batch?.report) return null;
                    return (
                      <div key={id} style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            backgroundColor: batch.report.soupColor.hex,
                            margin: '0 auto 12px',
                            boxShadow: 'var(--shadow-md)'
                          }}
                        />
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)' }}>
                          {batch.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
                          {batch.report.soupColor.hex}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {selectedIds.length < 2 && selectedIds.length > 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-light)' }}>
              <p>请再选择至少一个批次进行对比</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompareView;
