import type { ColorItem } from '../types'

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 0, s: 0, l: 0 }
  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

export function generatePalette(baseHue: number, existingColors: ColorItem[] = []): ColorItem[] {
  const step = 360 / 6
  const saturation = 70
  const lightness = 80
  const palette: ColorItem[] = []

  for (let i = 0; i < 6; i++) {
    if (existingColors[i] && existingColors[i].locked) {
      palette.push({ ...existingColors[i] })
    } else {
      const hue = (baseHue + i * step) % 360
      const hex = hslToHex(hue, saturation, lightness)
      palette.push({
        hex,
        locked: false,
        h: hue,
        s: saturation,
        l: lightness
      })
    }
  }
  return palette
}

export function generateDefaultPalette(): ColorItem[] {
  return generatePalette(Math.floor(Math.random() * 360))
}

export function getContrastColor(hex: string): string {
  const { l } = hexToHsl(hex)
  return l > 50 ? '#333333' : '#ffffff'
}

export function darkenColor(hex: string, amount: number = 15): string {
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, s, Math.max(0, l - amount))
}

export function lightenColor(hex: string, amount: number = 15): string {
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, s, Math.min(100, l + amount))
}
