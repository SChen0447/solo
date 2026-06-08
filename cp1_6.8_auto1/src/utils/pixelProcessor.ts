import type { PixelGrid, PixelColor } from '@/types'

export function createEmptyGrid(width: number, height: number): PixelGrid {
  const pixels: PixelColor[][] = []
  for (let y = 0; y < height; y++) {
    const row: PixelColor[] = []
    for (let x = 0; x < width; x++) {
      row.push(null)
    }
    pixels.push(row)
  }
  return { width, height, pixels }
}

export function imageDataToPixelGrid(
  imageData: ImageData,
  gridSize: number
): PixelGrid {
  const { data, width, height } = imageData
  const grid = createEmptyGrid(gridSize, gridSize)

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const srcX = Math.floor((x / gridSize) * width)
      const srcY = Math.floor((y / gridSize) * height)
      const idx = (srcY * width + srcX) * 4

      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]

      if (a < 128) {
        grid.pixels[y][x] = null
      } else {
        grid.pixels[y][x] = rgbToHex(r, g, b)
      }
    }
  }

  return grid
}

export function extractPalette(grid: PixelGrid, count: number = 8): string[] {
  const colorCounts: Map<string, number> = new Map()

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const color = grid.pixels[y][x]
      if (color) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1)
      }
    }
  }

  const sorted = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1])
  return sorted.slice(0, count).map(([color]) => color)
}

export function generateThemedPalette(
  basePalette: string[],
  themeColors: string[]
): string[] {
  if (basePalette.length === 0) {
    return themeColors
  }

  const result: string[] = []
  for (let i = 0; i < Math.max(basePalette.length, themeColors.length); i++) {
    if (i < basePalette.length) {
      result.push(basePalette[i])
    }
    if (i < themeColors.length && result.length < 12) {
      if (!result.includes(themeColors[i])) {
        result.push(themeColors[i])
      }
    }
  }

  return result.slice(0, 12)
}

export function quantizeColor(r: number, g: number, b: number, levels: number = 4): string {
  const step = 255 / (levels - 1)
  const qr = Math.round(Math.round(r / step) * step)
  const qg = Math.round(Math.round(g / step) * step)
  const qb = Math.round(Math.round(b / step) * step)
  return rgbToHex(qr, qg, qb)
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, n)).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

export function cloneGrid(grid: PixelGrid): PixelGrid {
  return {
    width: grid.width,
    height: grid.height,
    pixels: grid.pixels.map(row => [...row])
  }
}

export function rotateGrid(grid: PixelGrid, angle: 90 | 180 | 270): PixelGrid {
  if (angle === 180) {
    const newGrid = cloneGrid(grid)
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        newGrid.pixels[grid.height - 1 - y][grid.width - 1 - x] = grid.pixels[y][x]
      }
    }
    return newGrid
  }

  const newWidth = grid.height
  const newHeight = grid.width
  const newPixels: PixelColor[][] = []

  for (let y = 0; y < newHeight; y++) {
    const row: PixelColor[] = []
    for (let x = 0; x < newWidth; x++) {
      if (angle === 90) {
        row.push(grid.pixels[grid.height - 1 - x][y])
      } else {
        row.push(grid.pixels[x][grid.width - 1 - y])
      }
    }
    newPixels.push(row)
  }

  return { width: newWidth, height: newHeight, pixels: newPixels }
}

export function gridToDataURL(grid: PixelGrid, scale: number = 1): string {
  const canvas = document.createElement('canvas')
  canvas.width = grid.width * scale
  canvas.height = grid.height * scale
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const color = grid.pixels[y][x]
      if (color) {
        ctx.fillStyle = color
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }

  return canvas.toDataURL('image/png')
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function getImageData(img: HTMLImageElement, maxSize: number = 256): ImageData {
  const canvas = document.createElement('canvas')
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
  canvas.width = Math.floor(img.width * scale)
  canvas.height = Math.floor(img.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
