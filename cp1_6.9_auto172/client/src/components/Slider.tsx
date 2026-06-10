import React from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  color?: string;
  onChange: (value: number) => void;
}

export default function Slider({ label, value, min, max, step = 1, unit = '', color = '#ffcc66', onChange }: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{
          fontSize: 14, fontWeight: 600,
          color,
          fontFamily: 'var(--font-display)',
          textShadow: `0 0 8px ${color}66`
        }}>
          {Number.isInteger(step) ? Math.round(value) : value.toFixed(1)}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 6,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 3
        }} />
        <div style={{
          position: 'absolute', left: 0, height: 6, width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}66, ${color})`,
          borderRadius: 3,
          boxShadow: `0 0 10px ${color}88`,
          transition: 'width 0.1s ease-out'
        }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'relative',
            width: '100%',
            height: 28,
            background: 'transparent',
            appearance: 'none',
            WebkitAppearance: 'none',
            outline: 'none',
            cursor: 'pointer',
            zIndex: 2
          }}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px; height: 20px;
            border-radius: 50%;
            background: radial-gradient(circle, ${color}, ${color}cc);
            border: 2px solid rgba(255,255,255,0.8);
            box-shadow: 0 0 12px ${color}, 0 0 20px ${color}66;
            cursor: pointer;
            transition: transform 0.15s ease;
          }
          input[type=range]::-webkit-slider-thumb:hover {
            transform: scale(1.15);
          }
          input[type=range]::-moz-range-thumb {
            width: 20px; height: 20px;
            border-radius: 50%;
            background: radial-gradient(circle, ${color}, ${color}cc);
            border: 2px solid rgba(255,255,255,0.8);
            box-shadow: 0 0 12px ${color};
            cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  );
}
