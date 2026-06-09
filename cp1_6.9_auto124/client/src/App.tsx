import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home.jsx'
import WriteLetter from './pages/WriteLetter.jsx'
import LetterList from './pages/LetterList.jsx'
import LetterReader from './pages/LetterReader.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

export function useAuth() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const login = (userData: { id: string; email: string }) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('user')
    setUser(null)
  }

  return { user, login, logout }
}

function App() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="logo" onClick={() => navigate('/')}>✉️ 时光邮局</h1>
          <nav className="nav">
            {user ? (
              <>
                <button className="nav-btn" onClick={() => navigate('/')}>首页</button>
                <button className="nav-btn" onClick={() => navigate('/new')}>写新信</button>
                <button className="nav-btn" onClick={() => navigate('/list')}>信件列表</button>
                <span className="user-email">{user.email}</span>
                <button className="nav-btn logout" onClick={handleLogout}>退出</button>
              </>
            ) : (
              <>
                <button className="nav-btn" onClick={() => navigate('/login')}>登录</button>
                <button className="nav-btn primary" onClick={() => navigate('/register')}>注册</button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={login} />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register onLogin={login} />} />
          <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
          <Route path="/new" element={user ? <WriteLetter /> : <Navigate to="/login" />} />
          <Route path="/list" element={user ? <LetterList /> : <Navigate to="/login" />} />
          <Route path="/letter/:id" element={user ? <LetterReader /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
