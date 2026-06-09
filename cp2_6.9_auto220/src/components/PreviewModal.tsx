import React from 'react';
import { X, Smartphone, Square } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardContent: React.ReactNode;
  onExportWallpaper: () => void;
  onExportSquare: () => void;
  exporting: boolean;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  boardContent,
  onExportWallpaper,
  onExportSquare,
  exporting
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-content">
          <div className="modal-board-wrapper">
            {boardContent}
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="ripple-btn export-btn"
            onClick={onExportWallpaper}
            disabled={exporting}
          >
            <Smartphone size={20} />
            {exporting ? '导出中...' : '手机壁纸 (1080×1920)'}
          </button>
          <button
            className="ripple-btn export-btn"
            onClick={onExportSquare}
            disabled={exporting}
          >
            <Square size={20} />
            {exporting ? '导出中...' : '正方形分享 (1080×1080)'}
          </button>
        </div>
      </div>
    </div>
  );
};
