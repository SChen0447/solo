import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, saveAuth } from '../utils/api';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login(username, password);
      if (response.token && response.user) {
        saveAuth(response.token, response.user);
        onLogin(response.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="stars-bg"></div>
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="app-title-auth">光语·记忆琥珀</h1>
          <p className="auth-subtitle">封存时光，等待未来的回响</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>用户名 / 邮箱</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名或邮箱"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                className="form-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
              {isLoading ? (
                <span className="btn-loading">
                  <span className="mini-spinner"></span>
                  登录中...
                </span>
              ) : (
                '登 录'
              )}
            </button>
          </form>

          <div className="auth-footer">
            还没有账号？{' '}
            <Link to="/register" className="auth-link">
              立即注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
