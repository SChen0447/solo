import { useEffect, useState, useRef } from 'react';
import ExhibitCard from './ExhibitCard';

export interface Exhibit {
  id: string;
  name: string;
  description: string;
  color: string;
  rotationSpeed: number;
}

export default function App() {
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollYRef = useRef(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  useEffect(() => {
    const fetchExhibits = async () => {
      try {
        const res = await fetch('/api/exhibits');
        const data = await res.json();
        setExhibits(data);
      } catch (err) {
        console.error('获取展品数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExhibits();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
      setParallaxOffset(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleClose = () => {
    setSelectedId(null);
  };

  const selectedExhibit = exhibits.find((e) => e.id === selectedId) || null;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">光界 · 微物回廊</h1>
        <p className="app-subtitle">LIGHT REALM · MICRO GALLERY</p>
      </header>

      <div className="gallery-wrapper" ref={galleryRef}>
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>正在唤醒展品...</p>
          </div>
        ) : (
          <div className="exhibit-gallery sticky-gallery">
            {exhibits.map((exhibit, index) => (
              <div
                key={exhibit.id}
                className="exhibit-slot"
                style={{
                  transform: `translateX(${
                    Math.sin(index * 0.7 + parallaxOffset * 0.002) *
                    (index % 2 === 0 ? 8 : -8)
                  }px)`,
                }}
              >
                <ExhibitCard
                  exhibit={exhibit}
                  isSelected={selectedId === exhibit.id}
                  isOtherSelected={selectedId !== null && selectedId !== exhibit.id}
                  onSelect={handleSelect}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedExhibit && (
        <div className="modal-overlay" onClick={handleClose}>
          <div
            className="info-card"
            onClick={(e) => e.stopPropagation()}
            style={{ '--card-color': selectedExhibit.color } as React.CSSProperties}
          >
            <button
              className="close-btn"
              onClick={handleClose}
              aria-label="关闭"
            >
              ×
            </button>
            <div className="card-glow" style={{ background: selectedExhibit.color }}></div>
            <h2 className="card-title">{selectedExhibit.name}</h2>
            <p className="card-description">{selectedExhibit.description}</p>
            <div className="card-footer">
              <span className="card-label">点击任意处关闭</span>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>© 光界·微物回廊 — 探索微观宇宙的奇妙旅程</p>
      </footer>
    </div>
  );
}
