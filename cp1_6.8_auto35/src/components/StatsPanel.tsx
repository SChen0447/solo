import { useEffect, useState } from 'react';
import { BookOpen, Star, BarChart3 } from 'lucide-react';
import type { Stats } from '../types';
import { CATEGORIES } from '../types';

interface StatsPanelProps {
  stats: Stats;
}

function AnimatedNumber({ value, duration = 200 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const startValue = displayValue;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * easeOut;
      setDisplayValue(Math.round(current * 10) / 10);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue.toFixed(1)}</span>;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const totalCategories = Object.values(stats.categoryCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div
      className="stats-panel"
      style={{
        padding: '20px',
        backgroundColor: '#16213e',
        borderRadius: '16px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        margin: '0 24px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <BarChart3 size={20} style={{ color: '#e94560' }} />
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>数据统计</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(233, 69, 96, 0.1)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <BookOpen size={18} style={{ color: '#e94560' }} />
            <span style={{ fontSize: '13px', color: '#aaa' }}>总书评数</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
            <AnimatedNumber value={stats.total} />
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Star size={18} style={{ color: '#ffd700' }} />
            <span style={{ fontSize: '13px', color: '#aaa' }}>平均星级</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#ffd700' }}>
            <AnimatedNumber value={stats.avgRating} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '12px' }}>类别分布</div>
        <div
          style={{
            height: '24px',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        >
          {CATEGORIES.map(cat => {
            const count = stats.categoryCounts[cat.key] || 0;
            const percentage = (count / totalCategories) * 100;
            return (
              <div
                key={cat.key}
                title={`${cat.label}: ${count}本`}
                style={{
                  height: '100%',
                  width: `${percentage}%`,
                  background: cat.gradient,
                  transition: 'width 0.5s ease',
                  cursor: 'pointer',
                  minWidth: count > 0 ? '4px' : '0',
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '12px',
          }}
        >
          {CATEGORIES.map(cat => (
            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: cat.gradient,
                }}
              />
              <span style={{ fontSize: '12px', color: '#888' }}>
                {cat.label} ({stats.categoryCounts[cat.key] || 0})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
