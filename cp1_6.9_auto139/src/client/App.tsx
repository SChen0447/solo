import { useState, useEffect, useRef } from 'react';
import WishingWell from './WishingWell';
import WishList from './WishList';

export interface WishData {
  id: string;
  text: string;
  color: string;
  coinType: 'gold' | 'silver' | 'rainbow';
  createdAt: number;
  illuminateCount: number;
}

export type SparkEvent = {
  color: string;
  fromX: number;
  fromY: number;
};

function App() {
  const [wishes, setWishes] = useState<WishData[]>([]);
  const [sortMode, setSortMode] = useState<'latest' | 'popular'>('latest');
  const [loading, setLoading] = useState(true);
  const nebulaRef = useRef<HTMLCanvasElement>(null);

  const fetchWishes = async (mode: 'latest' | 'popular') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/wishes/${mode}`);
      const data = await res.json();
      setWishes(data);
    } catch (err) {
      console.error('加载心愿失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishes(sortMode);
  }, [sortMode]);

  useEffect(() => {
    const canvas = nebulaRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 100 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * Math.max(canvas.width, canvas.height) * 0.6;
      return {
        baseAngle: angle,
        radius,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.0005 + Math.random() * 0.0005,
        offsetY: (Math.random() - 0.5) * 0.2,
      };
    });

    let animationId: number;
    let t = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (const p of particles) {
        const a = p.baseAngle + t * p.speed;
        const x = cx + Math.cos(a) * p.radius;
        const y = cy + Math.sin(a) * p.radius * (1 + p.offsetY);
        const alpha = 0.2 + Math.sin(t * 0.002 + p.baseAngle) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
      t++;
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleWishAdded = () => {
    fetchWishes(sortMode);
  };

  const handleIlluminateSpark = (_e: SparkEvent) => {
  };

  return (
    <div className="app">
      <canvas ref={nebulaRef} className="nebula-canvas" />
      <div className="app-content">
        <h1 className="app-title">虚拟星光许愿池</h1>

        <div className="wishing-well-wrapper">
          <WishingWell onWishAdded={handleWishAdded} />
        </div>

        <div className="wish-list-wrapper">
          <WishList
            wishes={wishes}
            sortMode={sortMode}
            onSortChange={setSortMode}
            loading={loading}
            onIlluminateSpark={handleIlluminateSpark}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
