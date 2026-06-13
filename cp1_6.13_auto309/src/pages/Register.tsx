import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, saveAuth } from '../utils/api';
import { User } from '../types';

interface RegisterProps {
  onRegister: (user: User) => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.register(username, email, password);
      if (response.token && response.user) {
        saveAuth(response.token, response.user);
        onRegister(response.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || '注册失败，请重试');
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
          <p className="auth-subtitle">创建账号，开启时光之旅</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名（最多20字）"
                maxLength={20}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
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
                placeholder="请输入密码（至少6位）"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                required
                className="form-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
              {isLoading ? (
                <span className="btn-loading">
                  <span className="mini-spinner"></span>
                  注册中...
                </span>
              ) : (
                '注 册'
              )}
            </button>
          </form>

          <div className="auth-footer">
            已有账号？{' '}
            <Link to="/login" className="auth-link">
              立即登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
