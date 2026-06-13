import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Navbar.css';

interface NavbarProps {
  isLoggedIn: boolean;
  onLogout: () => void;
}

export default function Navbar({ isLoggedIn, onLogout }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/', label: '首页', end: true },
    { path: '/works', label: '作品' },
    { path: '/events', label: '演出' },
    { path: '/about', label: '关于' },
  ];

  if (isMobile) {
    return (
      <>
        <nav className="navbar navbar-mobile">
          <div className="nav-logo">🎵 Music</div>
          <button
            className="hamburger-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="菜单"
          >
            <span className={`hamburger-line ${isMenuOpen ? 'open1' : ''}`}></span>
            <span className={`hamburger-line ${isMenuOpen ? 'open2' : ''}`}></span>
            <span className={`hamburger-line ${isMenuOpen ? 'open3' : ''}`}></span>
          </button>
        </nav>
        {isMenuOpen && (
          <div className="mobile-menu glass-card">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `mobile-menu-item ${isActive ? 'active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isLoggedIn ? (
              <button
                className="mobile-menu-item"
                onClick={onLogout}
              >
                退出登录
              </button>
            ) : (
              <NavLink
                to="/login"
                className="mobile-menu-item"
              >
                登录
              </NavLink>
            )}
            {isLoggedIn && (
              <NavLink
                to="/admin"
                className="mobile-menu-item admin-link"
              >
                后台管理
              </NavLink>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <nav className="navbar glass-card">
      <div className="nav-logo">🎵 Music</div>
      <div className="nav-links">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            {item.label}
            <span className="nav-underline"></span>
          </NavLink>
        ))}
        {isLoggedIn ? (
          <>
            <NavLink to="/admin" className="nav-link nav-admin-btn">
              后台管理
            </NavLink>
            <button className="nav-logout-btn" onClick={onLogout}>
              退出
            </button>
          </>
        ) : (
          <NavLink to="/login" className="nav-link nav-login-btn">
            登录
          </NavLink>
        )}
      </div>
    </nav>
  );
}
