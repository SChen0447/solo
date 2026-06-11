import React, { useState } from 'react';
import { Layer, FONT_FAMILIES } from '../types';

interface ToolbarProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddText: () => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayerUp: (id: string) => void;
  onMoveLayerDown: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  exporting: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddText,
  onDeleteLayer,
  onMoveLayerUp,
  onMoveLayerDown,
  onUpdateLayer,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  exporting,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  const handleDelete = (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      onDeleteLayer(id);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  return (
    <>
      <button className="toolbar-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        <span /> <span /> <span />
      </button>

      <div className={`toolbar ${menuOpen ? 'toolbar-open' : ''}`}>
        <div className="toolbar-header">
          <h2 className="toolbar-title">拼贴画编辑器</h2>
          <button className="toolbar-close-mobile" onClick={() => setMenuOpen(false)}>✕</button>
        </div>

        <div className="toolbar-actions">
          <button className="toolbar-btn toolbar-btn-primary" onClick={onAddText}>
            + 添加文字
          </button>
          <div className="toolbar-btn-group">
            <button className="toolbar-btn" onClick={onUndo} disabled={!canUndo} title="撤销">
              ↶ 撤销
            </button>
            <button className="toolbar-btn" onClick={onRedo} disabled={!canRedo} title="重做">
              ↷ 重做
            </button>
          </div>
          <button className="toolbar-btn toolbar-btn-export" onClick={onExport} disabled={exporting}>
            {exporting ? '导出中...' : '↓ 导出为PNG'}
          </button>
        </div>

        {selectedLayer && selectedLayer.type === 'text' && (
          <div className="toolbar-text-props">
            <div className="toolbar-section-title">文字属性</div>
            <label className="toolbar-label">
              字体
              <select
                className="toolbar-select"
                value={selectedLayer.fontFamily || FONT_FAMILIES[0].name}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { fontFamily: e.target.value })}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.name} value={f.name}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="toolbar-label">
              字号
              <input
                type="range"
                min={12}
                max={72}
                value={selectedLayer.fontSize || 24}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                className="toolbar-range"
              />
              <span className="toolbar-range-value">{selectedLayer.fontSize || 24}px</span>
            </label>
            <label className="toolbar-label">
              颜色
              <div className="toolbar-color-wrapper">
                <div
                  className="toolbar-color-preview"
                  style={{ backgroundColor: selectedLayer.fontColor || '#333333' }}
                  onClick={() => setColorPickerId(colorPickerId === selectedLayer.id ? null : selectedLayer.id)}
                />
                {colorPickerId === selectedLayer.id && (
                  <input
                    type="color"
                    className="toolbar-color-input"
                    value={selectedLayer.fontColor || '#333333'}
                    onChange={(e) => onUpdateLayer(selectedLayer.id, { fontColor: e.target.value })}
                    onBlur={() => setColorPickerId(null)}
                  />
                )}
              </div>
            </label>
          </div>
        )}

        <div className="toolbar-section-title">图层列表</div>
        <div className="toolbar-layer-list">
          {sortedLayers.length === 0 && (
            <div className="toolbar-layer-empty">暂无图层</div>
          )}
          {sortedLayers.map((layer) => (
            <div
              key={layer.id}
              className={`toolbar-layer-item ${selectedLayerId === layer.id ? 'toolbar-layer-item-selected' : ''} ${deletingIds.has(layer.id) ? 'toolbar-layer-item-deleting' : ''}`}
              onClick={() => onSelectLayer(layer.id)}
            >
              <div className="toolbar-layer-thumb">
                {layer.type === 'image' && layer.imageUrl ? (
                  <img src={layer.imageUrl} alt="" draggable={false} />
                ) : (
                  <span className="toolbar-layer-thumb-text">T</span>
                )}
              </div>
              <div className="toolbar-layer-info">
                <div className="toolbar-layer-name">
                  {layer.type === 'image' ? '图片' : (layer.text || '文字').substring(0, 10)}
                </div>
                <div className="toolbar-layer-meta">
                  {layer.type === 'text' ? `${layer.fontFamily}` : `${Math.round(layer.width)}×${Math.round(layer.height)}`}
                </div>
              </div>
              <div className="toolbar-layer-actions">
                <button
                  className="toolbar-layer-btn"
                  onClick={(e) => { e.stopPropagation(); onMoveLayerUp(layer.id); }}
                  title="上移"
                >
                  ▲
                </button>
                <button
                  className="toolbar-layer-btn"
                  onClick={(e) => { e.stopPropagation(); onMoveLayerDown(layer.id); }}
                  title="下移"
                >
                  ▼
                </button>
                <button
                  className="toolbar-layer-btn toolbar-layer-btn-delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(layer.id); }}
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Toolbar;
