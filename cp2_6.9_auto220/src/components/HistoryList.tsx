import React from 'react';
import { MemoryBoard } from '../utils/types';
import { Download, Trash2 } from 'lucide-react';

interface HistoryListProps {
  boards: MemoryBoard[];
  onBoardSelect: (board: MemoryBoard) => void;
  onBoardDelete: (id: string) => void;
  onExportAll: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  boards,
  onBoardSelect,
  onBoardDelete,
  onExportAll
}) => {
  if (boards.length === 0) {
    return (
      <div className="history-empty">
        <p className="history-empty-text">还没有保存的画板，开始创建你的第一份旅行记忆吧！</p>
      </div>
    );
  }

  return (
    <div className="history-section">
      <div className="history-header">
        <h3 className="history-title" style={{ fontFamily: '"Crimson Text", serif' }}>我的旅行记忆</h3>
        <button className="ripple-btn export-all-btn" onClick={onExportAll}>
          <Download size={16} />
          导出全部 (JSON)
        </button>
      </div>

      <div className="history-scroll">
        {boards.map((board) => (
          <div key={board.id} className="history-card" onClick={() => onBoardSelect(board)}>
            <div className="card-thumb">
              <div className="card-grid">
                {board.photos.slice(0, 4).map((photo, i) => (
                  <div key={i} className="card-cell">
                    {photo.src && <img src={photo.src} alt="" className="card-img" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="card-info">
              <p className="card-date">{board.dateRange}</p>
              <p className="card-count">{board.photoCount} 张照片</p>
            </div>
            <button
              className="card-delete"
              onClick={(e) => {
                e.stopPropagation();
                onBoardDelete(board.id);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
