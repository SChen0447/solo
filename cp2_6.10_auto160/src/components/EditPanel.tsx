import React, { useState } from 'react';
import type { DialogueNode } from '../types';

interface EditPanelProps {
  selectedNode: DialogueNode | null;
  isRoot: boolean;
  onContentChange: (content: string) => void;
  onAngerChange: (value: number) => void;
  onSadnessChange: (value: number) => void;
  onJoyChange: (value: number) => void;
  onAddChild: () => void;
  onDelete: () => void;
  onSetRoot: () => void;
  canAddChild: boolean;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const Slider: React.FC<{
  label: string;
  value: number;
  handleColor: string;
  onChange: (v: number) => void;
}> = ({ label, value, handleColor, onChange }) => {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: '#a9b1d6',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 13,
            color: handleColor,
            fontWeight: 600,
            fontFamily: 'monospace',
            minWidth: 32,
            textAlign: 'right',
          }}
        >
          {value > 0 ? '+' : ''}
          {value}
        </span>
      </div>
      <div style={{ position: 'relative', height: 18 }}>
        <input
          type="range"
          min={-10}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: 4,
            appearance: 'none',
            WebkitAppearance: 'none',
            background: '#565f89',
            borderRadius: 2,
            outline: 'none',
            cursor: 'pointer',
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: ${handleColor};
            cursor: pointer;
            border: none;
            box-shadow: 0 0 6px ${handleColor}80;
          }
          input[type="range"]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: ${handleColor};
            cursor: pointer;
            border: none;
            box-shadow: 0 0 6px ${handleColor}80;
          }
        `}</style>
      </div>
    </div>
  );
};

const EditPanel: React.FC<EditPanelProps> = ({
  selectedNode,
  isRoot,
  onContentChange,
  onAngerChange,
  onSadnessChange,
  onJoyChange,
  onAddChild,
  onDelete,
  onSetRoot,
  canAddChild,
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const id = Date.now() + Math.random();
    const newRipple: Ripple = {
      id,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 1000);
  };

  const renderButton = (
    label: string,
    onClick: () => void,
    bgStyle: React.CSSProperties,
    disabled: boolean = false,
    hoverEffect: boolean = false,
  ) => (
    <button
      onClick={(e) => {
        if (disabled) return;
        createRipple(e);
        onClick();
      }}
      disabled={disabled}
      style={{
        ...bgStyle,
        color: 'white',
        borderRadius: 8,
        border: 'none',
        padding: '10px 12px',
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: hoverEffect
          ? 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s'
          : 'opacity 0.2s',
        opacity: disabled ? 0.4 : 1,
        flex: 1,
        fontWeight: 500,
      }}
      onMouseEnter={(e) => {
        if (hoverEffect && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 4px 12px rgba(0,0,0,0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverEffect) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        }
      }}
    >
      {label}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
            width: 0,
            height: 0,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            animation: 'ripple 1s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ))}
    </button>
  );

  return (
    <div
      style={{
        width: 280,
        background: '#1a1b26',
        borderRadius: 12,
        padding: 16,
        boxSizing: 'border-box',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid transparent',
        transition: 'border-color 0.2s ease-in-out',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#7c3aed';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
      }}
    >
      <style>{`
        @keyframes ripple {
          to {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }
      `}</style>

      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#c9d1d9',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <i className="fa-solid fa-pen-to-square" style={{ color: '#7c3aed' }} />
        节点编辑面板
      </div>

      {selectedNode ? (
        <>
          <div
            style={{
              fontSize: 12,
              color: '#a9b1d6',
              marginBottom: 6,
            }}
          >
            对话内容
          </div>
          <textarea
            value={selectedNode.content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="在此输入对话内容..."
            style={{
              height: 120,
              background: '#2d2d44',
              borderRadius: 8,
              fontSize: 14,
              color: '#c9d1d9',
              border: 'none',
              padding: 10,
              resize: 'none',
              outline: 'none',
              marginBottom: 18,
              fontFamily: 'inherit',
              lineHeight: 1.5,
              boxSizing: 'border-box',
              width: '100%',
            }}
          />

          <Slider
            label="愤怒值变化"
            value={selectedNode.angerDelta}
            handleColor="#7c3aed"
            onChange={onAngerChange}
          />
          <Slider
            label="悲伤值变化"
            value={selectedNode.sadnessDelta}
            handleColor="#f59e0b"
            onChange={onSadnessChange}
          />
          <Slider
            label="喜悦值变化"
            value={selectedNode.joyDelta}
            handleColor="#10b981"
            onChange={onJoyChange}
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginTop: 6,
            }}
          >
            {renderButton(
              '添加子节点',
              onAddChild,
              {
                background: 'linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%)',
              },
              !canAddChild,
              true,
            )}
            {renderButton(
              '删除此节点',
              onDelete,
              { background: '#dc2626' },
              isRoot,
            )}
            {renderButton(
              '设置初始节点',
              onSetRoot,
              { background: '#10b981' },
              false,
            )}
          </div>
        </>
      ) : (
        <div
          style={{
            color: '#565f89',
            fontSize: 13,
            textAlign: 'center',
            padding: '40px 0',
            lineHeight: 1.6,
          }}
        >
          <i
            className="fa-regular fa-hand-pointer"
            style={{ fontSize: 28, marginBottom: 12, display: 'block', color: '#414868' }}
          />
          请在右侧点击选中一个节点进行编辑
        </div>
      )}
    </div>
  );
};

export default EditPanel;
