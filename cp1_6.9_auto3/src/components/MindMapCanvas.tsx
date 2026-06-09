import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { MindMapData, MindMapNode, Connection, ViewTransform, UserCursor } from '../types'
import { easeOutCubic } from '../utils/storage'

interface Props {
  data: MindMapData
  selectedNodeId: string | null
  cursors: UserCursor[]
  onSelectNode: (id: string | null) => void
  onUpdateNode: (node: MindMapNode) => void
  onAddChild: (parentId: string) => void
  onDeleteNode: (id: string) => void
  onToggleCollapse: (id: string) => void
  onTransformChange: (transform: ViewTransform) => void
  onCursorMove: (x: number, y: number, nodeId: string | null) => void
}

interface NodePosition {
  id: string
  x: number
  y: number
  targetX: number
  targetY: number
  animating: boolean
  animStartTime: number
}

const NODE_WIDTH = 160
const NODE_HEIGHT = 50
const NODE_RADIUS = 10
const COLORS = {
  bg: '#1a1a2e',
  node: '#16213e',
  highlight: '#0f3460',
  lineStart: '#e94560',
  lineEnd: '#533483',
  text: '#ffffff',
  textSecondary: '#a0a0b0'
}

const MindMapCanvas: React.FC<Props> = ({
  data,
  selectedNodeId,
  cursors,
  onSelectNode,
  onUpdateNode,
  onAddChild,
  onDeleteNode,
  onToggleCollapse,
  onTransformChange,
  onCursorMove
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 })
  const transformRef = useRef(transform)
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0, offsetX: 0, offsetY: 0 })
  const nodePositionsRef = useRef<Map<string, NodePosition>>(new Map())
  const touchRef = useRef<{ distance: number; midX: number; midY: number; scale: number } | null>(null)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    transformRef.current = transform
    onTransformChange(transform)
  }, [transform, onTransformChange])

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const t = transformRef.current
    return {
      x: (sx - t.offsetX) / t.scale,
      y: (sy - t.offsetY) / t.scale
    }
  }, [])

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const t = transformRef.current
    return {
      x: wx * t.scale + t.offsetX,
      y: wy * t.scale + t.offsetY
    }
  }, [])

  const getNodeAt = useCallback((wx: number, wy: number): string | null => {
    const nodes = Object.values(data.nodes)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      if (n.collapsed && n.parentId !== null) continue
      if (wx >= n.x - NODE_WIDTH / 2 && wx <= n.x + NODE_WIDTH / 2 &&
          wy >= n.y - NODE_HEIGHT / 2 && wy <= n.y + NODE_HEIGHT / 2) {
        return n.id
      }
    }
    return null
  }, [data])

  const initNodePositions = useCallback(() => {
    Object.values(data.nodes).forEach(node => {
      if (!nodePositionsRef.current.has(node.id)) {
        nodePositionsRef.current.set(node.id, {
          id: node.id,
          x: node.x,
          y: node.y,
          targetX: node.x,
          targetY: node.y,
          animating: false,
          animStartTime: 0
        })
      }
    })
  }, [data])

  useEffect(() => {
    initNodePositions()
  }, [initNodePositions])

  useEffect(() => {
    Object.values(data.nodes).forEach(node => {
      const pos = nodePositionsRef.current.get(node.id)
      if (pos) {
        pos.targetX = node.x
        pos.targetY = node.y
        if (!pos.animating && (Math.abs(pos.x - node.x) > 0.5 || Math.abs(pos.y - node.y) > 0.5)) {
          pos.animating = true
          pos.animStartTime = performance.now()
        }
      }
    })
  }, [data])

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  const drawConnection = (ctx: CanvasRenderingContext2D, conn: Connection) => {
    const fromPos = nodePositionsRef.current.get(conn.fromId)
    const toPos = nodePositionsRef.current.get(conn.toId)
    if (!fromPos || !toPos) return

    const from = worldToScreen(fromPos.x, fromPos.y)
    const to = worldToScreen(toPos.x, toPos.y)

    const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y)
    gradient.addColorStop(0, COLORS.lineStart)
    gradient.addColorStop(1, COLORS.lineEnd)

    ctx.strokeStyle = gradient
    ctx.lineWidth = 2 * transformRef.current.scale
    ctx.lineCap = 'round'

    const midX = (from.x + to.x) / 2
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y)
    ctx.stroke()

    if (conn.label) {
      const labelX = midX
      const labelY = (from.y + to.y) / 2
      ctx.font = `${12 * transformRef.current.scale}px sans-serif`
      const metrics = ctx.measureText(conn.label)
      const pad = 4 * transformRef.current.scale
      ctx.fillStyle = COLORS.node
      drawRoundedRect(ctx, labelX - metrics.width / 2 - pad, labelY - 8 * transformRef.current.scale - pad,
        metrics.width + pad * 2, 16 * transformRef.current.scale + pad * 2, 4 * transformRef.current.scale)
      ctx.fill()
      ctx.fillStyle = COLORS.textSecondary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(conn.label, labelX, labelY)
    }
  }

  const drawNode = (ctx: CanvasRenderingContext2D, node: MindMapNode) => {
    const pos = nodePositionsRef.current.get(node.id)
    if (!pos) return

    const screen = worldToScreen(pos.x, pos.y)
    const w = NODE_WIDTH * transformRef.current.scale
    const h = NODE_HEIGHT * transformRef.current.scale
    const r = NODE_RADIUS * transformRef.current.scale
    const x = screen.x - w / 2
    const y = screen.y - h / 2

    const isSelected = node.id === selectedNodeId
    const isHover = node.id === hoverNodeId

    if (isHover || isSelected) {
      ctx.save()
      ctx.shadowColor = isSelected ? '#4fc3f7' : '#e94560'
      ctx.shadowBlur = (isSelected ? 20 : 12) * transformRef.current.scale
      ctx.fillStyle = isSelected ? COLORS.highlight : node.color || COLORS.node
      drawRoundedRect(ctx, x, y, w, h, r)
      ctx.fill()
      ctx.restore()
    } else {
      ctx.fillStyle = node.color || COLORS.node
      drawRoundedRect(ctx, x, y, w, h, r)
      ctx.fill()
    }

    ctx.strokeStyle = isSelected ? '#4fc3f7' : 'rgba(255,255,255,0.1)'
    ctx.lineWidth = (isSelected ? 2 : 1) * transformRef.current.scale
    drawRoundedRect(ctx, x, y, w, h, r)
    ctx.stroke()

    ctx.fillStyle = COLORS.text
    ctx.font = `${14 * transformRef.current.scale}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const text = node.text.length > 15 ? node.text.slice(0, 15) + '...' : node.text
    ctx.fillText(text, screen.x, screen.y)

    const children = Object.values(data.nodes).filter(n => n.parentId === node.id)
    if (children.length > 0) {
      const btnX = x + w
      const btnY = screen.y
      const btnR = 8 * transformRef.current.scale
      ctx.fillStyle = COLORS.lineStart
      ctx.beginPath()
      ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.text
      ctx.font = `${12 * transformRef.current.scale}px sans-serif`
      ctx.fillText(node.collapsed ? '+' : '−', btnX, btnY)
    }
  }

  const drawCursors = (ctx: CanvasRenderingContext2D) => {
    cursors.forEach(cursor => {
      const screen = worldToScreen(cursor.x, cursor.y)
      ctx.save()
      ctx.fillStyle = cursor.color
      ctx.beginPath()
      ctx.moveTo(screen.x, screen.y)
      ctx.lineTo(screen.x + 12 * transformRef.current.scale, screen.y + 4 * transformRef.current.scale)
      ctx.lineTo(screen.x + 4 * transformRef.current.scale, screen.y + 12 * transformRef.current.scale)
      ctx.closePath()
      ctx.fill()
      if (cursor.userName) {
        ctx.font = `${10 * transformRef.current.scale}px sans-serif`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        const metrics = ctx.measureText(cursor.userName)
        ctx.fillStyle = cursor.color
        const padX = 4 * transformRef.current.scale
        const padY = 2 * transformRef.current.scale
        ctx.fillRect(screen.x, screen.y + 14 * transformRef.current.scale,
          metrics.width + padX * 2, 14 * transformRef.current.scale + padY * 2)
        ctx.fillStyle = '#fff'
        ctx.fillText(cursor.userName, screen.x + padX, screen.y + 14 * transformRef.current.scale + padY)
      }
      ctx.restore()
    })
  }

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, rect.width, rect.height)

    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    const gridSize = 50 * transformRef.current.scale
    const startX = transformRef.current.offsetX % gridSize
    const startY = transformRef.current.offsetY % gridSize
    for (let x = startX; x < rect.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, rect.height)
      ctx.stroke()
    }
    for (let y = startY; y < rect.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(rect.width, y)
      ctx.stroke()
    }

    const drawnConnections = new Set<string>()
    Object.values(data.nodes).forEach(node => {
      if (node.parentId) {
        const connId = `${node.parentId}_${node.id}`
        if (!drawnConnections.has(connId)) {
          const conn = Object.values(data.connections).find(
            c => (c.fromId === node.parentId && c.toId === node.id) ||
                 (c.toId === node.parentId && c.fromId === node.id)
          )
          if (conn) {
            drawConnection(ctx, conn)
            drawnConnections.add(connId)
          } else {
            drawConnection(ctx, { id: connId, fromId: node.parentId, toId: node.id })
            drawnConnections.add(connId)
          }
        }
      }
    })

    Object.values(data.connections).forEach(conn => {
      const connId1 = `${conn.fromId}_${conn.toId}`
      const connId2 = `${conn.toId}_${conn.fromId}`
      if (!drawnConnections.has(connId1) && !drawnConnections.has(connId2)) {
        drawConnection(ctx, conn)
      }
    })

    const sortedNodes = Object.values(data.nodes).sort((a, b) => {
      if (a.id === selectedNodeId) return 1
      if (b.id === selectedNodeId) return -1
      return 0
    })
    sortedNodes.forEach(node => {
      if (node.collapsed && node.parentId !== null) return
      drawNode(ctx, node)
    })

    drawCursors(ctx)
  }, [data, selectedNodeId, hoverNodeId, cursors, worldToScreen])

  const animate = useCallback(() => {
    const now = performance.now()
    let needsUpdate = false

    nodePositionsRef.current.forEach(pos => {
      if (pos.animating) {
        const elapsed = now - pos.animStartTime
        const duration = 300
        const t = Math.min(elapsed / duration, 1)
        const eased = easeOutCubic(t)
        pos.x = pos.x + (pos.targetX - pos.x) * eased
        pos.y = pos.y + (pos.targetY - pos.y) * eased
        if (t >= 1) {
          pos.x = pos.targetX
          pos.y = pos.targetY
          pos.animating = false
        }
        needsUpdate = true
      }
    })

    render()
    animFrameRef.current = requestAnimationFrame(animate)
  }, [render])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [animate])

  useEffect(() => {
    const handleResize = () => render()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [render])

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)

    const nodeId = getNodeAt(world.x, world.y)

    if (nodeId) {
      const node = data.nodes[nodeId]
      const pos = nodePositionsRef.current.get(nodeId)
      if (pos) {
        setDraggingNodeId(nodeId)
        dragStartRef.current = {
          x: sx,
          y: sy,
          nodeX: pos.x,
          nodeY: pos.y,
          offsetX: 0,
          offsetY: 0
        }
        pos.animating = false
      }
      onSelectNode(nodeId)
      onCursorMove(world.x, world.y, nodeId)
    } else {
      setIsPanning(true)
      dragStartRef.current = {
        x: sx,
        y: sy,
        nodeX: 0,
        nodeY: 0,
        offsetX: transformRef.current.offsetX,
        offsetY: transformRef.current.offsetY
      }
      onSelectNode(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)

    if (!draggingNodeId && !isPanning) {
      const nodeId = getNodeAt(world.x, world.y)
      setHoverNodeId(nodeId)
      onCursorMove(world.x, world.y, nodeId)
      return
    }

    const dx = sx - dragStartRef.current.x
    const dy = sy - dragStartRef.current.y

    if (draggingNodeId) {
      const pos = nodePositionsRef.current.get(draggingNodeId)
      if (pos) {
        pos.x = dragStartRef.current.nodeX + dx / transformRef.current.scale
        pos.y = dragStartRef.current.nodeY + dy / transformRef.current.scale
        pos.targetX = pos.x
        pos.targetY = pos.y
      }
    } else if (isPanning) {
      setTransform(prev => ({
        ...prev,
        offsetX: dragStartRef.current.offsetX + dx,
        offsetY: dragStartRef.current.offsetY + dy
      }))
    }
  }

  const handleMouseUp = () => {
    if (draggingNodeId) {
      const pos = nodePositionsRef.current.get(draggingNodeId)
      if (pos) {
        const node = data.nodes[draggingNodeId]
        if (node) {
          onUpdateNode({ ...node, x: pos.x, y: pos.y })
        }
      }
      setDraggingNodeId(null)
    }
    setIsPanning(false)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)
    const nodeId = getNodeAt(world.x, world.y)
    if (nodeId) {
      setEditingNodeId(nodeId)
      setEditingText(data.nodes[nodeId].text)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)

    const delta = -e.deltaY * 0.001
    const newScale = Math.min(Math.max(transformRef.current.scale * (1 + delta), 0.2), 3)

    setTransform(prev => ({
      scale: newScale,
      offsetX: sx - world.x * newScale,
      offsetY: sy - world.y * newScale
    }))
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      const t = e.touches[0]
      const rect = canvasRef.current!.getBoundingClientRect()
      const sx = t.clientX - rect.left
      const sy = t.clientY - rect.top
      const world = screenToWorld(sx, sy)
      const nodeId = getNodeAt(world.x, world.y)

      if (nodeId) {
        const pos = nodePositionsRef.current.get(nodeId)
        if (pos) {
          setDraggingNodeId(nodeId)
          dragStartRef.current = {
            x: sx, y: sy, nodeX: pos.x, nodeY: pos.y, offsetX: 0, offsetY: 0
          }
          pos.animating = false
        }
        onSelectNode(nodeId)
      } else {
        setIsPanning(true)
        dragStartRef.current = {
          x: sx, y: sy, nodeX: 0, nodeY: 0,
          offsetX: transformRef.current.offsetX, offsetY: transformRef.current.offsetY
        }
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dx = t2.clientX - t1.clientX
      const dy = t2.clientY - t1.clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      touchRef.current = {
        distance,
        midX: (t1.clientX + t2.clientX) / 2,
        midY: (t1.clientY + t2.clientY) / 2,
        scale: transformRef.current.scale
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && (draggingNodeId || isPanning)) {
      const t = e.touches[0]
      const rect = canvasRef.current!.getBoundingClientRect()
      const sx = t.clientX - rect.left
      const sy = t.clientY - rect.top
      const dx = sx - dragStartRef.current.x
      const dy = sy - dragStartRef.current.y

      if (draggingNodeId) {
        const pos = nodePositionsRef.current.get(draggingNodeId)
        if (pos) {
          pos.x = dragStartRef.current.nodeX + dx / transformRef.current.scale
          pos.y = dragStartRef.current.nodeY + dy / transformRef.current.scale
          pos.targetX = pos.x
          pos.targetY = pos.y
        }
      } else if (isPanning) {
        setTransform(prev => ({
          ...prev,
          offsetX: dragStartRef.current.offsetX + dx,
          offsetY: dragStartRef.current.offsetY + dy
        }))
      }
    } else if (e.touches.length === 2 && touchRef.current) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dx = t2.clientX - t1.clientX
      const dy = t2.clientY - t1.clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const scale = Math.min(Math.max(touchRef.current.scale * (distance / touchRef.current.distance), 0.2), 3)
      const rect = canvasRef.current!.getBoundingClientRect()
      const midX = (t1.clientX + t2.clientX) / 2 - rect.left
      const midY = (t1.clientY + t2.clientY) / 2 - rect.top
      const world = screenToWorld(touchRef.current.midX - rect.left, touchRef.current.midY - rect.top)
      setTransform({
        scale,
        offsetX: midX - world.x * scale,
        offsetY: midY - world.y * scale
      })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (draggingNodeId) {
      const pos = nodePositionsRef.current.get(draggingNodeId)
      if (pos) {
        const node = data.nodes[draggingNodeId]
        if (node) {
          onUpdateNode({ ...node, x: pos.x, y: pos.y })
        }
      }
      setDraggingNodeId(null)
    }
    if (e.touches.length === 0) {
      setIsPanning(false)
      touchRef.current = null
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)
    const nodeId = getNodeAt(world.x, world.y)
    if (nodeId) {
      const node = data.nodes[nodeId]
      const children = Object.values(data.nodes).filter(n => n.parentId === nodeId)
      if (children.length > 0) {
        onToggleCollapse(nodeId)
      } else {
        onAddChild(nodeId)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingNodeId) return
    if (selectedNodeId) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        onDeleteNode(selectedNodeId)
      } else if (e.key === 'Enter') {
        onAddChild(selectedNodeId)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        onAddChild(selectedNodeId)
      } else if (e.key === 'F2') {
        setEditingNodeId(selectedNodeId)
        setEditingText(data.nodes[selectedNodeId].text)
      }
    }
  }

  const finishEditing = (save: boolean) => {
    if (editingNodeId && save) {
      const node = data.nodes[editingNodeId]
      if (node && editingText.trim()) {
        onUpdateNode({ ...node, text: editingText.trim() })
      }
    }
    setEditingNodeId(null)
    setEditingText('')
  }

  const getEditingInputStyle = (): React.CSSProperties => {
    if (!editingNodeId) return { display: 'none' }
    const pos = nodePositionsRef.current.get(editingNodeId)
    if (!pos) return { display: 'none' }
    const screen = worldToScreen(pos.x, pos.y)
    const w = NODE_WIDTH * transformRef.current.scale
    const h = NODE_HEIGHT * transformRef.current.scale
    return {
      position: 'absolute',
      left: screen.x - w / 2,
      top: screen.y - h / 2,
      width: w,
      height: h,
      padding: '8px 12px',
      background: COLORS.highlight,
      color: COLORS.text,
      border: '2px solid #4fc3f7',
      borderRadius: NODE_RADIUS * transformRef.current.scale,
      fontSize: 14 * transformRef.current.scale,
      outline: 'none',
      textAlign: 'center'
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: isPanning ? 'grabbing' : (draggingNodeId ? 'grabbing' : 'default'), display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      />
      <input
        type="text"
        value={editingText}
        onChange={(e) => setEditingText(e.target.value)}
        onBlur={() => finishEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finishEditing(true)
          if (e.key === 'Escape') finishEditing(false)
        }}
        style={getEditingInputStyle()}
        autoFocus
      />
    </div>
  )
}

export default MindMapCanvas
