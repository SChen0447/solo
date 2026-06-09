import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { ParseNode } from './RegexParser';

const NODE_COLORS: Record<string, string> = {
  literal: '#66D9EF',
  quantifier: '#FD971F',
  group: '#AE81FF',
  anchor: '#F92672',
  charset: '#A6E22E',
  escape: '#66D9EF',
  dot: '#66D9EF',
  alternation: '#E6DB74',
  root: '#75715E'
};

const NODE_WIDTH = 110;
const NODE_HEIGHT = 56;
const H_GAP = 30;
const V_GAP = 60;

interface PositionedNode {
  node: ParseNode;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

interface Edge {
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface SVGVisProps {
  ast: ParseNode | null;
  onNodeUpdate: (nodeId: string, params: Partial<ParseNode['params']>) => void;
  onNodeDelete: (nodeId: string) => void;
}

const SVGVis: React.FC<SVGVisProps> = ({ ast, onNodeUpdate, onNodeDelete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const layout = useMemo(() => {
    if (!ast) return { nodes: [] as PositionedNode[], edges: [] as Edge[], width: 900, height: 500 };

    const nodes: PositionedNode[] = [];
    const edges: Edge[] = [];

    const measureWidth = (node: ParseNode): number => {
      if (node.children.length === 0) return NODE_WIDTH;
      const childWidths = node.children.map(measureWidth);
      const childrenTotal = childWidths.reduce((a, b) => a + b, 0) + (node.children.length - 1) * H_GAP;
      return Math.max(NODE_WIDTH, childrenTotal);
    };

    const placeNode = (node: ParseNode, x: number, y: number, depth: number): PositionedNode => {
      const width = measureWidth(node);
      const pos: PositionedNode = {
        node,
        x: x + (width - NODE_WIDTH) / 2,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        depth
      };
      nodes.push(pos);

      if (node.children.length > 0) {
        let cursorX = x;
        const childY = y + NODE_HEIGHT + V_GAP;

        node.children.forEach((child) => {
          const childWidth = measureWidth(child);
          const childPos = placeNode(child, cursorX, childY, depth + 1);

          edges.push({
            fromId: node.id,
            toId: child.id,
            fromX: pos.x + NODE_WIDTH / 2,
            fromY: pos.y + NODE_HEIGHT,
            toX: childPos.x + NODE_WIDTH / 2,
            toY: childPos.y
          });

          cursorX += childWidth + H_GAP;
        });
      }

      return pos;
    };

    const totalWidth = measureWidth(ast);
    placeNode(ast, 20, 30, 0);

    const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
    const totalHeight = 30 + (maxDepth + 1) * (NODE_HEIGHT + V_GAP);

    return {
      nodes,
      edges,
      width: Math.max(900, totalWidth + 40),
      height: Math.max(500, totalHeight + 30)
    };
  }, [ast]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(3, Math.max(0.5, prev * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleNodeHover = useCallback((node: ParseNode, e: React.MouseEvent) => {
    setHoveredNodeId(node.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15,
        text: node.description
      });
    }
  }, []);

  const handleNodeLeave = useCallback(() => {
    setHoveredNodeId(null);
    setTooltip(null);
  }, []);

  const handleNodeClick = useCallback((node: ParseNode) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const selectedNode = useMemo(() => {
    const found = layout.nodes.find((n) => n.node.id === selectedNodeId);
    return found?.node ?? null;
  }, [layout.nodes, selectedNodeId]);

  const renderEditPanel = () => {
    if (!selectedNode) return null;

    const params = selectedNode.params || {};
    const nodePos = layout.nodes.find((n) => n.node.id === selectedNodeId)!;

    return (
      <div
        style={{
          position: 'absolute',
          left: Math.min(nodePos.x * scale + offset.x + NODE_WIDTH * scale + 20, 800),
          top: nodePos.y * scale + offset.y,
          backgroundColor: '#3C3C5A',
          border: '1px solid #555577',
          borderRadius: '10px',
          padding: '16px',
          minWidth: '240px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'scaleIn 0.2s ease-out',
          transformOrigin: 'left center',
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ color: NODE_COLORS[selectedNode.type], fontSize: '14px', fontWeight: 600, margin: 0 }}>
            编辑节点
          </h4>
          <button
            onClick={() => setSelectedNodeId(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#8888AA',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0 4px'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '10px', color: '#CDD6F4', fontSize: '13px' }}>
          <span style={{ color: '#8888AA' }}>类型: </span>
          {selectedNode.type}
        </div>
        <div style={{ marginBottom: '14px', color: '#CDD6F4', fontSize: '13px' }}>
          <span style={{ color: '#8888AA' }}>值: </span>
          <code style={{ backgroundColor: '#2D2D3F', padding: '2px 6px', borderRadius: '4px', color: NODE_COLORS[selectedNode.type] }}>
            {selectedNode.label}
          </code>
        </div>

        {selectedNode.type === 'quantifier' && (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', color: '#8888AA', fontSize: '12px', marginBottom: '4px' }}>最小次数 (min)</label>
              <input
                type="number"
                value={params.min ?? 0}
                onChange={(e) => onNodeUpdate(selectedNode.id, { min: Math.max(0, parseInt(e.target.value) || 0) })}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', color: '#8888AA', fontSize: '12px', marginBottom: '4px' }}>最大次数 (max, 留空为无限)</label>
              <input
                type="number"
                value={params.max === Infinity ? '' : params.max ?? ''}
                placeholder="无限"
                onChange={(e) =>
                  onNodeUpdate(selectedNode.id, {
                    max: e.target.value === '' ? Infinity : Math.max(params.min ?? 0, parseInt(e.target.value) || 0)
                  })
                }
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="greedy"
                checked={params.greedy !== false}
                onChange={(e) => onNodeUpdate(selectedNode.id, { greedy: e.target.checked })}
                style={{ accentColor: NODE_COLORS.quantifier }}
              />
              <label htmlFor="greedy" style={{ color: '#CDD6F4', fontSize: '13px' }}>贪婪模式</label>
            </div>
          </>
        )}

        {selectedNode.type === 'charset' && (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', color: '#8888AA', fontSize: '12px', marginBottom: '4px' }}>字符列表</label>
              <input
                type="text"
                value={params.charset ?? ''}
                onChange={(e) => onNodeUpdate(selectedNode.id, { charset: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="negated"
                checked={params.negated ?? false}
                onChange={(e) => onNodeUpdate(selectedNode.id, { negated: e.target.checked })}
                style={{ accentColor: NODE_COLORS.charset }}
              />
              <label htmlFor="negated" style={{ color: '#CDD6F4', fontSize: '13px' }}>排除型 (^)</label>
            </div>
          </>
        )}

        {selectedNode.type === 'group' && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', color: '#8888AA', fontSize: '12px', marginBottom: '4px' }}>分组名称 (可选)</label>
            <input
              type="text"
              value={params.groupName ?? ''}
              placeholder="留空为匿名捕获分组"
              onChange={(e) => onNodeUpdate(selectedNode.id, { groupName: e.target.value || undefined })}
              style={inputStyle}
            />
          </div>
        )}

        <button
          onClick={() => {
            onNodeDelete(selectedNode.id);
            setSelectedNodeId(null);
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#F92672',
            color: '#1E1E2E',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Fira Code', monospace"
          }}
        >
          删除此节点
        </button>
      </div>
    );
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: '#2D2D3F',
    border: '1px solid #555577',
    borderRadius: '6px',
    color: '#CDD6F4',
    fontSize: '13px',
    fontFamily: "'Fira Code', monospace",
    outline: 'none'
  };

  const viewBox = `0 0 ${layout.width} ${layout.height}`;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '550px',
        backgroundColor: '#1E1E2E',
        overflow: 'hidden',
        borderTop: '1px solid #2D2D3F',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes nodePulse {
          0%, 100% { filter: drop-shadow(0 0 0 transparent); }
          50% { filter: drop-shadow(0 0 8px currentColor); }
        }
      `}</style>

      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#252538" strokeWidth="0.5" />
          </pattern>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#555577" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        {layout.edges.map((edge, idx) => {
          const midY = (edge.fromY + edge.toY) / 2;
          const path = `M ${edge.fromX} ${edge.fromY} C ${edge.fromX} ${midY}, ${edge.toX} ${midY}, ${edge.toX} ${edge.toY}`;
          return (
            <path
              key={`edge-${idx}`}
              d={path}
              fill="none"
              stroke="#555577"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {layout.nodes.map((pNode) => {
          const { node, x, y, width, height } = pNode;
          const isHovered = hoveredNodeId === node.id;
          const isSelected = selectedNodeId === node.id;
          const color = NODE_COLORS[node.type] || '#CDD6F4';
          const scaleFactor = isHovered ? 1.2 : 1;
          const centerX = x + width / 2;
          const centerY = y + height / 2;

          return (
            <g
              key={node.id}
              data-node={node.id}
              transform={`translate(${centerX}, ${centerY}) scale(${scaleFactor}) translate(${-centerX}, ${-centerY})`}
              style={{
                transition: 'transform 0.15s ease-out',
                cursor: 'pointer',
                transformOrigin: `${centerX}px ${centerY}px`
              }}
              onMouseEnter={(e) => handleNodeHover(node, e)}
              onMouseLeave={handleNodeLeave}
              onClick={() => handleNodeClick(node)}
            >
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx="12"
                ry="12"
                fill="#2D2D3F"
                stroke={color}
                strokeWidth={isSelected ? 3 : 2}
                style={{
                  filter: isSelected ? `drop-shadow(0 0 12px ${color}80)` : 'none'
                }}
              />

              <rect
                x={x}
                y={y}
                width="32"
                height="32"
                rx="12"
                ry="0"
                fill={color}
                opacity="0.2"
              />
              <text
                x={x + 16}
                y={y + 20}
                textAnchor="middle"
                fill={color}
                fontSize="16"
                fontWeight="700"
                fontFamily="'Fira Code', monospace"
              >
                {getIconForNode(node)}
              </text>

              <text
                x={x + width / 2 + 10}
                y={y + height / 2}
                textAnchor="middle"
                fill="#CDD6F4"
                fontSize="13"
                fontFamily="'Fira Code', monospace"
                style={{
                  maxWidth: width - 48,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {node.label.length > 8 ? node.label.slice(0, 7) + '…' : node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            backgroundColor: '#3C3C5A',
            color: '#CDD6F4',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: "'Fira Code', monospace",
            maxWidth: '280px',
            lineHeight: '1.5',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            zIndex: 50,
            border: '1px solid #555577',
            animation: 'scaleIn 0.15s ease-out'
          }}
        >
          {tooltip.text}
        </div>
      )}

      {renderEditPanel()}

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          backgroundColor: '#2D2D3F',
          padding: '8px 14px',
          borderRadius: '8px',
          border: '1px solid #444466'
        }}
      >
        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
          style={{ background: 'none', border: 'none', color: '#CDD6F4', cursor: 'pointer', fontSize: '18px', padding: '0 6px' }}
        >
          −
        </button>
        <span style={{ color: '#8888AA', fontSize: '13px', fontFamily: "'Fira Code', monospace", minWidth: '50px', textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(3, s + 0.1))}
          style={{ background: 'none', border: 'none', color: '#CDD6F4', cursor: 'pointer', fontSize: '18px', padding: '0 6px' }}
        >
          +
        </button>
        <button
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          style={{
            background: 'none',
            border: '1px solid #555577',
            color: '#CDD6F4',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '4px',
            fontFamily: "'Fira Code', monospace",
            marginLeft: '6px'
          }}
        >
          重置
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          backgroundColor: '#2D2D3F',
          padding: '8px 14px',
          borderRadius: '8px',
          border: '1px solid #444466',
          fontSize: '12px',
          fontFamily: "'Fira Code', monospace"
        }}
      >
        {Object.entries(NODE_COLORS).slice(0, 5).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                backgroundColor: color
              }}
            />
            <span style={{ color: '#8888AA' }}>{typeLabel(type)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    literal: '字面量',
    quantifier: '量词',
    group: '分组',
    anchor: '锚点',
    charset: '字符组'
  };
  return labels[type] || type;
}

function getIconForNode(node: ParseNode): string {
  switch (node.type) {
    case 'quantifier':
      if (node.value.startsWith('*')) return '*';
      if (node.value.startsWith('+')) return '+';
      if (node.value.startsWith('?')) return '?';
      if (node.value.startsWith('{')) return '{}';
      return 'Q';
    case 'group':
      if (node.label.startsWith('(?:')) return '?:)';
      if (node.label.startsWith('(?=')) return '?=)';
      if (node.label.startsWith('(?!')) return '?!)';
      if (node.label.startsWith('(?<')) return '<>)';
      return '()';
    case 'anchor':
      if (node.value === '^') return '^';
      if (node.value === '$') return '$';
      if (node.value === '\\b') return '\\b';
      return 'A';
    case 'charset':
      return node.params?.negated ? '[^]' : '[]';
    case 'dot':
      return '·';
    case 'escape':
      return '\\';
    case 'alternation':
      return '|';
    case 'root':
      return 'R';
    case 'literal':
    default:
      return node.label.length > 0 ? node.label[0] : '?';
  }
}

export default SVGVis;
