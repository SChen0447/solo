import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authApi } from '../api';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const user = mode === 'login'
        ? await authApi.login(username.trim(), password)
        : await authApi.register(username.trim(), password);
      login(user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="stars-bg"></div>
      <div className="login-container">
        <div className="login-logo">
          <div className="logo-star">✦</div>
          <h1>星尘胶囊</h1>
          <p>埋藏此刻，寄往未来</p>
        </div>

        <div className="login-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            登录
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '处理中...' : mode === 'login' ? '进入星图' : '创建账号'}
          </button>
        </form>
      </div>
    </div>
  );
}
