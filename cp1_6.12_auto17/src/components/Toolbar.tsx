import { useState } from 'react';
import type { ToolType } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: ToolType) => void;
  onStrokeColorChange: (color: string) => void;
  onFillColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
}

export default function Toolbar({
  currentTool,
  strokeColor,
  fillColor,
  strokeWidth,
  canUndo,
  canRedo,
  onToolChange,
  onStrokeColorChange,
  onFillColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  onExport
}: ToolbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const tools: { type: ToolType; label: string; icon: string }[] = [
    { type: 'pen', label: '画笔', icon: '✏️' },
    { type: 'rectangle', label: '矩形', icon: '▭' },
    { type: 'circle', label: '圆形', icon: '◯' }
  ];

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    onClear();
    setShowClearConfirm(false);
  };

  const toolbarContent = (
    <>
      <div className="toolbar-group">
        {tools.map(({ type, label, icon }) => (
          <button
            key={type}
            className={`tool-btn ${currentTool === type ? 'active' : ''}`}
            onClick={() => onToolChange(type)}
            title={label}
          >
            <span className="tool-icon">{icon}</span>
            <span className="tool-label">{label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <div className="color-picker-wrap">
          <label className="color-label">边框</label>
          <input
            type="color"
            className="color-picker"
            value={strokeColor}
            onChange={(e) => onStrokeColorChange(e.target.value)}
            title="边框颜色"
          />
        </div>
        <div className="color-picker-wrap">
          <label className="color-label">填充</label>
          <input
            type="color"
            className="color-picker"
            value={fillColor}
            onChange={(e) => onFillColorChange(e.target.value)}
            title="填充颜色"
          />
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <label className="stroke-label">粗细 {strokeWidth}px</label>
        <input
          type="range"
          className="stroke-slider"
          min={1}
          max={10}
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
        />
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="action-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销"
        >
          ↶ 撤销
        </button>
        <button
          className="action-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="重做"
        >
          ↷ 重做
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="action-btn danger"
          onClick={handleClear}
          title="清空白板"
        >
          🗑 清空
        </button>
        <button
          className="action-btn success"
          onClick={onExport}
          title="导出PNG"
        >
          💾 导出
        </button>
      </div>
    </>
  );

  return (
    <div className="toolbar">
      <button
        className="hamburger-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="菜单"
      >
        <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
        <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
        <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
      </button>

      <div className={`toolbar-content ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {toolbarContent}
      </div>

      {showClearConfirm && (
        <div className="clear-confirm-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="clear-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-text">确定要清空白板吗？此操作不可撤销。</p>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setShowClearConfirm(false)}>
                取消
              </button>
              <button className="confirm-btn danger" onClick={confirmClear}>
                确定清空
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .toolbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 50px;
          background-color: #2c3e50;
          display: flex;
          align-items: center;
          padding: 0 16px;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .hamburger-btn {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 28px;
          height: 22px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .hamburger-line {
          display: block;
          width: 100%;
          height: 3px;
          background-color: #ffffff;
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .toolbar-content {
          display: flex;
          align-items: center;
          gap: 0;
          width: 100%;
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
        }

        .toolbar-divider {
          width: 1px;
          height: 30px;
          background-color: rgba(255, 255, 255, 0.2);
        }

        .tool-btn,
        .action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          background-color: #34495e;
          color: #ffffff;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tool-btn:hover,
        .action-btn:hover:not(:disabled) {
          background-color: #3498db;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .tool-btn.active {
          background-color: #3498db;
          box-shadow: 0 2px 6px rgba(52, 152, 219, 0.4);
        }

        .action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .action-btn.danger:hover:not(:disabled) {
          background-color: #e74c3c;
        }

        .action-btn.success:hover:not(:disabled) {
          background-color: #27ae60;
        }

        .tool-icon {
          font-size: 16px;
        }

        .color-picker-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .color-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
        }

        .color-picker {
          width: 36px;
          height: 28px;
          padding: 0;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          background: none;
          cursor: pointer;
        }

        .color-picker::-webkit-color-swatch-wrapper {
          padding: 2px;
        }

        .color-picker::-webkit-color-swatch {
          border: none;
          border-radius: 2px;
        }

        .stroke-label {
          font-size: 12px;
          color: #ffffff;
          min-width: 50px;
        }

        .stroke-slider {
          width: 100px;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          outline: none;
        }

        .stroke-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3498db;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.2s;
        }

        .stroke-slider::-webkit-slider-thumb:hover {
          background: #2980b9;
        }

        .stroke-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #3498db;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        .clear-confirm-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .clear-confirm-dialog {
          background-color: #ffffff;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          max-width: 360px;
          width: 90%;
        }

        .confirm-text {
          font-size: 15px;
          color: #2c3e50;
          margin: 0 0 20px 0;
          line-height: 1.5;
        }

        .confirm-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .confirm-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .confirm-btn.cancel {
          background-color: #ecf0f1;
          color: #2c3e50;
        }

        .confirm-btn.cancel:hover {
          background-color: #bdc3c7;
        }

        .confirm-btn.danger {
          background-color: #e74c3c;
          color: #ffffff;
        }

        .confirm-btn.danger:hover {
          background-color: #c0392b;
        }

        @media (max-width: 768px) {
          .hamburger-btn {
            display: flex;
          }

          .toolbar-content {
            position: fixed;
            top: 50px;
            left: 0;
            right: 0;
            background-color: #2c3e50;
            flex-direction: column;
            align-items: flex-start;
            padding: 12px 16px;
            gap: 12px;
            transform: translateY(-150%);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            overflow-y: auto;
            max-height: calc(100vh - 50px);
          }

          .toolbar-content.mobile-open {
            transform: translateY(0);
          }

          .toolbar-group {
            flex-wrap: wrap;
            padding: 0;
            width: 100%;
          }

          .toolbar-divider {
            width: 100%;
            height: 1px;
          }

          .stroke-slider {
            flex: 1;
            min-width: 120px;
          }
        }
      `}</style>
    </div>
  );
}
