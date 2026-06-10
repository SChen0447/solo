import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
} from 'chart.js';
import { useActivities } from '../context/ActivityContext';
import RegistrationForm from '../components/RegistrationForm';
import Dashboard from '../components/Dashboard';
import { Registration } from '../types';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler
);

const getTotalRegistered = (registrations: Registration[]): number => {
  return registrations.reduce((sum, r) => sum + r.count, 0);
};

const ActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getActivityById, addRegistration, resetRegistrations } = useActivities();
  const [activity, setActivity] = useState(getActivityById(id || ''));
  const [chartKey, setChartKey] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivity(getActivityById(id || ''));
    }, 100);
    return () => clearInterval(interval);
  }, [id, getActivityById]);

  if (!activity) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'white' }}>
        <p>活动不存在</p>
        <button onClick={() => navigate('/')} style={backButtonStyle}>
          返回列表
        </button>
      </div>
    );
  }

  const totalRegistered = getTotalRegistered(activity.registrations);
  const progress = Math.min((totalRegistered / activity.capacity) * 100, 100);

  const handleRegistrationSubmit = (data: { name: string; email: string; count: number }) => {
    const sources: Array<'direct' | 'social' | 'email'> = ['direct', 'social', 'email'];
    addRegistration(activity.id, {
      ...data,
      source: sources[Math.floor(Math.random() * sources.length)],
    });
    setChartKey((prev) => prev + 1);
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      const headers = ['姓名', '邮箱', '人数', '报名时间'];
      const rows = activity.registrations.map((r) => [
        r.name,
        r.email,
        r.count.toString(),
        new Date(r.registeredAt).toLocaleString('zh-CN'),
      ]);
      const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
      const fileName = `${activity.name}_${activity.date}.csv`;
      saveAs(blob, fileName);
      setIsExporting(false);
    }, 500);
  };

  const handleResetConfirm = () => {
    resetRegistrations(activity.id);
    setShowConfirmModal(false);
    setChartKey((prev) => prev + 1);
  };

  const backButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={backButtonStyle}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.target as HTMLButtonElement).style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
          }}
        >
          ← 返回列表
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            style={{
              ...actionButtonStyle,
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              if (!isExporting) {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = 'none';
            }}
            onMouseDown={(e) => {
              if (!isExporting) {
                (e.target as HTMLButtonElement).style.transform = 'scale(0.97)';
              }
            }}
          >
            {isExporting ? (
              <span
                style={{
                  display: 'inline-block',
                  animation: 'spin 0.5s linear infinite',
                }}
              >
                ⟳
              </span>
            ) : (
              '📥'
            )}
            导出CSV
          </button>

          <button
            onClick={() => setShowConfirmModal(true)}
            style={{
              ...actionButtonStyle,
              background: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = 'none';
            }}
            onMouseDown={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(0.97)';
            }}
          >
            🔄 重置报名
          </button>
        </div>
      </div>

      <h1 style={{ color: 'white', fontSize: '28px', marginBottom: '24px' }}>{activity.name}</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '32px',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#1f2937' }}>活动信息</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', color: '#374151' }}>
              <span style={{ fontWeight: 500 }}>📅 活动日期:</span>
              <span>{activity.date}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', color: '#374151' }}>
              <span style={{ fontWeight: 500 }}>⏰ 报名截止:</span>
              <span>{activity.deadline}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', color: '#374151' }}>
              <span style={{ fontWeight: 500 }}>👥 活动容量:</span>
              <span>{activity.capacity}人</span>
            </div>
            <div style={{ color: '#374151', lineHeight: 1.6 }}>
              <span style={{ fontWeight: 500 }}>📝 活动描述:</span>
              <p style={{ marginTop: '4px' }}>{activity.description}</p>
            </div>
          </div>

          <RegistrationForm
            activityId={activity.id}
            capacity={activity.capacity}
            registeredCount={totalRegistered}
            onSubmit={handleRegistrationSubmit}
          />
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#1f2937' }}>报名进度</h2>
          <div style={{ position: 'relative', width: '240px', height: '240px' }}>
            <svg width="240" height="240" viewBox="0 0 240 240" key={chartKey}>
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
              <circle
                cx="120"
                cy="120"
                r="100"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="20"
              />
              <ProgressCircle progress={progress} />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937' }}>
                {totalRegistered}/{activity.capacity}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                {progress.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dashboard key={chartKey} registrations={activity.registrations} />

      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ fontSize: '18px', color: '#1f2937' }}>确认重置</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#f3f4f6';
                  (e.target as HTMLButtonElement).style.color = '#1f2937';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = 'none';
                  (e.target as HTMLButtonElement).style.color = '#6b7280';
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#374151', marginBottom: '24px', lineHeight: 1.6 }}>
              确定要重置该活动的所有报名数据吗？此操作无法撤销。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.target as HTMLButtonElement).style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'scale(0.97)';
                }}
              >
                取消
              </button>
              <button
                onClick={handleResetConfirm}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.target as HTMLButtonElement).style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'scale(0.97)';
                }}
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProgressCircle: React.FC<{ progress: number }> = ({ progress }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const startTime = performance.now();
    const startValue = 0;
    const endValue = progress;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progressRatio, 3);
      setAnimatedProgress(startValue + (endValue - startValue) * easeOut);

      if (progressRatio < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [progress]);

  const circumference = 2 * Math.PI * 100;
  const dashOffset = circumference - (animatedProgress / 100) * circumference;

  return (
    <circle
      cx="120"
      cy="120"
      r="100"
      fill="none"
      stroke="url(#progressGradient)"
      strokeWidth="20"
      strokeLinecap="round"
      strokeDasharray={circumference}
      strokeDashoffset={dashOffset}
      transform="rotate(-90 120 120)"
      style={{ transition: 'stroke-dashoffset 0.1s ease' }}
    />
  );
};

export default ActivityDetailPage;
