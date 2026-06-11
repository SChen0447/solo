import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import { TastingReport } from '../TeaBatchStore';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);

interface TastingReportViewProps {
  report: TastingReport;
  onClose: () => void;
  onExportPDF?: () => void;
}

const TastingReportView: React.FC<TastingReportViewProps> = ({ report, onClose, onExportPDF }) => {
  const tasteLabels: Record<string, string> = {
    sweetness: '甜度',
    bitterness: '苦度',
    astringency: '涩度',
    thickness: '厚度',
    aroma: '香气',
    aftertaste: '回甘'
  };

  const radarData = {
    labels: Object.values(tasteLabels),
    datasets: [
      {
        label: report.batchName,
        data: Object.keys(tasteLabels).map(key => report.tasteScores[key] || 0),
        backgroundColor: 'rgba(139, 94, 60, 0.2)',
        borderColor: 'rgba(139, 94, 60, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(139, 94, 60, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(139, 94, 60, 1)'
      }
    ]
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
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(109, 76, 65, 0.9)',
        titleFont: { family: "'Noto Serif SC', serif" },
        bodyFont: { family: "'Noto Serif SC', serif" }
      }
    }
  };

  const barData = {
    labels: Object.values(tasteLabels),
    datasets: [
      {
        label: '评分',
        data: Object.keys(tasteLabels).map(key => report.tasteScores[key] || 0),
        backgroundColor: [
          'rgba(139, 94, 60, 0.7)',
          'rgba(109, 76, 65, 0.7)',
          'rgba(161, 136, 127, 0.7)',
          'rgba(141, 110, 99, 0.7)',
          'rgba(93, 64, 55, 0.7)',
          'rgba(121, 85, 72, 0.7)'
        ],
        borderColor: [
          'rgb(139, 94, 60)',
          'rgb(109, 76, 65)',
          'rgb(161, 136, 127)',
          'rgb(141, 110, 99)',
          'rgb(93, 64, 55)',
          'rgb(121, 85, 72)'
        ],
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        ticks: {
          font: { family: "'Noto Serif SC', serif" }
        },
        grid: {
          color: 'rgba(109, 76, 65, 0.1)'
        }
      },
      x: {
        ticks: {
          font: { family: "'Noto Serif SC', serif", size: 12 },
          color: '#6D4C41'
        },
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(109, 76, 65, 0.9)',
        titleFont: { family: "'Noto Serif SC', serif" },
        bodyFont: { family: "'Noto Serif SC', serif" }
      }
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(109, 76, 65);
    doc.text('茶叶品鉴报告', 105, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(62, 39, 35);
    doc.text(`批次名称: ${report.batchName}`, 20, 45);
    doc.text(`茶品: ${report.varietyName}`, 20, 55);
    doc.text(`生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`, 20, 65);
    
    doc.setFontSize(14);
    doc.setTextColor(109, 76, 65);
    doc.text('综合评分', 20, 85);
    
    doc.setFontSize(28);
    doc.setTextColor(139, 94, 60);
    doc.text(`${report.overallScore}`, 50, 92);
    
    doc.setFontSize(12);
    doc.setTextColor(62, 39, 35);
    doc.text('口感评分:', 20, 110);
    
    const scores = Object.entries(report.tasteScores);
    scores.forEach(([key, value], i) => {
      const labelMap: Record<string, string> = {
        sweetness: '甜度',
        bitterness: '苦度',
        astringency: '涩度',
        thickness: '厚度',
        aroma: '香气',
        aftertaste: '回甘'
      };
      doc.text(`${labelMap[key] || key}: ${value}分`, 30, 120 + i * 8);
    });

    doc.setFontSize(12);
    doc.setTextColor(62, 39, 35);
    doc.text('品鉴评语:', 20, 180);
    
    const splitNotes = doc.splitTextToSize(report.notes, 170);
    doc.text(splitNotes, 30, 190);

    doc.setFontSize(10);
    doc.setTextColor(141, 110, 99);
    doc.text('— 茶韵发酵品鉴系统 —', 105, 280, { align: 'center' });
    
    doc.save(`${report.batchName}-品鉴报告.pdf`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🍵 品鉴报告</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="nav-btn primary" onClick={handleExportPDF}>
              📄 导出PDF
            </button>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div className="report-section">
            <h3>概况</h3>
            <div className="score-overview">
              <div className="score-badge">
                <span className="score-value">{report.overallScore}</span>
                <span className="score-label">综合评分</span>
              </div>
              <div className="score-notes">
                <p><strong>批次：</strong>{report.batchName}</p>
                <p><strong>茶品：</strong>{report.varietyName}</p>
                <p><strong>生成时间：</strong>{new Date(report.generatedAt).toLocaleString('zh-CN')}</p>
                <p style={{ marginTop: '8px' }}>{report.notes}</p>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h3>汤色与叶底</h3>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1, background: 'white', padding: '16px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      backgroundColor: report.soupColor.hex,
                      margin: '0 auto 12px',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  />
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>茶汤色泽</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{report.soupColor.hex}</div>
                </div>
              </div>
              <div style={{ flex: 1, background: 'white', padding: '16px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '12px',
                      backgroundColor: report.teaColor.hex,
                      margin: '0 auto 12px',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  />
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>叶底色泽</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{report.teaColor.hex}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h3>口感雷达图</h3>
            <div className="chart-container" style={{ height: '320px' }}>
              <Radar data={radarData} options={radarOptions as any} />
            </div>
          </div>

          <div className="report-section">
            <h3>口感评分</h3>
            <div className="chart-container" style={{ height: '280px' }}>
              <Bar data={barData} options={barOptions as any} />
            </div>
          </div>

          <div className="report-section">
            <h3>香气物质</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {report.aromaMolecules.map(mol => (
                <div
                  key={mol.id}
                  style={{
                    padding: '10px 14px',
                    background: 'white',
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-sm)',
                    borderLeft: `4px solid ${mol.color}`,
                    flex: '1 1 calc(33% - 10px)',
                    minWidth: '150px'
                  }}
                >
                  <div style={{ fontWeight: 600, color: mol.color, fontSize: '14px' }}>
                    {mol.name} ({mol.symbol})
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                    {mol.description}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    强度: {Math.round(mol.intensity * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="report-section">
            <h3>香气演变时间线</h3>
            <div className="aroma-timeline">
              {report.aromaTimeline.slice(0, 12).map((point, i) => (
                <div key={i} className="aroma-time-point">
                  <div className="day">第{point.day}天</div>
                  <div className="mols">
                    {point.molecules.slice(0, 2).map(m => m.symbol).join('、') || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TastingReportView;
