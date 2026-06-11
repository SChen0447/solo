import React, { useCallback, useRef, useMemo } from 'react'
import type { GardenElement, ElementType, RockData, RakeData, MossData } from '../App'

interface GardenCanvasProps {
  elements: GardenElement[]
  selectedId: string | null
  isClearing: boolean
  isFlashing: boolean
  onSelect: (id: string | null) => void
  onMoveElement: (id: string, x: number, y: number) => void
  onStartDrag: (id: string) => void
  onAddElement: (type: ElementType, x: number, y: number) => void
  canvasSize: number
}

const GridLines = React.memo(({ size }: { size: number }) => {
  const lines = useMemo(() => {
    const result: React.ReactElement[] = []
    for (let i = 50; i < size; i += 50) {
      result.push(
        <line key={`v${i}`} x1={i} y1={0} x2={i} y2={size} stroke="#d4c9a8" strokeWidth={0.5} opacity={0.3} />,
        <line key={`h${i}`} x1={0} y1={i} x2={size} y2={i} stroke="#d4c9a8" strokeWidth={0.5} opacity={0.3} />
      )
    }
    return result
  }, [size])
  return <>{lines}</>
})

const RockElement = React.memo(({ el, isSelected }: { el: GardenElement; isSelected: boolean }) => {
  const data = el.data as RockData
  const pointsStr = data.points.map(([x, y]) => `${x},${y}`).join(' ')
  const bboxSize = data.size * 1.2

  return (
    <g
      transform={`translate(${el.x}, ${el.y})`}
      className={`garden-element ${el.fadeIn ? 'fade-in' : ''}`}
      data-id={el.id}
    >
      <polygon
        points={pointsStr}
        fill={`url(#rock-gradient-${data.gradientAngle > 180 ? 'alt' : 'default'})`}
        filter="url(#rock-feather)"
        stroke={isSelected ? '#4488ff' : 'none'}
        strokeWidth={isSelected ? 0 : 0}
      />
      {isSelected && (
        <rect
          x={-bboxSize / 2 - 4}
          y={-bboxSize / 2 - 4}
          width={bboxSize + 8}
          height={bboxSize + 8}
          fill="none"
          stroke="#4488ff"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          rx={2}
        />
      )}
    </g>
  )
})

const RakeElement = React.memo(({ el, isSelected }: { el: GardenElement; isSelected: boolean }) => {
  const data = el.data as RakeData
  const deg = (data.rotation * 180) / Math.PI
  const bboxW = data.width + 20
  const bboxH = data.height + 20

  return (
    <g
      transform={`translate(${el.x}, ${el.y}) rotate(${deg})`}
      className={`garden-element ${el.fadeIn ? 'fade-in' : ''}`}
      data-id={el.id}
    >
      {data.paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="url(#rake-gradient)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ))}
      {isSelected && (
        <rect
          x={-bboxW / 2}
          y={-bboxH / 2}
          width={bboxW}
          height={bboxH}
          fill="none"
          stroke="#4488ff"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          rx={2}
          transform={`rotate(${-deg})`}
        />
      )}
    </g>
  )
})

const MossElement = React.memo(({ el, isSelected }: { el: GardenElement; isSelected: boolean }) => {
  const data = el.data as MossData
  const bboxSize = data.radius * 2 + 8

  return (
    <g
      transform={`translate(${el.x}, ${el.y})`}
      className={`garden-element ${el.fadeIn ? 'fade-in' : ''}`}
      data-id={el.id}
    >
      <circle
        r={data.radius}
        fill="url(#moss-gradient)"
        filter="url(#moss-blur)"
      />
      {isSelected && (
        <rect
          x={-bboxSize / 2}
          y={-bboxSize / 2}
          width={bboxSize}
          height={bboxSize}
          fill="none"
          stroke="#4488ff"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          rx={2}
        />
      )}
    </g>
  )
})

const GardenElementRenderer = React.memo(({ el, isSelected }: { el: GardenElement; isSelected: boolean }) => {
  switch (el.type) {
    case 'rock': return <RockElement el={el} isSelected={isSelected} />
    case 'rake': return <RakeElement el={el} isSelected={isSelected} />
    case 'moss': return <MossElement el={el} isSelected={isSelected} />
  }
})

export default function GardenCanvas({
  elements,
  selectedId,
  isClearing,
  isFlashing,
  onSelect,
  onMoveElement,
  onStartDrag,
  onAddElement,
  canvasSize,
}: GardenCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; elStartX: number; elStartY: number; moved: boolean } | null>(null)

  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const scaleX = canvasSize / rect.width
    const scaleY = canvasSize / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }, [canvasSize])

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = (e.target as SVGElement).closest('[data-id]') as SVGElement | null
    const id = target?.getAttribute('data-id')

    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    if (id) {
      e.preventDefault()
      const pt = getSVGPoint(clientX, clientY)
      const el = elements.find(elem => elem.id === id)
      if (el) {
        dragRef.current = {
          id,
          startX: pt.x,
          startY: pt.y,
          elStartX: el.x,
          elStartY: el.y,
          moved: false,
        }
        onStartDrag(id)
      }
    } else {
      onSelect(null)
    }
  }, [elements, getSVGPoint, onSelect, onStartDrag])

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current) return
    e.preventDefault()

    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const pt = getSVGPoint(clientX, clientY)
    const dx = pt.x - dragRef.current.startX
    const dy = pt.y - dragRef.current.startY

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragRef.current.moved = true
    }

    onMoveElement(
      dragRef.current.id,
      dragRef.current.elStartX + dx,
      dragRef.current.elStartY + dy
    )
  }, [getSVGPoint, onMoveElement])

  const handleMouseUp = useCallback(() => {
    if (dragRef.current && !dragRef.current.moved) {
      onSelect(dragRef.current.id)
    }
    dragRef.current = null
  }, [onSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('element-type') as ElementType
    if (!type) return
    const pt = getSVGPoint(e.clientX, e.clientY)
    onAddElement(type, pt.x, pt.y)
  }, [getSVGPoint, onAddElement])

  const selectedEl = useMemo(() => elements.find(e => e.id === selectedId), [elements, selectedId])

  const canvasClass = [
    'garden-canvas-wrapper',
    isClearing ? 'clearing' : '',
    isFlashing ? 'flash-warning' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={canvasClass}>
      <svg
        ref={svgRef}
        width={canvasSize}
        height={canvasSize}
        viewBox={`0 0 ${canvasSize} ${canvasSize}`}
        xmlns="http://www.w3.org/2000/svg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ touchAction: 'none' }}
      >
        <defs>
          <linearGradient id="rock-gradient-default" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#696969" />
            <stop offset="100%" stopColor="#4a4a4a" />
          </linearGradient>
          <linearGradient id="rock-gradient-alt" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#696969" />
            <stop offset="100%" stopColor="#4a4a4a" />
          </linearGradient>
          <filter id="rock-feather">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <linearGradient id="rake-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b8a88a" stopOpacity={0.3} />
            <stop offset="30%" stopColor="#b8a88a" stopOpacity={0.9} />
            <stop offset="70%" stopColor="#b8a88a" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#b8a88a" stopOpacity={0.1} />
          </linearGradient>
          <radialGradient id="moss-gradient">
            <stop offset="0%" stopColor="#8fc7a0" stopOpacity={0.7} />
            <stop offset="60%" stopColor="#5a9e6f" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#2e5c3e" stopOpacity={0.2} />
          </radialGradient>
          <filter id="moss-blur">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        <rect width={canvasSize} height={canvasSize} fill="#f5e6cc" />
        <GridLines size={canvasSize} />

        {elements.map(el => (
          <GardenElementRenderer
            key={el.id}
            el={el}
            isSelected={el.id === selectedId}
          />
        ))}
      </svg>
      {selectedEl && (
        <div className="selection-hint">
          方向键移动 · Delete删除
        </div>
      )}
    </div>
  )
}
