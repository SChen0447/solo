import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Gallery from './Gallery';
import SpecimenEditor from './SpecimenEditor';

export interface User {
  id: string;
  username: string;
}

export interface WavePoint {
  x: number;
  y: number;
}

export interface Specimen {
  id: string;
  user_id: string;
  name: string;
  waveform: WavePoint[];
  hue: number;
  saturation: number;
  lightness: number;
  amplitude: number;
  frequency: number;
  favorite: number;
  created_at: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
      navigate('/gallery');
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #5d4037 0%, #3e2723 100%)',
          borderRadius: '12px',
          padding: '48px 40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          border: '1px solid #6d4c41',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        <h1
          style={{
            color: '#f5f0e1',
            fontSize: '32px',
            fontWeight: 400,
            letterSpacing: '4px',
            textAlign: 'center',
            marginBottom: '8px',
            fontFamily: 'Georgia, serif',
          }}
        >
          回声 · 标本集
        </h1>
        <p
          style={{
            color: '#a1887f',
            textAlign: 'center',
            fontSize: '14px',
            marginBottom: '40px',
            letterSpacing: '2px',
          }}
        >
          ECHO SPECIMEN COLLECTION
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                color: '#d7ccc8',
                fontSize: '13px',
                marginBottom: '8px',
                letterSpacing: '1px',
              }}
            >
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid #6d4c41',
                borderRadius: '6px',
                color: '#f5f0e1',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#ffd54f')}
              onBlur={(e) => (e.target.style.borderColor = '#6d4c41')}
            />
          </div>
          <div style={{ marginBottom: '28px' }}>
            <label
              style={{
                display: 'block',
                color: '#d7ccc8',
                fontSize: '13px',
                marginBottom: '8px',
                letterSpacing: '1px',
              }}
            >
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid #6d4c41',
                borderRadius: '6px',
                color: '#f5f0e1',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#ffd54f')}
              onBlur={(e) => (e.target.style.borderColor = '#6d4c41')}
            />
          </div>

          {error && (
            <div
              style={{
                color: '#ef5350',
                fontSize: '13px',
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #ffd54f 0%, #ff8f00 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#3e2723',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,143,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isRegister ? '注 册' : '登 录'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <span style={{ color: '#a1887f', fontSize: '13px' }}>
            {isRegister ? '已有账号？' : '还没有账号？'}
          </span>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffd54f',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
              marginLeft: '6px',
            }}
          >
            {isRegister ? '去登录' : '去注册'}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('echo_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (_) {}
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await axios.post('/api/login', { username, password });
    setUser(res.data);
    localStorage.setItem('echo_user', JSON.stringify(res.data));
  };

  const register = async (username: string, password: string) => {
    const res = await axios.post('/api/register', { username, password });
    const loginRes = await axios.post('/api/login', { username, password });
    setUser(loginRes.data);
    localStorage.setItem('echo_user', JSON.stringify(loginRes.data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('echo_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/gallery" replace /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/gallery" element={user ? <Gallery /> : <Navigate to="/login" replace />} />
        <Route path="/editor/:id?" element={user ? <SpecimenEditor /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
