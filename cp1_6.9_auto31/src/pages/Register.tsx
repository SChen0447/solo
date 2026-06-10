import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppToast } from '../App';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('用户名和密码不能为空');
      return;
    }
    if (password !== confirmPwd) {
      setError('两次密码输入不一致');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    setLoading(true);
    const ok = await register(username, password);
    setLoading(false);
    if (ok) {
      showToast('注册成功！');
      navigate('/dashboard');
    } else {
      setError('注册失败，用户名可能已存在');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">📔 数字手账</h1>
        <p className="auth-subtitle">创建账号，开启手账之旅</p>
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
              placeholder="至少6位"
            />
          </div>
          <div>
            <label className="label">确认密码</label>
            <input
              type="password"
              className="input"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="再次输入密码"
            />
          </div>
          <div className="auth-error">{error}</div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="auth-switch">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
