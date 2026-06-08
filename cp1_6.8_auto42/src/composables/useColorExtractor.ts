import { ref } from 'vue'
import type { ColorItem } from '@/types'
import { rgbToHex, rgbToHsl, generateId } from '@/utils/colorUtils'

export function useColorExtractor() {
  const isExtracting = ref(false)
  const progress = ref(0)

  function samplePixels(imageData: ImageData): { r: number; g: number; b: number }[] {
    const pixels: { r: number; g: number; b: number }[] = []
    const data = imageData.data
    const step = 4

    for (let i = 0; i < data.length; i += step * 4) {
      pixels.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2]
      })
    }

    return pixels
  }

  function kMeans(
    pixels: { r: number; g: number; b: number }[],
    k: number,
    maxIterations: number = 20,
    tolerance: number = 0.05
  ): { r: number; g: number; b: number }[] {
    if (pixels.length === 0) {
      return Array(k).fill({ r: 128, g: 128, b: 128 })
    }

    const centroids: { r: number; g: number; b: number }[] = []
    const step = Math.floor(pixels.length / k)
    for (let i = 0; i < k; i++) {
      centroids.push({ ...pixels[Math.min(i * step, pixels.length - 1)] })
    }

    for (let iter = 0; iter < maxIterations; iter++) {
      const clusters: { r: number; g: number; b: number }[][] = Array.from(
        { length: k },
        () => []
      )

      for (const pixel of pixels) {
        let minDist = Infinity
        let minIndex = 0

        for (let i = 0; i < k; i++) {
          const dist = colorDistance(pixel, centroids[i])
          if (dist < minDist) {
            minDist = dist
            minIndex = i
          }
        }

        clusters[minIndex].push(pixel)
      }

      let maxShift = 0

      for (let i = 0; i < k; i++) {
        if (clusters[i].length === 0) continue

        const newCentroid = averageColor(clusters[i])
        const shift = colorDistance(centroids[i], newCentroid) / 255
        maxShift = Math.max(maxShift, shift)
        centroids[i] = newCentroid
      }

      if (maxShift < tolerance) {
        break
      }
    }

    return centroids.sort((a, b) => {
      const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b
      const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b
      return lumB - lumA
    })
  }

  function colorDistance(
    c1: { r: number; g: number; b: number },
    c2: { r: number; g: number; b: number }
  ): number {
    const dr = c1.r - c2.r
    const dg = c1.g - c2.g
    const db = c1.b - c2.b
    return Math.sqrt(dr * dr + dg * dg + db * db)
  }

  function averageColor(colors: { r: number; g: number; b: number }[]): {
    r: number
    g: number
    b: number
  } {
    let r = 0,
      g = 0,
      b = 0
    for (const c of colors) {
      r += c.r
      g += c.g
      b += c.b
    }
    const n = colors.length
    return {
      r: Math.round(r / n),
      g: Math.round(g / n),
      b: Math.round(b / n)
    }
  }

  async function extractColors(file: File): Promise<ColorItem[]> {
    isExtracting.value = true
    progress.value = 0

    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        isExtracting.value = false
        reject(new Error('无法获取Canvas上下文'))
        return
      }

      img.onload = () => {
        try {
          progress.value = 30

          const targetSize = 200
          const scale = Math.min(targetSize / img.width, targetSize / img.height)
          const w = Math.round(img.width * scale)
          const h = Math.round(img.height * scale)

          canvas.width = w
          canvas.height = h
          ctx.drawImage(img, 0, 0, w, h)

          progress.value = 50

          const imageData = ctx.getImageData(0, 0, w, h)
          const pixels = samplePixels(imageData)

          progress.value = 70

          const dominantColors = kMeans(pixels, 5)

          progress.value = 90

          const result: ColorItem[] = dominantColors.map((color, index) => {
            const hex = rgbToHex(color.r, color.g, color.b)
            const hsl = rgbToHsl(color.r, color.g, color.b)
            return {
              id: generateId(),
              hex,
              name: `颜色 ${index + 1}`,
              locked: false,
              hsl
            }
          })

          progress.value = 100
          isExtracting.value = false

          resolve(result)
        } catch (error) {
          isExtracting.value = false
          reject(error)
        }
      }

      img.onerror = () => {
        isExtracting.value = false
        reject(new Error('图片加载失败'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  return {
    isExtracting,
    progress,
    extractColors
  }
}
