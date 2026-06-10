import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../utils/api';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const api = isRegister ? authApi.register : authApi.login;
      const { token, user } = await api(username.trim(), password);
      login(token, user);
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a14 70%, #050510 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '20%', left: '15%',
        width: 300, height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,170,102,0.15) 0%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'breathe 4s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%', right: '10%',
        width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(102,170,255,0.15) 0%, transparent 70%)',
        filter: 'blur(50px)',
        animation: 'breathe 5s ease-in-out infinite reverse'
      }} />

      <div className="card" style={{
        width: 400,
        position: 'relative',
        zIndex: 1,
        padding: 40,
        background: 'rgba(26, 26, 46, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(68, 85, 170, 0.4)',
        boxShadow: '0 0 60px rgba(102, 170, 255, 0.1), inset 0 0 40px rgba(68, 85, 170, 0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ffaa66, #66aaff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8
          }}>
            虚拟数字藏品展览
          </h1>
          <p style={{ color: '#a0a0cc', fontSize: 14 }}>
            {isRegister ? '创建您的策展人账户' : '欢迎回来，策展人'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#a0a0cc' }}>
              用户名
            </label>
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#a0a0cc' }}>
              密码
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(255, 107, 157, 0.1)',
              border: '1px solid rgba(255, 107, 157, 0.3)',
              color: '#ff6b9d',
              fontSize: 13
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ padding: '12px 20px', marginTop: 6, fontSize: 15, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '处理中...' : (isRegister ? '注册账户' : '登录')}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#a0a0cc' }}>
          {isRegister ? '已有账户？' : '还没有账户？'}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#66aaff',
              cursor: 'pointer',
              marginLeft: 6,
              fontSize: 13,
              textDecoration: 'underline'
            }}
          >
            {isRegister ? '立即登录' : '立即注册'}
          </button>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(68, 85, 170, 0.2)', fontSize: 12, color: '#8080a0', textAlign: 'center' }}>
          演示账号：demo / demo123
        </div>
      </div>
    </div>
  );
}
