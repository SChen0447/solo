import React, { useState } from 'react';
import { useMenu } from '../context/MenuContext';
import { useAuth } from '../context/AuthContext';
import MenuCard from '../components/MenuCard';
import { Season } from '../types';
import './MyMenusPage.scss';

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

function MyMenusPage() {
  const { savedMenus, toggleFavorite, deleteMenu } = useMenu();
  const { isLoggedIn } = useAuth();
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleMenuExpand = (menuId: string) => {
    setExpandedMenuId(prev => prev === menuId ? null : menuId);
  };

  if (!isLoggedIn) {
    return (
      <div className="my-menus-page">
        <div className="empty-state">
          <div className="empty-icon">🔐</div>
          <h2>请先登录</h2>
          <p>登录后即可保存和查看您的历史菜单</p>
        </div>
      </div>
    );
  }

  if (savedMenus.length === 0) {
    return (
      <div className="my-menus-page">
        <div className="page-header">
          <h1>我的菜单</h1>
          <span className="menu-count">共 0 份</span>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <h2>还没有菜单记录</h2>
          <p>去首页上传食物照片，生成您的第一份时令菜单吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-menus-page">
      <div className="page-header">
        <h1>我的菜单</h1>
        <span className="menu-count">共 {savedMenus.length} 份</span>
      </div>
      
      <div className="menus-list">
        {savedMenus.map((savedMenu, menuIndex) => (
          <div 
            key={savedMenu.id} 
            className="menu-group"
            style={{ animationDelay: `${menuIndex * 0.1}s` }}
          >
            <div 
              className="menu-group-header"
              onClick={() => toggleMenuExpand(savedMenu.id)}
            >
              <div className="menu-group-info">
                <div className="menu-season">
                  <span className="season-icon">{seasonIcons[savedMenu.season as Season] || '🍃'}</span>
                  <span className="season-name">
                    {seasonNames[savedMenu.season as Season] || savedMenu.season}
                  </span>
                </div>
                <div className="menu-meta">
                  <span>{savedMenu.menu.length} 道菜</span>
                  <span className="dot">·</span>
                  <span>{savedMenu.cuisine}</span>
                </div>
                <div className="menu-date">
                  {formatDate(savedMenu.createdAt)}
                </div>
              </div>
              
              <div className="menu-group-actions">
                <button 
                  className={`favorite-btn ${savedMenu.isFavorite ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(savedMenu.id);
                  }}
                >
                  {savedMenu.isFavorite ? '❤️' : '🤍'}
                </button>
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这份菜单吗？')) {
                      deleteMenu(savedMenu.id);
                    }
                  }}
                >
                  🗑️
                </button>
                <span className="expand-arrow">
                  {expandedMenuId === savedMenu.id ? '▲' : '▼'}
                </span>
              </div>
            </div>
            
            {expandedMenuId === savedMenu.id && (
              <div className="menu-group-content">
                {savedMenu.ingredients && savedMenu.ingredients.length > 0 && (
                  <div className="ingredients-preview">
                    <span className="ingredients-label">识别食材：</span>
                    <div className="ingredient-chips">
                      {savedMenu.ingredients.map((ing, idx) => (
                        <span key={idx} className="ingredient-chip">
                          {ing.icon} {ing.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="menu-cards-grid">
                  {savedMenu.menu.map((dish, dishIndex) => (
                    <div 
                      key={dish.id} 
                      className="menu-card-wrapper"
                      style={{ animationDelay: `${dishIndex * 0.08}s` }}
                    >
                      <MenuCard 
                        dish={dish}
                        showFavorite={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyMenusPage;
