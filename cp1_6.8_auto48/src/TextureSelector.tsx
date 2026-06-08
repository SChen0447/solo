import { useRef, useEffect, useState } from 'react';
import { TextureType, BlendMode, TEXTURE_LIST, BLEND_MODES } from '../types';
import { getColoredTexture } from '../utils/textureGenerator';
import '../styles/TextureSelector.css';

interface TextureSelectorProps {
  selectedA: TextureType;
  selectedB: TextureType;
  colorA: string;
  colorB: string;
  blendMode: BlendMode;
  opacityA: number;
  opacityB: number;
  intensity: number;
  activeSlot: 'A' | 'B';
  onSelectTexture: (type: TextureType) => void;
  onColorChange: (slot: 'A' | 'B', color: string) => void;
  onBlendModeChange: (mode: BlendMode) => void;
  onOpacityAChange: (value: number) => void;
  onOpacityBChange: (value: number) => void;
  onIntensityChange: (value: number) => void;
  onActiveSlotChange: (slot: 'A' | 'B') => void;
}

export function TextureSelector({
  selectedA,
  selectedB,
  colorA,
  colorB,
  blendMode,
  opacityA,
  opacityB,
  intensity,
  activeSlot,
  onSelectTexture,
  onColorChange,
  onBlendModeChange,
  onOpacityAChange,
  onOpacityBChange,
  onIntensityChange,
  onActiveSlotChange,
}: TextureSelectorProps) {
  const thumbRefs = useRef<Map<TextureType, HTMLCanvasElement>>(new Map());
  const [colorPickerSlot, setColorPickerSlot] = useState<'A' | 'B' | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);

  useEffect(() => {
    TEXTURE_LIST.forEach((tex) => {
      const canvas = thumbRefs.current.get(tex.id);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const colored = getColoredTexture(tex.id, tex.defaultColor);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(colored, 0, 0, canvas.width, canvas.height);
        }
      }
    });
  }, []);

  const handleThumbClick = (type: TextureType, e: React.MouseEvent) => {
    onSelectTexture(type);
    createParticleEffect(e);
  };

  const createParticleEffect = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const activeColor = activeSlot === 'A' ? colorA : colorB;

    for (let i = 0; i < 10; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      particle.style.backgroundColor = activeColor;
      particle.style.setProperty('--tx', `${(Math.random() - 0.5) * 80}px`);
      particle.style.setProperty('--ty', `${(Math.random() - 0.5) * 80}px`);
      document.body.appendChild(particle);
      
      setTimeout(() => {
        particle.remove();
      }, 600);
    }
  };

  const handleSliderMouseDown = (sliderName: string) => {
    setIsDragging(sliderName);
  };

  const handleSliderMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(null);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const currentColor = colorPickerSlot === 'A' ? colorA : colorB;
  const presetColors = [
    '#4a4a4a', '#2d2d2d', '#ffffff',
    '#e74c3c', '#e67e22', '#f1c40f',
    '#2ecc71', '#1abc9c', '#3498db',
    '#9b59b6', '#d4a574', '#5b9bd5',
  ];

  return (
    <div className="texture-selector">
      <div className="selector-header">
        <h3>纹理选择</h3>
      </div>

      <div className="slot-tabs">
        <button
          className={`slot-tab ${activeSlot === 'A' ? 'active' : ''}`}
          onClick={() => onActiveSlotChange('A')}
        >
          <span className="slot-label">A</span>
          <span className="slot-color-dot" style={{ backgroundColor: colorA }} />
        </button>
        <button
          className={`slot-tab ${activeSlot === 'B' ? 'active' : ''}`}
          onClick={() => onActiveSlotChange('B')}
        >
          <span className="slot-label">B</span>
          <span className="slot-color-dot" style={{ backgroundColor: colorB }} />
        </button>
      </div>

      <div className="texture-grid">
        {TEXTURE_LIST.map((tex) => {
          const isSelectedA = selectedA === tex.id;
          const isSelectedB = selectedB === tex.id;
          const isActiveA = isSelectedA && activeSlot === 'A';
          const isActiveB = isSelectedB && activeSlot === 'B';
          const isActive = isActiveA || isActiveB;

          return (
            <div
              key={tex.id}
              className={`texture-thumb ${isActive ? 'selected' : ''}`}
              onClick={(e) => handleThumbClick(tex.id, e)}
            >
              <canvas
                ref={(el) => {
                  if (el) thumbRefs.current.set(tex.id, el);
                }}
                width={80}
                height={80}
                className="thumb-canvas"
              />
              <div className="thumb-info">
                <span className="thumb-name">{tex.name}</span>
                <button
                  className="color-tag"
                  style={{ backgroundColor: tex.defaultColor }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerSlot(activeSlot);
                  }}
                  title="调整颜色"
                />
              </div>
              {(isSelectedA || isSelectedB) && (
                <div className={`selected-badge ${isSelectedA ? 'badge-a' : 'badge-b'}`}>
                  {isSelectedA ? 'A' : 'B'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="controls-section">
        <div className="control-group">
          <label>混合模式</label>
          <select
            className="blend-mode-select"
            value={blendMode}
            onChange={(e) => onBlendModeChange(e.target.value as BlendMode)}
          >
            {BLEND_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>纹理A透明度: {opacityA}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacityA}
            onChange={(e) => onOpacityAChange(Number(e.target.value))}
            onMouseDown={() => handleSliderMouseDown('opacityA')}
            onMouseUp={handleSliderMouseUp}
            className={`slider ${isDragging === 'opacityA' ? 'dragging' : ''}`}
          />
        </div>

        <div className="control-group">
          <label>纹理B透明度: {opacityB}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacityB}
            onChange={(e) => onOpacityBChange(Number(e.target.value))}
            onMouseDown={() => handleSliderMouseDown('opacityB')}
            onMouseUp={handleSliderMouseUp}
            className={`slider ${isDragging === 'opacityB' ? 'dragging' : ''}`}
          />
        </div>

        <div className="control-group">
          <label>混合强度: {intensity}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={intensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
            onMouseDown={() => handleSliderMouseDown('intensity')}
            onMouseUp={handleSliderMouseUp}
            className={`slider ${isDragging === 'intensity' ? 'dragging' : ''}`}
          />
        </div>
      </div>

      {colorPickerSlot && (
        <div className="color-picker-overlay" onClick={() => setColorPickerSlot(null)}>
          <div className="color-picker-popup" onClick={(e) => e.stopPropagation()}>
            <h4>选择颜色</h4>
            <div className="color-preset-grid">
              {presetColors.map((color) => (
                <button
                  key={color}
                  className={`color-preset ${currentColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onColorChange(colorPickerSlot, color);
                  }}
                />
              ))}
            </div>
            <div className="color-input-row">
              <label>自定义:</label>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => onColorChange(colorPickerSlot, e.target.value)}
                className="color-input"
              />
            </div>
            <button className="close-picker" onClick={() => setColorPickerSlot(null)}>
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
