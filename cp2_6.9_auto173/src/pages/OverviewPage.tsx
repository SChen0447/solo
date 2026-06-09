import React, { useState, useEffect } from 'react';
import type { OverviewStats } from '../types';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, delay = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 500;
      const startTime = performance.now();
      const startValue = 0;
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(startValue + (value - startValue) * easeOut));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <div
      className="animate-fade-in-scale"
      style={{
        width: 220,
        height: 120,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #1A237E 0%, #3949AB 100%)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(26, 35, 126, 0.3)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        animationDelay: `${delay}ms`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(26, 35, 126, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(26, 35, 126, 0.3)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          fontSize: 12,
          opacity: 0.85,
          fontWeight: 400
        }}>
          {label}
        </span>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
      <div style={{
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums'
      }}>
        {displayValue}
      </div>
    </div>
  );
};

const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch('/api/stats/overview');
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      minHeight: 'calc(100vh - 56px)',
      padding: '40px 48px'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 6
          }}>
            项目概览
          </h1>
          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)'
          }}>
            查看所有项目的整体进度与状态统计
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, color: 'var(--text-secondary)' }}>
            加载中...
          </div>
        ) : stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 24,
            marginBottom: 48
          }}>
            <StatCard
              label="总计项目数"
              value={stats.total}
              delay={0}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              }
            />
            <StatCard
              label="已完成项目"
              value={stats.completed}
              delay={100}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              }
            />
            <StatCard
              label="进行中项目"
              value={stats.inprogress}
              delay={200}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              }
            />
            <StatCard
              label="超期项目"
              value={stats.overdue}
              delay={300}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              }
            />
          </div>
        )}

        <div style={{
          padding: 32,
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 16,
          border: '1px solid var(--border-dark)'
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 16
          }}>
            使用说明
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 24
          }}>
            {[
              { title: '创建项目', desc: '在项目看板页面点击"新建项目"，输入项目信息即可创建' },
              { title: '管理任务', desc: '点击项目卡片进入看板，拖拽任务卡片到不同状态栏' },
              { title: '团队协作', desc: '在看板页面右下角打开消息面板，实时沟通项目进展' },
              { title: '查看详情', desc: '点击任意任务卡片打开右侧面板，编辑任务信息和评论' }
            ].map((item, i) => (
              <div key={i} style={{
                padding: 16,
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 10
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: 'rgba(100, 255, 218, 0.15)',
                  color: '#64FFDA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 10
                }}>
                  {i + 1}
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
