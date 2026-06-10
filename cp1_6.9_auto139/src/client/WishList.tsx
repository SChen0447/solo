import { useState } from 'react';
import type { WishData, SparkEvent } from './App';

interface WishListProps {
  wishes: WishData[];
  sortMode: 'latest' | 'popular';
  onSortChange: (mode: 'latest' | 'popular') => void;
  loading: boolean;
  onIlluminateSpark: (e: SparkEvent) => void;
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  if (hr < 24) return `${hr}小时前`;
  return `${day}天前`;
}

export default function WishList({
  wishes,
  sortMode,
  onSortChange,
  loading,
  onIlluminateSpark,
}: WishListProps) {
  const [illuminatingId, setIlluminatingId] = useState<string | null>(null);

  const handleIlluminate = async (wish: WishData, e: React.MouseEvent) => {
    if (illuminatingId) return;

    const btn = e.currentTarget as HTMLButtonElement;
    const rect = btn.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    setIlluminatingId(wish.id);
    onIlluminateSpark({ color: wish.color, fromX: startX, fromY: startY });

    const sparkCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < sparkCount; i++) {
      setTimeout(() => {
        const spark = document.createElement('div');
        spark.className = 'spark';
        const size = 1 + Math.random() * 2;
        spark.style.width = `${size}px`;
        spark.style.height = `${size}px`;
        spark.style.left = `${startX + (Math.random() - 0.5) * 20}px`;
        spark.style.top = `${startY}px`;
        spark.style.background = wish.color;
        spark.style.boxShadow = `0 0 8px ${wish.color}`;
        document.body.appendChild(spark);

        const targetX = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
        const targetY = 100 + Math.random() * 150;
        const startTime = performance.now();
        const duration = 800;

        const anim = (now: number) => {
          const t = Math.min(1, (now - startTime) / duration);
          const easeT = 1 - Math.pow(1 - t, 2);
          const midX = startX + (targetX - startX) * 0.5 + (Math.random() - 0.5) * 80;
          const midY = Math.min(startY, targetY) - 100 - Math.random() * 80;
          const x =
            (1 - easeT) * (1 - easeT) * startX +
            2 * (1 - easeT) * easeT * midX +
            easeT * easeT * targetX;
          const y =
            (1 - easeT) * (1 - easeT) * startY +
            2 * (1 - easeT) * easeT * midY +
            easeT * easeT * targetY;
          spark.style.transform = `translate(${x - startX}px, ${y - startY}px)`;
          spark.style.opacity = String(1 - t);
          if (t < 1) requestAnimationFrame(anim);
          else spark.remove();
        };
        requestAnimationFrame(anim);
      }, i * 80);
    }

    try {
      await fetch(`/api/wishes/${wish.id}/illuminate`, { method: 'POST' });
      wish.illuminateCount++;
    } catch (err) {
      console.error('照亮失败', err);
    }

    setTimeout(() => setIlluminatingId(null), 600);
  };

  return (
    <div>
      <div className="tabs">
        <button
          className={`tab-btn ${sortMode === 'latest' ? 'active' : ''}`}
          onClick={() => onSortChange('latest')}
        >
          最新心愿
        </button>
        <button
          className={`tab-btn ${sortMode === 'popular' ? 'active' : ''}`}
          onClick={() => onSortChange('popular')}
        >
          最受欢迎
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="masonry">
          {wishes.map((wish) => (
            <div
              key={wish.id}
              className={`wish-card ${illuminatingId === wish.id ? 'illuminating' : ''}`}
              style={{ ['--star-color' as any]: wish.color }}
            >
              <p className="wish-text">{wish.text}</p>
              <div className="wish-footer">
                <span className="wish-time">{formatTime(wish.createdAt)}</span>
                <button
                  className="illuminate-btn"
                  onClick={(e) => handleIlluminate(wish, e)}
                >
                  ✨ 照亮
                  <span className="illuminate-count">{wish.illuminateCount}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
