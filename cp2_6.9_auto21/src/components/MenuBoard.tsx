import React, { useState, useEffect, useMemo } from 'react';
import { mockDataService, categories } from '../mockData';
import type { MenuItemWithHistory, Category } from '../types';
import PopularityChart from './PopularityChart';
import OrderWaitBadge from './OrderWaitBadge';

const MenuBoard: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItemWithHistory[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('咖啡');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    setMenuItems(mockDataService.getMenu());
    const unsubscribe = mockDataService.subscribe((items) => {
      setMenuItems(items);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (menuItems.length > 0 && !selectedId) {
      const firstInCategory = menuItems.find((m) => m.category === activeCategory);
      if (firstInCategory) {
        setSelectedId(firstInCategory.id);
      }
    }
  }, [menuItems, activeCategory, selectedId]);

  const filteredItems = useMemo(
    () => menuItems.filter((item) => item.category === activeCategory),
    [menuItems, activeCategory]
  );

  const selectedItem = useMemo(
    () => menuItems.find((m) => m.id === selectedId) || null,
    [menuItems, selectedId]
  );

  const handleCategoryChange = (cat: Category) => {
    if (cat === activeCategory) return;
    setFadeState('out');
    setTimeout(() => {
      setActiveCategory(cat);
      const firstItem = menuItems.find((m) => m.category === cat);
      if (firstItem) setSelectedId(firstItem.id);
      setFadeState('in');
    }, 200);
  };

  return (
    <div className="menu-board">
      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="board-content">
        <div className="menu-list-panel">
          <div className="panel-title">{activeCategory}</div>
          <div className="menu-list">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`menu-item ${selectedId === item.id ? 'selected' : ''} ${
                  item.waitTime > 20 ? 'high-wait' : ''
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="menu-item-content">
                  <div className="menu-item-name">{item.name}</div>
                  <div className="menu-item-price">¥{item.price}</div>
                </div>
                <OrderWaitBadge minutes={item.waitTime} size="sm" />
              </div>
            ))}
          </div>
        </div>

        <div
          className="detail-panel"
          style={{
            opacity: fadeState === 'in' ? 1 : 0,
            transition: 'opacity 300ms ease',
          }}
        >
          {selectedItem && (
            <>
              <div className="detail-header">
                <h1 className="detail-name">{selectedItem.name}</h1>
                <div className="detail-price">¥{selectedItem.price}</div>
              </div>
              <div className="detail-desc">{selectedItem.description}</div>

              <div className="wait-section">
                <span className="wait-label">当前平均等待时间</span>
                <OrderWaitBadge minutes={selectedItem.waitTime} />
                <span className="wait-unit">分钟</span>
              </div>

              <div className="chart-section">
                <div className="chart-title">过去 24 小时订单热度</div>
                <PopularityChart data={selectedItem.orderHistory} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuBoard;
