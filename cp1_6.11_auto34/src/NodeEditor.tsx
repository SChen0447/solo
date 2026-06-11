import React from 'react';
import { useAppContext } from './store';
import { themes } from './themes';
import type { Action } from './types';

interface NodeEditorProps {
  dispatch: (action: Action) => void;
}

function NodeEditor({ dispatch }: NodeEditorProps) {
  const { state } = useAppContext();
  const t = themes[state.theme];
  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId);

  if (!selectedNode) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          color: t.cardText,
          opacity: 0.4,
          fontSize: 13,
          textAlign: 'center',
          transition: 'color 0.5s ease',
        }}
      >
        选择一个节点<br />以编辑其属性
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        padding: 16,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, display: 'block', marginBottom: 6, transition: 'color 0.5s ease' }}>
          节点文字
        </label>
        <input
          value={selectedNode.text}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_NODE_TEXT',
              payload: { id: selectedNode.id, text: e.target.value, userId: state.userId },
            })
          }
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 6,
            border: `1px solid ${t.inputBorder}`,
            background: t.inputBg,
            color: t.inputText,
            fontSize: 13,
            outline: 'none',
            transition: 'background 0.5s ease, border-color 0.5s ease, color 0.5s ease',
          }}
        />
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, display: 'block', marginBottom: 6, transition: 'color 0.5s ease' }}>
          文字大小: {selectedNode.fontSize}px
        </label>
        <input
          type="range"
          min={10}
          max={32}
          value={selectedNode.fontSize}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_NODE_STYLE',
              payload: { id: selectedNode.id, fontSize: Number(e.target.value), userId: state.userId },
            })
          }
          style={{ width: '100%', accentColor: t.accent }}
        />
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, display: 'block', marginBottom: 6, transition: 'color 0.5s ease' }}>
          文字颜色
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['#1a1a2e', '#e0f2fe', '#dcfce7', '#f472b6', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#818cf8', '#c084fc', '#f87171', '#ffffff'].map(
            (color) => (
              <button
                key={color}
                onClick={() =>
                  dispatch({
                    type: 'UPDATE_NODE_STYLE',
                    payload: { id: selectedNode.id, color, userId: state.userId },
                  })
                }
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: selectedNode.color === color ? `2px solid ${t.accent}` : `1px solid ${t.panelBorder}`,
                  background: color,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease',
                }}
              />
            )
          )}
          <input
            type="color"
            value={selectedNode.color}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_NODE_STYLE',
                payload: { id: selectedNode.id, color: e.target.value, userId: state.userId },
              })
            }
            style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
          />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, display: 'block', marginBottom: 6, transition: 'color 0.5s ease' }}>
          节点形状
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['rectangle', 'rounded', 'ellipse'] as const).map((shape) => (
            <button
              key={shape}
              onClick={() =>
                dispatch({
                  type: 'UPDATE_NODE_STYLE',
                  payload: { id: selectedNode.id, shape, userId: state.userId },
                })
              }
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: shape === 'ellipse' ? '50%' : shape === 'rounded' ? 12 : 4,
                border: selectedNode.shape === shape ? `2px solid ${t.accent}` : `1px solid ${t.panelBorder}`,
                background: selectedNode.shape === shape ? t.hoverBg : t.inputBg,
                color: t.cardText,
                fontSize: 11,
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, background 0.2s ease, color 0.5s ease',
              }}
            >
              {shape === 'rectangle' ? '方形' : shape === 'rounded' ? '圆角' : '椭圆'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, display: 'block', marginBottom: 6, transition: 'color 0.5s ease' }}>
          位置
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 10, opacity: 0.5 }}>X</span>
            <input
              type="number"
              value={Math.round(selectedNode.x)}
              onChange={(e) =>
                dispatch({
                  type: 'MOVE_NODE',
                  payload: { id: selectedNode.id, x: Number(e.target.value), y: selectedNode.y, userId: state.userId },
                })
              }
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 4,
                border: `1px solid ${t.inputBorder}`,
                background: t.inputBg,
                color: t.inputText,
                fontSize: 12,
                outline: 'none',
                transition: 'background 0.5s ease, border-color 0.5s ease, color 0.5s ease',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 10, opacity: 0.5 }}>Y</span>
            <input
              type="number"
              value={Math.round(selectedNode.y)}
              onChange={(e) =>
                dispatch({
                  type: 'MOVE_NODE',
                  payload: { id: selectedNode.id, x: selectedNode.x, y: Number(e.target.value), userId: state.userId },
                })
              }
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 4,
                border: `1px solid ${t.inputBorder}`,
                background: t.inputBg,
                color: t.inputText,
                fontSize: 12,
                outline: 'none',
                transition: 'background 0.5s ease, border-color 0.5s ease, color 0.5s ease',
              }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={() =>
          dispatch({ type: 'DELETE_NODE', payload: { id: selectedNode.id, userId: state.userId } })
        }
        style={{
          padding: '8px 0',
          borderRadius: 6,
          border: '1px solid rgba(248, 113, 113, 0.3)',
          background: 'rgba(248, 113, 113, 0.1)',
          color: '#f87171',
          fontSize: 12,
          cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
      >
        删除节点
      </button>
    </div>
  );
}

export default NodeEditor;
