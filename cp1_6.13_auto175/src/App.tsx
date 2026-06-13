import { useState, useEffect, useCallback, useRef } from 'react';
import Jellyfish from './components/Jellyfish';
import Controls from './components/Controls';

export interface TentacleJoint {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
}

export interface Tentacle {
  joints: TentacleJoint[];
}

export interface JellyfishStateData {
  userId: string;
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  feedCount: number;
  mood: number;
  bodyColor: string;
  glowColor: string;
  velocityX: number;
  velocityY: number;
  directionTimer: number;
  tentacles: Tentacle[];
  lastSaved: number;
}

const COLORS = [
  '#ff6b9d', '#ff9f43', '#feca57', '#48dbfb',
  '#0abde3', '#5f27cd', '#341f97', '#ff6b6b',
  '#ee5253', '#10ac84', '#1dd1a1', '#c8d6e5'
];

function generateTentacles(baseRadius: number): Tentacle[] {
  const count = 8 + Math.floor(Math.random() * 5);
  const tentacles: Tentacle[] = [];
  for (let i = 0; i < count; i++) {
    const jointCount = 5 + Math.floor(Math.random() * 3);
    const angle = (i / count) * Math.PI * 2;
    const startX = Math.cos(angle) * baseRadius * 0.7;
    const startY = Math.sin(angle) * baseRadius * 0.3 + baseRadius * 0.5;
    const joints: TentacleJoint[] = [];
    for (let j = 0; j < jointCount; j++) {
      const t = (j + 1) / jointCount;
      const jx = startX + Math.cos(angle) * t * baseRadius * 1.5 + (Math.random() - 0.5) * 10;
      const jy = startY + t * baseRadius * 2 + (Math.random() - 0.5) * 8;
      joints.push({ x: jx, y: jy, baseX: jx, baseY: jy });
    }
    tentacles.push({ joints });
  }
  return tentacles;
}

function createInitialState(userId: string, canvasWidth: number, canvasHeight: number): JellyfishStateData {
  const baseRadius = 30 + Math.random() * 20;
  return {
    userId,
    x: canvasWidth / 2,
    y: canvasHeight * 0.4,
    radius: baseRadius,
    baseRadius,
    feedCount: 0,
    mood: 100,
    bodyColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    glowColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    velocityX: (Math.random() - 0.5) * 2,
    velocityY: (Math.random() - 0.5) * 2,
    directionTimer: 0,
    tentacles: generateTentacles(baseRadius),
    lastSaved: Date.now()
  };
}

function App() {
  const [userId, setUserId] = useState<string>('');
  const [inputName, setInputName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [jellyfishState, setJellyfishState] = useState<JellyfishStateData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const saveTimeoutRef = useRef<number | null>(null);

  const handleLogin = useCallback(async () => {
    const name = inputName.trim();
    if (!name) return;
    setUserId(name);
    try {
      const res = await fetch(`/api/load?userId=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.success && data.state) {
        setJellyfishState(data.state);
      } else {
        const w = window.innerWidth;
        const h = window.innerHeight * 0.75;
        setJellyfishState(createInitialState(name, w, h));
      }
      setIsLoggedIn(true);
    } catch {
      const w = window.innerWidth;
      const h = window.innerHeight * 0.75;
      setJellyfishState(createInitialState(name, w, h));
      setIsLoggedIn(true);
    }
  }, [inputName]);

  const handleSave = useCallback(async (state: JellyfishStateData) => {
    if (!userId) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, state })
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg('保存成功 ✓');
      } else {
        setSaveMsg('保存失败');
      }
    } catch {
      setSaveMsg('网络错误');
    } finally {
      setSaving(false);
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => setSaveMsg(''), 2000);
    }
  }, [userId]);

  const handleBodyColorChange = useCallback((color: string) => {
    setJellyfishState(prev => prev ? { ...prev, bodyColor: color } : prev);
  }, []);

  const handleGlowColorChange = useCallback((color: string) => {
    setJellyfishState(prev => prev ? { ...prev, glowColor: color } : prev);
  }, []);

  const handleStateUpdate = useCallback((updater: (prev: JellyfishStateData) => JellyfishStateData) => {
    setJellyfishState(prev => prev ? updater(prev) : prev);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !jellyfishState) return;
    const handler = () => {
      navigator.sendBeacon?.(
        '/api/save',
        JSON.stringify({ userId, state: jellyfishState })
      );
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isLoggedIn, jellyfishState, userId]);

  if (!isLoggedIn) {
    return (
      <div style={loginContainerStyle}>
        <div style={loginCardStyle}>
          <div style={logoStyle}>
            <svg width="80" height="80" viewBox="0 0 100 100">
              <defs>
                <radialGradient id="logoGrad" cx="50%" cy="40%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#00bcd4" stopOpacity="0.3" />
                </radialGradient>
              </defs>
              <ellipse cx="50" cy="40" rx="32" ry="26" fill="url(#logoGrad)" />
              <path d="M28 55 Q25 75 22 95 M36 60 Q34 80 36 98 M46 62 Q45 82 48 99 M54 62 Q55 82 52 99 M64 60 Q66 80 64 98 M72 55 Q75 75 78 95" 
                stroke="#00bcd4" strokeWidth="2" fill="none" strokeOpacity="0.6" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={titleStyle}>流光水母</h1>
          <p style={subtitleStyle}>领养一只专属于你的深海精灵</p>
          <input
            style={inputStyle}
            type="text"
            placeholder="输入你的用户名"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button style={btnStyle} onClick={handleLogin}>
            进入深海
          </button>
          <p style={tipStyle}>输入用户名即可登录，新用户自动领养水母</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {jellyfishState && (
        <Jellyfish
          state={jellyfishState}
          onStateUpdate={handleStateUpdate}
          userId={userId}
        />
      )}
      {jellyfishState && (
        <Controls
          mood={jellyfishState.mood}
          feedCount={jellyfishState.feedCount}
          radius={jellyfishState.radius}
          baseRadius={jellyfishState.baseRadius}
          bodyColor={jellyfishState.bodyColor}
          glowColor={jellyfishState.glowColor}
          colors={COLORS}
          userId={userId}
          saving={saving}
          saveMsg={saveMsg}
          onBodyColorChange={handleBodyColorChange}
          onGlowColorChange={handleGlowColorChange}
          onSave={() => jellyfishState && handleSave(jellyfishState)}
        />
      )}
    </div>
  );
}

const loginContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  background: 'radial-gradient(ellipse at center, #0b1d3a 0%, #020a1a 100%)',
  position: 'relative',
  overflow: 'hidden'
};

const loginCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '20px',
  padding: '48px 40px',
  backdropFilter: 'blur(20px)',
  textAlign: 'center',
  boxShadow: '0 8px 40px rgba(0, 188, 212, 0.15)',
  maxWidth: '400px',
  width: '90%',
  transition: 'all 0.3s ease'
};

const logoStyle: React.CSSProperties = {
  marginBottom: '24px',
  filter: 'drop-shadow(0 0 20px rgba(0, 188, 212, 0.5))'
};

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  background: 'linear-gradient(135deg, #48dbfb, #00bcd4, #5f27cd)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  marginBottom: '8px'
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255, 255, 255, 0.5)',
  marginBottom: '32px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 18px',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '15px',
  outline: 'none',
  marginBottom: '16px',
  transition: 'all 0.3s ease'
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 24px',
  borderRadius: '12px',
  border: 'none',
  background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.3), rgba(95, 39, 205, 0.3))',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  marginBottom: '16px'
};

const tipStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255, 255, 255, 0.35)'
};

export default App;
