import React, { memo, useCallback } from 'react';
import { StyleInfo, StyleId } from '../types';

interface StyleGalleryProps {
  styles: StyleInfo[];
  selectedStyle: StyleId | null;
  isProcessing: boolean;
  progress: number;
  onStyleSelect: (styleId: StyleId) => void;
  disabled: boolean;
}

const warmColors = [
  '#ff9a56', '#ff6b9d', '#ffb347', '#ff7f50',
  '#ffa07a', '#f08080', '#e9967a', '#fa8072',
];

function getRandomColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % warmColors.length;
  return warmColors[index];
}

const StyleGallery: React.FC<StyleGalleryProps> = ({
  styles,
  selectedStyle,
  isProcessing,
  progress,
  onStyleSelect,
  disabled,
}) => {
  const handleClick = useCallback(
    (styleId: StyleId) => {
      if (disabled || isProcessing) return;
      onStyleSelect(styleId);
    },
    [disabled, isProcessing, onStyleSelect]
  );

  return (
    <div className="style-gallery-section">
      <h3 className="section-title">选择风格</h3>
      <div className="style-grid">
        {styles.map((style) => {
          const isSelected = selectedStyle === style.id;
          const bgColor = getRandomColor(style.id);
          const bgColor2 = getRandomColor(style.id + '_2');

          return (
            <div
              key={style.id}
              className={`style-card ${isSelected ? 'selected' : ''} ${
                isProcessing && !isSelected ? 'dimmed' : ''
              } ${disabled ? 'disabled' : ''}`}
              style={{
                background: `linear-gradient(135deg, ${bgColor}, ${bgColor2})`,
              }}
              onClick={() => handleClick(style.id)}
            >
              <div className="style-card-inner">
                <div className="style-avatar-placeholder">
                  <span className="style-icon">{getStyleIcon(style.id)}</span>
                </div>
                <div className="style-name-container">
                  <span className="style-name">{style.name}</span>
                </div>
              </div>
              {isSelected && isProcessing && (
                <div className="style-progress-overlay">
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${style.color}, ${bgColor})`,
                      }}
                    />
                  </div>
                  <span className="progress-text">生成中 {Math.round(progress)}%</span>
                </div>
              )}
              {isSelected && !isProcessing && (
                <div className="style-selected-glow" style={{ boxShadow: `0 0 20px ${style.color}` }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getStyleIcon(styleId: StyleId): string {
  const icons: Record<StyleId, string> = {
    watercolor: '🎨',
    sketch: '✏️',
    pixel: '👾',
    oil: '🖼️',
  };
  return icons[styleId];
}

export default memo(StyleGallery);
