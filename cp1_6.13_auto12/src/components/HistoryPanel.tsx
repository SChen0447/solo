import React from 'react';
import { Snapshot } from '../types';

interface HistoryPanelProps {
  snapshots: Snapshot[];
  currentSnapshotId: string | null;
  isHistoryMode: boolean;
  onRollback: (snapshot: Snapshot) => void;
  onRestoreLatest: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  snapshots,
  currentSnapshotId,
  isHistoryMode,
  onRollback,
  onRestoreLatest,
  isCollapsed,
  onToggleCollapse
}) => {
  if (isCollapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        style={{
          width: 48,
          height: '100%',
          background: '#fff',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 20,
          cursor: 'pointer',
          transition: 'width 0.3s ease'
        }}
        title="历史版本"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 300,
        height: '100%',
        background: '#fff',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease'
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#1F2937' }}>历史版本</span>
        </div>
        <button
          onClick={onToggleCollapse}
          style={{ padding: 4, borderRadius: 4, color: '#6B7280' }}
          title="收起"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {isHistoryMode && (
        <div
          style={{
            padding: '10px 16px',
            background: '#FEF3C7',
            borderBottom: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}
        >
          <span style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>历史预览模式</span>
          <button
            onClick={onRestoreLatest}
            style={{
              padding: '4px 10px',
              background: '#F59E0B',
              color: '#fff',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500
            }}
          >
            恢复最新
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {snapshots.length === 0 ? (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: '#9CA3AF',
              fontSize: 13
            }}
          >
            暂无快照，完成5次操作后自动生成
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 35,
                top: 10,
                bottom: 10,
                width: 2,
                background: '#E5E7EB'
              }}
            />
            {[...snapshots].reverse().map((snapshot, idx) => {
              const isActive = snapshot.id === currentSnapshotId;
              const isLatest = idx === 0 && !isHistoryMode;
              return (
                <div
                  key={snapshot.id}
                  onClick={() => onRollback(snapshot)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '10px 16px 10px 20px',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(74, 144, 217, 0.08)' : 'transparent',
                    transition: 'background 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: isActive || isLatest ? '#4A90D9' : '#fff',
                      border: `3px solid ${isActive || isLatest ? '#4A90D9' : '#D1D5DB'}`,
                      marginTop: 4,
                      marginRight: 14,
                      flexShrink: 0,
                      zIndex: 1
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#4A90D9' : '#1F2937'
                        }}
                      >
                        {formatTime(snapshot.timestamp)}
                      </span>
                      {isLatest && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: '#4A90D9',
                            color: '#fff',
                            fontWeight: 500
                          }}
                        >
                          最新
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      {formatDate(snapshot.timestamp)} · {snapshot.nodes.length} 个节点
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                      {snapshot.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #E5E7EB',
          fontSize: 11,
          color: '#9CA3AF',
          textAlign: 'center'
        }}
      >
        共 {snapshots.length} 个历史快照
      </div>
    </div>
  );
};

export default HistoryPanel;
