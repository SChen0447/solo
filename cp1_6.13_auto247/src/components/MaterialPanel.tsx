import React, { useState } from 'react';

export type MaterialType = 'circle' | 'star' | 'spiral';

const COLORS = ['#ff9ff3', '#54a0ff', '#a29bfe', '#f368e0', '#ffb142', '#4bcffa'];

interface MaterialPanelProps {
  onDragStart: (type: MaterialType, color: string) => void;
  onDragEnd: () => void;
}

const MaterialPanel: React.FC<MaterialPanelProps> = ({ onDragStart, onDragEnd }) => {
  const [circleColor, setCircleColor] = useState(COLORS[0]);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, type: MaterialType, color: string) => {
    e.dataTransfer.setData('material-type', type);
    e.dataTransfer.setData('material-color', color);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(type, color);
  };

  const renderStar = (size: number, color: string, glow: number = 10) => {
    const points = [];
    const outerR = size / 2;
    const innerR = outerR * 0.38;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      points.push(`${size / 2 + Math.cos(angle) * r},${size / 2 + Math.sin(angle) * r}`);
    }
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon
          points={points.join(' ')}
          fill={color}
          style={{ filter: `drop-shadow(0 0 ${glow}px ${color})` }}
        />
      </svg>
    );
  };

  const renderCircle = (color: string) => (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 15px ${color}, 0 0 30px ${color}50`,
      }}
    />
  );

  const renderSpiral = (color: string) => {
    const particles = [];
    for (let i = 0; i < 5; i++) {
      const angle = i * 0.8;
      const radius = i * 7 + 4;
      particles.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`,
            left: 20 + Math.cos(angle) * radius,
            top: 20 + Math.sin(angle) * radius,
          }}
        />
      );
    }
    return (
      <div style={{ position: 'relative', width: 40, height: 40 }}>
        {particles}
      </div>
    );
  };

  const cardStyle = (cardId: string) => ({
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '20px 16px',
    borderRadius: 8,
    border: '1px solid rgba(102, 126, 234, 0.5)',
    background: 'rgba(255, 255, 255, 0.02)',
    cursor: 'grab',
    userSelect: 'none' as const,
    transform: hoveredCard === cardId ? 'translateY(-3px)' : 'translateY(0)',
    boxShadow: hoveredCard === cardId
      ? '0 8px 30px rgba(102, 126, 234, 0.25), 0 0 15px rgba(102, 126, 234, 0.15)'
      : '0 2px 10px rgba(0, 0, 0, 0.2)',
    transition: 'all 250ms ease',
  });

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 240,
        padding: '24px 18px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: '0.5px solid rgba(162, 155, 254, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        zIndex: 10,
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '4px 0 8px' }}>
        <h2
          style={{
            color: '#a29bfe',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 2,
            marginBottom: 4,
            textShadow: '0 0 15px rgba(162, 155, 254, 0.5)',
          }}
        >
          灵感素材
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.5 }}>
          拖拽素材至熔炉中点燃灵感
        </p>
      </div>

      <div
        draggable
        onDragStart={(e) => handleDragStart(e, 'circle', circleColor)}
        onDragEnd={onDragEnd}
        onMouseEnter={() => setHoveredCard('circle')}
        onMouseLeave={() => setHoveredCard(null)}
        style={cardStyle('circle')}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
          {renderCircle(circleColor)}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>圆形光斑</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {COLORS.map((c) => (
            <div
              key={c}
              onClick={(e) => { e.stopPropagation(); setCircleColor(c); }}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: c,
                cursor: 'pointer',
                boxShadow: circleColor === c ? `0 0 10px ${c}, 0 0 0 2px rgba(255,255,255,0.3)` : `0 0 5px ${c}60`,
                transition: 'all 200ms ease',
              }}
            />
          ))}
        </div>
      </div>

      <div
        draggable
        onDragStart={(e) => handleDragStart(e, 'star', '#ffd43b')}
        onDragEnd={onDragEnd}
        onMouseEnter={() => setHoveredCard('star')}
        onMouseLeave={() => setHoveredCard(null)}
        style={cardStyle('star')}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
          {renderStar(24, '#ffd43b', 12)}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>星形光点</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>六角光芒 · 闪耀瞬间</div>
      </div>

      <div
        draggable
        onDragStart={(e) => handleDragStart(e, 'spiral', '#f368e0')}
        onDragEnd={onDragEnd}
        onMouseEnter={() => setHoveredCard('spiral')}
        onMouseLeave={() => setHoveredCard(null)}
        style={cardStyle('spiral')}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
          {renderSpiral('#f368e0')}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>螺旋光链</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>粒子链环 · 连续灵感</div>
      </div>

      <div style={{ marginTop: 'auto', padding: '12px 0', color: 'rgba(255,255,255,0.25)', fontSize: 10, textAlign: 'center', lineHeight: 1.6 }}>
        每次融合点亮一格能量<br />
        十格圆满 · 熔光绽放
      </div>
    </div>
  );
};

export default MaterialPanel;
