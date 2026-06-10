import React, { useMemo } from 'react';
import { MindMapStore, Snapshot } from '../utils/store';

interface HistoryPanelProps {
  store: MindMapStore;
  onClose: () => void;
  isMobile: boolean;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}:${ss}`;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ store, onClose, isMobile }) => {
  const sortedHistory = useMemo(() => {
    return [...store.state.history].sort((a, b) => b.timestamp - a.timestamp);
  }, [store.state.history]);

  const desktopStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 280,
    height: '100%',
    background: '#34495e',
    color: '#ecf0f1',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.2s ease'
  };

  const mobileOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998
  };

  const mobileStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70vh',
    background: '#34495e',
    color: '#ecf0f1',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 999,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s ease'
  };

  const headerStyle: React.CSSProperties = {
    padding: isMobile ? '16px 20px' : '16px',
    borderBottom: '1px solid #2c3e50',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    color: '#ecf0f1'
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#ecf0f1',
    fontSize: 20,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
    transition: 'background 0.2s ease'
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: isMobile ? '8px 20px 20px' : '8px'
  };

  const itemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    marginBottom: 4,
    borderRadius: 8,
    background: isActive ? 'rgba(41, 128, 185, 0.3)' : 'transparent',
    transition: 'background 0.2s ease',
    cursor: 'pointer'
  });

  const infoStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
    minWidth: 0
  };

  const timeStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: '#ecf0f1'
  };

  const metaStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#95a5a6'
  };

  const rollbackBtnStyle: React.CSSProperties = {
    background: '#2980b9',
    border: 'none',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    marginLeft: 8,
    flexShrink: 0
  };

  const containerStyle = isMobile ? mobileStyle : desktopStyle;

  return (
    <>
      {isMobile && <div style={mobileOverlayStyle} onClick={onClose} />}
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={titleStyle}>版本历史</span>
          <button
            style={closeBtnStyle}
            onClick={onClose}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'none'; }}
          >
            ✕
          </button>
        </div>

        <div style={listStyle}>
          {sortedHistory.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#95a5a6', fontSize: 13 }}>
              暂无历史记录
            </div>
          )}
          {sortedHistory.map((snapshot: Snapshot, index: number) => {
            const isActive = snapshot.id === store.state.history[store.state.historyIndex]?.id;
            return (
              <div
                key={snapshot.id}
                style={itemStyle(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
                onClick={() => store.restoreSnapshot(snapshot)}
              >
                <div style={infoStyle}>
                  <span style={timeStyle}>
                    {isActive && '📍 '}
                    {formatTimestamp(snapshot.timestamp)}
                  </span>
                  <span style={metaStyle}>
                    {snapshot.nodes.length} 个节点 · {snapshot.connections.length} 条连线
                  </span>
                </div>
                <button
                  style={rollbackBtnStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    store.restoreSnapshot(snapshot);
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#2471a3'; }}
                  onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#2980b9'; }}
                >
                  回滚
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default HistoryPanel;
