import React, { useState } from 'react';
import { Shape, Note } from '../types';
import { exportToPNG, exportToSVG, downloadFile } from '../utils/exportUtils';

interface ExportModalProps {
  shapes: Shape[];
  notes: Note[];
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ shapes, notes, onClose }) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportType, setExportType] = useState<'png' | 'svg'>('png');

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      if (exportType === 'png') {
        const blob = await exportToPNG(shapes, notes);
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          downloadFile(blob, 'whiteboard-export.png');
          setExporting(false);
          onClose();
        }, 300);
      } else {
        const svgContent = exportToSVG(shapes, notes);
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          downloadFile(blob, 'whiteboard-export.svg');
          setExporting(false);
          onClose();
        }, 300);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>导出画布</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="export-options">
            <div
              className={`export-option ${exportType === 'png' ? 'selected' : ''}`}
              onClick={() => setExportType('png')}
            >
              <div className="export-icon">🖼️</div>
              <div className="export-info">
                <h4>PNG 图片</h4>
                <p>1920 × 1080 分辨率，白色背景</p>
              </div>
            </div>

            <div
              className={`export-option ${exportType === 'svg' ? 'selected' : ''}`}
              onClick={() => setExportType('svg')}
            >
              <div className="export-icon">📐</div>
              <div className="export-info">
                <h4>SVG 矢量图</h4>
                <p>保持所有图形和便签样式</p>
              </div>
            </div>
          </div>

          {exporting && (
            <div className="export-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p>正在导出... {progress}%</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? '导出中...' : '开始导出'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
