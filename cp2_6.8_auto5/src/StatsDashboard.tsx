import { useState, useEffect } from 'react';
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
  Legend
} from 'recharts';
import { Stats } from './types';

interface StatsDashboardProps {
  stats: Stats | null;
  onBack: () => void;
}

const COLORS = ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#B8860B', '#6B4423', '#996515'];

export default function StatsDashboard({ stats, onBack }: StatsDashboardProps) {
  const [animatedWeeklyData, setAnimatedWeeklyData] = useState<{ day: string; chapters: number }[]>([]);
  const [animatedBookData, setAnimatedBookData] = useState<{ name: string; progress: number }[]>([]);

  useEffect(() => {
    if (stats) {
      const timer1 = setTimeout(() => {
        setAnimatedWeeklyData(stats.weeklyData);
      }, 100);

      const timer2 = setTimeout(() => {
        setAnimatedBookData(stats.bookCompletion);
      }, 300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [stats]);

  if (!stats) {
    return <div className="loading">加载中...</div>;
  }

  const { summary } = stats;

  const pieData = stats.bookCompletion.map((book, index) => ({
    name: book.name,
    value: book.progress,
    fill: COLORS[index % COLORS.length]
  }));

  const remainingData = stats.bookCompletion.map(book => ({
    name: book.name,
    已完成: book.progress,
    未完成: 100 - book.progress
  }));

  return (
    <div className="stats-dashboard fade-in">
      <button className="btn-back" onClick={onBack}>
        ← 返回书架
      </button>

      <h1 className="page-title">阅读统计</h1>

      <div className="stats-cards">
        <div className="stat-card card fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <h3>{summary.totalBooks}</h3>
            <p>总书籍</p>
          </div>
        </div>
        <div className="stat-card card fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{summary.completedBooks}</h3>
            <p>已完成</p>
          </div>
        </div>
        <div className="stat-card card fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="stat-icon">📖</div>
          <div className="stat-info">
            <h3>{summary.weeklyChapters}</h3>
            <p>本周阅读</p>
          </div>
        </div>
        <div className="stat-card card fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <h3>{summary.totalBookmarks}</h3>
            <p>书签笔记</p>
          </div>
        </div>
      </div>

      <div className="chart-section card fade-in" style={{ animationDelay: '0.5s' }}>
        <h2>本周阅读统计</h2>
        <p className="chart-subtitle">每日阅读章节数</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={animatedWeeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D5" />
              <XAxis dataKey="day" stroke="#6B4423" />
              <YAxis stroke="#6B4423" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFAF0',
                  border: '1px solid #D2B48C',
                  borderRadius: '8px',
                  color: '#5C4033'
                }}
              />
              <Bar dataKey="chapters" name="章节数" fill="#8B4513" radius={[4, 4, 0, 0]}>
                {animatedWeeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-section card fade-in" style={{ animationDelay: '0.6s' }}>
        <h2>各书籍完成度</h2>
        <p className="chart-subtitle">每本书的阅读进度对比</p>
        <div className="charts-row">
          <div className="chart-container-half">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={1500}
                  animationBegin={200}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}%`, '完成度']}
                  contentStyle={{
                    backgroundColor: '#FFFAF0',
                    border: '1px solid #D2B48C',
                    borderRadius: '8px',
                    color: '#5C4033'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="progress-list">
            {stats.bookCompletion.map((book, index) => (
              <div key={book.name} className="progress-item fade-in" style={{ animationDelay: `${0.7 + index * 0.1}s` }}>
                <div className="progress-item-header">
                  <span className="progress-item-name">{book.name}</span>
                  <span className="progress-item-percent">{book.progress}%</span>
                </div>
                <div className="progress-bar-small">
                  <div
                    className="progress-fill-small"
                    style={{
                      width: `${book.progress}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
                <p className="progress-item-detail">
                  第 {book.current} / {book.total} 章
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-section card fade-in" style={{ animationDelay: '0.8s' }}>
        <h2>本月阅读趋势</h2>
        <p className="chart-subtitle">近30天阅读章节数</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D5" />
              <XAxis
                dataKey="date"
                stroke="#6B4423"
                tick={{ fontSize: 10 }}
                interval={3}
              />
              <YAxis stroke="#6B4423" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFAF0',
                  border: '1px solid #D2B48C',
                  borderRadius: '8px',
                  color: '#5C4033'
                }}
              />
              <Bar dataKey="chapters" name="章节数" fill="#CD853F" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
