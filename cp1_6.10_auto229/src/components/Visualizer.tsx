import React, { useRef, useEffect, useCallback } from 'react'

export interface VisualConfig {
  lineCount: number
  rhythmPeriod: number
  baseEmotion: number
  colors: {
    start: string
    end: string
  }
}

interface VisualizerProps {
  isPlaying: boolean
  emotionValue: number
  visualConfig: VisualConfig
  rhythmSignal: number
}

interface LineElement {
  x1: number
  y1: number
  x2: number
  y2: number
  targetX1: number
  targetY1: number
  targetX2: number
  targetY2: number
  length: number
  rotation: number
  targetRotation: number
  scale: number
  targetScale: number
  alpha: number
  color: string
}

interface DotElement {
  x: number
  y: number
  targetX: number
  targetY: number
  radius: number
  baseRadius: number
  alpha: number
  color: string
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 255, b: 255 }
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function getEmotionColors(emotion: number): { start: string; end: string } {
  if (emotion >= 0.5) {
    const t = (emotion - 0.5) * 2
    return {
      start: lerpColor('#7effb3', '#facc15', t),
      end: lerpColor('#a78bfa', '#ef4444', 1 - t)
    }
  } else {
    const t = emotion * 2
    return {
      start: lerpColor('#ef4444', '#a78bfa', t),
      end: lerpColor('#7effb3', '#facc15', 1 - t)
    }
  }
}

const Visualizer: React.FC<VisualizerProps> = ({
  isPlaying,
  emotionValue,
  visualConfig,
  rhythmSignal
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const linesRef = useRef<LineElement[]>([])
  const dotsRef = useRef<DotElement[]>([])
  const lastTransformTime = useRef<number>(0)
  const breathPhase = useRef<number>(0)
  const initialized = useRef<boolean>(false)

  const initElements = useCallback((width: number, height: number) => {
    const colors = getEmotionColors(emotionValue)
    const lines: LineElement[] = []
    const dots: DotElement[] = []
    const lineCount = visualConfig.lineCount

    for (let i = 0; i < lineCount; i++) {
      const x1 = Math.random() * width
      const y1 = Math.random() * height
      const length = 30 + Math.random() * 90
      const angle = Math.random() * Math.PI * 2
      const x2 = x1 + Math.cos(angle) * length
      const y2 = y1 + Math.sin(angle) * length
      const colorT = Math.random()

      lines.push({
        x1, y1, x2, y2,
        targetX1: x1, targetY1: y1, targetX2: x2, targetY2: y2,
        length,
        rotation: angle,
        targetRotation: angle,
        scale: 1,
        targetScale: 1,
        alpha: 0.5 + Math.random() * 0.4,
        color: lerpColor(colors.start, colors.end, colorT)
      })

      dots.push({
        x: x1,
        y: y1,
        targetX: x1,
        targetY: y1,
        radius: 5 + Math.random() * 10,
        baseRadius: 5 + Math.random() * 10,
        alpha: 0.3 + Math.random() * 0.4,
        color: lerpColor(colors.start, colors.end, colorT)
      })

      dots.push({
        x: x2,
        y: y2,
        targetX: x2,
        targetY: y2,
        radius: 5 + Math.random() * 10,
        baseRadius: 5 + Math.random() * 10,
        alpha: 0.3 + Math.random() * 0.4,
        color: lerpColor(colors.start, colors.end, 1 - colorT)
      })
    }

    linesRef.current = lines
    dotsRef.current = dots
    initialized.current = true
  }, [emotionValue, visualConfig.lineCount])

  const updateTargets = useCallback((width: number, height: number) => {
    const lines = linesRef.current
    const dots = dotsRef.current
    const colors = getEmotionColors(emotionValue)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const newX1 = Math.random() * width
      const newY1 = Math.random() * height
      const angle = Math.random() * Math.PI * 2
      const newLength = 30 + Math.random() * 90
      const newX2 = newX1 + Math.cos(angle) * newLength
      const newY2 = newY1 + Math.sin(angle) * newLength
      const colorT = Math.random()

      line.targetX1 = newX1
      line.targetY1 = newY1
      line.targetX2 = newX2
      line.targetY2 = newY2
      line.targetRotation = angle
      line.targetScale = 0.7 + Math.random() * 0.6
      line.color = lerpColor(colors.start, colors.end, colorT)

      const dot1 = dots[i * 2]
      const dot2 = dots[i * 2 + 1]
      if (dot1) {
        dot1.targetX = newX1
        dot1.targetY = newY1
        dot1.color = lerpColor(colors.start, colors.end, colorT)
      }
      if (dot2) {
        dot2.targetX = newX2
        dot2.targetY = newY2
        dot2.color = lerpColor(colors.start, colors.end, 1 - colorT)
      }
    }
  }, [emotionValue])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
        if (!initialized.current) {
          initElements(canvas.width, canvas.height)
        }
      }
    }

    resize()
    window.addEventListener('resize', resize)

    const render = (time: number) => {
      const width = canvas.width
      const height = canvas.height

      ctx.fillStyle = '#1e1b2e'
      ctx.fillRect(0, 0, width, height)

      breathPhase.current += 0.02
      const breath = (Math.sin(breathPhase.current) + 1) / 2

      const transformInterval = 500 + emotionValue * 1500
      if (isPlaying && time - lastTransformTime.current > transformInterval) {
        updateTargets(width, height)
        lastTransformTime.current = time
      }

      const lines = linesRef.current
      const dots = dotsRef.current
      const rhythmPulse = 1 + rhythmSignal * 0.3

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        line.x1 += (line.targetX1 - line.x1) * 0.03
        line.y1 += (line.targetY1 - line.y1) * 0.03
        line.x2 += (line.targetX2 - line.x2) * 0.03
        line.y2 += (line.targetY2 - line.y2) * 0.03
        line.rotation += (line.targetRotation - line.rotation) * 0.03
        line.scale += (line.targetScale - line.scale) * 0.03

        const breathAlpha = 0.3 + breath * 0.6
        const finalAlpha = line.alpha * breathAlpha

        ctx.save()
        ctx.globalAlpha = finalAlpha
        ctx.strokeStyle = line.color
        ctx.lineWidth = 1.5 * line.scale * rhythmPulse
        ctx.lineCap = 'round'

        const midX = (line.x1 + line.x2) / 2
        const midY = (line.y1 + line.y2) / 2
        ctx.translate(midX, midY)
        ctx.rotate(line.rotation)
        ctx.scale(line.scale * rhythmPulse, line.scale * rhythmPulse)
        ctx.translate(-midX, -midY)

        ctx.beginPath()
        ctx.moveTo(line.x1, line.y1)
        ctx.lineTo(line.x2, line.y2)
        ctx.stroke()
        ctx.restore()
      }

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i]
        dot.x += (dot.targetX - dot.x) * 0.04
        dot.y += (dot.targetY - dot.y) * 0.04

        const breathAlpha = 0.3 + breath * 0.4
        const finalAlpha = dot.alpha * breathAlpha
        const finalRadius = dot.baseRadius * rhythmPulse

        ctx.save()
        ctx.globalAlpha = finalAlpha
        ctx.fillStyle = dot.color
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, finalRadius, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = finalAlpha * 0.3
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, finalRadius * 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [isPlaying, emotionValue, initElements, updateTargets, rhythmSignal])

  useEffect(() => {
    initialized.current = false
    const canvas = canvasRef.current
    if (canvas) {
      initElements(canvas.width, canvas.height)
    }
  }, [visualConfig, initElements])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        backgroundColor: '#1e1b2e'
      }}
    />
  )
}

export default Visualizer
