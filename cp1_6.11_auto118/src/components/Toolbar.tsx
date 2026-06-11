import React from 'react';
import { ToolType, COLOR_PALETTE } from '../types';

interface ToolbarProps {
  selectedTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
  selectedColor: string;
  onColorSelect: (color: string) => void;
  onExport: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  onToolSelect,
  selectedColor,
  onColorSelect,
  onExport,
}) => {
  const tools: { id: ToolType; icon: string; label: string }[] = [
    { id: 'select', icon: '↖', label: '选择' },
    { id: 'line', icon: '／', label: '直线' },
    { id: 'curve', icon: '〜', label: '曲线' },
    { id: 'rect', icon: '▢', label: '矩形' },
    { id: 'circle', icon: '○', label: '圆形' },
    { id: 'pan', icon: '✋', label: '平移' },
  ];

  return (
    <div className="toolbar">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`tool-btn ${selectedTool === tool.id ? 'active' : ''}`}
          onClick={() => onToolSelect(tool.id)}
          title={tool.label}
        >
          <span className="tool-icon">{tool.icon}</span>
        </button>
      ))}

      <div className="divider" />

      <div className="color-picker-section">
        <div className="current-color" style={{ backgroundColor: selectedColor }} />
        <div className="color-grid">
          {COLOR_PALETTE.slice(0, 8).map((color) => (
            <button
              key={color}
              className={`color-btn ${selectedColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onColorSelect(color)}
            />
          ))}
        </div>
      </div>

      <div className="divider" />

      <button className="tool-btn export-btn" onClick={onExport} title="导出">
        <span className="tool-icon">⬇</span>
      </button>
    </div>
  );
};

export default Toolbar;
