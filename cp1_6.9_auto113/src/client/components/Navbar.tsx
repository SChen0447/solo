import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useSocket } from '../SocketContext';
import { api } from '../api';

interface NavbarProps {
  onAuthClick: () => void;
  onRequestsClick: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Navbar({ onAuthClick, onRequestsClick, currentView, onViewChange }: NavbarProps) {
  const { user, logout } = useAuth();
  const { borrowRequests } = useSocket();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    onViewChange('explore');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => onViewChange('explore')}>
          <span className="brand-icon">📚</span>
          <span className="brand-text">读者书架漂流</span>
        </div>

        <button
          className={`nav-toggle ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          <span /><span /><span />
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {user ? (
            <>
              <button
                className={currentView === 'explore' ? 'nav-link active' : 'nav-link'}
                onClick={() => { onViewChange('explore'); setMenuOpen(false); }}
              >
                发现
              </button>
              <button
                className={currentView === 'my-shelf' ? 'nav-link active' : 'nav-link'}
                onClick={() => { onViewChange('my-shelf'); setMenuOpen(false); }}
              >
                我的书架
              </button>
              <button
                className={currentView === 'borrowed' ? 'nav-link active' : 'nav-link'}
                onClick={() => { onViewChange('borrowed'); setMenuOpen(false); }}
              >
                我在阅读
              </button>
              <button className="nav-link nav-requests" onClick={() => { onRequestsClick(); setMenuOpen(false); }}>
                借阅请求
                {borrowRequests.length > 0 && (
                  <span className="badge">{borrowRequests.length}</span>
                )}
              </button>
              <div className="nav-user">
                <span className="avatar-dot" style={{ background: user.avatarColor }} />
                <span className="user-nickname">{user.nickname}</span>
                <button className="btn-logout" onClick={handleLogout}>退出</button>
              </div>
            </>
          ) : (
            <button className="btn-primary nav-login" onClick={() => { onAuthClick(); setMenuOpen(false); }}>
              登录 / 注册
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
