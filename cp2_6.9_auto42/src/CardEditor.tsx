import React, { useState, useMemo } from 'react';
import { HexColorPicker } from 'react-colorful';
import { CardData } from './types';
import { ICONS, PRESET_BORDER_COLORS, FONTS } from './icons';

interface CardEditorProps {
  card: CardData;
  onChange: (updates: Partial<CardData>) => void;
}

const CardEditor: React.FC<CardEditorProps> = ({ card, onChange }) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [activeColorPicker, setActiveColorPicker] = useState<'bg' | 'border' | 'gradient' | 'icon' | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 20);
    onChange({ name: value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 50);
    onChange({ description: value });
  };

  const handleIconSelect = (iconId: string) => {
    onChange({ iconId });
    setShowIconPicker(false);
  };

  const getContrastColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const colorPickerContent = useMemo(() => {
    if (!activeColorPicker) return null;
    const colorMap: Record<string, string> = {
      bg: card.backgroundColor,
      border: card.borderColor,
      gradient: card.backgroundGradient,
      icon: card.iconColor
    };
    const labelMap: Record<string, string> = {
      bg: '背景色',
      border: '边框色',
      gradient: '渐变色',
      icon: '图标色'
    };
    const key = activeColorPicker;
    return (
      <div style={styles.colorPickerWrapper}>
        <div style={styles.colorPickerLabel}>{labelMap[key]}</div>
        <HexColorPicker
          color={colorMap[key]}
          onChange={(color) => {
            if (key === 'bg') onChange({ backgroundColor: color });
            if (key === 'border') onChange({ borderColor: color });
            if (key === 'gradient') onChange({ backgroundGradient: color });
            if (key === 'icon') onChange({ iconColor: color });
          }}
          style={{ width: '100%' }}
        />
        <input
          type="text"
          value={colorMap[key]}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              if (key === 'bg') onChange({ backgroundColor: val });
              if (key === 'border') onChange({ borderColor: val });
              if (key === 'gradient') onChange({ backgroundGradient: val });
              if (key === 'icon') onChange({ iconColor: val });
            }
          }}
          style={styles.hexInput}
        />
      </div>
    );
  }, [activeColorPicker, card.backgroundColor, card.borderColor, card.backgroundGradient, card.iconColor, onChange]);

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>卡牌信息</h3>
        <div style={styles.field}>
          <label style={styles.label}>卡牌名称 (最多20字符)</label>
          <input
            type="text"
            value={card.name}
            onChange={handleNameChange}
            style={styles.textInput}
            placeholder="输入卡牌名称..."
          />
          <div style={styles.charCount}>{card.name.length}/20</div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>描述文本 (最多50字符)</label>
          <textarea
            value={card.description}
            onChange={handleDescriptionChange}
            style={styles.textarea}
            rows={3}
            placeholder="输入卡牌描述..."
          />
          <div style={styles.charCount}>{card.description.length}/50</div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>字体</h3>
        <select
          value={card.font}
          onChange={(e) => onChange({ font: e.target.value })}
          style={styles.select}
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>边框颜色</h3>
        <div style={styles.colorGrid}>
          {PRESET_BORDER_COLORS.map(color => (
            <button
              key={color}
              onClick={() => onChange({ borderColor: color })}
              style={{
                ...styles.colorSwatch,
                backgroundColor: color,
                ...(card.borderColor === color ? styles.colorSwatchActive : {}),
                color: getContrastColor(color)
              }}
              title={color}
            />
          ))}
          <button
            onClick={() => setActiveColorPicker(activeColorPicker === 'border' ? null : 'border')}
            style={{
              ...styles.colorSwatch,
              ...(activeColorPicker === 'border' ? styles.colorSwatchActive : {})
            }}
          >
            🎨
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>背景设置</h3>
        <div style={styles.row}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={card.useGradient}
              onChange={(e) => onChange({ useGradient: e.target.checked })}
              style={styles.checkbox}
            />
            使用径向渐变
          </label>
        </div>
        <div style={styles.row}>
          <button
            onClick={() => setActiveColorPicker(activeColorPicker === 'bg' ? null : 'bg')}
            style={styles.colorButton}
          >
            <span style={{ ...styles.colorButtonDot, backgroundColor: card.backgroundColor }} />
            主背景色
          </button>
          {card.useGradient && (
            <button
              onClick={() => setActiveColorPicker(activeColorPicker === 'gradient' ? null : 'gradient')}
              style={styles.colorButton}
            >
              <span style={{ ...styles.colorButtonDot, backgroundColor: card.backgroundGradient }} />
              渐变色
            </button>
          )}
        </div>
        {card.useGradient && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>渐变中心 X: {card.gradientCenterX}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={card.gradientCenterX}
                onChange={(e) => onChange({ gradientCenterX: parseInt(e.target.value) })}
                style={styles.slider}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>渐变中心 Y: {card.gradientCenterY}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={card.gradientCenterY}
                onChange={(e) => onChange({ gradientCenterY: parseInt(e.target.value) })}
                style={styles.slider}
              />
            </div>
          </>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>图标</h3>
        <button
          onClick={() => setShowIconPicker(prev => !prev)}
          style={styles.primaryBtn}
        >
          {showIconPicker ? '关闭图标库' : '+ 添加图标'}
        </button>
        {showIconPicker && (
          <div style={styles.iconGrid}>
            {ICONS.map(icon => (
              <button
                key={icon.id}
                onClick={() => handleIconSelect(icon.id)}
                style={{
                  ...styles.iconBtn,
                  ...(card.iconId === icon.id ? styles.iconBtnActive : {})
                }}
                title={icon.name}
              >
                <svg viewBox="0 0 24 24" width="28" height="28" style={{ color: card.iconColor }}>
                  <g dangerouslySetInnerHTML={{ __html: icon.svg }} />
                </svg>
              </button>
            ))}
          </div>
        )}
        {card.iconId && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>图标颜色</label>
              <button
                onClick={() => setActiveColorPicker(activeColorPicker === 'icon' ? null : 'icon')}
                style={styles.colorButton}
              >
                <span style={{ ...styles.colorButtonDot, backgroundColor: card.iconColor }} />
                选择颜色
              </button>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>图标大小: {card.iconSize}px</label>
              <input
                type="range"
                min={16}
                max={64}
                value={card.iconSize}
                onChange={(e) => onChange({ iconSize: parseInt(e.target.value) })}
                style={styles.slider}
              />
            </div>
            <button
              onClick={() => onChange({ iconId: null })}
              style={styles.dangerBtn}
            >
              移除图标
            </button>
          </>
        )}
      </div>

      {colorPickerContent}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#FFF8E7',
    marginBottom: 4,
    paddingBottom: 8,
    borderBottom: '1px solid #4A4A6A'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  label: {
    fontSize: 12,
    color: '#AAAAC5'
  },
  textInput: {
    padding: '8px 12px',
    backgroundColor: '#1E1E2E',
    border: '1px solid #4A4A6A',
    borderRadius: 6,
    color: '#E0E0E0',
    fontSize: 14,
    outline: 'none'
  },
  textarea: {
    padding: '8px 12px',
    backgroundColor: '#1E1E2E',
    border: '1px solid #4A4A6A',
    borderRadius: 6,
    color: '#E0E0E0',
    fontSize: 14,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit'
  },
  charCount: {
    fontSize: 11,
    color: '#777799',
    textAlign: 'right'
  },
  select: {
    padding: '8px 12px',
    backgroundColor: '#1E1E2E',
    border: '1px solid #4A4A6A',
    borderRadius: 6,
    color: '#E0E0E0',
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none'
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 6,
    border: '2px solid #4A4A6A',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    transition: 'all 0.2s ease'
  },
  colorSwatchActive: {
    borderColor: '#7C3AED',
    transform: 'scale(1.1)',
    boxShadow: '0 0 10px rgba(124, 58, 237, 0.5)'
  },
  colorButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    backgroundColor: '#1E1E2E',
    border: '1px solid #4A4A6A',
    borderRadius: 6,
    color: '#E0E0E0',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all 0.2s ease'
  },
  colorButtonDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    border: '1px solid #666'
  },
  row: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#AAAAC5',
    cursor: 'pointer'
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer'
  },
  slider: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E1E2E',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#7C3AED'
  },
  primaryBtn: {
    padding: '10px 16px',
    backgroundColor: '#3D3D5C',
    border: '1px solid #4A4A6A',
    borderRadius: 6,
    color: '#E0E0E0',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s ease'
  },
  dangerBtn: {
    padding: '8px 14px',
    backgroundColor: '#5C3D3D',
    border: '1px solid #6A4A4A',
    borderRadius: 6,
    color: '#FFAAAA',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all 0.2s ease'
  },
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    marginTop: 8,
    animation: 'fadeIn 0.3s ease'
  },
  iconBtn: {
    padding: 10,
    backgroundColor: '#1E1E2E',
    border: '2px solid #4A4A6A',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  iconBtnActive: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    transform: 'scale(1.05)'
  },
  colorPickerWrapper: {
    backgroundColor: '#1E1E2E',
    border: '1px solid #4A4A6A',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    animation: 'fadeIn 0.3s ease'
  },
  colorPickerLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#FFF8E7'
  },
  hexInput: {
    padding: '6px 10px',
    backgroundColor: '#2D2D44',
    border: '1px solid #4A4A6A',
    borderRadius: 6,
    color: '#E0E0E0',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
    outline: 'none'
  }
};

const iconAnimStyle = document.createElement('style');
iconAnimStyle.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #7C3AED;
    cursor: pointer;
    border: 2px solid #FFF;
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #7C3AED;
    cursor: pointer;
    border: 2px solid #FFF;
  }
`;
document.head.appendChild(iconAnimStyle);

export default CardEditor;
