import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { statusConfig, statusColors } from '../utils';
import type { Stats, FilterType } from '../types';

interface StatsChartsProps {
  stats: Stats;
  onChartClick: (status: string) => void;
  activeFilter: FilterType;
}

export default function StatsCharts({ stats, onChartClick, activeFilter }: StatsChartsProps) {
  const barData = useMemo(() => [
    { name: '已投递', value: stats.applied, status: 'applied' },
    { name: '面试中', value: stats.interviewing, status: 'interviewing' },
    { name: '已拒绝', value: stats.rejected, status: 'rejected' },
    { name: '已Offer', value: stats.offer, status: 'offer' },
  ], [stats]);

  const pieData = useMemo(() => [
    { name: '已投递', value: stats.applied, status: 'applied' },
    { name: '面试中', value: stats.interviewing, status: 'interviewing' },
    { name: '已拒绝', value: stats.rejected, status: 'rejected' },
    { name: '已Offer', value: stats.offer, status: 'offer' },
  ].filter(item => item.value > 0), [stats]);

  const renderCustomBar = (props: any) => {
    const { x, y, width, height, status } = props;
    const color = statusColors[status as keyof typeof statusColors];
    const gradientId = `barGradient-${status}`;
    return (
      <g>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <stop offset="100%" stopColor={color} stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#${gradientId})`}
          rx={6}
          ry={6}
          style={{ cursor: 'pointer' }}
          onClick={() => onChartClick(status)}
        />
      </g>
    );
  };

  return (
    <div className="stats-charts">
      <div className="chart-card">
        <h3 className="chart-title">状态分布</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e0e0e0" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={60}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
              />
              <Bar
                dataKey="value"
                shape={renderCustomBar}
                isAnimationActive={true}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3 className="chart-title">占比分析</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                onClick={(_, index) => {
                  if (pieData[index]) {
                    onChartClick(pieData[index].status);
                  }
                }}
                style={{ cursor: 'pointer' }}
                isAnimationActive={true}
                animationDuration={800}
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={statusColors[entry.status as keyof typeof statusColors]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
