import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  currentPath: string;
}

const navItems = [
  { path: '/', label: '星尘大厅' },
  { path: '/collection', label: '我的收藏' },
  { path: '/upload', label: '上传星尘' },
  { path: '/profile', label: '个人资料' }
];

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, currentPath }) => {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: '#ffffff10',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid #ffffff15',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        color: '#ddddee'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #aa88ff, #ff88aa)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '18px',
            color: '#fff'
          }}
        >
          ✦
        </div>
        <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '2px' }}>
          星尘拍卖行
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
        {navItems.map((item) => {
          const isActive = currentPath === item.path || 
            (item.path === '/collection' && currentPath.startsWith('/collection'));
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                position: 'relative',
                fontSize: '15px',
                padding: '8px 4px',
                color: isActive ? '#ffffff' : '#ddddee',
                fontWeight: isActive ? '700' : '400',
                transition: 'color 0.3s ease'
              }}
            >
              {item.label}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, #aa88ff, #ff88aa)',
                    borderRadius: '1px'
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #aa88ff44, #ff88aa44)',
            border: '1px solid #aa88ff66',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '700'
          }}
        >
          {user.avatar}
        </div>
        <span style={{ fontSize: '14px', color: '#ccccee' }}>{user.username}</span>
        <button
          onClick={onLogout}
          style={{
            background: 'transparent',
            border: '1px solid #ff88aa66',
            color: '#ff88aa',
            padding: '6px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'inherit',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ff88aa22';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          退出
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
