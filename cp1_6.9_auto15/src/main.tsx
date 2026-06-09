import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { gsap } from 'gsap';
import { bioDatabase, habitats, Habitat, BioData } from './data/bioData';
import { BioCard } from './components/BioCard';
import { DetailModal } from './components/DetailModal';
import { PuzzleGame } from './components/PuzzleGame';
import './styles.css';

const App = () => {
  const [selectedHabitat, setSelectedHabitat] = useState<Habitat | '全部'>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBio, setSelectedBio] = useState<BioData | null>(null);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [puzzleHabitat, setPuzzleHabitat] = useState<Habitat>('浅海');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const waveOverlayRef = useRef<HTMLDivElement>(null);

  const filteredBios = useMemo(() => {
    let result = bioDatabase;
    if (selectedHabitat !== '全部') {
      result = result.filter(b => b.habitat === selectedHabitat);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        b => b.name.toLowerCase().includes(q) || b.scientificName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [selectedHabitat, searchQuery]);

  useEffect(() => {
    if (gridRef.current) {
      gsap.fromTo(
        gridRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.03, ease: 'power2.out' }
      );
    }
  }, [filteredBios]);

  const handleHabitatChange = useCallback((habitat: Habitat | '全部') => {
    setIsTransitioning(true);
    if (gridRef.current) {
      gsap.to(gridRef.current.children, {
        opacity: 0,
        duration: 0.15,
        onComplete: () => {
          setSelectedHabitat(habitat);
          setIsTransitioning(false);
        }
      });
    } else {
      setSelectedHabitat(habitat);
      setIsTransitioning(false);
    }
  }, []);

  const handleSearch = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearchQuery((e.target as HTMLInputElement).value);
    }
  }, []);

  const handleExplore = useCallback(() => {
    if (waveOverlayRef.current) {
      const tl = gsap.timeline({
        onComplete: () => {
          const randomBio = bioDatabase[Math.floor(Math.random() * bioDatabase.length)];
          setSelectedBio(randomBio);
        }
      });
      tl.to(waveOverlayRef.current, {
        x: '0%',
        duration: 0.5,
        ease: 'power2.in'
      }).to(waveOverlayRef.current, {
        x: '100%',
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.1
      });
    } else {
      const randomBio = bioDatabase[Math.floor(Math.random() * bioDatabase.length)];
      setSelectedBio(randomBio);
    }
  }, []);

  const handleStartPuzzle = useCallback(() => {
    const randomHabitat = habitats[Math.floor(Math.random() * habitats.length)];
    setPuzzleHabitat(randomHabitat);
    setShowPuzzle(true);
  }, []);

  return (
    <div className="app">
      <div ref={waveOverlayRef} className="wave-overlay" />

      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-emoji">🌊</span>
            <h1 className="logo-text">深海生物图鉴</h1>
          </div>

          <div className="header-actions">
            <div className="search-box">
              <input
                type="text"
                className="search-input"
                placeholder="搜索生物名称或学名..."
                onKeyDown={handleSearch}
                onChange={(e) => setSearchQuery(e.target.value)}
                value={searchQuery}
              />
              <span className="search-icon">🔍</span>
            </div>

            <button className="btn-explore" onClick={handleExplore}>
              ✨ 探索
            </button>

            <button className="btn-puzzle" onClick={handleStartPuzzle}>
              🧩 挑战拼图
            </button>
          </div>
        </div>

        <nav className="habitat-tabs">
          <button
            className={`tab-btn ${selectedHabitat === '全部' ? 'active' : ''}`}
            onClick={() => handleHabitatChange('全部')}
          >
            🌍 全部
          </button>
          {habitats.map((h) => (
            <button
              key={h}
              className={`tab-btn ${selectedHabitat === h ? 'active' : ''}`}
              onClick={() => handleHabitatChange(h)}
              data-habitat={h}
            >
              {h === '浅海' && '🏝️'}
              {h === '深海热泉' && '🌋'}
              {h === '极地冰洋' && '❄️'}
              {h === '深渊平原' && '🌑'}
              {' '}{h}
            </button>
          ))}
        </nav>
      </header>

      <main className="main-content">
        <div className="stats-bar">
          <span>共发现 <strong>{filteredBios.length}</strong> 种深海生物</span>
          {selectedHabitat !== '全部' && <span className="current-filter">当前筛选：{selectedHabitat}</span>}
        </div>

        <div
          ref={gridRef}
          className={`bio-grid ${isTransitioning ? 'fading' : ''}`}
        >
          {filteredBios.map((bio) => (
            <BioCard key={bio.id} bio={bio} onClick={() => setSelectedBio(bio)} />
          ))}
        </div>

        {filteredBios.length === 0 && (
          <div className="empty-state">
            <div className="empty-emoji">🔍</div>
            <p>没有找到匹配的生物</p>
            <p className="empty-hint">试试其他搜索词或栖息地</p>
          </div>
        )}
      </main>

      {selectedBio && (
        <DetailModal bio={selectedBio} onClose={() => setSelectedBio(null)} />
      )}

      {showPuzzle && (
        <PuzzleGame
          habitat={puzzleHabitat}
          onClose={() => setShowPuzzle(false)}
        />
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
