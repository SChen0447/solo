import type { VersionRecord } from './useWebSocket';

interface Props {
  isOpen: boolean;
  history: VersionRecord[];
  onClose: () => void;
  onRollback: (version: VersionRecord) => void;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (date.toDateString() === now.toDateString()) return '今天';
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getInitials(name: string): string {
  return name.slice(-1);
}

export default function HistoryPanel({ isOpen, history, onClose, onRollback }: Props) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          ...styles.overlay,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />
      <aside
        style={{
          ...styles.panel,
          transform: isOpen ? 'translateX(0)' : 'translateX(400px)',
        }}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>📜 编辑历史</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label="关闭">
            ×
          </button>
        </div>

        <div style={styles.list}>
          {history.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>⏳</div>
              <p>暂无历史记录</p>
            </div>
          ) : (
            history.map((version, index) => (
              <div key={version.id} style={styles.item}>
                <div
                  style={{
                    ...styles.avatar,
                    backgroundColor: version.userColor,
                  }}
                >
                  {getInitials(version.userName)}
                </div>
                <div style={styles.itemContent}>
                  <div style={styles.itemTop}>
                    <span style={styles.userName}>{version.userName}</span>
                    <span style={styles.time}>{formatTime(version.timestamp)}</span>
                  </div>
                  <p style={styles.summary}>{version.summary}</p>
                  {index === 0 ? (
                    <span style={styles.currentTag}>当前版本</span>
                  ) : (
                    <button
                      onClick={() => onRollback(version)}
                      style={styles.rollbackBtn}
                    >
                      恢复到此版本
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 100,
    transition: 'opacity 0.3s ease',
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 400,
    backgroundColor: '#fafafa',
    boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
    zIndex: 101,
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s ease',
  },
  header: {
    height: 56,
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: 24,
    color: '#888',
    cursor: 'pointer',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
  },
  item: {
    display: 'flex',
    gap: 12,
    padding: '14px',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    border: '1px solid #eeeeee',
    transition: 'all 0.2s ease',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  itemTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
  },
  time: {
    fontSize: 11,
    color: '#999',
    flexShrink: 0,
  },
  summary: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: '#555',
    wordBreak: 'break-word',
  },
  rollbackBtn: {
    alignSelf: 'flex-start',
    padding: '4px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #90caf9',
    color: '#1976d2',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: 2,
  },
  currentTag: {
    alignSelf: 'flex-start',
    padding: '4px 10px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    marginTop: 2,
  },
  empty: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#aaa',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @media (max-width: 768px) {
    aside[style*="panel"] {
      width: min(400px, 90vw) !important;
    }
  }
  button[style*="closeBtn"]:hover {
    background-color: #f5f5f5 !important;
    color: #333 !important;
  }
  button[style*="rollbackBtn"]:hover {
    background-color: #e3f2fd !important;
  }
  div[style*="item"]:hover {
    border-color: #e0e0e0 !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
  }
`;
document.head.appendChild(styleSheet);
