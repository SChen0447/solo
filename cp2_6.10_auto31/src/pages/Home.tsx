import { useNavigate } from 'react-router-dom';
import type { Album } from '../types';
import AlbumCard from '../components/AlbumCard';

interface HomeProps {
  albums: Album[];
}

export default function Home({ albums }: HomeProps) {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0e1a',
      color: '#fff'
    }}>
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 24px 60px',
        background: 'linear-gradient(180deg, rgba(124, 92, 252, 0.15) 0%, transparent 100%)'
      }}>
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124, 92, 252, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-150px',
          left: '-50px',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(78, 205, 196, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>🎵</span>
              <span style={{
                fontSize: '24px',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #7c5cfc, #4ecdc4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                SoundWave
              </span>
            </div>
            <button
              onClick={() => navigate('/admin')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(124, 92, 252, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(124, 92, 252, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              后台管理
            </button>
          </div>

          <h1 style={{
            fontSize: '52px',
            fontWeight: 800,
            marginBottom: '16px',
            lineHeight: 1.2,
            maxWidth: '700px'
          }}>
            支持你喜爱的
            <span style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #7c5cfc 50%, #4ecdc4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}> 独立音乐人</span>
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.6)',
            maxWidth: '600px',
            lineHeight: 1.7
          }}>
            预购数字专辑、解锁独家内容、参与创作投票，与你喜爱的艺术家一起打造下一张伟大专辑。
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700 }}>
            🔥 正在众筹的专辑
          </h2>
          <span style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px'
          }}>
            共 {albums.length} 张专辑
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          '@media (max-width: 768px)': { gridTemplateColumns: '1fr' }
        } as React.CSSProperties}>
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: repeat(3"] {
            gridTemplateColumns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
