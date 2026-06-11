import { hexToRgb } from './shapeGeometry'

export interface GlazeSpot {
  x: number
  y: number
  color: string
  colorName: string
  radius: number
  timestamp: number
}

export interface Scores {
  uniformity: number
  symmetry: number
  colorMatch: number
  total: number
}

const GRID_SIZE = 10
const TARGET_COVERAGE_MIN = 0.45
const TARGET_COVERAGE_MAX = 0.80

export function calculateUniformity(
  glazeSpots: GlazeSpot[],
  shape: number[]
): number {
  if (glazeSpots.length === 0) return 10

  const grid: number[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(0))

  const maxRadius = shape.reduce((a, b) => Math.max(a, b), 0)
  const minRadius = shape.reduce((a, b) => Math.min(a, b), 0)
  const avgRadius = (maxRadius + minRadius) / 2

  for (const spot of glazeSpots) {
    const normalizedRadius = (spot.radius / avgRadius) * 50
    const spotGX = Math.floor((spot.x / 100) * GRID_SIZE)
    const spotGY = Math.floor((spot.y / 100) * GRID_SIZE)
    const gridCellR = Math.ceil(normalizedRadius / (100 / GRID_SIZE))

    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const cellCenterX = (gx + 0.5) * (100 / GRID_SIZE)
        const cellCenterY = (gy + 0.5) * (100 / GRID_SIZE)
        const dx = cellCenterX - spot.x
        const dy = cellCenterY - spot.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < spot.radius * 0.6) {
          grid[gy][gx] += 1
        }
        if (Math.abs(gx - spotGX) <= gridCellR && Math.abs(gy - spotGY) <= gridCellR) {
          grid[gy][gx] = Math.max(grid[gy][gx], 1)
        }
      }
    }
  }

  let coveredCells = 0
  const counts: number[] = []
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      if (grid[gy][gx] > 0) {
        coveredCells++
        counts.push(grid[gy][gx])
      }
    }
  }

  const coverage = coveredCells / (GRID_SIZE * GRID_SIZE)
  let coverageScore: number
  if (coverage >= TARGET_COVERAGE_MIN && coverage <= TARGET_COVERAGE_MAX) {
    coverageScore = 90 + 10 * (1 - Math.abs(coverage - (TARGET_COVERAGE_MIN + TARGET_COVERAGE_MAX) / 2) / ((TARGET_COVERAGE_MAX - TARGET_COVERAGE_MIN) / 2))
  } else if (coverage < TARGET_COVERAGE_MIN) {
    coverageScore = 90 * (coverage / TARGET_COVERAGE_MIN)
  } else {
    const excess = coverage - TARGET_COVERAGE_MAX
    coverageScore = Math.max(30, 90 - excess * 250)
  }

  if (counts.length <= 1) {
    return Math.round(coverageScore * 0.6)
  }

  const mean = counts.reduce((a, b) => a + b, 0) / counts.length
  const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length
  const stdDev = Math.sqrt(variance)
  const cv = stdDev / (mean || 1)
  const uniformityScore = Math.max(0, 100 - cv * 45)

  return Math.round(coverageScore * 0.55 + uniformityScore * 0.45)
}

export function calculateSymmetry(shape: number[]): number {
  if (shape.length < 4) return 50

  const n = shape.length
  const halfN = Math.floor(n / 2)
  let mse = 0

  for (let i = 0; i < halfN; i++) {
    const left = shape[i]
    const right = shape[n - 1 - i]
    mse += (left - right) ** 2
  }
  mse /= halfN

  const maxR = Math.max(...shape)
  const minR = Math.min(...shape)
  const range = Math.max(1, maxR - minR)
  const normalizedMse = mse / (range * range)

  let profileMse = 0
  const avgR = shape.reduce((a, b) => a + b, 0) / n
  for (let i = 1; i < n - 1; i++) {
    const expected = (shape[i - 1] + shape[i + 1]) / 2
    profileMse += (shape[i] - expected) ** 2
  }
  profileMse /= (n - 2)
  const smoothness = Math.max(0, 100 - profileMse * 0.5)

  const symmetryBase = Math.max(0, 100 - normalizedMse * 800)
  return Math.round(symmetryBase * 0.65 + smoothness * 0.35)
}

interface HSV {
  h: number
  s: number
  v: number
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
      case g: h = ((b - r) / d + 2) * 60; break
      case b: h = ((r - g) / d + 4) * 60; break
    }
  }
  return { h, s, v }
}

function hueDistance(h1: number, h2: number): number {
  let diff = Math.abs(h1 - h2)
  if (diff > 180) diff = 360 - diff
  return diff
}

export function calculateColorMatch(glazeSpots: GlazeSpot[]): number {
  if (glazeSpots.length === 0) return 30
  if (glazeSpots.length === 1) return 75

  const colors = glazeSpots.map(s => {
    const rgb = hexToRgb(s.color)
    return rgbToHsv(rgb.r, rgb.g, rgb.b)
  })

  const saturatedColors = colors.filter(c => c.s > 0.15)
  if (saturatedColors.length <= 1) return 70

  let harmonyScore = 0
  let comparisons = 0

  for (let i = 0; i < saturatedColors.length; i++) {
    for (let j = i + 1; j < saturatedColors.length; j++) {
      const dist = hueDistance(saturatedColors[i].h, saturatedColors[j].h)
      let score = 0
      if (dist < 25 || (dist > 335)) {
        score = 70
      } else if ((dist >= 25 && dist <= 45) || (dist >= 315 && dist <= 335)) {
        score = 85
      } else if ((dist >= 165 && dist <= 195)) {
        score = 92
      } else if ((dist >= 90 && dist <= 140) || (dist >= 220 && dist <= 270)) {
        score = 80
      } else if ((dist >= 45 && dist < 90) || (dist >= 270 && dist < 315)) {
        score = 65
      } else {
        score = 50
      }
      harmonyScore += score
      comparisons++
    }
  }

  const avgHarmony = comparisons > 0 ? harmonyScore / comparisons : 60

  const uniqueHues = new Set<number>()
  for (const c of saturatedColors) {
    const bucket = Math.round(c.h / 30) * 30
    uniqueHues.add(bucket)
  }
  const varietyBonus = Math.min(15, uniqueHues.size * 4)

  const colorCount = glazeSpots.length
  const countScore = colorCount <= 2 ? 15 : colorCount <= 5 ? 25 : colorCount <= 8 ? 20 : 10

  return Math.min(100, Math.round(avgHarmony * 0.6 + varietyBonus + countScore * 0.5))
}

export function calculateTotalScore(
  uniformity: number,
  symmetry: number,
  colorMatch: number
): number {
  return Math.round(uniformity * 0.4 + symmetry * 0.3 + colorMatch * 0.3)
}

export function computeAllScores(
  glazeSpots: GlazeSpot[],
  shape: number[]
): Scores {
  const uniformity = calculateUniformity(glazeSpots, shape)
  const symmetry = calculateSymmetry(shape)
  const colorMatch = calculateColorMatch(glazeSpots)
  const total = calculateTotalScore(uniformity, symmetry, colorMatch)
  return { uniformity, symmetry, colorMatch, total }
}

export function renderRadarChart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  scores: { label: string; value: number }[]
): void {
  const n = scores.length
  const angleStep = (Math.PI * 2) / n
  const startAngle = -Math.PI / 2

  for (let level = 1; level <= 4; level++) {
    const r = (radius * level) / 4
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const idx = i % n
      const angle = startAngle + idx * angleStep
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(200,180,160,0.15)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = 'rgba(200,180,160,0.2)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const idx = i % n
    const angle = startAngle + idx * angleStep
    const value = Math.max(0, Math.min(100, scores[idx].value))
    const r = (radius * value) / 100
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,140,0,0.25)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,140,0,0.85)'
  ctx.lineWidth = 2
  ctx.stroke()

  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep
    const value = Math.max(0, Math.min(100, scores[i].value))
    const r = (radius * value) / 100
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#ff8c00'
    ctx.fill()
  }

  ctx.font = 'bold 11px "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep
    const labelR = radius + 18
    const x = cx + Math.cos(angle) * labelR
    const y = cy + Math.sin(angle) * labelR
    ctx.fillStyle = 'rgba(220,200,180,0.9)'
    ctx.fillText(scores[i].label, x, y)
    const valY = y + 14
    ctx.fillStyle = '#ff8c00'
    ctx.font = 'bold 13px "PingFang SC", sans-serif'
    ctx.fillText(String(scores[i].value), x, valY)
    ctx.font = 'bold 11px "PingFang SC", sans-serif'
  }
}
