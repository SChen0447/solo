import React from 'react';
import { HistoryAction } from '../types';

interface TimelineProps {
  history: HistoryAction[];
  historyIndex: number;
  onUndo: () => void;
  onRedo: () => void;
}

const Timeline: React.FC<TimelineProps> = ({
  history,
  historyIndex,
  onUndo,
  onRedo,
}) => {
  const getActionLabel = (action: HistoryAction): string => {
    const typeMap: Record<string, string> = {
      'shape:add': '绘制图形',
      'shape:update': '修改图形',
      'shape:delete': '删除图形',
      'note:add': '新建便签',
      'note:update': '编辑便签',
      'note:delete': '删除便签',
    };
    return typeMap[action.type] || action.type;
  };

  const getActionIcon = (action: HistoryAction): string => {
    if (action.type.startsWith('shape')) return '◇';
    if (action.type.startsWith('note')) return '▭';
    return '•';
  };

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="timeline-panel">
      <div className="timeline-header">
        <h3 className="panel-title">操作历史</h3>
        <div className="timeline-controls">
          <button
            className={`timeline-btn ${!canUndo ? 'disabled' : ''}`}
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            className={`timeline-btn ${!canRedo ? 'disabled' : ''}`}
            onClick={onRedo}
            disabled={!canRedo}
            title="重做 (Ctrl+Y)"
          >
            ↷
          </button>
        </div>
      </div>

      <div className="timeline-list">
        {history.length === 0 ? (
          <div className="empty-timeline">
            <p>暂无操作记录</p>
            <p className="hint">开始绘制吧！</p>
          </div>
        ) : (
          history.map((action, index) => (
            <div
              key={index}
              className={`timeline-item ${index <= historyIndex ? 'done' : 'future'}`}
            >
              <span className="timeline-icon">{getActionIcon(action)}</span>
              <span className="timeline-label">{getActionLabel(action)}</span>
              <span className="timeline-time">
                {new Date(action.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="timeline-footer">
        <span>{history.length} 步操作</span>
        <span>最多保留 200 步</span>
      </div>
    </div>
  );
};

export default Timeline;
