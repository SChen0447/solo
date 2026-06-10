import React, { useState } from 'react';
import { STICKER_CATEGORIES } from '../utils/helpers';

interface StickerPanelProps {
  onSelect: (category: string, type: string) => void;
  onClose: () => void;
}

const StickerPanel: React.FC<StickerPanelProps> = ({ onSelect, onClose }) => {
  const handleClick = (category: string, type: string) => {
    onSelect(category, type);
  };

  return (
    <div className="sticker-panel-overlay">
      <button className="close-panel" onClick={onClose} title="关闭">✕</button>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#5a4a3a' }}>
        🎨 贴纸面板
      </h3>
      {Object.entries(STICKER_CATEGORIES).map(([category, stickers]) => (
        <div key={category} className="sticker-category">
          <div className="sticker-category-title">{category}</div>
          <div className="sticker-grid">
            {stickers.map((sticker, idx) => (
              <div
                key={idx}
                className="sticker-item"
                onClick={() => handleClick(category, sticker)}
                title={sticker}
              >
                {sticker}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StickerPanel;
