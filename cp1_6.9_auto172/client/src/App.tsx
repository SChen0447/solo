import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Workshop from './pages/Workshop';
import Gallery from './pages/Gallery';
import Collection from './pages/Collection';
import { useApp } from './context/AppContext';

function NavBar() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { path: '/workshop', label: '星尘工坊', icon: '⚗️' },
    { path: '/collection', label: '个人图鉴', icon: '📖' },
    { path: '/gallery', label: '配方广场', icon: '🌌' }
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px',
      background: 'rgba(10, 5, 24, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'
      }} onClick={() => navigate('/workshop')}>
        <span style={{ fontSize: 28 }}>✨</span>
        <h1 style={{
          fontSize: 22,
          background: 'linear-gradient(135deg, #ffcc66, #66aaff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>星尘炼金术</h1>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="btn"
            style={{
              padding: '8px 18px',
              background: location.pathname === item.path ? 'rgba(255,204,102,0.15)' : undefined,
              borderColor: location.pathname === item.path ? 'rgba(255,204,102,0.3)' : undefined,
              boxShadow: location.pathname === item.path ? '0 0 12px rgba(255,204,102,0.2)' : undefined
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          炼金师 <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>{user.username}</span>
        </span>
        <button className="btn" onClick={logout} style={{ padding: '8px 14px' }}>
          退出
        </button>
      </div>
    </nav>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div className="stars-bg" />
      <NavBar />
      <Toasts />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/workshop" element={<ProtectedRoute><Workshop /></ProtectedRoute>} />
        <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
        <Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/workshop" replace />} />
      </Routes>
    </div>
  );
}
