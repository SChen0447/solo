import React from 'react';

interface ToolbarProps {
  onAddElement: () => void;
  onSave: () => void;
  onExport: () => void;
}

const Icon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const Toolbar: React.FC<ToolbarProps> = ({ onAddElement, onSave, onExport }) => {
  return (
    <header className="toolbar">
      <div className="toolbar-title">灵感织网</div>
      <button className="toolbar-btn primary" onClick={onAddElement}>
        <Icon path="M12 5v14M5 12h14" />
        <span>添加元素</span>
      </button>
      <div style={{ flex: 1 }} />
      <button className="toolbar-btn" onClick={onSave}>
        <Icon path="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8" />
        <span>保存</span>
      </button>
      <button className="toolbar-btn" onClick={onExport}>
        <Icon path="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />
        <span>导出</span>
      </button>
    </header>
  );
};

export default Toolbar;
