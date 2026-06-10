import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360);
    }, 8000 / 360);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/api/register' : '/api/login';
      const res = await axios.post(endpoint, { username, password });
      if (res.data.success) {
        onLogin(res.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '操作失败');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #120a2a 0%, #0a1630 50%, #120a2a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          border: 'none',
          background: `conic-gradient(from ${rotation}deg, transparent 0deg, #ddddee30 30deg, #ddddee60 60deg, #ddddeeaa 90deg, #ddddee60 120deg, #ddddee30 150deg, transparent 180deg, transparent 360deg)`,
          padding: '20px',
          boxShadow: '0 0 60px #ddddee33, inset 0 0 40px #ddddee22',
          animation: 'float 6s ease-in-out infinite'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #0a0815 0%, #050210 70%, #000 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <form onSubmit={handleSubmit} style={{ width: '100%', textAlign: 'center' }}>
            <h2
              style={{
                color: '#fff',
                fontSize: '22px',
                fontWeight: '700',
                marginBottom: '24px',
                letterSpacing: '3px',
                textShadow: '0 0 20px #aa88ff88'
              }}
            >
              {isRegister ? '注册账户' : '星尘登录'}
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: `1.5px solid ${focusedField === 'username' ? '#ff88aa' : '#8888aa'}`,
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedField === 'username' ? '0 0 15px #ff88aa55' : 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: `1.5px solid ${focusedField === 'password' ? '#ff88aa' : '#8888aa'}`,
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedField === 'password' ? '0 0 15px #ff88aa55' : 'none'
                }}
              />
            </div>

            {error && (
              <div style={{ color: '#ff4466', fontSize: '12px', marginBottom: '12px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #aa88ff, #ff88aa)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '700',
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: '2px',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 0 #aa88ff00'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 25px #aa88ff88, 0 0 50px #ff88aa44';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {isRegister ? '立即注册' : '进入星界'}
            </button>

            <div
              style={{
                marginTop: '16px',
                fontSize: '12px',
                color: '#aaaacc',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }}
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ff88aa')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#aaaacc')}
            >
              {isRegister ? '已有账户？去登录' : '还没有账户？注册一个'}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
