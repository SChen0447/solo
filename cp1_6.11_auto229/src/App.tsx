import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Toolbar from './components/Toolbar'
import InkCanvas, { type InkCanvasHandle } from './components/InkCanvas'
import type { ToolType, Stroke } from './utils/inkEngine'
import { strokesToSVG, downloadSVG } from './utils/svgExporter'

const MAX_HISTORY = 50
const TOOL_LABELS: Record<ToolType, string> = {
  brush: '毛笔',
  pen: '钢笔',
  dropper: '滴管',
}

const SealDecoration = () => {
  const [position, setPosition] = useState<'left' | 'right'>('right')
  const [rotation, setRotation] = useState(5)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleClick = () => {
    setPosition(prev => prev === 'left' ? 'right' : 'left')
    setRotation(Math.floor(Math.random() * 31) - 15)
  }

  const size = isMobile ? 56 : 72

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        position: 'fixed',
        top: 90,
        [position]: isMobile ? 12 : 32,
        zIndex: 50,
        cursor: 'pointer',
        opacity: 0.85,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="4"
          y="4"
          width="72"
          height="72"
          rx="3"
          fill="none"
          stroke="#c0392b"
          strokeWidth="4"
        />
        <rect
          x="8"
          y="8"
          width="64"
          height="64"
          rx="2"
          fill="none"
          stroke="#c0392b"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <text
          x="40"
          y="56"
          textAnchor="middle"
          fontSize="44"
          fontFamily="'STKaiti', 'KaiTi', '楷体', serif"
          fontWeight="bold"
          fill="#c0392b"
          style={{ letterSpacing: -2 }}
        >
          靈
        </text>
      </svg>
    </motion.div>
  )
}

const StatusBar = ({
  currentTool,
  coords,
  pointCount,
}: {
  currentTool: ToolType
  coords: { x: number; y: number }
  pointCount: number
}) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'space-around' : 'space-between',
        padding: isMobile ? '0 8px' : '0 24px',
        backgroundColor: 'rgba(74, 59, 50, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: '#f5f0e0',
        fontSize: isMobile ? 11 : 13,
        zIndex: 100,
      }}
    >
      <span style={{
        transform: isMobile ? 'scale(0.9)' : undefined,
        transformOrigin: 'left center',
      }}>
        工具：{TOOL_LABELS[currentTool]}
      </span>
      <span>
        X:{coords.x}, Y:{coords.y}
      </span>
      <span>
        点数：{pointCount}
      </span>
    </motion.div>
  )
}

const App = () => {
  const [currentTool, setCurrentTool] = useState<ToolType>('brush')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [history, setHistory] = useState<Stroke[][]>([])
  const [redoStack, setRedoStack] = useState<Stroke[][]>([])
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [pointCount, setPointCount] = useState(0)
  const canvasRef = useRef<InkCanvasHandle>(null)

  const handleStrokesChange = useCallback((newStrokes: Stroke[]) => {
    setHistory(prev => {
      const next = [...prev, strokes]
      if (next.length > MAX_HISTORY) {
        next.shift()
      }
      return next
    })
    setRedoStack([])
    setStrokes(newStrokes)
  }, [strokes])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const prevStrokes = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, strokes])
    setStrokes(prevStrokes)
    const count = prevStrokes.reduce((s, st) => s + st.points.length, 0)
    setPointCount(count)
  }, [history, strokes])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const nextStrokes = redoStack[redoStack.length - 1]
    setRedoStack(prev => prev.slice(0, -1))
    setHistory(prev => [...prev, strokes])
    setStrokes(nextStrokes)
    const count = nextStrokes.reduce((s, st) => s + st.points.length, 0)
    setPointCount(count)
  }, [redoStack, strokes])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey
      if (!isCtrl) return
      if (e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
      } else if (e.key.toLowerCase() === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

  const handleExportSVG = useCallback(() => {
    const size = canvasRef.current?.getCanvasSize() ?? { width: 800, height: 600 }
    const svg = strokesToSVG(strokes, size.width, size.height)
    downloadSVG(svg)
  }, [strokes])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f5f0e0 0%, #e8dcc8 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Toolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        onExportSVG={handleExportSVG}
      />

      <AnimatePresence>
        <SealDecoration />
      </AnimatePresence>

      <InkCanvas
        ref={canvasRef}
        currentTool={currentTool}
        strokes={strokes}
        onStrokesChange={handleStrokesChange}
        onPointCountChange={setPointCount}
        onCoordsChange={(x, y) => setCoords({ x, y })}
      />

      <StatusBar
        currentTool={currentTool}
        coords={coords}
        pointCount={pointCount}
      />
    </div>
  )
}

export default App
