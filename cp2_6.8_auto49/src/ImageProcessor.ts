export interface AsciiCell {
  char: string
  brightness: number
  color?: string
  r?: number
  g?: number
  b?: number
}

export interface AsciiMatrix {
  width: number
  height: number
  cells: AsciiCell[][]
}

export const DEFAULT_CHARSET = '@%#*+=-:. '
export const MINIMAL_CHARSET = '#.-'
export const GRAPHICAL_CHARSET = '█▓▒░'
export const DEFAULT_WIDTH = 120

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

function quantizeColor(value: number, levels: number): number {
  const step = 256 / levels
  return Math.round(Math.round(value / step) * step)
}

export function quantizeTo256Colors(r: number, g: number, b: number): string {
  const levels = 6
  const qr = Math.min(255, quantizeColor(r, levels))
  const qg = Math.min(255, quantizeColor(g, levels))
  const qb = Math.min(255, quantizeColor(b, levels))
  return rgbToHex(qr, qg, qb)
}

function getBrightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function charForBrightness(brightness: number, charset: string): string {
  const index = Math.floor((brightness / 255) * (charset.length - 1))
  return charset[Math.max(0, Math.min(charset.length - 1, charset.length - 1 - index))]
}

export function resizeImageData(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const offscreen = new OffscreenCanvas(targetWidth, targetHeight)
  const ctx = offscreen.getContext('2d')!
  const srcCanvas = new OffscreenCanvas(imageData.width, imageData.height)
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.putImageData(imageData, 0, 0)
  ctx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight)
  return ctx.getImageData(0, 0, targetWidth, targetHeight)
}

export function imageDataToAscii(
  imageData: ImageData,
  charset: string = DEFAULT_CHARSET,
  colored: boolean = false
): AsciiMatrix {
  const { width, height, data } = imageData
  const cells: AsciiCell[][] = []

  for (let y = 0; y < height; y++) {
    const row: AsciiCell[] = []
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const brightness = getBrightness(r, g, b)
      const char = charForBrightness(brightness, charset)

      const cell: AsciiCell = { char, brightness }
      if (colored) {
        cell.r = r
        cell.g = g
        cell.b = b
        cell.color = quantizeTo256Colors(r, g, b)
      }
      row.push(cell)
    }
    cells.push(row)
  }

  return { width, height, cells }
}

export function calculateScaledDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight
  const charAspectRatio = 2.0
  const width = targetWidth
  const height = Math.max(1, Math.round(width / aspectRatio / charAspectRatio))
  return { width, height }
}

export function loadImageToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = new OffscreenCanvas(img.width, img.height)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      URL.revokeObjectURL(url)
      resolve(imageData)
    }
    img.onerror = reject
    img.src = url
  })
}

export function convertImageToAscii(
  imageData: ImageData,
  targetWidth: number,
  charset: string,
  colored: boolean = false
): AsciiMatrix {
  const { width, height } = calculateScaledDimensions(
    imageData.width,
    imageData.height,
    targetWidth
  )
  const resized = resizeImageData(imageData, width, height)
  return imageDataToAscii(resized, charset, colored)
}
