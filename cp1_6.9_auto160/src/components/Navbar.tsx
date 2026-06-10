import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { Capsule } from '../types';
import { userApi } from '../api';
import { User } from '../types';

interface Props {
  onNewCapsule: () => void;
  capsules: Capsule[];
  onRefresh: () => void;
  onOpenCapsule: (c: Capsule) => void;
}

export default function Navbar({ onNewCapsule, capsules, onOpenCapsule }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchTimerRef = useRef<number | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCapsules = capsules.filter(c =>
    c.recipientId === user?.id && !c.isOpened && new Date() >= new Date(c.openAt)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.trim().length >= 1) {
      searchTimerRef.current = window.setTimeout(async () => {
        try {
          const results = await userApi.search(q.trim());
          setSearchResults(results.filter(u => u.id !== user?.id));
        } catch {
          setSearchResults([]);
        }
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="nav-logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">星尘胶囊</span>
        </div>
      </div>

      <div className="nav-center">
        <div className={`nav-search ${searchOpen ? 'open' : ''}`}>
          <button
            className="search-icon-btn"
            onClick={() => {
              if (!searchOpen) setSearchOpen(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          {searchOpen && (
            <>
              <input
                type="text"
                className="search-input"
                placeholder="搜索用户..."
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                autoFocus
                onBlur={() => setTimeout(() => {
                  if (!searchQuery) setSearchOpen(false);
                  setSearchResults([]);
                }, 200)}
              />
              {searchResults.length > 0 && (
                <div className="search-dropdown">
                  {searchResults.map(u => (
                    <div key={u.id} className="search-result-item">
                      <div className="result-avatar" style={{ background: u.avatar }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span>{u.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="nav-right">
        <button className="nav-btn new-capsule-btn" onClick={onNewCapsule}>
          <span>+</span> 埋藏胶囊
        </button>

        <div className="notif-container" ref={notifRef}>
          <button
            className="nav-btn notif-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unreadCapsules.length > 0 && (
              <span className="notif-badge">{unreadCapsules.length}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>通知</span>
                {unreadCapsules.length > 0 && (
                  <span className="notif-count">{unreadCapsules.length} 个待开启</span>
                )}
              </div>
              {unreadCapsules.length === 0 ? (
                <div className="notif-empty">暂无新通知</div>
              ) : (
                <div className="notif-list">
                  {unreadCapsules.map(c => (
                    <div
                      key={c.id}
                      className="notif-item"
                      onClick={() => {
                        setShowNotifications(false);
                        onOpenCapsule(c);
                      }}
                    >
                      <div className="notif-avatar" style={{ background: c.moodColor }}>
                        {c.mood}
                      </div>
                      <div className="notif-content">
                        <div className="notif-title">
                          <strong>{c.senderName}</strong> 发来一枚时空胶囊
                        </div>
                        <div className="notif-time">
                          {new Date(c.openAt).toLocaleDateString('zh-CN')} 已到达开启时间
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="user-menu-container" ref={userMenuRef}>
          <button
            className="user-avatar-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar" style={{ background: user?.avatar }}>
              {user?.username[0].toUpperCase()}
            </div>
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-info">
                <div className="user-dropdown-avatar" style={{ background: user?.avatar }}>
                  {user?.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="user-name">{user?.username}</div>
                  <div className="user-join-date">
                    加入于 {new Date(user?.createdAt || '').toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
              <div className="user-menu-divider"></div>
              <button className="user-menu-item" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
