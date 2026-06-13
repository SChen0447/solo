import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authApi.login(password);
      if (result.success) {
        localStorage.setItem('auth_token', result.token);
        onLogin();
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败，请检查密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page page-transition">
      <div className="login-card glass-card">
        <div className="login-icon">🔒</div>
        <h1>管理后台登录</h1>
        <p className="login-subtitle">请输入管理员密码</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoFocus
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button
            type="submit"
            className="btn-primary login-btn"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        
        <p className="login-hint">默认密码: admin123</p>
      </div>
    </div>
  );
}
