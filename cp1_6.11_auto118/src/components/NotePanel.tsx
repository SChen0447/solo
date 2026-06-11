import React from 'react';
import { NOTE_COLORS } from '../types';

interface NotePanelProps {
  onAddNote: (color: string) => void;
}

const NotePanel: React.FC<NotePanelProps> = ({ onAddNote }) => {
  return (
    <div className="note-panel">
      <h3 className="panel-title">便签</h3>
      <p className="panel-subtitle">点击创建新便签</p>

      <div className="note-colors">
        {NOTE_COLORS.map((color) => (
          <button
            key={color}
            className="note-color-btn"
            style={{ backgroundColor: color }}
            onClick={() => onAddNote(color)}
            title="新建便签"
          >
            <span className="plus-sign">+</span>
          </button>
        ))}
      </div>

      <div className="panel-tips">
        <p>💡 提示：</p>
        <ul>
          <li>双击便签可编辑文本</li>
          <li>拖拽便签可移动位置</li>
          <li>拖拽四角可调整大小</li>
          <li>长按2秒可删除便签</li>
        </ul>
      </div>
    </div>
  );
};

export default NotePanel;
