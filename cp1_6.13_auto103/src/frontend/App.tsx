import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { PageKey, Sticker, User } from './types';
import { CURRENT_USER_ID, fetchUser } from './api';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import MarketPage from './pages/MarketPage';
import LeaderboardPage from './pages/LeaderboardPage';
import Sidebar from './components/Sidebar';
import Confetti from './components/Confetti';
import './styles/app.scss';

interface AppContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateScore: (newScore: number) => void;
  addStickers: (stickers: Sticker[]) => void;
  showConfetti: () => void;
  scoreDelta: number;
  triggerScoreDelta: (delta: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

interface NavItem {
  key: PageKey;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'home',
    label: '盲听大厅',
    path: '/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'profile',
    label: '我的贴纸',
    path: '/profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
  {
    key: 'market',
    label: '交换市场',
    path: '/market',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M8 8V5h8v3" />
        <path d="M12 13v6" />
        <path d="M9 16h6" />
      </svg>
    ),
  },
  {
    key: 'leaderboard',
    label: '风云榜',
    path: '/leaderboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="currentColor" strokeWidth="2">
        <path d="M8 21h8M12 17v4" />
        <rect x="5" y="9" width="5" height="8" rx="1" />
        <rect x="14" y="6" width="5" height="11" rx="1" />
        <path d="M3 9h4M17 6h4" />
      </svg>
    ),
  },
];

function App(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [confettiKey, setConfettiKey] = useState(0);
  const [scoreDelta, setScoreDelta] = useState(0);
  const location = useLocation();

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUser(CURRENT_USER_ID);
      setUser(data);
    } catch (e) {
      console.error('加载用户失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const showConfetti = useCallback(() => {
    setConfettiKey((k) => k + 1);
  }, []);

  const triggerScoreDelta = useCallback((delta: number) => {
    setScoreDelta(delta);
    setTimeout(() => setScoreDelta(0), 900);
  }, []);

  const updateScore = useCallback((newScore: number) => {
    setUser((prev) => (prev ? { ...prev, score: newScore } : prev));
  }, []);

  const addStickers = useCallback((stickers: Sticker[]) => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            unlockedStickers: [...prev.unlockedStickers, ...stickers],
          }
        : prev
    );
  }, []);

  const contextValue = useMemo<AppContextType>(
    () => ({
      user,
      loading,
      refreshUser: loadUser,
      updateScore,
      addStickers,
      showConfetti,
      scoreDelta,
      triggerScoreDelta,
    }),
    [user, loading, loadUser, updateScore, addStickers, showConfetti, scoreDelta, triggerScoreDelta]
  );

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-shell">
        <Sidebar navItems={NAV_ITEMS} />
        <main
          className="app-main"
          key={location.pathname}
        >
          <div className="route-enter">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <Confetti triggerKey={confettiKey} />
      </div>
    </AppContext.Provider>
  );
}

export default App;
