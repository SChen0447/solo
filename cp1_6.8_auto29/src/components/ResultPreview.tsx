import React, { useCallback, useRef, useState, memo } from 'react';
import { StyleId } from '../types';
import confetti from 'canvas-confetti';

interface ResultPreviewProps {
  resultImage: string | null;
  styleId: StyleId | null;
  styleColor: string;
  likes: number;
  isFavorited: boolean;
  isProcessing: boolean;
  onDownload: () => void;
  onFavorite: () => void;
  onLike: () => void;
}

const ResultPreview: React.FC<ResultPreviewProps> = ({
  resultImage,
  styleId,
  styleColor,
  likes,
  isFavorited,
  isProcessing,
  onDownload,
  onFavorite,
  onLike,
}) => {
  const [likeAnimating, setLikeAnimating] = useState(false);
  const likeBtnRef = useRef<HTMLButtonElement>(null);

  const handleLike = useCallback(() => {
    if (likeAnimating) return;
    onLike();
    setLikeAnimating(true);

    if (likeBtnRef.current) {
      const rect = likeBtnRef.current.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 12,
        spread: 60,
        origin: { x, y },
        colors: [styleColor || '#ffd700', '#ffffff', styleColor || '#ff6b9d'],
        scalar: 0.6,
        shapes: ['star', 'circle'],
      });
    }

    setTimeout(() => setLikeAnimating(false), 400);
  }, [onLike, likeAnimating, styleColor]);

  const handleFavorite = useCallback(() => {
    onFavorite();
    if (!isFavorited) {
      confetti({
        particleCount: 30,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff6b9d', '#ff9a56', '#ffd700', '#ffffff'],
        scalar: 0.8,
      });
    }
  }, [onFavorite, isFavorited]);

  if (!resultImage && !isProcessing) {
    return (
      <div className="result-preview empty">
        <div className="empty-placeholder">
          <p className="empty-title">效果预览</p>
          <p className="empty-hint">上传图片并选择风格，生成专属头像</p>
        </div>
      </div>
    );
  }

  return (
    <div className="result-preview">
      <h3 className="section-title">效果预览</h3>

      <div className="result-image-container">
        {isProcessing ? (
          <div className="processing-placeholder">
            <div className="processing-spinner" style={{ borderTopColor: styleColor }} />
            <p className="processing-text">正在生成中...</p>
          </div>
        ) : (
          <img
            src={resultImage || ''}
            alt="风格化结果"
            className={`result-image ${resultImage ? 'fade-in' : ''}`}
          />
        )}
      </div>

      {resultImage && !isProcessing && (
        <div className="result-actions">
          <button
            className="action-btn download-btn"
            onClick={onDownload}
            title="下载"
          >
            <span className="action-icon">⬇️</span>
          </button>

          <button
            className={`action-btn favorite-btn ${isFavorited ? 'favorited' : ''}`}
            onClick={handleFavorite}
            title="收藏"
          >
            <span className="action-icon">{isFavorited ? '❤️' : '🤍'}</span>
          </button>

          <button
            ref={likeBtnRef}
            className={`action-btn like-btn ${likeAnimating ? 'animating' : ''}`}
            onClick={handleLike}
            title="点赞"
          >
            <span className="action-icon">👍</span>
            <span className="like-count">{likes}</span>
          </button>
        </div>
      )}

      {styleId && (
        <div className="result-style-label" style={{ background: styleColor }}>
          {getStyleName(styleId)} 风格
        </div>
      )}
    </div>
  );
};

function getStyleName(styleId: StyleId): string {
  const names: Record<StyleId, string> = {
    watercolor: '水彩',
    sketch: '素描',
    pixel: '像素风',
    oil: '油画',
  };
  return names[styleId] || styleId;
}

export default memo(ResultPreview);
