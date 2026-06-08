import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { DailyStats } from './App';

interface ChartViewProps {
  data: DailyStats[];
}

const ChartView = ({ data }: ChartViewProps) => {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      displayDate: format(parseISO(item.date), 'MM/dd', { locale: zhCN }),
      fullDate: format(parseISO(item.date), 'yyyy年MM月dd日 EEEE', {
        locale: zhCN,
      }),
    }));
  }, [data]);

  const getBarColor = (index: number, total: number) => {
    const lightness = 75 - (index / (total - 1 || 1)) * 35;
    return `hsl(217, 91%, ${lightness}%)`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
          }}
        >
          <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
            {payload[0].payload.fullDate}
          </p>
          <p style={{ color: '#1e293b', fontWeight: 600, fontSize: '16px' }}>
            {payload[0].value.toFixed(1)} 小时
          </p>
        </div>
      );
    }
    return null;
  };

  const totalWeeklyHours = data.reduce((sum, day) => sum + day.totalHours, 0);
  const avgDailyHours = data.length > 0 ? totalWeeklyHours / data.length : 0;

  return (
    <div className="card chart-view">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h2 className="chart-title">📊 近7天工时统计</h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            团队每日总工时趋势
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#3b82f6',
            }}
          >
            {totalWeeklyHours.toFixed(1)}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            本周总工时（小时）
          </div>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            animationDuration={500}
            animationEasing="ease-out"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="displayDate"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              unit="h"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
            <Bar
              dataKey="totalHours"
              radius={[6, 6, 0, 0]}
              animationDuration={600}
              animationBegin={0}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(index, chartData.length)}
                  style={{
                    transition: 'all 300ms ease-in-out',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#93c5fd' }}></span>
          <span>较早日期</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#2563eb' }}></span>
          <span>较近日期</span>
        </div>
        <div className="legend-item">
          <span style={{ fontWeight: 600, color: '#1e293b' }}>
            日均: {avgDailyHours.toFixed(1)}h
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChartView;
