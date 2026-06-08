import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import MapCanvas from './components/MapCanvas';
import {
  MindMapData,
  createMindMapData,
  createNode,
  addNode,
  deleteNode,
  updateNodeText,
  updateNodePosition,
  updateNodeColor,
  toggleCollapse,
  collapseAll,
  expandAll,
  cloneMindMap,
  DEFAULT_COLORS,
  DEFAULT_COLOR,
  getBranchColor,
  calculateNodeWidth,
  NODE_HEIGHT,
  depthFirstTraverse,
} from './utils/mapLogic';

const App: React.FC = () => {
  const [mindMapData, setMindMapData] = useState<MindMapData>(createMindMapData());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<MindMapData[]>([]);
  const [redoStack, setRedoStack] = useState<MindMapData[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [mapId, setMapId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showShareToast, setShowShareToast] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const saveToHistory = useCallback((data: MindMapData) => {
    setUndoStack((prev) => [...prev, cloneMindMap(mindMapData)]);
    setRedoStack([]);
  }, [mindMapData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setMapId(id);
      setReadOnly(true);
      axios
        .get(`/api/maps/${id}`)
        .then((res) => {
          if (res.data.data) {
            setMindMapData(res.data.data);
          }
        })
        .catch(() => {
          console.error('Failed to load mind map');
        });
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, cloneMindMap(mindMapData)]);
    setMindMapData(prev);
  }, [undoStack, mindMapData]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, cloneMindMap(mindMapData)]);
    setMindMapData(next);
  }, [redoStack, mindMapData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;

      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' && selectedNodeId) {
        e.preventDefault();
        handleDeleteNode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedNodeId, readOnly]);

  const handleAddNode = useCallback(
    (x: number, y: number, parentId: string | null) => {
      if (readOnly) return;
      saveToHistory(mindMapData);
      const newNode = createNode('新节点', x, y, parentId);
      const newData = addNode(mindMapData, newNode);
      setMindMapData(newData);
      setSelectedNodeId(newNode.id);
    },
    [mindMapData, readOnly, saveToHistory]
  );

  const handleUpdateNodeText = useCallback(
    (id: string, text: string) => {
      if (readOnly) return;
      saveToHistory(mindMapData);
      setMindMapData(updateNodeText(mindMapData, id, text));
    },
    [mindMapData, readOnly, saveToHistory]
  );

  const handleUpdateNodePosition = useCallback(
    (id: string, x: number, y: number) => {
      if (readOnly) return;
      setMindMapData(updateNodePosition(mindMapData, id, x, y));
    },
    [mindMapData, readOnly]
  );

  const handleToggleCollapse = useCallback(
    (id: string) => {
      if (readOnly) return;
      saveToHistory(mindMapData);
      setMindMapData(toggleCollapse(mindMapData, id));
    },
    [mindMapData, readOnly, saveToHistory]
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      if (readOnly || !selectedNodeId) return;
      saveToHistory(mindMapData);
      setMindMapData(updateNodeColor(mindMapData, selectedNodeId, color));
      setShowColorPicker(false);
    },
    [mindMapData, selectedNodeId, readOnly, saveToHistory]
  );

  const handleDeleteNode = useCallback(() => {
    if (readOnly || !selectedNodeId) return;
    saveToHistory(mindMapData);
    setMindMapData(deleteNode(mindMapData, selectedNodeId));
    setSelectedNodeId(null);
  }, [mindMapData, selectedNodeId, readOnly, saveToHistory]);

  const handleNewMap = () => {
    if (readOnly) {
      window.location.href = window.location.pathname;
      return;
    }
    if (!confirm('确定要新建导图吗？当前内容将被清除。')) return;
    setMindMapData(createMindMapData());
    setSelectedNodeId(null);
    setUndoStack([]);
    setRedoStack([]);
    setMapId(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleSave = async () => {
    try {
      let response;
      if (mapId) {
        response = await axios.put(`/api/maps/${mapId}`, { data: mindMapData });
      } else {
        response = await axios.post('/api/maps', { data: mindMapData });
        setMapId(response.data.id);
      }

      const shareId = mapId || response.data.id;
      const url = `${window.location.origin}${window.location.pathname}?id=${shareId}`;
      setShareUrl(url);

      try {
        await navigator.clipboard.writeText(url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      } catch {
        prompt('分享链接已生成，复制以下链接：', url);
      }
    } catch (error) {
      alert('保存失败，请重试');
    }
  };

  const handleExportImage = () => {
    const canvas = document.createElement('canvas');
    const container = canvasContainerRef.current;
    if (!container) return;

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    if (mindMapData.rootId) {
      depthFirstTraverse(mindMapData, mindMapData.rootId, (_id, node) => {
        const width = calculateNodeWidth(node.text);
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + width);
        maxY = Math.max(maxY, node.y + NODE_HEIGHT);
      });
    }

    const padding = 40;
    const width = Math.max(maxX - minX + padding * 2, 400);
    const height = Math.max(maxY - minY + padding * 2, 300);
    const scale = 2;

    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    if (mindMapData.rootId) {
      depthFirstTraverse(mindMapData, mindMapData.rootId, (nodeId, node) => {
        if (node.parentId && mindMapData.nodes[node.parentId]) {
          const parent = mindMapData.nodes[node.parentId];
          if (parent.collapsed) return;

          const color = getBranchColor(mindMapData, nodeId);
          const parentWidth = calculateNodeWidth(parent.text);

          const x1 = parent.x + offsetX + parentWidth;
          const y1 = parent.y + offsetY + NODE_HEIGHT / 2;
          const x2 = node.x + offsetX;
          const y2 = node.y + offsetY + NODE_HEIGHT / 2;
          const midX = (x1 + x2) / 2;

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
          ctx.stroke();
        }
      });

      depthFirstTraverse(mindMapData, mindMapData.rootId, (nodeId, node) => {
        const color = getBranchColor(mindMapData, nodeId);
        const nodeWidth = calculateNodeWidth(node.text);
        const x = node.x + offsetX;
        const y = node.y + offsetY;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        const radius = 8;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + nodeWidth - radius, y);
        ctx.quadraticCurveTo(x + nodeWidth, y, x + nodeWidth, y + radius);
        ctx.lineTo(x + nodeWidth, y + NODE_HEIGHT - radius);
        ctx.quadraticCurveTo(x + nodeWidth, y + NODE_HEIGHT, x + nodeWidth - radius, y + NODE_HEIGHT);
        ctx.lineTo(x + radius, y + NODE_HEIGHT);
        ctx.quadraticCurveTo(x, y + NODE_HEIGHT, x, y + NODE_HEIGHT - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#333333';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.text, x + nodeWidth / 2, y + NODE_HEIGHT / 2);
      });
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const timestamp = Date.now();
    link.download = `mindmap_${timestamp}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleCollapseAll = () => {
    if (readOnly) return;
    saveToHistory(mindMapData);
    setMindMapData(collapseAll(mindMapData));
  };

  const handleExpandAll = () => {
    if (readOnly) return;
    saveToHistory(mindMapData);
    setMindMapData(expandAll(mindMapData));
  };

  const selectedNode = selectedNodeId ? mindMapData.nodes[selectedNodeId] : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          height: 48,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
        }}
      >
        <button
          onClick={handleNewMap}
          title="新建"
          style={toolbarButtonStyle}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </button>

        <button
          onClick={handleSave}
          title="保存/分享"
          style={toolbarButtonStyle}
          disabled={readOnly}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>

        <button
          onClick={handleUndo}
          title="撤销 (Ctrl+Z)"
          style={{ ...toolbarButtonStyle, opacity: undoStack.length === 0 || readOnly ? 0.4 : 1 }}
          disabled={undoStack.length === 0 || readOnly}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>

        <button
          onClick={handleRedo}
          title="重做 (Ctrl+Shift+Z)"
          style={{ ...toolbarButtonStyle, opacity: redoStack.length === 0 || readOnly ? 0.4 : 1 }}
          disabled={redoStack.length === 0 || readOnly}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>

        <div style={{ width: 1, height: 24, backgroundColor: '#e0e0e0', margin: '0 4px' }} />

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="颜色"
            style={{
              ...toolbarButtonStyle,
              backgroundColor: selectedNode ? getBranchColor(mindMapData, selectedNodeId!) : '#e9ecef',
            }}
            disabled={!selectedNodeId || readOnly}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
          </button>

          {showColorPicker && (
            <div
              style={{
                position: 'absolute',
                top: 36,
                left: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                padding: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 8,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {DEFAULT_COLORS.map((color) => (
                <div
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: selectedNode && getBranchColor(mindMapData, selectedNodeId!) === color
                      ? '2px solid #007AFF'
                      : '2px solid transparent',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 24, backgroundColor: '#e0e0e0', margin: '0 4px' }} />

        <button
          onClick={handleCollapseAll}
          title="折叠全部"
          style={toolbarButtonStyle}
          disabled={readOnly}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>

        <button
          onClick={handleExpandAll}
          title="展开全部"
          style={toolbarButtonStyle}
          disabled={readOnly}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleExportImage}
          title="导出图片"
          style={toolbarButtonStyle}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            width: 280,
            backgroundColor: '#f8f9fa',
            borderRight: '1px solid #e0e0e0',
            boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#333' }}>
            节点属性
          </h3>

          {selectedNode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                  节点文本
                </label>
                <input
                  type="text"
                  value={selectedNode.text}
                  onChange={(e) => handleUpdateNodeText(selectedNodeId!, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                  }}
                  disabled={readOnly}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                  分支颜色
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {DEFAULT_COLORS.map((color) => (
                    <div
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: color,
                        cursor: readOnly ? 'default' : 'pointer',
                        border: getBranchColor(mindMapData, selectedNodeId!) === color
                          ? '2px solid #007AFF'
                          : '2px solid transparent',
                        boxSizing: 'border-box',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                  位置
                </label>
                <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#555' }}>
                  <span>X: {Math.round(selectedNode.x)}</span>
                  <span>Y: {Math.round(selectedNode.y)}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                  子节点数
                </label>
                <span style={{ fontSize: 13, color: '#555' }}>{selectedNode.children.length}</span>
              </div>

              {!readOnly && (
                <button
                  onClick={handleDeleteNode}
                  style={{
                    marginTop: 16,
                    padding: '8px 16px',
                    backgroundColor: '#ff4757',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  删除节点
                </button>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#999' }}>
              请选择一个节点查看属性
            </p>
          )}

          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333' }}>
              使用说明
            </h3>
            <ul style={{ fontSize: 12, color: '#666', paddingLeft: 16, lineHeight: 1.8 }}>
              <li>双击空白处创建节点</li>
              <li>选中节点后双击空白处创建子节点</li>
              <li>双击节点编辑文本</li>
              <li>拖拽节点移动位置</li>
              <li>点击左侧 -/+ 折叠/展开</li>
              <li>Ctrl+Z 撤销，Ctrl+Shift+Z 重做</li>
            </ul>
          </div>
        </div>

        <div ref={canvasContainerRef} style={{ flex: 1, position: 'relative' }}>
          <MapCanvas
            data={mindMapData}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onAddNode={handleAddNode}
            onUpdateNodePosition={handleUpdateNodePosition}
            onUpdateNodeText={handleUpdateNodeText}
            onToggleCollapse={handleToggleCollapse}
            readOnly={readOnly}
          />
        </div>
      </div>

      {showShareToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 8,
            fontSize: 14,
            zIndex: 2000,
          }}
        >
          分享链接已复制到剪贴板
        </div>
      )}
    </div>
  );
};

const toolbarButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#555',
  transition: 'background-color 0.2s',
};

export default App;
