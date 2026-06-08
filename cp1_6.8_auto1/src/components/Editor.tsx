import React, { useState, useCallback, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
import type {
  PixelGrid,
  ToolType,
  GridSize,
  ZoomLevel,
  RotationAngle,
  ThemeId,
  HistoryRecord
} from '@/types'
import {
  createEmptyGrid,
  imageDataToPixelGrid,
  extractPalette,
  generateThemedPalette,
  cloneGrid,
  gridToDataURL,
  loadImageFile,
  getImageData
} from '@/utils/pixelProcessor'

const THEME_COLORS: Record<ThemeId, string[]> = {
  retro: ['#e94560', '#0f3460', '#ff6b6b', '#1a1a2e', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9a3c'],
  cyber: ['#a855f7', '#22d3ee', '#ec4899', '#1e1b4b', '#818cf8', '#34d399', '#fbbf24', '#f472b6'],
  classic: ['#ffffff', '#333333', '#666666', '#999999', '#cccccc', '#111111', '#e0e0e0', '#777777']
}

export interface EditorHandle {
  setTool: (tool: ToolType) => void
  getTool: () => ToolType
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  triggerUpload: () => void
  exportPNG: () => void
  rotate: () => void
  saveToHistory: () => void
  hasImage: () => boolean
}

interface EditorProps {
  theme: ThemeId
  onSaveToHistory: (record: HistoryRecord) => void
  savedGrid?: PixelGrid | null
  savedPalette?: string[] | null
}

const MAX_HISTORY_STEPS = 20
const PIXEL_SIZE_BASE = 14

const UploadAreaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
)

const BrushIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.06 11.9l8.07-8.06 2.83 2.83-8.07 8.07-3.54.7-2.12-2.12.83-3.54z"/>
    <path d="M7 17L3 21l4-4"/>
  </svg>
)

const EraserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H9L3 14a2 2 0 010-3l9-9a2 2 0 013 0l6 6a2 2 0 010 3l-7 7"/>
    <path d="M18 13.3L7.7 3"/>
  </svg>
)

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"/>
    <path d="M21 17a9 9 0 00-9-9 9 9 0 00-9 9"/>
  </svg>
)

const RedoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6"/>
    <path d="M3 17a9 9 0 019-9 9 9 0 019 9"/>
  </svg>
)

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const RotateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
)

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { theme, onSaveToHistory, savedGrid, savedPalette },
  ref
) {
  const [grid, setGrid] = useState<PixelGrid>(() => createEmptyGrid(16, 16))
  const [tool, setTool] = useState<ToolType>('brush')
  const [gridSize, setGridSize] = useState<GridSize>(16)
  const [zoom, setZoom] = useState<ZoomLevel>(2)
  const [rotation, setRotation] = useState<RotationAngle>(0)
  const [selectedColor, setSelectedColor] = useState<string>('#e94560')
  const [palette, setPalette] = useState<string[]>(THEME_COLORS.retro)
  const [historyStack, setHistoryStack] = useState<PixelGrid[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [animatingPixel, setAnimatingPixel] = useState<{ x: number; y: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasImage, setHasImage] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const toolRef = useRef(tool)
  const historyIndexRef = useRef(historyIndex)
  const historyStackRef = useRef(historyStack)
  const hasImageRef = useRef(hasImage)
  const gridRef = useRef(grid)
  const paletteRef = useRef(palette)

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { historyIndexRef.current = historyIndex }, [historyIndex])
  useEffect(() => { historyStackRef.current = historyStack }, [historyStack])
  useEffect(() => { hasImageRef.current = hasImage }, [hasImage])
  useEffect(() => { gridRef.current = grid }, [grid])
  useEffect(() => { paletteRef.current = palette }, [palette])

  useImperativeHandle(ref, () => ({
    setTool: (t: ToolType) => setTool(t),
    getTool: () => toolRef.current,
    undo: () => {
      if (historyIndexRef.current > 0) {
        const newIndex = historyIndexRef.current - 1
        setHistoryIndex(newIndex)
        setGrid(cloneGrid(historyStackRef.current[newIndex]))
      }
    },
    redo: () => {
      if (historyIndexRef.current < historyStackRef.current.length - 1) {
        const newIndex = historyIndexRef.current + 1
        setHistoryIndex(newIndex)
        setGrid(cloneGrid(historyStackRef.current[newIndex]))
      }
    },
    canUndo: () => historyIndexRef.current > 0,
    canRedo: () => historyIndexRef.current < historyStackRef.current.length - 1,
    triggerUpload: () => fileInputRef.current?.click(),
    exportPNG: () => {
      const dataUrl = gridToDataURL(gridRef.current, 16)
      const link = document.createElement('a')
      link.download = `pixel-avatar-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    },
    rotate: () => {
      setRotation(prev => ((prev + 90) % 360) as RotationAngle)
    },
    saveToHistory: () => {
      const thumbnail = gridToDataURL(gridRef.current, 4)
      const themeNames: Record<ThemeId, string> = {
        retro: '复古红蓝',
        cyber: '赛博紫绿',
        classic: '经典黑白'
      }
      const record: HistoryRecord = {
        id: Date.now().toString(),
        thumbnail,
        timestamp: Date.now(),
        themeName: themeNames[theme],
        grid: cloneGrid(gridRef.current),
        palette: [...paletteRef.current]
      }
      onSaveToHistory(record)
    },
    hasImage: () => hasImageRef.current
  }), [theme, onSaveToHistory])

  useEffect(() => {
    const themeColors = THEME_COLORS[theme]
    const basePalette = savedPalette && savedPalette.length > 0 ? savedPalette : palette
    const newPalette = generateThemedPalette(basePalette, themeColors)
    setPalette(newPalette)
    if (!selectedColor || !newPalette.includes(selectedColor)) {
      setSelectedColor(newPalette[0])
    }
  }, [theme])

  useEffect(() => {
    if (savedGrid) {
      setGrid(savedGrid)
      setHasImage(true)
      setHistoryStack([cloneGrid(savedGrid)])
      setHistoryIndex(0)
    }
    if (savedPalette && savedPalette.length > 0) {
      setPalette(savedPalette)
      setSelectedColor(savedPalette[0])
    }
  }, [savedGrid, savedPalette])

  const pushToHistory = useCallback((newGrid: PixelGrid) => {
    setHistoryStack(prev => {
      const newStack = prev.slice(0, historyIndex + 1)
      newStack.push(cloneGrid(newGrid))
      if (newStack.length > MAX_HISTORY_STEPS) {
        newStack.shift()
        return newStack
      }
      return newStack
    })
    setHistoryIndex(prev => {
      const next = Math.min(prev + 1, MAX_HISTORY_STEPS - 1)
      return next
    })
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setGrid(cloneGrid(historyStack[newIndex]))
    }
  }, [historyIndex, historyStack])

  const redo = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setGrid(cloneGrid(historyStack[newIndex]))
    }
  }, [historyIndex, historyStack])

  const handlePixelClick = useCallback((x: number, y: number) => {
    const newGrid = cloneGrid(grid)

    if (tool === 'brush') {
      newGrid.pixels[y][x] = selectedColor
    } else {
      newGrid.pixels[y][x] = null
    }

    setGrid(newGrid)
    pushToHistory(newGrid)
    setAnimatingPixel({ x, y })
    setTimeout(() => setAnimatingPixel(null), 200)
  }, [grid, tool, selectedColor, pushToHistory])

  const handlePixelDrag = useCallback((x: number, y: number) => {
    if (!isDrawing) return

    const currentColor = grid.pixels[y][x]
    const targetColor = tool === 'brush' ? selectedColor : null

    if (currentColor === targetColor) return

    const newGrid = cloneGrid(grid)
    newGrid.pixels[y][x] = targetColor
    setGrid(newGrid)
  }, [grid, isDrawing, tool, selectedColor])

  const handleMouseDown = useCallback((x: number, y: number) => {
    setIsDrawing(true)
    handlePixelClick(x, y)
  }, [handlePixelClick])

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      pushToHistory(grid)
    }
    setIsDrawing(false)
  }, [isDrawing, grid, pushToHistory])

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDrawing(false)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchend', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchend', handleGlobalMouseUp)
    }
  }, [])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const img = await loadImageFile(file)
      const imageData = getImageData(img, 256)
      const pixelGrid = imageDataToPixelGrid(imageData, gridSize)
      const extractedPalette = extractPalette(pixelGrid, 8)
      const themedPalette = generateThemedPalette(extractedPalette, THEME_COLORS[theme])

      setGrid(pixelGrid)
      setPalette(themedPalette)
      setSelectedColor(themedPalette[0])
      setHasImage(true)
      setHistoryStack([cloneGrid(pixelGrid)])
      setHistoryIndex(0)
    } catch (err) {
      console.error('Failed to load image:', err)
    }

    e.target.value = ''
  }, [gridSize, theme])

  const handleGridSizeChange = useCallback((size: GridSize) => {
    if (size === gridSize) return
    const newGrid = createEmptyGrid(size, size)
    setGrid(newGrid)
    setGridSize(size)
    setHistoryStack([])
    setHistoryIndex(-1)
    setHasImage(false)
  }, [gridSize])

  const pixelSize = useMemo(() => PIXEL_SIZE_BASE * zoom, [zoom])

  const gridStyle = useMemo(() => ({
    gridTemplateColumns: `repeat(${grid.width}, ${pixelSize}px)`,
    gridTemplateRows: `repeat(${grid.height}, ${pixelSize}px)`,
    transform: `rotate(${rotation}deg)`,
    imageRendering: 'pixelated' as const
  }), [grid.width, grid.height, pixelSize, rotation])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < historyStack.length - 1

  return (
    <div className="editor-container">
      <div className="editor-header">
        <h1 className="editor-title">像素头像生成器</h1>
        <div className="grid-size-selector">
          <button
            className={`grid-size-btn ${gridSize === 16 ? 'active' : ''}`}
            onClick={() => handleGridSizeChange(16)}
          >
            16×16
          </button>
          <button
            className={`grid-size-btn ${gridSize === 32 ? 'active' : ''}`}
            onClick={() => handleGridSizeChange(32)}
          >
            32×32
          </button>
        </div>
      </div>

      <div className="pixel-canvas-wrapper">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          onChange={handleFileUpload}
        />
        {!hasImage ? (
          <label
            className="upload-area"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadAreaIcon />
            <div className="upload-text">点击上传图片<br />或拖拽到此处</div>
            <div className="upload-hint">支持 JPG / PNG 格式</div>
          </label>
        ) : (
          <div
            className="pixel-grid"
            style={gridStyle}
            onMouseLeave={handleMouseUp}
          >
            {grid.pixels.map((row, y) =>
              row.map((color, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`pixel-cell ${color ? 'filled' : ''} ${animatingPixel?.x === x && animatingPixel?.y === y ? 'pop-animation' : ''}`}
                  style={{ backgroundColor: color || 'transparent' }}
                  onMouseDown={(e) => { e.preventDefault(); handleMouseDown(x, y) }}
                  onMouseEnter={() => handlePixelDrag(x, y)}
                  onTouchStart={(e) => { e.preventDefault(); handleMouseDown(x, y) }}
                  onTouchMove={(e) => {
                    e.preventDefault()
                    const touch = e.touches[0]
                    const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
                    if (element && element.classList.contains('pixel-cell') && element.parentElement) {
                      const idx = Array.from(element.parentElement.children).indexOf(element)
                      if (idx >= 0) {
                        const px = idx % grid.width
                        const py = Math.floor(idx / grid.width)
                        handlePixelDrag(px, py)
                      }
                    }
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div className="controls-row">
        <button
          className={`control-button ${tool === 'brush' ? 'primary' : ''}`}
          onClick={() => setTool('brush')}
        >
          <BrushIcon />
          画笔
        </button>
        <button
          className={`control-button ${tool === 'eraser' ? 'primary' : ''}`}
          onClick={() => setTool('eraser')}
        >
          <EraserIcon />
          橡皮擦
        </button>
        <button className="control-button" onClick={undo} disabled={!canUndo}>
          <UndoIcon />
          撤销
        </button>
        <button className="control-button" onClick={redo} disabled={!canRedo}>
          <RedoIcon />
          重做
        </button>
      </div>

      <div className="controls-row">
        <button className="control-button" onClick={() => fileInputRef.current?.click()}>
          <UploadIcon />
          上传图片
        </button>
        <button className="control-button primary" onClick={() => {
          const dataUrl = gridToDataURL(grid, 16)
          const link = document.createElement('a')
          link.download = `pixel-avatar-${Date.now()}.png`
          link.href = dataUrl
          link.click()
        }} disabled={!hasImage}>
          <DownloadIcon />
          导出PNG
        </button>
        <button className="control-button" onClick={() => setRotation(prev => ((prev + 90) % 360) as RotationAngle)}>
          <RotateIcon />
          旋转
        </button>
        <button className="control-button" onClick={() => {
          const thumbnail = gridToDataURL(grid, 4)
          const themeNames: Record<ThemeId, string> = {
            retro: '复古红蓝',
            cyber: '赛博紫绿',
            classic: '经典黑白'
          }
          const record: HistoryRecord = {
            id: Date.now().toString(),
            thumbnail,
            timestamp: Date.now(),
            themeName: themeNames[theme],
            grid: cloneGrid(grid),
            palette: [...palette]
          }
          onSaveToHistory(record)
        }} disabled={!hasImage}>
          <SaveIcon />
          保存
        </button>
      </div>

      <div className="controls-row">
        <div className="zoom-controls">
          {([1, 2, 4] as ZoomLevel[]).map(z => (
            <button
              key={z}
              className={`zoom-btn ${zoom === z ? 'active' : ''}`}
              onClick={() => setZoom(z)}
            >
              {z}x
            </button>
          ))}
        </div>
      </div>

      {hasImage && (
        <div className="palette-container">
          {palette.map((color, index) => (
            <button
              key={`${color}-${index}`}
              className={`palette-color ${selectedColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  )
})
