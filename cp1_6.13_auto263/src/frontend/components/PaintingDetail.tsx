import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import type { Painting } from '@/types';
import { fetchPaintingById } from '@/api/paintings';
import FavoriteButton from './FavoriteButton';
import { usePageSound } from '@/hooks/useAudio';

export default function PaintingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playRustle } = usePageSound();
  const [painting, setPainting] = useState<Painting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchPaintingById(id)
      .then((data) => {
        setPainting(data);
        setTimeout(() => setAnimateIn(true), 50);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBack = () => {
    playRustle();
    navigate('/');
  };

  const categoryLabels: Record<string, string> = {
    landscape: '水彩风景',
    floral: '水彩花卉',
    abstract: '水彩抽象',
  };

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="loading-spinner" />
        <p>画作加载中...</p>
      </div>
    );
  }

  if (error || !painting) {
    return (
      <div className="detail-error">
        <p>{error || '画作不存在'}</p>
        <button onClick={handleBack}>返回画廊</button>
      </div>
    );
  }

  return (
    <>
      <div className="painting-detail">
        <button className="detail-back" onClick={handleBack}>
          <ArrowLeft size={20} />
          <span>返回画廊</span>
        </button>

        <div className={`detail-frame ${animateIn ? 'animate-in' : ''}`}>
          <div className="detail-spine" />
          <div className="detail-page">
            <div className="detail-image-wrapper">
              <img
                src={painting.imageUrl}
                alt={painting.title}
                className="detail-image"
              />
            </div>

            <div className="detail-meta">
              <div className="detail-meta-header">
                <h1 className="detail-title">{painting.title}</h1>
                <FavoriteButton paintingId={painting.id} size={28} />
              </div>

              <div className="detail-tags">
                <span className="detail-tag">
                  <Tag size={14} />
                  {categoryLabels[painting.category]}
                </span>
                <span className="detail-tag">
                  <Calendar size={14} />
                  {painting.createdAt}
                </span>
              </div>

              <p className="detail-description">{painting.description}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .painting-detail {
          min-height: 100vh;
          padding: 40px 20px;
          background: var(--color-bg);
        }

        .detail-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          margin-bottom: 32px;
          background: rgba(201, 185, 154, 0.2);
          color: var(--color-text);
          border-radius: 10px;
          font-size: 0.95rem;
        }

        .detail-back:hover {
          background: rgba(201, 185, 154, 0.35);
          transform: translateX(-4px);
        }

        .detail-frame {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          background: linear-gradient(135deg, #faf6ee 0%, #f0e8d8 100%);
          border-radius: 4px;
          box-shadow:
            0 10px 40px rgba(0, 0, 0, 0.2),
            inset 0 0 80px rgba(201, 185, 154, 0.15);
          opacity: 0;
          transform: perspective(1000px) rotateY(-30deg) translateX(100%);
          transform-origin: left center;
        }

        .detail-frame.animate-in {
          animation: pageFlipIn 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        @keyframes pageFlipIn {
          0% {
            opacity: 0;
            transform: perspective(1200px) rotateY(-35deg) translateX(80%);
          }
          40% {
            opacity: 0.9;
          }
          70% {
            transform: perspective(1200px) rotateY(-5deg) translateX(0);
          }
          100% {
            opacity: 1;
            transform: perspective(1200px) rotateY(0deg) translateX(0);
          }
        }

        .detail-spine {
          width: 24px;
          background: linear-gradient(
            to right,
            rgba(61, 53, 41, 0.3),
            rgba(61, 53, 41, 0.05)
          );
          border-radius: 4px 0 0 4px;
          flex-shrink: 0;
        }

        .detail-page {
          flex: 1;
          padding: 48px;
          position: relative;
        }

        .detail-page::before {
          content: '';
          position: absolute;
          inset: 16px;
          border: 1px solid rgba(201, 185, 154, 0.4);
          border-radius: 2px;
          pointer-events: none;
        }

        .detail-image-wrapper {
          position: relative;
          margin-bottom: 32px;
          overflow: hidden;
          border-radius: 2px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
        }

        .detail-image {
          width: 100%;
          max-height: 600px;
          object-fit: contain;
          background: #fff;
          display: block;
        }

        .detail-meta-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 16px;
        }

        .detail-title {
          font-size: 2rem;
          color: var(--color-text);
          font-family: 'Noto Serif SC', serif;
          letter-spacing: 2px;
        }

        .detail-tags {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .detail-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(212, 175, 55, 0.15);
          color: var(--color-text-light);
          border-radius: 20px;
          font-size: 0.85rem;
        }

        .detail-description {
          font-size: 1rem;
          line-height: 2;
          color: var(--color-text-light);
          text-align: justify;
          font-family: 'Noto Serif SC', serif;
          letter-spacing: 0.5px;
        }

        .detail-loading,
        .detail-error {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
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

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .detail-error button {
          padding: 10px 24px;
          background: var(--color-gold);
          color: white;
          border-radius: 8px;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .painting-detail {
            padding: 20px 12px;
          }

          .detail-page {
            padding: 24px 16px;
          }

          .detail-page::before {
            inset: 8px;
          }

          .detail-spine {
            width: 12px;
          }

          .detail-title {
            font-size: 1.5rem;
          }

          .detail-description {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </>
  );
}
