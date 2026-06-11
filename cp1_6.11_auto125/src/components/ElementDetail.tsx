import React, { useEffect, useCallback } from 'react';
import { getCategoryColor, type Element } from '../data/elements';
import './ElementDetail.css';

interface ElementDetailProps {
  element: Element | null;
  onClose: () => void;
}

const ElementDetail: React.FC<ElementDetailProps> = ({ element, onClose }) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (element) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [element, handleKeyDown]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!element) {
    return null;
  }

  const categoryColor = getCategoryColor(element.category);

  return (
    <div className="detail-overlay" onClick={handleOverlayClick}>
      <div
        className="detail-panel"
        style={{ borderLeftColor: categoryColor }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <button
          className="close-button"
          onClick={onClose}
          aria-label="关闭详情面板"
        >
          <span className="close-icon" />
        </button>

        <div className="detail-header" style={{ backgroundColor: `${categoryColor}15` }}>
          <div className="detail-atomic-number">{element.atomicNumber}</div>
          <div className="detail-symbol" style={{ color: categoryColor }}>
            {element.symbol}
          </div>
          <div className="detail-name">{element.name}</div>
          <div className="detail-name-en">{element.nameEn}</div>
        </div>

        <div className="detail-category">
          <span className="category-label" style={{ backgroundColor: categoryColor }}>
            {element.category}
          </span>
        </div>

        <div className="detail-info-list">
          <div className="info-item">
            <span className="info-label">相对原子质量</span>
            <span className="info-value">{element.atomicMass.toFixed(3)}</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">周期</span>
            <span className="info-value">第 {element.period} 周期</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">族</span>
            <span className="info-value">第 {element.group} 族</span>
          </div>
          
          <div className="info-item">
            <span className="info-label">电子排布</span>
            <span className="info-value electron-config">
              {element.electronConfiguration}
            </span>
          </div>
        </div>

        <div className="detail-footer">
          <div className="footer-decoration" style={{ backgroundColor: categoryColor }} />
        </div>
      </div>
    </div>
  );
};

export default ElementDetail;
