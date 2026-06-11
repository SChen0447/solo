import React, { useState, useEffect, useCallback } from 'react';
import { PixelCard as PixelCardType, PixelData } from './types';
import { generateMockCards, generateRandomName, generateUserId, createPixelCard } from './utils/pixelData';
import Gallery from './components/Gallery';
import PixelCanvas from './components/PixelCanvas';
import UserProfile from './components/UserProfile';

type View = 'gallery' | 'canvas';

const App: React.FC = () => {
  const [view, setView] = useState<View>('gallery');
  const [cards, setCards] = useState<PixelCardType[]>([]);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [referenceData, setReferenceData] = useState<PixelData | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileUserName, setProfileUserName] = useState('');

  useEffect(() => {
    const id = generateUserId();
    const name = generateRandomName();
    setUserId(id);
    setUserName(name);

    const mockCards = generateMockCards(60, id, name);
    const otherUserId = generateUserId();
    const otherUserName = generateRandomName();
    const otherCards = generateMockCards(40, otherUserId, otherUserName);
    setCards([...mockCards, ...otherCards]);
  }, []);

  const handleSubmit = useCallback((data: PixelData) => {
    const newCard = createPixelCard(data, userId, userName);
    setCards(prev => [...prev, newCard]);
    setReferenceData(null);
    setView('gallery');
  }, [userId, userName]);

  const handleLikeCard = useCallback((cardId: string) => {
    setCards(prev =>
      prev.map(card =>
        card.id === cardId ? { ...card, likes: card.likes + 1 } : card
      )
    );
  }, []);

  const handleCopyCard = useCallback((card: PixelCardType) => {
    setReferenceData(card.pixelData);
    setView('canvas');
  }, []);

  const handleViewProfile = useCallback((uid: string, name: string) => {
    setProfileUserId(uid);
    setProfileUserName(name);
  }, []);

  const handleReport = useCallback((cardId: string) => {
    alert(`已举报卡片 ${cardId.slice(0, 8)}，管理员会尽快审核。`);
  }, []);

  const handleClearReference = useCallback(() => {
    setReferenceData(null);
  }, []);

  const userWorks = profileUserId
    ? cards.filter(c => c.authorId === profileUserId).sort((a, b) => b.createdAt - a.createdAt)
    : [];

  return (
    <div style={styles.app}>
      {view === 'gallery' ? (
        <>
          <div style={styles.header}>
            <h1 style={styles.title}>🎨 像素创意工坊</h1>
            <button
              style={styles.createButton}
              onClick={() => setView('canvas')}
            >
              ✏️ 开始创作
            </button>
          </div>
          <div style={styles.galleryContainer}>
            <Gallery
              cards={cards}
              onLikeCard={handleLikeCard}
              onCopyCard={handleCopyCard}
              onViewProfile={handleViewProfile}
              onReport={handleReport}
            />
          </div>
        </>
      ) : (
        <div style={styles.canvasPage}>
          <button
            style={styles.backButton}
            onClick={() => setView('gallery')}
          >
            ← 返回画廊
          </button>
          <div style={styles.canvasContainer}>
            <PixelCanvas
              onSubmit={handleSubmit}
              referenceData={referenceData}
              onClearReference={handleClearReference}
            />
          </div>
          <div style={styles.canvasTip}>
            <p style={{ color: '#999', fontSize: 12 }}>
              💡 提示：选择颜色和画笔尺寸，在画板上创作你的 32×32 像素画
            </p>
          </div>
        </div>
      )}

      <UserProfile
        userName={profileUserName}
        works={userWorks}
        isOpen={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes cardZoomIn {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a2e',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: 'rgba(26,26,46,0.95)',
    borderBottom: '1px solid #404060',
    zIndex: 10
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
    margin: 0
  },
  createButton: {
    padding: '8px 16px',
    backgroundColor: '#00cc88',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease'
  },
  galleryContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden'
  },
  canvasPage: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: '8px 16px',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    border: '1px solid #404060',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  canvasContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#2c2c2c',
    backgroundImage: 'repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%)',
    backgroundSize: '2px 2px'
  },
  canvasTip: {
    padding: '10px 20px',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)'
  }
};

export default App;
