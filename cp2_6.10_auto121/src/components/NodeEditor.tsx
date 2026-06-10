import React, { useState, useEffect, useRef } from 'react';
import { MindMapNode } from '../utils/store';

interface NodeEditorProps {
  node: MindMapNode;
  onUpdate: (node: MindMapNode) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

const PRESET_COLORS = [
  '#f0f0f0',
  '#f8d7da',
  '#d4edda',
  '#cce5ff',
  '#fff3cd',
  '#e2d9f3',
  '#ffeaa7',
  '#fab1a0',
  '#81ecec',
  '#a29bfe'
];

const NodeEditor: React.FC<NodeEditorProps> = ({ node, onUpdate, onClose, onDelete }) => {
  const [title, setTitle] = useState(node.title);
  const [color, setColor] = useState(node.color);
  const [note, setNote] = useState(node.note);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(node.title);
    setColor(node.color);
    setNote(node.note);
  }, [node]);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, []);

  const saveAndClose = () => {
    onUpdate({
      ...node,
      title: title.trim() || '新节点',
      color,
      note
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveAndClose();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    padding: 24,
    width: 360,
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  };

  const titleTextStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: '#2c3e50'
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#7f8c8d',
    padding: '4px 8px',
    borderRadius: 4,
    transition: 'all 0.2s ease'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#2c3e50',
    marginBottom: 6
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
    marginBottom: 16,
    fontFamily: 'inherit'
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: 'vertical',
    minHeight: 80
  };

  const colorContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16
  };

  const colorBtnStyle = (c: string, isSelected: boolean): React.CSSProperties => ({
    width: 28,
    height: 28,
    borderRadius: 6,
    border: isSelected ? '2px solid #2980b9' : '1px solid #ddd',
    background: c,
    cursor: 'pointer',
    padding: 0,
    transition: 'transform 0.2s ease',
    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
  });

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    marginTop: 20
  };

  const btnBaseStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 6,
    border: 'none',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const cancelBtnStyle: React.CSSProperties = {
    ...btnBaseStyle,
    background: '#ecf0f1',
    color: '#2c3e50'
  };

  const deleteBtnStyle: React.CSSProperties = {
    ...btnBaseStyle,
    background: '#e74c3c',
    color: '#fff'
  };

  const saveBtnStyle: React.CSSProperties = {
    ...btnBaseStyle,
    background: '#2980b9',
    color: '#fff'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={containerStyle} onKeyDown={handleKeyDown}>
        <div style={headerStyle}>
          <span style={titleTextStyle}>编辑节点</span>
          <button
            style={closeBtnStyle}
            onClick={onClose}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#ecf0f1'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'none'; }}
          >
            ✕
          </button>
        </div>

        <label style={labelStyle}>标题</label>
        <input
          ref={titleRef}
          style={inputStyle}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveAndClose}
          placeholder="节点标题"
        />

        <label style={labelStyle}>颜色</label>
        <div style={colorContainerStyle}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              style={colorBtnStyle(c, color === c)}
              onClick={() => setColor(c)}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.transform = 'scale(1.15)'; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.transform = color === c ? 'scale(1.1)' : 'scale(1)'; }}
            />
          ))}
        </div>

        <label style={labelStyle}>备注</label>
        <textarea
          style={textareaStyle}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="添加备注..."
          rows={3}
        />

        <div style={actionsStyle}>
          <button
            style={cancelBtnStyle}
            onClick={onClose}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#dfe6e9'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#ecf0f1'; }}
          >
            取消
          </button>
          <button
            style={deleteBtnStyle}
            onClick={() => onDelete(node.id)}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#c0392b'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#e74c3c'; }}
          >
            删除
          </button>
          <button
            style={saveBtnStyle}
            onClick={saveAndClose}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#2471a3'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#2980b9'; }}
          >
            保存
          </button>
        </div>
      </div>
    </>
  );
};

export default NodeEditor;
