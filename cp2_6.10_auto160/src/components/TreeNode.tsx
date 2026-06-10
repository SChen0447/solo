import React from 'react';
import type { DialogueNode, NodePosition } from '../types';

interface TreeNodeProps {
  node: DialogueNode;
  nodes: Record<string, DialogueNode>;
  selectedId: string | null;
  positions: Record<string, NodePosition>;
  nodeIndex: number;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

const NODE_WIDTH = 240;
const NODE_MIN_HEIGHT = 80;
const CHILDREN_GAP = 60;

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  nodes,
  selectedId,
  positions,
  nodeIndex,
  onSelect,
  onAddChild,
}) => {
  const pos = positions[node.id];
  if (!pos) return null;

  const isSelected = selectedId === node.id;
  const canAddChild = node.childIds.length < 4;

  const getEmotionDotStyle = (value: number, color: string): React.CSSProperties => {
    if (value > 0) {
      return {
        backgroundColor: color,
        transform: 'scale(1.2)',
        boxShadow: `0 0 6px ${color}`,
        opacity: 1,
      };
    } else if (value < 0) {
      return {
        backgroundColor: color,
        opacity: 0.4,
      };
    }
    return {
      backgroundColor: color,
      opacity: 0.6,
    };
  };

  const childNodes = node.childIds.map((id) => nodes[id]).filter(Boolean);
  const totalChildrenWidth =
    childNodes.length * NODE_WIDTH + (childNodes.length - 1) * CHILDREN_GAP;

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: NODE_WIDTH,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <svg
        style={{
          position: 'absolute',
          top: NODE_MIN_HEIGHT,
          left: 0,
          width: Math.max(NODE_WIDTH, totalChildrenWidth),
          height: 160,
          overflow: 'visible',
          pointerEvents: 'none',
          transform: `translateX(${(NODE_WIDTH - Math.max(NODE_WIDTH, totalChildrenWidth)) / 2}px)`,
        }}
      >
        {childNodes.map((child) => {
          const childPos = positions[child.id];
          if (!childPos) return null;
          const x1 = NODE_WIDTH / 2;
          const y1 = 0;
          const relativeChildX =
            (NODE_WIDTH - Math.max(NODE_WIDTH, totalChildrenWidth)) / 2 +
            (childPos.x - pos.x) +
            NODE_WIDTH / 2;
          const x2 = relativeChildX;
          const y2 = childPos.y - pos.y - NODE_MIN_HEIGHT;
          const ctrlY1 = y1 + 50;
          const ctrlY2 = y2 - 50;
          return (
            <path
              key={child.id}
              d={`M ${x1} ${y1} C ${x1} ${ctrlY1}, ${x2} ${ctrlY2}, ${x2} ${y2}`}
              stroke="#565f89"
              strokeWidth={2}
              fill="none"
              style={{
                transition: 'd 0.4s ease-out',
              }}
            />
          );
        })}
      </svg>

      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        style={{
          width: NODE_WIDTH,
          minHeight: NODE_MIN_HEIGHT,
          background: '#2d2d44',
          border: isSelected ? '1px solid #7c3aed' : '1px solid #414868',
          borderRadius: 12,
          padding: 12,
          cursor: 'pointer',
          position: 'relative',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          boxShadow: isSelected ? '0 0 12px rgba(124, 58, 237, 0.4)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#7c3aed';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#414868';
          }
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: '#565f89',
            marginBottom: 6,
            fontFamily: 'monospace',
          }}
        >
          节点 #{nodeIndex}
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#c9d1d9',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: 'break-word',
            marginBottom: 10,
            minHeight: 56,
          }}
        >
          {node.content || '（空对话）'}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              transition: 'all 0.2s ease-in-out',
              ...getEmotionDotStyle(node.angerDelta, '#ef4444'),
            }}
            title={`愤怒 ${node.angerDelta > 0 ? '+' : ''}${node.angerDelta}`}
          />
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              transition: 'all 0.2s ease-in-out',
              ...getEmotionDotStyle(node.sadnessDelta, '#3b82f6'),
            }}
            title={`悲伤 ${node.sadnessDelta > 0 ? '+' : ''}${node.sadnessDelta}`}
          />
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              transition: 'all 0.2s ease-in-out',
              ...getEmotionDotStyle(node.joyDelta, '#10b981'),
            }}
            title={`喜悦 ${node.joyDelta > 0 ? '+' : ''}${node.joyDelta}`}
          />
        </div>

        {canAddChild && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            style={{
              position: 'absolute',
              right: -8,
              bottom: -8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: '20px',
              textAlign: 'center',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'rotate(0deg)';
            }}
            title="添加子节点"
          >
            <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TreeNode;
