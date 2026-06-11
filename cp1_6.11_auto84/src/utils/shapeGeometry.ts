export const SEGMENT_COUNT = 60
export const DEFAULT_RADIUS = 60
export const RESPONSE_RADIUS_PX = 20
export const ANIMATION_DURATION = 300
export const CLAY_COLOR_DARK = '#5a4a3a'
export const CLAY_COLOR_LIGHT = '#c4a882'

export interface RingSegment {
  y: number
  radius: number
  targetRadius: number
  thickness: number
}

export function createInitialShape(): number[] {
  return Array(SEGMENT_COUNT).fill(DEFAULT_RADIUS).map((r, i) => {
    const t = i / SEGMENT_COUNT
    const neck = Math.sin(t * Math.PI * 0.3) * 8
    return r - 5 + neck
  })
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function gaussianInfluence(
  segmentIndex: number,
  totalSegments: number,
  targetY: number,
  radiusPx: number,
  canvasHeight: number
): number {
  const segY = (segmentIndex / totalSegments) * canvasHeight
  const dist = Math.abs(segY - targetY)
  const sigma = radiusPx
  return Math.exp(-(dist * dist) / (2 * sigma * sigma))
}

export function applyDeformation(
  shape: number[],
  canvasX: number,
  canvasY: number,
  dragDeltaY: number,
  dragDeltaX: number,
  centerX: number,
  canvasHeight: number
): number[] {
  const targetSegY = canvasY
  const newShape = [...shape]
  const avgRadius = shape.reduce((a, b) => a + b, 0) / shape.length

  for (let i = 0; i < shape.length; i++) {
    const influence = gaussianInfluence(i, shape.length, targetSegY, RESPONSE_RADIUS_PX, canvasHeight)
    if (influence < 0.01) continue

    const verticalShrink = dragDeltaY * 0.5 * influence
    const horizontalExpand = -dragDeltaX * 0.4 * influence

    const distFromCenter = Math.abs(canvasX - centerX) / avgRadius
    const sidePull = distFromCenter > 0.5 ? horizontalExpand : 0

    newShape[i] = Math.max(15, Math.min(160, newShape[i] + verticalShrink + sidePull))
  }

  return newShape
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 90, g: 74, b: 58 }
}

export function interpolateColor(
  color1: string,
  color2: string,
  t: number
): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const r = Math.round(lerp(c1.r, c2.r, t))
  const g = Math.round(lerp(c1.g, c2.g, t))
  const b = Math.round(lerp(c1.b, c2.b, t))
  return `rgb(${r},${g},${b})`
}

export function getColorByThickness(
  thickness: number,
  maxThickness: number
): string {
  const t = Math.min(1, Math.max(0, thickness / maxThickness))
  return interpolateColor(CLAY_COLOR_LIGHT, CLAY_COLOR_DARK, t)
}

export interface RenderParams {
  ctx: CanvasRenderingContext2D
  shape: number[]
  centerX: number
  centerY: number
  rotation: number
  scale?: number
  glazeSpots?: GlazeSpotForRender[]
  withTexture?: boolean
}

export interface GlazeSpotForRender {
  x: number
  y: number
  color: string
  radius: number
  opacity: number
}

export function renderPottery(params: RenderParams): void {
  const { ctx, shape, centerX, centerY, rotation, scale = 1, glazeSpots = [], withTexture = true } = params

  const segHeight = 320 / shape.length
  const rotatedShape = shape.map((r, i) => {
    const angleOffset = Math.sin(rotation + i * 0.2) * 0.5
    return r * (1 + angleOffset * 0.02)
  })

  for (let i = shape.length - 1; i >= 0; i--) {
    const r = rotatedShape[i] * scale
    const y = centerY + 160 - (i / shape.length) * 320 - segHeight / 2
    const thicknessRatio = Math.abs(r - DEFAULT_RADIUS * scale) / (DEFAULT_RADIUS * scale)
    const color = getColorByThickness(thicknessRatio * 100, 60)

    ctx.beginPath()
    ctx.ellipse(centerX, y, r, r * 0.35, 0, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    if (i % 2 === 0 && withTexture) {
      ctx.beginPath()
      ctx.ellipse(centerX, y, r * 0.98, r * 0.34, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }

  if (withTexture) {
    const avgR = rotatedShape.reduce((a, b) => a + b, 0) / rotatedShape.length * scale
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, avgR * (0.9 - k * 0.15), avgR * 0.28 * (0.9 - k * 0.15), 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(139,115,85,${0.08 / k})`
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  for (const spot of glazeSpots) {
    const px = centerX + (spot.x - 50) * 2.2
    const py = centerY + 160 - (spot.y / 100) * 320
    const grad = ctx.createRadialGradient(px, py, 0, px, py, spot.radius * scale)
    const c = hexToRgb(spot.color)
    grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${0.75 * spot.opacity})`)
    grad.addColorStop(0.6, `rgba(${c.r},${c.g},${c.b},${0.45 * spot.opacity})`)
    grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`)
    ctx.beginPath()
    ctx.arc(px, py, spot.radius * scale, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.shadowColor = spot.color
    ctx.shadowBlur = 12
    ctx.fill()
    ctx.shadowBlur = 0
  }

  const topR = rotatedShape[rotatedShape.length - 1] * scale
  const topY = centerY + 160 - 320
  ctx.beginPath()
  ctx.ellipse(centerX, topY, topR, topR * 0.35, 0, 0, Math.PI * 2)
  const rimGrad = ctx.createRadialGradient(centerX, topY, 0, centerX, topY, topR)
  rimGrad.addColorStop(0, 'rgba(30,25,20,0.7)')
  rimGrad.addColorStop(1, 'rgba(60,50,40,0.9)')
  ctx.fillStyle = rimGrad
  ctx.fill()
  ctx.strokeStyle = 'rgba(180,160,140,0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

export function renderPotteryWheel(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  rotation: number
): void {
  const wheelY = centerY + 180

  for (let k = 0; k < 5; k++) {
    ctx.beginPath()
    ctx.ellipse(centerX, wheelY + k * 1.5, radius - k * 2, (radius - k * 2) * 0.25, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${60 - k * 8},${50 - k * 7},${40 - k * 5},1)`
    ctx.fill()
  }

  for (let i = 0; i < 12; i++) {
    const angle = rotation * 2 + (i / 12) * Math.PI * 2
    const x1 = centerX + Math.cos(angle) * (radius * 0.3)
    const y1 = wheelY + Math.sin(angle) * (radius * 0.08)
    const x2 = centerX + Math.cos(angle) * (radius * 0.9)
    const y2 = wheelY + Math.sin(angle) * (radius * 0.22)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = 'rgba(160,140,120,0.25)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.ellipse(centerX, wheelY, radius, radius * 0.25, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(180,160,140,0.5)'
  ctx.lineWidth = 2
  ctx.stroke()
}
