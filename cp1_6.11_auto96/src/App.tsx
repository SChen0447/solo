import { useState, useRef, useCallback, useEffect } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import type { FilterConfig, DrawPoint, RecordingFrame } from './types'
import { NEON_COLORS } from './types'

const defaultFilters: FilterConfig = {
  blur: { enabled: false, radius: 5 },
  glow: { enabled: false, intensity: 0.5 },
  mosaic: { enabled: false, blockSize: 8 },
  pixelate: { enabled: false, levels: 32 },
  neonEdge: { enabled: false }
}

export default function App() {
  const [currentColor, setCurrentColor] = useState<string>(NEON_COLORS[0])
  const [brushWidth, setBrushWidth] = useState<number>(6)
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768)
  const [recordingTime, setRecordingTime] = useState<number>(0)
  const [playbackProgress, setPlaybackProgress] = useState<number>(0)

  const canvasRef = useRef<{
    clear: () => void
    save: () => void
    startRecording: () => void
    stopRecording: () => void
    startPlayback: (speed: number) => void
    pausePlayback: () => void
    resumePlayback: () => void
    stopPlayback: () => void
    getRecordingFrames: () => RecordingFrame[]
    getPlaybackProgress: () => number
  } | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setRecordingTime(prev => Math.min(prev + 0.1, 30))
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isRecording])

  useEffect(() => {
    if (isPlaying && !isPaused) {
      const interval = setInterval(() => {
        if (canvasRef.current) {
          setPlaybackProgress(canvasRef.current.getPlaybackProgress())
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isPlaying, isPaused])

  const handleSetColor = useCallback((color: string) => {
    setCurrentColor(color)
  }, [])

  const handleSetWidth = useCallback((width: number) => {
    setBrushWidth(width)
  }, [])

  const handleToggleFilter = useCallback((filter: keyof FilterConfig) => {
    setFilters(prev => ({
      ...prev,
      [filter]: {
        ...prev[filter],
        enabled: !prev[filter].enabled
      }
    }))
  }, [])

  const handleUpdateFilter = useCallback((filter: keyof FilterConfig, key: string, value: number) => {
    setFilters(prev => ({
      ...prev,
      [filter]: {
        ...prev[filter],
        [key]: value
      }
    }))
  }, [])

  const handleClear = useCallback(() => {
    canvasRef.current?.clear()
  }, [])

  const handleSave = useCallback(() => {
    canvasRef.current?.save()
  }, [])

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      canvasRef.current?.stopRecording()
      setIsRecording(false)
    } else {
      canvasRef.current?.startRecording()
      setIsRecording(true)
      setRecordingTime(0)
    }
  }, [isRecording])

  const handleStartPlayback = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
    canvasRef.current?.startPlayback(speed)
    setIsPlaying(true)
    setIsPaused(false)
    setPlaybackProgress(0)
  }, [])

  const handleTogglePause = useCallback(() => {
    if (isPaused) {
      canvasRef.current?.resumePlayback()
      setIsPaused(false)
    } else {
      canvasRef.current?.pausePlayback()
      setIsPaused(true)
    }
  }, [isPaused])

  const handleStopPlayback = useCallback(() => {
    canvasRef.current?.stopPlayback()
    setIsPlaying(false)
    setIsPaused(false)
    setPlaybackProgress(0)
  }, [])

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0d1117',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      overflow: 'hidden'
    }}>
      <Canvas
        ref={canvasRef}
        currentColor={currentColor}
        brushWidth={brushWidth}
        filters={filters}
        isPlaying={isPlaying}
      />
      <Toolbar
        isMobile={isMobile}
        currentColor={currentColor}
        brushWidth={brushWidth}
        filters={filters}
        isRecording={isRecording}
        recordingTime={recordingTime}
        isPlaying={isPlaying}
        isPaused={isPaused}
        playbackSpeed={playbackSpeed}
        playbackProgress={playbackProgress}
        onSetColor={handleSetColor}
        onSetWidth={handleSetWidth}
        onToggleFilter={handleToggleFilter}
        onUpdateFilter={handleUpdateFilter}
        onClear={handleClear}
        onSave={handleSave}
        onToggleRecording={handleToggleRecording}
        onStartPlayback={handleStartPlayback}
        onTogglePause={handleTogglePause}
        onStopPlayback={handleStopPlayback}
      />
    </div>
  )
}
