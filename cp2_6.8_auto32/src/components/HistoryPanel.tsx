import React, { useMemo } from 'react';
import { HistoryItem } from '../hooks/useColorState';
import { COMPONENT_LABELS } from '../utils/constants';

interface HistoryPanelProps {
  history: HistoryItem[];
  onRestore: (historyId: string) => void;
  onClear: () => void;
  panelBg: string;
  panelText: string;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onRestore,
  onClear,
  panelBg,
  panelText,
}) => {
  const displayHistory = useMemo(() => {
    return history.slice(0, 20);
  }, [history]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      style={{
        backgroundColor: panelBg,
        color: panelText,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        backgroundImage: `
          linear-gradient(${panelText}08 1px, transparent 1px),
          linear-gradient(90deg, ${panelText}08 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }}
    >
      <div style={{ padding: '20px 20px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            历史记录
          </h2>
          <button
            onClick={onClear}
            disabled={history.length === 0}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: 'transparent',
              border: `1px solid ${panelText}30`,
              borderRadius: '4px',
              color: panelText,
              cursor: history.length === 0 ? 'not-allowed' : 'pointer',
              opacity: history.length === 0 ? 0.4 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (history.length > 0) {
                e.currentTarget.style.backgroundColor = `${panelText}10`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            清空全部
          </button>
        </div>
        <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px', marginBottom: 0 }}>
          共 {history.length} 条记录，显示最近 20 条
        </p>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px 20px',
        }}
      >
        {displayHistory.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              opacity: 0.4,
              fontSize: '14px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <div>暂无历史记录</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayHistory.map((item, index) => (
              <div
                key={item.id}
                onClick={() => onRestore(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  backgroundColor: `${panelText}08`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: `1px solid transparent`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${panelText}15`;
                  e.currentTarget.style.borderColor = `${panelText}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${panelText}08`;
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{ fontSize: '12px', opacity: 0.5, width: '60px', flexShrink: 0 }}>
                  {index + 1}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    title={`修改前: ${item.oldColor}`}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      backgroundColor: item.oldColor,
                      border: `1px solid ${panelText}20`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '12px', opacity: 0.5 }}>→</span>
                  <div
                    title={`修改后: ${item.newColor}`}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      backgroundColor: item.newColor,
                      border: `1px solid ${panelText}20`,
                      flexShrink: 0,
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>
                    {COMPONENT_LABELS[item.component]}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.5 }}>
                    {formatTime(item.timestamp)}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    opacity: 0.6,
                    flexShrink: 0,
                  }}
                >
                  点击恢复
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
