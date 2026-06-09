import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Book, BookNodePosition, ConnectionLineData } from './types';
import BookNode from './components/BookNode';
import ConnectionLine from './components/ConnectionLine';

const MIN_NODE_SIZE = 40;
const MAX_NODE_SIZE = 80;
const HIGHLIGHT_SIZE = 90;
const RESET_INTERVAL = 5000;
const SEARCH_DEBOUNCE = 500;

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [positions, setPositions] = useState<Map<string, BookNodePosition>>(new Map());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionsRef = useRef<Map<string, BookNodePosition>>(new Map());
  const booksRef = useRef<Book[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const draggingRef = useRef<string | null>(null);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  useEffect(() => {
    draggingRef.current = draggingId;
  }, [draggingId]);

  useEffect(() => {
    fetch('/api/books')
      .then((r) => r.json())
      .then((data: Book[]) => {
        setBooks(data);
      })
      .catch(() => {
        import('./data/books.json').then((mod) => setBooks(mod.default as Book[]));
      });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (books.length === 0 || canvasSize.width === 0) return;
    const newPositions = new Map<string, BookNodePosition>();
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const radius = Math.min(canvasSize.width, canvasSize.height) * 0.38;
    books.forEach((book, i) => {
      if (!positions.has(book.id)) {
        const angle = (i / books.length) * Math.PI * 2;
        newPositions.set(book.id, {
          id: book.id,
          x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
          y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
        });
      } else {
        newPositions.set(book.id, positions.get(book.id)!);
      }
    });
    setPositions(newPositions);
  }, [books.length, canvasSize.width, canvasSize.height]);

  const applyForceLayout = useCallback(() => {
    const currentPos = positionsRef.current;
    const currentBooks = booksRef.current;
    if (currentPos.size === 0 || currentBooks.length === 0) return;

    const width = canvasSize.width;
    const height = canvasSize.height;
    const cx = width / 2;
    const cy = height / 2;
    const newPositions = new Map<string, BookNodePosition>();
    const posArr = Array.from(currentPos.values());

    posArr.forEach((p) => {
      newPositions.set(p.id, { ...p, vx: 0, vy: 0 });
    });

    for (let i = 0; i < posArr.length; i++) {
      for (let j = i + 1; j < posArr.length; j++) {
        const a = newPositions.get(posArr[i].id)!;
        const b = newPositions.get(posArr[j].id)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = 80;
        if (dist < minDist) {
          const force = (minDist - dist) * 0.15;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
    }

    currentBooks.forEach((book) => {
      const a = newPositions.get(book.id)!;
      book.relatedBooks.forEach((relatedId, idx) => {
        const b = newPositions.get(relatedId);
        if (!b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 150;
        const strength = book.relationStrength[idx] || 0.5;
        const force = (dist - targetDist) * 0.03 * strength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (draggingRef.current !== a.id) {
          a.vx += fx;
          a.vy += fy;
        }
        if (draggingRef.current !== b.id) {
          b.vx -= fx;
          b.vy -= fy;
        }
      });
    });

    newPositions.forEach((p) => {
      if (draggingRef.current === p.id) return;
      const centerPull = 0.005;
      p.vx += (cx - p.x) * centerPull;
      p.vy += (cy - p.y) * centerPull;
      p.vx *= 0.85;
      p.vy *= 0.85;
      p.x += p.vx;
      p.y += p.vy;
      const margin = 50;
      p.x = Math.max(margin, Math.min(width - margin, p.x));
      p.y = Math.max(margin, Math.min(height - margin, p.y));
    });

    positionsRef.current = newPositions;
    setPositions(new Map(newPositions));
  }, [canvasSize.width, canvasSize.height]);

  useEffect(() => {
    const tick = () => {
      applyForceLayout();
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [applyForceLayout]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  const connections = useMemo<ConnectionLineData[]>(() => {
    const result: ConnectionLineData[] = [];
    const seen = new Set<string>();
    books.forEach((book) => {
      book.relatedBooks.forEach((relatedId, idx) => {
        const key = [book.id, relatedId].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          result.push({
            sourceId: book.id,
            targetId: relatedId,
            strength: book.relationStrength[idx] || 0.5,
          });
        }
      });
    });
    return result;
  }, [books]);

  const searchMatches = useMemo(() => {
    if (!debouncedQuery) return new Set<string>();
    const q = debouncedQuery.toLowerCase();
    const ids = new Set<string>();
    books.forEach((b) => {
      if (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) {
        ids.add(b.id);
      }
    });
    return ids;
  }, [debouncedQuery, books]);

  const searchResults = useMemo(() => {
    if (!debouncedQuery) return [];
    return books
      .filter((b) => searchMatches.has(b.id))
      .slice(0, 5);
  }, [debouncedQuery, books, searchMatches]);

  const getRelatedIds = useCallback((id: string): Set<string> => {
    const book = books.find((b) => b.id === id);
    if (!book) return new Set();
    return new Set(book.relatedBooks);
  }, [books]);

  const handleNodeClick = useCallback((id: string) => {
    setHighlightedId((prev) => (prev === id ? null : id));
  }, []);

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragMove = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => {
      const newPos = new Map(prev);
      const p = newPos.get(id);
      if (p) {
        const margin = 50;
        newPos.set(id, {
          ...p,
          x: Math.max(margin, Math.min(canvasSize.width - margin, x)),
          y: Math.max(margin, Math.min(canvasSize.height - margin, y)),
        });
      }
      positionsRef.current = newPos;
      return newPos;
    });
  }, [canvasSize.width, canvasSize.height]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleProgressChange = useCallback(async (id: string, progress: number) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, progress } : b)));
    try {
      await fetch(`/api/books/${id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });
    } catch (e) {
      console.error('Failed to update progress', e);
    }
  }, []);

  const resetLayout = useCallback(() => {
    if (books.length === 0) return;
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const radius = Math.min(canvasSize.width, canvasSize.height) * 0.38;
    const newPositions = new Map<string, BookNodePosition>();
    books.forEach((book, i) => {
      const angle = (i / books.length) * Math.PI * 2;
      newPositions.set(book.id, {
        id: book.id,
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      });
    });
    positionsRef.current = newPositions;
    setPositions(newPositions);
  }, [books, canvasSize]);

  const showAllNodes = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setHighlightedId(null);
  }, []);

  const scatterView = useCallback(() => {
    if (books.length === 0) return;
    const newPositions = new Map<string, BookNodePosition>();
    books.forEach((book) => {
      newPositions.set(book.id, {
        id: book.id,
        x: 80 + Math.random() * (canvasSize.width - 160),
        y: 80 + Math.random() * (canvasSize.height - 160),
        vx: 0,
        vy: 0,
      });
    });
    positionsRef.current = newPositions;
    setPositions(newPositions);
  }, [books, canvasSize]);

  const highlightedBook = highlightedId ? books.find((b) => b.id === highlightedId) : null;
  const relatedIds = highlightedId ? getRelatedIds(highlightedId) : new Set<string>();

  return (
    <div className="app-container">
      <aside className={`sidebar ${isMobile ? 'sidebar-mobile' : ''}`}>
        <div className="sidebar-title">阅读图谱</div>
        <div className="sidebar-buttons">
          <button className="sidebar-btn" onClick={resetLayout} title="重置布局">
            <span className="btn-icon">⟲</span>
            <span className="btn-text">重置布局</span>
          </button>
          <button className="sidebar-btn" onClick={showAllNodes} title="全员展示">
            <span className="btn-icon">◎</span>
            <span className="btn-text">全员展示</span>
          </button>
          <button className="sidebar-btn" onClick={scatterView} title="散点视图">
            <span className="btn-icon">✦</span>
            <span className="btn-text">散点视图</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <div className="search-container">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="搜索书名或作者..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((book) => (
                <div
                  key={book.id}
                  className="search-result-item"
                  onClick={() => {
                    handleNodeClick(book.id);
                    const pos = positions.get(book.id);
                    if (pos) {
                      handleDragMove(book.id, pos.x, pos.y);
                    }
                  }}
                >
                  <span className="result-title">{book.title}</span>
                  <span className="result-author">{book.author}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="canvas" ref={canvasRef}>
          <ConnectionLine
            connections={connections}
            positions={positions}
            highlightedId={highlightedId}
            relatedIds={relatedIds}
            draggingId={draggingId}
          />

          {books.map((book) => {
            const pos = positions.get(book.id);
            if (!pos) return null;
            const isHighlighted = highlightedId === book.id;
            const isRelated = relatedIds.has(book.id);
            const isSearchMatch = debouncedQuery ? searchMatches.has(book.id) : true;
            const dimmed: boolean =
              (!!highlightedId && !isHighlighted && !isRelated) ||
              (!!debouncedQuery && !isSearchMatch);
            const isSearchAmplified: boolean = !!debouncedQuery && isSearchMatch;

            return (
              <BookNode
                key={book.id}
                book={book}
                x={pos.x}
                y={pos.y}
                minSize={MIN_NODE_SIZE}
                maxSize={MAX_NODE_SIZE}
                highlightSize={HIGHLIGHT_SIZE}
                isHighlighted={isHighlighted}
                isRelated={isRelated}
                isDimmed={dimmed}
                isSearchAmplified={isSearchAmplified}
                isDragging={draggingId === book.id}
                onClick={() => handleNodeClick(book.id)}
                onDragStart={() => handleDragStart(book.id)}
                onDragMove={(x, y) => handleDragMove(book.id, x, y)}
                onDragEnd={handleDragEnd}
                canvasRef={canvasRef}
              />
            );
          })}
        </div>

        {highlightedBook && (
          <div className={`detail-panel ${isMobile ? 'detail-panel-mobile' : ''}`}>
            <div className="detail-header">
              <h3 className="detail-title">{highlightedBook.title}</h3>
              <span className="detail-author">{highlightedBook.author}</span>
            </div>
            <span className="category-tag">{highlightedBook.category}</span>
            <div className="progress-container">
              <input
                type="range"
                min="0"
                max="100"
                value={highlightedBook.progress}
                onChange={(e) => handleProgressChange(highlightedBook.id, Number(e.target.value))}
                className="progress-slider"
              />
              <span className="progress-value">{highlightedBook.progress}%</span>
            </div>
            <p className="detail-review">{highlightedBook.review}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
