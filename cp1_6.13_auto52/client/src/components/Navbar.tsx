import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { userApi } from '../services/api';
import type { User } from '../types';
import './Navbar.css';

interface NavbarProps {
  isScrolled: boolean;
}

function Navbar({ isScrolled }: NavbarProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, unreadRes] = await Promise.all([
          userApi.getCurrentUser(),
          userApi.getUnreadCount(),
        ]);
        setUser(userRes.data);
        setUnreadCount(unreadRes.data.count);
      } catch (error) {
        console.error('获取用户信息失败', error);
      }
    };
    fetchData();
    
    const interval = setInterval(() => {
      userApi.getUnreadCount().then(res => {
        setUnreadCount(res.data.count);
      }).catch(() => {});
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => navigate('/')}>
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="logo-text">书香流转</span>
        </div>
        
        <div className="navbar-links">
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            end
          >
            首页
          </NavLink>
          <NavLink 
            to="/publish" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            发布
          </NavLink>
          <NavLink 
            to="/messages" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            消息
            {unreadCount > 0 && (
              <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </NavLink>
        </div>
        
        {user && (
          <div className="navbar-user">
            <img src={user.avatar} alt={user.name} className="user-avatar" />
            <span className="user-name">{user.name}</span>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
