import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import Counter from './components/Counter';
import Collection from './components/Collection';

const BottleCard = lazy(() => import('./components/BottleCard'));

export interface Bottle {
  id: string;
  content: string;
  origin: string;
  tags: string[];
  userTags?: string[];
  timestamp: number;
  picked?: boolean;
}

interface CollectedBottle extends Bottle {
  pickedAt: number;
}

type View = 'main' | 'collection';

function App() {
  const [currentBottle, setCurrentBottle] = useState<Bottle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pickCount, setPickCount] = useState<number>(5);
  const [lastResetDate, setLastResetDate] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);
  const [view, setView] = useState<View>('main');
  const [collection, setCollection] = useState<CollectedBottle[]>([]);
  const [selectedCollectedBottle, setSelectedCollectedBottle] = useState<CollectedBottle | null>(null);
  const [isFading, setIsFading] = useState(false);

  const checkDailyReset = useCallback(() => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('lastResetDate');
    const storedCount = localStorage.getItem('pickCount');
    const storedCollection = localStorage.getItem('collection');

    if (storedCollection) {
      try {
        setCollection(JSON.parse(storedCollection));
      } catch (e) {
        console.error('Failed to parse collection');
      }
    }

    if (storedDate !== today) {
      setLastResetDate(today);
      setPickCount(5);
      localStorage.setItem('lastResetDate', today);
      localStorage.setItem('pickCount', '5');
    } else if (storedCount) {
      setPickCount(parseInt(storedCount, 10) || 0);
      setLastResetDate(storedDate || today);
    }
  }, []);

  useEffect(() => {
    checkDailyReset();
  }, [checkDailyReset]);

  useEffect(() => {
    localStorage.setItem('pickCount', pickCount.toString());
  }, [pickCount]);

  useEffect(() => {
    localStorage.setItem('collection', JSON.stringify(collection));
  }, [collection]);

  const fetchRandomBottle = useCallback(async () => {
    if (pickCount <= 0) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/bottles/random');
      const data = await res.json();
      setCurrentBottle(data);
      setPickCount(prev => prev - 1);
    } catch (e) {
      console.error('Failed to fetch bottle:', e);
    } finally {
      setIsLoading(false);
    }
  }, [pickCount]);

  useEffect(() => {
    fetchRandomBottle();
  }, []);

  useEffect(() => {
    if (pickCount <= 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, tomorrow.getTime() - now);
        setCountdown(Math.floor(diff / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [pickCount]);

  const handleSeal = useCallback(async (tags: string[]) => {
    if (!currentBottle) return;
    try {
      await fetch(`/api/bottles/${currentBottle.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags })
      });

      const collected: CollectedBottle = {
        ...currentBottle,
        userTags: tags,
        pickedAt: Date.now()
      };
      setCollection(prev => [collected, ...prev].slice(0, 5));

      setIsFading(true);
      setTimeout(() => {
        setIsFading(false);
        setCurrentBottle(null);
        if (pickCount > 0) {
          fetchRandomBottle();
        }
      }, 2000);
    } catch (e) {
      console.error('Failed to seal bottle:', e);
    }
  }, [currentBottle, pickCount, fetchRandomBottle]);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (!currentBottle || pickCount <= 0) return;
    if (direction === 'left') {
      setCurrentBottle(null);
      setTimeout(() => fetchRandomBottle(), 300);
    }
  }, [currentBottle, pickCount, fetchRandomBottle]);

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      <div className="compass-decoration" aria-hidden="true">
        <svg viewBox="0 0 120 120" width="80" height="80">
          <circle cx="60" cy="60" r="55" fill="none" stroke="#8B6914" strokeWidth="2" opacity="0.6" />
          <circle cx="60" cy="60" r="45" fill="none" stroke="#8B6914" strokeWidth="1" opacity="0.4" />
          <polygon points="60,10 68,60 60,55 52,60" fill="#8B6914" opacity="0.8" />
          <polygon points="60,110 68,60 60,65 52,60" fill="#C4A76B" opacity="0.8" />
          <polygon points="10,60 60,68 55,60 60,52" fill="#C4A76B" opacity="0.6" />
          <polygon points="110,60 60,68 65,60 60,52" fill="#C4A76B" opacity="0.6" />
          <circle cx="60" cy="60" r="6" fill="#8B6914" />
          <text x="60" y="28" textAnchor="middle" fill="#8B6914" fontSize="10" fontWeight="bold">N</text>
          <text x="60" y="98" textAnchor="middle" fill="#8B6914" fontSize="10" fontWeight="bold">S</text>
          <text x="22" y="64" textAnchor="middle" fill="#8B6914" fontSize="10" fontWeight="bold">W</text>
          <text x="98" y="64" textAnchor="middle" fill="#8B6914" fontSize="10" fontWeight="bold">E</text>
        </svg>
      </div>

      <Counter count={pickCount} />

      <div className="main-content">
        {isLoading ? (
          <LoadingSpinner />
        ) : pickCount <= 0 && !selectedCollectedBottle ? (
          <div className="empty-state">
            <h2 className="empty-title">明日再来</h2>
            <p className="empty-countdown">{formatCountdown(countdown)}</p>
          </div>
        ) : (
          <Suspense fallback={<LoadingSpinner />}>
            {selectedCollectedBottle ? (
              <BottleCard
                bottle={selectedCollectedBottle}
                onClose={() => setSelectedCollectedBottle(null)}
                isReadOnly={true}
              />
            ) : currentBottle && (
              <BottleCard
                bottle={currentBottle}
                onSeal={handleSeal}
                onSwipe={handleSwipe}
                isFading={isFading}
              />
            )}
          </Suspense>
        )}
      </div>

      {view === 'collection' ? (
        <Collection
          bottles={collection}
          onSelect={setSelectedCollectedBottle}
          onClose={() => setView('main')}
        />
      ) : (
        <button
          className="collection-btn"
          onClick={() => setView('collection')}
          aria-label="我的收集册"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#8B6914" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <path d="M8 7h8M8 11h6M8 15h4" stroke="#8B6914" strokeWidth="1" />
          </svg>
        </button>
      )}

      <div className="wave-decoration" aria-hidden="true">
        <div className="wave wave1" />
        <div className="wave wave2" />
      </div>
    </div>
  );
}

export default App;
