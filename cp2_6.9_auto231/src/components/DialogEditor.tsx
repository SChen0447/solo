import { useRef, useState, useCallback, useEffect } from 'react';
import type { NodeType, StoryNode, StoryConnection, StoryGraph } from '../types';
import { NODE_WIDTH, NODE_HEIGHT, NODE_HEADER_HEIGHT } from '../types';

interface DialogEditorProps {
  graph: StoryGraph;
  canvasRef: React.RefObject<HTMLDivElement>;
  isAnimating: boolean;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateNodePosition: (nodeId: string, x: number, y: number) => void;
  onAddNode: (type: NodeType, parentId?: string, x?: number, y?: number) => void;
  onEditNode: (node: StoryNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddConnection: (from: string, to: string, fromChoiceId?: string, label?: string) => void;
  onDeleteConnection: (connId: string) => void;
}

interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface ConnectingState {
  fromNodeId: string;
  fromChoiceId?: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const TYPE_LABELS: Record<string, string> = {
  dialog: '对话',
  choice: '选择',
  event: '事件',
};

function DialogEditor(props: DialogEditorProps) {
  const {
    graph,
    canvasRef,
    isAnimating,
    selectedNodeId,
    onSelectNode,
    onUpdateNodePosition,
    onAddNode,
    onEditNode,
    onDeleteNode,
    onAddConnection,
    onDeleteConnection,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const [, forceRender] = useState(0);

  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (dragState.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragState.current.offsetX;
      const newY = e.clientY - rect.top - dragState.current.offsetY;
      onUpdateNodePosition(dragState.current.nodeId, newX, newY);
    }
  }, [onUpdateNodePosition]);

  const handleCanvasMouseUp = useCallback(() => {
    dragState.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('mouseup', handleCanvasMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      window.removeEventListener('mouseup', handleCanvasMouseUp);
    };
  }, [handleCanvasMouseMove, handleCanvasMouseUp]);

  const startNodeDrag = (e: React.MouseEvent, node: StoryNode) => {
    if (e.button !== 0) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragState.current = {
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y,
    };
    onSelectNode(node.id);
    e.preventDefault();
  };

  const handleConnectingMove = useCallback(
    (e: MouseEvent) => {
      if (connecting && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setConnecting((prev) =>
          prev
            ? {
                ...prev,
                currentX: e.clientX - rect.left,
                currentY: e.clientY - rect.top,
              }
            : null
        );
      }
    },
    [connecting]
  );

  const handleConnectingUp = useCallback(() => {
    setConnecting(null);
  }, []);

  useEffect(() => {
    if (connecting) {
      window.addEventListener('mousemove', handleConnectingMove);
      window.addEventListener('mouseup', handleConnectingUp);
      return () => {
        window.removeEventListener('mousemove', handleConnectingMove);
        window.removeEventListener('mouseup', handleConnectingUp);
      };
    }
  }, [connecting, handleConnectingMove, handleConnectingUp]);

  const startConnection = (
    e: React.MouseEvent,
    node: StoryNode,
    choiceId?: string
  ) => {
    if (!containerRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    let portX = node.x + NODE_WIDTH / 2;
    let portY = node.y + NODE_HEIGHT;

    if (choiceId && node.choices) {
      const choiceIdx = node.choices.findIndex((c) => c.id === choiceId);
      if (choiceIdx >= 0) {
        const choicesStartY = NODE_HEADER_HEIGHT + 10;
        const choiceHeight = 28;
        portX = node.x + NODE_WIDTH;
        portY = node.y + choicesStartY + choiceIdx * choiceHeight + choiceHeight / 2;
      }
    }

    setConnecting({
      fromNodeId: node.id,
      fromChoiceId: choiceId,
      startX: portX,
      startY: portY,
      currentX: e.clientX - rect.left,
      currentY: e.clientY - rect.top,
    });
  };

  const endConnection = (e: React.MouseEvent, toNodeId: string) => {
    e.stopPropagation();
    if (connecting) {
      const fromNode = graph.nodes.find((n) => n.id === connecting.fromNodeId);
      let label = '继续';
      if (connecting.fromChoiceId && fromNode?.choices) {
        const choice = fromNode.choices.find((c) => c.id === connecting.fromChoiceId);
        if (choice) label = choice.label;
      }
      onAddConnection(connecting.fromNodeId, toNodeId, connecting.fromChoiceId, label);
      setConnecting(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('nodeType') as NodeType;
    if (!nodeType || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - NODE_WIDTH / 2;
    const y = e.clientY - rect.top - NODE_HEIGHT / 2;
    onAddNode(nodeType, undefined, x, y);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSelectNode(null);
    }
  };

  const renderConnections = () => {
    const elements: JSX.Element[] = [];

    graph.connections.forEach((conn) => {
      const fromNode = graph.nodes.find((n) => n.id === conn.fromNodeId);
      const toNode = graph.nodes.find((n) => n.id === conn.toNodeId);
      if (!fromNode || !toNode) return;

      let startX = fromNode.x + NODE_WIDTH / 2;
      let startY = fromNode.y + NODE_HEIGHT;

      if (conn.fromChoiceId && fromNode.choices) {
        const choiceIdx = fromNode.choices.findIndex((c) => c.id === conn.fromChoiceId);
        if (choiceIdx >= 0) {
          const choicesStartY = NODE_HEADER_HEIGHT + 10;
          const choiceHeight = 28;
          startX = fromNode.x + NODE_WIDTH;
          startY = fromNode.y + choicesStartY + choiceIdx * choiceHeight + choiceHeight / 2;
        }
      }

      const endX = toNode.x + NODE_WIDTH / 2;
      const endY = toNode.y;
      const midX = (startX + endX) / 2;
      const cp1X = midX;
      const cp1Y = startY;
      const cp2X = midX;
      const cp2Y = endY;

      const d = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

      const arrowId = `arrow-${conn.id}`;
      const labelX = (startX + endX) / 2;
      const labelY = (startY + endY) / 2 - 6;

      elements.push(
        <g key={conn.id}>
          <defs>
            <marker
              id={arrowId}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#E94560" />
            </marker>
          </defs>
          <path
            className="connection-path"
            d={d}
            markerEnd={`url(#${arrowId})`}
            onClick={() => onDeleteConnection(conn.id)}
            style={{ cursor: 'pointer' }}
          />
          {conn.label && (
            <text className="connection-label" x={labelX} y={labelY}>
              {conn.label}
            </text>
          )}
        </g>
      );
    });

    if (connecting) {
      const midX = (connecting.startX + connecting.currentX) / 2;
      const d = `M ${connecting.startX} ${connecting.startY} C ${midX} ${connecting.startY}, ${midX} ${connecting.currentY}, ${connecting.currentX} ${connecting.currentY}`;
      elements.push(
        <path
          key="temp-connection"
          d={d}
          fill="none"
          stroke="#E94560"
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.8"
        />
      );
    }

    return elements;
  };

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleCanvasClick}
    >
      <svg className="svg-layer" style={{ width: '100%', height: '100%' }}>
        {renderConnections()}
      </svg>

      <div className="nodes-layer">
        {graph.nodes.map((node) => (
          <div
            key={node.id}
            className={`story-node ${isAnimating ? 'animating' : ''}`}
            style={{ left: node.x, top: node.y }}
            onMouseDown={(e) => startNodeDrag(e, node)}
            onDoubleClick={() => onEditNode(node)}
          >
            <div
              className="node-port input"
              onMouseUp={(e) => endConnection(e, node.id)}
              title="输入端口 - 将连线拖到此处连接"
            />

            <div className="node-header">
              <span>{node.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="node-type">{TYPE_LABELS[node.type]}</span>
                <button
                  className="node-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                  title="删除节点"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="node-body">
              <div className="node-content">{node.content}</div>
              {node.choices &&
                node.choices.map((choice, idx) => (
                  <div
                    key={choice.id}
                    className="node-choice"
                    style={{ position: 'relative' }}
                  >
                    {idx + 1}. {choice.label}
                    {choice.nextNodeId && (
                      <span style={{ opacity: 0.5, marginLeft: 4 }}>→</span>
                    )}
                    <div
                      className="node-port choice-output"
                      onMouseDown={(e) => startConnection(e, node, choice.id)}
                      onMouseUp={(e) => endConnection(e, node.id)}
                      title="输出端口 - 从此处拖出连线"
                    />
                  </div>
                ))}
              {node.eventData && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '4px 8px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 2,
                    fontSize: 8,
                  }}
                >
                  ⚡ {node.eventData}
                </div>
              )}
            </div>

            <div
              className="node-port output"
              onMouseDown={(e) => startConnection(e, node)}
              title="输出端口 - 从此处拖出连线"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default DialogEditor;
