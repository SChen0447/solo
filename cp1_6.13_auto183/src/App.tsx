import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User, Star } from './types';
import { authApi, starsApi, getToken, setToken, clearToken } from './api';
import StarField from './components/StarField';
import DiaryCard from './components/DiaryCard';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import SharePage from './components/SharePage';

interface AppContextType {
  user: User | null;
  stars: Star[];
  addStar: (star: Star) => void;
  updateStar: (star: Star) => void;
  removeStar: (id: string) => void;
  showToast: (message: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

type PageType = 'login' | 'register' | 'home' | 'share';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [deletingStarId, setDeletingStarId] = useState<string | null>(null);
  const [savingStarId, setSavingStarId] = useState<string | null>(null);
  const [page, setPage] = useState<PageType>('login');
  const [shareId, setShareId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; fading: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const toastTimerRef = useRef<number | null>(null);

  const getBackgroundStyle = (): React.CSSProperties => {
    const count = stars.length;
    if (count <= 5) {
      return { background: 'radial-gradient(ellipse at center, #2d1b4e 0%, #1a0f2e 50%, #0a0e27 100%)' };
    } else if (count <= 15) {
      const t = (count - 5) / 10;
      const r1 = Math.round(45 - t * 30);
      const g1 = Math.round(27 - t * 13);
      const b1 = Math.round(78 - t * 38);
      return {
        background: `radial-gradient(ellipse at center, rgb(${r1}, ${g1}, ${b1}) 0%, #1b1c3a 50%, #0a0e27 100%)`
      };
    } else {
      return { background: 'radial-gradient(ellipse at center, #1b1c3a 0%, #0a0e27 70%, #050814 100%)' };
    }
  };

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, fading: false });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(prev => prev ? { ...prev, fading: true } : null);
      setTimeout(() => setToast(null), 300);
    }, 2000);
  }, []);

  const addStar = useCallback((star: Star) => {
    setStars(prev => {
      const next = [...prev, star];
      if (next.length > 50) {
        return next.slice(next.length - 50);
      }
      return next;
    });
  }, []);

  const updateStar = useCallback((star: Star) => {
    setStars(prev => prev.map(s => s.id === star.id ? star : s));
  }, []);

  const removeStar = useCallback((id: string) => {
    setStars(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
    }
    clearToken();
    setUser(null);
    setStars([]);
    setSelectedStarId(null);
    setPage('login');
  }, []);

  const handleLoginSuccess = useCallback((token: string, userData: User) => {
    setToken(token);
    setUser(userData);
    setPage('home');
  }, []);

  const handleStarClick = useCallback((starId: string) => {
    setSelectedStarId(prev => prev === starId ? null : starId);
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedStarId(null);
  }, []);

  const handleCreateStar = useCallback(async (x: number, y: number, color: string, size: number) => {
    try {
      const newStar = await starsApi.createStar({ x, y, color, size, content: '' });
      addStar(newStar);
      return newStar;
    } catch (e: any) {
      showToast(e.error || '创建失败');
      return null;
    }
  }, [addStar, showToast]);

  const handleUpdateStar = useCallback(async (id: string, data: Partial<Star>) => {
    try {
      const updated = await starsApi.updateStar(id, data);
      updateStar(updated);
      if (data.content !== undefined) {
        setSavingStarId(id);
        setTimeout(() => setSavingStarId(null), 500);
      }
      return updated;
    } catch (e: any) {
      showToast(e.error || '更新失败');
      return null;
    }
  }, [updateStar, showToast]);

  const handleDeleteStar = useCallback(async (id: string) => {
    setDeletingStarId(id);
    setSelectedStarId(null);
    setTimeout(async () => {
      try {
        await starsApi.deleteStar(id);
        removeStar(id);
      } catch (e: any) {
        showToast(e.error || '删除失败');
      } finally {
        setDeletingStarId(null);
      }
    }, 800);
    return true;
  }, [removeStar, showToast]);

  useEffect(() => {
    const checkAuth = async () => {
      const path = window.location.pathname;
      if (path.startsWith('/share/')) {
        const id = path.split('/share/')[1];
        if (id) {
          setShareId(id);
          setPage('share');
          setLoading(false);
          return;
        }
      }

      const token = getToken();
      if (token) {
        try {
          const starsData = await starsApi.getStars();
          setStars(starsData);
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
          setPage('home');
        } catch (e) {
          clearToken();
          setPage('login');
        }
      } else {
        setPage('login');
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const contextValue: AppContextType = {
    user,
    stars,
    addStar,
    updateStar,
    removeStar,
    showToast,
  };

  const selectedStar = stars.find(s => s.id === selectedStarId) || null;

  if (loading) {
    return null;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-container" style={getBackgroundStyle()}>
        {page === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setPage('register')}
          />
        )}
        {page === 'register' && (
          <RegisterPage
            onRegisterSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setPage('login')}
          />
        )}
        {page === 'home' && (
          <>
            <div className="header">
              <div className="header-left">
                <div className="app-title">时光·织梦录</div>
              </div>
              <div className="header-right">
                <div className="user-info">
                  <span>{user?.username}</span>
                  <button className="logout-btn" onClick={handleLogout}>
                    退出
                  </button>
                </div>
              </div>
            </div>
            <StarField
              stars={stars}
              selectedStarId={selectedStarId}
              deletingStarId={deletingStarId}
              savingStarId={savingStarId}
              onStarClick={handleStarClick}
              onCreateStar={handleCreateStar}
              onUpdateStar={handleUpdateStar}
              totalStars={stars.length}
            />
            {selectedStar && (
              <DiaryCard
                star={selectedStar}
                onClose={handleCloseCard}
                onSave={handleUpdateStar}
                onDelete={handleDeleteStar}
              />
            )}
          </>
        )}
        {page === 'share' && shareId && (
          <SharePage shareId={shareId} onBack={() => {
            window.history.replaceState(null, '', '/');
            setPage(getToken() ? 'home' : 'login');
          }} />
        )}
        {toast && (
          <div className={`toast ${toast.fading ? 'fading' : ''}`}>
            {toast.message}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

export default App;
