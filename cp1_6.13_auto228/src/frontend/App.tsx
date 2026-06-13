import React, { useState, useEffect, useCallback } from 'react';
import { GalleryRing } from './components/GalleryRing';
import { Painting } from './components/PaintingCard';

interface GalleryData {
  paintings: Painting[];
  themePalettes: Record<string, string[]>;
}

interface ModalState {
  visible: boolean;
  painting: Painting | null;
}

const App: React.FC = () => {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [palettes, setPalettes] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ visible: false, painting: null });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/paintings');
        const data: GalleryData = await res.json();
        setPaintings(data.paintings);
        setPalettes(data.themePalettes);
      } catch {
        const fallbackPalettes: Record<string, string[]> = {
          '星夜': ['#0d47a1', '#1976d2', '#42a5f5', '#90caf9', '#311b92', '#4527a0', '#5e35b2'],
          '暮光': ['#ff6f00', '#ff8f00', '#ffa000', '#ffb300', '#bf360c', '#e64a19', '#f57c00'],
          '极光': ['#00e676', '#69f0ae', '#00e5ff', '#40c4ff', '#aa00ff', '#e040fb', '#18ffff'],
          '深海': ['#006064', '#00838f', '#0097a7', '#00acc1', '#1a237e', '#283593', '#3949ab'],
          '晨曦': ['#fff59d', '#ffee58', '#ffca28', '#ffa726', '#f06292', '#f48fb1', '#f8bbd0'],
          '火山': ['#b71c1c', '#c62828', '#d32f2f', '#e53935', '#ff5722', '#ff7043', '#ffab40'],
          '迷雾': ['#37474f', '#455a64', '#546e7a', '#607d8b', '#78909c', '#90a4ae', '#b0bec5'],
          '潮汐': ['#0277bd', '#0288d1', '#039be5', '#03a9f4', '#80deea', '#4dd0e1', '#26c6da'],
          '梦境': ['#7b1fa2', '#8e24aa', '#9c27b0', '#ab47bc', '#ce93d8', '#ba68c8', '#f3e5f5'],
          '沙漠': ['#ef6c00', '#f57c00', '#fb8c00', '#ffa726', '#ffcc80', '#ffe0b2', '#fff3e0'],
        };
        setPalettes(fallbackPalettes);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddPetal = useCallback(async (id: string) => {
    setPaintings((prev) =>
      prev.map((p) => (p.id === id ? { ...p, petalCount: p.petalCount + 1 } : p))
    );
    try {
      await fetch(`/api/paintings/${id}/petal`, { method: 'POST' });
    } catch {
    }
  }, []);

  const handlePaintingClick = useCallback((painting: Painting) => {
    setModal({ visible: true, painting });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ visible: false, painting: null });
  }, []);

  const handleModalPetal = useCallback(() => {
    if (modal.painting) {
      handleAddPetal(modal.painting.id);
    }
  }, [modal.painting, handleAddPetal]);

  const selectedPalette = modal.painting
    ? palettes[modal.painting.theme] || palettes['星夜']
    : [];

  return (
    <div style={styles.app}>
      <div style={styles.stars} />

      <div style={styles.header}>
        <div style={styles.headerTitle}>时痕·艺廊</div>
        <div style={styles.headerSubtitle}>TIME TRACE GALLERY</div>
      </div>

      <div style={styles.hint}>
        <span style={styles.hintDot} />
        拖拽旋转画廊 · 点击画作查看详情 · 点击花瓣留下印记
      </div>

      <div style={styles.galleryWrapper}>
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.loadingSpinner} />
            <div style={styles.loadingText}>正在加载画作...</div>
          </div>
        ) : (
          <GalleryRing
            paintings={paintings}
            palettes={palettes}
            onAddPetal={handleAddPetal}
            onPaintingClick={handlePaintingClick}
          />
        )}
      </div>

      {modal.visible && modal.painting && (
        <div
          style={styles.modalOverlay}
          onClick={closeModal}
        >
          <div
            style={{
              ...styles.modal,
              borderColor: selectedPalette[0] || '#ffffff',
              boxShadow: `0 10px 60px ${selectedPalette[0] || '#ffffff'}40`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button style={styles.modalClose} onClick={closeModal}>✕</button>

            <div
              style={{
                ...styles.modalPainting,
                background: `linear-gradient(135deg, ${selectedPalette[Math.floor(selectedPalette.length / 2)] || '#333'}40, ${selectedPalette[0] || '#333'}60), radial-gradient(circle at 30% 30%, ${selectedPalette[selectedPalette.length - 1] || '#333'}60, transparent 70%)`,
              }}
            >
              <div style={styles.modalTheme}>{modal.painting.theme}</div>
            </div>

            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>{modal.painting.title}</h2>
              <div style={styles.modalArtist}>艺术家 · {modal.painting.artist}</div>
              <p style={styles.modalDesc}>{modal.painting.description}</p>

              <div style={styles.modalPetalSection}>
                <button
                  style={{
                    ...styles.modalPetalBtn,
                    background: `linear-gradient(135deg, ${selectedPalette[0] || '#ff6b6b'}, ${selectedPalette[selectedPalette.length - 1] || '#ff8e53'})`,
                  }}
                  onClick={handleModalPetal}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff">
                    <path d="M12 2C8 6 6 10 8 14c1 2 3 3 4 3s3-1 4-3c2-4 0-8-4-12zm0 15c-.5 1-1.5 2-3 2.5C11 21 13 22 12 22z" />
                  </svg>
                  <span>送花瓣</span>
                </button>
                <div style={styles.modalPetalCount}>
                  已收到 <strong>{modal.painting.petalCount}</strong> 片花瓣
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  stars: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      radial-gradient(1px 1px at 20px 30px, #ffffff40, transparent),
      radial-gradient(1px 1px at 40px 70px, #ffffff30, transparent),
      radial-gradient(1px 1px at 90px 40px, #ffffff50, transparent),
      radial-gradient(2px 2px at 160px 120px, #ffffff25, transparent),
      radial-gradient(1px 1px at 230px 80px, #ffffff35, transparent),
      radial-gradient(1px 1px at 300px 200px, #ffffff45, transparent),
      radial-gradient(1px 1px at 370px 50px, #ffffff30, transparent),
      radial-gradient(2px 2px at 450px 180px, #ffffff20, transparent)
    `,
    backgroundSize: '500px 300px',
    pointerEvents: 'none',
    animation: 'starTwinkle 8s ease-in-out infinite',
  },
  header: {
    position: 'absolute',
    top: '24px',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 5,
    pointerEvents: 'none',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 300,
    letterSpacing: '10px',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '4px',
  },
  headerSubtitle: {
    fontSize: '10px',
    letterSpacing: '6px',
    color: 'rgba(255,255,255,0.35)',
  },
  hint: {
    position: 'absolute',
    bottom: '24px',
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.45)',
    zIndex: 5,
    pointerEvents: 'none',
  },
  hintDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#50e3c2',
    boxShadow: '0 0 10px #50e3c2',
    animation: 'hintPulse 2s ease-in-out infinite',
  },
  galleryWrapper: {
    position: 'absolute',
    inset: 0,
    padding: '80px 20px 60px',
  },
  loading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#50e3c2',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px',
    animation: 'fadeIn 0.25s ease-out',
  },
  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: '380px',
    background: 'linear-gradient(160deg, #1a2240 0%, #0e1528 100%)',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '2px solid',
    animation: 'modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  modalClose: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
    zIndex: 10,
    transition: 'all 0.15s ease-out',
  },
  modalPainting: {
    width: '100%',
    height: '220px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '16px',
  },
  modalTheme: {
    fontSize: '12px',
    color: '#ffffff',
    background: 'rgba(0,0,0,0.5)',
    padding: '6px 16px',
    borderRadius: '20px',
    backdropFilter: 'blur(4px)',
    letterSpacing: '2px',
  },
  modalContent: {
    padding: '20px 24px 24px',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '6px',
  },
  modalArtist: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '16px',
    letterSpacing: '1px',
  },
  modalDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.7,
    marginBottom: '20px',
  },
  modalPetalSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  modalPetalBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '24px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  modalPetalCount: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
  },
};

if (typeof document !== 'undefined') {
  const existing = document.getElementById('app-animation-styles');
  if (!existing) {
    const styleEl = document.createElement('style');
    styleEl.id = 'app-animation-styles';
    styleEl.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modalIn {
        from { opacity: 0; transform: scale(0.9) translateY(20px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes starTwinkle {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      @keyframes hintPulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 10px #50e3c2; }
        50% { opacity: 0.5; box-shadow: 0 0 4px #50e3c2; }
      }
      #app-animation-styles + div button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
      }
    `;
    document.head.appendChild(styleEl);
  }
}

export default App;
