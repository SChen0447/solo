import React, { useState } from 'react';
import type { DiagramNode, DiagramEdge } from './Canvas';

interface PropertyPanelProps {
  node: DiagramNode | null;
  edge: DiagramEdge | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNodeUpdate: (node: Partial<DiagramNode> & { id: string }) => void;
  onEdgeUpdate: (edge: Partial<DiagramEdge> & { id: string }) => void;
}

const FILL_COLORS = [
  '#FF6B6B', '#48C9B0', '#FFD93D', '#6C5CE7',
  '#00B894', '#E17055', '#74B9FF', '#FD79A8',
  '#55EFC4', '#FAB1A0', '#A29BFE', '#81ECEC',
  '#DFE6E9', '#636E72', '#2D3436', '#74B9FF',
];

const STROKE_COLORS = [
  '#FFFFFF40', '#FFFFFF80', '#FFFFFFFF', '#00000040',
  '#FF6B6B', '#48C9B0', '#FFD93D', '#6C5CE7',
  '#00B894', '#E17055', '#74B9FF', '#FD79A8',
  '#55EFC4', '#A29BFE', '#81ECEC', '#636E72',
];

const ColorPicker: React.FC<{
  value: string;
  onChange: (c: string) => void;
  colors: string[];
  label: string;
}> = ({ value, onChange, colors, label }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: '#ccc', fontSize: 12, fontFamily: 'Inter', width: 72 }}>{label}</span>
        <div
          onClick={() => setOpen(o => !o)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            background: value.includes('#FFFFFF') ? value + (value.length <= 7 ? '' : '') : value,
            border: '1px solid #ffffff30',
            cursor: 'pointer',
            transition: 'transform 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
        />
        <span style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}>{value}</span>
      </div>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          />
          <div
            style={{
              position: 'absolute',
              top: 36,
              left: 72,
              zIndex: 100,
              padding: 10,
              borderRadius: 8,
              background: '#ffffff10',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid #ffffff30',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
            }}
          >
            {colors.map(c => (
              <div
                key={c}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                title={c}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  background: c,
                  border: '1px solid #ffffff20',
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                  transform: value === c ? 'scale(1.15)' : 'scale(1)',
                }}
                onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                onMouseOut={e => (e.currentTarget.style.transform = value === c ? 'scale(1.15)' : 'scale(1)')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
    <span style={{ color: '#ccc', fontSize: 12, fontFamily: 'Inter', width: 72 }}>{label}</span>
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        flex: 1,
        padding: '6px 8px',
        background: '#1E1E2E',
        color: '#fff',
        border: '1px solid #ffffff20',
        borderRadius: 4,
        fontFamily: 'Inter',
        fontSize: 12,
        outline: 'none',
      }}
      onFocus={e => (e.currentTarget.style.borderColor = '#6C5CE7')}
      onBlur={e => (e.currentTarget.style.borderColor = '#ffffff20')}
    />
  </div>
);

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  node,
  edge,
  collapsed,
  onToggleCollapse,
  onNodeUpdate,
  onEdgeUpdate,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        width: collapsed ? 2 : 240,
        background: '#2D2D3F',
        borderLeft: '1px solid #ffffff10',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <button
        onClick={onToggleCollapse}
        style={{
          position: 'absolute',
          top: 12,
          left: collapsed ? -6 : -10,
          width: 22,
          height: 36,
          background: '#2D2D3F',
          border: '1px solid #ffffff20',
          borderRight: collapsed ? 'none' : undefined,
          borderRadius: collapsed ? '6px 0 0 6px' : '6px 0 0 6px',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          zIndex: 10,
          transition: 'opacity 0.2s',
        }}
      >
        {collapsed ? '◀' : '▶'}
      </button>

      {!collapsed && (
        <div style={{ padding: '48px 16px 16px', color: '#fff', fontFamily: 'Inter' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#fff' }}>
            属性面板
          </h3>

          {!node && !edge && (
            <p style={{ color: '#888', fontSize: 12, lineHeight: 1.6 }}>
              选中一个节点或连线以编辑属性。
              <br /><br />
              快捷键：
              <br />R - 添加方形
              <br />D - 添加菱形
              <br />C - 添加圆形
              <br />Del - 删除选中
              <br />滚轮 - 缩放画布
              <br />空白拖拽 - 平移画布
            </p>
          )}

          {node && (
            <>
              <div style={{ marginBottom: 16, padding: '8px 10px', background: '#1E1E2E', borderRadius: 6 }}>
                <span style={{ fontSize: 11, color: '#888' }}>类型：</span>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>
                  {node.type === 'rect' ? '方形' : node.type === 'diamond' ? '菱形' : '圆形'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
                <NumberField label="X" value={node.x} onChange={v => onNodeUpdate({ id: node.id, x: v })} />
                <NumberField label="Y" value={node.y} onChange={v => onNodeUpdate({ id: node.id, y: v })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
                <NumberField label="宽" value={node.width} onChange={v => onNodeUpdate({ id: node.id, width: v })} />
                <NumberField label="高" value={node.height} onChange={v => onNodeUpdate({ id: node.id, height: v })} />
              </div>

              <ColorPicker
                label="填充色"
                value={node.fill}
                colors={FILL_COLORS}
                onChange={c => onNodeUpdate({ id: node.id, fill: c })}
              />
              <ColorPicker
                label="边框色"
                value={node.stroke}
                colors={STROKE_COLORS}
                onChange={c => onNodeUpdate({ id: node.id, stroke: c })}
              />

              <NumberField
                label="边框粗细"
                value={node.strokeWidth}
                onChange={v => onNodeUpdate({ id: node.id, strokeWidth: Math.max(0, v) })}
              />

              <div style={{ marginTop: 8 }}>
                <span style={{ color: '#ccc', fontSize: 12, fontFamily: 'Inter', display: 'block', marginBottom: 4 }}>文本</span>
                <textarea
                  value={node.text}
                  onChange={e => onNodeUpdate({ id: node.id, text: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: 60,
                    padding: '6px 8px',
                    background: '#1E1E2E',
                    color: '#fff',
                    border: '1px solid #ffffff20',
                    borderRadius: 4,
                    fontFamily: 'Inter',
                    fontSize: 12,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6C5CE7')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#ffffff20')}
                />
              </div>
            </>
          )}

          {edge && !node && (
            <>
              <div style={{ marginBottom: 16, padding: '8px 10px', background: '#1E1E2E', borderRadius: 6 }}>
                <span style={{ fontSize: 11, color: '#888' }}>类型：</span>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>连线</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{ color: '#ccc', fontSize: 12, fontFamily: 'Inter', display: 'block', marginBottom: 4 }}>标签</span>
                <input
                  type="text"
                  value={edge.label}
                  onChange={e => onEdgeUpdate({ id: edge.id, label: e.target.value })}
                  placeholder="双击连线也可编辑"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#1E1E2E',
                    color: '#fff',
                    border: '1px solid #ffffff20',
                    borderRadius: 4,
                    fontFamily: 'Inter',
                    fontSize: 12,
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6C5CE7')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#ffffff20')}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyPanel;
