import React, { useState } from 'react';
import { useAuth, User } from '../App';

const Auth: React.FC = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }

      const userData: User = data.user;
      login(data.token, userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundDecor}>
        <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5f0e8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#d7ccc8" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <polygon points="100,100 160,130 130,180 80,160" fill="url(#paperGrad)" />
          <polygon points="650,150 710,180 680,230 630,210" fill="url(#paperGrad)" />
          <polygon points="150,450 210,480 180,530 130,510" fill="url(#paperGrad)" />
          <polygon points="600,420 660,450 630,500 580,480" fill="url(#paperGrad)" />
          <polygon points="400,80 440,100 420,140 380,125" fill="url(#paperGrad)" />
        </svg>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.titleMain}>影光</div>
          <div style={styles.titleSub}>· 折 纸 茶 馆 ·</div>
          <div style={styles.titleEn}>Shadow & Origami Teahouse</div>
        </div>

        <div style={styles.tabBar}>
          <div
            style={{
              ...styles.tab,
              ...(isLogin ? styles.tabActive : {}),
            }}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            登 入 茶 舍
          </div>
          <div
            style={{
              ...styles.tab,
              ...(!isLogin ? styles.tabActive : {}),
            }}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            新 客 注 册
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>茶客名号</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              style={styles.input}
              autoComplete="username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>密语印信</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              style={styles.input}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span style={{ marginRight: '8px' }}>⚠</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            style={{
              ...styles.submitBtn,
              ...(loading || !username || !password ? styles.submitBtnDisabled : {}),
            }}
          >
            {loading ? '进舍中...' : isLogin ? '推 门 入 舍' : '落 户 登 记'}
          </button>

          <div style={styles.hint}>
            {isLogin
              ? '初次来访？请点击上方「新客注册」'
              : '已有账号？请点击上方「登入茶舍」'}
          </div>
        </form>

        <div style={styles.footerDecor}>
          <svg width="180" height="30" viewBox="0 0 180 30">
            <line x1="0" y1="15" x2="60" y2="15" stroke="#bcaaa4" strokeWidth="0.8" />
            <polygon points="90,6 98,15 90,24 82,15" fill="#bcaaa4" />
            <line x1="120" y1="15" x2="180" y2="15" stroke="#bcaaa4" strokeWidth="0.8" />
          </svg>
          <div style={styles.verse}>「一碗春水，千重翠影」</div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    background: 'radial-gradient(ellipse at center, #6d4c41 0%, #4e342e 60%, #3e2723 100%)',
  },
  backgroundDecor: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    opacity: 0.6,
  },
  card: {
    position: 'relative',
    width: 'min(420px, 90vw)',
    padding: '48px 40px 36px',
    background: 'linear-gradient(160deg, rgba(245,240,232,0.96) 0%, rgba(215,204,200,0.92) 100%)',
    borderRadius: '4px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5)',
    border: '1px solid rgba(93,64,55,0.2)',
    backdropFilter: 'blur(10px)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  titleMain: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#3e2723',
    letterSpacing: '0.5em',
    paddingLeft: '0.5em',
    textShadow: '2px 2px 0 rgba(188,170,164,0.5)',
  },
  titleSub: {
    fontSize: '1rem',
    color: '#6d4c41',
    marginTop: '8px',
    letterSpacing: '0.3em',
  },
  titleEn: {
    fontSize: '0.7rem',
    color: '#a1887f',
    marginTop: '6px',
    letterSpacing: '0.15em',
    fontStyle: 'italic',
  },
  tabBar: {
    display: 'flex',
    marginBottom: '28px',
    borderBottom: '2px solid rgba(93,64,55,0.15)',
  },
  tab: {
    flex: 1,
    textAlign: 'center',
    padding: '12px 0',
    fontSize: '0.95rem',
    color: '#8d6e63',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    transition: 'all 0.3s ease',
    letterSpacing: '0.1em',
  },
  tabActive: {
    color: '#3e2723',
    fontWeight: 600,
    borderBottomColor: '#5d4037',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    color: '#5d4037',
    letterSpacing: '0.15em',
    fontWeight: 500,
  },
  input: {
    padding: '12px 16px',
    fontSize: '0.95rem',
    border: '1.5px solid rgba(93,64,55,0.2)',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.7)',
    color: '#3e2723',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.3s ease',
  },
  errorBox: {
    padding: '10px 14px',
    background: 'rgba(211,47,47,0.08)',
    border: '1px solid rgba(211,47,47,0.2)',
    borderRadius: '3px',
    color: '#c62828',
    fontSize: '0.85rem',
  },
  submitBtn: {
    marginTop: '8px',
    padding: '14px 24px',
    fontSize: '1rem',
    border: 'none',
    borderRadius: '3px',
    background: 'linear-gradient(135deg, #5d4037 0%, #4e342e 100%)',
    color: '#f5f0e8',
    cursor: 'pointer',
    letterSpacing: '0.2em',
    fontWeight: 500,
    boxShadow: '0 6px 20px rgba(62,39,35,0.4)',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  submitBtnDisabled: {
    background: 'linear-gradient(135deg, #a1887f 0%, #8d6e63 100%)',
    cursor: 'not-allowed',
    opacity: 0.7,
    boxShadow: 'none',
  },
  hint: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#8d6e63',
    marginTop: '4px',
  },
  footerDecor: {
    marginTop: '28px',
    textAlign: 'center',
  },
  verse: {
    marginTop: '10px',
    fontSize: '0.85rem',
    color: '#6d4c41',
    letterSpacing: '0.2em',
    fontStyle: 'italic',
  },
};

export default Auth;
