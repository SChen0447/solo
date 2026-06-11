import React from 'react';
import { useAppContext } from './store';
import { themes } from './themes';
import Canvas from './Canvas';
import TreePanel from './TreePanel';
import NodeEditor from './NodeEditor';
import ThemeSwitch from './ThemeSwitch';
import type { Action, AppState } from './types';

interface AppProps {
  dispatch: (action: Action) => void;
}

function App({ dispatch }: AppProps) {
  const { state } = useAppContext();
  const t = themes[state.theme];

  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: t.bg,
        transition: 'background 0.5s ease, color 0.5s ease',
        color: t.cardText,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 48,
          minHeight: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: t.panelBg,
          borderBottom: `1px solid ${t.panelBorder}`,
          backdropFilter: 'blur(12px)',
          transition: 'background 0.5s ease, border-color 0.5s ease',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.5px', color: t.accent }}>
            ◈ CollabMindMap
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 10,
              background: state.connected ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)',
              color: state.connected ? '#4ade80' : '#f87171',
            }}
          >
            {state.connected ? '● 已连接' : '○ 未连接'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeSwitch currentTheme={state.theme} dispatch={dispatch} />
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${t.accent}, ${t.accent}88)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: t.accentText,
            }}
            title={state.userId.slice(0, 6)}
          >
            {state.userId.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          style={{
            width: leftCollapsed ? 40 : 240,
            minWidth: leftCollapsed ? 40 : 240,
            transition: 'width 0.3s ease, min-width 0.3s ease',
            borderRight: `1px solid ${t.panelBorder}`,
            background: t.panelBg,
            backdropFilter: 'blur(12px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${t.panelBorder}`,
            }}
          >
            {!leftCollapsed && (
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>节点层级</span>
            )}
            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                color: t.cardText,
                cursor: 'pointer',
                fontSize: 14,
                padding: 4,
                opacity: 0.6,
                transition: 'opacity 0.2s',
              }}
            >
              {leftCollapsed ? '▶' : '◀'}
            </button>
          </div>
          {!leftCollapsed && <TreePanel dispatch={dispatch} />}
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Canvas dispatch={dispatch} />

          {state.collision && (
            <div
              style={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                background: t.panelBg,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${t.panelBorder}`,
                borderRadius: 8,
                padding: '10px 16px',
                boxShadow: t.shadow,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <span style={{ fontSize: 13 }}>
                ⚠ 用户 <strong style={{ color: state.remoteUsers[state.collision.userId]?.color || t.accent }}>
                  {state.collision.userName}
                </strong> 正在编辑该节点
              </span>
              <button
                onClick={() => dispatch({ type: 'DISMISS_COLLISION', payload: {} })}
                style={{
                  background: t.buttonBg,
                  color: t.buttonText,
                  border: 'none',
                  borderRadius: 4,
                  padding: '3px 10px',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                知道了
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            width: rightCollapsed ? 40 : 260,
            minWidth: rightCollapsed ? 40 : 260,
            transition: 'width 0.3s ease, min-width 0.3s ease',
            borderLeft: `1px solid ${t.panelBorder}`,
            background: t.panelBg,
            backdropFilter: 'blur(12px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${t.panelBorder}`,
            }}
          >
            {!rightCollapsed && (
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>属性面板</span>
            )}
            <button
              onClick={() => setRightCollapsed(!rightCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                color: t.cardText,
                cursor: 'pointer',
                fontSize: 14,
                padding: 4,
                opacity: 0.6,
                transition: 'opacity 0.2s',
              }}
            >
              {rightCollapsed ? '◀' : '▶'}
            </button>
          </div>
          {!rightCollapsed && <NodeEditor dispatch={dispatch} />}
        </div>
      </div>
    </div>
  );
}

export default App;
