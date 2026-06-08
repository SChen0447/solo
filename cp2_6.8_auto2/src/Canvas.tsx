import { useRef, useEffect, useState, useCallback } from 'react'
import './Canvas.css'

interface CanvasProps {
  size: number
  pixels: string[][]
  onPixelsChange: (pixels: string[][]) => void
  currentColor: string
  brushSize: number
  showGrid: boolean
  getSymmetricPixels: (x: number, y: number) => [number, number][]
}

function Canvas({
  size,
  pixels,
  onPixelsChange,
  currentColor,
  brushSize,
  showGrid,
  getSymmetricPixels,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  const [lastPixel, setLastPixel] = useState<{ x: number; y: number } | null>(null)
  const [animatingPixel, setAnimatingPixel] = useState<{ x: number; y: number } | null>(null)
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null)
  const lastTouchesRef = useRef<TouchList | null>(null)

  const pixelSize = 20
  const gridLineWidth = showGrid ? 1 : 0
  const totalPixelSize = pixelSize + gridLineWidth
  const canvasPixelSize = size * totalPixelSize + gridLineWidth

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)

    if (showGrid) {
      ctx.fillStyle = '#dddddd'
      ctx.fillRect(0, 0, canvasPixelSize, canvasPixelSize)
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = pixels[y]?.[x]
        if (color && color !== 'transparent') {
          ctx.fillStyle = color
          const px = gridLineWidth + x * totalPixelSize
          const py = gridLineWidth + y * totalPixelSize
          
          if (animatingPixel && animatingPixel.x === x && animatingPixel.y === y) {
            const padding = 1
            ctx.fillRect(px - padding, py - padding, pixelSize + padding * 2, pixelSize + padding * 2)
          } else {
            ctx.fillRect(px, py, pixelSize, pixelSize)
          }
        }
      }
    }

    ctx.restore()
  }, [size, pixels, scale, offset, showGrid, gridLineWidth, totalPixelSize, pixelSize, canvasPixelSize, animatingPixel])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const getPixelCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - offset.x) / scale
    const y = (clientY - rect.top - offset.y) / scale

    const pixelX = Math.floor((x - gridLineWidth) / totalPixelSize)
    const pixelY = Math.floor((y - gridLineWidth) / totalPixelSize)

    if (pixelX >= 0 && pixelX < size && pixelY >= 0 && pixelY < size) {
      return { x: pixelX, y: pixelY }
    }

    return null
  }, [offset, scale, size, gridLineWidth, totalPixelSize])

  const drawPixel = useCallback((x: number, y: number, color: string) => {
    const newPixels = pixels.map(row => [...row])
    
    const halfBrush = Math.floor(brushSize / 2)
    
    for (let dy = -halfBrush; dy <= halfBrush; dy++) {
      for (let dx = -halfBrush; dx <= halfBrush; dx++) {
        const px = x + dx
        const py = y + dy
        
        if (px >= 0 && px < size && py >= 0 && py < size) {
          const symmetricPixels = getSymmetricPixels(px, py)
          symmetricPixels.forEach(([sx, sy]) => {
            if (sx >= 0 && sx < size && sy >= 0 && sy < size) {
              newPixels[sy][sx] = color
            }
          })
        }
      }
    }
    
    setAnimatingPixel({ x, y })
    setTimeout(() => setAnimatingPixel(null), 100)
    
    return newPixels
  }, [pixels, size, brushSize, getSymmetricPixels])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true)
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      }
      return
    }

    const pixel = getPixelCoords(e.clientX, e.clientY)
    if (!pixel) return

    const erase = e.button === 2
    setIsErasing(erase)
    setIsDrawing(true)
    setLastPixel(pixel)

    const newPixels = drawPixel(pixel.x, pixel.y, erase ? 'transparent' : currentColor)
    onPixelsChange(newPixels)
  }, [getPixelCoords, drawPixel, currentColor, onPixelsChange, offset])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      setOffset({
        x: panStartRef.current.offsetX + dx,
        y: panStartRef.current.offsetY + dy,
      })
      return
    }

    if (!isDrawing) return

    const pixel = getPixelCoords(e.clientX, e.clientY)
    if (!pixel) return

    if (lastPixel && (lastPixel.x === pixel.x && lastPixel.y === pixel.y)) {
      return
    }

    setLastPixel(pixel)
    const newPixels = drawPixel(pixel.x, pixel.y, isErasing ? 'transparent' : currentColor)
    onPixelsChange(newPixels)
  }, [isDrawing, isPanning, getPixelCoords, lastPixel, drawPixel, currentColor, isErasing, onPixelsChange])

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false)
    setIsPanning(false)
    setLastPixel(null)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.5, Math.min(5, scale * delta))
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const scaleRatio = newScale / scale
    const newOffsetX = mouseX - (mouseX - offset.x) * scaleRatio
    const newOffsetY = mouseY - (mouseY - offset.y) * scaleRatio
    
    setScale(newScale)
    setOffset({ x: newOffsetX, y: newOffsetY })
  }, [scale, offset])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const getTouchDistance = (touches: TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      pinchStartRef.current = {
        distance: getTouchDistance(e.touches),
        scale: scale,
      }
      lastTouchesRef.current = e.touches
      return
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const pixel = getPixelCoords(touch.clientX, touch.clientY)
      if (pixel) {
        setIsDrawing(true)
        setLastPixel(pixel)
        const newPixels = drawPixel(pixel.x, pixel.y, currentColor)
        onPixelsChange(newPixels)
      }
    }
  }, [getPixelCoords, drawPixel, currentColor, onPixelsChange, scale])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()

    if (e.touches.length === 2 && pinchStartRef.current) {
      const distance = getTouchDistance(e.touches)
      const scaleRatio = distance / pinchStartRef.current.distance
      const newScale = Math.max(0.5, Math.min(5, pinchStartRef.current.scale * scaleRatio))
      setScale(newScale)
      return
    }

    if (e.touches.length === 1 && isDrawing) {
      const touch = e.touches[0]
      const pixel = getPixelCoords(touch.clientX, touch.clientY)
      if (pixel && (!lastPixel || lastPixel.x !== pixel.x || lastPixel.y !== pixel.y)) {
        setLastPixel(pixel)
        const newPixels = drawPixel(pixel.x, pixel.y, currentColor)
        onPixelsChange(newPixels)
      }
    }
  }, [isDrawing, getPixelCoords, lastPixel, drawPixel, currentColor, onPixelsChange])

  const handleTouchEnd = useCallback(() => {
    setIsDrawing(false)
    setLastPixel(null)
    pinchStartRef.current = null
    lastTouchesRef.current = null
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      const containerRect = container.getBoundingClientRect()
      canvas.width = containerRect.width
      canvas.height = containerRect.height

      const minDim = Math.min(containerRect.width, containerRect.height)
      const newScale = (minDim * 0.8) / canvasPixelSize
      setScale(newScale)
      setOffset({
        x: (containerRect.width - canvasPixelSize * newScale) / 2,
        y: (containerRect.height - canvasPixelSize * newScale) / 2,
      })
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [canvasPixelSize])

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="pixel-canvas"
      />
      <div className="canvas-info">
        <span>缩放: {(scale * 100).toFixed(0)}%</span>
        <span className="divider">|</span>
        <span>尺寸: {size}x{size}</span>
      </div>
    </div>
  )
}

export default Canvas
