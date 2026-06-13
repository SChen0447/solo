import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';
import './Navbar.scss';

function Navbar() {
  const location = useLocation();
  const { user, isLoggedIn, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const navLinks = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/my-menus', label: '我的菜单', icon: '📋' },
    { path: '/favorites', label: '我的收藏', icon: '❤️' },
  ];

  return (
    <>
      <nav className="navbar">
        <div className="navbar-content">
          <Link to="/" className="navbar-logo">
            <span className="logo-icon">🍽️</span>
            <span className="logo-text">食光·旬味</span>
          </Link>
          
          <div className="navbar-links">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{link.icon}</span>
                <span className="nav-label">{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="navbar-user">
            {isLoggedIn ? (
              <div className="user-info">
                <img 
                  src={user?.avatar} 
                  alt="avatar" 
                  className="user-avatar"
                />
                <span className="user-nickname">{user?.nickname}</span>
                <button className="logout-btn" onClick={logout}>
                  退出
                </button>
              </div>
            ) : (
              <button 
                className="login-btn"
                onClick={() => setShowLoginModal(true)}
              >
                登录
              </button>
            )}
          </div>
        </div>
      </nav>

      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}

export default Navbar;
