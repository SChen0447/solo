import React, { useState, useMemo } from 'react';
import { useAppContext, Bouquet } from '../App';

const colorTones: Record<string, string[]> = {
  red: ['#ff4757', '#ff6b81', '#ff9f9f'],
  pink: ['#ff6b9d', '#ffa0c2', '#ffc6d9'],
  white: ['#ffffff', '#f8f9fa', '#e9ecef'],
  yellow: ['#ffd93d', '#ffe066', '#fff3b0'],
  purple: ['#9b59b6', '#a569bd', '#c39bd3'],
};

const colorToneNames: Record<string, string> = {
  red: '红色',
  pink: '粉色',
  white: '白色',
  yellow: '黄色',
  purple: '紫色',
};

const flowerTypes = [
  { id: 'rose', name: '玫瑰', icon: '🌹' },
  { id: 'tulip', name: '郁金香', icon: '🌷' },
  { id: 'lily', name: '百合', icon: '💐' },
  { id: 'sunflower', name: '向日葵', icon: '🌻' },
  { id: 'mixed', name: '混合', icon: '🌸' },
];

const FlowerShop: React.FC = () => {
  const { bouquets, addToCart } = useAppContext();
  const [selectedBouquet, setSelectedBouquet] = useState<Bouquet | null>(null);
  const [colorTone, setColorTone] = useState<string>('pink');
  const [colorShade, setColorShade] = useState<number>(1);
  const [flowerType, setFlowerType] = useState<string>('rose');
  const [message, setMessage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const handleAddToCart = () => {
    if (!selectedBouquet) return;
    addToCart({
      baseId: selectedBouquet.id,
      baseName: selectedBouquet.name,
      colorTone,
      colorShade,
      flowerType,
      message: message.trim(),
      unitPrice: selectedBouquet.price,
      quantity,
    });
  };

  const previewGradient = useMemo(() => {
    if (selectedBouquet) {
      const c = colorTones[colorTone][colorShade];
      return `linear-gradient(135deg, ${c}, #fff5f0)`;
    }
    return '';
  }, [selectedBouquet, colorTone, colorShade]);

  const currentFlowerIcon = flowerTypes.find((f) => f.id === flowerType)?.icon || '🌸';

  if (selectedBouquet) {
    return (
      <div className="customize-page">
        <button className="back-btn" onClick={() => setSelectedBouquet(null)}>
          ← 返回花束列表
        </button>
        <h2 className="page-title">定制花束 - {selectedBouquet.name}</h2>

        <div className="customize-layout">
          <div className="preview-area">
            <div
              className="big-preview"
              style={{
                background: previewGradient,
                border: colorTone === 'white' ? '2px solid #e0e0e0' : 'none',
              }}
            >
              <div style={{ fontSize: 120 }}>{currentFlowerIcon}</div>
              {message && <div className="preview-message">“{message}”</div>}
            </div>
            <div style={{ color: '#888', fontSize: 14 }}>{selectedBouquet.description}</div>
          </div>

          <div className="customize-options">
            <div className="option-group">
              <label>选择主色调</label>
              <div className="color-options">
                {Object.keys(colorTones).map((tone) => (
                  <button
                    key={tone}
                    className={`color-tone-btn ${colorTone === tone ? 'active' : ''}`}
                    onClick={() => {
                      setColorTone(tone);
                      setColorShade(1);
                    }}
                  >
                    {colorToneNames[tone]}
                  </button>
                ))}
              </div>
              <div className="color-shades">
                {colorTones[colorTone].map((c, idx) => (
                  <button
                    key={idx}
                    className={`shade-btn ${colorShade === idx ? 'active' : ''}`}
                    style={{ background: c, border: c === '#ffffff' ? '2px solid #ccc' : undefined }}
                    onClick={() => setColorShade(idx)}
                  />
                ))}
              </div>
            </div>

            <div className="option-group">
              <label>选择花型</label>
              <div className="flower-options">
                {flowerTypes.map((ft) => (
                  <button
                    key={ft.id}
                    className={`flower-btn ${flowerType === ft.id ? 'active' : ''}`}
                    onClick={() => setFlowerType(ft.id)}
                  >
                    <span className="flower-icon">{ft.icon}</span>
                    <span className="flower-name">{ft.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <label>添加祝福语（最多50字）</label>
              <textarea
                className="message-input"
                placeholder="写下您想传达的心意..."
                value={message}
                maxLength={50}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="char-count">{message.length}/50</div>
            </div>

            <div className="option-group">
              <label>数量</label>
              <div className="quantity-row">
                <div className="quantity-controls">
                  <button
                    className="qty-btn"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <span className="qty-display">{quantity}</span>
                  <button className="qty-btn" onClick={() => setQuantity((q) => q + 1)}>
                    +
                  </button>
                </div>
                <span className="price-display">¥{(selectedBouquet.price * quantity).toFixed(0)}</span>
              </div>
            </div>

            <button className="add-cart-btn" onClick={handleAddToCart}>
              加入购物车
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">精选花束</h2>
      <div className="bouquet-grid">
        {bouquets.map((b) => (
          <div key={b.id} className="bouquet-card" onClick={() => setSelectedBouquet(b)}>
            <div
              className="bouquet-thumb"
              style={{ background: `linear-gradient(135deg, ${b.gradientFrom}, ${b.gradientTo})` }}
            >
              💐
            </div>
            <div className="bouquet-info">
              <div className="bouquet-name">{b.name}</div>
              <div className="bouquet-description">{b.description}</div>
              <div className="bouquet-price">¥{b.price}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlowerShop;
