import { forwardRef, useRef, useEffect, useImperativeHandle, useCallback } from 'react'
import throttle from 'lodash.throttle'
import type { DrawPoint, Particle, FilterConfig, RecordingFrame } from '../types'
import { applyAllFilters } from '../utils/filters'

interface CanvasProps {
  currentColor: string
  brushWidth: number
  filters: FilterConfig
  isPlaying: boolean
}

export interface CanvasRef {
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
}

const RECORDING_DURATION = 30000
const MAX_PARTICLES_PER_PATH = 200
const MIN_PARTICLES_PER_PATH = 50

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ currentColor, brushWidth, filters, isPlaying }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const isDrawingRef = useRef<boolean>(false)
  const pathsRef = useRef<DrawPoint[][]>([])
  const currentPathRef = useRef<DrawPoint[]>([])
  const particlesRef = useRef<Particle[]>([])
  const particleIdRef = useRef<number>(0)
  const lastPointRef = useRef<DrawPoint | null>(null)
  const lastTimeRef = useRef<number>(0)

  const isRecordingRef = useRef<boolean>(false)
  const recordingStartTimeRef = useRef<number>(0)
  const recordingFramesRef = useRef<RecordingFrame[]>([])

  const isPlaybackRef = useRef<boolean>(false)
  const isPausedRef = useRef<boolean>(false)
  const playbackSpeedRef = useRef<number>(1)
  const playbackStartTimeRef = useRef<number>(0)
  const playbackPausedTimeRef = useRef<number>(0)
  const playbackFramesRef = useRef<RecordingFrame[]>([])
  const playbackFrameIndexRef = useRef<number>(0)
  const playbackProgressRef = useRef<number>(0)

  const clearAnimatingRef = useRef<boolean>(false)
  const clearProgressRef = useRef<number>(0)
  const clearCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const flashAnimatingRef = useRef<boolean>(false)
  const flashProgressRef = useRef<number>(0)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const rect = parent.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }, [])

  const createParticlesForPath = useCallback((path: DrawPoint[]) => {
    if (path.length < 2) return

    const totalLength = calculatePathLength(path)
    const particleCount = Math.min(
      MAX_PARTICLES_PER_PATH,
      Math.max(MIN_PARTICLES_PER_PATH, Math.floor(totalLength / 10))
    )

    const color = path[0].color

    for (let i = 0; i < particleCount; i++) {
      const progress = i / particleCount
      particlesRef.current.push({
        id: particleIdRef.current++,
        x: path[0].x,
        y: path[0].y,
        pathIndex: 0,
        progress: progress,
        color: color,
        size: 4 + Math.random() * 4,
        speed: 2 + Math.random() * 3,
        alpha: 0.8,
        trail: []
      })
    }
  }, [])

  const calculatePathLength = (path: DrawPoint[]): number => {
    let length = 0
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x
      const dy = path[i].y - path[i - 1].y
      length += Math.sqrt(dx * dx + dy * dy)
    }
    return length
  }

  const getPointOnPath = useCallback((path: DrawPoint[], progress: number): { x: number; y: number } => {
    if (path.length < 2) return path[0] || { x: 0, y: 0 }

    const totalLength = calculatePathLength(path)
    const targetLength = totalLength * progress

    let currentLength = 0
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x
      const dy = path[i].y - path[i - 1].y
      const segmentLength = Math.sqrt(dx * dx + dy * dy)

      if (currentLength + segmentLength >= targetLength) {
        const t = (targetLength - currentLength) / segmentLength
        return {
          x: path[i - 1].x + dx * t,
          y: path[i - 1].y + dy * t
        }
      }
      currentLength += segmentLength
    }

    return path[path.length - 1]
  }, [])

  const updateParticles = useCallback((deltaTime: number) => {
    const allPaths = [...pathsRef.current, currentPathRef.current].filter(p => p.length > 1)

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const particle = particlesRef.current[i]
      const pathIndex = Math.min(particle.pathIndex, allPaths.length - 1)
      const path = allPaths[pathIndex]

      if (!path) {
        particlesRef.current.splice(i, 1)
        continue
      }

      particle.progress += (particle.speed * deltaTime / 16) / calculatePathLength(path)
      particle.progress = Math.min(particle.progress, 1)

      if (particle.progress >= 1) {
        if (pathIndex < allPaths.length - 1) {
          particle.pathIndex++
          particle.progress = 0
        } else {
          particle.progress = 0
        }
      }

      const pos = getPointOnPath(path, particle.progress)
      particle.trail.unshift({ x: particle.x, y: particle.y, alpha: 0.8 })

      const maxTrailLength = Math.floor(30 * deltaTime / 16)
      if (particle.trail.length > maxTrailLength) {
        particle.trail.length = maxTrailLength
      }

      particle.trail.forEach((point, idx) => {
        point.alpha = 0.8 * (1 - idx / maxTrailLength)
      })

      particle.x = pos.x
      particle.y = pos.y
    }
  }, [getPointOnPath])

  const render = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, width, height)

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const allPaths = [...pathsRef.current, currentPathRef.current]
    for (const path of allPaths) {
      if (path.length < 2) continue

      for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1]
        const curr = path[i]

        ctx.beginPath()
        ctx.strokeStyle = curr.color
        ctx.lineWidth = curr.width
        ctx.globalAlpha = 0.3
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(curr.x, curr.y)
        ctx.stroke()
      }
    }

    ctx.globalAlpha = 1

    for (const particle of particlesRef.current) {
      for (let i = 0; i < particle.trail.length; i++) {
        const point = particle.trail[i]
        ctx.beginPath()
        ctx.fillStyle = particle.color
        ctx.globalAlpha = point.alpha * (1 - i / particle.trail.length) * 0.6
        const size = particle.size * (1 - i / particle.trail.length) * 0.8
        ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.beginPath()
      ctx.fillStyle = particle.color
      ctx.globalAlpha = 0.9
      ctx.shadowColor = particle.color
      ctx.shadowBlur = 15
      ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }

    if (clearAnimatingRef.current) {
      const maxRadius = Math.sqrt(width * width + height * height) / 2
      const currentRadius = clearProgressRef.current * maxRadius

      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(clearCenterRef.current.x, clearCenterRef.current.y, currentRadius, 0, Math.PI * 2)
      ctx.rect(width, 0, -width, height)
      ctx.fill('evenodd')
      ctx.restore()
    }

    if (flashAnimatingRef.current) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashProgressRef.current})`
      ctx.fillRect(0, 0, width, height)
    }
  }, [])

  const animationLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    const deltaTime = lastTimeRef.current ? timestamp - lastTimeRef.current : 16
    lastTimeRef.current = timestamp

    if (isRecordingRef.current) {
      const elapsed = timestamp - recordingStartTimeRef.current
      if (elapsed <= RECORDING_DURATION) {
        recordingFramesRef.current.push({
          timestamp: elapsed,
          points: currentPathRef.current.length > 0
            ? [...currentPathRef.current]
            : [],
          filters: JSON.parse(JSON.stringify(filters))
        })
      } else {
        isRecordingRef.current = false
      }
    }

    if (isPlaybackRef.current && !isPausedRef.current) {
      const playbackElapsed = (timestamp - playbackStartTimeRef.current) * playbackSpeedRef.current

      while (playbackFrameIndexRef.current < playbackFramesRef.current.length - 1) {
        const nextFrame = playbackFramesRef.current[playbackFrameIndexRef.current + 1]
        if (nextFrame.timestamp <= playbackElapsed) {
          playbackFrameIndexRef.current++

          const frame = playbackFramesRef.current[playbackFrameIndexRef.current]
          if (frame.points.length > 0) {
            if (currentPathRef.current.length === 0 ||
                frame.points[0].timestamp !== currentPathRef.current[currentPathRef.current.length - 1].timestamp) {
              if (currentPathRef.current.length > 0) {
                pathsRef.current.push([...currentPathRef.current])
                createParticlesForPath(currentPathRef.current)
              }
              currentPathRef.current = [...frame.points]
            } else {
              currentPathRef.current = [...frame.points]
            }
          }
        } else {
          break
        }
      }

      const totalDuration = playbackFramesRef.current.length > 0
        ? playbackFramesRef.current[playbackFramesRef.current.length - 1].timestamp
        : 1
      playbackProgressRef.current = Math.min(1, playbackElapsed / totalDuration)

      if (playbackFrameIndexRef.current >= playbackFramesRef.current.length - 1) {
        isPlaybackRef.current = false
      }
    }

    if (clearAnimatingRef.current) {
      clearProgressRef.current += deltaTime / 500
      if (clearProgressRef.current >= 1) {
        clearAnimatingRef.current = false
        clearProgressRef.current = 0
        pathsRef.current = []
        currentPathRef.current = []
        particlesRef.current = []
      }
    }

    if (flashAnimatingRef.current) {
      flashProgressRef.current += deltaTime / 300
      if (flashProgressRef.current >= 1) {
        flashAnimatingRef.current = false
        flashProgressRef.current = 0
      }
    }

    if (!isPlaybackRef.current || !isPausedRef.current) {
      updateParticles(deltaTime)
    }

    render(ctx, width, height)
    applyAllFilters(ctx, canvas, filters)

    animationRef.current = requestAnimationFrame(animationLoop)
  }, [filters, updateParticles, render, createParticlesForPath])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaybackRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const timestamp = performance.now()

    isDrawingRef.current = true
    currentPathRef.current = [{
      x,
      y,
      timestamp,
      speed: 0,
      width: brushWidth,
      color: currentColor
    }]
    lastPointRef.current = currentPathRef.current[0]
  }, [brushWidth, currentColor])

  const handleMouseMove = useCallback(throttle((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isPlaybackRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const timestamp = performance.now()

    const lastPoint = lastPointRef.current
    if (!lastPoint) return

    const dx = x - lastPoint.x
    const dy = y - lastPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const timeDiff = timestamp - lastPoint.timestamp
    const speed = timeDiff > 0 ? distance / timeDiff : 0

    const normalizedSpeed = Math.min(1, speed / 3)
    const dynamicWidth = 12 - normalizedSpeed * 9

    const point: DrawPoint = {
      x,
      y,
      timestamp,
      speed,
      width: Math.max(3, Math.min(12, dynamicWidth)),
      color: currentColor
    }

    currentPathRef.current.push(point)
    lastPointRef.current = point
  }, 16), [currentColor])

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current) return

    isDrawingRef.current = false
    if (currentPathRef.current.length > 1) {
      pathsRef.current.push([...currentPathRef.current])
      createParticlesForPath(currentPathRef.current)
    }
    currentPathRef.current = []
    lastPointRef.current = null
  }, [createParticlesForPath])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (isPlaybackRef.current) return

    const touch = e.touches[0]
    const canvas = canvasRef.current
    if (!canvas || !touch) return

    const rect = canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const timestamp = performance.now()

    isDrawingRef.current = true
    currentPathRef.current = [{
      x,
      y,
      timestamp,
      speed: 0,
      width: brushWidth,
      color: currentColor
    }]
    lastPointRef.current = currentPathRef.current[0]
  }, [brushWidth, currentColor])

  const handleTouchMove = useCallback(throttle((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawingRef.current || isPlaybackRef.current) return

    const touch = e.touches[0]
    const canvas = canvasRef.current
    if (!canvas || !touch) return

    const rect = canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const timestamp = performance.now()

    const lastPoint = lastPointRef.current
    if (!lastPoint) return

    const dx = x - lastPoint.x
    const dy = y - lastPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const timeDiff = timestamp - lastPoint.timestamp
    const speed = timeDiff > 0 ? distance / timeDiff : 0

    const normalizedSpeed = Math.min(1, speed / 3)
    const dynamicWidth = 12 - normalizedSpeed * 9

    const point: DrawPoint = {
      x,
      y,
      timestamp,
      speed,
      width: Math.max(3, Math.min(12, dynamicWidth)),
      color: currentColor
    }

    currentPathRef.current.push(point)
    lastPointRef.current = point
  }, 16), [currentColor])

  const handleTouchEnd = useCallback(() => {
    if (!isDrawingRef.current) return

    isDrawingRef.current = false
    if (currentPathRef.current.length > 1) {
      pathsRef.current.push([...currentPathRef.current])
      createParticlesForPath(currentPathRef.current)
    }
    currentPathRef.current = []
    lastPointRef.current = null
  }, [createParticlesForPath])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    animationRef.current = requestAnimationFrame(animationLoop)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [resizeCanvas, animationLoop])

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      clearCenterRef.current = {
        x: rect.width / 2,
        y: rect.height / 2
      }
      clearProgressRef.current = 0
      clearAnimatingRef.current = true
    },

    save: () => {
      flashAnimatingRef.current = true
      flashProgressRef.current = 0

      setTimeout(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const link = document.createElement('a')
        link.download = `light-paint-${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }, 300)
    },

    startRecording: () => {
      isRecordingRef.current = true
      recordingStartTimeRef.current = performance.now()
      recordingFramesRef.current = []
    },

    stopRecording: () => {
      isRecordingRef.current = false
    },

    startPlayback: (speed: number) => {
      if (recordingFramesRef.current.length === 0) return

      pathsRef.current = []
      currentPathRef.current = []
      particlesRef.current = []

      isPlaybackRef.current = true
      isPausedRef.current = false
      playbackSpeedRef.current = speed
      playbackStartTimeRef.current = performance.now()
      playbackPausedTimeRef.current = 0
      playbackFramesRef.current = [...recordingFramesRef.current]
      playbackFrameIndexRef.current = 0
      playbackProgressRef.current = 0
    },

    pausePlayback: () => {
      if (!isPlaybackRef.current || isPausedRef.current) return
      isPausedRef.current = true
      playbackPausedTimeRef.current = performance.now()
    },

    resumePlayback: () => {
      if (!isPlaybackRef.current || !isPausedRef.current) return
      isPausedRef.current = false
      const pauseDuration = performance.now() - playbackPausedTimeRef.current
      playbackStartTimeRef.current += pauseDuration
    },

    stopPlayback: () => {
      isPlaybackRef.current = false
      isPausedRef.current = false
    },

    getRecordingFrames: () => recordingFramesRef.current,

    getPlaybackProgress: () => playbackProgressRef.current
  }), [])

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        display: 'block',
        cursor: isPlaying ? 'default' : 'crosshair',
        touchAction: 'none'
      }}
    />
  )
})

Canvas.displayName = 'Canvas'

export default Canvas
