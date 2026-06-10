import { useNavigate } from 'react-router-dom';
import type { Album } from '../types';
import ProgressBar from './ProgressBar';

interface AlbumCardProps {
  album: Album;
}

export default function AlbumCard({ album }: AlbumCardProps) {
  const navigate = useNavigate();
  const percentage = Math.min((album.pledgedAmount / album.goalAmount) * 100, 100);

  return (
    <div
      onClick={() => navigate(`/album/${album.id}`)}
      style={{
        background: 'rgba(26, 31, 53, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(124, 92, 252, 0.2)',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(124, 92, 252, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: '12px',
          background: album.coverGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '72px',
          marginBottom: '16px',
          boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.3)'
        }}
      >
        {album.coverEmoji}
      </div>

      <h3 style={{
        color: '#ffffff',
        fontSize: '18px',
        fontWeight: 700,
        marginBottom: '4px'
      }}>
        {album.title}
      </h3>

      <p style={{
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '14px',
        marginBottom: '16px'
      }}>
        {album.artist}
      </p>

      <ProgressBar
        pledgedAmount={album.pledgedAmount}
        goalAmount={album.goalAmount}
        showLabel={true}
      />

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
          目标 ¥{album.goalAmount.toLocaleString()}
        </span>
        <span style={{
          fontSize: '12px',
          color: percentage >= 100 ? '#4ecdc4' : '#7c5cfc',
          fontWeight: 600
        }}>
          {percentage >= 100 ? '已达成 🎉' : '进行中'}
        </span>
      </div>
    </div>
  );
}
