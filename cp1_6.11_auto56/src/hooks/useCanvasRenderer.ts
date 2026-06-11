import { useEffect, useRef } from 'react'
import type { DamCalculationResult, DamType } from './useDamCalculator'

interface UseCanvasRendererOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>
  calculationResult: DamCalculationResult
  darkMode: boolean
  damType: DamType
  animating: boolean
}

export function useCanvasRenderer(options: UseCanvasRendererOptions) {
  const { canvasRef, calculationResult, darkMode, damType, animating } = options
  const animationFrameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const deformationProgressRef = useRef<number>(1)
  const lastDamTypeRef = useRef<DamType>(damType)

  useEffect(() => {
    if (lastDamTypeRef.current !== damType) {
      deformationProgressRef.current = 0
      lastDamTypeRef.current = damType
    }
  }, [damType])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = (timestamp: number) => {
      const deltaTime = (timestamp - timeRef.current) / 1000
      timeRef.current = timestamp

      if (deformationProgressRef.current < 1) {
        deformationProgressRef.current = Math.min(
          1,
          deformationProgressRef.current + deltaTime / 0.8
        )
      }

      resizeCanvas(canvas)
      drawScene(ctx, canvas, calculationResult, darkMode, animating, timestamp / 1000, deformationProgressRef.current, damType)

      animationFrameRef.current = requestAnimationFrame(render)
    }

    animationFrameRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [canvasRef, calculationResult, darkMode, animating, damType])
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1

  if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  result: DamCalculationResult,
  darkMode: boolean,
  animating: boolean,
  time: number,
  morphProgress: number,
  damType: DamType
) {
  const rect = canvas.getBoundingClientRect()
  const width = rect.width
  const height = rect.height

  const colors = getColors(darkMode)

  ctx.clearRect(0, 0, width, height)

  const padding = { top: 60, right: 80, bottom: 80, left: 80 }
  const drawWidth = width - padding.left - padding.right
  const drawHeight = height - padding.top - padding.bottom

  const damBottomWidth = result.foundationSupports.length > 0
    ? result.foundationSupports[result.foundationSupports.length - 1].x - result.foundationSupports[0].x + 40
    : 200
  const damHeight = result.damProfile.reduce((max, p) => Math.max(max, p.y), 0)

  const scaleX = drawWidth / damBottomWidth
  const scaleY = drawHeight / damHeight
  const scale = Math.min(scaleX, scaleY) * 0.9

  const offsetX = padding.left + drawWidth / 2
  const offsetY = height - padding.bottom

  const toCanvasX = (x: number) => offsetX + (x - damBottomWidth / 2) * scale
  const toCanvasY = (y: number) => offsetY - y * scale

  drawWater(ctx, result, toCanvasX, toCanvasY, time, colors, scale, damBottomWidth)

  drawFoundation(ctx, result, toCanvasX, toCanvasY, colors, scale, damBottomWidth)

  if (damType === 'buttress') {
    drawButtressDam(ctx, result, toCanvasX, toCanvasY, colors, scale, damBottomWidth)
  } else {
    drawStressCloud(ctx, result, toCanvasX, toCanvasY, colors, scale)
    drawDamOutline(ctx, result, toCanvasX, toCanvasY, colors, scale)
  }

  drawWaterPressureArrows(ctx, result, toCanvasX, toCanvasY, colors, scale, time)

  if (animating && morphProgress > 0.99) {
    drawDeformedShape(ctx, result, toCanvasX, toCanvasY, colors, scale, time, damType)
    drawDisplacementLabel(ctx, result, toCanvasX, toCanvasY, colors, scale)
  }

  drawSupports(ctx, result, toCanvasX, toCanvasY, colors, scale)
}

function getColors(darkMode: boolean) {
  if (darkMode) {
    return {
      bg: '#1A1A2E',
      grid: '#2A2A4E',
      damFill: 'rgba(200, 200, 200, 0.3)',
      damStroke: '#B0BEC5',
      waterUpstream: 'rgba(100, 180, 220, 0.4)',
      waterDownstream: 'rgba(180, 220, 240, 0.3)',
      stressTension: '#9C27B0',
      stressCompression: '#4CAF50',
      foundation: '#424242',
      support: '#B0BEC5',
      arrow: '#FF6B6B',
      text: '#E0E0E0',
      displacement: '#FFD54F',
    }
  }
  return {
    bg: '#F5F0E1',
    grid: '#D4CCC0',
    damFill: 'rgba(180, 180, 180, 0.4)',
    damStroke: '#1E3A5F',
    waterUpstream: 'rgba(100, 180, 220, 0.5)',
    waterDownstream: 'rgba(180, 220, 240, 0.5)',
    stressTension: '#3498DB',
    stressCompression: '#E74C3C',
    foundation: '#555555',
    support: '#2C3E50',
    arrow: '#C0392B',
    text: '#2C3E50',
    displacement: '#E67E22',
  }
}

function drawWater(
  ctx: CanvasRenderingContext2D,
  result: DamCalculationResult,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  time: number,
  colors: ReturnType<typeof getColors>,
  scale: number,
  damBottomWidth: number
) {
  const damLeftX = damBottomWidth / 2 - 30
  const damRightX = damBottomWidth / 2 + 30

  const waveAmplitude = 2
  const wavePeriod = 3

  if (result.upstreamWaterHeight > 0) {
    const waterTopY = toCanvasY(result.upstreamWaterHeight)
    const waterBottomY = toCanvasY(0)
    const waterLeftX = toCanvasX(damLeftX - 40)
    const waterRightX = toCanvasX(damLeftX)

    ctx.fillStyle = colors.waterUpstream
    ctx.beginPath()
    ctx.moveTo(waterLeftX, waterBottomY)
    ctx.lineTo(waterRightX, waterBottomY)

    const steps = 20
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = waterRightX - t * (waterRightX - waterLeftX)
      const waveOffset = Math.sin(t * Math.PI * 3 + (time * Math.PI * 2) / wavePeriod) * waveAmplitude
      ctx.lineTo(x, waterTopY + waveOffset)
    }

    ctx.closePath()
    ctx.fill()
  }

  if (result.downstreamWaterHeight > 0) {
    const waterTopY = toCanvasY(result.downstreamWaterHeight)
    const waterBottomY = toCanvasY(0)
    const waterLeftX = toCanvasX(damRightX)
    const waterRightX = toCanvasX(damRightX + 40)

    ctx.fillStyle = colors.waterDownstream
    ctx.beginPath()
    ctx.moveTo(waterLeftX, waterBottomY)
    ctx.lineTo(waterRightX, waterBottomY)

    const steps = 20
    for (let i = steps; i >= 0; i--) {
      const t = i / steps
      const x = waterLeftX + t * (waterRightX - waterLeftX)
      const waveOffset = Math.sin(t * Math.PI * 3 + (time * Math.PI * 2) / wavePeriod + 1) * waveAmplitude
      ctx.lineTo(x, waterTopY + waveOffset)
    }

    ctx.closePath()
    ctx.fill()
  }
}

function drawFoundation(
  ctx: CanvasRenderingContext2D,
  result: DamCalculationResult,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  colors: ReturnType<typeof getColors>,
  scale: number,
  damBottomWidth: number
) {
  const foundationY = toCanvasY(0)
  const foundationHeight = 30
  const leftX = toCanvasX(-20)
  const rightX = toCanvasX(damBottomWidth + 20)

  ctx.fillStyle = colors.foundation
  ctx.fillRect(leftX, foundationY, rightX - leftX, foundationHeight)

  ctx.strokeStyle = 'rgba(0,0,0,0.1)'
  ctx.lineWidth = 1
  for (let x = leftX; x < rightX; x += 10) {
    ctx.beginPath()
    ctx.moveTo(x, foundationY)
    ctx.lineTo(x - 5, foundationY + foundationHeight)
    ctx.stroke()
  }
}

function drawStressCloud(
  ctx: CanvasRenderingContext2D,
  result: DamCalculationResult,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  colors: ReturnType<typeof getColors>,
  scale: number
) {
  const gridSize = 4 * scale

  for (const point of result.stressGrid) {
    const x = toCanvasX(point.x)
    const y = toCanvasY(point.y)

    const color = getStressColor(point.stress, colors)
    ctx.fillStyle = color
    ctx.fillRect(x - gridSize / 2, y - gridSize / 2, gridSize, gridSize)
  }
}

function getStressColor(stress: number, colors: ReturnType<typeof getColors>): string {
  const t = (stress + 1) / 2
  const clampedT = Math.max(0, Math.min(1, t))

  const tensionColor = parseColor(colors.stressTension)
  const compressionColor = parseColor(colors.stressCompression)

  const r = Math.round(tensionColor.r + (compressionColor.r - tensionColor.r) * clampedT)
  const g = Math.round(tensionColor.g + (compressionColor.g - tensionColor.g) * clampedT)
  const b = Math.round(tensionColor.b + (compressionColor.b - tensionColor.b) * clampedT)

  return `rgba(${r}, ${g}, ${b}, 0.7)`
}

function parseColor(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
  }
  return { r: 0, g: 0, b: 0 }
}

function drawDamOutline(
  ctx: CanvasRenderingContext2D,
  result: DamCalculationResult,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  colors: ReturnType<typeof getColors>,
  scale: number
) {
  if (result.damProfile.length < 3) return

  ctx.fillStyle = colors.damFill
  ctx.strokeStyle = colors.damStroke
  ctx.lineWidth = 3

  ctx.beginPath()
  ctx.moveTo(toCanvasX(result.damProfile[0].x), toCanvasY(result.damProfile[0].y))

  for (let i = 1; i < result.damProfile.length; i++) {
    ctx.lineTo(toCanvasX(result.damProfile[i].x), toCanvasY(result.damProfile[i].y))
  }

  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function drawButtressDam(
  ctx: CanvasRenderingContext2D,
  result: DamCalculationResult,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  colors: ReturnType<typeof getColors>,
  scale: number,
  damBottomWidth: number
) {
  const H = result.damProfile.reduce((max, p) => Math.max(max, p.y), 0)

  for (const buttress of result.buttresses) {
    const topWidth = buttress.width * 0.4
    const topX = buttress.x + buttress.width / 2 - topWidth / 2

    ctx.fillStyle = colors.damFill
    ctx.strokeStyle = colors.damStroke
    ctx.lineWidth = 2.5

    ctx.beginPath()
    ctx.moveTo(toCanvasX(buttress.x), toCanvasY(0))
    ctx.lineTo(toCanvasX(buttress.x + buttress.width), toCanvasY(0))
    ctx.lineTo(toCanvasX(topX + topWidth), toCanvasY(H))
    ctx.lineTo(toCanvasX(topX), toCanvasY(H))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

function drawWaterPressureArrows(
  ctx: CanvasRenderingContext2D,
  result: DamCalculationResult,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  colors: ReturnType<typeof getColors>,
  scale: number,
  time: number
) {
  const maxArrowLength = 80
  const waveAmplitude = 2

  const damLeftX = result.damProfile.reduce((min, p) => Math.min(min, p.x), Infinity)
  const damRightX = result.damProfile.reduce((max, p) => Math.max(max, p.x), -Infinity)

  const upstreamMaxPressure = result.upstreamPressure.length > 0
    ? Math.max(...result.upstreamPressure.map(p => p.pressure))
    : 1

  for (const p of result.upstreamPressure) {
    if (p.depth <= 0.1) continue

    const waveOffset = Math.sin(time * Math.PI * 2 / 3 + p.depth * 0.1) * waveAmplitude * 0.5
    const arrowLength = (p.pressure / upstreamMaxPressure) * maxArrowLength + waveOffset

    const startX = toCanvasX(damLeftX)
    const y = toCanvasY(p.y)

    const endX = startX - arrowLength

    ctx.strokeStyle = colors.arrow
    ctx.fillStyle = colors.arrow
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(startX, y)
    ctx.lineTo(endX, y)
    ctx.stroke()

    const arrowHeadSize = 6
    ctx.beginPath()
    ctx.moveTo(endX, y)
    ctx.lineTo(endX + arrowHeadSize, y - arrowHeadSize / 2)
    ctx.lineTo(endX + arrowHeadSize, y + arrowHeadSize / 2)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = colors.text
    ctx.font = '11px "Segoe UI", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${p.pressure.toFixed(1)} kPa`, endX - 8, y + 4)
  }

  const downstreamMaxPressure = result.downstreamPressure.length > 0
    ? Math.max(...result.downstreamPressure.map(p => p.pressure))
    : 1

  for (const p of result.downstreamPressure) {
    if (p.depth <= 0.1) continue

    const waveOffset = Math.sin(time * Math.PI * 2 / 3 + p.depth * 0.1 + 1) * waveAmplitude * 0.5
    const arrowLength = (p.pressure / downstreamMaxPressure) * maxArrowLength * 0.6 + waveOffset

    const startX = toCanvasX(damRightX)
    const y = toCanvasY(p.y)

    const endX = startX + arrowLength

    ctx.strokeStyle = colors.arrow
    ctx.fillStyle = colors.arrow
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(startX, y)
    ctx.lineTo(endX, y)
    ctx.stroke()

    const arrowHeadSize = 6
    ctx.beginPath()
    ctx.moveTo(endX, y)
    ctx.lineTo(endX - arrowHeadSize, y - arrowHeadSize / 2)
    ctx.lineTo(endX - arrowHeadSize, y + arrowHeadSize / 2)
    ctx.closePath()
    ctx.fill()
  }
}

function drawSupports(
  ctx: CanvasRenderingContext2D,
  result: DamCalculationResult,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  colors: ReturnType<typeof getColors>,
  scale: number
) {
  const foundationY = toCanvasY(0)

  result.foundationSupports.forEach((support, index) => {
    const x = toCanvasX(support.x)
    const isRoller = result.rollerSupports.includes(index)

    if (isRoller) {
      ctx.fillStyle = colors.support
      ctx.strokeStyle = colors.support
      ctx.lineWidth = 1.5

      const baseY = foundationY + 30
      const baseWidth = 24
      const baseHeight = 6

      ctx.fillRect(x - baseWidth / 2, baseY, baseWidth, baseHeight)

      const rollerRadius = 5
      ctx.beginPath()
      ctx.arc(x - 6, baseY - rollerRadius, rollerRadius, 0, Math.PI * 2)
      ctx.arc(x + 6, baseY - rollerRadius, rollerRadius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = colors.support
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, foundationY)
      ctx.lineTo(x, baseY - rollerRadius * 2)
      ctx.stroke()
    } else {
      ctx.fillStyle = colors.support
      ctx.strokeStyle = colors.support
      ctx.lineWidth = 1.5

      const baseY = foundationY + 30
      const baseWidth = 20

      ctx.beginPath()
      ctx.moveTo(x, foundationY)
      ctx.lineTo(x - baseWidth / 2, baseY)
      ctx.lineTo(x + baseWidth / 2, baseY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  })
}

function drawDeformedShape(
  ctx: CanvasRenderingContext2D,
  result: DamCalculationResult,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  colors: ReturnType<typeof getColors>,
  scale: number,
  time: number,
  damType: DamType
) {
  if (result.displacedProfile.length < 3) return

  const breatheOffset = Math.sin(time * Math.PI * 2 / 1.5) * 0.05 + 0.95

  ctx.save()
  ctx.setLineDash([6, 4])
  ctx.strokeStyle = colors.displacement
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.7

  ctx.beginPath()
  ctx.moveTo(
    toCanvasX(result.displacedProfile[0].x * breatheOffset),
    toCanvasY(result.displacedProfile[0].y)
  )

  for (let i = 1; i < result.displacedProfile.length; i++) {
    ctx.lineTo(
      toCanvasX(result.displacedProfile[i].x * breatheOffset),
      toCanvasY(result.displacedProfile[i].y)
    )
  }

  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

function drawDisplacementLabel(
  ctx: CanvasRenderingContext2D,
  result: DamCalculationResult,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  colors: ReturnType<typeof getColors>,
  scale: number
) {
  const H = result.damProfile.reduce((max, p) => Math.max(max, p.y), 0)
  const topCenterX = result.damProfile.reduce((sum, p) => {
    if (Math.abs(p.y - H) < 0.1) return sum + p.x
    return sum
  }, 0) / result.damProfile.filter(p => Math.abs(p.y - H) < 0.1).length

  const x = toCanvasX(topCenterX)
  const y = toCanvasY(H) - 20

  ctx.fillStyle = colors.displacement
  ctx.font = 'bold 12px "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`位移: ${result.topDisplacement.x.toFixed(2)} mm`, x, y)
}

export default useCanvasRenderer
