import React, { useState, useEffect, useRef } from 'react';
import { Product, categoryMap } from '../types';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';
import './Home.css';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
  }, [category, priceRange, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { category };
      if (searchQuery) params.search = searchQuery;
      if (priceRange !== 'all') {
        const [min, max] = priceRange.split('-');
        if (min) params.minPrice = min;
        if (max) params.maxPrice = max;
      }
      const res = await api.get('/products', { params });
      setProducts(res.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  const suggestions = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5);

  const handleSuggestionClick = (name: string) => {
    setSearchQuery(name);
    setShowSuggestions(false);
  };

  return (
    <div className="home-page page-container">
      <div className="hero-section">
        <h1 className="hero-title">匠心独运 · 每一件都是孤品</h1>
        <p className="hero-subtitle">精选头层牛皮，手工缝制，为你打造独一无二的皮具艺术品</p>
      </div>

      <div className="filter-section">
        <div className="search-box" ref={searchRef}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="搜索皮具..."
            value={searchQuery}
            onChange={handleSearchInput}
            onFocus={() => setShowSuggestions(true)}
            className="search-input"
          />
          {showSuggestions && searchQuery && (
            <div className="suggestions-list">
              {suggestions.length > 0 ? (
                suggestions.map((product, index) => (
                  <div
                    key={product.id}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(product.name)}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <img src={product.image} alt="" />
                    <span>{product.name}</span>
                    <span className="suggestion-price">¥{product.price}</span>
                  </div>
                ))
              ) : (
                <div className="suggestion-item no-result">未找到相关产品</div>
              )}
            </div>
          )}
        </div>

        <div className="filter-controls">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">全部类别</option>
            {Object.entries(categoryMap).filter(([k]) => k !== 'all').map(([key, value]) => (
              <option key={key} value={key}>{value}</option>
            ))}
          </select>

          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="filter-select"
          >
            <option value="all">全部价格</option>
            <option value="0-200">¥200以下</option>
            <option value="200-500">¥200 - ¥500</option>
            <option value="500-1000">¥500 - ¥1000</option>
            <option value="1000-">¥1000以上</option>
          </select>
        </div>
      </div>

      <div className="category-tabs">
        {Object.entries(categoryMap).map(([key, value]) => (
          <button
            key={key}
            className={`category-tab ${category === key ? 'active' : ''}`}
            onClick={() => setCategory(key)}
          >
            {value}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loader" style={{ borderColor: 'var(--color-dark-brown)', borderTopColor: 'transparent' }}></div>
          <p>加载中...</p>
        </div>
      ) : (
        <>
          <div className="products-header">
            <h2>全部商品</h2>
            <span className="product-count">共 {products.length} 件</span>
          </div>
          
          {products.length > 0 ? (
            <div className="products-grid">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-icon">📦</p>
              <p>暂无符合条件的商品</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
