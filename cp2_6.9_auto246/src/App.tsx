import { useState, useEffect, useCallback, useRef } from 'react';
import IdeaCard from './components/IdeaCard';
import IdeaModal from './components/IdeaModal';
import CreateIdeaModal from './components/CreateIdeaModal';
import type { Idea } from './types';
import './App.css';

function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Idea[] | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);

  const fetchIdeas = useCallback(async (pageNum: number, search?: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/ideas?${params.toString()}`);
      const data = await res.json();

      if (search) {
        setSearchResults(data.data);
      } else {
        setIdeas((prev) => (pageNum === 1 ? data.data : [...prev, ...data.data]));
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error('获取灵感失败:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchIdeas(1);
  }, [fetchIdeas]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);

      if (searchQuery || !hasMore || loading) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      if (fullHeight - scrollTop - windowHeight < 200) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchIdeas(nextPage);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, hasMore, loading, searchQuery, fetchIdeas]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!value.trim()) {
      setSearchResults(null);
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      fetchIdeas(1, value.trim());
    }, 300);
  };

  const handleIdeaCreated = (idea: Idea) => {
    setIdeas((prev) => [idea, ...prev]);
    setShowCreateModal(false);
  };

  const handleIdeaUpdated = (idea: Idea) => {
    setIdeas((prev) => prev.map((i) => (i.id === idea.id ? idea : i)));
    if (searchResults) {
      setSearchResults((prev) =>
        prev ? prev.map((i) => (i.id === idea.id ? idea : i)) : prev
      );
    }
    setSelectedIdea(idea);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayIdeas = searchResults !== null ? searchResults : ideas;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="gradient-text">灵感画廊</span>
          </h1>
          <div className="header-actions">
            <div className="search-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="搜索灵感..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <button className="gradient-btn" onClick={() => setShowCreateModal(true)}>
              + 发布灵感
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {isSearching && (
          <div className="search-info">
            搜索 "{searchQuery}" 找到 {searchResults?.length || 0} 条结果
          </div>
        )}

        <div className={`ideas-grid ${isSearching ? 'search-mode' : ''}`}>
          {displayIdeas.map((idea, index) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              index={isSearching ? index : index}
              onClick={() => setSelectedIdea(idea)}
              isSearchResult={isSearching}
            />
          ))}
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <span>加载中...</span>
          </div>
        )}

        {!loading && displayIdeas.length === 0 && (
          <div className="empty-state">
            <p>{isSearching ? '没有找到相关灵感' : '还没有灵感，快来发布第一条吧！'}</p>
          </div>
        )}

        {!hasMore && !isSearching && ideas.length > 0 && (
          <div className="end-message">— 已经到底啦 —</div>
        )}
      </main>

      <button
        className={`back-to-top ${showBackToTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="回到顶部"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      </button>

      {selectedIdea && (
        <IdeaModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onUpdate={handleIdeaUpdated}
        />
      )}

      {showCreateModal && (
        <CreateIdeaModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleIdeaCreated}
        />
      )}
    </div>
  );
}

export default App;
