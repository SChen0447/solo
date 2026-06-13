import { useRef, useState, useEffect, useCallback } from 'react';
import gsap from 'gsap';

interface PostcardViewerProps {
  accessCode: string;
  onBack: () => void;
}

interface Line {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface PostcardData {
  id: string;
  imageData: string;
  lines: Line[];
  emotion: string | null;
  viewCount: number;
  maxViews: number;
  remainingViews: number;
  shouldBurn: boolean;
  isBurned?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

const EMOTION_COLORS: Record<string, string> = {
  happy: '#fbbf24',
  sad: '#60a5fa',
  surprise: '#f472b6',
  calm: '#34d399',
  passionate: '#ef4444',
  mysterious: '#8b5cf6',
};

function PostcardViewer({ accessCode, onBack }: PostcardViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<PostcardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBurning, setIsBurning] = useState(false);
  const [isGone, setIsGone] = useState(false);
  const breatheAnimRef = useRef<gsap.core.Tween | null>(null);
  const pulseAnimRef = useRef<gsap.core.Timeline | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const breatheIntensity = useRef({ value: 1 });
  const pulseIntensity = useRef({ value: 0 });

  useEffect(() => {
    loadPostcard();
  }, [accessCode]);

  const loadPostcard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/postcards/code/${accessCode}`);
      if (res.ok) {
        const postcardData = await res.json();
        setData(postcardData);
        
        if (postcardData.imageData) {
          const img = new Image();
          img.onload = () => {
            bgImageRef.current = img;
            drawPostcard();
            startAnimations();
            if (postcardData.shouldBurn) {
              setTimeout(() => startBurnAnimation(), 500);
            }
          };
          img.src = postcardData.imageData;
        } else {
          drawPostcard();
          startAnimations();
          if (postcardData.shouldBurn) {
            setTimeout(() => startBurnAnimation(), 500);
          }
        }
      } else {
        const errData = await res.json();
        setError(errData.error || '加载失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const size = Math.min(rect.width * 0.8, rect.height * 0.75);
      return { width: size, height: size * 1.33 };
    }
    return { width: 400, height: 532 };
  }, []);

  const drawPostcard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getCanvasSize();
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.4 + 0.6 * breatheIntensity.current.value;

    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    if (bgImageRef.current) {
      const img = bgImageRef.current;
      const scale = Math.max(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.3)');
      gradient.addColorStop(1, 'rgba(30, 27, 75, 0.5)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    data.lines.forEach((line) => {
      if (line.points.length < 2) return;
      
      ctx.save();
      ctx.shadowColor = line.color;
      ctx.shadowBlur = line.width < 5 ? 2 : 3;
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });

    if (data.emotion) {
      const emotionColor = EMOTION_COLORS[data.emotion];
      if (emotionColor) {
        const saturation = 1 + pulseIntensity.current.value * 0.1;
        
        ctx.save();
        ctx.globalCompositeOperation = 'hue';
        ctx.fillStyle = emotionColor;
        ctx.globalAlpha = 0.15 * saturation;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [data, getCanvasSize]);

  const startAnimations = () => {
    breatheAnimRef.current = gsap.to(breatheIntensity.current, {
      value: 0,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      onUpdate: () => {
        drawPostcard();
      },
    });

    pulseAnimRef.current = gsap.timeline({ repeat: -1 });
    pulseAnimRef.current.to(pulseIntensity.current, {
      value: 1,
      duration: 0.6,
      ease: 'sine.inOut',
    });
    pulseAnimRef.current.to(pulseIntensity.current, {
      value: -1,
      duration: 0.6,
      ease: 'sine.inOut',
    });
    pulseAnimRef.current.eventCallback('onUpdate', () => {
      drawPostcard();
    });
  };

  const startBurnAnimation = () => {
    setIsBurning(true);
    
    if (breatheAnimRef.current) breatheAnimRef.current.pause();
    if (pulseAnimRef.current) pulseAnimRef.current.pause();

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    gsap.to({}, {
      duration: 3,
      onUpdate: function() {
        const progress = this.progress();
        applyBurnEffect(progress);
      },
      onComplete: () => {
        initParticles();
        startParticleAnimation();
      },
    });
  };

  const applyBurnEffect = (progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    
    drawPostcard();

    const burnIntensity = progress;
    
    const edgeGradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.3,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    edgeGradient.addColorStop(0, 'rgba(249, 115, 22, 0)');
    edgeGradient.addColorStop(0.5, `rgba(249, 115, 22, ${burnIntensity * 0.5})`);
    edgeGradient.addColorStop(1, `rgba(239, 68, 68, ${burnIntensity * 0.8})`);
    
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = edgeGradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(249, 115, 22, ${burnIntensity * 0.3})`;
    ctx.fillRect(0, 0, width, height);

    if (progress > 0.5) {
      const fadeProgress = (progress - 0.5) * 2;
      ctx.fillStyle = `rgba(15, 23, 42, ${fadeProgress * 0.5})`;
      ctx.fillRect(0, 0, width, height);
    }
  };

  const initParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const particles: Particle[] = [];
    const colors = ['#f97316', '#ef4444', '#fbbf24', '#fcd34d'];
    
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 6 + 2,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
      });
    }
    
    particlesRef.current = particles;
  };

  const startParticleAnimation = () => {
    const particlesCanvas = particlesCanvasRef.current;
    const sourceCanvas = canvasRef.current;
    if (!particlesCanvas || !sourceCanvas) return;
    
    particlesCanvas.width = sourceCanvas.width;
    particlesCanvas.height = sourceCanvas.height;
    
    const ctx = particlesCanvas.getContext('2d');
    if (!ctx) return;

    const startTime = Date.now();
    const duration = 3000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      ctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
      
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life = 1 - progress;
        
        if (p.life > 0) {
          ctx.save();
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        gsap.to(particlesCanvas, {
          opacity: 0,
          duration: 0.3,
          onComplete: () => {
            setIsGone(true);
          },
        });
      }
    };
    
    animate();
  };

  useEffect(() => {
    return () => {
      if (breatheAnimRef.current) breatheAnimRef.current.kill();
      if (pulseAnimRef.current) pulseAnimRef.current.kill();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (data && !isBurning) {
        drawPostcard();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, isBurning, drawPostcard]);

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '0.5px solid rgba(167, 139, 250, 0.4)',
          color: '#c4b5fd',
          padding: '10px 20px',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '14px',
          zIndex: 10,
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          gsap.to(e.currentTarget, { scale: 1.05, duration: 0.2 });
        }}
        onMouseLeave={(e) => {
          gsap.to(e.currentTarget, { scale: 1, duration: 0.2 });
        }}
      >
        ← 返回首页
      </button>

      {loading && (
        <div style={{ color: '#a78bfa', fontSize: '16px' }}>加载中...</div>
      )}

      {error && (
        <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😢</div>
          <p style={{ color: '#f87171', marginBottom: '16px' }}>{error}</p>
          <button className="btn-glow" onClick={onBack}>返回首页</button>
        </div>
      )}

      {isGone && (
        <div style={{
          textAlign: 'center',
          color: '#a78bfa',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✨</div>
          <p style={{ fontSize: '18px' }}>这张明信片已随风而逝...</p>
          <p style={{ fontSize: '13px', opacity: 0.6, marginTop: '8px' }}>每张明信片最多只能被查看5次</p>
        </div>
      )}

      {data && !isGone && (
        <div style={{ 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}>
          <div style={{
            position: 'relative',
            borderRadius: '16px',
            boxShadow: data.emotion 
              ? `0 0 60px ${EMOTION_COLORS[data.emotion]}30`
              : '0 0 40px rgba(167, 139, 250, 0.2)',
          }}>
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                borderRadius: '16px',
                opacity: isBurning ? 0 : 1,
                transition: isBurning ? 'opacity 0.5s ease' : 'none',
              }}
            />
            <canvas
              ref={particlesCanvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                borderRadius: '16px',
              }}
            />
          </div>

          {!isBurning && data.remainingViews !== undefined && (
            <div style={{
              fontSize: '13px',
              color: '#a78bfa',
              opacity: 0.7,
            }}>
              还可查看 {data.remainingViews} 次
            </div>
          )}
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '20px',
        fontSize: '12px',
        color: '#6366f1',
        opacity: 0.4,
      }}>
        访问码: {accessCode.toUpperCase()}
      </div>
    </div>
  );
}

export default PostcardViewer;
