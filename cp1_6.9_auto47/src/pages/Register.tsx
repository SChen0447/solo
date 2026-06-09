import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Register: React.FC = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !email || !password) {
      setError('请填写所有字段')
      return
    }
    if (password.length < 4) {
      setError('密码至少4位')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    setError('')
    setLoading(true)
    const result = await register(email, password, username)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || '注册失败')
    }
  }

  return (
    <div className="page-container">
      <div className="auth-container">
        <div className="auth-card">
          <h1>创建账号 🎉</h1>
          <p className="subtitle">加入创意厨房，分享你的独家食谱</p>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <label className="form-label">昵称</label>
              <input
                type="text"
                className="form-input"
                placeholder="你的昵称"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
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
                placeholder="至少4位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="form-label">确认密码</label>
              <input
                type="password"
                className="form-input"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? '注册中...' : '注 册'}
            </button>
          </form>

          <div className="auth-footer">
            已有账号？<Link to="/login">去登录</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
