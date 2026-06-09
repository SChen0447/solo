import { useEffect, useState } from 'react';
import type { Plant } from '../types';

interface LeaderboardProps {
  plants: Plant[];
  onClose: () => void;
}

const Leaderboard = ({ plants, onClose }: LeaderboardProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const topPlants = [...plants]
    .sort((a, b) => b.careCount - a.careCount)
    .slice(0, 10);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getRankBadge = (rank: number) => {
    const baseStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      fontWeight: 'bold' as const,
      color: '#fff',
      flexShrink: 0
    };

    if (rank === 1) {
      return (
        <div style={{ ...baseStyle, background: '#FFD700', borderRadius: 6 }}>
          1
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div style={{ ...baseStyle, background: '#C0C0C0', borderRadius: 6 }}>
          2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div style={{ ...baseStyle, background: '#CD7F32', borderRadius: 6 }}>
          3
        </div>
      );
    }
    return (
      <div style={{ ...baseStyle, background: '#9E9E9E', borderRadius: '50%', width: 24, height: 24, fontSize: 12 }}>
        {rank}
      </div>
    );
  };

  const containerStyle: React.CSSProperties = isClosing
    ? { transform: 'translateX(100%)' }
    : { transform: 'translateX(0)' };

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 100,
          animation: 'overlayFade 0.3s ease-out'
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 320,
          maxWidth: '100vw',
          background: '#FFF8E7',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
          zIndex: 101,
          transition: 'transform 0.3s ease-out',
          ...containerStyle,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E0D8C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2 style={{ fontSize: 20, color: '#3E4A2F', display: 'flex', alignItems: 'center', gap: 8 }}>
            🏆 成长排行榜
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#888',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          {topPlants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              暂无植物
            </div>
          ) : (
            topPlants.map((plant, index) => (
              <div
                key={plant.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 8px',
                  borderBottom: index < topPlants.length - 1 ? '1px solid #F0E8D8' : 'none'
                }}
              >
                {getRankBadge(index + 1)}
                <img
                  src={plant.imageUrl}
                  alt={plant.name}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    objectFit: 'cover',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: '#3E4A2F',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {plant.name}
                    {plant.variety && (
                      <span
                        style={{
                          fontSize: 11,
                          background: 'linear-gradient(135deg, #76B852, #8DC26F)',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        {plant.variety}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    养护 {plant.careCount} 次
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Leaderboard;
