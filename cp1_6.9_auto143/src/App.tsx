import React, { Suspense, lazy, useState, useEffect } from 'react';
import type { Flower } from './types';
import { useLatestUnlocked } from './hooks/useLatestUnlocked';

const FlowerGarden = lazy(() => import('./components/FlowerGarden'));
const SpecimenGallery = lazy(() => import('./components/SpecimenGallery'));

type View = 'garden' | 'gallery';

const App: React.FC = () => {
  const [view, setView] = useState<View>('garden');
  const { newUnlocks, dismissUnlock } = useLatestUnlocked();
  const [toasts, setToasts] = useState<Flower[]>([]);

  useEffect(() => {
    if (newUnlocks.length > 0) {
      setToasts((prev) => [...prev, ...newUnlocks]);
      newUnlocks.forEach((f) => dismissUnlock(f._id));
      newUnlocks.forEach((f) => {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t._id !== f._id));
        }, 3200);
      });
    }
  }, [newUnlocks, dismissUnlock]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🌸 花语密码 · 数字标本馆</h1>
        <nav className="app-nav">
          <button
            className={`nav-btn ${view === 'garden' ? 'active' : ''}`}
            onClick={() => setView('garden')}
          >
            🌿 花园
          </button>
          <button
            className={`nav-btn ${view === 'gallery' ? 'active' : ''}`}
            onClick={() => setView('gallery')}
          >
            📖 标本馆
          </button>
        </nav>
      </header>

      <main className="app-main page-enter" key={view}>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 60 }}>加载中...</div>}>
          {view === 'garden' ? <FlowerGarden /> : <SpecimenGallery />}
        </Suspense>
      </main>

      <div className="toast-container">
        {toasts.map((f) => (
          <div key={f._id} className="toast">
            🌸 <strong>{f.ownerName}</strong> 刚刚解锁了 <span style={{ color: f.color }}>{f.name}</span>，花语是「{f.meaning}」
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
