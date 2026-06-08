import React, { memo, useCallback } from 'react';
import { FavoriteItem, StyleInfo } from '../types';

interface FavoritesSidebarProps {
  favorites: FavoriteItem[];
  styles: StyleInfo[];
  isOpen: boolean;
  onToggle: () => void;
  onRemove: (id: string) => void;
  onSelect: (item: FavoriteItem) => void;
}

const FavoritesSidebar: React.FC<FavoritesSidebarProps> = ({
  favorites,
  styles,
  isOpen,
  onToggle,
  onRemove,
  onSelect,
}) => {
  const getStyleInfo = useCallback(
    (styleId: string) => styles.find((s) => s.id === styleId),
    [styles]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onRemove(id);
    },
    [onRemove]
  );

  return (
    <>
      <button
        className={`favorites-toggle ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
      >
        <span className="toggle-icon">❤️</span>
        <span className="toggle-count">{favorites.length}</span>
      </button>

      <div className={`favorites-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3 className="sidebar-title">我的收藏</h3>
          <button className="sidebar-close" onClick={onToggle}>
            ✕
          </button>
        </div>

        <div className="favorites-list">
          {favorites.length === 0 ? (
            <div className="favorites-empty">
              <p>暂无收藏</p>
              <p className="empty-hint">生成喜欢的头像后点击收藏吧</p>
            </div>
          ) : (
            favorites.map((item) => {
              const styleInfo = getStyleInfo(item.styleId);
              return (
                <div
                  key={item.id}
                  className="favorite-item"
                  onClick={() => onSelect(item)}
                >
                  <div
                    className="favorite-thumb"
                    style={{ borderColor: styleInfo?.color || '#666' }}
                  >
                    <img src={item.imageUrl} alt={styleInfo?.name} />
                    <div
                      className="favorite-style-badge"
                      style={{ background: styleInfo?.gradient || '#666' }}
                    >
                      {styleInfo?.name}
                    </div>
                  </div>
                  <div className="favorite-info">
                    <p className="favorite-style-name">{styleInfo?.name}</p>
                    <p className="favorite-date">
                      {new Date(item.timestamp).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <button
                    className="favorite-delete"
                    onClick={(e) => handleRemove(e, item.id)}
                  >
                    <span className="delete-icon">🗑️</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default memo(FavoritesSidebar);
