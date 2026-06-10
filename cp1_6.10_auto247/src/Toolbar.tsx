import React from 'react';
import { ToolType, COLOR_PALETTE } from './utils';

interface ToolbarProps {
  selectedTool: ToolType | null;
  currentColor: string;
  onSelectTool: (tool: ToolType) => void;
  onSelectColor: (color: string) => void;
}

const toolConfigs: { tool: ToolType; label: string; icon: string }[] = [
  { tool: 'rect', label: '矩形', icon: '▢' },
  { tool: 'circle', label: '圆形', icon: '○' },
  { tool: 'path', label: '路径', icon: '✎' },
  { tool: 'sticky', label: '便签', icon: '✦' },
  { tool: 'handwrite', label: '手写', icon: '✍' }
];

const Toolbar: React.FC<ToolbarProps> = ({ selectedTool, currentColor, onSelectTool, onSelectColor }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '50px',
        backgroundColor: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        zIndex: 100,
        gap: '12px',
        transition: 'all 0.2s ease'
      }}
    >
      <div
        style={{
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '16px',
          fontFamily: 'system-ui, sans-serif',
          marginRight: '12px'
        }}
      >
        画布共生
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {toolConfigs.map(({ tool, label, icon }) => {
          const isActive = selectedTool === tool;
          return (
            <button
              key={tool}
              onClick={() => onSelectTool(tool)}
              title={label}
              style={{
                width: '34px',
                height: '34px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: isActive ? '#3b82f6' : 'transparent',
                color: isActive ? '#ffffff' : '#cbd5e1',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                fontFamily: 'system-ui, sans-serif'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#334155';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              {icon}
            </button>
          );
        })}
      </div>
      <div
        style={{
          width: '1px',
          height: '28px',
          backgroundColor: '#475569',
          margin: '0 4px'
        }}
      />
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        {COLOR_PALETTE.map((color) => {
          const isSelected = color === currentColor;
          return (
            <button
              key={color}
              onClick={() => onSelectColor(color)}
              style={{
                width: '22px',
                height: '22px',
                border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                borderRadius: '4px',
                backgroundColor: color,
                cursor: 'pointer',
                padding: 0,
                boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Toolbar;
