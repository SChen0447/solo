import React from 'react';
import type { TemplateConfig, TemplateType, BindingType } from './types';

interface TemplateEditorProps {
  config: TemplateConfig;
  onConfigChange: (partial: Partial<TemplateConfig>) => void;
  collapsed?: boolean;
}

const PAPER_COLORS = [
  { name: '米白', value: '#f9f6f0' },
  { name: '奶油', value: '#fdf5e6' },
  { name: '浅灰', value: '#e8e8e8' },
  { name: '纯白', value: '#ffffff' },
  { name: '牛皮纸', value: '#d2b48c' },
];

const GRID_COLORS = [
  { name: '深灰', value: '#444444' },
  { name: '浅灰', value: '#aaaaaa' },
];

const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
  { value: 'dot', label: '点阵' },
  { value: 'grid', label: '方格' },
  { value: 'line', label: '横线' },
  { value: 'blank', label: '空白' },
];

const BINDING_TYPES: { value: BindingType; label: string; desc: string }[] = [
  { value: 'saddle', label: '骑马订', desc: '中间折痕+针脚' },
  { value: 'perfect', label: '胶装', desc: '左侧书脊阴影' },
  { value: 'coil', label: '线圈', desc: '左侧圆孔' },
];

const TemplateEditor: React.FC<TemplateEditorProps> = ({ config, onConfigChange, collapsed }) => {
  return (
    <div className={`editor-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="editor-panel__inner">
        <h2 className="editor-title">模板参数</h2>

        <div className="editor-section">
          <label className="editor-label">模板类型</label>
          <div className="template-type-group">
            {TEMPLATE_TYPES.map((t) => (
              <button
                key={t.value}
                className={`template-type-btn ${config.templateType === t.value ? 'active' : ''}`}
                onClick={() => onConfigChange({ templateType: t.value })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {!collapsed && (
          <>
            <div className="editor-section">
              <label className="editor-label">线条颜色</label>
              <div className="color-picker-group">
                {GRID_COLORS.map((c) => (
                  <button
                    key={c.value}
                    className={`color-swatch-btn ${config.gridColor === c.value ? 'active' : ''}`}
                    onClick={() => onConfigChange({ gridColor: c.value })}
                    title={c.name}
                  >
                    <span
                      className="color-swatch"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="color-swatch-name">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="editor-section">
              <label className="editor-label">
                网格密度: <strong>{config.gridDensity}mm</strong>
              </label>
              <input
                type="range"
                min={5}
                max={20}
                step={1}
                value={config.gridDensity}
                onChange={(e) => onConfigChange({ gridDensity: Number(e.target.value) })}
                className="density-slider"
              />
              <div className="slider-ticks">
                <span>5mm</span>
                <span>20mm</span>
              </div>
            </div>

            <div className="editor-section">
              <label className="editor-label">纸张底色</label>
              <div className="paper-color-group">
                {PAPER_COLORS.map((p) => (
                  <button
                    key={p.value}
                    className={`paper-color-btn ${config.paperColor === p.value ? 'active' : ''}`}
                    onClick={() => onConfigChange({ paperColor: p.value })}
                    title={p.name}
                  >
                    <span
                      className="paper-swatch"
                      style={{ backgroundColor: p.value }}
                    />
                    <span className="paper-swatch-name">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="editor-section">
          <label className="editor-label">装订方式</label>
          <div className="binding-group">
            {BINDING_TYPES.map((b) => (
              <button
                key={b.value}
                className={`binding-btn ${config.bindingType === b.value ? 'active' : ''}`}
                onClick={() => onConfigChange({ bindingType: b.value })}
              >
                <span className="binding-btn__label">{b.label}</span>
                {!collapsed && <span className="binding-btn__desc">{b.desc}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
