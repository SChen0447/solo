import { useRef, useEffect, useState, useCallback } from 'react'
import { Socket } from 'socket.io-client'

interface CanvasBoardProps {
  socket: Socket | null
  userColor: string
  userId: string
}

interface Point {
  x: number
  y: number
}

function CanvasBoard({ socket, userColor, userId }: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#FF6B6B')
  const [size, setSize] = useState(4)
  const lastPointRef = useRef<Point | null>(null)
  const currentPathRef = useRef<Point[]>([])

  useEffect(() => {
    if (userColor) {
      setColor(userColor)
    }
  }, [userColor])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleDraw = (data: any) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.strokeStyle = data.color
      ctx.lineWidth = data.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (data.isLine && data.points.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(data.points[0].x, data.points[0].y)
        for (let i = 1; i < data.points.length; i++) {
          ctx.lineTo(data.points[i].x, data.points[i].y)
        }
        ctx.stroke()
      }
    }

    const handleClear = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    socket.on('draw', handleDraw)
    socket.on('clearCanvas', handleClear)

    return () => {
      socket.off('draw', handleDraw)
      socket.off('clearCanvas', handleClear)
    }
  }, [socket])

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number

    if ('touches' in e) {
      if (e.touches.length === 0) return null
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const point = getCanvasPoint(e)
    if (!point) return

    setIsDrawing(true)
    lastPointRef.current = point
    currentPathRef.current = [point]
  }, [getCanvasPoint])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return

    const point = getCanvasPoint(e)
    if (!point || !lastPointRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()

    currentPathRef.current.push(point)
    lastPointRef.current = point

    if (socket && currentPathRef.current.length % 3 === 0) {
      socket.emit('draw', {
        userId,
        color,
        size,
        points: currentPathRef.current.slice(-5),
        isLine: true
      })
    }
  }, [isDrawing, color, size, getCanvasPoint, socket, userId])

  const stopDrawing = useCallback(() => {
    if (isDrawing && socket && currentPathRef.current.length > 1) {
      socket.emit('draw', {
        userId,
        color,
        size,
        points: currentPathRef.current,
        isLine: true
      })
    }

    setIsDrawing(false)
    lastPointRef.current = null
    currentPathRef.current = []
  }, [isDrawing, socket, userId, color, size])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (socket) {
      socket.emit('clearCanvas')
    }
  }

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#2ECC71', '#E74C3C', '#F39C12']

  return (
    <div className="card canvas-board">
      <div className="canvas-header">
        <h2 className="card-title">🎨 共享画板</h2>
        <div className="canvas-tools">
          <div className="tool-group">
            <label className="tool-label">颜色</label>
            <div className="color-picker">
              {colors.map((c) => (
                <button
                  key={c}
                  className={`color-swatch ${color === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="tool-group">
            <label className="tool-label">粗细: {size}px</label>
            <input
              type="range"
              min="1"
              max="30"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="size-slider"
            />
          </div>

          <button onClick={clearCanvas} className="btn-clear">
            🗑️ 清空
          </button>
        </div>
      </div>

      <div className="canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  )
}

export default CanvasBoard
