import { useState } from 'react';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (params: { title?: string; author?: string; year?: number }) => void;
}

function SearchBar({ onSearch }: SearchBarProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');

  const handleSearch = () => {
    const params: { title?: string; author?: string; year?: number } = {};
    if (title.trim()) params.title = title.trim();
    if (author.trim()) params.author = author.trim();
    if (year) params.year = parseInt(year);
    onSearch(params);
  };

  const handleReset = () => {
    setTitle('');
    setAuthor('');
    setYear('');
    onSearch({});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="search-bar paper-texture">
      <div className="search-group">
        <div className="search-item">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="input search-input"
            placeholder="搜索书名..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="search-item">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <input
            type="text"
            className="input search-input"
            placeholder="搜索作者..."
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="search-item">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <input
            type="number"
            className="input search-input"
            placeholder="出版年份"
            min="1900"
            max="2024"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      
      <div className="search-actions">
        <button className="btn btn-primary btn-bounce" onClick={handleSearch}>
          搜索
        </button>
        <button className="btn btn-outline" onClick={handleReset}>
          重置
        </button>
      </div>
    </div>
  );
}

export default SearchBar;
