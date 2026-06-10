import { ref, reactive } from 'vue'

export interface PaletteColor {
  hex: string
  locked: boolean
}

export interface ColorPalette {
  id: string
  colors: PaletteColor[]
  savedAt: number
  thumbnail?: string
}

const HISTORY_KEY = 'color-palette-history'
const MAX_HISTORY = 5

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16)
  }
}

function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
  let rr = r / 255
  let gg = g / 255
  let bb = b / 255
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92
  rr *= 100
  gg *= 100
  bb *= 100
  return {
    x: rr * 0.4124 + gg * 0.3576 + bb * 0.1805,
    y: rr * 0.2126 + gg * 0.7152 + bb * 0.0722,
    z: rr * 0.0193 + gg * 0.1192 + bb * 0.9505
  }
}

function xyzToLab(x: number, y: number, z: number): { l: number; a: number; b: number } {
  const refX = 95.047
  const refY = 100.0
  const refZ = 108.883
  let xx = x / refX
  let yy = y / refY
  let zz = z / refZ
  xx = xx > 0.008856 ? Math.pow(xx, 1 / 3) : 7.787 * xx + 16 / 116
  yy = yy > 0.008856 ? Math.pow(yy, 1 / 3) : 7.787 * yy + 16 / 116
  zz = zz > 0.008856 ? Math.pow(zz, 1 / 3) : 7.787 * zz + 16 / 116
  return {
    l: 116 * yy - 16,
    a: 500 * (xx - yy),
    b: 200 * (yy - zz)
  }
}

export function deltaE(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1)
  const rgb2 = hexToRgb(hex2)
  const xyz1 = rgbToXyz(rgb1.r, rgb1.g, rgb1.b)
  const xyz2 = rgbToXyz(rgb2.r, rgb2.g, rgb2.b)
  const lab1 = xyzToLab(xyz1.x, xyz1.y, xyz1.z)
  const lab2 = xyzToLab(xyz2.x, xyz2.y, xyz2.z)
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  )
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return `今天 ${h}:${m}`
  }
  const y = date.getFullYear()
  const mo = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${mo}-${d} ${h}:${m}`
}

export function useColorPalette() {
  const defaultColors: PaletteColor[] = [
    { hex: '#5b6abf', locked: false },
    { hex: '#7c8dd6', locked: false },
    { hex: '#3d4a8c', locked: false },
    { hex: '#eef2ff', locked: false },
    { hex: '#a0a8c9', locked: false }
  ]

  const currentPalette = reactive<ColorPalette>({
    id: '',
    colors: defaultColors.map(c => ({ ...c })),
    savedAt: 0
  })

  const thumbnail = ref<string>('')
  const history = ref<ColorPalette[]>([])
  const toast = ref('')
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast(message: string) {
    toast.value = message
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.value = ''
    }, 1500)
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        history.value = JSON.parse(raw)
      }
    } catch (e) {
      console.error('Failed to load history:', e)
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
    } catch (e) {
      console.error('Failed to save history:', e)
    }
  }

  function setExtractedColors(colors: string[], thumb: string) {
    thumbnail.value = thumb
    colors.forEach((color, index) => {
      if (!currentPalette.colors[index].locked) {
        currentPalette.colors[index].hex = color
      }
    })
    let targetIdx = 0
    for (let i = 0; i < 5; i++) {
      if (!currentPalette.colors[i].locked && targetIdx < colors.length) {
        currentPalette.colors[i].hex = colors[targetIdx]
        targetIdx++
      }
    }
    let srcIdx = 0
    for (let i = 0; i < 5; i++) {
      if (!currentPalette.colors[i].locked) {
        while (srcIdx < colors.length) {
          const isUsed = currentPalette.colors.some(c => c.hex.toLowerCase() === colors[srcIdx].toLowerCase())
          if (!isUsed || currentPalette.colors[i].hex.toLowerCase() === colors[srcIdx].toLowerCase()) {
            currentPalette.colors[i].hex = colors[srcIdx]
            srcIdx++
            break
          }
          srcIdx++
        }
      }
    }
    currentPalette.colors.forEach((c, i) => {
      if (!c.locked && i < colors.length) {
        c.hex = colors[i]
      }
    })
  }

  function updateColor(index: number, hex: string) {
    if (index >= 0 && index < currentPalette.colors.length) {
      currentPalette.colors[index].hex = hex
    }
  }

  function toggleLock(index: number) {
    if (index >= 0 && index < currentPalette.colors.length) {
      currentPalette.colors[index].locked = !currentPalette.colors[index].locked
    }
  }

  function savePalette() {
    const newPalette: ColorPalette = {
      id: generateId(),
      colors: currentPalette.colors.map(c => ({ ...c })),
      savedAt: Date.now(),
      thumbnail: thumbnail.value
    }
    history.value.unshift(newPalette)
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(0, MAX_HISTORY)
    }
    saveHistory()
    showToast('色板已保存')
  }

  function loadPalette(palette: ColorPalette) {
    currentPalette.id = palette.id
    currentPalette.savedAt = palette.savedAt
    currentPalette.colors = palette.colors.map(c => ({ ...c }))
    if (palette.thumbnail) {
      thumbnail.value = palette.thumbnail
    }
  }

  function getGradientColors(): string[] {
    return currentPalette.colors.map(c => c.hex)
  }

  function getColorWithAlpha(hex: string, alpha: number): string {
    const rgb = hexToRgb(hex)
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
  }

  function findDifferentIndices(palette1: ColorPalette, palette2: ColorPalette): number[] {
    const indices: number[] = []
    const len = Math.min(palette1.colors.length, palette2.colors.length)
    for (let i = 0; i < len; i++) {
      if (deltaE(palette1.colors[i].hex, palette2.colors[i].hex) > 20) {
        indices.push(i)
      }
    }
    return indices
  }

  loadHistory()

  return {
    currentPalette,
    thumbnail,
    history,
    toast,
    setExtractedColors,
    updateColor,
    toggleLock,
    savePalette,
    loadPalette,
    getGradientColors,
    getColorWithAlpha,
    findDifferentIndices,
    formatTime
  }
}
