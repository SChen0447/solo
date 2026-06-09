import { useState, useRef, useEffect, useCallback } from 'react';

interface WishingWellProps {
  onWishAdded: () => void;
}

const STAR_COLORS = [
  '#ff88aa',
  '#88ffaa',
  '#88aaff',
  '#ffcc88',
  '#ff88cc',
  '#aaffaa',
  '#aa88ff',
  '#ffee88',
];

type CoinType = 'gold' | 'silver' | 'rainbow';

const COIN_GRADIENT: Record<CoinType, { color: string; label: string }> = {
  gold: { color: '#ffd700', label: '金币' },
  silver: { color: '#c0c0c0', label: '银币' },
  rainbow: { color: '#ff88aa', label: '彩虹币' },
};

const WELL_SIZE = 500;

export default function WishingWell({ onWishAdded }: WishingWellProps) {
  const [showForm, setShowForm] = useState(false);
  const [wishText, setWishText] = useState('');
  const [selectedColor, setSelectedColor] = useState(STAR_COLORS[0]);
  const [selectedCoin, setSelectedCoin] = useState<CoinType>('gold');
  const [flyingCoin, setFlyingCoin] = useState<{
    color: string;
    startX: number;
    startY: number;
  } | null>(null);
  const [ripples, setRipples] = useState<{ id: number; color: string }[]>([]);
  const [splashes, setSplashes] = useState<
    { id: number; color: string; angle: number }[]
  >([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rippleIdRef = useRef(0);
  const splashIdRef = useRef(0);
  const formBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = WELL_SIZE;
    const H = WELL_SIZE;
    const cx = W / 2;
    const cy = H / 2;
    const radius = W / 2 - 4;

    const particles = Array.from({ length: 15 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 3 + Math.random() * 3,
      color: STAR_COLORS[Math.floor(Math.random() * 4)],
      alpha: 0.4 + Math.random() * 0.4,
      twinkleSpeed: 0.01 + Math.random() * 0.02,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    const bottomLights = Array.from({ length: 25 }, () => ({
      x: cx + (Math.random() - 0.5) * radius * 1.6,
      y: cy + (Math.random() - 0.5) * radius * 1.6,
      size: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.005 + Math.random() * 0.01,
    }));

    let animId = 0;
    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, 'rgba(20, 30, 80, 0.95)');
      grad.addColorStop(1, 'rgba(10, 10, 40, 0.98)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      for (const bl of bottomLights) {
        const alpha = 0.2 + Math.sin(t * bl.speed + bl.phase) * 0.3;
        if (Math.sin(t * bl.speed + bl.phase) > 0) {
          ctx.beginPath();
          ctx.arc(bl.x, bl.y, bl.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha)})`;
          ctx.fill();
        }
      }

      const waveCount = 6;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(150, 180, 255, ${0.08 + w * 0.015})`;
        ctx.lineWidth = 1;
        for (let a = 0; a < Math.PI * 2; a += 0.05) {
          const wavePhase = t * 0.03 + w * 0.8;
          const r = radius - 10 - w * 12 + Math.sin(a * 3 + wavePhase) * 2;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (a === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        const distFromCenter = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        if (distFromCenter > radius - 10) {
          p.vx *= -1;
          p.vy *= -1;
          p.x += p.vx * 2;
          p.y += p.vy * 2;
        }

        const twinkle = 0.5 + Math.sin(t * p.twinkleSpeed + p.twinklePhase) * 0.5;
        const alpha = p.alpha * twinkle;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillStyle = p.color + alphaHex;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      t++;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    if (ripples.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = WELL_SIZE / 2;
    const cy = WELL_SIZE / 2;

    const timers: ReturnType<typeof setTimeout>[] = ripples.map((r) => {
      let frame = 0;
      const totalFrames = 90;
      const anim = () => {
        if (frame >= totalFrames) return;
        const progress = frame / totalFrames;
        const maxRadius = WELL_SIZE / 2 - 10;
        const currentRadius = progress * maxRadius;
        const alpha = (1 - progress) * 0.7;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.strokeStyle = r.color + alphaHex;
        ctx.lineWidth = 3;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();

        frame++;
        requestAnimationFrame(anim);
      };
      anim();
      return setTimeout(() => {
        setRipples((prev) => prev.filter((x) => x.id !== r.id));
      }, 1600);
    });

    return () => timers.forEach(clearTimeout);
  }, [ripples]);

  const triggerRipple = useCallback((color: string) => {
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, color }]);
  }, []);

  const triggerSplashes = useCallback((color: string) => {
    const count = 5 + Math.floor(Math.random() * 4);
    const newSplashes = Array.from({ length: count }, () => ({
      id: splashIdRef.current++,
      color,
      angle: Math.random() * Math.PI * 2,
    }));
    setSplashes((prev) => [...prev, ...newSplashes]);
    setTimeout(() => {
      setSplashes((prev) =>
        prev.filter((s) => !newSplashes.find((ns) => ns.id === s.id))
      );
    }, 800);
  }, []);

  const handleSubmit = async () => {
    if (!wishText.trim()) return;

    setShowForm(false);

    const btn = formBtnRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setFlyingCoin({
        color: COIN_GRADIENT[selectedCoin].color,
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
      });
    }

    setTimeout(() => {
      triggerRipple(selectedColor);
      triggerSplashes(selectedColor);
    }, 700);

    setTimeout(() => setFlyingCoin(null), 1500);

    try {
      await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: wishText.trim(),
          color: selectedColor,
          coinType: selectedCoin,
        }),
      });
      onWishAdded();
    } catch (err) {
      console.error('提交心愿失败', err);
    }

    setWishText('');
    setSelectedColor(STAR_COLORS[0]);
    setSelectedCoin('gold');
  };

  return (
    <div
      className="well-canvas-container"
      style={{ width: WELL_SIZE, height: WELL_SIZE }}
    >
      <canvas
        ref={canvasRef}
        width={WELL_SIZE}
        height={WELL_SIZE}
        className="well-canvas"
        style={{ width: WELL_SIZE, height: WELL_SIZE }}
      />

      {flyingCoin && (
        <FlyingCoin
          color={flyingCoin.color}
          startX={flyingCoin.startX}
          startY={flyingCoin.startY}
          containerRef={canvasRef}
        />
      )}

      {splashes.map((s) => (
        <Splash
          key={s.id}
          id={s.id}
          color={s.color}
          angle={s.angle}
          containerRef={canvasRef}
        />
      ))}

      <div className="side-panel">
        <div className="glass-panel">
          <button
            ref={formBtnRef}
            className="wish-btn"
            onClick={() => setShowForm(true)}
          >
            ✨ 许下心愿
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form-overlay" onClick={() => setShowForm(false)}>
          <div className="wish-form" onClick={(e) => e.stopPropagation()}>
            <h2 className="form-title">许下你的心愿</h2>

            <div>
              <div className="form-label">写下心愿</div>
              <textarea
                className="wish-textarea"
                placeholder="写下你的心愿..."
                value={wishText}
                maxLength={100}
                onChange={(e) => setWishText(e.target.value)}
                autoFocus
              />
              <div
                style={{
                  textAlign: 'right',
                  color: '#666688',
                  fontSize: '11px',
                  marginTop: '4px',
                }}
              >
                {wishText.length}/100
              </div>
            </div>

            <div>
              <div className="form-label">选择星光颜色</div>
              <div className="color-picker">
                {STAR_COLORS.map((c) => (
                  <div
                    key={c}
                    className={`color-swatch ${
                      selectedColor === c ? 'active' : ''
                    }`}
                    style={{ background: c, color: c }}
                    onClick={() => setSelectedColor(c)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="form-label">选择硬币</div>
              <div className="coin-selector">
                {(['gold', 'silver', 'rainbow'] as CoinType[]).map((ct) => (
                  <div
                    key={ct}
                    className={`coin-option ${ct} ${
                      selectedCoin === ct ? 'active' : ''
                    }`}
                    onClick={() => setSelectedCoin(ct)}
                  >
                    {COIN_GRADIENT[ct].label}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button
                className="form-btn secondary"
                onClick={() => setShowForm(false)}
              >
                取消
              </button>
              <button
                className="form-btn primary"
                onClick={handleSubmit}
                disabled={!wishText.trim()}
                style={{ opacity: wishText.trim() ? 1 : 0.5 }}
              >
                投入硬币
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FlyingCoin({
  color,
  startX,
  startY,
  containerRef,
}: {
  color: string;
  startX: number;
  startY: number;
  containerRef: React.RefObject<HTMLCanvasElement>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const crect = container.getBoundingClientRect();
    const targetX = crect.left + crect.width / 2;
    const targetY = crect.top + crect.height / 2;
    const dx = targetX - startX;
    const dy = targetY - startY;

    const duration = 700;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const easeT = 1 - Math.pow(1 - t, 3);
      const x = startX + dx * easeT;
      const y = startY + dy * easeT - Math.sin(t * Math.PI) * 80;
      const scale = 1 - t * 0.4;
      const rot = t * 720;
      if (el) {
        el.style.transform = `translate(${x - 15}px, ${y - 15}px) scale(${scale}) rotate(${rot}deg)`;
        el.style.opacity = String(1 - t * 0.3);
      }
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [startX, startY, containerRef]);

  return (
    <div
      ref={ref}
      className="floating-coin"
      style={{
        width: 30,
        height: 30,
        background: color,
        color,
        position: 'fixed',
        left: 0,
        top: 0,
      }}
    />
  );
}

function Splash({
  id,
  color,
  angle,
  containerRef,
}: {
  id: number;
  color: string;
  angle: number;
  containerRef: React.RefObject<HTMLCanvasElement>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const _id = id;

  useEffect(() => {
    const el = ref.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const crect = container.getBoundingClientRect();
    const startX = crect.left + crect.width / 2;
    const startY = crect.top + crect.height / 2;
    const size = 2 + Math.random() * 2;
    const distance = 40 + Math.random() * 40;

    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.background = color;
    el.style.color = color;

    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const easeT = t;
      const x = startX + Math.cos(angle) * distance * easeT;
      const y =
        startY +
        Math.sin(angle) * distance * easeT -
        Math.sin(t * Math.PI) * 40;
      if (el) {
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.style.opacity = String(1 - t);
      }
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [_id, angle, color, containerRef]);

  return (
    <div
      ref={ref}
      className="floating-coin"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
      }}
    />
  );
}
