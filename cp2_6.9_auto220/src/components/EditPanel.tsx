import React from 'react';
import { TravelPhoto, PanelTheme } from '../utils/types';
import { Palette } from 'lucide-react';

interface EditPanelProps {
  selectedPhoto: TravelPhoto | null;
  panelTheme: PanelTheme;
  onUpdatePhoto: (id: string, updates: Partial<TravelPhoto>) => void;
  onAutoColor: () => void;
}

export const EditPanel: React.FC<EditPanelProps> = ({
  selectedPhoto,
  panelTheme,
  onUpdatePhoto,
  onAutoColor
}) => {
  if (!selectedPhoto) {
    return (
      <div className="edit-panel empty" style={{ backgroundColor: '#FFF8E7' }}>
        <div className="empty-state">
          <p className="empty-title">选择一张照片开始编辑</p>
          <p className="empty-desc">点击左侧照片区域中的任意照片</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-panel" style={{ backgroundColor: panelTheme.bg }}>
      <div className="panel-header">
        <h3 className="panel-title" style={{ color: panelTheme.text, fontFamily: '"Crimson Text", serif' }}>
          编辑照片信息
        </h3>
        <div
          className="color-preview"
          style={{ backgroundColor: selectedPhoto.dominantColor || '#8B5E3C' }}
        />
      </div>

      <div className="panel-preview">
        <img src={selectedPhoto.src} alt="预览" className="panel-preview-img" />
      </div>

      <div className="panel-form" style={{ borderColor: panelTheme.line }}>
        <div className="form-group">
          <label className="form-label" style={{ color: panelTheme.text }}>文字标签</label>
          <input
            type="text"
            className="form-input"
            maxLength={20}
            value={selectedPhoto.label}
            onChange={(e) => onUpdatePhoto(selectedPhoto.id, { label: e.target.value })}
            placeholder="给这张照片起个名字（最多20字）"
            style={{ fontFamily: '"Crimson Text", serif', fontSize: '16px', borderColor: panelTheme.line }}
          />
          <span className="form-counter">{selectedPhoto.label.length}/20</span>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: panelTheme.text }}>拍摄日期</label>
          <input
            type="date"
            className="form-input"
            value={selectedPhoto.date}
            onChange={(e) => onUpdatePhoto(selectedPhoto.id, { date: e.target.value })}
            style={{ borderColor: panelTheme.line }}
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: panelTheme.text }}>旅行随想</label>
          <textarea
            className="form-textarea"
            maxLength={200}
            rows={4}
            value={selectedPhoto.thought}
            onChange={(e) => onUpdatePhoto(selectedPhoto.id, { thought: e.target.value })}
            placeholder="记录此刻的心情与回忆..."
            style={{ fontSize: '14px', color: '#666', borderColor: panelTheme.line }}
          />
          <span className="form-counter">{selectedPhoto.thought.length}/200</span>
        </div>

        <button
          className="ripple-btn auto-color-btn"
          onClick={onAutoColor}
          style={{ backgroundColor: '#8B5E3C' }}
        >
          <Palette size={18} />
          自动配色
        </button>
      </div>
    </div>
  );
};
