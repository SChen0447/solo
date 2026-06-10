import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import MenuCard from './components/MenuCard';
import EditPanel from './components/EditPanel';
import {
  loadFromStorage,
  saveToStorage,
  filterBySeason,
  generateShareLink,
  parseShareLink,
} from './utils/dataManager';
import { CoffeeItem, FilterType, Season, SEASON_LABELS } from './types';

const FILTER_BUTTONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'spring', label: '春季' },
  { key: 'summer', label: '夏季' },
  { key: 'autumn', label: '秋季' },
  { key: 'winter', label: '冬季' },
];

const App: React.FC = () => {
  const [coffeeItems, setCoffeeItems] = useState<CoffeeItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [priceFloat, setPriceFloat] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [savedIndicatorId, setSavedIndicatorId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const saveIndicatorTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const sharedData = parseShareLink();
    if (sharedData && sharedData.length > 0) {
      setCoffeeItems(sharedData);
    } else {
      setCoffeeItems(loadFromStorage());
    }
  }, []);

  const debouncedSave = useMemo(
    () =>
      debounce((items: CoffeeItem[]) => {
        saveToStorage(items);
      }, 500),
    []
  );

  const triggerSaveIndicator = useCallback((id: string) => {
    if (saveIndicatorTimerRef.current) {
      window.clearTimeout(saveIndicatorTimerRef.current);
    }
    setSavedIndicatorId(id);
    saveIndicatorTimerRef.current = window.setTimeout(() => {
      setSavedIndicatorId(null);
    }, 1000);
  }, []);

  const updateItems = useCallback(
    (updater: (prev: CoffeeItem[]) => CoffeeItem[], triggerId?: string) => {
      setCoffeeItems((prev) => {
        const updated = updater(prev);
        debouncedSave(updated);
        if (triggerId) {
          triggerSaveIndicator(triggerId);
        }
        return updated;
      });
    },
    [debouncedSave, triggerSaveIndicator]
  );

  const handlePriceChange = useCallback(
    (id: string, price: number) => {
      updateItems(
        (prev) => prev.map((item) => (item.id === id ? { ...item, price } : item)),
        id
      );
    },
    [updateItems]
  );

  const handleSnackChange = useCallback(
    (id: string, pairedSnack: string) => {
      updateItems(
        (prev) => prev.map((item) => (item.id === id ? { ...item, pairedSnack } : item)),
        id
      );
    },
    [updateItems]
  );

  const handleCardClick = useCallback((id: string) => {
    setEditingId(id);
    setIsPanelOpen(true);
  }, []);

  const handleEditSave = useCallback(
    (updatedItem: CoffeeItem) => {
      updateItems(
        (prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
        updatedItem.id
      );
    },
    [updateItems]
  );

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setEditingId(null);
  }, []);

  const handleShare = useCallback(async () => {
    const link = generateShareLink(coffeeItems);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('请复制以下链接分享：', link);
    }
  }, [coffeeItems]);

  const filteredItems = useMemo(() => filterBySeason(coffeeItems, filter), [coffeeItems, filter]);

  const editingItem = useMemo(
    () => coffeeItems.find((item) => item.id === editingId) || null,
    [coffeeItems, editingId]
  );

  const groupedBySeason = useMemo(() => {
    const groups: Record<Season, CoffeeItem[]> = {
      spring: [],
      summer: [],
      autumn: [],
      winter: [],
    };
    filteredItems.forEach((item) => {
      groups[item.season].push(item);
    });
    return groups;
  }, [filteredItems]);

  const pageStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 16px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  };

  const hamburgerStyle: React.CSSProperties = {
    display: 'none',
    width: '44px',
    height: '44px',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    backgroundColor: '#6d4c41',
    color: '#ffffff',
    borderRadius: '8px',
    cursor: 'pointer',
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '20px',
    minHeight: 'calc(100vh - 200px)',
  };

  const leftPanelStyle: React.CSSProperties = {
    flex: 3,
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    padding: '20px',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 200px)',
  };

  const rightPanelStyle: React.CSSProperties = {
    flex: 2,
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    padding: '20px',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 200px)',
    display: 'flex',
    flexDirection: 'column',
  };

  const seasonSectionStyle: React.CSSProperties = {
    marginBottom: '24px',
  };

  const seasonTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#6d4c41',
    marginBottom: '12px',
    paddingLeft: '8px',
    borderLeft: '3px solid #6d4c41',
  };

  const cardGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  };

  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '56px',
    backgroundColor: '#fafafa',
    borderTop: '1px solid #eeeeee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '0 16px',
    zIndex: 100,
    flexWrap: 'wrap',
  };

  const filterBtnStyle = (isActive: boolean): React.CSSProperties => ({
    position: 'relative',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#6d4c41' : '#8d6e63',
    backgroundColor: isActive ? '#efebe9' : 'transparent',
    borderRadius: '20px',
    transition: 'all 0.2s ease',
    minHeight: '44px',
    minWidth: '44px',
  });

  const indicatorStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: '3px',
    backgroundColor: '#6d4c41',
    borderRadius: '2px',
    animation: 'indicatorSlide 0.2s ease-out',
  };

  const floatSliderContainer: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 16px',
    borderLeft: '1px solid #e0e0e0',
  };

  const previewHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  };

  const shareBtnStyle: React.CSSProperties = {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: copied ? '#4caf50' : '#6d4c41',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
    minHeight: '44px',
  };

  const previewListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
  };

  const previewDividerStyle: React.CSSProperties = {
    height: '1px',
    backgroundColor: '#eeeeee',
    margin: '12px 0',
  };

  const responsiveStyle: React.CSSProperties = {
    '@media (max-width: 768px)': {},
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mobileLeftPanelStyle: React.CSSProperties = isMobile
    ? {
        ...leftPanelStyle,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: '56px',
        zIndex: 50,
        maxHeight: 'none',
        display: isMobileMenuOpen ? 'block' : 'none',
      }
    : leftPanelStyle;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#6d4c41' }}>☕ 咖啡菜单策划工具</h1>
        </div>
        <button
          style={{ ...hamburgerStyle, display: isMobile ? 'flex' : 'none' }}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      <div style={containerStyle}>
        <div style={mobileLeftPanelStyle}>
          {(['spring', 'summer', 'autumn', 'winter'] as Season[]).map((season) =>
            groupedBySeason[season].length > 0 ? (
              <div key={season} style={seasonSectionStyle}>
                <div style={seasonTitleStyle}>{SEASON_LABELS[season]}饮品</div>
                <div style={cardGridStyle}>
                  {groupedBySeason[season].map((item) => (
                    <MenuCard
                      key={item.id}
                      item={item}
                      priceFloat={priceFloat}
                      onPriceChange={handlePriceChange}
                      onSnackChange={handleSnackChange}
                      onClick={handleCardClick}
                      showSaveIndicator={savedIndicatorId === item.id}
                    />
                  ))}
                </div>
              </div>
            ) : null
          )}
          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#8d6e63' }}>
              当前筛选条件下没有饮品
            </div>
          )}
        </div>

        <div style={{ ...rightPanelStyle, display: isMobile && !isMobileMenuOpen ? 'flex' : isMobile ? 'none' : 'flex' }}>
          <div style={previewHeaderStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#3e2723' }}>菜单预览</h2>
            <button
              style={shareBtnStyle}
              onClick={handleShare}
              onMouseEnter={(e) => {
                if (!copied) e.currentTarget.style.backgroundColor = '#5d4037';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = copied ? '#4caf50' : '#6d4c41';
              }}
            >
              {copied ? '✓ 已复制' : '📤 分享菜单'}
            </button>
          </div>

          <div style={previewListStyle}>
            {filteredItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <MenuCard
                  item={item}
                  isPreview
                  priceFloat={priceFloat}
                  onPriceChange={() => {}}
                  onSnackChange={() => {}}
                />
                {index < filteredItems.length - 1 && <div style={previewDividerStyle} />}
              </React.Fragment>
            ))}
            {filteredItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: '#8d6e63' }}>
                暂无饮品
              </div>
            )}
          </div>
        </div>
      </div>

      <EditPanel
        item={editingItem}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        onSave={handleEditSave}
      />

      <div style={toolbarStyle}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {FILTER_BUTTONS.map(({ key, label }) => (
            <button
              key={key}
              style={filterBtnStyle(filter === key)}
              onClick={() => {
                setFilter(key);
                if (isMobile) setIsMobileMenuOpen(false);
              }}
              onMouseEnter={(e) => {
                if (filter !== key) e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                if (filter !== key) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {label}
              {filter === key && <div style={indicatorStyle} />}
            </button>
          ))}
        </div>

        <div style={floatSliderContainer}>
          <span style={{ fontSize: '13px', color: '#5d4037', whiteSpace: 'nowrap', fontWeight: 500 }}>
            定价浮动：{priceFloat > 0 ? `+${priceFloat}%` : `${priceFloat}%`}
          </span>
          <input
            type="range"
            min="0"
            max="20"
            step="5"
            value={priceFloat}
            onChange={(e) => setPriceFloat(parseInt(e.target.value))}
            style={{
              width: isMobile ? '100px' : '140px',
              height: '6px',
              borderRadius: '3px',
              backgroundColor: '#d7ccc8',
              outline: 'none',
              accentColor: '#e53935',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
