import React, { useState } from 'react';
import { CoffeeItem, SNACK_OPTIONS, SEASON_GRADIENTS, SEASON_LABELS } from '../types';
import { calculateFloatingPrice } from '../utils/dataManager';

interface MenuCardProps {
  item: CoffeeItem;
  isPreview?: boolean;
  priceFloat: number;
  onPriceChange: (id: string, price: number) => void;
  onSnackChange: (id: string, snack: string) => void;
  onClick?: (id: string) => void;
  showSaveIndicator?: boolean;
}

const MenuCard: React.FC<MenuCardProps> = ({
  item,
  isPreview = false,
  priceFloat,
  onPriceChange,
  onSnackChange,
  onClick,
  showSaveIndicator = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const floatingPrice = calculateFloatingPrice(item.price, priceFloat);
  const hasFloat = priceFloat !== 0;

  const cardStyle: React.CSSProperties = {
    background: SEASON_GRADIENTS[item.season],
    height: '120px',
    borderRadius: '12px',
    padding: '16px',
    position: 'relative',
    transform: isHovered && !isPreview ? 'translateY(-4px)' : 'translateY(0)',
    transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
    boxShadow: isHovered && !isPreview ? '0 8px 24px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
    cursor: isPreview ? 'default' : 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflow: 'hidden',
  };

  const saveIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    fontSize: '18px',
    color: '#4caf50',
    fontWeight: 'bold',
    animation: 'fadeInCheck 1s ease-out forwards',
    zIndex: 10,
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isPreview && onClick && onClick(item.id)}
    >
      {showSaveIndicator && <div style={saveIndicatorStyle}>✓</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#3e2723',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.name}
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(109, 76, 65, 0.15)',
                color: '#6d4c41',
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {SEASON_LABELS[item.season]}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {item.ingredients.slice(0, isPreview ? 3 : 4).map((ingredient, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  color: '#5d4037',
                }}
              >
                {ingredient}
              </span>
            ))}
            {isPreview && item.ingredients.length > 3 && (
              <span style={{ fontSize: '11px', color: '#8d6e63' }}>+{item.ingredients.length - 3}</span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {!isPreview ? (
            <input
              type="number"
              value={item.price}
              step="0.5"
              min="5"
              max="68"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onPriceChange(item.id, parseFloat(e.target.value) || 0)}
              style={{
                width: '70px',
                padding: '4px 8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#e53935',
                backgroundColor: 'rgba(255,255,255,0.85)',
                border: '1px solid #d7ccc8',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            />
          ) : (
            <div>
              {hasFloat ? (
                <div style={{ fontSize: '12px', color: '#e53935', lineHeight: 1.2 }}>
                  <span style={{ textDecoration: 'line-through', color: '#8d6e63', fontSize: '11px' }}>
                    ¥{item.price.toFixed(2)}
                  </span>
                  <br />
                  <span style={{ fontWeight: 600 }}>¥{floatingPrice.toFixed(2)}</span>
                </div>
              ) : (
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#e53935' }}>¥{item.price.toFixed(2)}</span>
              )}
            </div>
          )}
          {hasFloat && !isPreview && (
            <div style={{ fontSize: '12px', color: '#e53935', marginTop: '2px' }}>
              原价¥{item.price.toFixed(2)} → 现价¥{floatingPrice.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#5d4037', flexShrink: 0 }}>搭配小食：</span>
        {!isPreview ? (
          <select
            value={item.pairedSnack}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onSnackChange(item.id, e.target.value)}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: 'rgba(255,255,255,0.85)',
              border: '1px solid #d7ccc8',
              borderRadius: '6px',
              color: '#3e2723',
              minWidth: 0,
            }}
          >
            {SNACK_OPTIONS.map((snack) => (
              <option key={snack} value={snack}>
                {snack}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: '12px', color: '#6d4c41', fontWeight: 500 }}>{item.pairedSnack}</span>
        )}
      </div>
    </div>
  );
};

export default MenuCard;
