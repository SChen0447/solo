export interface Gradient {
  id: string
  name: string
  startColor: string
  endColor: string
  angle: number
}

export const presets: Gradient[] = [
  {
    id: 'sunrise-orange',
    name: '日出橙',
    startColor: '#FF6B6B',
    endColor: '#FFE66D',
    angle: 135,
  },
  {
    id: 'ocean-blue',
    name: '海洋蓝',
    startColor: '#4FACFE',
    endColor: '#00F2FE',
    angle: 135,
  },
  {
    id: 'forest-green',
    name: '森林绿',
    startColor: '#11998E',
    endColor: '#38EF7D',
    angle: 135,
  },
  {
    id: 'purple-sunset',
    name: '紫霞',
    startColor: '#A18CD1',
    endColor: '#FBC2EB',
    angle: 135,
  },
  {
    id: 'flame-red',
    name: '火焰红',
    startColor: '#F12711',
    endColor: '#F5AF19',
    angle: 135,
  },
  {
    id: 'cherry-blossom',
    name: '樱花粉',
    startColor: '#FF9A9E',
    endColor: '#FECFEF',
    angle: 135,
  },
  {
    id: 'deep-space',
    name: '深空蓝',
    startColor: '#0F2027',
    endColor: '#2C5364',
    angle: 135,
  },
  {
    id: 'mint-fresh',
    name: '薄荷清新',
    startColor: '#43C6AC',
    endColor: '#F8FFAE',
    angle: 135,
  },
]

export function getGradientCSS(startColor: string, endColor: string, angle: number): string {
  return `background: linear-gradient(${angle}deg, ${startColor}, ${endColor})`
}

export function hslToHex(h: number, s: number = 70, l: number = 60): string {
  const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l / 100 - c / 2
  let r = 0, g = 0, b = 0

  if (h >= 0 && h < 60) { r = c; g = x; b = 0 }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0 }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255)
    return hex.toString(16).padStart(2, '0')
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h *= 60
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}
