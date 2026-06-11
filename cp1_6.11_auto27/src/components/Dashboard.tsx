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
  LineChart,
  Line,
} from 'recharts';
import type { MemberStats, DailyStats, TeamMember } from '../types';
import './Dashboard.css';

interface DashboardProps {
  memberStats: MemberStats[];
  dailyStats: DailyStats[];
  ratingDistribution: { rating: string; value: number }[];
  getMemberName: (id: string) => string;
  isResetting: boolean;
  animationTrigger: number;
}

const PIE_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4a90d9'];

function Dashboard({
  memberStats,
  dailyStats,
  ratingDistribution,
  getMemberName,
  isResetting,
  animationTrigger,
}: DashboardProps) {
  const barChartData = useMemo(() => {
    return memberStats.map((stat) => ({
      name: getMemberName(stat.memberId),
      平均分: stat.averageRating,
      isHigh: stat.averageRating >= 4,
      fullMark: 5,
    }));
  }, [memberStats, getMemberName]);

  const overallTrendData = useMemo(() => {
    return dailyStats.map((d) => ({
      day: `第${d.day}天`,
      平均分: d.averageRating,
    }));
  }, [dailyStats]);

  const participantData = useMemo(() => {
    return dailyStats.map((d) => ({
      day: `第${d.day}天`,
      参与人数: d.participantCount,
    }));
  }, [dailyStats]);

  const totalEvaluations = memberStats.reduce((sum, s) => sum + s.totalEvaluations, 0);
  const overallAverage = totalEvaluations > 0
    ? (memberStats.reduce((sum, s) => sum + s.averageRating * s.totalEvaluations, 0) / totalEvaluations).toFixed(2)
    : '0.00';

  const chartKey = `${animationTrigger}-${isResetting}`;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 className="dashboard-title">数据看板</h2>
        <div className="dashboard-summary">
          <div className="summary-item">
            <span className="summary-value">{totalEvaluations}</span>
            <span className="summary-label">总评价数</span>
          </div>
          <div className="summary-item">
            <span className="summary-value gold">{overallAverage}</span>
            <span className="summary-label">总体平均分</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className={`chart-card ${isResetting ? 'resetting' : ''}`} key={`bar-${chartKey}`}>
          <h3 className="chart-title">成员平均分</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="name"
                  stroke="#a0a0b0"
                  tick={{ fill: '#a0a0b0', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  stroke="#a0a0b0"
                  tick={{ fill: '#a0a0b0', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  domain={[0, 5]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e2f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                  cursor={{ fill: 'rgba(74, 144, 217, 0.1)' }}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a90d9" />
                    <stop offset="100%" stopColor="#7b68ee" />
                  </linearGradient>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#ffb347" />
                  </linearGradient>
                </defs>
                <Bar
                  dataKey="平均分"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                  isAnimationActive={!isResetting}
                >
                  {barChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isHigh ? 'url(#goldGradient)' : 'url(#barGradient)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`chart-card ${isResetting ? 'resetting' : ''}`} key={`pie-${chartKey}`}>
          <h3 className="chart-title">评分分布</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={ratingDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={800}
                  animationEasing="ease-out"
                  isAnimationActive={!isResetting}
                  label={({ rating, percent }) => `${rating} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#a0a0b0', strokeWidth: 1 }}
                >
                  {ratingDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e2f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                  formatter={(value: number) => [`${value} 条`, '数量']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`chart-card ${isResetting ? 'resetting' : ''}`} key={`participant-${chartKey}`}>
          <h3 className="chart-title">每日参与人数</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={participantData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day"
                  stroke="#a0a0b0"
                  tick={{ fill: '#a0a0b0', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  stroke="#a0a0b0"
                  tick={{ fill: '#a0a0b0', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e2f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="参与人数"
                  stroke="#69db7c"
                  strokeWidth={3}
                  dot={{ fill: '#69db7c', strokeWidth: 2, r: 4, className: 'pulse-dot' }}
                  activeDot={{ r: 8, fill: '#69db7c', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={800}
                  animationEasing="ease-out"
                  isAnimationActive={!isResetting}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`chart-card ${isResetting ? 'resetting' : ''}`} key={`trend-${chartKey}`}>
          <h3 className="chart-title">总体平均分趋势</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={overallTrendData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day"
                  stroke="#a0a0b0"
                  tick={{ fill: '#a0a0b0', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  stroke="#a0a0b0"
                  tick={{ fill: '#a0a0b0', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  domain={[0, 5]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e2f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="平均分"
                  stroke="#7b68ee"
                  strokeWidth={3}
                  dot={{ fill: '#7b68ee', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 8, fill: '#7b68ee', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={800}
                  animationEasing="ease-out"
                  isAnimationActive={!isResetting}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .pulse-dot {
          position: relative;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
