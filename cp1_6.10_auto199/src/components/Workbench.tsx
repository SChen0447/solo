import { useRef, useState, useEffect } from 'react';
import GalleryScene from './GalleryScene';
import ControlPanel from './ControlPanel';
import LoadingProgress from './LoadingProgress';
import type { ArtworkData, GallerySceneRef } from '../types';
import { useApp } from '../context/AppContext';
import { copyToClipboard } from '../utils/helpers';

export default function Workbench() {
  const [isLoading, setIsLoading] = useState(true);
  const [artworks, setArtworks] = useState<ArtworkData[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const galleryRef = useRef<GallerySceneRef>(null);
  const { saveExhibit, logout, currentUser } = useApp();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = () => setPanelExpanded(false);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const handleUpload = (newArtworks: ArtworkData[]) => {
    newArtworks.forEach(a => galleryRef.current?.addArtwork(a));
  };

  const handleRemove = (id: string) => {
    galleryRef.current?.removeArtwork(id);
  };

  const handleAddWall = () => {
    galleryRef.current?.addWall();
  };

  const handlePublish = () => {
    const layout = galleryRef.current?.exportLayout() || [];
    if (layout.length === 0) {
      alert('请先上传至少一件作品');
      return;
    }
    const id = saveExhibit(layout, 1);
    const url = `${window.location.origin}/exhibit/${id}`;
    setShareUrl(url);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await copyToClipboard(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  if (isLoading) {
    return <LoadingProgress duration={1500} onComplete={() => setIsLoading(false)} />;
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 100
      }}>
        <div style={{
          fontSize: 13,
          color: 'rgba(245,240,232,0.7)',
          marginRight: 8
        }}>
          {currentUser?.username}
        </div>
        <button onClick={handlePublish}>发布展览</button>
        <button
          onClick={logout}
          style={{
            background: 'rgba(255,255,255,0.08)',
            boxShadow: 'none'
          }}
        >
          退出
        </button>
      </div>

      {shareUrl && (
        <div style={{
          position: 'absolute',
          top: 70,
          right: 24,
          zIndex: 100,
          background: 'rgba(44,62,80,0.95)',
          backdropFilter: 'blur(10px)',
          padding: 14,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          maxWidth: 380
        }}>
          <div style={{
            fontSize: 12,
            color: '#c8a96e',
            marginBottom: 8,
            letterSpacing: 0.5
          }}>
            展览发布成功！分享链接：
          </div>
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}>
            <div style={{
              flex: 1,
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 8,
              fontSize: 12,
              color: '#f5f0e8',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {shareUrl}
            </div>
            <button onClick={handleCopy} style={{ padding: '10px 16px' }}>
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        flex: 1,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        '@media (max-width: 767px)': {
          flexDirection: 'column'
        }
      } as React.CSSProperties}>
        <div
          className="control-panel-desktop"
          style={{
            width: '25%',
            minWidth: 280,
            height: '100%',
            display: window.innerWidth >= 768 ? 'block' : 'none',
            flexShrink: 0
          }}
        >
          <ControlPanel
            artworks={artworks}
            onUpload={handleUpload}
            onRemove={handleRemove}
            onAddWall={handleAddWall}
          />
        </div>

        <div style={{
          flex: 1,
          position: 'relative',
          minHeight: 0
        }}>
          <GalleryScene
            ref={galleryRef}
            onArtworksChange={setArtworks}
          />
        </div>

        <div
          className="control-panel-mobile"
          style={{
            display: window.innerWidth < 768 ? 'block' : 'none',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: panelExpanded ? '55%' : '30%',
            transition: 'height 0.3s ease',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderRight: 'none',
            zIndex: 50
          }}
        >
          <div
            onClick={() => setPanelExpanded(!panelExpanded)}
            style={{
              width: '100%',
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'rgba(44, 62, 80, 0.95)'
            }}
          >
            <div style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.25)'
            }} />
          </div>
          <div style={{ height: 'calc(100% - 28px)' }}>
            <ControlPanel
              artworks={artworks}
              onUpload={handleUpload}
              onRemove={handleRemove}
              onAddWall={handleAddWall}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
