import React, { useEffect, useRef } from 'react';
import { CardData, drawCard, getPresetElements } from '../utils/cardEngine';

interface ControlPanelProps {
  transparency: number;
  scale: number;
  spacing: number;
  keyword: string;
  mobileOpen: boolean;
  onTransparencyChange: (v: number) => void;
  onScaleChange: (v: number) => void;
  onSpacingChange: (v: number) => void;
  onKeywordChange: (v: string) => void;
  onGenerate: () => void;
  onAddPreset: (preset: { gradient: any; pattern: any }) => void;
  onCloseMobile: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  transparency,
  scale,
  spacing,
  keyword,
  mobileOpen,
  onTransparencyChange,
  onScaleChange,
  onSpacingChange,
  onKeywordChange,
  onGenerate,
  onAddPreset,
  onCloseMobile,
}) => {
  return (
    <>
      <div className={`mobile-overlay ${mobileOpen ? 'active' : ''}`} onClick={onCloseMobile} />
      <aside className={`control-panel ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="panel-section">
          <div className="panel-section-title">灵感输入</div>
          <input
            className="keyword-input"
            type="text"
            placeholder="输入关键词，如：温暖、清新、梦幻..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
          />
          <button className="generate-btn" onClick={onGenerate}>
            ✨ 生成灵感卡片
          </button>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">视觉调整</div>

          <div className="slider-group">
            <div className="slider-label">
              <span>透明度</span>
              <span className="slider-value">{transparency.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={transparency}
              onChange={(e) => onTransparencyChange(parseFloat(e.target.value))}
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>缩放</span>
              <span className="slider-value">{scale.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={scale}
              onChange={(e) => onScaleChange(parseFloat(e.target.value))}
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>间距</span>
              <span className="slider-value">{spacing}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={spacing}
              onChange={(e) => onSpacingChange(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">使用提示</div>
          <div style={{ color: '#a09ab0', fontSize: '12px', lineHeight: 1.7 }}>
            · 拖拽卡片可自由移动
            <br />
            · 靠近卡片可自动合并
            <br />
            · 点击卡片选中后调节滑块
            <br />
            · 使用工具栏保存或导出
          </div>
        </div>
      </aside>
    </>
  );
};

interface PresetModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (preset: { gradient: any; pattern: any }) => void;
}

export const PresetModal: React.FC<PresetModalProps> = ({ open, onClose, onSelect }) => {
  const presets = getPresetElements();
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    presets.forEach((p, i) => {
      const canvas = canvasRefs.current[i];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const size = 60;
      canvas.width = size * 2;
      canvas.height = size * 2;
      ctx.scale(2, 2);
      const mockCard: CardData = {
        id: p.id,
        x: 0,
        y: 0,
        width: size,
        height: size,
        gradient: p.gradient,
        pattern: p.pattern,
        text: '',
        opacity: 1,
        scale: 1,
        selected: false,
      };
      drawCard(ctx, mockCard, size, size);
    });
  }, [open]);

  return (
    <div className={`modal-overlay ${open ? 'active' : ''}`} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">选择预设元素</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="preset-grid">
          {presets.map((p, i) => (
            <div
              key={p.id}
              className="preset-item"
              onClick={() => {
                onSelect({ gradient: p.gradient, pattern: p.pattern });
                onClose();
              }}
            >
              <canvas ref={(el) => (canvasRefs.current[i] = el)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
