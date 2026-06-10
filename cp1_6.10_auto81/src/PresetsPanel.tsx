import React from 'react';
import { Preset, gradientToStopsArray } from './utils';

interface PresetsPanelProps {
  presets: Preset[];
  onSelectPreset: (preset: Preset) => void;
}

const PresetsPanel: React.FC<PresetsPanelProps> = ({ presets, onSelectPreset }) => {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8, fontWeight: 500 }}>预设方案</div>
      <div
        className="presets-scroll"
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 8,
        }}
      >
        <style>{`
          .presets-scroll::-webkit-scrollbar { display: none; }
          .presets-scroll { -ms-overflow-style: none; scrollbar-width: none; }
          @media (max-width: 768px) {
            .presets-scroll { flex-wrap: wrap; }
            .preset-card-wrap { flex: 0 0 calc(50% - 6px); }
          }
        `}</style>
        {presets.map((preset, idx) => {
          const gradientCSS = gradientToStopsArray(preset.stops);
          return (
            <div
              key={idx}
              className="preset-card-wrap"
              onClick={() => onSelectPreset(preset)}
              style={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                transition: 'transform 0.2s ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 60,
                  borderRadius: 8,
                  background: `linear-gradient(${preset.angle}deg, ${gradientCSS})`,
                  border: '2px solid transparent',
                  transition: 'border-color 0.2s ease-out',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              />
              <span style={{ fontSize: 12, color: '#666' }}>{preset.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PresetsPanel;
