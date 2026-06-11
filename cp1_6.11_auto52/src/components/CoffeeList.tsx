import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Coffee, SortOption } from '../types';

interface CoffeeListProps {
  coffees: Coffee[];
  loading: boolean;
}

const originFlags: Record<string, string> = {
  '埃塞俄比亚': '🇪🇹',
  '哥伦比亚': '🇨🇴',
  '巴西': '🇧🇷',
  '印度尼西亚': '🇮🇩',
  '巴拿马': '🇵🇦',
};

const getRatingColor = (rating: number): 'low' | 'mid' | 'high' => {
  if (rating <= 3) return 'low';
  if (rating <= 6) return 'mid';
  return 'high';
};

const CoffeeList: React.FC<CoffeeListProps> = ({ coffees, loading }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('rating-desc');
  const [transitionKey, setTransitionKey] = useState(0);

  const filteredAndSortedCoffees = useMemo(() => {
    let result = coffees.filter((coffee) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        coffee.origin.toLowerCase().includes(term) ||
        coffee.region.toLowerCase().includes(term) ||
        coffee.process.toLowerCase().includes(term) ||
        coffee.name.toLowerCase().includes(term)
      );
    });

    result = [...result].sort((a, b) => {
      if (sortBy === 'rating-desc') {
        return b.avgRating - a.avgRating;
      }
      return a.altitude - b.altitude;
    });

    return result;
  }, [coffees, searchTerm, sortBy]);

  const groupedByOrigin = useMemo(() => {
    const groups: Record<string, Coffee[]> = {};
    filteredAndSortedCoffees.forEach((coffee) => {
      if (!groups[coffee.origin]) {
        groups[coffee.origin] = [];
      }
      groups[coffee.origin].push(coffee);
    });
    return groups;
  }, [filteredAndSortedCoffees]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setTransitionKey((k) => k + 1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
    setTransitionKey((k) => k + 1);
  };

  const handleCardClick = (id: number) => {
    navigate(`/coffee/${id}`);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <div className="loading-text">正在加载咖啡豆数据...</div>
      </div>
    );
  }

  return (
    <>
      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索产地、处理方式..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <select
          className="sort-select"
          value={sortBy}
          onChange={handleSortChange}
        >
          <option value="rating-desc">按评分降序</option>
          <option value="altitude-asc">按海拔升序</option>
        </select>
      </div>

      {Object.keys(groupedByOrigin).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">☕</div>
          <div className="empty-state-text">没有找到匹配的咖啡豆</div>
        </div>
      ) : (
        Object.entries(groupedByOrigin).map(([origin, originCoffees]) => (
          <section key={origin} className="origin-section">
            <h2 className="origin-title">
              <span>{originFlags[origin] || '🏳️'}</span>
              <span>{origin}</span>
            </h2>
            <div className="coffee-grid fade-transition" key={`${origin}-${transitionKey}`}>
              {originCoffees.map((coffee) => (
                <div
                  key={coffee.id}
                  className={`coffee-card origin-${coffee.origin}`}
                  onClick={() => handleCardClick(coffee.id)}
                >
                  <div className="coffee-card-name">{coffee.name}</div>
                  <div className="coffee-card-info">
                    <span>📍 {coffee.region}</span>
                    <span>⛰️ {coffee.altitude}m</span>
                    <span>💧 {coffee.process}</span>
                  </div>
                  <div className="coffee-card-flavors">
                    {coffee.flavorNotes.map((note) => (
                      <span key={note} className="flavor-tag">
                        {note}
                      </span>
                    ))}
                  </div>
                  <div className="coffee-card-rating">
                    <span className={`rating-dot ${getRatingColor(coffee.avgRating)}`} />
                    <span>{coffee.avgRating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
};

export default CoffeeList;
