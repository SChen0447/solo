import React from 'react';
import { FragmentType, getClipPathForType } from '../utils/layerManager';

interface MaterialItem {
  type: FragmentType;
  label: string;
  color: string;
  description: string;
}

const MATERIALS: MaterialItem[] = [
  {
    type: 'paper',
    label: '粗糙纸纹理',
    color: '#c4a882',
    description: '矩形不规则虚线边框'
  },
  {
    type: 'ink',
    label: '手绘彩色墨迹',
    color: '#d65a5a',
    description: '圆形，多彩随机'
  },
  {
    type: 'strip',
    label: '撕碎的图像条',
    color: '#e8dcc8',
    description: '长方形锯齿边缘'
  },
  {
    type: 'clipping',
    label: '旧报纸剪报',
    color: '#faf0dc',
    description: '不规则多边形带文字'
  },
  {
    type: 'foil',
    label: '金属箔片',
    color: '#cfb53b',
    description: '小六边形渐变光泽'
  }
];

interface MaterialPanelProps {
  onRandomAdd: () => void;
}

const MaterialPreview: React.FC<{ item: MaterialItem }> = ({ item }) => {
  const baseStyle: React.CSSProperties = {
    width: '60px',
    height: item.type === 'strip' ? '96px' : '60px',
    clipPath: getClipPathForType(item.type),
  };

  const renderPreview = () => {
    switch (item.type) {
      case 'paper':
        return (
          <div
            style={{
              ...baseStyle,
              backgroundColor: item.color,
              border: '2px dashed #8b7355',
              borderRadius: '2px',
              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.1)',
            }}
          />
        );
      case 'ink':
        return (
          <div
            style={{
              ...baseStyle,
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #e87878 0%, #d65a5a 40%, #a43d3d 100%)',
              filter: 'blur(0.5px)',
            }}
          />
        );
      case 'strip':
        return (
          <div
            style={{
              ...baseStyle,
              backgroundColor: item.color,
              boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.08)',
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 4px,
                  rgba(0,0,0,0.03) 4px,
                  rgba(0,0,0,0.03) 5px
                )
              `,
            }}
          />
        );
      case 'clipping':
        return (
          <div
            style={{
              ...baseStyle,
              width: '70px',
              height: '65px',
              backgroundColor: item.color,
              transform: 'rotate(-3deg)',
              boxShadow: '1px 2px 4px rgba(0,0,0,0.12)',
              padding: '6px 4px',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: '5px', lineHeight: '7px', color: '#4a3b2b', fontFamily: 'serif' }}>
              <div style={{ fontWeight: 'bold', fontSize: '6px', marginBottom: '2px' }}>NEWS</div>
              <div>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do.</div>
            </div>
          </div>
        );
      case 'foil':
        return (
          <div
            style={{
              ...baseStyle,
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #e8d46b 0%, #cfb53b 35%, #a8912a 55%, #e8d46b 80%, #f0e28a 100%)',
              boxShadow: '0 2px 6px rgba(160,120,50,0.4)',
            }}
          />
        );
    }
  };

  return renderPreview();
};

const MaterialPanel: React.FC<MaterialPanelProps> = ({ onRandomAdd }) => {
  const handleDragStart = (e: React.DragEvent, type: FragmentType) => {
    e.dataTransfer.setData('fragmentType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      style={{
        width: '260px',
        height: '100%',
        background: 'rgba(245, 240, 232, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(200, 180, 160, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid rgba(200, 180, 160, 0.3)',
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: '12px',
            fontSize: '18px',
            fontWeight: 700,
            color: '#3a2f24',
            fontFamily: 'Georgia, "Times New Roman", serif',
            letterSpacing: '0.5px',
          }}
        >
          素材工坊
        </h2>
        <button
          onClick={onRandomAdd}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#b8956a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'Georgia, serif',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#a0754a';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#b8956a';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
        >
          ✦ 随机添加碎片
        </button>
      </div>

      <div
        style={{
          padding: '12px',
          overflowY: 'auto',
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '10px',
        }}
      >
        {MATERIALS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            style={{
              padding: '12px',
              background: 'rgba(255, 252, 247, 0.7)',
              border: '1px solid rgba(200, 180, 160, 0.3)',
              borderRadius: '10px',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 252, 247, 0.95)';
              e.currentTarget.style.transform = 'translateX(2px)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 252, 247, 0.7)';
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.cursor = 'grabbing';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.cursor = 'grab';
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'rgba(240, 235, 225, 0.6)',
                borderRadius: '8px',
              }}
            >
              <MaterialPreview item={item} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#3a2f24',
                  marginBottom: '3px',
                  fontFamily: 'Georgia, serif',
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#7a6a55',
                  lineHeight: 1.4,
                }}
              >
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid rgba(200, 180, 160, 0.3)',
          fontSize: '11px',
          color: '#8a7a65',
          lineHeight: 1.5,
          background: 'rgba(240, 235, 225, 0.5)',
        }}
      >
        💡 拖拽素材到画布，或点击上方按钮随机生成
      </div>
    </div>
  );
};

export default MaterialPanel;
