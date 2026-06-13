import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Painting } from '@/types';
import FavoriteButton from './FavoriteButton';
import { usePageSound } from '@/hooks/useAudio';

interface PaintingCardProps {
  painting: Painting;
  index: number;
}

export default function PaintingCard({ painting, index }: PaintingCardProps) {
  const navigate = useNavigate();
  const { playRustle } = usePageSound();
  const [hovered, setHovered] = useState(false);

  const randomWidth = useMemo(() => {
    return 240 + Math.floor(Math.random() * 81);
  }, [painting.id]);

  const aspectRatio = painting.height / painting.width;
  const displayHeight = Math.round(randomWidth * aspectRatio);

  const categoryLabels: Record<string, string> = {
    landscape: '风景',
    floral: '花卉',
    abstract: '抽象',
  };

  const handleClick = () => {
    playRustle();
    navigate(`/painting/${painting.id}`);
  };

  return (
    <>
      <div
        className="painting-card"
        style={{
          width: `${randomWidth}px`,
          height: `${displayHeight}px`,
          animationDelay: `${index * 0.08}s`,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
      >
        <img
          src={painting.thumbnailUrl}
          alt={painting.title}
          loading="lazy"
          className="painting-card-image"
        />

        <div className={`ripple-overlay ${hovered ? 'active' : ''}`}>
          <span className="ripple-circle ripple-1" />
          <span className="ripple-circle ripple-2" />
          <span className="ripple-circle ripple-3" />
        </div>

        <div className={`painting-card-info ${hovered ? 'visible' : ''}`}>
          <div className="painting-card-header">
            <div>
              <h3 className="painting-card-title">{painting.title}</h3>
              <span className="painting-card-category">
                {categoryLabels[painting.category]}
              </span>
            </div>
            <FavoriteButton paintingId={painting.id} size={20} />
          </div>
        </div>
      </div>

      <style>{`
        .painting-card {
          position: relative;
          border-radius: var(--radius-card);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          cursor: pointer;
          transition: var(--transition-base);
          background: var(--color-bg-dark);
          margin-bottom: 20px;
          animation: fadeInUp 0.6s ease backwards;
          break-inside: avoid;
        }

        .painting-card:hover {
          transform: scale(1.05);
          filter: brightness(1.2);
          box-shadow: var(--shadow-card-hover);
          z-index: 10;
        }

        .painting-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .ripple-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .ripple-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0);
          background: radial-gradient(
            circle,
            rgba(240, 230, 211, 0.6) 0%,
            rgba(212, 197, 169, 0.3) 50%,
            transparent 70%
          );
          opacity: 0;
        }

        .ripple-overlay.active .ripple-circle {
          animation: ripple 1.5s ease-out infinite;
        }

        .ripple-overlay.active .ripple-2 {
          animation-delay: 0.5s;
        }

        .ripple-overlay.active .ripple-3 {
          animation-delay: 1s;
        }

        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        .painting-card-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px;
          background: linear-gradient(to top, rgba(61, 53, 41, 0.85), transparent);
          opacity: 0;
          transform: translateY(10px);
          transition: var(--transition-base);
        }

        .painting-card-info.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .painting-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .painting-card-title {
          font-size: 0.95rem;
          color: white;
          margin-bottom: 4px;
          font-weight: 600;
          font-family: 'Noto Serif SC', serif;
        }

        .painting-card-category {
          font-size: 0.75rem;
          color: var(--color-cream);
          padding: 2px 8px;
          background: rgba(212, 175, 55, 0.35);
          border-radius: 4px;
        }

        @media (max-width: 480px) {
          .painting-card {
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
          }
        }
      `}</style>
    </>
  );
}
