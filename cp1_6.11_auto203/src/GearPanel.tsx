import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GearType, GEAR_TYPES } from './types';

interface GearPanelProps {
  onDragStart: (gearId: string) => void;
  onDragEnd: () => void;
  disabled: boolean;
}

const GearSVG: React.FC<{ gear: GearType; size?: number; preview?: boolean }> = ({ gear, size, preview = false }) => {
  const displaySize = size || gear.size;
  const scale = displaySize / gear.size;
  const r = (gear.size / 2) * scale;
  const teeth = gear.teeth;
  const toothH = r * 0.12;
  const innerR = r - toothH;
  const hubR = r * 0.22;

  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const angle = (i / teeth) * Math.PI * 2 - Math.PI / 2;
    const nextAngle = ((i + 0.5) / teeth) * Math.PI * 2 - Math.PI / 2;
    const outerAngle = ((i + 0.25) / teeth) * Math.PI * 2 - Math.PI / 2;
    const outerAngle2 = ((i + 0.75) / teeth) * Math.PI * 2 - Math.PI / 2;
    points.push(`${Math.cos(angle) * innerR},${Math.sin(angle) * innerR}`);
    points.push(`${Math.cos(outerAngle) * r},${Math.sin(outerAngle) * r}`);
    points.push(`${Math.cos(nextAngle) * r},${Math.sin(nextAngle) * r}`);
    points.push(`${Math.cos(outerAngle2) * innerR},${Math.sin(outerAngle2) * innerR}`);
  }

  const gradId = `grad-${gear.id}-${preview ? 'p' : 'g'}`;
  const hollowId = `hollow-${gear.id}`;

  return (
    <svg width={displaySize} height={displaySize} viewBox={`${-r - 2} ${-r - 2} ${displaySize + 4} ${displaySize + 4}`}>
      <defs>
        <radialGradient id={gradId} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={lighten(gear.color, 30)} />
          <stop offset="50%" stopColor={gear.color} />
          <stop offset="100%" stopColor={darken(gear.color, 35)} />
        </radialGradient>
        <conicGradient id={`conic-${gear.id}`} from="0deg">
          <stop offset="0%" stopColor={darken(gear.color, 20)} stopOpacity="0.4" />
          <stop offset="25%" stopColor={lighten(gear.color, 10)} stopOpacity="0.2" />
          <stop offset="50%" stopColor={darken(gear.color, 20)} stopOpacity="0.4" />
          <stop offset="75%" stopColor={lighten(gear.color, 10)} stopOpacity="0.2" />
          <stop offset="100%" stopColor={darken(gear.color, 20)} stopOpacity="0.4" />
        </conicGradient>
        {gear.isHollow && (
          <mask id={hollowId}>
            <rect x={-r - 2} y={-r - 2} width={displaySize + 4} height={displaySize + 4} fill="white" />
            {Array.from({ length: 5 }).map((_, i) => {
              const a = (i / 5) * Math.PI * 2;
              const rr = innerR * 0.5;
              return <circle key={i} cx={Math.cos(a) * rr} cy={Math.sin(a) * rr} r={innerR * 0.25} fill="black" />;
            })}
          </mask>
        )}
      </defs>
      <g mask={gear.isHollow ? `url(#${hollowId})` : undefined}>
        <polygon
          points={points.join(' ')}
          fill={`url(#${gradId})`}
          stroke={darken(gear.color, 45)}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <polygon
          points={points.join(' ')}
          fill={`url(#conic-${gear.id})`}
          opacity={0.5}
        />
      </g>
      {gear.isDual && gear.dualTeeth && (() => {
        const sr = innerR * 0.65;
        const sth = sr * 0.12;
        const sInner = sr - sth;
        const sPoints: string[] = [];
        for (let i = 0; i < gear.dualTeeth; i++) {
          const angle = (i / gear.dualTeeth) * Math.PI * 2 - Math.PI / 2;
          const nextAngle = ((i + 0.5) / gear.dualTeeth) * Math.PI * 2 - Math.PI / 2;
          const outerAngle = ((i + 0.25) / gear.dualTeeth) * Math.PI * 2 - Math.PI / 2;
          const outerAngle2 = ((i + 0.75) / gear.dualTeeth) * Math.PI * 2 - Math.PI / 2;
          sPoints.push(`${Math.cos(angle) * sInner},${Math.sin(angle) * sInner}`);
          sPoints.push(`${Math.cos(outerAngle) * sr},${Math.sin(outerAngle) * sr}`);
          sPoints.push(`${Math.cos(nextAngle) * sr},${Math.sin(nextAngle) * sr}`);
          sPoints.push(`${Math.cos(outerAngle2) * sInner},${Math.sin(outerAngle2) * sInner}`);
        }
        return (
          <polygon
            points={sPoints.join(' ')}
            fill={darken(gear.color, 20)}
            stroke={darken(gear.color, 45)}
            strokeWidth={1.5}
          />
        );
      })()}
      {gear.hasCam && (
        <ellipse
          cx={innerR * 0.4}
          cy={0}
          rx={innerR * 0.25}
          ry={innerR * 0.12}
          fill={darken(gear.color, 30)}
          stroke={darken(gear.color, 50)}
          strokeWidth={1}
        />
      )}
      <circle cx={0} cy={0} r={hubR} fill={darken(gear.color, 55)} stroke={darken(gear.color, 45)} strokeWidth={1.5} />
      <circle cx={0} cy={0} r={hubR * 0.4} fill="#1a0f05" />
    </svg>
  );
};

const lighten = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + percent);
  const b = Math.min(255, (num & 0x0000ff) + percent);
  return `rgb(${r},${g},${b})`;
};

const darken = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - percent);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - percent);
  const b = Math.max(0, (num & 0x0000ff) - percent);
  return `rgb(${r},${g},${b})`;
};

const GearCard: React.FC<{
  gear: GearType;
  onDragStart: (gearId: string) => void;
  onDragEnd: () => void;
  disabled: boolean;
}> = ({ gear, onDragStart, onDragEnd, disabled }) => {
  const [hovered, setHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (disabled) return;
    setShowPreview(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowPreview(false), 2000);
  };

  return (
    <motion.div
      draggable={!disabled}
      onDragStart={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('gearId', gear.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(gear.id);
      }}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: '12px 8px',
        background: 'linear-gradient(145deg, #3a2418 0%, #1f1510 100%)',
        border: '2px solid #6b5530',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'grab',
        userSelect: 'none',
        opacity: disabled ? 0.5 : 1,
        boxShadow: hovered
          ? '0 4px 16px rgba(201,169,110,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        borderStyle: 'solid',
        borderTopColor: hovered ? '#c9a96e' : '#6b5530',
        borderLeftColor: hovered ? '#c9a96e' : '#6b5530',
        borderRightColor: hovered ? '#8b6914' : '#3a2a10',
        borderBottomColor: hovered ? '#8b6914' : '#3a2a10'
      }}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 80, position: 'relative' }}>
        <motion.div
          animate={hovered ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 2, repeat: hovered ? Infinity : 0, ease: 'linear' }}
          style={{ display: 'inline-block' }}
        >
          <GearSVG gear={gear} size={70} />
        </motion.div>
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 100,
                height: 100,
                pointerEvents: 'none'
              }}
            >
              <svg width={100} height={100} viewBox="-50 -50 100 100">
                <circle
                  cx={0}
                  cy={0}
                  r={45}
                  fill="none"
                  stroke="#ffd700"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.7}
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <div style={{ color: '#f5e6cc', fontSize: 12, fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
          {gear.name}
        </div>
        <div style={{ color: '#c9a96e', fontSize: 10, marginTop: 2, fontFamily: 'Georgia, serif' }}>
          齿数: {gear.teeth}{gear.dualTeeth ? `+${gear.dualTeeth}` : ''}
        </div>
      </div>
    </motion.div>
  );
};

const GearPanel: React.FC<GearPanelProps> = ({ onDragStart, onDragEnd, disabled }) => {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(42,30,18,0.95) 0%, rgba(26,18,10,0.98) 100%)',
        border: '3px solid #6b5530',
        borderRadius: 8,
        padding: '16px 12px',
        width: 180,
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          color: '#c9a96e',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 'bold',
          fontFamily: 'Georgia, serif',
          paddingBottom: 10,
          marginBottom: 12,
          borderBottom: '2px solid #6b5530',
          letterSpacing: 2
        }}
      >
        ⚙ 齿轮仓库
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflowY: 'auto',
          flex: 1,
          paddingRight: 4
        }}
      >
        {GEAR_TYPES.map(gear => (
          <GearCard
            key={gear.id}
            gear={gear}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            disabled={disabled}
          />
        ))}
      </div>
      <style>{`
        @media (max-width: 768px) {
          div[style*="width: 180px"] {
            width: 100% !important;
            flex-direction: row !important;
          }
          div[style*="flexDirection: column"] {
            flex-direction: row !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GearPanel;
export { GearSVG };
