import React, { useState, useCallback } from 'react';
import StickerGallery from './StickerGallery';
import ExchangeManager from './ExchangeManager';
import ProgressDashboard from './ProgressDashboard';
import type { AppState, ExchangeRequest, LogisticsStage } from './types';
import { initialAppState } from './data';
import { v4 as uuidv4 } from 'uuid';

type TabType = 'gallery' | 'progress';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(initialAppState);
  const [activeTab, setActiveTab] = useState<TabType>('gallery');

  const handleToggleCollect = useCallback((stickerId: string) => {
    setState(prev => {
      const exists = prev.collectedStickerIds.includes(stickerId);
      return {
        ...prev,
        collectedStickerIds: exists
          ? prev.collectedStickerIds.filter(id => id !== stickerId)
          : [...prev.collectedStickerIds, stickerId]
      };
    });
  }, []);

  const handleAcceptRequest = useCallback((requestId: string) => {
    setState(prev => ({
      ...prev,
      exchangeRequests: prev.exchangeRequests.map(r =>
        r.id === requestId ? { ...r, status: 'shipping' } : r
      )
    }));
  }, []);

  const handleRejectRequest = useCallback((requestId: string) => {
    setState(prev => ({
      ...prev,
      exchangeRequests: prev.exchangeRequests.map(r =>
        r.id === requestId ? { ...r, status: 'rejected' } : r
      )
    }));
  }, []);

  const handleUpdateLogistics = useCallback((requestId: string) => {
    setState(prev => {
      const LOGISTICS_ORDER: LogisticsStage[] = ['sent', 'in_transit', 'delivered'];
      return {
        ...prev,
        exchangeRequests: prev.exchangeRequests.map(r => {
          if (r.id !== requestId) return r;
          const lastStage =
            r.logistics.length > 0
              ? r.logistics[r.logistics.length - 1].stage
              : undefined;
          const nextIdx = lastStage
            ? LOGISTICS_ORDER.indexOf(lastStage) + 1
            : 0;
          if (nextIdx >= LOGISTICS_ORDER.length) return r;

          const nextStage = LOGISTICS_ORDER[nextIdx];
          const notes: Record<LogisticsStage, string> = {
            sent: '贴纸已寄出',
            in_transit: '贴纸正在运输中',
            delivered: '贴纸已签收，交换成功！'
          };

          const newLogistics = [
            ...r.logistics,
            {
              stage: nextStage,
              time: new Date().toISOString(),
              note: notes[nextStage]
            }
          ];

          return {
            ...r,
            logistics: newLogistics,
            status: nextStage === 'delivered' ? 'completed' : r.status
          };
        })
      };
    });
  }, []);

  const handleCreateRequest = useCallback((request: ExchangeRequest) => {
    setState(prev => ({
      ...prev,
      exchangeRequests: [request, ...prev.exchangeRequests]
    }));
  }, []);

  return (
    <div style={styles.appWrapper}>
      <header style={styles.header}>
        <h1 style={styles.appTitle}>贴纸交换站</h1>
        <div style={styles.tabBar}>
          {(['gallery', 'progress'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabBtn,
                backgroundColor: activeTab === tab ? '#5c6bc0' : 'transparent',
                color: activeTab === tab ? '#ffffff' : '#795548'
              }}
              className="btn-press"
            >
              {tab === 'gallery' ? '贴纸画廊' : '收藏进度'}
            </button>
          ))}
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.contentArea}>
          <div key={activeTab} className="fade-in" style={{ flex: 1, minWidth: 0 }}>
            {activeTab === 'gallery' ? (
              <StickerGallery
                stickers={state.stickers}
                collectedIds={state.collectedStickerIds}
                onToggleCollect={handleToggleCollect}
              />
            ) : (
              <ProgressDashboard
                stickers={state.stickers}
                collectedIds={state.collectedStickerIds}
              />
            )}
          </div>

          <ExchangeManager
            requests={state.exchangeRequests}
            stickers={state.stickers}
            users={state.users}
            currentUserId={state.currentUser.id}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
            onUpdateLogistics={handleUpdateLogistics}
            onCreateRequest={handleCreateRequest}
          />
        </div>
      </main>

      <style>{`
        .fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .btn-press {
          transition: transform 0.15s ease;
        }
        .btn-press:active {
          transform: scale(0.95);
        }

        .sticker-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(93, 64, 55, 0.15) !important;
        }

        input:focus {
          border-color: #5c6bc0 !important;
          box-shadow: 0 0 0 3px rgba(92, 107, 192, 0.15);
        }

        @media (max-width: 1100px) {
          .main-layout {
            flex-direction: column !important;
          }
          .exchange-sidebar {
            width: 100% !important;
            position: static !important;
          }
        }

        @media (max-width: 768px) {
          .gallery-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .sticker-card {
            width: auto !important;
          }
        }

        @media (max-width: 480px) {
          .gallery-grid {
            grid-template-columns: 1fr !important;
          }
        }

        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #d7ccc8;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #bcaaa4;
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appWrapper: {
    width: '100%',
    maxWidth: 1280,
    minHeight: '100vh',
    padding: '20px 24px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#5d4037',
    letterSpacing: 1
  },
  tabBar: {
    display: 'flex',
    gap: 8,
    backgroundColor: '#f0e6d2',
    padding: 4,
    borderRadius: 24
  },
  tabBtn: {
    padding: '8px 24px',
    border: 'none',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease'
  },
  main: {
    flex: 1
  },
  contentArea: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
    className: 'main-layout'
  } as any
};

export default App;
