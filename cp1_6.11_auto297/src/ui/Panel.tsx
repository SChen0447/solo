import React from 'react';
import { motion } from 'framer-motion';

export interface PanelProps {
  temperature: number;
  ph: number;
  sulfide: number;
  onTemperatureChange: (value: number) => void;
  onPhChange: (value: number) => void;
  onSulfideChange: (value: number) => void;
  isMobile: boolean;
  shrimpCount: number;
  biofilmCoverage: number;
  gatheringRatio: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const tempToColor = (temp: number): string => {
  const t = clamp((temp - 0) / 100, 0, 1);
  const r = Math.round(93 + (231 - 93) * t);
  const g = Math.round(173 + (76 - 173) * t);
  const b = Math.round(226 + (60 - 226) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const phToColor = (ph: number): string => {
  if (ph < 6) return 'rgba(231, 76, 60, 0.9)';
  if (ph > 8) return 'rgba(231, 76, 60, 0.9)';
  return 'rgba(46, 204, 113, 0.9)';
};

const sulfideToColor = (s: number): string => {
  const t = clamp(s / 10, 0, 1);
  return `rgb(${Math.round(255 * t + 180 * (1 - t))}, ${Math.round(200 * (1 - t))}, 80)`;
};

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  gradientStops: string;
  onChange: (v: number) => void;
  isMobile: boolean;
}> = ({ label, value, min, max, step, unit, color, gradientStops, onChange, isMobile }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flex: 1,
          minWidth: 0,
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 600,
        }}>
          <span>{label}</span>
          <span style={{ color, fontWeight: 700 }}>{value.toFixed(step < 1 ? 1 : 0)}{unit}</span>
        </div>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(clamp(v, min, max));
          }}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: `1px solid ${color}44`,
            background: 'rgba(255,255,255,0.06)',
            color: 'white',
            fontSize: '13px',
            fontFamily: "'Nunito', sans-serif",
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}>
        <span style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 600,
          letterSpacing: '0.3px',
        }}>{label}</span>
        <span style={{
          fontSize: '15px',
          color,
          fontWeight: 700,
          fontFamily: "'Orbitron', sans-serif",
          textShadow: `0 0 8px ${color}66`,
        }}>
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: '8px' }}>
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: '4px',
            background: `linear-gradient(to right, ${gradientStops})`,
            opacity: 0.45,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            height: '100%',
            width: `${percentage}%`,
            borderRadius: '4px',
            background: `linear-gradient(to right, ${gradientStops})`,
            boxShadow: `0 0 12px ${color}aa`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '8px',
            margin: 0,
            WebkitAppearance: 'none',
            appearance: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px; height: 18px;
            border-radius: 50%;
            background: ${color};
            border: 2px solid rgba(255,255,255,0.9);
            cursor: pointer;
            box-shadow: 0 0 10px ${color}, 0 2px 6px rgba(0,0,0,0.4);
            margin-top: -5px;
            transition: transform 0.1s ease;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.15);
          }
          input[type="range"]::-moz-range-thumb {
            width: 18px; height: 18px;
            border-radius: 50%;
            background: ${color};
            border: 2px solid rgba(255,255,255,0.9);
            cursor: pointer;
            box-shadow: 0 0 10px ${color};
          }
          input[type="range"]::-webkit-slider-runnable-track {
            height: 8px;
            border-radius: 4px;
            background: transparent;
          }
          input[type="range"]::-moz-range-track {
            height: 8px;
            border-radius: 4px;
            background: transparent;
          }
        `}</style>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.45)',
        fontFamily: "'Nunito', sans-serif",
      }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </motion.div>
  );
};

const StatBadge: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
  }}>
    <span style={{
      fontSize: '10px',
      color: 'rgba(255,255,255,0.55)',
      fontFamily: "'Nunito', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>{label}</span>
    <span style={{
      fontSize: '14px',
      fontWeight: 700,
      color,
      fontFamily: "'Orbitron', sans-serif",
      marginTop: '2px',
    }}>{value}</span>
  </div>
);

export const Panel: React.FC<PanelProps> = ({
  temperature, ph, sulfide,
  onTemperatureChange, onPhChange, onSulfideChange,
  isMobile, shrimpCount, biofilmCoverage, gatheringRatio,
}) => {
  const content = (
    <>
      <div style={{
        textAlign: isMobile ? 'left' : 'center',
        marginBottom: isMobile ? '10px' : '20px',
      }}>
        <h2 style={{
          margin: 0,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: isMobile ? '14px' : '17px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #5dade2, #ffb347)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '1px',
        }}>
          深海控制台
        </h2>
        <p style={{
          margin: isMobile ? '2px 0 0 0' : '6px 0 0 0',
          fontSize: isMobile ? '10px' : '11px',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: "'Nunito', sans-serif",
        }}>
          调节环境参数，培养共生菌毯
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: isMobile ? '6px' : '10px',
        justifyContent: 'center',
        marginBottom: isMobile ? '12px' : '20px',
        flexWrap: 'wrap',
      }}>
        <StatBadge
          label="盲虾"
          value={`${shrimpCount}只`}
          color="rgba(220, 220, 220, 0.95)"
        />
        <StatBadge
          label="菌毯"
          value={`${(biofilmCoverage * 100).toFixed(0)}%`}
          color={biofilmCoverage > 0.4 ? '#ffb347' : 'rgba(255,179,71,0.7)'}
        />
        <StatBadge
          label="聚集"
          value={`${(gatheringRatio * 100).toFixed(0)}%`}
          color={gatheringRatio > 0.7 ? '#2ecc71' : 'rgba(46,204,113,0.7)'}
        />
      </div>

      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        gap: isMobile ? '12px' : '22px',
        flexWrap: isMobile ? 'nowrap' : 'nowrap',
      }}>
        <SliderControl
          label="温度"
          value={temperature}
          min={0} max={100} step={1} unit="°C"
          color={tempToColor(temperature)}
          gradientStops="#5dade2, #85c1e9, #f9e79f, #f1948a, #e74c3c"
          onChange={onTemperatureChange}
          isMobile={isMobile}
        />
        <SliderControl
          label="pH值"
          value={ph}
          min={5} max={9} step={0.1} unit=""
          color={phToColor(ph)}
          gradientStops="#e74c3c, #f1948a, #2ecc71, #f1948a, #e74c3c"
          onChange={onPhChange}
          isMobile={isMobile}
        />
        <SliderControl
          label="硫化物"
          value={sulfide}
          min={0} max={10} step={0.1} unit="mM"
          color={sulfideToColor(sulfide)}
          gradientStops="#85929e, #b2babb, #d4ac0d, #e67e22, #ba4a00"
          onChange={onSulfideChange}
          isMobile={isMobile}
        />
      </div>

      {!isMobile && (
        <div style={{
          marginTop: '22px',
          padding: '12px 14px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          fontSize: '11px',
          lineHeight: 1.7,
          color: 'rgba(255,255,255,0.55)',
          fontFamily: "'Nunito', sans-serif",
        }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>
            📋 培养指南
          </div>
          <div>• 温度30-50°C：盲虾能量恢复区</div>
          <div>• pH 6-8：菌毯适宜生长范围</div>
          <div>• 硫化物越高菌毯生长越快</div>
          <div>• 悬停盲虾查看个体能量状态</div>
        </div>
      )}
    </>
  );

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        padding: '12px 16px 16px 16px',
        background: 'rgba(10, 15, 28, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
        zIndex: 100,
        boxSizing: 'border-box',
      }
    : {
        position: 'fixed',
        top: '50%',
        right: '20px',
        transform: 'translateY(-50%)',
        width: '280px',
        padding: '24px 22px',
        borderRadius: '18px',
        background: 'rgba(10, 15, 28, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        zIndex: 100,
        boxSizing: 'border-box',
      };

  return (
    <motion.div
      initial={isMobile ? { y: 100, opacity: 0 } : { x: 100, opacity: 0 }}
      animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 160, delay: 0.1 }}
      style={panelStyle}
    >
      {content}
    </motion.div>
  );
};
