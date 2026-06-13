import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, User, LogOut, Palette } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import AuthModal from './AuthModal';

export default function Navbar() {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo">
          <Palette size={28} color="var(--color-gold)" />
        </div>

        <div className="navbar-links">
          <Link
            to="/"
            className={`navbar-item ${isActive('/') ? 'active' : ''}`}
            title="画廊首页"
          >
            <Home size={22} />
          </Link>

          {isAuthenticated && (
            <Link
              to="/favorites"
              className={`navbar-item ${isActive('/favorites') ? 'active' : ''}`}
              title="我的收藏"
            >
              <Heart size={22} />
            </Link>
          )}

          {isAuthenticated ? (
            <button
              className="navbar-item"
              onClick={logout}
              title={`${user?.username} - 退出登录`}
            >
              <LogOut size={22} />
            </button>
          ) : (
            <button
              className="navbar-item"
              onClick={() => openAuth('login')}
              title="登录/注册"
            >
              <User size={22} />
            </button>
          )}
        </div>

        {isAuthenticated && user && (
          <div className="navbar-user">
            <span className="navbar-username">{user.username.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </nav>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--nav-width);
          height: 100vh;
          background: rgba(245, 240, 230, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-right: 1px solid rgba(201, 185, 154, 0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 0;
          z-index: 100;
        }

        .navbar-logo {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-gold), var(--color-bronze));
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 40px;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
        }

        .navbar-links {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .navbar-item {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-light);
          transition: var(--transition-base);
          position: relative;
        }

        .navbar-item:hover {
          background: rgba(212, 175, 55, 0.15);
          color: var(--color-gold);
          transform: translateY(-2px);
        }

        .navbar-item.active {
          background: rgba(212, 175, 55, 0.25);
          color: var(--color-gold);
        }

        .navbar-item.active::before {
          content: '';
          position: absolute;
          left: -10px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 24px;
          background: var(--color-gold);
          border-radius: 2px;
        }

        .navbar-user {
          margin-top: auto;
        }

        .navbar-username {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-ink-green), var(--color-bronze));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          font-family: 'Noto Serif SC', serif;
        }

        @media (max-width: 768px) {
          .navbar {
            top: auto;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 60px;
            flex-direction: row;
            padding: 0 16px;
            border-right: none;
            border-top: 1px solid rgba(201, 185, 154, 0.3);
            justify-content: space-around;
          }

          .navbar-logo {
            margin-bottom: 0;
            width: 40px;
            height: 40px;
          }

          .navbar-links {
            flex-direction: row;
            gap: 4px;
            flex: 1;
            justify-content: center;
          }

          .navbar-item {
            width: 40px;
            height: 40px;
          }

          .navbar-item.active::before {
            left: 50%;
            top: auto;
            bottom: -10px;
            transform: translateX(-50%);
            width: 24px;
            height: 4px;
          }

          .navbar-user {
            margin-top: 0;
          }
        }
      `}</style>

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        />
      )}
    </>
  );
}
