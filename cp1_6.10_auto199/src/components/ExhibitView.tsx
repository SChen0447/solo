import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import GalleryScene from './GalleryScene';
import ArtworkModal from './ArtworkModal';
import { useApp } from '../context/AppContext';
import type { ArtworkData } from '../types';

export default function ExhibitView() {
  const { id } = useParams<{ id: string }>();
  const { getExhibitById } = useApp();
  const [exhibit, setExhibit] = useState<{ artworks: ArtworkData[]; wallCount: number; owner: string } | null>(null);
  const [modalArtwork, setModalArtwork] = useState<ArtworkData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); return; }
    const data = getExhibitById(id);
    if (!data) {
      setNotFound(true);
      return;
    }
    setExhibit(data);
  }, [id, getExhibitById]);

  if (notFound) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
        gap: 24
      }}>
        <div style={{ fontSize: 48, color: '#c8a96e', fontWeight: 200 }}>404</div>
        <div style={{ fontSize: 16, color: 'rgba(245,240,232,0.7)' }}>
          展览不存在或已被删除
        </div>
        <Link to="/" style={{
          color: '#4a90d9',
          textDecoration: 'none',
          fontSize: 14
        }}>
          返回首页
        </Link>
      </div>
    );
  }

  if (!exhibit) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(245,240,232,0.6)',
        position: 'relative',
        zIndex: 1
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', zIndex: 1 }}>
      <div style={{
        position: 'absolute',
        top: 16,
        left: 20,
        right: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        pointerEvents: 'none'
      }}>
        <div style={{
          background: 'rgba(44,62,80,0.7)',
          backdropFilter: 'blur(8px)',
          padding: '8px 16px',
          borderRadius: 10,
          fontSize: 13,
          color: '#f5f0e8',
          pointerEvents: 'auto',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          策展人：{exhibit.owner}
        </div>
        <Link
          to="/"
          style={{
            background: 'rgba(44,62,80,0.7)',
            backdropFilter: 'blur(8px)',
            padding: '8px 16px',
            borderRadius: 10,
            fontSize: 13,
            color: '#f5f0e8',
            textDecoration: 'none',
            pointerEvents: 'auto',
            border: '1px solid rgba(255,255,255,0.05)',
            transition: 'background 0.2s'
          }}
        >
          返回首页
        </Link>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(44,62,80,0.7)',
        backdropFilter: 'blur(8px)',
        padding: '8px 16px',
        borderRadius: 10,
        fontSize: 12,
        color: 'rgba(245,240,232,0.7)',
        zIndex: 100,
        border: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center'
      }}>
        鼠标拖拽旋转视角 · 滚轮缩放 · 点击作品查看大图
      </div>

      <GalleryScene
        visitorMode
        initialArtworks={exhibit.artworks}
        onArtworkClick={(a) => setModalArtwork(a)}
      />

      {modalArtwork && (
        <ArtworkModal
          artwork={modalArtwork}
          onClose={() => setModalArtwork(null)}
          onUpdateName={() => {}}
        />
      )}
    </div>
  );
}
