import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../styles/navbar.css';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { currentUser } = useApp();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          <span className="note-icon">♪</span>
          <span>歌词接龙</span>
        </Link>

        <div className="navbar-nav">
          <Link to="/" className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
            首页
          </Link>
          <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>
            历史库
          </Link>
          <Link to="/create" className={`nav-link ${isActive('/create') ? 'active' : ''}`}>
            创建房间
          </Link>
        </div>

        <div className="navbar-user">
          <Link to={`/user/${currentUser?.id}`} className="user-avatar-link">
            <div
              className="user-avatar-small online"
              style={{ backgroundColor: currentUser?.color }}
            >
              {currentUser?.avatarInitial}
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
