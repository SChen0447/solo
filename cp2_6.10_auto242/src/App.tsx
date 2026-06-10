import { useState, useMemo, useCallback } from 'react';
import type { Dish, DishStatus } from './types';
import initialMenuData from './data/menuData.json';
import MenuBoard from './components/MenuBoard';
import DishDetail from './components/DishDetail';

type View = 'board' | 'detail';

export default function App() {
  const [dishes, setDishes] = useState<Dish[]>(initialMenuData as Dish[]);
  const [currentView, setCurrentView] = useState<View>('board');
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const totalStock = useMemo(() => {
    return dishes.reduce((sum, d) => sum + d.stock, 0);
  }, [dishes]);

  const handleStatusChange = useCallback((id: string, status: DishStatus) => {
    setDishes(prev =>
      prev.map(d =>
        d.id === id
          ? { ...d, status, lastUpdated: new Date().toISOString() }
          : d
      )
    );
  }, []);

  const handleStockChange = useCallback((id: string, stock: number) => {
    setDishes(prev =>
      prev.map(d => {
        if (d.id !== id) return d;
        const newStock = Math.max(0, stock);
        let newStatus: DishStatus = d.status;
        if (newStock === 0) {
          newStatus = 'soldout';
        } else if (d.status === 'soldout' && newStock > 0) {
          newStatus = newStock <= d.limited / 2 ? 'limited' : 'available';
        } else if (newStock <= d.limited / 3) {
          newStatus = 'limited';
        } else if (newStock > d.limited / 3 && d.status === 'limited') {
          newStatus = 'available';
        }
        return { ...d, stock: newStock, status: newStatus, lastUpdated: new Date().toISOString() };
      })
    );
  }, []);

  const handleLimitedChange = useCallback((id: string, limited: number) => {
    setDishes(prev =>
      prev.map(d =>
        d.id === id
          ? { ...d, limited: Math.max(1, limited), lastUpdated: new Date().toISOString() }
          : d
      )
    );
  }, []);

  const handleCardClick = useCallback((id: string) => {
    setSelectedDishId(id);
    setCurrentView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setCurrentView('board');
    setSelectedDishId(null);
  }, []);

  const handleClearAll = useCallback(() => {
    setDishes(prev =>
      prev.map(d => ({
        ...d,
        stock: 0,
        status: 'soldout' as DishStatus,
        lastUpdated: new Date().toISOString(),
      }))
    );
    setShowClearModal(false);
  }, []);

  const selectedDish = dishes.find(d => d.id === selectedDishId) || null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5e6d3' }}>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          backgroundColor: '#2c2c2c',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: currentView === 'detail' ? 'pointer' : 'default',
          }}
          onClick={currentView === 'detail' ? handleBack : undefined}
        >
          <span style={{ fontSize: 26 }}>🍽️</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
              {currentView === 'detail' && selectedDish ? '← 返回看板' : '味道小馆'}
            </div>
            <div style={{ fontSize: 11, color: '#c17a47', marginTop: 2 }}>
              {currentView === 'detail' && selectedDish ? selectedDish.name : '实时菜品看板'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>今日总库存</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#d4a373' }}>{totalStock}</div>
          </div>
          {currentView === 'board' && (
            <button
              onClick={() => setShowClearModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#8b2c2c',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#a33838'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#8b2c2c'; }}
            >
              清空今日所有库存
            </button>
          )}
        </div>
      </nav>
      <div
        style={{
          position: 'fixed',
          top: 60,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(to right, #c17a47, transparent)',
          zIndex: 99,
        }}
      />

      <div style={{ paddingTop: 60 }}>
        {currentView === 'board' ? (
          <MenuBoard
            dishes={dishes}
            onStatusChange={handleStatusChange}
            onCardClick={handleCardClick}
          />
        ) : selectedDish ? (
          <DishDetail
            dish={selectedDish}
            onStockChange={handleStockChange}
            onLimitedChange={handleLimitedChange}
            onStatusChange={handleStatusChange}
            onBack={handleBack}
          />
        ) : null}
      </div>

      {showClearModal && (
        <>
          <div
            onClick={() => setShowClearModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              zIndex: 200,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#f0e6d3',
              borderRadius: 12,
              padding: 28,
              width: 360,
              zIndex: 201,
              boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                textAlign: 'center',
                color: '#2c2c2c',
                marginBottom: 8,
              }}
            >
              确认清空所有库存？
            </div>
            <div
              style={{
                fontSize: 13,
                textAlign: 'center',
                color: '#7a6a5a',
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              此操作会将所有菜品标记为"售罄"状态，<br />库存数量归零，且无法撤销。
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowClearModal(false)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  backgroundColor: '#fff',
                  color: '#2c2c2c',
                  border: '1px solid #d9c8b2',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  backgroundColor: '#8b2c2c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                确认清空
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
