import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { User, PostcardData } from '../App';

interface CardWallProps {
  user: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onCreateNew: () => void;
  onViewByCode: (code: string) => void;
  onEditCard: (card: PostcardData) => void;
}

const EMOTION_COLORS: Record<string, string> = {
  happy: '#fbbf24',
  sad: '#60a5fa',
  surprise: '#f472b6',
  calm: '#34d399',
  passionate: '#ef4444',
  mysterious: '#8b5cf6',
};

function CardWall({ user, onLogin, onLogout, onCreateNew, onViewByCode, onEditCard }: CardWallProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [postcards, setPostcards] = useState<PostcardData[]>([]);
  const [error, setError] = useState('');
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadPostcards();
    }
  }, [user]);

  useEffect(() => {
    if (cardsRef.current && postcards.length > 0) {
      gsap.fromTo(
        cardsRef.current.children,
        { opacity: 0, y: 20, scale: 0.9 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.5, 
          stagger: 0.08,
          ease: 'back.out(1.2)'
        }
      );
    }
  }, [postcards.length]);

  const loadPostcards = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/postcards/user/${user.userId}`);
      if (res.ok) {
        const data = await res.json();
        setPostcards(data);
      }
    } catch (err) {
      console.error('加载明信片失败', err);
    }
  };

  const handleAuth = async () => {
    setError('');
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data);
        setShowLogin(false);
        setUsername('');
        setPassword('');
      } else {
        setError(data.error || '操作失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  };

  const handleViewCode = () => {
    if (accessCode.trim().length === 8) {
      onViewByCode(accessCode.trim().toUpperCase());
    }
  };

  const getEmotionColor = (emotion: string | null) => {
    if (!emotion) return 'rgba(167, 139, 250, 0.3)';
    return EMOTION_COLORS[emotion] || 'rgba(167, 139, 250, 0.3)';
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
      position: 'relative',
      overflowY: 'auto',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '20px',
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 300,
            color: '#fff',
            textShadow: '0 0 20px rgba(167, 139, 250, 0.5)',
          }}>
            ✦ 光影明信片
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input-glow"
              placeholder="输入8位访问码"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleViewCode()}
              style={{ width: '200px' }}
              maxLength={8}
            />
            <button className="btn-glow" onClick={handleViewCode}>查看</button>
            
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#c4b5fd' }}>{user.username}</span>
                <button className="btn-glow" onClick={onLogout}>退出</button>
              </div>
            ) : (
              <button className="btn-glow" onClick={() => setShowLogin(true)}>登录 / 注册</button>
            )}
          </div>
        </div>

        {user ? (
          <div 
            className="glass"
            style={{
              padding: '30px',
              minHeight: '500px',
            }}
          >
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 400, color: '#e9d5ff' }}>
                我的明信片 ({postcards.length})
              </h2>
              {postcards.length > 0 && (
                <span style={{ fontSize: '13px', color: '#a78bfa', opacity: 0.7 }}>
                  点击卡片可编辑
                </span>
              )}
            </div>
            
            {postcards.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#a78bfa',
                opacity: 0.6,
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
                <p>还没有明信片，点击右下角按钮创建第一张吧</p>
              </div>
            ) : (
              <div 
                ref={cardsRef}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '20px',
                }}
              >
                {postcards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => onEditCard(card)}
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.03)',
                      border: `0.5px solid ${getEmotionColor(card.emotion)}`,
                      boxShadow: `0 0 15px ${getEmotionColor(card.emotion)}`,
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      gsap.to(e.currentTarget, { scale: 1.05, duration: 0.3, ease: 'power2.out' });
                    }}
                    onMouseLeave={(e) => {
                      gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'power2.out' });
                    }}
                  >
                    <div style={{
                      aspectRatio: '3/4',
                      background: card.imageData 
                        ? `url(${card.imageData}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(135deg, ${getEmotionColor(card.emotion)}20 0%, transparent 100%)`,
                      }} />
                      {!card.imageData && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '36px',
                          opacity: 0.5,
                        }}>
                          ✨
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.8)' }}>
                      <div style={{ fontSize: '12px', color: '#c4b5fd', marginBottom: '4px' }}>
                        访问码: {card.accessCode}
                      </div>
                      <div style={{ fontSize: '11px', color: '#818cf8', opacity: 0.7 }}>
                        {card.viewCount}/{card.maxViews} 次查看
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="glass" style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>💌</div>
            <h2 style={{ fontSize: '24px', color: '#e9d5ff', marginBottom: '12px' }}>
              创造属于你的光影明信片
            </h2>
            <p style={{ color: '#a78bfa', opacity: 0.7, marginBottom: '24px' }}>
              用手写、照片和情绪，制作会呼吸的动态明信片，分享给特别的人
            </p>
            <button className="btn-glow" onClick={() => setShowLogin(true)}>
              开始创作
            </button>
          </div>
        )}
      </div>

      {user && (
        <button className="floating-btn" onClick={onCreateNew}>
          +
        </button>
      )}

      {showLogin && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
        }} onClick={() => setShowLogin(false)}>
          <div 
            className="glass"
            style={{
              padding: '40px',
              width: '360px',
              maxWidth: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              fontSize: '24px', 
              color: '#e9d5ff', 
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              {isRegister ? '注册账号' : '登录'}
            </h3>
            
            {error && (
              <div style={{
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '12px',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                className="input-glow"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                className="input-glow"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                style={{ width: '100%' }}
              />
            </div>
            
            <button 
              className="btn-glow" 
              onClick={handleAuth}
              style={{ width: '100%', marginBottom: '12px' }}
            >
              {isRegister ? '注册' : '登录'}
            </button>
            
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#a78bfa' }}>
              {isRegister ? '已有账号？' : '没有账号？'}
              <span 
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                style={{ color: '#c4b5fd', cursor: 'pointer', marginLeft: '4px' }}
              >
                {isRegister ? '去登录' : '去注册'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardWall;
