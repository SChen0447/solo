import { useState, useRef, useEffect, useMemo } from 'react'
import { Room, Pin, ToolType } from '../types'
import { PALETTE } from '../utils/sampleData'

interface FloorPlanProps {
  rooms: Room[]
  pins: Pin[]
  selectedPinId: string | null
  onSelectPin: (id: string | null) => void
  tool: ToolType
  onToolChange: (t: ToolType) => void
  searchQuery: string
  onAddRoom: (x: number, y: number, w: number, h: number) => void
  onUpdateRoom: (id: string, updates: Partial<Room>) => void
  onDeleteRoom: (id: string) => void
  onAddPin: (roomId: string, x: number, y: number) => void
  onMovePin: (id: string, x: number, y: number) => void
  onCommitMovePin: (id: string, x: number, y: number) => void
  pathPoints: { x: number; y: number }[]
}

const CANVAS_W = 1200
const CANVAS_H = 800

export default function FloorPlan(props: FloorPlanProps) {
  const {
    rooms,
    pins,
    selectedPinId,
    onSelectPin,
    tool,
    onToolChange,
    searchQuery,
    onAddRoom,
    onUpdateRoom,
    onDeleteRoom,
    onAddPin,
    onMovePin,
    onCommitMovePin,
    pathPoints,
  } = props

  const svgRef = useRef<SVGSVGElement>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null)
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [bouncingPins, setBouncingPins] = useState<Set<string>>(new Set())
  const [highlightedRooms, setHighlightedRooms] = useState<Set<string>>(new Set())

  const getSvgPoint = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const pt = svgRef.current.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const loc = pt.matrixTransform(ctm.inverse())
    return { x: Math.max(0, Math.min(CANVAS_W, loc.x)), y: Math.max(0, Math.min(CANVAS_H, loc.y)) }
  }

  const searchLower = searchQuery.trim().toLowerCase()

  useEffect(() => {
    if (!searchLower) {
      setBouncingPins(new Set())
      setHighlightedRooms(new Set())
      return
    }
    const matchedPins = new Set<string>()
    const matchedRooms = new Set<string>()

    pins.forEach(p => {
      if (
        p.exhibit.name.toLowerCase().includes(searchLower) ||
        rooms.find(r => r.id === p.roomId)?.name.toLowerCase().includes(searchLower)
      ) {
        matchedPins.add(p.id)
      }
    })

    rooms.forEach(r => {
      if (r.name.toLowerCase().includes(searchLower)) {
        matchedRooms.add(r.id)
      }
      pins.forEach(p => {
        if (p.roomId === r.id && p.exhibit.name.toLowerCase().includes(searchLower)) {
          matchedRooms.add(r.id)
        }
      })
    })

    setBouncingPins(matchedPins)
    setHighlightedRooms(matchedRooms)
  }, [searchLower, pins, rooms])

  const filteredPinOpacity = useMemo(() => {
    const map: Record<string, number> = {}
    pins.forEach(p => {
      if (!searchLower || bouncingPins.has(p.id)) {
        map[p.id] = 1
      } else {
        map[p.id] = 0.2
      }
    })
    return map
  }, [pins, searchLower, bouncingPins])

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (tool === 'room') {
      const pt = getSvgPoint(e)
      setDragStart(pt)
      setDragCurrent(pt)
    } else if (tool === 'select') {
      onSelectPin(null)
      setEditingRoomId(null)
    }
  }

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (draggingPinId) {
      const pt = getSvgPoint(e)
      onMovePin(draggingPinId, pt.x, pt.y)
      return
    }
    if (tool === 'room' && dragStart) {
      setDragCurrent(getSvgPoint(e))
    }
  }

  const handleSvgMouseUp = () => {
    if (draggingPinId) {
      const pin = pins.find(p => p.id === draggingPinId)
      if (pin) onCommitMovePin(draggingPinId, pin.x, pin.y)
      setDraggingPinId(null)
      return
    }
    if (tool === 'room' && dragStart && dragCurrent) {
      const x = Math.min(dragStart.x, dragCurrent.x)
      const y = Math.min(dragStart.y, dragCurrent.y)
      const w = Math.abs(dragCurrent.x - dragStart.x)
      const h = Math.abs(dragCurrent.y - dragStart.y)
      if (w > 40 && h > 40) {
        onAddRoom(x, y, w, h)
      }
      setDragStart(null)
      setDragCurrent(null)
    }
  }

  const handlePinMouseDown = (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation()
    if (tool === 'select') {
      onSelectPin(pinId)
      setDraggingPinId(pinId)
    }
  }

  const handlePinClick = (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation()
    if (tool === 'select') {
      onSelectPin(pinId)
    }
  }

  const handleRoomClick = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation()
    if (tool === 'pin') {
      const pt = getSvgPoint(e)
      onAddPin(room.id, pt.x, pt.y)
    } else if (tool === 'select') {
      setEditingRoomId(room.id)
      setEditName(room.name)
      setEditColor(room.bgColor)
    }
  }

  const rect = useMemo(() => {
    if (dragStart && dragCurrent) {
      return {
        x: Math.min(dragStart.x, dragCurrent.x),
        y: Math.min(dragStart.y, dragCurrent.y),
        w: Math.abs(dragCurrent.x - dragStart.x),
        h: Math.abs(dragCurrent.y - dragStart.y),
      }
    }
    return null
  }, [dragStart, dragCurrent])

  return (
    <div className="canvas-wrapper" style={{ position: 'relative' }}>
      <div className="canvas-tools">
        <button
          className={`tool-btn ${tool === 'select' ? 'active' : ''}`}
          onClick={() => onToolChange('select')}
          title="选择/移动"
        >
          ↖
        </button>
        <button
          className={`tool-btn ${tool === 'room' ? 'active' : ''}`}
          onClick={() => onToolChange('room')}
          title="绘制展厅（拖动）"
        >
          ▢
        </button>
        <button
          className={`tool-btn ${tool === 'pin' ? 'active' : ''}`}
          onClick={() => onToolChange('pin')}
          title="放置图钉（点击展厅内）"
        >
          📍
        </button>
      </div>

      {editingRoomId && (
        <div
          className="room-editor"
          style={{ right: 24, top: 24 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="room-editor-label">展厅名称</div>
          <input
            className="room-editor-input"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            autoFocus
          />
          <div className="room-editor-label">背景颜色</div>
          <div className="color-picker">
            {PALETTE.map(c => (
              <div
                key={c}
                className={`color-swatch ${editColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setEditColor(c)}
              />
            ))}
          </div>
          <div className="room-editor-actions">
            <button
              className="room-editor-btn room-editor-btn-save"
              onClick={() => {
                onUpdateRoom(editingRoomId, { name: editName, bgColor: editColor })
                setEditingRoomId(null)
              }}
            >
              保存
            </button>
            <button
              className="room-editor-btn room-editor-btn-delete"
              onClick={() => {
                onDeleteRoom(editingRoomId)
                setEditingRoomId(null)
              }}
            >
              删除
            </button>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        className="svg-canvas"
        width={CANVAS_W}
        height={CANVAS_H}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{
          background: '#f8fafc',
          cursor: tool === 'room' ? 'crosshair' : tool === 'pin' ? 'copy' : 'default',
        }}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseUp}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />

        {rooms.map(room => {
          const isHighlighted = highlightedRooms.has(room.id) && searchLower
          const strokeColor = isHighlighted ? '#fbbf24' : room.bgColor
          const strokeWidth = isHighlighted ? 4 : 2
          return (
            <g key={room.id}>
              <rect
                className={`room-rect ${isHighlighted ? 'room-rect-highlight' : ''}`}
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                fill={room.bgColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                rx={6}
                onClick={e => handleRoomClick(e, room)}
                style={{
                  cursor: tool === 'pin' ? 'copy' : 'pointer',
                }}
              />
              <text
                className="room-label"
                x={room.x + 12}
                y={room.y + 24}
              >
                {room.name}
              </text>
            </g>
          )
        })}

        {rect && (
          <rect
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="6,4"
            rx={6}
            pointerEvents="none"
          />
        )}

        {pathPoints.length > 1 && (
          <polyline
            points={pathPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#ff6b6b"
            strokeWidth={2}
            className="path-line"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {pins.map(pin => {
          const bounce = bouncingPins.has(pin.id)
          const opacity = filteredPinOpacity[pin.id] ?? 1
          const isSelected = pin.id === selectedPinId
          return (
            <g
              key={pin.id}
              transform={`translate(${pin.x}, ${pin.y})`}
              style={{ cursor: tool === 'select' ? 'grab' : 'default', opacity }}
              onMouseDown={e => handlePinMouseDown(e, pin.id)}
              onClick={e => handlePinClick(e, pin.id)}
            >
              <g className={`pin-circle ${bounce ? 'pin-bounce' : ''}`}>
                <circle
                  r={22}
                  fill="rgba(0,0,0,0.08)"
                  cy={2}
                />
                <circle
                  r={20}
                  fill={pin.exhibit.thumbnailColor}
                  stroke={isSelected ? '#3b82f6' : '#ffffff'}
                  strokeWidth={isSelected ? 3 : 2}
                  style={{
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
                  }}
                />
              </g>
              <text
                className="pin-text"
                y={38}
                style={{ opacity }}
              >
                {pin.exhibit.name.length > 5 ? pin.exhibit.name.slice(0, 5) + '…' : pin.exhibit.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
