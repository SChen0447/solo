import { useState, useCallback, useEffect } from 'react';
import OceanScene from './OceanScene';
import DepositPage from './DepositPage';
import RetrievePage from './RetrievePage';
import { Page } from './types';
import './styles.css';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [showSealFlash, setShowSealFlash] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  const navigateTo = useCallback((page: Page) => {
    setCurrentPage(page);
    setFadeKey(prev => prev + 1);
  }, []);

  const triggerSealFlash = useCallback(() => {
    setShowSealFlash(true);
    setTimeout(() => {
      setShowSealFlash(false);
      navigateTo('home');
    }, 1500);
  }, [navigateTo]);

  useEffect(() => {
    if (showSealFlash) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSealFlash]);

  return (
    <div className="app-container">
      {showSealFlash && <div className="seal-flash-overlay" />}

      {currentPage === 'home' && (
        <div key={fadeKey} className="page page-home fade-in">
          <OceanScene />
          <div className="home-buttons">
            <button className="nav-btn nav-btn-deposit" onClick={() => navigateTo('deposit')}>
              <span className="nav-btn-icon">📝</span>
              <span className="nav-btn-text">投递记忆</span>
            </button>
            <button className="nav-btn nav-btn-retrieve" onClick={() => navigateTo('retrieve')}>
              <span className="nav-btn-icon">🌊</span>
              <span className="nav-btn-text">捞取漂流瓶</span>
            </button>
          </div>
        </div>
      )}

      {currentPage === 'deposit' && (
        <div key={fadeKey} className="page fade-in">
          <DepositPage onBack={() => navigateTo('home')} />
        </div>
      )}

      {currentPage === 'retrieve' && (
        <div key={fadeKey} className="page fade-in">
          <RetrievePage onBack={() => navigateTo('home')} onSeal={triggerSealFlash} />
        </div>
      )}

      {currentPage !== 'home' && (
        <button className="back-btn" onClick={() => navigateTo('home')}>
          ← 返回
        </button>
      )}
    </div>
  );
}

export default App;
