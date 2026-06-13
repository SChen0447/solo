import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Auth from './components/Auth';
import TeaRoom from './components/TeaRoom';

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface TeaStats {
  deformationCount: number;
  pourCount: number;
  stirCount: number;
  totalScore: number;
  scoreHistory: Array<{ timestamp: number; score: number }>;
  responseTimes: number[];
  averageResponseTime: number;
}

const DEFAULT_STATS: TeaStats = {
  deformationCount: 0,
  pourCount: 0,
  stirCount: 0,
  totalScore: 100,
  scoreHistory: [{ timestamp: Date.now(), score: 100 }],
  responseTimes: [],
  averageResponseTime: 0,
};

export { DEFAULT_STATS };
export type { TeaStats, User };

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<TeaStats>(DEFAULT_STATS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('teahouse_token');
    const savedUser = localStorage.getItem('teahouse_user');
    const savedStats = localStorage.getItem('teahouse_stats');

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch {}
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('teahouse_stats', JSON.stringify(stats));
    }
  }, [stats, isLoaded]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('teahouse_token', newToken);
    localStorage.setItem('teahouse_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('teahouse_token');
    localStorage.removeItem('teahouse_user');
  };

  const updateStats = (updates: Partial<TeaStats>) => {
    setStats(prev => ({
      ...prev,
      ...updates,
      scoreHistory: updates.scoreHistory ?? prev.scoreHistory,
    }));
  };

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        color: '#d7ccc8',
        fontSize: '1.5rem',
      }}>
        茶舍正在准备中...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {!user ? (
        <Auth />
      ) : (
        <TeaRoom stats={stats} updateStats={updateStats} />
      )}
    </AuthContext.Provider>
  );
};

export default App;
