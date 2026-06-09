import { useEffect, useState } from 'react';
import { Bullet } from '../types';

const COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
  '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3',
  '#ff6348', '#ffa502', '#2ed573', '#1e90ff',
  '#e84393', '#00cec9', '#fdcb6e', '#a29bfe',
];

interface BulletScreenProps {
  bullets: Bullet[];
}

interface BulletItem extends Bullet {
  top: number;
  color: string;
  rotation: number;
  key: string;
}

function BulletScreen({ bullets }: BulletScreenProps) {
  const [visibleBullets, setVisibleBullets] = useState<BulletItem[]>([]);
  const usedSlotsRef = useState<Map<number, number>>(new Map())[0];

  useEffect(() => {
    const latestBullet = bullets[bullets.length - 1];
    if (!latestBullet) return;
    if (visibleBullets.find((b) => b.id === latestBullet.id)) return;

    let top = Math.random() * 85;
    let attempts = 0;
    const now = Date.now();

    while (attempts < 10) {
      const lastUsed = usedSlotsRef.get(Math.floor(top));
      if (!lastUsed || now - lastUsed > 800) {
        usedSlotsRef.set(Math.floor(top), now);
        break;
      }
      top = Math.random() * 85;
      attempts++;
    }

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const rotation = (Math.random() - 0.5) * 8;

    const newItem: BulletItem = {
      ...latestBullet,
      top,
      color,
      rotation,
      key: `${latestBullet.id}-${Math.random()}`,
    };

    setVisibleBullets((prev) => [...prev, newItem]);

    const timer = setTimeout(() => {
      setVisibleBullets((prev) => prev.filter((b) => b.key !== newItem.key));
    }, 2700);

    return () => clearTimeout(timer);
  }, [bullets, visibleBullets, usedSlotsRef]);

  return (
    <div className="bullet-screen">
      {visibleBullets.map((bullet) => (
        <div
          key={bullet.key}
          className="bullet-item"
          style={{
            top: `${bullet.top}%`,
            color: bullet.color,
            textShadow: `0 0 4px ${bullet.color}, 0 0 8px ${bullet.color}`,
            transform: `rotate(${bullet.rotation}deg)`,
          }}
        >
          <span className="bullet-nickname">{bullet.nickname}:</span>
          <span className="bullet-content">{bullet.content}</span>
        </div>
      ))}
      <div className="bullet-screen-placeholder">
        <div className="placeholder-text">🎤 欢迎来到弹幕点歌台</div>
        <div className="placeholder-hint">输入 "歌名-歌手" 格式即可点歌</div>
      </div>
    </div>
  );
}

export default BulletScreen;
