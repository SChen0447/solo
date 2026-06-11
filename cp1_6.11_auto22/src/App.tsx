import React, { useState, useCallback } from 'react';
import { loadMenuData, MenuData } from './data/menuStore';
import MenuEditor from './components/MenuEditor';
import CustomerMenu from './components/CustomerMenu';

type ViewMode = 'owner' | 'customer';

export default function App() {
  const [menuData, setMenuData] = useState<MenuData>(loadMenuData);
  const [viewMode, setViewMode] = useState<ViewMode>('customer');

  const handleDataChange = useCallback((data: MenuData) => {
    setMenuData(data);
  }, []);

  return (
    <div
      style={{
        height: '100%',
        minHeight: '100vh',
        background: '#F5E6D3',
      }}
    >
      <nav
        style={{
          background: '#4A2C2A',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          height: 52,
          boxShadow: '0 2px 8px rgba(74,44,42,0.2)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#F5E6D3',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginRight: 32,
          }}
        >
          ☕ 咖啡馆
        </div>
        <div
          style={{
            display: 'flex',
            gap: 0,
            background: 'rgba(245,230,211,0.1)',
            borderRadius: 8,
            padding: 3,
          }}
        >
          <button
            onClick={() => setViewMode('customer')}
            style={{
              padding: '6px 18px',
              borderRadius: 6,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
              background: viewMode === 'customer' ? '#C8A27A' : 'transparent',
              color: viewMode === 'customer' ? '#4A2C2A' : '#F5E6D3',
            }}
          >
            顾客端
          </button>
          <button
            onClick={() => setViewMode('owner')}
            style={{
              padding: '6px 18px',
              borderRadius: 6,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
              background: viewMode === 'owner' ? '#C8A27A' : 'transparent',
              color: viewMode === 'owner' ? '#4A2C2A' : '#F5E6D3',
            }}
          >
            店主端
          </button>
        </div>
      </nav>

      {viewMode === 'owner' ? (
        <MenuEditor data={menuData} onDataChange={handleDataChange} />
      ) : (
        <CustomerMenu data={menuData} onDataChange={handleDataChange} />
      )}
    </div>
  );
}
