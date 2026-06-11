import type { Stroke, InkPoint } from './inkEngine'

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildPathFromPoints(points: InkPoint[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const p = points[0]
    return `M ${p.x} ${p.y}`
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2
    const yc = (points[i].y + points[i + 1].y) / 2
    d += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`
  }
  const last = points[points.length - 1]
  if (points.length >= 3) {
    const prev = points[points.length - 2]
    d += ` Q ${prev.x} ${prev.y} ${last.x} ${last.y}`
  } else {
    d += ` L ${last.x} ${last.y}`
  }
  return d
}

export function strokesToSVG(
  strokes: Stroke[],
  width: number,
  height: number,
): string {
  const parts: string[] = []
  parts.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>')
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`)
  parts.push('<defs>')
  parts.push('<linearGradient id="paperBg" x1="0%" y1="0%" x2="0%" y2="100%">')
  parts.push('<stop offset="0%" style="stop-color:#f5f0e0;stop-opacity:1" />')
  parts.push('<stop offset="100%" style="stop-color:#e8dcc8;stop-opacity:1" />')
  parts.push('</linearGradient>')
  parts.push('</defs>')
  parts.push(`<rect width="100%" height="100%" fill="url(#paperBg)" />`)

  for (const stroke of strokes) {
    const { points, tool } = stroke
    if (points.length === 0) continue

    if (tool === 'pen' && points.length > 1) {
      const path = buildPathFromPoints(points)
      const avgRadius = points.reduce((s, p) => s + p.radius, 0) / points.length
      parts.push(`<path d="${path}" stroke="#1a1a1a" stroke-width="${avgRadius * 2}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.9" />`)
    } else {
      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        const fill = hexToRgba(p.color, p.opacity)
        parts.push(`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.radius.toFixed(2)}" fill="${fill}" data-pressure="${p.pressure}" data-index="${i}" />`)
      }
      if (points.length > 1) {
        const path = buildPathFromPoints(points)
        parts.push(`<path d="${path}" fill="none" stroke="none" data-stroke-id="${stroke.id}" data-tool="${tool}" />`)
      }
    }
  }

  parts.push('</svg>')
  return parts.join('\n')
}

export function downloadSVG(svgContent: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `ink-calligraphy-${timestamp}.svg`
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
