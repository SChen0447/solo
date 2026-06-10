import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppToast } from '../App';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) {
      showToast('登录成功！');
      navigate('/dashboard');
    } else {
      setError('用户名或密码错误');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">📔 数字手账</h1>
        <p className="auth-subtitle">记录每一天的美好时光</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="label">用户名</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoFocus
            />
          </div>
          <div>
            <label className="label">密码</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>
          <div className="auth-error">{error}</div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="auth-switch">
          还没有账号？<Link to="/register">立即注册</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#5a4a3a', opacity: 0.6 }}>
          测试账号: admin / password123
        </p>
      </div>
    </div>
  );
};

export default Login;
