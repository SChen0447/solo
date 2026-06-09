import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Capsule } from '../types';
import { useAuth } from '../AuthContext';
import { capsuleApi } from '../api';

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  opacity: number;
  points: { x: number; y: number }[];
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  angle: number;
  radius: number;
  angularSpeed: number;
  expandSpeed: number;
}

interface Props {
  capsule: Capsule;
  onOpened: () => void;
  onBack: () => void;
  onReplied: (capsule: Capsule) => void;
}

type Phase = 'waiting' | 'shattering' | 'particles' | 'content' | 'replied';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function playWindChime(audioCtx: AudioContext) {
  const now = audioCtx.currentTime;
  const freqs = [1760, 1567.98, 2093, 1318.51, 1975.53];

  freqs.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;

    const startTime = now + i * 0.08;
    const duration = 1.5;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  });

  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freqs[i] * 2;
    const startTime = now + 0.5 + i * 0.15;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + 1.1);
  }
}

export default function CapsuleOpener({ capsule, onOpened, onBack, onReplied }: Props) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const phaseRef = useRef<Phase>('waiting');
  const shardsRef = useRef<Shard[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(0);
  const shatteredRef = useRef(false);
  const particlesInitedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>(capsule.isOpened ? 'content' : 'waiting');
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const isRecipient = user?.id === capsule.recipientId;

  const initShards = useCallback((cx: number, cy: number, color: string) => {
    const shards: Shard[] = [];
    const capsuleW = 200;
    const capsuleH = 280;
    const cols = 4;
    const rows = 4;
    const segW = capsuleW / cols;
    const segH = capsuleH / rows;
    const left = cx - capsuleW / 2;
    const top = cy - capsuleH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = left + c * segW;
        const sy = top + r * segH;
        const jitter = () => (Math.random() - 0.5) * 8;
        const points = [
          { x: sx + jitter(), y: sy + jitter() },
          { x: sx + segW + jitter(), y: sy + jitter() },
          { x: sx + segW + jitter(), y: sy + segH + jitter() },
          { x: sx + jitter(), y: sy + segH + jitter() }
        ];

        const angle = Math.atan2(sy + segH / 2 - cy, sx + segW / 2 - cx);
        const speed = 150 + Math.random() * 250;

        shards.push({
          x: sx + segW / 2,
          y: sy + segH / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 80,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 8,
          size: Math.max(segW, segH),
          opacity: 1,
          points: points.map(p => ({ x: p.x - (sx + segW / 2), y: p.y - (sy + segH / 2) })),
          color
        });
      }
    }
    return shards;
  }, []);

  const initParticles = useCallback((cx: number, cy: number, baseColor: string) => {
    const particles: Particle[] = [];
    const count = 80 + Math.floor(Math.random() * 41);
    const rgb = hexToRgb(baseColor);

    for (let i = 0; i < count; i++) {
      const hueShift = (Math.random() - 0.5) * 60;
      const r = Math.min(255, Math.max(0, rgb.r + hueShift));
      const g = Math.min(255, Math.max(0, rgb.g + hueShift * 0.5));
      const b = Math.min(255, Math.max(0, rgb.b + hueShift * 0.3));
      const color = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      const startAngle = Math.random() * Math.PI * 2;
      const startRadius = 10 + Math.random() * 30;

      particles.push({
        x: cx + Math.cos(startAngle) * startRadius,
        y: cy + Math.sin(startAngle) * startRadius,
        vx: 0,
        vy: 0,
        size: 2 + Math.random() * 3,
        color,
        alpha: 0,
        life: 0,
        maxLife: 4 + Math.random() * 3,
        angle: startAngle,
        radius: startRadius,
        angularSpeed: 1 + Math.random() * 2,
        expandSpeed: 30 + Math.random() * 50
      });
    }
    return particles;
  }, []);

  const startOpening = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    playWindChime(audioCtxRef.current);

    try {
      await capsuleApi.open(capsule.id);
      onOpened();
    } catch (e: any) {
      console.error(e);
    }

    phaseRef.current = 'shattering';
    setPhase('shattering');
    startTimeRef.current = performance.now();
    shatteredRef.current = false;
  }, [capsule.id, onOpened]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = container.clientWidth + 'px';
      canvas.style.height = container.clientHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const cx = () => container.clientWidth / 2;
    const cy = () => container.clientHeight / 2;
    const moodColor = capsule.moodColor;

    const animate = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const t = (performance.now() - startTimeRef.current) / 1000;

      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#0a0a1a');
      bgGrad.addColorStop(1, '#1a0f20');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 60; i++) {
        const bx = ((i * 173.1) % w + w) % w;
        const by = ((i * 97.7) % h + h) % h;
        const bt = (performance.now() / 1000 + i) % 3 / 3;
        ctx.fillStyle = `rgba(200,220,255,${0.3 + bt * 0.4})`;
        ctx.beginPath();
        ctx.arc(bx, by, 0.8 + (i % 2) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const currentPhase = phaseRef.current;
      const centerX = cx();
      const centerY = cy();

      if (currentPhase === 'waiting') {
        drawCapsule(ctx, centerX, centerY, moodColor);
      } else if (currentPhase === 'shattering') {
        if (!shatteredRef.current) {
          shardsRef.current = initShards(centerX, centerY, moodColor);
          shatteredRef.current = true;
        }

        const dt = 1 / 60;
        shardsRef.current.forEach(s => {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vy += 120 * dt;
          s.rotation += s.vr * dt;
          s.opacity = Math.max(0, 1 - t / 1.5);
        });

        shardsRef.current.forEach(s => {
          if (s.opacity <= 0) return;
          ctx.save();
          ctx.globalAlpha = s.opacity;
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rotation);

          const grad = ctx.createLinearGradient(-s.size, -s.size, s.size, s.size);
          grad.addColorStop(0, s.color);
          grad.addColorStop(0.5, adjustBrightness(s.color, 20));
          grad.addColorStop(1, adjustBrightness(s.color, -30));
          ctx.fillStyle = grad;

          ctx.beginPath();
          s.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.restore();
        });

        if (t >= 1.5) {
          phaseRef.current = 'particles';
          particlesInitedRef.current = false;
          startTimeRef.current = performance.now();
        }
      } else if (currentPhase === 'particles' || currentPhase === 'content') {
        if (!particlesInitedRef.current) {
          particlesRef.current = initParticles(centerX, centerY, moodColor);
          particlesInitedRef.current = true;
        }

        const dt = 1 / 60;
        particlesRef.current.forEach(p => {
          p.life += dt;
          if (p.life < 0.5) {
            p.alpha = p.life / 0.5;
          } else if (p.life > p.maxLife - 1) {
            p.alpha = Math.max(0, (p.maxLife - p.life));
          } else {
            p.alpha = 1;
          }

          p.angle += p.angularSpeed * dt;
          p.radius += p.expandSpeed * dt;
          p.x = centerX + Math.cos(p.angle) * p.radius;
          p.y = centerY + Math.sin(p.angle) * p.radius;
          p.vy += 8 * dt;
          p.y += p.vy * dt;
        });

        particlesRef.current.forEach(p => {
          if (p.alpha <= 0) return;
          ctx.globalAlpha = p.alpha * 0.9;
          const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          pGrad.addColorStop(0, p.color);
          pGrad.addColorStop(0.5, p.color + '60');
          pGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        if (currentPhase === 'particles' && t >= 1.2) {
          phaseRef.current = 'content';
          setPhase('content');
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    if (capsule.isOpened) {
      phaseRef.current = 'content';
      particlesInitedRef.current = false;
      startTimeRef.current = performance.now() - 1000;
    }

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [capsule.isOpened, capsule.moodColor, initShards, initParticles]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      const updated = await capsuleApi.reply(capsule.id, replyText.trim());
      onReplied(updated);
      setPhase('replied');
    } catch (e: any) {
      alert(e.message || '回复失败');
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="capsule-opener">
      <canvas ref={canvasRef} className="opener-canvas" />

      {phase !== 'waiting' && phase !== 'shattering' && (
        <button className="back-btn" onClick={onBack}>← 返回星图</button>
      )}

      {phase === 'waiting' && (
        <div className="opener-waiting">
          <div className="waiting-info">
            <p className="waiting-title">{capsule.senderName} 埋藏的时空胶囊</p>
            <p className="waiting-sub">
              开启时间：{new Date(capsule.openAt).toLocaleString('zh-CN')}
            </p>
            {new Date() < new Date(capsule.openAt) ? (
              <p className="waiting-locked">✧ 胶囊尚未到达开启时间 ✧</p>
            ) : (
              <button className="btn-primary open-btn" onClick={startOpening}>
                ✦ 开启胶囊
              </button>
            )}
          </div>
        </div>
      )}

      {(phase === 'content' || phase === 'replied') && (
        <div className="opener-content">
          <div className="content-card">
            <div className="content-mood" style={{ background: capsule.moodColor }}>
              {capsule.mood}
            </div>
            <div className="content-header">
              <span className="content-sender">来自 {capsule.senderName}</span>
              <span className="content-date">{new Date(capsule.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
            <div className="content-text">{capsule.content}</div>

            {capsule.photos && capsule.photos.length > 0 && (
              <div className="content-photos">
                {capsule.photos.map((url, i) => (
                  <img key={i} src={url} alt="" className="content-photo" />
                ))}
              </div>
            )}

            {capsule.reply && (
              <div className="reply-section">
                <div className="reply-label">💬 {capsule.recipientName} 的回复</div>
                <div className="reply-content">{capsule.reply.content}</div>
              </div>
            )}

            {!capsule.reply && isRecipient && phase !== 'replied' && (
              <div className="reply-input-section">
                <textarea
                  placeholder="给发件人回一段话（最多100字）"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value.slice(0, 100))}
                  rows={3}
                  maxLength={100}
                />
                <div className="reply-actions">
                  <span className="char-count">{replyText.length}/100</span>
                  <button
                    className="btn-primary"
                    onClick={handleReply}
                    disabled={!replyText.trim() || replyLoading}
                  >
                    {replyLoading ? '发送中...' : '✧ 发送回复'}
                  </button>
                </div>
              </div>
            )}

            {phase === 'replied' && (
              <div className="reply-sent">✓ 回复已化作萤火虫，飘向发件人的星图</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function drawCapsule(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  const w = 200;
  const h = 280;
  const t = performance.now() / 1000;
  const floatY = Math.sin(t * 1.5) * 8;

  ctx.save();
  ctx.translate(cx, cy + floatY);

  const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.8);
  glowGrad.addColorStop(0, color + '60');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.8, 0, Math.PI * 2);
  ctx.fill();

  const r = w / 2;
  const capsuleGrad = ctx.createLinearGradient(-r, -h / 2, r, h / 2);
  capsuleGrad.addColorStop(0, adjustBrightness(color, 30));
  capsuleGrad.addColorStop(0.5, color);
  capsuleGrad.addColorStop(1, adjustBrightness(color, -20));
  ctx.fillStyle = capsuleGrad;

  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.bezierCurveTo(r, -h / 2, r, -h / 4, r, 0);
  ctx.bezierCurveTo(r, h / 4, r, h / 2, 0, h / 2);
  ctx.bezierCurveTo(-r, h / 2, -r, h / 4, -r, 0);
  ctx.bezierCurveTo(-r, -h / 4, -r, -h / 2, 0, -h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = adjustBrightness(color, 50);
  ctx.lineWidth = 2;
  ctx.stroke();

  const stickers = [
    { x: -50, y: -60, text: 'PARIS', rot: -0.3 },
    { x: 40, y: -30, text: 'TOKYO', rot: 0.2 },
    { x: -30, y: 50, text: 'NYC', rot: -0.15 },
    { x: 55, y: 70, text: 'LONDON', rot: 0.25 }
  ];
  stickers.forEach(s => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.fillStyle = 'rgba(245, 230, 200, 0.85)';
    ctx.strokeStyle = 'rgba(180, 140, 90, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-30, -12, 60, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(120, 80, 50, 0.9)';
    ctx.font = 'bold 10px Sora, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text, 0, 0);
    ctx.restore();
  });

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -h * 0.2, r * 0.15, h * 0.25, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function adjustBrightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const r = Math.min(255, Math.max(0, rgb.r + amount));
  const g = Math.min(255, Math.max(0, rgb.g + amount));
  const b = Math.min(255, Math.max(0, rgb.b + amount));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
