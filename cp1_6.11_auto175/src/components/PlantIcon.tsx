import React from 'react';
import { PlantType } from '../types';
import { PLANT_DATA } from '../utils/plantData';

interface PlantIconProps {
  type: PlantType;
  size?: number;
  showNectar?: boolean;
  nectar?: number;
  onClick?: () => void;
  isDragging?: boolean;
}

export const PlantIcon: React.FC<PlantIconProps> = ({
  type,
  size = 50,
  showNectar = false,
  nectar = 100,
  onClick,
  isDragging = false
}) => {
  const plant = PLANT_DATA[type];
  const nectarPercent = (nectar / plant.maxNectar) * 100;

  return (
    <div
      className="plant-icon-wrapper"
      style={{
        width: size,
        height: showNectar ? size + 12 : size,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isDragging ? 0.5 : 1,
        transition: 'transform 0.2s'
      }}
      onClick={onClick}
    >
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: `drop-shadow(0 0 6px ${plant.glowColor})`,
          transition: 'filter 0.3s'
        }}
      >
        {type === 'aristolochia' && <AristolochiaIcon size={size * 0.7} color={plant.color} />}
        {type === 'buddleja' && <BuddlejaIcon size={size * 0.7} color={plant.color} />}
        {type === 'hibiscus' && <HibiscusIcon size={size * 0.7} color={plant.color} />}
        {type === 'lantana' && <LantanaIcon size={size * 0.7} color={plant.color} />}
      </div>

      {showNectar && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            width: '80%',
            height: 6,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: 3,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${nectarPercent}%`,
              height: '100%',
              backgroundColor: plant.color,
              borderRadius: 3,
              transition: 'width 0.3s ease-out'
            }}
          />
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: -2,
          right: -2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: plant.color,
          border: '2px solid rgba(255,255,255,0.8)',
          fontSize: 10,
          fontWeight: 'bold',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        }}
      >
        {Math.round(plant.nectarLevel / 20)}
      </div>
    </div>
  );
};

const AristolochiaIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <path
      d="M20 5 C15 5, 8 12, 8 20 C8 28, 14 35, 20 35 C26 35, 32 28, 32 20 C32 12, 25 5, 20 5"
      fill={color}
      stroke="rgba(0,0,0,0.3)"
      strokeWidth="1"
    />
    <path
      d="M20 10 L20 32"
      stroke="rgba(0,0,0,0.3)"
      strokeWidth="1.5"
      fill="none"
    />
    <ellipse cx="20" cy="22" rx="4" ry="6" fill="rgba(139,69,19,0.6)" />
  </svg>
);

const BuddlejaIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <path
      d="M20 38 L20 20"
      stroke="#2d5a3d"
      strokeWidth="2"
    />
    {[0, 1, 2, 3, 4].map(i => (
      <g key={i}>
        <ellipse
          cx={20 - 8 + i * 0}
          cy={10 + i * 5}
          rx={7 - i * 0.8}
          ry={5 - i * 0.5}
          fill={color}
          opacity={0.8 - i * 0.1}
        />
        <ellipse
          cx={20 + 8 - i * 0}
          cy={10 + i * 5}
          rx={7 - i * 0.8}
          ry={5 - i * 0.5}
          fill={color}
          opacity={0.8 - i * 0.1}
        />
      </g>
    ))}
    <ellipse cx="20" cy="6" rx="5" ry="4" fill={color} opacity="0.9" />
  </svg>
);

const HibiscusIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    {[0, 72, 144, 216, 288].map((angle, i) => (
      <ellipse
        key={i}
        cx="20"
        cy="12"
        rx="6"
        ry="10"
        fill={color}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.5"
        transform={`rotate(${angle} 20 20)`}
      />
    ))}
    <circle cx="20" cy="20" r="5" fill="#FFD700" />
    <circle cx="20" cy="20" r="3" fill="#8B4513" />
    {[0, 60, 120, 180, 240, 300].map((angle, i) => (
      <line
        key={i}
        x1="20"
        y1="15"
        x2="20"
        y2="10"
        stroke="#FFD700"
        strokeWidth="1"
        transform={`rotate(${angle} 20 20)`}
      />
    ))}
  </svg>
);

const LantanaIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <circle cx="15" cy="15" r="6" fill={color} />
    <circle cx="25" cy="15" r="6" fill="#FFD700" />
    <circle cx="20" cy="20" r="5" fill="#FF8C00" />
    <circle cx="15" cy="25" r="5" fill="#FFD700" />
    <circle cx="25" cy="25" r="5" fill={color} />
    <circle cx="20" cy="12" r="4" fill="#FF6347" />
    {[[15, 15], [25, 15], [20, 20], [15, 25], [25, 25], [20, 12]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy - 1} r="1.5" fill="rgba(255,255,255,0.6)" />
    ))}
  </svg>
);

export default PlantIcon;
