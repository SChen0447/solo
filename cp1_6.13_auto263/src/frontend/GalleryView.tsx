import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Painting } from '@/types';
import { fetchPaintings } from '@/api/paintings';
import PaintingCard from '@/components/PaintingCard';
import { useAuthStore } from '@/store/useAuthStore';

export default function GalleryView() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFavoritesPage = location.pathname === '/favorites';

  useEffect(() => {
    setLoading(true);
    fetchPaintings()
      .then((data) => setPaintings(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const displayPaintings = isFavoritesPage && isAuthenticated && user
    ? paintings.filter((p) => user.favorites.includes(p.id))
    : paintings;

  if (loading) {
    return (
      <div className="gallery-loading">
        <div className="loading-spinner" />
        <p>加载画作中...</p>
        <style>{`
          .gallery-loading {
            min-height: 60vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            color: var(--color-text-light);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--color-bronze);
            border-top-color: var(--color-gold);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gallery-error">
        <p>{error}</p>
        <style>{`
          .gallery-error {
            min-height: 40vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-text-light);
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div className="gallery-view">
        {isFavoritesPage ? (
          <h1 className="page-title">我的收藏</h1>
        ) : (
          <>
            <h1 className="page-title">纸间·光痕</h1>
            <p className="gallery-subtitle">
              轻触画作，如翻开水彩本的纸页，感受艺术的温度
            </p>
          </>
        )}

        {displayPaintings.length === 0 ? (
          <div className="gallery-empty">
            <p>{isFavoritesPage ? '还没有收藏的画作，去画廊探索吧～' : '暂无画作'}</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {displayPaintings.map((painting, index) => (
              <PaintingCard key={painting.id} painting={painting} index={index} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .gallery-view {
          max-width: 1400px;
          margin: 0 auto;
        }

        .gallery-subtitle {
          font-size: 1rem;
          color: var(--color-text-light);
          margin-bottom: 36px;
          font-family: 'Noto Serif SC', serif;
          letter-spacing: 1px;
        }

        .gallery-grid {
          column-count: 3;
          column-gap: 20px;
        }

        .gallery-empty {
          min-height: 40vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-bronze);
          font-size: 1.05rem;
          font-family: 'Noto Serif SC', serif;
        }

        @media (max-width: 1100px) {
          .gallery-grid {
            column-count: 2;
          }
        }

        @media (max-width: 768px) {
          .gallery-grid {
            column-count: 1;
          }

          .gallery-subtitle {
            font-size: 0.9rem;
            margin-bottom: 24px;
          }
        }
      `}</style>
    </>
  );
}
