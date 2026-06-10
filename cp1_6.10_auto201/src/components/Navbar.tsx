import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppContext } from '../Context';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { state } = useAppContext();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-logo">
            <span>📚</span>
            <span>共读圈</span>
          </div>

          <div className="navbar-links">
            <NavLink
              to="/"
              className={`navbar-link ${isActive('/') && !isActive('/profile') ? 'active' : ''}`}
            >
              共读列表
            </NavLink>
            <NavLink
              to="/profile"
              className={`navbar-link ${isActive('/profile') ? 'active' : ''}`}
            >
              个人档案
            </NavLink>
          </div>

          <div className="navbar-user">
            <span className="user-name" style={{ fontSize: 14, color: '#e0e0e0' }}>
              {state.currentUser.name}
            </span>
            <div className="user-avatar">{state.currentUser.avatar}</div>
            <button
              className="hamburger-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="菜单"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <NavLink
          to="/"
          className={`navbar-link ${isActive('/') && !isActive('/profile') ? 'active' : ''}`}
          onClick={closeMenu}
        >
          共读列表
        </NavLink>
        <NavLink
          to="/profile"
          className={`navbar-link ${isActive('/profile') ? 'active' : ''}`}
          onClick={closeMenu}
        >
          个人档案
        </NavLink>
      </div>

      {menuOpen && (
        <div
          onClick={closeMenu}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 98
          }}
        />
      )}
    </>
  );
}
