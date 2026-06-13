import React, { useState, useMemo } from 'react';
import { TasteData } from './RadarChart';

export interface ProvinceData {
  count: number;
  avgSpicy: number;
  avgTaste: TasteData;
}

interface MapViewProps {
  provinceData: Record<string, ProvinceData>;
  onProvinceClick: (province: string) => void;
  selectedProvince?: string | null;
}

interface ProvinceInfo {
  name: string;
  path: string;
  cx: number;
  cy: number;
}

const provinces: ProvinceInfo[] = [
  { name: '黑龙江', path: 'M820,50 L880,45 L910,70 L900,120 L860,150 L810,140 L790,100 L800,65 Z', cx: 850, cy: 95 },
  { name: '吉林', path: 'M810,140 L860,150 L870,180 L840,210 L800,205 L780,175 Z', cx: 825, cy: 175 },
  { name: '辽宁', path: 'M780,175 L800,205 L820,220 L810,250 L770,255 L750,230 L755,195 Z', cx: 785, cy: 215 },
  { name: '内蒙古', path: 'M500,60 L600,50 L700,65 L790,100 L780,175 L755,195 L720,180 L650,170 L580,180 L520,200 L480,180 L470,140 L490,90 Z', cx: 620, cy: 130 },
  { name: '新疆', path: 'M100,150 L250,120 L350,150 L400,200 L390,280 L340,320 L250,330 L160,300 L120,240 Z', cx: 245, cy: 225 },
  { name: '西藏', path: 'M150,320 L250,330 L340,320 L400,350 L420,410 L380,450 L300,460 L200,440 L140,400 L120,360 Z', cx: 265, cy: 390 },
  { name: '青海', path: 'M340,320 L430,300 L490,330 L510,390 L460,420 L400,410 L390,350 Z', cx: 425, cy: 355 },
  { name: '甘肃', path: 'M400,200 L470,190 L520,200 L550,250 L530,300 L490,330 L430,300 L390,280 Z', cx: 470, cy: 255 },
  { name: '宁夏', path: 'M500,240 L530,235 L545,260 L535,285 L510,290 L495,265 Z', cx: 520, cy: 262 },
  { name: '陕西', path: 'M530,300 L580,290 L600,320 L590,370 L570,410 L540,400 L520,360 Z', cx: 560, cy: 345 },
  { name: '山西', path: 'M600,270 L640,265 L655,300 L650,340 L630,365 L600,360 L590,320 Z', cx: 620, cy: 315 },
  { name: '河北', path: 'M650,240 L700,235 L720,260 L715,300 L690,320 L660,315 L650,285 Z', cx: 680, cy: 275 },
  { name: '北京', path: 'M680,252 L700,250 L705,265 L695,275 L682,272 Z', cx: 692, cy: 262 },
  { name: '天津', path: 'M700,268 L715,266 L718,278 L708,285 L700,280 Z', cx: 708, cy: 275 },
  { name: '山东', path: 'M690,320 L750,310 L770,340 L760,380 L710,390 L680,370 L690,340 Z', cx: 725, cy: 345 },
  { name: '河南', path: 'M590,370 L650,365 L680,380 L680,420 L640,440 L600,430 L585,400 Z', cx: 630, cy: 400 },
  { name: '江苏', path: 'M680,380 L720,375 L740,400 L735,440 L700,460 L670,445 L680,410 Z', cx: 705, cy: 415 },
  { name: '上海', path: 'M735,440 L750,438 L755,452 L748,462 L738,460 Z', cx: 745, cy: 450 },
  { name: '安徽', path: 'M640,440 L680,445 L690,480 L670,510 L630,505 L620,470 Z', cx: 655, cy: 470 },
  { name: '浙江', path: 'M690,470 L720,465 L740,490 L730,530 L695,540 L680,510 Z', cx: 708, cy: 500 },
  { name: '湖北', path: 'M560,450 L620,445 L640,470 L635,510 L600,530 L560,520 L550,480 Z', cx: 595, cy: 485 },
  { name: '湖南', path: 'M560,530 L600,525 L615,560 L605,610 L575,630 L550,615 L545,570 Z', cx: 578, cy: 575 },
  { name: '江西', path: 'M615,520 L650,515 L665,550 L655,600 L625,620 L605,600 L610,560 Z', cx: 635, cy: 565 },
  { name: '福建', path: 'M665,545 L700,540 L720,570 L715,610 L685,630 L660,615 L658,575 Z', cx: 685, cy: 580 },
  { name: '台湾', path: 'M735,580 L750,575 L758,600 L752,625 L740,630 L732,610 Z', cx: 744, cy: 600 },
  { name: '广东', path: 'M550,625 L600,620 L640,635 L650,670 L630,695 L580,700 L545,680 L535,650 Z', cx: 590, cy: 658 },
  { name: '广西', path: 'M460,610 L510,605 L545,620 L550,660 L530,685 L485,685 L460,660 Z', cx: 505, cy: 640 },
  { name: '海南', path: 'M500,715 L525,712 L535,730 L525,748 L505,750 L495,735 Z', cx: 515, cy: 730 },
  { name: '香港', path: 'M615,690 L628,688 L632,698 L625,705 L615,702 Z', cx: 623, cy: 696 },
  { name: '澳门', path: 'M590,695 L600,693 L603,700 L597,707 L590,704 Z', cx: 596, cy: 700 },
  { name: '四川', path: 'M440,410 L520,400 L550,430 L560,480 L540,520 L490,530 L450,510 L430,470 Z', cx: 490, cy: 465 },
  { name: '重庆', path: 'M510,470 L545,465 L555,490 L545,515 L520,515 L508,490 Z', cx: 530, cy: 490 },
  { name: '贵州', path: 'M485,540 L540,535 L560,555 L555,590 L525,605 L490,595 L478,565 Z', cx: 518, cy: 568 },
  { name: '云南', path: 'M380,500 L450,490 L485,515 L480,580 L450,610 L400,600 L370,560 Z', cx: 425, cy: 550 }
];

const getSpicyColor = (spicy: number): string => {
  const s = Math.max(0, Math.min(10, spicy));
  const t = s / 10;
  const r = Math.round(70 + t * 185);
  const g = Math.round(130 - t * 80);
  const b = Math.round(180 - t * 140);
  return `rgb(${r}, ${g}, ${b})`;
};

const MapView: React.FC<MapViewProps> = ({ provinceData, onProvinceClick, selectedProvince }) => {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  const maxCount = useMemo(() => {
    return Math.max(...Object.values(provinceData).map(d => d.count), 1);
  }, [provinceData]);

  const getBubbleRadius = (count: number) => {
    const minR = 8;
    const maxR = 35;
    if (count === 0) return 0;
    return minR + (maxR - minR) * Math.sqrt(count / maxCount);
  };

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <svg
        viewBox="0 0 920 780"
        style={{ width: '100%', height: 'auto' }}
        className="china-map"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="bubbleGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {provinces.map(province => {
          const data = provinceData[province.name];
          const spicy = data?.avgSpicy || 0;
          const fillColor = getSpicyColor(spicy);
          const isHovered = hoveredProvince === province.name;
          const isSelected = selectedProvince === province.name;

          return (
            <path
              key={province.name}
              d={province.path}
              fill={fillColor}
              stroke="#fff"
              strokeWidth="1.5"
              opacity={data?.count ? 0.85 : 0.35}
              style={{
                cursor: data?.count ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                filter: isHovered || isSelected ? 'url(#glow)' : 'none',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                transformOrigin: `${province.cx}px ${province.cy}px`
              }}
              onMouseEnter={() => data?.count && setHoveredProvince(province.name)}
              onMouseLeave={() => setHoveredProvince(null)}
              onClick={() => data?.count && onProvinceClick(province.name)}
            />
          );
        })}

        {provinces.filter(p => provinceData[p.name]?.count).map(province => {
          const data = provinceData[province.name];
          const r = getBubbleRadius(data.count);
          const isHovered = hoveredProvince === province.name;
          const isSelected = selectedProvince === province.name;
          const displayR = isHovered || isSelected ? r * 1.3 : r;

          return (
            <g key={`bubble-${province.name}`}>
              <circle
                cx={province.cx}
                cy={province.cy}
                r={displayR + 5}
                fill="none"
                stroke="rgba(244, 208, 63, 0.6)"
                strokeWidth="2"
                style={{
                  animation: 'bubblePulse 2.5s ease-in-out infinite',
                  transformOrigin: `${province.cx}px ${province.cy}px`
                }}
              />
              <circle
                cx={province.cx}
                cy={province.cy}
                r={displayR}
                fill="rgba(255, 255, 255, 0.7)"
                stroke="#E88540"
                strokeWidth="2"
                filter="url(#bubbleGlow)"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={() => setHoveredProvince(province.name)}
                onMouseLeave={() => setHoveredProvince(null)}
                onClick={() => onProvinceClick(province.name)}
              />
              <text
                x={province.cx}
                y={province.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  fill: '#E88540',
                  pointerEvents: 'none',
                  transition: 'all 0.3s ease',
                  transform: isHovered || isSelected ? `scale(1.2)` : 'scale(1)',
                  transformOrigin: `${province.cx}px ${province.cy}px`
                }}
              >
                {data.count}
              </text>
            </g>
          );
        })}

        {(hoveredProvince || selectedProvince) && (
          (() => {
            const name = hoveredProvince || selectedProvince;
            const province = provinces.find(p => p.name === name);
            const data = name ? provinceData[name] : null;
            if (!province || !data) return null;

            return (
              <g>
                <rect
                  x={province.cx - 60}
                  y={province.cy - getBubbleRadius(data.count) - 45}
                  width="120"
                  height="35"
                  rx="8"
                  fill="white"
                  filter="url(#glow)"
                />
                <text
                  x={province.cx}
                  y={province.cy - getBubbleRadius(data.count) - 28}
                  textAnchor="middle"
                  style={{ fontSize: '13px', fontWeight: 'bold', fill: '#333' }}
                >
                  {province.name}
                </text>
                <text
                  x={province.cx}
                  y={province.cy - getBubbleRadius(data.count) - 14}
                  textAnchor="middle"
                  style={{ fontSize: '11px', fill: '#999' }}
                >
                  {data.count} 道菜 · 辣度 {data.avgSpicy.toFixed(1)}
                </text>
              </g>
            );
          })()
        )}
      </svg>

      <div className="map-legend" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        marginTop: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#666' }}>辣度:</span>
          <div style={{
            width: '150px',
            height: '12px',
            borderRadius: '6px',
            background: 'linear-gradient(to right, rgb(70,130,180), rgb(255,50,40))'
          }} />
          <span style={{ fontSize: '13px', color: '#666' }}>低 → 高</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#666' }}>气泡:</span>
          <span style={{ fontSize: '13px', color: '#666' }}>菜品种类数量</span>
        </div>
      </div>

      <style>{`
        @keyframes bubblePulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.15);
          }
        }
        @media (max-width: 600px) {
          .map-legend {
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default MapView;
