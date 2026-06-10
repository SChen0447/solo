import React from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Registration } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardProps {
  registrations: Registration[];
}

const formatDate = (date: Date): string => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day}`;
};

const Dashboard: React.FC<DashboardProps> = ({ registrations }) => {
  const trendData = React.useMemo(() => {
    const dateMap: Record<string, number> = {};
    const sorted = [...registrations].sort(
      (a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()
    );

    if (sorted.length > 0) {
      const firstDate = new Date(sorted[0].registeredAt);
      firstDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let d = new Date(firstDate); d <= today; d.setDate(d.getDate() + 1)) {
        dateMap[formatDate(new Date(d))] = 0;
      }
    }

    registrations.forEach((r) => {
      const date = new Date(r.registeredAt);
      const key = formatDate(date);
      dateMap[key] = (dateMap[key] || 0) + r.count;
    });

    const labels = Object.keys(dateMap).sort();
    const data = labels.map((l) => dateMap[l]);

    return {
      labels,
      datasets: [
        {
          label: '每日报名人数',
          data,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#4F46E5',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [registrations]);

  const pieData = React.useMemo(() => {
    const sourceMap: Record<string, number> = {
      direct: 0,
      social: 0,
      email: 0,
    };

    registrations.forEach((r) => {
      sourceMap[r.source] = (sourceMap[r.source] || 0) + r.count;
    });

    return {
      labels: ['直接链接', '社交媒体', '邮件邀请'],
      datasets: [
        {
          data: [sourceMap.direct, sourceMap.social, sourceMap.email],
          backgroundColor: ['#4F46E5', '#10B981', '#F59E0B'],
          borderColor: ['#4F46E5', '#10B981', '#F59E0B'],
          borderWidth: 1,
        },
      ],
    };
  }, [registrations]);

  const barData = React.useMemo(() => {
    const hourMap: Record<number, number> = {};
    for (let i = 0; i < 24; i++) {
      hourMap[i] = 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    registrations.forEach((r) => {
      const date = new Date(r.registeredAt);
      if (date >= today) {
        hourMap[date.getHours()] = (hourMap[date.getHours()] || 0) + r.count;
      }
    });

    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const data = Array.from({ length: 24 }, (_, i) => hourMap[i]);

    const barColors = data.map((_, index) => {
      const ratio = index / 23;
      const r = Math.round(31 + ratio * (79 - 31));
      const g = Math.round(41 + ratio * (135 - 41));
      const b = Math.round(109 + ratio * (229 - 109));
      return `rgb(${r}, ${g}, ${b})`;
    });

    return {
      labels,
      datasets: [
        {
          label: '报名人数',
          data,
          backgroundColor: barColors,
          borderRadius: 4,
        },
      ],
    };
  }, [registrations]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: { size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: { size: 11 },
          stepSize: 1,
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          font: { size: 12 },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
      },
    },
    animation: {
      duration: 1000,
      animateRotate: true,
      animateScale: true,
    },
    hoverOffset: 10,
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: { size: 11 },
          stepSize: 1,
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
  };

  return (
    <div>
      <h2 style={{ fontSize: '22px', color: 'white', marginBottom: '20px' }}>数据统计看板</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          transition: 'all 0.4s ease',
        }}
      >
        <div style={cardStyle}>
          <h3 style={titleStyle}>📈 报名趋势</h3>
          <div style={{ height: '280px' }}>
            <Line data={trendData} options={lineOptions} />
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={titleStyle}>🥧 报名来源占比</h3>
          <div style={{ height: '280px' }}>
            <Pie data={pieData} options={pieOptions} />
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={titleStyle}>📊 今日名额占用（按时段）</h3>
          <div style={{ height: '280px' }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(3"],
          div[style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
