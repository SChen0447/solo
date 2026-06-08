export interface RGBColor {
  r: number
  g: number
  b: number
}

export interface PixelGrid {
  colors: string[][]
  width: number
  height: number
}

export interface QuantizedResult {
  grid: PixelGrid
  palette: string[]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

function getColorRange(pixels: RGBColor[]): { channel: 'r' | 'g' | 'b'; min: number; max: number } {
  let rMin = 255, rMax = 0
  let gMin = 255, gMax = 0
  let bMin = 255, bMax = 0

  for (const pixel of pixels) {
    rMin = Math.min(rMin, pixel.r)
    rMax = Math.max(rMax, pixel.r)
    gMin = Math.min(gMin, pixel.g)
    gMax = Math.max(gMax, pixel.g)
    bMin = Math.min(bMin, pixel.b)
    bMax = Math.max(bMax, pixel.b)
  }

  const rRange = rMax - rMin
  const gRange = gMax - gMin
  const bRange = bMax - bMin

  if (rRange >= gRange && rRange >= bRange) {
    return { channel: 'r', min: rMin, max: rMax }
  } else if (gRange >= bRange) {
    return { channel: 'g', min: gMin, max: gMax }
  } else {
    return { channel: 'b', min: bMin, max: bMax }
  }
}

function medianCut(pixels: RGBColor[], numColors: number): RGBColor[] {
  if (numColors <= 1 || pixels.length <= 1) {
    let rSum = 0, gSum = 0, bSum = 0
    for (const pixel of pixels) {
      rSum += pixel.r
      gSum += pixel.g
      bSum += pixel.b
    }
    const count = pixels.length || 1
    return [{
      r: Math.round(rSum / count),
      g: Math.round(gSum / count),
      b: Math.round(bSum / count)
    }]
  }

  const range = getColorRange(pixels)
  const channel = range.channel

  pixels.sort((a, b) => a[channel] - b[channel])

  const midIndex = Math.floor(pixels.length / 2)
  const leftHalf = pixels.slice(0, midIndex)
  const rightHalf = pixels.slice(midIndex)

  const leftColors = medianCut(leftHalf, Math.floor(numColors / 2))
  const rightColors = medianCut(rightHalf, Math.ceil(numColors / 2))

  return [...leftColors, ...rightColors]
}

function findClosestColor(pixel: RGBColor, palette: RGBColor[]): number {
  let minDistance = Infinity
  let closestIndex = 0

  for (let i = 0; i < palette.length; i++) {
    const dr = pixel.r - palette[i].r
    const dg = pixel.g - palette[i].g
    const db = pixel.b - palette[i].b
    const distance = dr * dr + dg * dg + db * db

    if (distance < minDistance) {
      minDistance = distance
      closestIndex = i
    }
  }

  return closestIndex
}

export function imageDataToGrid(imageData: ImageData, gridSize: number): PixelGrid {
  const { width, height, data } = imageData
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  canvas.width = gridSize
  canvas.height = gridSize

  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')!
  tempCanvas.width = width
  tempCanvas.height = height
  tempCtx.putImageData(imageData, 0, 0)

  ctx.drawImage(tempCanvas, 0, 0, gridSize, gridSize)
  const resizedData = ctx.getImageData(0, 0, gridSize, gridSize).data

  const colors: string[][] = []

  for (let y = 0; y < gridSize; y++) {
    const row: string[] = []
    for (let x = 0; x < gridSize; x++) {
      const index = (y * gridSize + x) * 4
      const r = resizedData[index]
      const g = resizedData[index + 1]
      const b = resizedData[index + 2]
      row.push(rgbToHex(r, g, b))
    }
    colors.push(row)
  }

  return { colors, width: gridSize, height: gridSize }
}

export function quantizeColors(grid: PixelGrid, numColors: number = 16): QuantizedResult {
  const pixels: RGBColor[] = []

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      pixels.push(hexToRgb(grid.colors[y][x]))
    }
  }

  const quantizedPalette = medianCut(pixels, numColors)
  const hexPalette = quantizedPalette.map(c => rgbToHex(c.r, c.g, c.b))

  const quantizedColors: string[][] = []
  for (let y = 0; y < grid.height; y++) {
    const row: string[] = []
    for (let x = 0; x < grid.width; x++) {
      const pixel = hexToRgb(grid.colors[y][x])
      const closestIndex = findClosestColor(pixel, quantizedPalette)
      row.push(hexPalette[closestIndex])
    }
    quantizedColors.push(row)
  }

  return {
    grid: { colors: quantizedColors, width: grid.width, height: grid.height },
    palette: hexPalette
  }
}

export async function convertImageToPixelPuzzle(
  imageFile: File,
  gridSize: number,
  paletteSize: number = 16
): Promise<QuantizedResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(imageFile)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      const size = Math.max(img.width, img.height)
      canvas.width = size
      canvas.height = size

      const offsetX = (size - img.width) / 2
      const offsetY = (size - img.height) / 2

      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, offsetX, offsetY)

      const imageData = ctx.getImageData(0, 0, size, size)
      const grid = imageDataToGrid(imageData, gridSize)
      const result = quantizeColors(grid, paletteSize)

      URL.revokeObjectURL(url)
      resolve(result)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }

    img.src = url
  })
}

export function exportGridToPng(
  colors: string[][],
  cellSize: number = 10
): string {
  const height = colors.length
  const width = colors[0]?.length || 0

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  canvas.width = width * cellSize
  canvas.height = height * cellSize

  ctx.imageSmoothingEnabled = false

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = colors[y][x]
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
    }
  }

  return canvas.toDataURL('image/png')
}
