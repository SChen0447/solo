import { useState, useEffect, useRef } from 'react';
import type { Batch, DrawRecord, Rarity } from '../types';
import { findBatchByInviteCode, getUserDrawCount, getRandomBlessing } from '../utils/lottery';

interface Props {
  batches: Batch[];
  drawRecords: DrawRecord[];
  currentUserId: string;
  onDraw: (batch: Batch) => DrawRecord | null;
}

function rarityLabel(r: Rarity): string {
  switch (r) {
    case 'hidden': return '隐藏款';
    case 'normal': return '普通款';
    case 'participation': return '谢谢参与';
  }
}

function formatCountdown(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return '已过期';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${mins}分`;
  return `${mins}分钟`;
}

function ParticleCanvas({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (trigger === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    }

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      life: number; maxLife: number; size: number; color: string;
    }> = [];

    const colors = ['#ffd700', '#ffec8b', '#fff8dc', '#f0e68c', '#ffcf48', '#ffe066'];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < 80; i++) {
      const angle = (Math.PI * 2 * i) / 80 + Math.random() * 0.3;
      const speed = 3 + Math.random() * 6;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 60 + Math.random() * 40,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let frame = 0;
    const maxFrames = 120;
    let rafId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        if (p.life <= 0) return;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.99;
        p.life -= 1 / p.maxLife;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      frame++;
      if (frame < maxFrames && particles.some((p) => p.life > 0)) {
        rafId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    animate();

    return () => cancelAnimationFrame(rafId);
  }, [trigger]);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}

function Bubbles() {
  const bubbles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    size: 30 + Math.random() * 70,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 8,
    opacity: 0.1 + Math.random() * 0.25
  }));
  return (
    <div className="bubbles-container">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="bubble"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            opacity: b.opacity,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`
          }}
        />
      ))}
    </div>
  );
}

export default function GachaMachine({ batches, drawRecords, currentUserId, onDraw }: Props) {
  const [inviteCode, setInviteCode] = useState('');
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [error, setError] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<DrawRecord | null>(null);
  const [particleTrigger, setParticleTrigger] = useState(0);
  const [countdownNow, setCountdownNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCountdownNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const userDraws = currentBatch
    ? getUserDrawCount(drawRecords, currentBatch.id, currentUserId)
    : 0;

  const userRecords = currentBatch
    ? drawRecords.filter((r) => r.batchId === currentBatch.id && r.userId === currentUserId)
    : [];

  const handleJoin = () => {
    setError('');
    const found = findBatchByInviteCode(batches, inviteCode);
    if (!found) {
      setError('邀请码无效，请检查后重试');
      return;
    }
    setCurrentBatch(found);
  };

  const handleDraw = () => {
    if (!currentBatch || spinning) return;
    if (userDraws >= currentBatch.maxDrawsPerUser) {
      setError('您已达到本次活动的抽签次数上限');
      return;
    }
    if (Date.now() < currentBatch.startTime) {
      setError('活动尚未开始，请稍候再试');
      return;
    }

    setSpinning(true);
    setError('');

    setTimeout(() => {
      const result = onDraw(currentBatch);
      setSpinning(false);
      if (result) {
        setLastResult(result);
        setShowResult(true);
        if (result.rarity === 'hidden') {
          setParticleTrigger((t) => t + 1);
        }
      } else {
        setError('抽签失败，可能是库存不足或已达上限');
      }
    }, 2000);
  };

  if (!currentBatch) {
    return (
      <div className="gacha-page join-page">
        <Bubbles />
        <div className="join-card">
          <h2>🎉 欢迎来到盲盒抽签站</h2>
          <p className="join-desc">请输入店主提供的 12 位邀请码加入活动</p>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="请输入 12 位邀请码"
            maxLength={12}
            className="invite-input"
            style={{ textTransform: 'uppercase', letterSpacing: '3px' }}
          />
          {error && <div className="error-text">{error}</div>}
          <button className="submit-btn" onClick={handleJoin}>
            进入活动
          </button>
        </div>
      </div>
    );
  }

  const remainingDraws = currentBatch.maxDrawsPerUser - userDraws;

  return (
    <div className="gacha-page">
      <Bubbles />

      <div className="gacha-header">
        <button className="back-btn" onClick={() => { setCurrentBatch(null); setInviteCode(''); }}>
          ← 退出活动
        </button>
        <div className="gacha-title">{currentBatch.name}</div>
        <div className="gacha-remaining">
          剩余抽签次数：<strong>{remainingDraws}</strong> / {currentBatch.maxDrawsPerUser}
        </div>
      </div>

      {error && <div className="error-text centered">{error}</div>}

      <div className="gacha-machine-wrap">
        <div className={`gacha-machine ${spinning ? 'spinning' : ''}`}>
          <div className="machine-top">
            <div className="machine-glass">
              <div className="capsule capsule-1" />
              <div className="capsule capsule-2" />
              <div className="capsule capsule-3" />
              <div className="capsule capsule-4" />
              <div className="capsule capsule-5" />
              <div className="capsule capsule-6" />
            </div>
          </div>
          <div className="machine-mid">
            <div className="machine-slot" />
          </div>
          <div className="machine-base">
            <div className="machine-knob" />
          </div>
        </div>
      </div>

      <div className="gacha-actions">
        <button
          className="draw-btn"
          onClick={handleDraw}
          disabled={spinning || remainingDraws <= 0}
        >
          {spinning ? '抽取中...' : remainingDraws <= 0 ? '次数已用完' : '🎰 点击扭一扭'}
        </button>
      </div>

      {userRecords.length > 0 && (
        <div className="my-records">
          <h3>我的抽签记录</h3>
          <div className="records-list">
            {userRecords.map((r) => (
              <div key={r.id} className={`record-card rarity-${r.rarity}`}>
                <div className="record-top">
                  <span className="record-prize">{r.prizeName}</span>
                  <span className={`rarity-tag rarity-${r.rarity}`}>{rarityLabel(r.rarity)}</span>
                </div>
                {r.redeemCode && (
                  <div className="record-redeem">
                    <div>兑奖码：<strong>{r.redeemCode}</strong></div>
                    <div className="redeem-status">
                      {r.redeemed
                        ? <span className="redeemed">已核销</span>
                        : r.redeemExpireAt
                          ? <span className="expire">有效期剩余：{formatCountdown(r.redeemExpireAt)}</span>
                          : null}
                    </div>
                  </div>
                )}
                <div className="record-time">
                  {new Date(r.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResult && lastResult && (
        <div className="modal-overlay" onClick={() => setShowResult(false)}>
          <div className="result-modal" onClick={(e) => e.stopPropagation()}>
            {lastResult.rarity === 'hidden' && (
              <ParticleCanvas trigger={particleTrigger} />
            )}
            <div className="modal-content">
              <div className={`result-rarity rarity-${lastResult.rarity}`}>
                {rarityLabel(lastResult.rarity)}
              </div>
              <div className="result-prize-name">{lastResult.prizeName}</div>
              <div className="result-blessing">「 {getRandomBlessing()} 」</div>
              {lastResult.redeemCode && (
                <div className="result-redeem">
                  <div className="redeem-label">您的兑奖码</div>
                  <div className="redeem-code">{lastResult.redeemCode}</div>
                  <div className="redeem-note">
                    请在 30 天内到店核销 · 有效期至 {lastResult.redeemExpireAt
                      ? new Date(lastResult.redeemExpireAt).toLocaleDateString('zh-CN')
                      : '-'}
                  </div>
                </div>
              )}
              <button className="modal-close-btn" onClick={() => setShowResult(false)}>
                好的
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
