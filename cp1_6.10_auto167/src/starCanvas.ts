import type { Star, Line } from './storage'

export type CanvasMode = 'idle' | 'connect' | 'erase'

const STAR_COUNT = 100
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 480
const STAR_HIT_RADIUS = 12
const LINE_HIT_RADIUS = 6
const BREATH_PERIOD = 500
const FADEIN_DURATION = 300

export function generateStars(): Star[] {
  const stars: Star[] = []
  const padding = 20
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: padding + Math.random() * (CANVAS_WIDTH - padding * 2),
      y: padding + Math.random() * (CANVAS_HEIGHT - padding * 2),
      size: 2 + Math.random(),
      baseAlpha: 0.7 + Math.random() * 0.3
    })
  }
  return stars
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  gradient.addColorStop(0, '#0a0e27')
  gradient.addColorStop(1, '#1a1d3a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], time: number): void {
  for (const star of stars) {
    const phase = (time % BREATH_PERIOD) / BREATH_PERIOD
    const breath = 0.7 + 0.3 * Math.sin(phase * Math.PI * 2)
    const alpha = star.baseAlpha * breath
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fill()
  }
}

function drawLines(ctx: CanvasRenderingContext2D, stars: Star[], lines: Line[], time: number): void {
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (const line of lines) {
    let opacity = line.opacity
    if (line.fadeIn) {
      const elapsed = time - (line as unknown as { _startTime?: number })._startTime!
      if (elapsed < FADEIN_DURATION) {
        opacity = (elapsed / FADEIN_DURATION) * 0.6
      } else {
        line.fadeIn = false
        opacity = 0.6
      }
    }
    const s1 = stars[line.star1Index]
    const s2 = stars[line.star2Index]
    if (!s1 || !s2) continue
    ctx.beginPath()
    ctx.moveTo(s1.x, s1.y)
    ctx.lineTo(s2.x, s2.y)
    ctx.strokeStyle = `rgba(106, 156, 255, ${opacity})`
    ctx.stroke()
  }
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  lines: Line[],
  time: number
): void {
  drawBackground(ctx)
  drawLines(ctx, stars, lines, time)
  drawStars(ctx, stars, time)
}

export function findNearestStar(stars: Star[], x: number, y: number): number {
  let nearest = -1
  let minDist = STAR_HIT_RADIUS
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i]
    const dx = star.x - x
    const dy = star.y - y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < minDist) {
      minDist = dist
      nearest = i
    }
  }
  return nearest
}

function pointLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    const ex = px - x1
    const ey = py - y1
    return Math.sqrt(ex * ex + ey * ey)
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const projX = x1 + t * dx
  const projY = y1 + t * dy
  const fx = px - projX
  const fy = py - projY
  return Math.sqrt(fx * fx + fy * fy)
}

export function findNearestLine(stars: Star[], lines: Line[], x: number, y: number): number {
  let nearest = -1
  let minDist = LINE_HIT_RADIUS
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const s1 = stars[line.star1Index]
    const s2 = stars[line.star2Index]
    if (!s1 || !s2) continue
    const dist = pointLineDistance(x, y, s1.x, s1.y, s2.x, s2.y)
    if (dist < minDist) {
      minDist = dist
      nearest = i
    }
  }
  return nearest
}

export function addLine(lines: Line[], star1: number, star2: number, time: number): Line[] {
  if (star1 === star2) return lines
  const exists = lines.some(
    (l) =>
      (l.star1Index === star1 && l.star2Index === star2) ||
      (l.star1Index === star2 && l.star2Index === star1)
  )
  if (exists) return lines
  const newLine: Line = {
    star1Index: star1,
    star2Index: star2,
    opacity: 0.6,
    fadeIn: true
  }
  ;(newLine as unknown as { _startTime: number })._startTime = time
  return [...lines, newLine]
}

export function removeLine(lines: Line[], index: number): Line[] {
  if (index < 0 || index >= lines.length) return lines
  const result = [...lines]
  result.splice(index, 1)
  return result
}

export function getCanvasCoords(canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  }
}
