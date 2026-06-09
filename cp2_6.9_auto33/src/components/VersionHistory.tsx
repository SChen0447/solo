import type { Snapshot } from '../types';

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: Snapshot[];
  onRestore: (snapshotId: string) => void;
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAvatarColor = (name: string) => {
  const colors = [
    '#6366F1', '#EC4899', '#10B981', '#F59E0B',
    '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const VersionHistory = ({
  isOpen,
  onClose,
  snapshots,
  onRestore,
}: VersionHistoryProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        style={styles.overlay}
        className="drawer-overlay"
        onClick={onClose}
      />
      <div style={styles.drawer} className="drawer-panel">
        <div style={styles.header}>
          <h3 style={styles.title}>版本历史</h3>
          <button style={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div style={styles.content}>
          {snapshots.length === 0 ? (
            <div style={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={styles.emptyIcon}>
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <p style={styles.emptyText}>暂无保存的版本</p>
              <p style={styles.emptySubtext}>点击顶部的"保存快照"按钮来保存当前代码版本</p>
            </div>
          ) : (
            <div style={styles.list}>
              {snapshots.map((snapshot, index) => (
                <div key={snapshot.id} style={styles.item}>
                  <div style={styles.itemHeader}>
                    <div
                      style={{
                        ...styles.avatar,
                        background: getAvatarColor(snapshot.nickname),
                      }}
                    >
                      {snapshot.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.itemInfo}>
                      <span style={styles.itemName}>{snapshot.nickname}</span>
                      <span style={styles.itemTime}>{formatTime(snapshot.timestamp)}</span>
                    </div>
                  </div>
                  <div style={styles.itemActions}>
                    <button
                      style={styles.restoreButton}
                      onClick={() => onRestore(snapshot.id)}
                    >
                      恢复
                    </button>
                  </div>
                  {index < snapshots.length - 1 && (
                    <div style={styles.divider} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '350px',
    background: '#2A2A3E',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #3F3F5A',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#FFFFFF',
  },
  closeButton: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: '#9CA3AF',
    borderRadius: '8px',
    transition: 'background 0.2s, color 0.2s',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    color: '#6B7280',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#D1D5DB',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#6B7280',
    lineHeight: 1.5,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#F3F4F6',
  },
  itemTime: {
    fontSize: '12px',
    color: '#9CA3AF',
  },
  itemActions: {
    display: 'flex',
    paddingLeft: '48px',
  },
  restoreButton: {
    padding: '6px 16px',
    background: '#6366F1',
    color: 'white',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  divider: {
    height: '1px',
    background: '#3F3F5A',
    margin: '12px 0',
  },
};

export default VersionHistory;
