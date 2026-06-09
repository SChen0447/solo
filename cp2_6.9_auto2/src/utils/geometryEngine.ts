import type { BlendMode } from './colorBlend'

export type ShapeType = 'rect' | 'circle' | 'triangle' | 'svg'

export interface Shape {
  id: string
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scale: number
  opacity: number
  color: string
  svgContent?: string
  animationPhase: number
  createdAt: number
}

export interface EngineConfig {
  density: number
  rotationRange: number
  baseOpacity: number
  blendMode: GlobalCompositeOperation | BlendMode
}

const COLOR_PALETTE = [
  '#00d4ff', '#6c63ff', '#ff6b9d', '#ffd93d', '#6bcf7f',
  '#ff8c42', '#a855f7', '#22d3ee', '#f472b6', '#facc15'
]

const MAX_SHAPES = 200

let shapeCounter = 0
const genId = () => `shape_${Date.now()}_${++shapeCounter}`

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

export const createRandomShape = (
  type: ShapeType,
  canvasWidth: number,
  canvasHeight: number,
  config: EngineConfig,
  svgContent?: string
): Shape => {
  const baseSize = Math.min(canvasWidth, canvasHeight) * randomInRange(0.08, 0.22)
  return {
    id: genId(),
    type,
    x: randomInRange(canvasWidth * 0.1, canvasWidth * 0.9),
    y: randomInRange(canvasHeight * 0.1, canvasHeight * 0.9),
    width: baseSize * randomInRange(0.7, 1.3),
    height: baseSize * randomInRange(0.7, 1.3),
    rotation: randomInRange(0, (config.rotationRange * Math.PI) / 180),
    scale: 1,
    opacity: config.baseOpacity * randomInRange(0.6, 1),
    color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
    svgContent,
    animationPhase: 0,
    createdAt: performance.now(),
  }
}

export const generateShapesForDensity = (
  baseShapes: Shape[],
  density: number,
  canvasWidth: number,
  canvasHeight: number,
  config: EngineConfig
): Shape[] => {
  const targetCount = Math.min(Math.floor(density), MAX_SHAPES)
  const existingCount = baseShapes.length

  if (existingCount >= targetCount) {
    return baseShapes.slice(0, targetCount)
  }

  const types: ShapeType[] = ['rect', 'circle', 'triangle']
  const result = [...baseShapes]

  while (result.length < targetCount) {
    const type = types[Math.floor(Math.random() * types.length)]
    result.push(createRandomShape(type, canvasWidth, canvasHeight, config))
  }

  return result
}

export const springEasing = (t: number): number => {
  const c4 = (2 * Math.PI) / 3
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

const drawShapePath = (ctx: CanvasRenderingContext2D, shape: Shape) => {
  const w = shape.width * shape.scale
  const h = shape.height * shape.scale

  switch (shape.type) {
    case 'rect':
      ctx.beginPath()
      ctx.rect(-w / 2, -h / 2, w, h)
      break
    case 'circle':
      ctx.beginPath()
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2)
      break
    case 'triangle':
      ctx.beginPath()
      ctx.moveTo(0, -h / 2)
      ctx.lineTo(w / 2, h / 2)
      ctx.lineTo(-w / 2, h / 2)
      ctx.closePath()
      break
    case 'svg':
      break
  }
}

export const renderShapes = (
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  canvasWidth: number,
  canvasHeight: number,
  blendMode: GlobalCompositeOperation,
  selectedId: string | null
) => {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight)
  gradient.addColorStop(0, '#16162a')
  gradient.addColorStop(1, '#1a1a2e')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  shapes.forEach((shape) => {
    ctx.save()
    ctx.translate(shape.x, shape.y)
    ctx.rotate(shape.rotation)

    const animScale = shape.animationPhase < 1
      ? 0.3 + springEasing(shape.animationPhase) * 0.7
      : 1
    const animOpacity = shape.animationPhase < 1
      ? shape.animationPhase
      : 1

    ctx.globalAlpha = shape.opacity * animOpacity
    ctx.globalCompositeOperation = blendMode

    if (shape.type === 'svg' && shape.svgContent) {
      const w = shape.width * shape.scale * animScale
      const h = shape.height * shape.scale * animScale
      const img = getSvgImage(shape.svgContent)
      if (img && img.complete) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
      }
    } else {
      ctx.save()
      ctx.scale(animScale, animScale)
      drawShapePath(ctx, shape)
      ctx.fillStyle = shape.color
      ctx.fill()
      ctx.restore()
    }

    if (selectedId === shape.id) {
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = '#00d4ff'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      const w = shape.width * shape.scale * animScale
      const h = shape.height * shape.scale * animScale
      ctx.strokeRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12)
      ctx.setLineDash([])
    }

    ctx.restore()
  })

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

const svgImageCache = new Map<string, HTMLImageElement>()

export const getSvgImage = (svgContent: string): HTMLImageElement | null => {
  if (svgImageCache.has(svgContent)) {
    return svgImageCache.get(svgContent)!
  }
  try {
    const img = new Image()
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    img.src = url
    svgImageCache.set(svgContent, img)
    return img
  } catch {
    return null
  }
}

export const isPointInShape = (shape: Shape, px: number, py: number): boolean => {
  const cos = Math.cos(-shape.rotation)
  const sin = Math.sin(-shape.rotation)
  const dx = px - shape.x
  const dy = py - shape.y
  const localX = dx * cos - dy * sin
  const localY = dx * sin + dy * cos

  const w = (shape.width * shape.scale) / 2
  const h = (shape.height * shape.scale) / 2

  if (shape.type === 'circle') {
    return (localX * localX) / (w * w) + (localY * localY) / (h * h) <= 1
  }

  return localX >= -w && localX <= w && localY >= -h && localY <= h
}

export const hitTestShapes = (shapes: Shape[], px: number, py: number): Shape | null => {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointInShape(shapes[i], px, py)) {
      return shapes[i]
    }
  }
  return null
}
