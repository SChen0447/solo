import React, { useEffect, useRef } from 'react';
import { LogEntry, StateKey, STATE_KEY_TO_NAME } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
}

const formatTimestamp = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [logs]);

  const renderChanges = (changes: Partial<Record<StateKey, number>>) => {
    return Object.entries(changes).map(([key, value]) => {
      if (value === undefined || value === 0) return null;
      const stateKey = key as StateKey;
      const isPositive = value > 0;
      return (
        <span
          key={key}
          className={`log-change ${isPositive ? 'positive' : 'negative'}`}
        >
          {STATE_KEY_TO_NAME[stateKey]} {isPositive ? '+' : ''}{value}
        </span>
      );
    });
  };

  return (
    <div className="panel log-panel">
      <h2 className="panel-title">互动日志</h2>
      <div className="log-list" ref={listRef}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
            暂无日志记录
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-item">
              <div className="log-timestamp">{formatTimestamp(log.timestamp)}</div>
              <div className="log-message">{log.message}</div>
              <div className="log-changes">{renderChanges(log.valueChanges)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(LogPanel);
