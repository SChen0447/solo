import { useEffect, useRef, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { ParticleSystem } from './particles'
import { Renderer, type LightSource } from './renderer'
import { ControlPanel, type ControlValues } from './controls'

const DEFAULT_WIND_SPEED = 8
const DEFAULT_CONCENTRATION = 0.6

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particleSystemRef = useRef<ParticleSystem | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const animationRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const isDraggingRef = useRef(false)
  const [theme, setTheme] = useState<'warm' | 'cool'>('warm')

  const [controlValues, setControlValues] = useState<ControlValues>({
    windSpeed: DEFAULT_WIND_SPEED,
    concentration: DEFAULT_CONCENTRATION
  })

  const getCanvasSize = useCallback(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    }
  }, [])

  const getDefaultLightPosition = useCallback((w: number, h: number): LightSource => ({
    x: w * 0.85,
    y: h * 0.15,
    isDragging: false,
    glowOpacity: 0
  }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { width, height } = getCanvasSize()

    const particleSystem = new ParticleSystem({
      windSpeed: DEFAULT_WIND_SPEED,
      concentration: DEFAULT_CONCENTRATION,
      canvasWidth: width,
      canvasHeight: height
    })
    particleSystemRef.current = particleSystem

    const renderer = new Renderer(canvas, {
      lightSource: getDefaultLightPosition(width, height),
      windSpeed: DEFAULT_WIND_SPEED,
      concentration: DEFAULT_CONCENTRATION,
      canvasWidth: width,
      canvasHeight: height
    })
    rendererRef.current = renderer

    const animate = (time: number) => {
      const deltaTime = lastTimeRef.current ? time - lastTimeRef.current : 16.67
      lastTimeRef.current = time

      if (particleSystemRef.current && rendererRef.current) {
        particleSystemRef.current.update(deltaTime)
        rendererRef.current.updateGlow(deltaTime)
        rendererRef.current.render(particleSystemRef.current.getParticles(), deltaTime)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    const handleResize = () => {
      const { width: newWidth, height: newHeight } = getCanvasSize()
      if (particleSystemRef.current) {
        particleSystemRef.current.resize(newWidth, newHeight)
      }
      if (rendererRef.current) {
        rendererRef.current.resize(newWidth, newHeight)
        const light = rendererRef.current.getLightSource()
        const clampedX = Math.min(Math.max(light.x, 0), newWidth)
        const clampedY = Math.min(Math.max(light.y, 0), newHeight)
        if (clampedX !== light.x || clampedY !== light.y) {
          rendererRef.current.setLightSource({ x: clampedX, y: clampedY })
        }
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [getCanvasSize, getDefaultLightPosition])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !rendererRef.current) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const light = rendererRef.current.getLightSource()
    const dx = x - light.x
    const dy = y - light.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 60) {
      isDraggingRef.current = true
      rendererRef.current.setLightSource({ isDragging: true })
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !rendererRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left))
    const y = Math.max(0, Math.min(canvas.height, e.clientY - rect.top))

    rendererRef.current.setLightSource({ x, y })
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current || !rendererRef.current) return
    isDraggingRef.current = false
    rendererRef.current.setLightSource({ isDragging: false })
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (!isDraggingRef.current || !rendererRef.current) return
    isDraggingRef.current = false
    rendererRef.current.setLightSource({ isDragging: false })
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !rendererRef.current) return

    const touch = e.touches[0]
    const rect = canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    const light = rendererRef.current.getLightSource()
    const dx = x - light.x
    const dy = y - light.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 80) {
      isDraggingRef.current = true
      rendererRef.current.setLightSource({ isDragging: true })
      e.preventDefault()
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !rendererRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const touch = e.touches[0]
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(canvas.width, touch.clientX - rect.left))
    const y = Math.max(0, Math.min(canvas.height, touch.clientY - rect.top))

    rendererRef.current.setLightSource({ x, y })
    e.preventDefault()
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current || !rendererRef.current) return
    isDraggingRef.current = false
    rendererRef.current.setLightSource({ isDragging: false })
  }, [])

  const handleControlChange = useCallback((values: ControlValues) => {
    setControlValues(values)
    if (particleSystemRef.current) {
      particleSystemRef.current.setWindSpeed(values.windSpeed)
      particleSystemRef.current.setConcentration(values.concentration)
    }
    if (rendererRef.current) {
      rendererRef.current.setWindSpeed(values.windSpeed)
      rendererRef.current.setConcentration(values.concentration)
    }
  }, [])

  const handleReset = useCallback(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setWindSpeed(DEFAULT_WIND_SPEED)
      particleSystemRef.current.setConcentration(DEFAULT_CONCENTRATION)
      particleSystemRef.current.reset()
    }
    if (rendererRef.current) {
      const { width, height } = getCanvasSize()
      rendererRef.current.setWindSpeed(DEFAULT_WIND_SPEED)
      rendererRef.current.setConcentration(DEFAULT_CONCENTRATION)
      rendererRef.current.setLightSource(getDefaultLightPosition(width, height))
    }
    setControlValues({
      windSpeed: DEFAULT_WIND_SPEED,
      concentration: DEFAULT_CONCENTRATION
    })
  }, [getCanvasSize, getDefaultLightPosition])

  const handleThemeToggle = useCallback(() => {
    setTheme(prev => prev === 'warm' ? 'cool' : 'warm')
  }, [])

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: isDraggingRef.current ? 'grabbing' : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <ControlPanel
        initialValues={controlValues}
        onChange={handleControlChange}
        onReset={handleReset}
        onThemeToggle={handleThemeToggle}
        theme={theme}
      />
    </div>
  )
}

const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(<App />)
}
