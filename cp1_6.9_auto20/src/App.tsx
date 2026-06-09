import React, { useState } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Workshop from './Workshop'
import Gallery from './Gallery'
import Profile from './Profile'
import Feed from './Feed'

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (isLogin) {
        await login(username, password)
      } else {
        await register(username, password)
      }
      navigate('/workshop')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <h2>{isLogin ? '登录 · 古董修复工作室' : '注册 · 古董修复工作室'}</h2>
        {error && <div style={{ color: '#c00', marginBottom: 12, fontSize: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary">{isLogin ? '登 录' : '注 册'}</button>
            <span className="auth-switch" onClick={() => { setIsLogin(!isLogin); setError('') }}>
              {isLogin ? '没有账号？立即注册' : '已有账号？返回登录'}
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

const MainLayout: React.FC<{ children: React.ReactNode; showFeed?: boolean }> = ({ children, showFeed = true }) => {
  const { user, logout } = useAuth()
  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">🏺 古董修复工作室</div>
        <div className="navbar-links">
          <NavLink to="/workshop" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            🛠 工作台
          </NavLink>
          <NavLink to="/gallery" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            🎨 鉴赏区
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            📚 收藏册
          </NavLink>
          <div className="user-info">
            <span className="user-avatar">{user?.avatar}</span>
            <span>{user?.username}</span>
            <button className="btn btn-secondary" onClick={logout} style={{ padding: '4px 12px' }}>退出</button>
          </div>
        </div>
      </nav>
      <div className="main-layout">
        <div className="content-panel" style={{ gridColumn: showFeed ? 'auto' : '1 / -1' }}>
          {children}
        </div>
        {showFeed && <Feed />}
      </div>
    </>
  )
}

const App: React.FC = () => {
  const { user } = useAuth()
  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/workshop" replace /> : <LoginPage />} />
        <Route path="/workshop" element={
          <ProtectedRoute>
            <MainLayout><Workshop /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/gallery" element={
          <ProtectedRoute>
            <MainLayout><Gallery /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <MainLayout showFeed={false}><Profile /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to={user ? "/workshop" : "/login"} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
