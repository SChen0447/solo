import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MindMapCanvas from './components/MindMapCanvas'
import type { MindMapData, MindMapNode, ViewTransform, UserCursor, Operation, Connection } from './types'
import { WebSocketClient } from './utils/websocket'
import { saveToStorage, loadFromStorage, downloadJSON, exportToPNG, generateId } from './utils/storage'
import './App.less'

const MAX_HISTORY = 50
const NODE_COLORS = ['#16213e', '#0f3460', '#533483', '#e94560', '#4fc3f7', '#66bb6a', '#ffa726', '#ab47bc']
const USER_COLORS = ['#e94560', '#4fc3f7', '#66bb6a', '#ffa726', '#ab47bc', '#26c6da', '#ef5350', '#ec407a']

const createInitialData = (): MindMapData => {
  const rootId = generateId()
  const now = Date.now()
  const nodes: Record<string, MindMapNode> = {
    [rootId]: {
      id: rootId,
      text: '中心主题',
      x: 0,
      y: 0,
      color: '#0f3460',
      parentId: null,
      collapsed: false,
      createdAt: now,
      updatedAt: now
    }
  }
  return { nodes, connections: {}, rootId }
}

const App: React.FC = () => {
  const [data, setData] = useState<MindMapData>(() => loadFromStorage() || createInitialData())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<Operation[][]>([])
  const [redoStack, setRedoStack] = useState<Operation[][]>([])
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, offsetX: 400, offsetY: 300 })
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [cursors, setCursors] = useState<UserCursor[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [userName] = useState(() => `用户${Math.floor(Math.random() * 1000)}`)
  const wsRef = useRef<WebSocketClient | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const applyOpsRef = useRef(false)

  const userColor = useMemo(() => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)], [])

  useEffect(() => {
    saveToStorage(data)
  }, [data])

  const applyOperation = useCallback((op: Operation): MindMapData => {
    let newData: MindMapData
    setData(prevData => {
      newData = JSON.parse(JSON.stringify(prevData))
      switch (op.type) {
        case 'add_node': {
          const node = op.data as MindMapNode
          newData.nodes[node.id] = node
          break
        }
        case 'update_node': {
          const node = op.data as MindMapNode
          if (newData.nodes[node.id]) {
            newData.nodes[node.id] = { ...newData.nodes[node.id], ...node, updatedAt: Date.now() }
          }
          break
        }
        case 'delete_node': {
          const id = op.data as string
          const deleteRecursive = (nid: string) => {
            Object.values(newData.nodes).filter(n => n.parentId === nid).forEach(n => deleteRecursive(n.id))
            delete newData.nodes[nid]
            Object.keys(newData.connections).forEach(cid => {
              const c = newData.connections[cid]
              if (c.fromId === nid || c.toId === nid) delete newData.connections[cid]
            })
          }
          deleteRecursive(id)
          break
        }
        case 'add_connection': {
          const conn = op.data as Connection
          newData.connections[conn.id] = conn
          break
        }
        case 'update_connection': {
          const conn = op.data as Connection
          if (newData.connections[conn.id]) {
            newData.connections[conn.id] = { ...newData.connections[conn.id], ...conn }
          }
          break
        }
        case 'delete_connection': {
          const id = op.data as string
          delete newData.connections[id]
          break
        }
      }
      return newData
    })
    return data
  }, [data])

  const pushHistory = useCallback((ops: Operation[]) => {
    if (applyOpsRef.current) return
    setUndoStack(prev => {
      const next = [...prev, ops]
      if (next.length > MAX_HISTORY) next.shift()
      return next
    })
    setRedoStack([])
  }, [])

  const sendOps = useCallback((ops: Operation[]) => {
    if (wsRef.current && wsConnected) {
      ops.forEach(op => wsRef.current!.sendOperation(op))
    }
  }, [wsConnected])

  const addChildNode = useCallback((parentId: string) => {
    const parent = data.nodes[parentId]
    if (!parent) return
    const siblings = Object.values(data.nodes).filter(n => n.parentId === parentId)
    const now = Date.now()
    const childId = generateId()
    const angle = (siblings.length * 40 - 20) * (Math.PI / 180)
    const distance = 250
    const newNode: MindMapNode = {
      id: childId,
      text: '新节点',
      x: parent.x + Math.cos(angle) * distance,
      y: parent.y + Math.sin(angle) * distance + siblings.length * 70,
      color: NODE_COLORS[(siblings.length + 1) % NODE_COLORS.length],
      parentId,
      collapsed: false,
      createdAt: now,
      updatedAt: now
    }
    const op: Operation = { type: 'add_node', data: newNode, timestamp: now }
    applyOperation(op)
    pushHistory([op])
    sendOps([op])
    if (parent.collapsed) {
      const updateOp: Operation = { type: 'update_node', data: { ...parent, collapsed: false }, timestamp: now }
      applyOperation(updateOp)
      pushHistory([updateOp])
      sendOps([updateOp])
    }
    setSelectedNodeId(childId)
  }, [data, applyOperation, pushHistory, sendOps])

  const updateNode = useCallback((node: MindMapNode) => {
    const op: Operation = { type: 'update_node', data: node, timestamp: Date.now() }
    applyOperation(op)
    pushHistory([op])
    sendOps([op])
  }, [applyOperation, pushHistory, sendOps])

  const deleteNode = useCallback((id: string) => {
    if (id === data.rootId) return
    const op: Operation = { type: 'delete_node', data: id, timestamp: Date.now() }
    applyOperation(op)
    pushHistory([op])
    sendOps([op])
    setSelectedNodeId(null)
  }, [data.rootId, applyOperation, pushHistory, sendOps])

  const toggleCollapse = useCallback((id: string) => {
    const node = data.nodes[id]
    if (!node) return
    const op: Operation = { type: 'update_node', data: { ...node, collapsed: !node.collapsed }, timestamp: Date.now() }
    applyOperation(op)
    pushHistory([op])
    sendOps([op])
  }, [data, applyOperation, pushHistory, sendOps])

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const ops = prev[prev.length - 1]
      const newUndo = prev.slice(0, -1)
      applyOpsRef.current = true
      ops.slice().reverse().forEach(op => {
        let inverseOp: Operation
        switch (op.type) {
          case 'add_node':
            inverseOp = { type: 'delete_node', data: (op.data as MindMapNode).id, timestamp: Date.now() }
            break
          case 'delete_node':
            inverseOp = { type: 'add_node', data: op.data, timestamp: Date.now() }
            break
          case 'update_node': {
            const current = data.nodes[(op.data as MindMapNode).id]
            inverseOp = { type: 'update_node', data: current, timestamp: Date.now() }
            break
          }
          default:
            inverseOp = op
        }
        applyOperation(inverseOp)
      })
      applyOpsRef.current = false
      setRedoStack(r => [...r, ops])
      return newUndo
    })
  }, [applyOperation, data])

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const ops = prev[prev.length - 1]
      const newRedo = prev.slice(0, -1)
      applyOpsRef.current = true
      ops.forEach(op => applyOperation(op))
      applyOpsRef.current = false
      setUndoStack(u => [...u, ops])
      return newRedo
    })
  }, [applyOperation])

  const handleCursorMove = useCallback((x: number, y: number, nodeId: string | null) => {
    if (wsRef.current) {
      wsRef.current.sendCursor({ userId: wsRef.current.getUserId(), userName, nodeId, x, y, color: userColor })
    }
  }, [userName, userColor])

  useEffect(() => {
    const url = 'ws://localhost:8765'
    try {
      const ws = new WebSocketClient(url)
      wsRef.current = ws
      ws.connect().then(() => {
        setWsConnected(true)
      }).catch(() => {
        setWsConnected(false)
      })
      ws.on('op', (msg) => {
        if (msg.userId === ws.getUserId()) return
        applyOpsRef.current = true
        applyOperation(msg.payload as Operation)
        applyOpsRef.current = false
      })
      ws.on('cursor', (msg) => {
        if (msg.userId === ws.getUserId()) return
        const cursor = msg.payload as UserCursor
        setCursors(prev => {
          const filtered = prev.filter(c => c.userId !== cursor.userId)
          return [...filtered, cursor]
        })
      })
    } catch (e) {
      console.log('WebSocket not available, working offline')
    }
    return () => {
      wsRef.current?.disconnect()
    }
  }, [applyOperation])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCursors(prev => prev.filter(c => (c as any).lastSeen === undefined || now - (c as any).lastSeen < 5000))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const handleExportJSON = () => downloadJSON(data)

  const handleExportPNG = async () => {
    const canvas = canvasContainerRef.current?.querySelector('canvas')
    if (canvas) {
      await exportToPNG(canvas as HTMLCanvasElement)
    }
  }

  const selectedNode = selectedNodeId ? data.nodes[selectedNodeId] : null

  const fitToView = () => {
    const nodes = Object.values(data.nodes)
    if (nodes.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(n => {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x)
      maxY = Math.max(maxY, n.y)
    })
    const padding = 100
    const container = canvasContainerRef.current
    if (!container) return
    const w = container.clientWidth
    const h = container.clientHeight
    const contentW = maxX - minX + padding * 2
    const contentH = maxY - minY + padding * 2
    const scale = Math.min(w / contentW, h / contentH, 1.5)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    setTransform({
      scale,
      offsetX: w / 2 - centerX * scale,
      offsetY: h / 2 - centerY * scale
    })
  }

  const zoomIn = () => setTransform(t => ({ ...t, scale: Math.min(t.scale * 1.2, 3) }))
  const zoomOut = () => setTransform(t => ({ ...t, scale: Math.max(t.scale / 1.2, 0.2) }))
  const resetView = () => setTransform({ scale: 1, offsetX: 400, offsetY: 300 })

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="app-title">🧠 协作思维导图</span>
          <span className={`connection-status ${wsConnected ? 'connected' : 'disconnected'}`}>
            {wsConnected ? '● 已连接' : '○ 离线模式'}
          </span>
        </div>
        <div className="toolbar-center">
          <button className="tool-btn" onClick={undo} disabled={undoStack.length === 0} title="撤销 (Ctrl+Z)">↶ 撤销</button>
          <button className="tool-btn" onClick={redo} disabled={redoStack.length === 0} title="重做 (Ctrl+Y)">↷ 重做</button>
          <div className="divider" />
          <button className="tool-btn" onClick={zoomOut} title="缩小">−</button>
          <span className="zoom-level">{Math.round(transform.scale * 100)}%</span>
          <button className="tool-btn" onClick={zoomIn} title="放大">+</button>
          <button className="tool-btn" onClick={fitToView} title="适应视图">⛶</button>
          <button className="tool-btn" onClick={resetView} title="重置视图">⌂</button>
        </div>
        <div className="toolbar-right">
          <button className="tool-btn primary" onClick={() => addChildNode(selectedNodeId || data.rootId)} disabled={!selectedNodeId && !data.rootId}>
            + 新建节点
          </button>
          <div className="divider" />
          <button className="tool-btn" onClick={handleExportJSON} title="导出 JSON">⬇ JSON</button>
          <button className="tool-btn" onClick={handleExportPNG} title="导出 PNG">⬇ PNG</button>
        </div>
      </div>

      <div className="main-content">
        <div className={`panel left-panel ${leftPanelOpen ? 'open' : 'closed'}`}>
          <div className="panel-header" onClick={() => setLeftPanelOpen(!leftPanelOpen)}>
            <span>{leftPanelOpen ? '◀ 缩略图' : '▶'}</span>
          </div>
          {leftPanelOpen && (
            <div className="panel-content">
              <div className="thumbnail-container">
                <ThumbnailMap data={data} transform={transform} onSelect={(x, y) => {
                  const container = canvasContainerRef.current
                  if (!container) return
                  setTransform(t => ({
                    ...t,
                    offsetX: container.clientWidth / 2 - x * t.scale,
                    offsetY: container.clientHeight / 2 - y * t.scale
                  }))
                }} />
              </div>
              <div className="nodes-list">
                <h4>节点列表</h4>
                <div className="nodes-tree">
                  <NodeTree
                    node={data.nodes[data.rootId]}
                    data={data}
                    selectedNodeId={selectedNodeId}
                    onSelect={setSelectedNodeId}
                    depth={0}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="canvas-container" ref={canvasContainerRef}>
          <MindMapCanvas
            data={data}
            selectedNodeId={selectedNodeId}
            cursors={cursors}
            onSelectNode={setSelectedNodeId}
            onUpdateNode={updateNode}
            onAddChild={addChildNode}
            onDeleteNode={deleteNode}
            onToggleCollapse={toggleCollapse}
            onTransformChange={setTransform}
            onCursorMove={handleCursorMove}
          />
        </div>

        <div className={`panel right-panel ${rightPanelOpen ? 'open' : 'closed'}`}>
          <div className="panel-header" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
            <span>{rightPanelOpen ? '属性 ▶' : '◀ 属性'}</span>
          </div>
          {rightPanelOpen && (
            <div className="panel-content">
              {selectedNode ? (
                <div className="property-panel">
                  <h4>节点属性</h4>
                  <div className="property-group">
                    <label>文本</label>
                    <input
                      type="text"
                      value={selectedNode.text}
                      onChange={(e) => updateNode({ ...selectedNode, text: e.target.value })}
                      className="property-input"
                    />
                  </div>
                  <div className="property-group">
                    <label>颜色</label>
                    <div className="color-picker">
                      {NODE_COLORS.map(color => (
                        <button
                          key={color}
                          className={`color-swatch ${selectedNode.color === color ? 'selected' : ''}`}
                          style={{ background: color }}
                          onClick={() => updateNode({ ...selectedNode, color })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="property-group">
                    <label>位置 X</label>
                    <input
                      type="number"
                      value={Math.round(selectedNode.x)}
                      onChange={(e) => updateNode({ ...selectedNode, x: Number(e.target.value) })}
                      className="property-input"
                    />
                  </div>
                  <div className="property-group">
                    <label>位置 Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedNode.y)}
                      onChange={(e) => updateNode({ ...selectedNode, y: Number(e.target.value) })}
                      className="property-input"
                    />
                  </div>
                  <div className="property-group">
                    <label>子节点</label>
                    <button
                      className="tool-btn block"
                      onClick={() => addChildNode(selectedNode.id)}
                    >
                      + 添加子节点
                    </button>
                  </div>
                  {Object.values(data.nodes).filter(n => n.parentId === selectedNode.id).length > 0 && (
                    <div className="property-group">
                      <label>折叠状态</label>
                      <button
                        className="tool-btn block"
                        onClick={() => toggleCollapse(selectedNode.id)}
                      >
                        {selectedNode.collapsed ? '展开子节点' : '折叠子节点'}
                      </button>
                    </div>
                  )}
                  {selectedNode.id !== data.rootId && (
                    <div className="property-group">
                      <button
                        className="tool-btn danger block"
                        onClick={() => deleteNode(selectedNode.id)}
                      >
                        删除节点
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-panel">
                  <p>选择节点查看属性</p>
                  <div className="tips">
                    <h5>快捷键</h5>
                    <ul>
                      <li>双击：编辑节点</li>
                      <li>F2：重命名</li>
                      <li>Tab/Enter：添加子节点</li>
                      <li>Delete：删除节点</li>
                      <li>右键：添加/折叠</li>
                      <li>滚轮：缩放</li>
                      <li>拖动画布：平移</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ThumbnailMap: React.FC<{
  data: MindMapData
  transform: ViewTransform
  onSelect: (x: number, y: number) => void
}> = ({ data, transform, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, w, h)

    const nodes = Object.values(data.nodes)
    if (nodes.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(n => {
      minX = Math.min(minX, n.x - 100)
      minY = Math.min(minY, n.y - 50)
      maxX = Math.max(maxX, n.x + 100)
      maxY = Math.max(maxY, n.y + 50)
    })

    const contentW = maxX - minX
    const contentH = maxY - minY
    const scale = Math.min(w / contentW, h / contentH) * 0.85
    const offX = w / 2 - ((minX + maxX) / 2) * scale
    const offY = h / 2 - ((minY + maxY) / 2) * scale

    nodes.forEach(node => {
      if (node.parentId) {
        const parent = data.nodes[node.parentId]
        if (parent) {
          ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(parent.x * scale + offX, parent.y * scale + offY)
          ctx.lineTo(node.x * scale + offX, node.y * scale + offY)
          ctx.stroke()
        }
      }
    })

    nodes.forEach(node => {
      ctx.fillStyle = node.color || '#16213e'
      ctx.fillRect(node.x * scale + offX - 6, node.y * scale + offY - 3, 12, 6)
    })

    const container = canvas.parentElement
    if (container) {
      const viewW = container.clientWidth / transform.scale * scale
      const viewH = container.clientHeight / transform.scale * scale
      const viewX = ((container.clientWidth / 2 - transform.offsetX) / transform.scale) * scale + offX - viewW / 2
      const viewY = ((container.clientHeight / 2 - transform.offsetY) / transform.scale) * scale + offY - viewH / 2
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.8)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.strokeRect(viewX, viewY, viewW, viewH)
      ctx.setLineDash([])
    }
  }, [data, transform])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    const nodes = Object.values(data.nodes)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(n => {
      minX = Math.min(minX, n.x - 100)
      minY = Math.min(minY, n.y - 50)
      maxX = Math.max(maxX, n.x + 100)
      maxY = Math.max(maxY, n.y + 50)
    })
    const contentW = maxX - minX
    const contentH = maxY - minY
    const scale = Math.min(canvas.width / contentW, canvas.height / contentH) * 0.85
    const offX = canvas.width / 2 - ((minX + maxX) / 2) * scale
    const offY = canvas.height / 2 - ((minY + maxY) / 2) * scale

    const worldX = (sx - offX) / scale
    const worldY = (sy - offY) / scale
    onSelect(worldX, worldY)
  }

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={150}
      style={{ width: '100%', height: 150, borderRadius: 6, cursor: 'pointer' }}
      onClick={handleClick}
    />
  )
}

const NodeTree: React.FC<{
  node: MindMapNode | undefined
  data: MindMapData
  selectedNodeId: string | null
  onSelect: (id: string) => void
  depth: number
}> = ({ node, data, selectedNodeId, onSelect, depth }) => {
  if (!node) return null
  const children = Object.values(data.nodes).filter(n => n.parentId === node.id)

  return (
    <div className="tree-node">
      <div
        className={`tree-item ${selectedNodeId === node.id ? 'selected' : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => onSelect(node.id)}
      >
        {children.length > 0 && (
          <span className="tree-toggle">{node.collapsed ? '▶' : '▼'}</span>
        )}
        <span className="tree-dot" style={{ background: node.color }} />
        <span className="tree-label">{node.text}</span>
      </div>
      {!node.collapsed && children.map(child => (
        <NodeTree
          key={child.id}
          node={child}
          data={data}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export default App
