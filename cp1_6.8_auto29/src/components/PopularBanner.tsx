import React, { useState, useEffect, memo } from 'react';
import { LikeStats, StyleInfo } from '../types';

interface PopularBannerProps {
  stats: LikeStats[];
  styles: StyleInfo[];
}

const PopularBanner: React.FC<PopularBannerProps> = ({ stats, styles }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (stats.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stats.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [stats.length]);

  const topThree = stats.slice(0, 3);

  if (topThree.length === 0) return null;

  const getStyleInfo = (styleId: string) =>
    styles.find((s) => s.id === styleId);

  return (
    <div className="popular-banner">
      <div className="banner-gradient" />
      <div className="banner-content">
        <div className="banner-title">
          <span className="crown-icon">👑</span>
          最受欢迎风格
        </div>
        <div className="popular-scroll-container">
          <div
            className="popular-track"
            style={{
              transform: `translateX(-${currentIndex * (100 / 3)}%)`,
            }}
          >
            {topThree.map((item, index) => {
              const styleInfo = getStyleInfo(item.style);
              return (
                <div key={item.style} className="popular-item">
                  <div className="popular-rank">
                    <span className={`rank-badge rank-${index + 1}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div
                    className="popular-avatar"
                    style={{ background: styleInfo?.gradient }}
                  >
                    <span className="popular-emoji">
                      {getStyleEmoji(item.style)}
                    </span>
                  </div>
                  <div className="popular-info">
                    <span className="popular-name">{styleInfo?.name}</span>
                    <span className="popular-likes">
                      👍 {item.likes}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="banner-dots">
          {topThree.map((_, index) => (
            <span
              key={index}
              className={`banner-dot ${index === currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

function getStyleEmoji(styleId: string): string {
  const emojis: Record<string, string> = {
    watercolor: '🎨',
    sketch: '✏️',
    pixel: '👾',
    oil: '🖼️',
  };
  return emojis[styleId] || '✨';
}

export default memo(PopularBanner);
