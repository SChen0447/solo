import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'

interface Props {
  onLogin: (user: { id: string; email: string }) => void
}

export default function Login({ onLogin }: Props) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const user = await api.login(email, password)
      onLogin(user)
      navigate('/')
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h1 className="page-title" style={{ marginBottom: 8 }}>时光邮局</h1>
        <p className="auth-subtitle">登录，开启你的时间之旅</p>

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
            <label className="form-label">密码</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          {error && <div className="error-text">{error}</div>}

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="auth-link">
          还没有账号？<Link to="/register">立即注册</Link>
        </div>
      </div>
    </div>
  )
}
