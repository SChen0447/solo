import { Search } from 'lucide-react';
import { CATEGORIES } from '../types';

interface FilterBarProps {
  activeCategory: string;
  searchTerm: string;
  onCategoryChange: (category: string) => void;
  onSearchChange: (search: string) => void;
}

export default function FilterBar({
  activeCategory,
  searchTerm,
  onCategoryChange,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div
      className="filter-bar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '16px 24px',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(26, 26, 46, 0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, #e94560, #ff6b9d)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          阅读笔记墙
        </h1>

        <div
          style={{
            position: 'relative',
            flex: 1,
            maxWidth: '320px',
            marginLeft: 'auto',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#888',
            }}
          />
          <input
            type="text"
            placeholder="搜索书名或作者..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(22, 33, 62, 0.8)',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#e94560';
              e.target.style.boxShadow = '0 0 0 3px rgba(233, 69, 96, 0.2)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      <div
        className="category-tabs"
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <button
          onClick={() => onCategoryChange('all')}
          className={`tab-btn ${activeCategory === 'all' ? 'active' : ''}`}
          style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '14px',
            fontWeight: activeCategory === 'all' ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: activeCategory === 'all' ? '#e94560' : 'rgba(255,255,255,0.05)',
            color: activeCategory === 'all' ? '#fff' : '#aaa',
          }}
        >
          全部
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => onCategoryChange(cat.key)}
            className={`tab-btn ${activeCategory === cat.key ? 'active' : ''}`}
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '14px',
              fontWeight: activeCategory === cat.key ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: activeCategory === cat.key ? cat.color : 'rgba(255,255,255,0.05)',
              color: activeCategory === cat.key ? '#fff' : '#aaa',
              position: 'relative',
            }}
          >
            {cat.label}
            {activeCategory === cat.key && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px',
                  height: '2px',
                  borderRadius: '1px',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  transition: 'all 0.3s ease',
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
