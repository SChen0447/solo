export function applyNoiseToPaper(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * 0.05
    data[i] = Math.min(255, Math.max(0, data[i] + noise))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
  }
  ctx.putImageData(imageData, 0, 0)
}

export function applyAgingTint(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const alpha = 0.1 + Math.random() * 0.2
    data[i] = data[i] * (1 - alpha) + 139 * alpha
    data[i + 1] = data[i + 1] * (1 - alpha) + 107 * alpha
    data[i + 2] = data[i + 2] * (1 - alpha) + 74 * alpha
  }
  ctx.putImageData(imageData, 0, 0)
}

export function generateFoldLines(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save()
  ctx.strokeStyle = 'rgba(120, 110, 100, 0.3)'
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) {
    const startX = Math.random() * width
    const startY = Math.random() * height
    const angle = Math.random() * Math.PI * 2
    const length = Math.min(width, height) * (0.3 + Math.random() * 0.5)
    const endX = startX + Math.cos(angle) * length
    const endY = startY + Math.sin(angle) * length
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    const steps = 8
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      const x = startX + (endX - startX) * t + (Math.random() - 0.5) * 8
      const y = startY + (endY - startY) * t + (Math.random() - 0.5) * 8
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a)
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3
  const u = h < 2 ? x : y
  const v = h < 2 ? y : x
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

export function perlinNoise2D(x: number, y: number, hashTable: number[]): number {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  x -= Math.floor(x)
  y -= Math.floor(y)
  const u = fade(x)
  const v = fade(y)
  const aa = hashTable[(hashTable[X] + Y) & 255]
  const ab = hashTable[(hashTable[X] + Y + 1) & 255]
  const ba = hashTable[(hashTable[X + 1] + Y) & 255]
  const bb = hashTable[(hashTable[X + 1] + Y + 1) & 255]
  return lerp(
    lerp(grad(aa, x, y), grad(ba, x - 1, y), u),
    lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u),
    v
  )
}

export function generateHashTable(): number[] {
  const permutation = Array.from({ length: 256 }, (_, i) => i)
  for (let i = permutation.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[permutation[i], permutation[j]] = [permutation[j], permutation[i]]
  }
  return [...permutation, ...permutation]
}
