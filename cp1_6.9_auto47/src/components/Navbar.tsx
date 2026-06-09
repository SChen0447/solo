import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'

interface NavbarProps {
  onSearch?: (query: string) => void
}

const Navbar: React.FC<NavbarProps> = ({ onSearch }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchValue(val)
    if (onSearch) {
      onSearch(val)
    }
    if (location.pathname !== '/') {
      navigate('/')
    }
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="logo">
            <span className="logo-icon">🍳</span>
            <span>创意厨房</span>
          </Link>

          <div className="nav-search">
            <span className="nav-search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索食谱标题..."
              value={searchValue}
              onChange={handleSearchChange}
            />
          </div>

          <div className="nav-links">
            {user ? (
              <>
                <Link to="/recipe/create" className="btn btn-primary">
                  ✏️ 发布食谱
                </Link>
                <div className="nav-user" onClick={() => navigate('/profile')}>
                  <Avatar name={user.username} color={user.avatarColor} size="sm" />
                  <span className="nav-username">{user.username}</span>
                </div>
                <button className="btn btn-ghost" onClick={handleLogout}>退出</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">登录</Link>
                <Link to="/register" className="btn btn-primary">注册</Link>
              </>
            )}
          </div>

          <button
            className="nav-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="mobile-menu">
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="搜索食谱标题..."
              value={searchValue}
              onChange={handleSearchChange}
              className="form-input"
              style={{ borderRadius: 24 }}
            />
          </div>
          {user ? (
            <>
              <Link to="/profile" className="mobile-menu-item">
                <Avatar name={user.username} color={user.avatarColor} size="sm" />
                <span style={{ marginLeft: 10 }}>{user.username}</span>
              </Link>
              <Link to="/recipe/create" className="mobile-menu-item">✏️ 发布食谱</Link>
              <button className="mobile-menu-item" style={{ width: '100%', textAlign: 'left' }} onClick={handleLogout}>
                🚪 退出登录
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-menu-item">🔐 登录</Link>
              <Link to="/register" className="mobile-menu-item">📝 注册</Link>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default Navbar
