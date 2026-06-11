import { useState } from 'react';
import type { FlavorValues } from '../types';

interface FlavorChartProps {
  values: FlavorValues;
  spiceColor: string;
  onAdjust?: (flavor: keyof FlavorValues, value: number) => void;
}

const FLAVOR_KEYS: (keyof FlavorValues)[] = [
  'spicy',
  'sweet',
  'warm',
  'woody',
  'floral',
  'herbaceous'
];

const FLAVOR_LABELS: Record<keyof FlavorValues, string> = {
  spicy: '辛辣',
  sweet: '甘甜',
  warm: '温暖',
  woody: '木质',
  floral: '花香',
  herbaceous: '药草'
};

function FlavorChart({ values, spiceColor, onAdjust }: FlavorChartProps) {
  const [selectedFlavor, setSelectedFlavor] = useState<keyof FlavorValues | null>(null);
  const [adjustValue, setAdjustValue] = useState(0);

  const centerX = 200;
  const centerY = 200;
  const maxRadius = 140;

  const getVertexPosition = (index: number, value: number) => {
    const angle = (index * 60 - 90) * (Math.PI / 180);
    const radius = (value / 100) * maxRadius;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  };

  const getAxisPosition = (index: number) => {
    const angle = (index * 60 - 90) * (Math.PI / 180);
    return {
      x: centerX + Math.cos(angle) * maxRadius,
      y: centerY + Math.sin(angle) * maxRadius
    };
  };

  const handleVertexClick = (flavor: keyof FlavorValues) => {
    if (!onAdjust) return;
    setSelectedFlavor(flavor);
    setAdjustValue(values[flavor]);
  };

  const handleAdjustChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setAdjustValue(newValue);
    if (selectedFlavor && onAdjust) {
      onAdjust(selectedFlavor, newValue);
    }
  };

  const handleCloseAdjust = () => {
    setSelectedFlavor(null);
  };

  const dataPoints = FLAVOR_KEYS.map((key, index) => 
    getVertexPosition(index, values[key])
  );

  const pathD = dataPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ') + ' Z';

  return (
    <div style={{ 
      position: 'relative',
      background: '#faf0e6',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
    }}>
      <svg width="400" height="400" viewBox="0 0 400 400">
        {[0.25, 0.5, 0.75, 1].map((scale, sIndex) => (
          <polygon
            key={sIndex}
            points={FLAVOR_KEYS.map((_, index) => {
              const pos = getVertexPosition(index, scale * 100);
              return `${pos.x},${pos.y}`;
            }).join(' ')}
            fill="none"
            stroke="#5c3a21"
            strokeWidth={scale === 1 ? 1.5 : 0.5}
            strokeDasharray={scale === 1 ? 'none' : '4,4'}
            opacity={scale === 1 ? 0.6 : 0.3}
          />
        ))}

        {FLAVOR_KEYS.map((_, index) => {
          const pos = getAxisPosition(index);
          return (
            <line
              key={index}
              x1={centerX}
              y1={centerY}
              x2={pos.x}
              y2={pos.y}
              stroke="#5c3a21"
              strokeWidth="0.5"
              opacity="0.4"
            />
          );
        })}

        <path
          d={pathD}
          fill={spiceColor}
          fillOpacity="0.3"
          stroke={spiceColor}
          strokeWidth="2"
        />

        {FLAVOR_KEYS.map((key, index) => {
          const pos = getVertexPosition(index, values[key]);
          const axisPos = getAxisPosition(index);
          const labelAngle = (index * 60 - 90) * (Math.PI / 180);
          const labelRadius = maxRadius + 25;
          const labelX = centerX + Math.cos(labelAngle) * labelRadius;
          const labelY = centerY + Math.sin(labelAngle) * labelRadius;

          return (
            <g key={key}>
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#5c3a21"
                fontSize="14"
                fontWeight="bold"
              >
                {FLAVOR_LABELS[key]}
              </text>
              
              <text
                x={labelX}
                y={labelY + 18}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={spiceColor}
                fontSize="12"
                fontWeight="bold"
              >
                {values[key]}
              </text>

              <circle
                cx={pos.x}
                cy={pos.y}
                r="8"
                fill={spiceColor}
                stroke="#faf0e6"
                strokeWidth="2"
                style={{ 
                  cursor: onAdjust ? 'pointer' : 'default',
                  transition: 'r 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (onAdjust) {
                    e.currentTarget.setAttribute('r', '10');
                  }
                }}
                onMouseLeave={(e) => {
                  if (onAdjust) {
                    e.currentTarget.setAttribute('r', '8');
                  }
                }}
                onClick={() => handleVertexClick(key)}
              />
            </g>
          );
        })}
      </svg>

      {selectedFlavor && onAdjust && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(92, 58, 33, 0.95)',
          padding: '20px',
          borderRadius: '12px',
          color: '#f5e6c8',
          minWidth: '200px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          zIndex: 10
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px' 
          }}>
            <span style={{ fontWeight: 'bold' }}>
              微调 {FLAVOR_LABELS[selectedFlavor]}
            </span>
            <button
              onClick={handleCloseAdjust}
              style={{
                background: 'none',
                border: 'none',
                color: '#f5e6c8',
                fontSize: '20px',
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '10px' 
          }}>
            <span style={{ fontSize: '12px', color: '#b8956a' }}>0</span>
            <input
              type="range"
              min="0"
              max="100"
              value={adjustValue}
              onChange={handleAdjustChange}
              className="slider"
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '12px', color: '#b8956a' }}>100</span>
          </div>
          
          <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: spiceColor }}>
            {adjustValue}
          </div>
        </div>
      )}

      {onAdjust && (
        <p style={{ 
          textAlign: 'center', 
          color: '#5c3a21', 
          fontSize: '12px',
          marginTop: '10px',
          fontStyle: 'italic'
        }}>
          点击雷达图顶点可微调风味值
        </p>
      )}
    </div>
  );
}

export default FlavorChart;
