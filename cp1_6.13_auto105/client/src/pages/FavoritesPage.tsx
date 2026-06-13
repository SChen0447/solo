import React from 'react';
import { useMenu } from '../context/MenuContext';
import { useAuth } from '../context/AuthContext';
import MenuCard from '../components/MenuCard';
import { Season } from '../types';
import './FavoritesPage.scss';

const seasonNames: Record<Season, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
};

const seasonIcons: Record<Season, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

function FavoritesPage() {
  const { favoriteMenus, toggleFavorite } = useMenu();
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="favorites-page">
        <div className="empty-state">
          <div className="empty-icon">🔐</div>
          <h2>请先登录</h2>
          <p>登录后即可收藏和查看您喜爱的菜单</p>
        </div>
      </div>
    );
  }

  if (favoriteMenus.length === 0) {
    return (
      <div className="favorites-page">
        <div className="page-header">
          <h1>我的收藏</h1>
          <span className="favorite-count">共 0 份</span>
        </div>
        <div className="empty-state">
          <div className="empty-icon">💔</div>
          <h2>还没有收藏的菜单</h2>
          <p>在"我的菜单"中点击桃心图标，收藏您喜欢的菜单吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="page-header">
        <h1>我的收藏</h1>
        <span className="favorite-count">共 {favoriteMenus.length} 份</span>
      </div>
      
      <div className="favorites-grid">
        {favoriteMenus.map((savedMenu, menuIndex) => (
          <div 
            key={savedMenu.id} 
            className="favorite-card"
            style={{ animationDelay: `${menuIndex * 0.1}s` }}
          >
            <div className="favorite-card-header">
              <div className="favorite-season">
                <span className="season-icon">{seasonIcons[savedMenu.season as Season] || '🍃'}</span>
                <span className="season-name">
                  {seasonNames[savedMenu.season as Season] || savedMenu.season}
                </span>
              </div>
              <button 
                className="favorite-btn favorited"
                onClick={() => toggleFavorite(savedMenu.id)}
                title="取消收藏"
              >
                ❤️
              </button>
            </div>
            
            <div className="favorite-cuisine">
              <span>菜系：{savedMenu.cuisine}</span>
              <span className="dot">·</span>
              <span>{savedMenu.menu.length} 道菜</span>
            </div>
            
            <div className="favorite-dishes-preview">
              {savedMenu.menu.slice(0, 3).map((dish, idx) => (
                <div key={dish.id} className="dish-preview">
                  <span className="dish-icon">{dish.icon}</span>
                  <span className="dish-name">{dish.name}</span>
                </div>
              ))}
              {savedMenu.menu.length > 3 && (
                <div className="dish-preview more">
                  +{savedMenu.menu.length - 3} 更多
                </div>
              )}
            </div>
            
            <div className="favorite-card-footer">
              <span className="total-calories">
                🔥 总热量：{savedMenu.menu.reduce((sum, d) => sum + d.calories, 0)} 卡
              </span>
            </div>
            
            <div className="favorite-dishes-detail">
              <h4>全部菜品</h4>
              <div className="detail-grid">
                {savedMenu.menu.map(dish => (
                  <div key={dish.id} className="detail-item">
                    <MenuCard dish={dish} showFavorite={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FavoritesPage;
