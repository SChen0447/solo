import { useState } from 'react';
import type { AvatarFeatures, ClothingType, ExpressionType, HairStyleType } from '../types';
import {
  CLOTHING_OPTIONS,
  CLOTHING_CONFIGS,
  EXPRESSION_OPTIONS,
  EXPRESSION_CONFIGS,
  HAIRSTYLE_OPTIONS,
  HAIRSTYLE_CONFIGS,
  HAIR_COLORS,
  SKIN_COLOR_RANGE,
} from '../types';

interface ControlPanelProps {
  features: AvatarFeatures;
  onChange: (patch: Partial<AvatarFeatures>) => void;
  onRandomize: () => void;
  onExport: () => void;
  isAnimating: boolean;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color1);
  const c2 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color2);
  if (!c1 || !c2) return color1;
  const r = Math.round(parseInt(c1[1], 16) + (parseInt(c2[1], 16) - parseInt(c1[1], 16)) * t);
  const g = Math.round(parseInt(c1[2], 16) + (parseInt(c2[2], 16) - parseInt(c1[2], 16)) * t);
  const b = Math.round(parseInt(c1[3], 16) + (parseInt(c2[3], 16) - parseInt(c1[3], 16)) * t);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const SKIN_PRESET_COUNT = 7;
const SKIN_PRESETS = Array.from({ length: SKIN_PRESET_COUNT }, (_, i) =>
  lerpColor(SKIN_COLOR_RANGE.start, SKIN_COLOR_RANGE.end, i / (SKIN_PRESET_COUNT - 1))
);

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #7F8C8D',
  backgroundColor: '#2C3E50',
  color: '#ECF0F1',
  fontSize: '14px',
  cursor: 'pointer',
  outline: 'none',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '6px',
  border: 'none',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease',
  color: '#ECF0F1',
  boxSizing: 'border-box',
  minHeight: '44px',
};

const groupTitleStyle: React.CSSProperties = {
  color: '#BDC3C7',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '8px',
};

export default function ControlPanel({ features, onChange, onRandomize, onExport, isAnimating }: ControlPanelProps) {
  const [pulsingSkin, setPulsingSkin] = useState<string | null>(null);
  const [pulsingHair, setPulsingHair] = useState<string | null>(null);

  const handleSelectChange = (field: 'clothing' | 'expression' | 'hairStyle', value: string) => {
    onChange({ [field]: value } as Partial<AvatarFeatures>);
  };

  const handleColorClick = (color: string, field: 'skinColor' | 'hairColor') => {
    onChange({ [field]: color } as Partial<AvatarFeatures>);
    if (field === 'skinColor') {
      setPulsingSkin(color);
      setTimeout(() => setPulsingSkin(null), 100);
    } else {
      setPulsingHair(color);
      setTimeout(() => setPulsingHair(null), 100);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      padding: '28px 24px',
      backgroundColor: '#34495E',
      overflowY: 'auto',
      boxSizing: 'border-box',
      animation: 'slideIn 0.5s ease-out',
    }}>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
          50% { transform: scale(1.15); box-shadow: 0 0 0 6px rgba(255,255,255,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        select:hover, button:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }
        select:focus {
          border-color: #3498DB;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3);
        }
        .color-swatch {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .color-swatch:hover {
          transform: scale(1.15);
        }
        .color-swatch.selected {
          box-shadow: 0 0 0 3px #ECF0F1, 0 0 0 5px #3498DB;
        }
      `}</style>

      <h2 style={{
        color: '#ECF0F1',
        fontSize: '20px',
        fontWeight: 700,
        marginBottom: '24px',
        letterSpacing: '0.3px',
      }}>
        头像生成器
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <div style={groupTitleStyle}>服装</div>
          <select
            value={features.clothing}
            onChange={(e) => handleSelectChange('clothing', e.target.value as ClothingType)}
            disabled={isAnimating}
            style={selectStyle}
          >
            {CLOTHING_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{CLOTHING_CONFIGS[opt].label}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={groupTitleStyle}>表情</div>
          <select
            value={features.expression}
            onChange={(e) => handleSelectChange('expression', e.target.value as ExpressionType)}
            disabled={isAnimating}
            style={selectStyle}
          >
            {EXPRESSION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{EXPRESSION_CONFIGS[opt].label}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={groupTitleStyle}>发型</div>
          <select
            value={features.hairStyle}
            onChange={(e) => handleSelectChange('hairStyle', e.target.value as HairStyleType)}
            disabled={isAnimating}
            style={selectStyle}
          >
            {HAIRSTYLE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{HAIRSTYLE_CONFIGS[opt].label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onRandomize}
          disabled={isAnimating}
          style={{
            ...buttonStyle,
            backgroundColor: isAnimating ? '#7F8C8D' : '#E67E22',
            cursor: isAnimating ? 'not-allowed' : 'pointer',
          }}
        >
          {isAnimating ? '生成中...' : '🎲 随机生成'}
        </button>

        <div style={{
          height: '1px',
          backgroundColor: '#7F8C8D',
          opacity: 0.4,
          margin: '4px 0',
        }} />

        <div>
          <div style={groupTitleStyle}>肤色</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {SKIN_PRESETS.map((color) => (
              <div
                key={color}
                onClick={() => handleColorClick(color, 'skinColor')}
                className={`color-swatch ${features.skinColor.toLowerCase() === color.toLowerCase() ? 'selected' : ''}`}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '2px solid rgba(255,255,255,0.2)',
                  animation: pulsingSkin === color ? 'pulse 0.1s ease-out' : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <div style={groupTitleStyle}>发色</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {HAIR_COLORS.map((color) => (
              <div
                key={color}
                onClick={() => handleColorClick(color, 'hairColor')}
                className={`color-swatch ${features.hairColor.toLowerCase() === color.toLowerCase() ? 'selected' : ''}`}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '2px solid rgba(255,255,255,0.2)',
                  animation: pulsingHair === color ? 'pulse 0.1s ease-out' : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <div style={{
          height: '1px',
          backgroundColor: '#7F8C8D',
          opacity: 0.4,
          margin: '4px 0',
        }} />

        <button
          onClick={onExport}
          disabled={isAnimating}
          style={{
            ...buttonStyle,
            backgroundColor: isAnimating ? '#7F8C8D' : '#27AE60',
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            marginTop: '4px',
          }}
        >
          💾 导出 PNG
        </button>
      </div>
    </div>
  );
}
