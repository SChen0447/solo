import { useState } from 'react';
import { useApp } from '../context/AppContext';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useApp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    if (mode === 'login') {
      const ok = login(username.trim(), password);
      if (!ok) setError('用户名或密码错误');
    } else {
      const ok = register(username.trim(), password);
      if (!ok) setError('用户名已存在');
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: 40,
        margin: 20,
        background: 'rgba(44, 62, 80, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            fontSize: 28,
            fontWeight: 300,
            color: '#f5f0e8',
            letterSpacing: 3,
            marginBottom: 8
          }}>
            虚拟策展人
          </div>
          <div style={{
            fontSize: 13,
            color: 'rgba(245,240,232,0.5)',
            letterSpacing: 1
          }}>
            Virtual Curator
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 28,
          padding: 4,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 12
        }}>
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1,
                padding: '10px 0',
                background: mode === m ? '#4a90d9' : 'transparent',
                color: mode === m ? 'white' : 'rgba(245,240,232,0.6)',
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 14,
                boxShadow: mode === m ? '0 4px 12px rgba(74,144,217,0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {m === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          {error && (
            <div style={{
              fontSize: 13,
              color: '#e74c3c',
              padding: '8px 12px',
              background: 'rgba(231,76,60,0.1)',
              borderRadius: 8,
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          <button type="submit" style={{ width: '100%', padding: '12px 0', marginTop: 8 }}>
            {mode === 'login' ? '登 录' : '注 册'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 13,
          color: 'rgba(245,240,232,0.5)'
        }}>
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <span
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{
              color: '#4a90d9',
              cursor: 'pointer',
              marginLeft: 4
            }}
          >
            {mode === 'login' ? '立即注册' : '去登录'}
          </span>
        </div>
      </div>
    </div>
  );
}
