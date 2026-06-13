import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Dish } from '../types';
import './MenuCard.scss';

interface MenuCardProps {
  dish: Dish;
  showFavorite?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
}

function MenuCard({ 
  dish, 
  showFavorite = false, 
  isFavorite = false,
  onToggleFavorite,
  onDelete 
}: MenuCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    
    if (!cardRef.current) return;
    
    setIsSharing(true);
    
    try {
      const originalExpanded = isExpanded;
      if (!isExpanded) {
        setIsExpanded(true);
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#FDF8F0',
        scale: 2,
        useCORS: true,
      });
      
      const imageUrl = canvas.toDataURL('image/png');
      
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>分享 - ${dish.name}</title>
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  background: #FDF8F0;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  font-family: 'Inter', sans-serif;
                }
                h2 {
                  color: #6B8E23;
                  margin-bottom: 16px;
                  font-family: 'Playfair Display', serif;
                }
                img {
                  max-width: 100%;
                  border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                p {
                  color: #6B6B6B;
                  margin-top: 16px;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <h2>🍽️ ${dish.name}</h2>
              <img src="${imageUrl}" alt="${dish.name}" />
              <p>右键点击图片，选择"图片另存为"即可保存分享</p>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
      
      if (!originalExpanded) {
        setIsExpanded(false);
      }
    } catch (error) {
      console.error('生成分享图片失败:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div 
      ref={cardRef}
      className={`menu-card ${isExpanded ? 'expanded' : ''} ${isSharing ? 'sharing' : ''}`}
      onClick={handleCardClick}
    >
      <div className="card-header">
        <div className="dish-icon">{dish.icon}</div>
        <div className="dish-info">
          <h3 className="dish-name">{dish.name}</h3>
          <span className="dish-description">{dish.description}</span>
        </div>
        {showFavorite && (
          <button 
            className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
            onClick={handleFavoriteClick}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      
      <div className="card-meta">
        <span className="meta-item">
          <span className="meta-icon">⏱️</span>
          <span>{dish.cookTime} 分钟</span>
        </span>
        <span className="meta-item">
          <span className="meta-icon">🔥</span>
          <span>{dish.calories} 卡</span>
        </span>
        <span className="meta-item">
          <span className="meta-icon">📊</span>
          <span>{dish.difficulty}</span>
        </span>
        <span className="meta-item season-tag">
          <span className="meta-icon">🍃</span>
          <span>{dish.seasonTag}季时令</span>
        </span>
      </div>
      
      {isExpanded && (
        <div className="card-details">
          <div className="details-section">
            <h4>烹饪步骤</h4>
            <ol className="steps-list">
              {dish.steps.map((step, index) => (
                <li key={index} className="step-item">
                  <span className="step-number">{index + 1}</span>
                  <span className="step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      
      <div className="card-footer">
        <button 
          className={`share-btn ${isAnimating ? 'animate' : ''}`}
          onClick={handleShare}
          disabled={isSharing}
        >
          <span className="share-icon">📤</span>
          <span>{isSharing ? '生成中...' : '分享'}</span>
        </button>
        
        {onDelete && (
          <button 
            className="delete-btn"
            onClick={handleDeleteClick}
          >
            🗑️ 删除
          </button>
        )}
        
        <span className="expand-hint">
          {isExpanded ? '点击收起 ▲' : '点击展开详情 ▼'}
        </span>
      </div>
    </div>
  );
}

export default MenuCard;
