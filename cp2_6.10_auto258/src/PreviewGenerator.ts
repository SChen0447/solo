interface PreviewResult {
  svgBase64: string
  warmthIndex: number
  contrastScore: number
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '')
  const bigint = parseInt(
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned,
    16
  )
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1)
  const rgb2 = hexToRgb(hex2)
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b)
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function calculateWarmthIndex(colors: string[]): number {
  if (colors.length === 0) return 0
  let totalWarmth = 0
  for (const hex of colors) {
    const rgb = hexToRgb(hex)
    const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b)
    let hueWarmth = 0
    if (h >= 0 && h < 60) {
      hueWarmth = 1 - h / 120
    } else if (h >= 300 && h <= 360) {
      hueWarmth = 1 - (360 - h) / 120
    } else if (h >= 180 && h < 240) {
      hueWarmth = -(1 - (h - 180) / 120)
    } else if (h >= 240 && h < 300) {
      hueWarmth = -((h - 240) / 120)
    }
    const satFactor = s / 100
    totalWarmth += hueWarmth * 0.7 * satFactor + 0.3 * satFactor
  }
  const avgWarmth = totalWarmth / colors.length
  return Math.round(Math.max(0, Math.min(100, (avgWarmth + 1) * 50)))
}

export function calculateContrastScore(colors: string[]): number {
  if (colors.length < 2) return 0
  let minContrast = Infinity
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const ratio = getContrastRatio(colors[i], colors[j])
      if (ratio < minContrast) minContrast = ratio
    }
  }
  const score = Math.min(100, Math.round((minContrast / 21) * 100))
  return score
}

function generateNordicPattern(colors: string[]): string {
  const c = colors.length === 4 ? colors : [...colors, ...colors].slice(0, 4)
  const stripes = [
    { y: 0, h: 40, color: c[0] },
    { y: 40, h: 20, color: c[1] },
    { y: 60, h: 30, color: c[2] },
    { y: 90, h: 20, color: c[3] },
    { y: 110, h: 40, color: c[1] },
    { y: 150, h: 20, color: c[0] },
    { y: 170, h: 30, color: c[3] },
    { y: 200, h: 40, color: c[2] }
  ]
  let stripeSvg = ''
  for (const s of stripes) {
    stripeSvg += `<rect x="0" y="${s.y}" width="400" height="${s.h}" fill="${s.color}" />`
  }
  let diamondSvg = ''
  const diamondRows = [
    { y: 20, color: c[3] },
    { y: 70, color: c[0] },
    { y: 120, color: c[2] },
    { y: 180, color: c[1] }
  ]
  for (const row of diamondRows) {
    for (let x = 20; x < 400; x += 80) {
      diamondSvg += `<polygon points="${x},${row.y} ${x + 20},${row.y + 15} ${x},${row.y + 30} ${x - 20},${row.y + 15}" fill="${row.color}" opacity="0.6" />`
    }
  }
  return `${stripeSvg}${diamondSvg}`
}

export function generatePreview(colors: string[]): PreviewResult {
  const safeColors = colors.length > 0 ? colors : ['#f5f0e8', '#ffffff', '#c9b8a5', '#8a7968']
  const pattern = generateNordicPattern(safeColors)
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
  <rect width="400" height="240" fill="${safeColors[0]}" />
  ${pattern}
</svg>`
  const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  const warmthIndex = calculateWarmthIndex(safeColors)
  const contrastScore = calculateContrastScore(safeColors)
  return { svgBase64, warmthIndex, contrastScore }
}
