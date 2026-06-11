import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  MenuData,
  Drink,
  loadFavorites,
  toggleFavorite as toggleFav,
  loadMenuData,
} from '../data/menuStore';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '100vh',
    background: '#F5E6D3',
    position: 'relative',
  },
  header: {
    padding: '20px 24px 0',
    position: 'sticky',
    top: 0,
    background: '#F5E6D3',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: '#4A2C2A',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    width: '100%',
    padding: '12px 16px 12px 40px',
    borderRadius: 12,
    border: '1px solid rgba(200,162,122,0.4)',
    background: '#fff',
    fontSize: 14,
    color: '#4A2C2A',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 15,
    color: '#8B6F5E',
    pointerEvents: 'none',
  },
  tabsWrapper: {
    position: 'relative',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    display: 'flex',
    gap: 0,
    paddingBottom: 2,
  },
  tab: {
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    color: '#8B6F5E',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: 'none',
    border: 'none',
    position: 'relative',
    transition: 'color 0.2s',
  },
  tabActive: {
    color: '#4A2C2A',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    background: '#E8B84B',
    borderRadius: 2,
    transition: 'left 0.3s ease-in-out, width 0.3s ease-in-out',
  },
  content: {
    flex: 1,
    padding: '20px 24px 80px',
    overflowY: 'auto',
  },
  drinkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20,
  },
  drinkCard: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(74,44,42,0.1)',
    overflow: 'hidden',
    position: 'relative',
    transition: 'box-shadow 0.3s, transform 0.3s, max-height 0.4s, opacity 0.4s, margin 0.4s',
    overflowWrap: 'break-word',
  },
  drinkCardHidden: {
    maxHeight: 0,
    opacity: 0,
    margin: 0,
    overflow: 'hidden',
    padding: 0,
    boxShadow: 'none',
  },
  drinkCardHover: {
    boxShadow: '0 8px 24px rgba(74,44,42,0.18)',
    transform: 'translateY(-4px)',
  },
  drinkCardNew: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: '#E8B84B',
    color: '#4A2C2A',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
    zIndex: 2,
  },
  drinkCardImage: {
    width: '100%',
    height: 150,
    objectFit: 'cover',
    display: 'block',
    background: '#e0d6cc',
  },
  drinkCardPlaceholder: {
    width: '100%',
    height: 150,
    background: '#e0d6cc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
  },
  drinkCardBody: {
    padding: '12px 14px',
  },
  drinkCardName: {
    fontSize: 15,
    fontWeight: 700,
    color: '#4A2C2A',
    marginBottom: 4,
  },
  drinkCardPrice: {
    fontSize: 14,
    fontWeight: 600,
    color: '#E8B84B',
    marginBottom: 4,
  },
  drinkCardDesc: {
    fontSize: 12,
    color: '#8B6F5E',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    background: 'rgba(255,255,255,0.85)',
    border: 'none',
    borderRadius: '50%',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 16,
    zIndex: 3,
    transition: 'transform 0.15s',
    backdropFilter: 'blur(2px)',
  },
  heartActive: {
    color: '#e74c3c',
  },
  heartInactive: {
    color: '#bbb',
  },
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#4A2C2A',
    color: '#F5E6D3',
    padding: '14px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    zIndex: 20,
    transition: 'transform 0.3s',
  },
  favPanel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    maxHeight: '50vh',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 -4px 20px rgba(74,44,42,0.2)',
    zIndex: 30,
    overflowY: 'auto',
    animation: 'slideUp 0.3s ease-out',
  },
  favPanelHeader: {
    padding: '18px 20px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #eee',
    position: 'sticky',
    top: 0,
    background: '#fff',
    borderRadius: '16px 16px 0 0',
    zIndex: 1,
  },
  favPanelTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#4A2C2A',
  },
  favPanelClose: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#8B6F5E',
    padding: 4,
  },
  favItem: {
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f5f0eb',
  },
  favItemRemoving: {
    animation: 'fadeOut 0.3s ease-out forwards',
  },
  favItemName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#4A2C2A',
  },
  favRemoveBtn: {
    background: 'rgba(232,116,116,0.1)',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 12,
    color: '#c0392b',
    transition: 'background 0.2s',
  },
  favOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(74,44,42,0.3)',
    zIndex: 25,
  },
  updateBanner: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    background: '#E8B84B',
    color: '#4A2C2A',
    textAlign: 'center',
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 50,
    animation: 'fadeInDown 0.3s ease-out',
  },
  highlight: {
    background: '#fff3a8',
    borderRadius: 2,
    padding: '0 1px',
  },
};

interface CustomerMenuProps {
  data: MenuData;
  onDataChange: (data: MenuData) => void;
}

export default function CustomerMenu({ data, onDataChange }: CustomerMenuProps) {
  const [activeTab, setActiveTab] = useState<string>(
    data.categories.length > 0 ? data.categories[0].id : ''
  );
  const [favorites, setFavorites] = useState<string[]>(loadFavorites());
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showFavPanel, setShowFavPanel] = useState(false);
  const [removingFavId, setRemovingFavId] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const tabEl = tabRefs.current[activeTab];
    const wrapperEl = tabsRef.current;
    if (tabEl && wrapperEl) {
      const wrapperRect = wrapperEl.getBoundingClientRect();
      const tabRect = tabEl.getBoundingClientRect();
      setUnderlineStyle({
        left: tabRect.left - wrapperRect.left + wrapperEl.scrollLeft,
        width: tabRect.width,
      });
    }
  }, [activeTab, data.categories]);

  useEffect(() => {
    if (data.categories.length > 0 && !data.categories.find((c) => c.id === activeTab)) {
      setActiveTab(data.categories[0].id);
    }
  }, [data.categories, activeTab]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'cafe_menu_data') {
        setShowUpdateBanner(true);
        setBannerVisible(true);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const handleRefresh = useCallback(() => {
    setBannerVisible(false);
    setTimeout(() => {
      const newData = loadMenuData();
      onDataChange(newData);
      setShowUpdateBanner(false);
    }, 300);
  }, [onDataChange]);

  const handleToggleFavorite = useCallback((drinkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleFav(drinkId);
    setFavorites(updated);
  }, []);

  const handleRemoveFavorite = useCallback((drinkId: string) => {
    setRemovingFavId(drinkId);
    setTimeout(() => {
      const updated = toggleFav(drinkId);
      setFavorites(updated);
      setRemovingFavId(null);
    }, 300);
  }, []);

  const handleImgError = useCallback((drinkId: string) => {
    setImgErrors((prev) => new Set(prev).add(drinkId));
  }, []);

  const lowerQuery = searchQuery.toLowerCase().trim();

  const filteredDrinks = useMemo(() => {
    let drinks = data.drinks.filter((d) => d.categoryId === activeTab);
    if (lowerQuery) {
      drinks = drinks.filter(
        (d) =>
          d.name.toLowerCase().includes(lowerQuery) ||
          d.description.toLowerCase().includes(lowerQuery)
      );
    }
    return drinks;
  }, [data.drinks, activeTab, lowerQuery]);

  const categoryDrinks = useMemo(
    () => data.drinks.filter((d) => d.categoryId === activeTab),
    [data.drinks, activeTab]
  );

  const highlightText = useCallback(
    (text: string) => {
      if (!lowerQuery) return text;
      const idx = text.toLowerCase().indexOf(lowerQuery);
      if (idx === -1) return text;
      return (
        <>
          {text.slice(0, idx)}
          <span style={styles.highlight}>{text.slice(idx, idx + lowerQuery.length)}</span>
          {text.slice(idx + lowerQuery.length)}
        </>
      );
    },
    [lowerQuery]
  );

  const favoriteDrinks = useMemo(
    () => data.drinks.filter((d) => favorites.includes(d.id)),
    [data.drinks, favorites]
  );

  const isMatch = useCallback(
    (drink: Drink) => {
      if (!lowerQuery) return true;
      return (
        drink.name.toLowerCase().includes(lowerQuery) ||
        drink.description.toLowerCase().includes(lowerQuery)
      );
    },
    [lowerQuery]
  );

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heartBeat {
          0% { transform: scale(1); }
          25% { transform: scale(1.3); }
          50% { transform: scale(1); }
          75% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .customer-heart-active {
          animation: heartBeat 0.3s ease-in-out;
        }
        .customer-tab:hover {
          color: #4A2C2A;
        }
        .customer-search:focus {
          border-color: #C8A27A;
          box-shadow: 0 0 0 3px rgba(200,162,122,0.2);
        }
        .customer-fav-remove:hover {
          background: rgba(232,116,116,0.2) !important;
        }
        .customer-bottom-bar:hover {
          background: #3a1f1d;
        }
        .customer-banner.hiding {
          animation: fadeOut 0.3s ease-out forwards;
        }
        @media (max-width: 768px) {
          .customer-drink-grid {
            grid-template-columns: 1fr !important;
          }
          .customer-header {
            padding: 16px 16px 0 !important;
          }
          .customer-content {
            padding: 16px 16px 80px !important;
          }
        }
      `}</style>

      <div style={styles.container}>
        {showUpdateBanner && (
          <div
            className={`customer-banner ${!bannerVisible ? 'hiding' : ''}`}
            style={styles.updateBanner}
            onClick={handleRefresh}
          >
            ☕ 菜单已更新，点击刷新
          </div>
        )}

        <div className="customer-header" style={styles.header}>
          <h1 style={styles.headerTitle}>
            <span>☕</span> 咖啡馆菜单
          </h1>

          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              className="customer-search"
              style={styles.searchBox}
              placeholder="搜索饮品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={styles.tabsWrapper} ref={tabsRef}>
            {data.categories.map((cat) => (
              <button
                key={cat.id}
                ref={(el) => {
                  tabRefs.current[cat.id] = el;
                }}
                className="customer-tab"
                style={{
                  ...styles.tab,
                  ...(activeTab === cat.id ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab(cat.id)}
              >
                {cat.name}
              </button>
            ))}
            <div
              style={{
                ...styles.tabUnderline,
                left: underlineStyle.left,
                width: underlineStyle.width,
              }}
            />
          </div>
        </div>

        <div className="customer-content" style={styles.content}>
          <div className="customer-drink-grid" style={styles.drinkGrid}>
            {categoryDrinks.map((drink) => {
              const matched = isMatch(drink);
              return (
                <div
                  key={drink.id}
                  style={{
                    ...styles.drinkCard,
                    ...(!matched ? styles.drinkCardHidden : {}),
                    ...(hoveredCard === drink.id && matched ? styles.drinkCardHover : {}),
                  }}
                  onMouseEnter={() => matched && setHoveredCard(drink.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <button
                    style={{
                      ...styles.heartBtn,
                      ...(favorites.includes(drink.id) ? styles.heartActive : styles.heartInactive),
                    }}
                    className={favorites.includes(drink.id) ? 'customer-heart-active' : ''}
                    onClick={(e) => handleToggleFavorite(drink.id, e)}
                  >
                    {favorites.includes(drink.id) ? '❤️' : '🤍'}
                  </button>

                  {drink.isNew && <div style={styles.drinkCardNew}>新品</div>}

                  {drink.imageUrl && !imgErrors.has(drink.id) ? (
                    <img
                      src={drink.imageUrl}
                      alt={drink.name}
                      style={styles.drinkCardImage}
                      onError={() => handleImgError(drink.id)}
                    />
                  ) : (
                    <div style={styles.drinkCardPlaceholder}>☕</div>
                  )}

                  <div style={styles.drinkCardBody}>
                    <div style={styles.drinkCardName}>
                      {highlightText(drink.name || '未命名饮品')}
                    </div>
                    <div style={styles.drinkCardPrice}>
                      {drink.price > 0 ? `¥${drink.price}` : '价格未定'}
                    </div>
                    <div style={styles.drinkCardDesc}>
                      {highlightText(drink.description || '暂无描述')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {categoryDrinks.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                color: '#8B6F5E',
                fontSize: 15,
              }}
            >
              此分类暂无饮品
            </div>
          )}
        </div>

        <div
          className="customer-bottom-bar"
          style={styles.bottomBar}
          onClick={() => setShowFavPanel(true)}
        >
          <span>❤️ 我的收藏</span>
          <span style={{ fontWeight: 700 }}>{favorites.length} 项</span>
        </div>

        {showFavPanel && <div style={styles.favOverlay} onClick={() => setShowFavPanel(false)} />}

        {showFavPanel && (
          <div style={styles.favPanel}>
            <div style={styles.favPanelHeader}>
              <span style={styles.favPanelTitle}>❤️ 我的收藏 ({favorites.length})</span>
              <button
                style={styles.favPanelClose}
                onClick={() => setShowFavPanel(false)}
              >
                ✕
              </button>
            </div>
            {favoriteDrinks.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#8B6F5E',
                  fontSize: 14,
                }}
              >
                还没有收藏任何饮品
              </div>
            ) : (
              favoriteDrinks.map((drink) => (
                <div
                  key={drink.id}
                  style={{
                    ...styles.favItem,
                    ...(removingFavId === drink.id ? styles.favItemRemoving : {}),
                  }}
                >
                  <span style={styles.favItemName}>{drink.name || '未命名饮品'}</span>
                  <button
                    className="customer-fav-remove"
                    style={styles.favRemoveBtn}
                    onClick={() => handleRemoveFavorite(drink.id)}
                  >
                    取消收藏
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
