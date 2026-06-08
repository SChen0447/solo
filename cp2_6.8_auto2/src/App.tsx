import { useState, useCallback, useEffect } from 'react'
import Canvas from './Canvas'
import Toolbar from './Toolbar'
import './App.css'

export type SymmetryMode = 'none' | 'horizontal' | 'vertical' | 'center'

export interface HistoryState {
  pixels: string[][]
}

const DEFAULT_COLORS = [
  '#e94560',
  '#ff6b35',
  '#f7c948',
  '#4ecb71',
  '#00a8e8',
  '#7b2cbf',
  '#8b4513',
  '#808080',
  '#ffffff',
  '#000000',
  '#ff9ff3',
  '#54a0ff',
  '#5f27cd',
  '#00d2d3',
  '#ff9f43',
  '#10ac84',
]

function createEmptyPixels(size: number): string[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 'transparent')
  )
}

function App() {
  const [canvasSize, setCanvasSize] = useState(32)
  const [currentColor, setCurrentColor] = useState('#e94560')
  const [brushSize, setBrushSize] = useState(1)
  const [pixels, setPixels] = useState<string[][]>(() => createEmptyPixels(32))
  const [history, setHistory] = useState<HistoryState[]>(() => [
    { pixels: createEmptyPixels(32).map(row => [...row]) }
  ])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [symmetryMode, setSymmetryMode] = useState<SymmetryMode>('none')
  const [showGrid, setShowGrid] = useState(true)

  const saveToHistory = useCallback((newPixels: string[][]) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyIndex + 1)
      newHistory.push({ pixels: newPixels.map(row => [...row]) })
      if (newHistory.length > 50) {
        newHistory.shift()
      }
      return newHistory
    })
    setHistoryIndex(prevIndex => {
      const newIndex = Math.min(prevIndex + 1, 49)
      return newIndex
    })
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setPixels(history[newIndex].pixels.map(row => [...row]))
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setPixels(history[newIndex].pixels.map(row => [...row]))
    }
  }, [history, historyIndex])

  const clearCanvas = useCallback(() => {
    const empty = createEmptyPixels(canvasSize)
    setPixels(empty)
    saveToHistory(empty)
  }, [canvasSize, saveToHistory])

  const handleCanvasSizeChange = useCallback((size: number) => {
    setCanvasSize(size)
    const newPixels = createEmptyPixels(size)
    setPixels(newPixels)
    setHistory([{ pixels: newPixels.map(row => [...row]) }])
    setHistoryIndex(0)
  }, [])

  const handlePixelsChange = useCallback((newPixels: string[][]) => {
    setPixels(newPixels)
    saveToHistory(newPixels)
  }, [saveToHistory])

  const getSymmetricPixels = useCallback((x: number, y: number): [number, number][] => {
    const result: [number, number][] = [[x, y]]

    switch (symmetryMode) {
      case 'horizontal':
        result.push([canvasSize - 1 - x, y])
        break
      case 'vertical':
        result.push([x, canvasSize - 1 - y])
        break
      case 'center':
        result.push([canvasSize - 1 - x, y])
        result.push([x, canvasSize - 1 - y])
        result.push([canvasSize - 1 - x, canvasSize - 1 - y])
        break
    }

    return result.filter(([sx, sy]) => sx >= 0 && sx < canvasSize && sy >= 0 && sy < canvasSize)
  }, [canvasSize, symmetryMode])

  const exportPNG = useCallback(() => {
    const exportCanvas = document.createElement('canvas')
    const pixelSize = 16
    const gridLineWidth = showGrid ? 1 : 0
    const totalSize = canvasSize * pixelSize + (canvasSize + 1) * gridLineWidth
    
    exportCanvas.width = totalSize
    exportCanvas.height = totalSize
    
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    if (showGrid) {
      ctx.fillStyle = '#dddddd'
      ctx.fillRect(0, 0, totalSize, totalSize)
    } else {
      ctx.clearRect(0, 0, totalSize, totalSize)
    }

    for (let y = 0; y < canvasSize; y++) {
      for (let x = 0; x < canvasSize; x++) {
        const color = pixels[y][x]
        if (color !== 'transparent') {
          ctx.fillStyle = color
          const px = gridLineWidth + x * (pixelSize + gridLineWidth)
          const py = gridLineWidth + y * (pixelSize + gridLineWidth)
          ctx.fillRect(px, py, pixelSize, pixelSize)
        }
      }
    }

    const link = document.createElement('a')
    link.download = 'pixel-art.png'
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }, [canvasSize, pixels, showGrid])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <div className="app">
      <Toolbar
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        canvasSize={canvasSize}
        setCanvasSize={handleCanvasSizeChange}
        onUndo={undo}
        onRedo={redo}
        onClear={clearCanvas}
        onExport={exportPNG}
        symmetryMode={symmetryMode}
        setSymmetryMode={setSymmetryMode}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        defaultColors={DEFAULT_COLORS}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />
      <div className="main-content">
        <div className="canvas-container">
          <Canvas
            size={canvasSize}
            pixels={pixels}
            onPixelsChange={handlePixelsChange}
            currentColor={currentColor}
            brushSize={brushSize}
            showGrid={showGrid}
            getSymmetricPixels={getSymmetricPixels}
          />
        </div>
      </div>
    </div>
  )
}

export default App
