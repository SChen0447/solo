import { useRef, useState, useEffect, useCallback } from 'react';
import type { ParticlePoint, LetterDetail } from '../types';
import './LetterViewer.css';

interface LetterViewerProps {
  letterId: string;
  onBack: () => void;
  onBurned: () => void;
}

interface AnimParticle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  opacity: number;
  progress: number;
  speed: number;
  pointIndex: number;
}

interface BurnParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

type ViewState = 'loading' | 'password' | 'playing' | 'burning' | 'burned' | 'error';

function LetterViewer({ letterId, onBack, onBurned }: LetterViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const animParticlesRef = useRef<AnimParticle[]>([]);
  const burnParticlesRef = useRef<BurnParticle[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [letterInfo, setLetterInfo] = useState<{ title: string; remainingOpens: number } | null>(null);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [lightTrack, setLightTrack] = useState<ParticlePoint[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  const playStartTimeRef = useRef(0);
  const burnStartTimeRef = useRef(0);
  const trackRef = useRef<ParticlePoint[]>([]);
  const audioDataRef = useRef<string>('');

  useEffect(() => {
    const fetchLetter = async () => {
      try {
        const res = await fetch(`/api/letters/${letterId}`);
        if (res.status === 410) {
          setViewState('burned');
          return;
        }
        if (!res.ok) {
          setViewState('error');
          setErrorMsg('信笺不存在');
          return;
        }
        const data = await res.json();
        setLetterInfo(data);
        setViewState('password');
      } catch (err) {
        setViewState('error');
        setErrorMsg('网络错误');
      }
    };

    fetchLetter();
  }, [letterId]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const width = Math.max(400, Math.min(containerWidth, 800));
        const height = Math.max(300, width * 0.6);
        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [viewState]);

  const renderPlaying = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = Date.now();
    const elapsed = now - playStartTimeRef.current;
    const track = trackRef.current;

    ctx.fillStyle = 'rgba(21, 23, 43, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (track.length > 0) {
      const totalDuration = 5000;
      const progress = Math.min(1, elapsed / totalDuration);

      const activePointCount = Math.floor(track.length * progress);
      const currentPoints = track.slice(0, activePointCount);

      currentPoints.forEach((point, i) => {
        const age = elapsed - (point.timestamp / track[track.length - 1].timestamp) * totalDuration;
        const fadeTime = 1000;
        let alpha = point.opacity;

        if (age > 0 && age < fadeTime) {
          alpha = point.opacity * (1 - age / fadeTime);
        } else if (age >= fadeTime) {
          alpha = 0;
        }

        if (alpha > 0) {
          const size = point.size * (0.8 + 0.2 * Math.sin(now / 200 + i));
          ctx.beginPath();
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fillStyle = point.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
          ctx.shadowBlur = size * 2.5;
          ctx.shadowColor = point.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      if (progress >= 1 && animParticlesRef.current.length === 0) {
        setTimeout(() => {
          setLetterInfo((prev) => prev ? { ...prev, remainingOpens: prev.remainingOpens - 1 } : prev);
        }, 500);
      }
    }

    if (elapsed < 7000) {
      animationRef.current = requestAnimationFrame(renderPlaying);
    }
  }, []);

  const startPlayback = (track: ParticlePoint[], audioData: string | null) => {
    trackRef.current = track;
    if (audioData) {
      audioDataRef.current = audioData;
      const audio = new Audio(audioData);
      audioRef.current = audio;
      audio.play().catch((err) => console.error('音频播放失败:', err));
    }

    setLightTrack(track);
    setViewState('playing');
    playStartTimeRef.current = Date.now();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#15172b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    animationRef.current = requestAnimationFrame(renderPlaying);
  };

  const startBurning = useCallback(() => {
    setViewState('burning');
    burnStartTimeRef.current = Date.now();
    burnParticlesRef.current = [];

    const canvas = canvasRef.current;
    if (!canvas) return;

    const burnColors = ['#ff6b35', '#ff8c00', '#ffd700', '#ff4500', '#ff6347'];

    for (let i = 0; i < 200; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x, y;

      switch (edge) {
        case 0:
          x = Math.random() * canvas.width;
          y = 0;
          break;
        case 1:
          x = canvas.width;
          y = Math.random() * canvas.height;
          break;
        case 2:
          x = Math.random() * canvas.width;
          y = canvas.height;
          break;
        default:
          x = 0;
          y = Math.random() * canvas.height;
      }

      burnParticlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2 - 1,
        color: burnColors[Math.floor(Math.random() * burnColors.length)],
        size: 2 + Math.random() * 4,
        life: 1,
        maxLife: 1500 + Math.random() * 1000,
      });
    }

    const renderBurn = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const elapsed = Date.now() - burnStartTimeRef.current;
      const burnProgress = Math.min(1, elapsed / 2000);

      ctx.fillStyle = `rgba(21, 23, 43, ${0.05 + burnProgress * 0.1})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      burnParticlesRef.current = burnParticlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.02;
        p.life -= 16 / p.maxLife;

        if (p.life <= 0) return false;

        const alpha = p.life;
        const size = p.size * (0.5 + p.life * 0.5);

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.shadowBlur = size * 2;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        return true;
      });

      if (burnProgress < 1 || burnParticlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(renderBurn);
      } else {
        setViewState('burned');
        onBurned();
      }
    };

    animationRef.current = requestAnimationFrame(renderBurn);
  }, [onBurned]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (viewState === 'burning') {
      return;
    }

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [viewState]);

  const handleVerifyPassword = async () => {
    if (!password || isVerifying) return;

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/letters/${letterId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        startPlayback(data.lightTrack, data.audioData);
      } else if (data.burned) {
        setErrorMsg(data.error);
        startBurning();
      } else {
        setRemainingAttempts(data.remainingAttempts || 0);
        setErrorMsg(data.error || '密码错误');
      }
    } catch (err) {
      setErrorMsg('验证失败，请重试');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerifyPassword();
    }
  };

  return (
    <div className="viewer-container">
      <button className="back-button" onClick={onBack}>
        ← 返回
      </button>

      <div className="viewer-content" ref={containerRef}>
        {viewState === 'loading' && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>加载信笺中...</p>
          </div>
        )}

        {viewState === 'error' && (
          <div className="error-state">
            <div className="error-icon">✕</div>
            <p>{errorMsg}</p>
            <button className="glow-button" onClick={onBack}>
              返回列表
            </button>
          </div>
        )}

        {viewState === 'password' && letterInfo && (
          <div className="password-panel">
            <h2 className="letter-title">{letterInfo.title}</h2>
            <div className="envelope-icon">✉</div>
            <p className="password-hint">这封信被加密了，请输入密码</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入4-8位密码"
              className="password-input"
              autoFocus
              maxLength={8}
            />
            {errorMsg && <p className="error-text">{errorMsg}</p>}
            <p className="attempts-hint">
              剩余尝试次数: {remainingAttempts} / 3
            </p>
            <button
              className="glow-button"
              onClick={handleVerifyPassword}
              disabled={!password || isVerifying}
            >
              {isVerifying ? '验证中...' : '✦ 解锁信笺'}
            </button>
            <p className="remaining-opens">
              剩余打开次数: {letterInfo.remainingOpens}
            </p>
          </div>
        )}

        {(viewState === 'playing' || viewState === 'burning') && (
          <div className="playback-panel">
            <h2 className="letter-title">{letterInfo?.title}</h2>
            <div className="canvas-wrapper-viewer">
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="playback-canvas"
              />
            </div>
            {viewState === 'playing' && (
              <p className="playback-hint">光信笺正在为你展开...</p>
            )}
            {viewState === 'burning' && (
              <p className="burning-hint">🔥 信笺正在燃烧...</p>
            )}
          </div>
        )}

        {viewState === 'burned' && (
          <div className="burned-state">
            <div className="burned-icon">🔥</div>
            <h2>信笺已化为灰烬</h2>
            <p>这封信已经完成了它的使命</p>
            <button className="glow-button" onClick={onBack}>
              返回列表
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LetterViewer;
