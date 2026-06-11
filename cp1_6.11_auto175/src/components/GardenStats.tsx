import React, { useState, useEffect } from 'react';

interface GardenStatsProps {
  plantCount: number;
  totalNectar: number;
  wildButterflyCount: number;
  capturedCount: number;
  breedCount: number;
}

const GardenStats: React.FC<GardenStatsProps> = ({
  plantCount,
  totalNectar,
  wildButterflyCount,
  capturedCount,
  breedCount
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [animatingStats, setAnimatingStats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stats = ['plantCount', 'totalNectar', 'wildButterflyCount', 'capturedCount', 'breedCount'];
    stats.forEach(stat => {
      setAnimatingStats(prev => ({ ...prev, [stat]: true }));
      setTimeout(() => {
        setAnimatingStats(prev => ({ ...prev, [stat]: false }));
      }, 200);
    });
  }, [plantCount, totalNectar, wildButterflyCount, capturedCount, breedCount]);

  const StatCard: React.FC<{
    label: string;
    value: number | string;
    icon: string;
    animating?: boolean;
  }> = ({ label, value, icon, animating }) => (
    <div style={{
      flex: 1,
      minWidth: 70,
      textAlign: 'center',
      padding: '8px 4px',
      transition: 'transform 0.2s',
      transform: animating ? 'scale(1.1)' : 'scale(1)'
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        color: '#ecf0f1',
        transition: 'all 0.2s'
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#bdc3c7', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );

  if (isCollapsed) {
    return (
      <div
        onClick={() => setIsCollapsed(false)}
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          backgroundColor: 'rgba(44, 62, 80, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 20,
          padding: '10px 16px',
          cursor: 'pointer',
          zIndex: 50,
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#ecf0f1',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13
        }}
      >
        📊 花园统计
        <span style={{ fontSize: 10 }}>▼</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        backgroundColor: 'rgba(44, 62, 80, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 12,
        padding: '12px 16px',
        zIndex: 50,
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#ecf0f1',
        minWidth: 350,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
      }}>
        <h4 style={{
          margin: 0,
          fontSize: 14,
          fontFamily: "'Crimson Text', serif"
        }}>
          🌿 花园统计概览
        </h4>
        <button
          onClick={() => setIsCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#7f8c8d',
            cursor: 'pointer',
            fontSize: 12,
            padding: 4
          }}
        >
          ▲
        </button>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <StatCard
          label="植物"
          value={plantCount}
          icon="🌱"
          animating={animatingStats.plantCount}
        />
        <StatCard
          label="花蜜"
          value={Math.round(totalNectar)}
          icon="🍯"
          animating={animatingStats.totalNectar}
        />
        <StatCard
          label="野生蝴蝶"
          value={wildButterflyCount}
          icon="🦋"
          animating={animatingStats.wildButterflyCount}
        />
        <StatCard
          label="已捕获"
          value={capturedCount}
          icon="🥅"
          animating={animatingStats.capturedCount}
        />
        <StatCard
          label="杂交次数"
          value={breedCount}
          icon="🧬"
          animating={animatingStats.breedCount}
        />
      </div>
    </div>
  );
};

export default GardenStats;
