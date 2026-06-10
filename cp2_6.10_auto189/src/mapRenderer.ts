import type { Itinerary, Spot } from './types'

const DAY_COLORS = ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f']
const MARKER_RADIUS = 10
const GRID_SIZE = 50
const GRID_COLOR = 'rgba(212, 197, 169, 0.3)'
const MAP_BG = '#f4f1de'
const MAP_PADDING = 60

export const CITY_LANDMARKS: Record<string, { name: string; lat: number; lng: number }[]> = {
  北京: [
    { name: '故宫', lat: 39.9163, lng: 116.3972 },
    { name: '天坛', lat: 39.8822, lng: 116.4066 },
    { name: '长城', lat: 40.4319, lng: 116.5704 },
    { name: '颐和园', lat: 39.9999, lng: 116.2755 }
  ],
  上海: [
    { name: '外滩', lat: 31.2397, lng: 121.4908 },
    { name: '东方明珠', lat: 31.2397, lng: 121.4998 },
    { name: '豫园', lat: 31.2272, lng: 121.4925 },
    { name: '南京路', lat: 31.2359, lng: 121.4787 }
  ],
  成都: [
    { name: '宽窄巷子', lat: 30.6738, lng: 104.0619 },
    { name: '锦里', lat: 30.6474, lng: 104.0446 },
    { name: '杜甫草堂', lat: 30.6616, lng: 104.0228 },
    { name: '大熊猫基地', lat: 30.7376, lng: 104.1479 }
  ],
  杭州: [
    { name: '西湖', lat: 30.2587, lng: 120.1305 },
    { name: '灵隐寺', lat: 30.2407, lng: 120.0989 },
    { name: '雷峰塔', lat: 30.2317, lng: 120.1476 },
    { name: '宋城', lat: 30.1938, lng: 120.1087 }
  ],
  西安: [
    { name: '兵马俑', lat: 34.3848, lng: 109.2779 },
    { name: '大雁塔', lat: 34.2224, lng: 108.9468 },
    { name: '古城墙', lat: 34.2547, lng: 108.9445 },
    { name: '回民街', lat: 34.2624, lng: 108.9401 }
  ],
  默认: [
    { name: '中央公园', lat: 30.0, lng: 105.0 },
    { name: '文化广场', lat: 30.02, lng: 105.03 },
    { name: '博物馆', lat: 29.98, lng: 105.05 },
    { name: '古城区', lat: 30.05, lng: 104.98 }
  ]
}

export function getRandomLandmark(city?: string): { name: string; lat: number; lng: number } {
  const landmarks = CITY_LANDMARKS[city || '默认'] || CITY_LANDMARKS['默认']
  const index = Math.floor(Math.random() * landmarks.length)
  return landmarks[index]
}

export function generateCoordinates(index: number, total: number): { lat: number; lng: number } {
  const baseLat = 30.0
  const baseLng = 105.0
  const angle = (index / Math.max(total, 1)) * Math.PI * 2
  const radius = 0.08 + (index % 3) * 0.03
  return {
    lat: baseLat + Math.sin(angle) * radius + (Math.random() - 0.5) * 0.02,
    lng: baseLng + Math.cos(angle) * radius + (Math.random() - 0.5) * 0.02
  }
}

function getSpotAbbreviation(name: string): string {
  if (!name) return '?'
  const chineseMatch = name.match(/[\u4e00-\u9fa5]/)
  if (chineseMatch) {
    return name.replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 1) || name[0]
  }
  return name.slice(0, 2).toUpperCase()
}

function latLngToCanvas(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number
): { x: number; y: number } {
  const latRange = bounds.maxLat - bounds.minLat || 1
  const lngRange = bounds.maxLng - bounds.minLng || 1
  const x = MAP_PADDING + ((lng - bounds.minLng) / lngRange) * (width - MAP_PADDING * 2)
  const y = height - MAP_PADDING - ((lat - bounds.minLat) / latRange) * (height - MAP_PADDING * 2)
  return { x, y }
}

function computeBounds(itinerary: Itinerary): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const day of itinerary) {
    for (const spot of day.spots) {
      if (spot.lat < minLat) minLat = spot.lat
      if (spot.lat > maxLat) maxLat = spot.lat
      if (spot.lng < minLng) minLng = spot.lng
      if (spot.lng > maxLng) maxLng = spot.lng
    }
  }

  if (minLat === Infinity) {
    minLat = 29.9
    maxLat = 30.1
    minLng = 104.9
    maxLng = 105.1
  }

  const latPad = (maxLat - minLat) * 0.15 || 0.05
  const lngPad = (maxLng - minLng) * 0.15 || 0.05

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 1

  for (let x = 0; x <= width; x += GRID_SIZE) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y <= height; y += GRID_SIZE) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

function drawCurvedPath(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string
): void {
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const offset = dist * 0.15
  const perpX = -dy / (dist || 1)
  const perpY = dx / (dist || 1)
  const ctrlX = midX + perpX * offset
  const ctrlY = midY + perpY * offset

  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y)
  ctx.stroke()

  const angle = Math.atan2(to.y - ctrlY, to.x - ctrlX)
  const arrowSize = 12

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(
    to.x - arrowSize * Math.cos(angle - Math.PI / 6),
    to.y - arrowSize * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    to.x - arrowSize * Math.cos(angle + Math.PI / 6),
    to.y - arrowSize * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  abbreviation: string,
  label?: string
): void {
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, MARKER_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, MARKER_RADIUS, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(abbreviation, x, y)

  if (label) {
    ctx.fillStyle = '#2a2b38'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(label, x, y + MARKER_RADIUS + 6)
  }
}

export function updateMap(
  canvas: HTMLCanvasElement | null,
  itinerary: Itinerary
): void {
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = rect.height

  ctx.fillStyle = MAP_BG
  ctx.fillRect(0, 0, width, height)

  drawGrid(ctx, width, height)

  const bounds = computeBounds(itinerary)

  itinerary.forEach((day, dayIndex) => {
    if (day.spots.length < 1) return

    const color = DAY_COLORS[dayIndex % DAY_COLORS.length]
    const positions: { x: number; y: number }[] = []

    day.spots.forEach((spot) => {
      const pos = latLngToCanvas(spot.lat, spot.lng, bounds, width, height)
      positions.push(pos)
    })

    for (let i = 0; i < positions.length - 1; i++) {
      drawCurvedPath(ctx, positions[i], positions[i + 1], color)
    }

    day.spots.forEach((spot: Spot, idx: number) => {
      const pos = positions[idx]
      const abbr = getSpotAbbreviation(spot.name)
      drawMarker(ctx, pos.x, pos.y, color, abbr, spot.name)
    })
  })

  if (itinerary.length > 0) {
    const legendY = height - 30
    let legendX = MAP_PADDING

    ctx.font = '12px sans-serif'
    itinerary.forEach((day, dayIndex) => {
      const color = DAY_COLORS[dayIndex % DAY_COLORS.length]
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(legendX + 8, legendY, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#2a2b38'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(day.date, legendX + 20, legendY)
      legendX += 100
    })
  }
}
