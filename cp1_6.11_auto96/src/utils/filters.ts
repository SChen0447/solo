import type { FilterConfig } from '../types'

export function applyBlur(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const result = new Uint8ClampedArray(data)
  const r = Math.floor(radius)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4
            rSum += data[idx]
            gSum += data[idx + 1]
            bSum += data[idx + 2]
            count++
          }
        }
      }
      const idx = (y * width + x) * 4
      result[idx] = rSum / count
      result[idx + 1] = gSum / count
      result[idx + 2] = bSum / count
    }
  }
  return new ImageData(result, width, height)
}

export function applyGlow(imageData: ImageData, intensity: number): ImageData {
  if (intensity <= 0) return imageData
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const result = new Uint8ClampedArray(data)
  const radius = 3

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4
            rSum += data[idx]
            gSum += data[idx + 1]
            bSum += data[idx + 2]
            count++
          }
        }
      }
      const idx = (y * width + x) * 4
      result[idx] = Math.min(255, data[idx] + (rSum / count - data[idx]) * intensity)
      result[idx + 1] = Math.min(255, data[idx + 1] + (gSum / count - data[idx + 1]) * intensity)
      result[idx + 2] = Math.min(255, data[idx + 2] + (bSum / count - data[idx + 2]) * intensity)
    }
  }
  return new ImageData(result, width, height)
}

export function applyMosaic(imageData: ImageData, blockSize: number): ImageData {
  if (blockSize <= 1) return imageData
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const result = new Uint8ClampedArray(data)

  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0
      const endY = Math.min(y + blockSize, height)
      const endX = Math.min(x + blockSize, width)
      for (let dy = y; dy < endY; dy++) {
        for (let dx = x; dx < endX; dx++) {
          const idx = (dy * width + dx) * 4
          rSum += data[idx]
          gSum += data[idx + 1]
          bSum += data[idx + 2]
          count++
        }
      }
      const rAvg = rSum / count
      const gAvg = gSum / count
      const bAvg = bSum / count
      for (let dy = y; dy < endY; dy++) {
        for (let dx = x; dx < endX; dx++) {
          const idx = (dy * width + dx) * 4
          result[idx] = rAvg
          result[idx + 1] = gAvg
          result[idx + 2] = bAvg
        }
      }
    }
  }
  return new ImageData(result, width, height)
}

export function applyPixelate(imageData: ImageData, levels: number): ImageData {
  if (levels <= 0 || levels >= 256) return imageData
  const data = imageData.data
  const step = 256 / levels
  const result = new Uint8ClampedArray(data.length)

  for (let i = 0; i < data.length; i += 4) {
    result[i] = Math.round(data[i] / step) * step
    result[i + 1] = Math.round(data[i + 1] / step) * step
    result[i + 2] = Math.round(data[i + 2] / step) * step
    result[i + 3] = data[i + 3]
  }
  return new ImageData(result, imageData.width, imageData.height)
}

export function applyNeonEdge(imageData: ImageData): ImageData {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const result = new Uint8ClampedArray(data.length)

  const gray = new Float32Array(width * height)
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const gx = gray[idx - width - 1] - gray[idx - width + 1] +
                 2 * gray[idx - 1] - 2 * gray[idx + 1] +
                 gray[idx + width - 1] - gray[idx + width + 1]
      const gy = gray[idx - width - 1] + 2 * gray[idx - width] + gray[idx - width + 1] -
                 gray[idx + width - 1] - 2 * gray[idx + width] - gray[idx + width + 1]
      const edge = Math.sqrt(gx * gx + gy * gy)
      const pixelIdx = idx * 4
      if (edge > 30) {
        result[pixelIdx] = Math.min(255, edge * 2)
        result[pixelIdx + 1] = Math.min(255, edge * 1.5)
        result[pixelIdx + 2] = 255
        result[pixelIdx + 3] = 255
      } else {
        result[pixelIdx + 3] = 0
      }
    }
  }
  return new ImageData(result, width, height)
}

export function applyAllFilters(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, filters: FilterConfig): void {
  if (!filters.blur.enabled && !filters.glow.enabled && !filters.mosaic.enabled &&
      !filters.pixelate.enabled && !filters.neonEdge.enabled) {
    return
  }

  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  if (filters.mosaic.enabled) {
    imageData = applyMosaic(imageData, filters.mosaic.blockSize)
  }
  if (filters.pixelate.enabled) {
    imageData = applyPixelate(imageData, filters.pixelate.levels)
  }
  if (filters.blur.enabled) {
    imageData = applyBlur(imageData, filters.blur.radius)
  }
  if (filters.glow.enabled) {
    imageData = applyGlow(imageData, filters.glow.intensity)
  }

  ctx.putImageData(imageData, 0, 0)

  if (filters.neonEdge.enabled) {
    const edgeData = applyNeonEdge(imageData)
    ctx.globalCompositeOperation = 'screen'
    ctx.putImageData(edgeData, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
  }
}
