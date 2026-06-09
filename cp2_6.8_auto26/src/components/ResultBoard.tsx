import { useRef, memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Cell,
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ResultResponse, DimensionKey } from '../types';
import { DIMENSION_LABELS, COLOR_PALETTE } from '../types';

interface ResultBoardProps {
  data: ResultResponse;
}

function ResultBoard({ data }: ResultBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  const barData = data.results.map((item) => ({
    name: item.name.length > 8 ? item.name.slice(0, 8) + '...' : item.name,
    fullName: item.name,
    score: item.totalScore,
    rank: item.rank,
  }));

  const radarData = (Object.keys(DIMENSION_LABELS) as DimensionKey[]).map(
    (dim) => {
      const item: Record<string, string | number> = {
        dimension: DIMENSION_LABELS[dim],
      };
      data.results.forEach((result) => {
        item[result.name] = result.scores[dim];
      });
      return item;
    }
  );

  const exportPDF = async () => {
    if (!boardRef.current) return;

    try {
      const canvas = await html2canvas(boardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'mm', 'a4');

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 15;

      const imgWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const title = data.title || '创意评分报告';
      pdf.setFontSize(16);
      pdf.text(title, margin, 15);

      pdf.setFontSize(10);
      pdf.text(`生成时间：${new Date().toLocaleString('zh-CN')}`, margin, 22);

      const startY = 30;
      if (imgHeight < pdfHeight - startY - margin) {
        pdf.addImage(imgData, 'PNG', margin, startY, imgWidth, imgHeight);
      } else {
        const ratio = (pdfHeight - startY - margin) / imgHeight;
        const scaledWidth = imgWidth * ratio;
        const xOffset = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, startY, scaledWidth, pdfHeight - startY - margin);
      }

      pdf.save(`${title}_评分报告.pdf`);
    } catch (e) {
      console.error('导出PDF失败', e);
      alert('导出PDF失败，请重试');
    }
  };

  return (
    <div className="result-board">
      <button className="export-btn" onClick={exportPDF}>
        📄 导出 PDF 报告
      </button>

      <div className="result-content" ref={boardRef}>
        <div className="chart-section">
          <h4>🏆 总分排名</h4>
          <div className="bar-chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 50, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value} 分`,
                    props.payload.fullName,
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#475569', fontSize: 12, fontWeight: 600 }}>
                  {barData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                      fillOpacity={1 - index * 0.08}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-section">
          <h4>🎯 多维度对比</h4>
          <div className="radar-chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#475569' }} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 10]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                {data.results.map((result, index) => (
                  <Radar
                    key={result.id}
                    name={result.name}
                    dataKey={result.name}
                    stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ranking-section">
          <h4>📋 详细排名</h4>
          <div className="ranking-list">
            {data.results.map((item, index) => (
              <div key={item.id} className="ranking-item">
                <span
                  className="ranking-badge"
                  style={{ backgroundColor: COLOR_PALETTE[index % COLOR_PALETTE.length] }}
                >
                  {item.rank}
                </span>
                <div className="ranking-info">
                  <span className="ranking-name">{item.name}</span>
                  <span className="ranking-desc">{item.description}</span>
                </div>
                <span className="ranking-score">{item.totalScore.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ResultBoard);
