import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('请填写邮箱和密码')
      return
    }
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || '登录失败')
    }
  }

  return (
    <div className="page-container">
      <div className="auth-container">
        <div className="auth-card">
          <h1>欢迎回来 👋</h1>
          <p className="subtitle">登录以继续探索美食</p>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <label className="form-label">邮箱</label>
              <input
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="form-label">密码</label>
              <input
                type="password"
                className="form-input"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="auth-footer">
            还没有账号？<Link to="/register">立即注册</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
