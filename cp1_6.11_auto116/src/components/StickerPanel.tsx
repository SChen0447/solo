import React from 'react';
import { STICKERS, STICKER_CATEGORIES, Sticker, StickerCategory } from '../types';

interface StickerPanelProps {
  onAddSticker: (sticker: Sticker) => void;
}

const StickerPanel: React.FC<StickerPanelProps> = React.memo(({ onAddSticker }) => {
  const getStickersByCategory = (category: StickerCategory) => {
    return STICKERS.filter(s => s.category === category);
  };

  const handleStickerClick = (sticker: Sticker) => {
    onAddSticker(sticker);
  };

  return (
    <div className="sticker-panel">
      <h2 className="panel-title">素材贴纸</h2>
      {STICKER_CATEGORIES.map(category => (
        <div key={category.value} className="sticker-category">
          <h3 className="category-title">{category.label}</h3>
          <div className="sticker-grid">
            {getStickersByCategory(category.value).map(sticker => (
              <div
                key={sticker.id}
                className="sticker-card"
                onClick={() => handleStickerClick(sticker)}
                title={sticker.name}
              >
                <span className="sticker-emoji">{sticker.emoji}</span>
                <span className="sticker-name">{sticker.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

StickerPanel.displayName = 'StickerPanel';

export default StickerPanel;
