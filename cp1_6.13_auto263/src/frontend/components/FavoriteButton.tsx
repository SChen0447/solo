import { Heart } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useState } from 'react';
import AuthModal from './AuthModal';

interface FavoriteButtonProps {
  paintingId: string;
  size?: number;
}

export default function FavoriteButton({ paintingId, size = 24 }: FavoriteButtonProps) {
  const { isAuthenticated, isFavorite, toggleFavorite } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);
  const [animating, setAnimating] = useState(false);

  const favorited = isFavorite(paintingId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    setAnimating(true);
    toggleFavorite(paintingId);
    setTimeout(() => setAnimating(false), 200);
  };

  return (
    <>
      <button
        className={`favorite-btn ${favorited ? 'favorited' : ''} ${animating ? 'bouncing' : ''}`}
        onClick={handleClick}
        aria-label={favorited ? '取消收藏' : '收藏画作'}
      >
        <Heart size={size} fill={favorited ? 'currentColor' : 'none'} strokeWidth={2} />
      </button>

      <style>{`
        .favorite-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-bronze);
          transition: var(--transition-base);
        }

        .favorite-btn:hover {
          color: var(--color-gold);
          transform: scale(1.1);
        }

        .favorite-btn.favorited {
          color: var(--color-gold);
        }

        .favorite-btn.bouncing {
          animation: bounce-heart 0.2s ease;
        }
      `}</style>

      {showAuth && (
        <AuthModal
          mode="login"
          onClose={() => setShowAuth(false)}
          onSwitchMode={() => {}}
        />
      )}
    </>
  );
}
