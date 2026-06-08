import { HistoryItem } from './types';
import '../styles/HistoryPanel.css';

interface HistoryPanelProps {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  onClear: () => void;
  onExport: (item: HistoryItem) => void;
}

export function HistoryPanel({ history, onRestore, onClear, onExport }: HistoryPanelProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const handleExport = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    onExport(item);
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>历史记录</h3>
        <button
          className="clear-btn"
          onClick={onClear}
          disabled={history.length === 0}
        >
          清除
        </button>
      </div>
      
      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-history">
            <p>暂无历史记录</p>
            <p className="empty-tip">保存的混合结果会显示在这里</p>
          </div>
        ) : (
          history.map((item, index) => (
            <div
              key={item.id}
              className="history-item"
              onClick={() => onRestore(item)}
            >
              <div className="history-index">#{history.length - index}</div>
              <div className="history-thumb">
                <img src={item.thumbnail} alt={`历史记录 ${item.id}`} />
              </div>
              <div className="history-info">
                <span className="history-time">{formatTime(item.timestamp)}</span>
                <button
                  className="export-btn"
                  onClick={(e) => handleExport(item, e)}
                  title="导出PNG"
                >
                  导出
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="history-footer">
        <span className="history-count">共 {history.length}/20 条</span>
      </div>
    </div>
  );
}
