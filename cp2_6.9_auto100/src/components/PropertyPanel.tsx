import React from 'react';
import { BoardCard, CardType } from '../types';

interface PropertyPanelProps {
  card: BoardCard | null;
  allCards: BoardCard[];
  onUpdateCard: (id: string, updates: Partial<BoardCard>) => void;
}

const typeLabels: Record<CardType, string> = {
  image: '图片卡片',
  color: '色块卡片',
  text: '文字卡片',
};

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  card,
  allCards,
  onUpdateCard,
}) => {
  if (!card) return null;

  const handleNumberChange = (
    key: 'x' | 'y' | 'width' | 'height' | 'zIndex',
    value: string,
    decimals = 0
  ) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    let finalValue: number;
    if (decimals > 0) {
      finalValue = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    } else {
      finalValue = Math.round(num);
    }

    if (key === 'zIndex') {
      finalValue = Math.max(-10, Math.min(10, finalValue));
    }

    onUpdateCard(card.id, { [key]: finalValue });
  };

  const moveLayer = (delta: number) => {
    const newZ = Math.max(-10, Math.min(10, card.zIndex + delta));
    onUpdateCard(card.id, { zIndex: newZ });
  };

  const cardIndex = allCards.findIndex((c) => c.id === card.id) + 1;

  return (
    <div className="property-panel">
      <h3>属性面板 · 卡片{cardIndex}</h3>

      <div className="property-row">
        <label>类型</label>
        <input type="text" value={typeLabels[card.type]} disabled readOnly />
      </div>

      <div className="property-row">
        <label>X 坐标</label>
        <input
          type="number"
          value={Math.round(card.x)}
          onChange={(e) => handleNumberChange('x', e.target.value)}
        />
      </div>

      <div className="property-row">
        <label>Y 坐标</label>
        <input
          type="number"
          value={Math.round(card.y)}
          onChange={(e) => handleNumberChange('y', e.target.value)}
        />
      </div>

      <div className="property-row">
        <label>宽度</label>
        <input
          type="number"
          step="0.01"
          value={card.width.toFixed(2)}
          onChange={(e) => handleNumberChange('width', e.target.value, 2)}
        />
      </div>

      <div className="property-row">
        <label>高度</label>
        <input
          type="number"
          step="0.01"
          value={card.height.toFixed(2)}
          onChange={(e) => handleNumberChange('height', e.target.value, 2)}
        />
      </div>

      <div className="property-row">
        <label>层级</label>
        <input
          type="number"
          min="-10"
          max="10"
          value={card.zIndex}
          onChange={(e) => handleNumberChange('zIndex', e.target.value)}
        />
      </div>

      <div className="layer-buttons">
        <button className="layer-btn" onClick={() => moveLayer(1)}>
          ↑ 上移
        </button>
        <button className="layer-btn" onClick={() => moveLayer(-1)}>
          ↓ 下移
        </button>
      </div>
    </div>
  );
};

export default PropertyPanel;
