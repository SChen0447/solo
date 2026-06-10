import { useState, useMemo, Dispatch } from 'react';
import type { Flower, AppAction } from '../types';

const COLORS = ['红', '粉', '白', '黄', '紫'];
const SEASONS = ['春', '夏', '秋', '冬'];

export default function FlowerGrid({
  flowers,
  dispatch,
}: {
  flowers: Flower[];
  dispatch: Dispatch<AppAction>;
}) {
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<string | null>(null);

  const filteredFlowers = useMemo(() => {
    return flowers.filter((f) => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (colorFilter && f.color !== colorFilter) return false;
      if (seasonFilter && f.season !== seasonFilter) return false;
      if (priceFilter === 'low' && f.price > 10) return false;
      if (priceFilter === 'mid' && (f.price <= 10 || f.price > 20)) return false;
      if (priceFilter === 'high' && f.price <= 20) return false;
      return true;
    });
  }, [flowers, search, colorFilter, seasonFilter, priceFilter]);

  return (
    <div className="flowers-page">
      <h1 className="page-title">🌸 花材库</h1>

      <div className="flowers-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 搜索花材名称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flowers-toolbar">
        <div className="filter-group">
          <button
            className={`filter-btn ${!colorFilter ? 'active' : ''}`}
            onClick={() => setColorFilter(null)}
          >
            全部颜色
          </button>
          {COLORS.map((c) => (
            <button
              key={c}
              className={`filter-btn ${colorFilter === c ? 'active' : ''}`}
              onClick={() => setColorFilter(c === colorFilter ? null : c)}
            >
              {c}色
            </button>
          ))}
        </div>
        <div className="filter-group">
          <button
            className={`filter-btn ${!seasonFilter ? 'active' : ''}`}
            onClick={() => setSeasonFilter(null)}
          >
            全部季节
          </button>
          {SEASONS.map((s) => (
            <button
              key={s}
              className={`filter-btn ${seasonFilter === s ? 'active' : ''}`}
              onClick={() => setSeasonFilter(s === seasonFilter ? null : s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <button
            className={`filter-btn ${!priceFilter ? 'active' : ''}`}
            onClick={() => setPriceFilter(null)}
          >
            全部价格
          </button>
          <button
            className={`filter-btn ${priceFilter === 'low' ? 'active' : ''}`}
            onClick={() => setPriceFilter(priceFilter === 'low' ? null : 'low')}
          >
            ≤¥10
          </button>
          <button
            className={`filter-btn ${priceFilter === 'mid' ? 'active' : ''}`}
            onClick={() => setPriceFilter(priceFilter === 'mid' ? null : 'mid')}
          >
            ¥10-20
          </button>
          <button
            className={`filter-btn ${priceFilter === 'high' ? 'active' : ''}`}
            onClick={() => setPriceFilter(priceFilter === 'high' ? null : 'high')}
          >
            ≥¥20
          </button>
        </div>
      </div>

      <div className="flowers-layout">
        <div className="flowers-grid">
          {filteredFlowers.length === 0 ? (
            <p
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: 'var(--text-light)',
                padding: '40px 0',
              }}
            >
              没有找到匹配的花材
            </p>
          ) : (
            filteredFlowers.map((flower) => (
              <div className="flower-card" key={flower.id}>
                <button
                  className="add-btn"
                  onClick={() => {
                    dispatch({ type: 'ADD_TO_CART', payload: flower });
                    dispatch({ type: 'TOGGLE_CART' });
                  }}
                  title="加入购物车"
                >
                  +
                </button>
                <div className="flower-emoji">{flower.emoji}</div>
                <div className="flower-name">{flower.name}</div>
                <div className="flower-desc">{flower.description}</div>
                <div className="flower-tags">
                  <span className={`tag color-${flower.color}`}>{flower.color}色</span>
                  <span className="tag">{flower.season}季</span>
                </div>
                <div className="flower-meta">
                  <div className="flower-price">¥{flower.price.toFixed(2)}</div>
                  <div className="flower-stock">库存 {flower.stock}枝</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
