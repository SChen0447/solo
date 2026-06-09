import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'

interface Props {
  onLogin: (user: { id: string; email: string }) => void
}

export default function Register({ onLogin }: Props) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('密码至少6位')
      return
    }

    if (password !== confirmPassword) {
      setError('两次密码输入不一致')
      return
    }

    setSubmitting(true)
    try {
      const user = await api.register(email, password)
      onLogin(user)
      navigate('/')
    } catch (err: any) {
      setError(err.message || '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h1 className="page-title" style={{ marginBottom: 8 }}>加入时光邮局</h1>
        <p className="auth-subtitle">注册，给未来的自己写封信</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">密码（至少6位）</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">确认密码</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入密码"
              required
            />
          </div>

          {error && <div className="error-text">{error}</div>}

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="auth-link">
          已有账号？<Link to="/login">直接登录</Link>
        </div>
      </div>
    </div>
  )
}
