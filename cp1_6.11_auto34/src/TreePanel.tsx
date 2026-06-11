import React, { useCallback } from 'react';
import { useAppContext } from './store';
import { themes } from './themes';
import type { Action, MindMapNode } from './types';

interface TreePanelProps {
  dispatch: (action: Action) => void;
}

function TreePanel({ dispatch }: TreePanelProps) {
  const { state } = useAppContext();
  const t = themes[state.theme];

  const rootNodes = state.nodes.filter((n) => n.parentId === null);

  const handleSelect = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'SELECT_NODE', payload: { id: nodeId } });
    },
    [dispatch]
  );

  const renderTreeNode = (node: MindMapNode, depth: number): React.ReactNode => {
    const children = state.nodes.filter((n) => n.parentId === node.id);
    const isSelected = state.selectedNodeId === node.id;
    const hasChildren = children.length > 0;

    return (
      <div key={node.id}>
        <div
          onClick={() => handleSelect(node.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 8px',
            paddingLeft: 8 + depth * 16,
            cursor: 'pointer',
            borderRadius: 4,
            background: isSelected ? t.treeItemActive : 'transparent',
            color: t.cardText,
            fontSize: 12,
            transition: 'background 0.2s ease, color 0.5s ease',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) (e.currentTarget as HTMLElement).style.background = t.hoverBg;
          }}
          onMouseLeave={(e) => {
            if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {hasChildren && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'TOGGLE_COLLAPSE', payload: { id: node.id } });
              }}
              style={{
                fontSize: 8,
                opacity: 0.5,
                width: 12,
                textAlign: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease',
              }}
            >
              {node.collapsed ? '▶' : '▼'}
            </span>
          )}
          {!hasChildren && <span style={{ width: 12, flexShrink: 0 }} />}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: node.color === '#1a1a2e' || node.color === '#ffffff' ? t.accent : node.color,
              flexShrink: 0,
            }}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.text || '(空)'}
          </span>
        </div>
        {!node.collapsed && children.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
        transition: 'color 0.5s ease',
      }}
    >
      {rootNodes.length === 0 && (
        <div
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            color: t.cardText,
            opacity: 0.3,
            fontSize: 12,
          }}
        >
          双击画布创建节点
        </div>
      )}
      {rootNodes.map((node) => renderTreeNode(node, 0))}
    </div>
  );
}

export default TreePanel;
