import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getAvatarColor = (username: string): string => {
    const colors = ['#ff9ff3', '#ffd700', '#54a0ff', '#5f27cd', '#ff6b6b', '#00d2d3'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-logo" onClick={() => navigate('/dashboard')}>
          <span className="logo-text">光语·记忆琥珀</span>
        </div>
      </div>
      <div className="navbar-right">
        {user && (
          <>
            <div className="user-info">
              <div
                className="user-avatar"
                style={{
                  background: `linear-gradient(135deg, ${getAvatarColor(user.username)}, ${getAvatarColor(user.username)}99)`
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="username-text">{user.username}</span>
            </div>
            {location.pathname !== '/create' && (
              <button
                className="btn btn-create"
                onClick={() => navigate('/create')}
              >
                <span className="btn-icon">+</span>
                创建胶囊
              </button>
            )}
            {location.pathname !== '/dashboard' && (
              <button
                className="btn btn-back"
                onClick={() => navigate('/dashboard')}
              >
                ← 返回列表
              </button>
            )}
            <button className="btn btn-logout" onClick={onLogout}>
              退出
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
