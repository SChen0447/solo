import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import IngredientsPanel from './IngredientsPanel';
import StepsPanel from './StepsPanel';
import HistoryPanel from './HistoryPanel';
import type { VersionRecord } from './useWebSocket';

export default function App() {
  const { isConnected, currentUser, document, history, onlineCount, lastUpdate, send } = useWebSocket();
  const [ingredientsWidth, setIngredientsWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyBtnRotate, setHistoryBtnRotate] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isRollbackAnimating, setIsRollbackAnimating] = useState(false);
  const [onlineBounce, setOnlineBounce] = useState(false);

  useEffect(() => {
    if (lastUpdate?.type === 'user_joined') {
      setOnlineBounce(true);
      setTimeout(() => setOnlineBounce(false), 400);
    }
  }, [lastUpdate]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(Math.max(240, e.clientX), 600);
      setIngredientsWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleRollback = (version: VersionRecord) => {
    setIsRollbackAnimating(true);
    send({ type: 'rollback', versionId: version.id });
    setTimeout(() => setIsRollbackAnimating(false), 800);
  };

  const toggleHistory = () => {
    setHistoryBtnRotate(r => !r);
    setShowHistory(s => !s);
  };

  if (!document) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}></div>
        <p style={{ color: '#666', marginTop: 16 }}>正在连接协作服务器...</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <button
          style={styles.hamburgerBtn}
          onClick={() => setShowMobileMenu(true)}
          aria-label="菜单"
        >
          <span style={styles.hamburgerLine}></span>
          <span style={styles.hamburgerLine}></span>
          <span style={styles.hamburgerLine}></span>
        </button>
        <h1 style={styles.title}>🍳 协作食谱</h1>
        <div style={styles.headerRight}>
          {currentUser && (
            <div style={{ ...styles.userTag, backgroundColor: currentUser.color }}>
              {currentUser.name}
            </div>
          )}
          <div
            style={{
              ...styles.onlineBadge,
              transform: onlineBounce ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
            }}
            title={`在线人数: ${onlineCount}`}
          >
            {onlineCount}
          </div>
          <button
            onClick={toggleHistory}
            style={{
              ...styles.historyBtn,
              transform: historyBtnRotate ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
            aria-label="历史记录"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2v6h6"></path>
              <path d="M6 18a9 9 0 1 1 3-7.7L6 8"></path>
              <path d="M12 13v4l3 2"></path>
            </svg>
          </button>
        </div>
      </header>

      <div style={styles.main}>
        <div
          className={`ingredients-panel ${showMobileMenu ? 'mobile-open' : ''}`}
          style={{
            ...styles.ingredientsWrapper,
            width: ingredientsWidth,
          }}
        >
          <IngredientsPanel
            ingredients={document.ingredients}
            send={send}
            lastUpdate={lastUpdate}
          />
        </div>

        <div
          className={`mobile-overlay ${showMobileMenu ? 'visible' : ''}`}
          style={styles.mobileOverlay}
          onClick={() => setShowMobileMenu(false)}
        />

        <div
          style={{
            ...styles.divider,
            cursor: isDragging ? 'grabbing' : 'grab',
            backgroundColor: isDragging ? '#90caf9' : '#e0e0e0',
          }}
          onMouseDown={handleMouseDown}
        />

        <div
          style={{
            ...styles.stepsWrapper,
            opacity: isRollbackAnimating ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
        >
          <StepsPanel
            steps={document.steps}
            send={send}
            lastUpdate={lastUpdate}
          />
        </div>
      </div>

      <HistoryPanel
        isOpen={showHistory}
        history={history}
        onClose={() => { setShowHistory(false); setHistoryBtnRotate(false); }}
        onRollback={handleRollback}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fef9f0',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef9f0',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid #e0e0e0',
    borderTopColor: '#4caf50',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    flexShrink: 0,
  },
  hamburgerBtn: {
    display: 'none',
    width: 36,
    height: 36,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    padding: 0,
    transition: 'all 0.2s ease',
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#555',
    borderRadius: 1,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  userTag: {
    padding: '4px 10px',
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: 500,
  },
  onlineBadge: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#4caf50',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
  },
  historyBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  main: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    position: 'relative',
  },
  ingredientsWrapper: {
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
    borderRight: '1px solid #e0e0e0',
    transition: 'all 0.2s ease',
  },
  mobileOverlay: {
    display: 'none',
    position: 'fixed',
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  divider: {
    width: 6,
    flexShrink: 0,
    cursor: 'grab',
    transition: 'background-color 0.2s ease',
    userSelect: 'none',
    zIndex: 5,
  },
  stepsWrapper: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    overflow: 'auto',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .ingredients-panel {
    flexShrink: 0;
    height: 100%;
    overflow: hidden;
    border-right: 1px solid #e0e0e0;
    transition: all 0.2s ease;
  }
  .mobile-overlay {
    display: none;
  }
  @media (max-width: 768px) {
    .ingredients-panel {
      position: fixed !important;
      top: 56px;
      left: 0;
      bottom: 0;
      z-index: 20;
      width: min(320px, 80vw) !important;
      box-shadow: 2px 0 8px rgba(0,0,0,0.1);
      transform: translateX(-100%);
      transition: transform 0.3s ease !important;
      border-right: none;
    }
    .ingredients-panel.mobile-open {
      transform: translateX(0);
    }
    .mobile-overlay {
      display: none;
      position: fixed;
      top: 56px;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0,0,0,0.3);
      z-index: 10;
    }
    .mobile-overlay.visible {
      display: block;
    }
    .hamburger-btn {
      display: flex !important;
    }
    .divider-bar {
      display: none !important;
    }
  }
`;
document.head.appendChild(styleSheet);
