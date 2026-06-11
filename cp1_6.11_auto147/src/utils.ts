import * as THREE from 'three'

export interface ProfilePoint {
  y: number
  radius: number
}

export interface GlazeLayer {
  type: string
  ratio: number
  color: string
}

export interface GlazeType {
  name: string
  color: string
  previewColor: string
}

export const GLAZE_TYPES: Record<string, GlazeType> = {
  white: { name: '白瓷', color: '#f5f5f0', previewColor: '#ffffff' },
  celadon: { name: '天青', color: '#8fb8b0', previewColor: '#a8d5cd' },
  red: { name: '钨红', color: '#8b2500', previewColor: '#c44536' },
  crystal: { name: '结晶', color: '#4a6fa5', previewColor: '#6b9ac4' },
  tenmoku: { name: '曜变', color: '#1a1a2e', previewColor: '#3d3d5c' },
}

export function generatePotteryGeometry(
  profile: ProfilePoint[],
  segments: number = 16
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const pressures: number[] = []

  const heightSegments = profile.length - 1

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments
    const profilePoint = profile[y]
    const radius = profilePoint.radius

    for (let x = 0; x <= segments; x++) {
      const u = x / segments
      const theta = u * Math.PI * 2

      const sinTheta = Math.sin(theta)
      const cosTheta = Math.cos(theta)

      const px = radius * cosTheta
      const py = profilePoint.y
      const pz = radius * sinTheta

      vertices.push(px, py, pz)

      const nx = cosTheta
      const ny = 0
      const nz = sinTheta
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
      normals.push(nx / len, ny / len, nz / len)

      uvs.push(u, v)
      pressures.push(0)
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * (segments + 1) + x
      const b = a + segments + 1
      const c = a + 1
      const d = b + 1

      indices.push(a, b, c)
      indices.push(b, d, c)
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('pressure', new THREE.Float32BufferAttribute(pressures, 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}

export function createDefaultProfile(height: number = 4, radius: number = 2, segments: number = 16): ProfilePoint[] {
  const profile: ProfilePoint[] = []
  const yStep = height / segments

  for (let i = 0; i <= segments; i++) {
    const y = -height / 2 + i * yStep
    const normalizedY = (y + height / 2) / height
    const shapeFactor = Math.sin(normalizedY * Math.PI) * 0.2 + 0.8
    profile.push({ y, radius: radius * shapeFactor })
  }

  return profile
}

export function deformProfile(
  profile: ProfilePoint[],
  heightIndex: number,
  pressure: number,
  direction: 'up' | 'down',
  influenceRange: number = 3
): ProfilePoint[] {
  const newProfile = profile.map(p => ({ ...p }))
  const pressureAmount = pressure * 0.01

  for (let i = 0; i < newProfile.length; i++) {
    const distance = Math.abs(i - heightIndex)
    if (distance <= influenceRange) {
      const falloff = 1 - distance / influenceRange
      const deformation = pressureAmount * falloff

      if (direction === 'up') {
        newProfile[i].radius -= deformation * 0.5
        newProfile[i].y += deformation * 0.3
      } else {
        newProfile[i].radius += deformation * 0.6
        newProfile[i].y -= deformation * 0.2
      }

      newProfile[i].radius = Math.max(0.3, Math.min(5, newProfile[i].radius))
    }
  }

  return newProfile
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 200, g: 180, b: 160 }
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export function mixGlazeColors(layers: GlazeLayer[]): string {
  if (layers.length === 0) return '#c8b4a0'

  const totalRatio = layers.reduce((sum, layer) => sum + layer.ratio, 0)
  if (totalRatio === 0) return '#c8b4a0'

  let r = 0, g = 0, b = 0

  for (const layer of layers) {
    const rgb = hexToRgb(layer.color)
    const weight = layer.ratio / totalRatio
    r += rgb.r * weight
    g += rgb.g * weight
    b += rgb.b * weight
  }

  return rgbToHex(r, g, b)
}

export function getHeatmapColor(pressure: number): string {
  const t = Math.max(0, Math.min(1, pressure / 100))
  const r = Math.round(255 * t)
  const b = Math.round(255 * (1 - t))
  return rgbToHex(r, 0, b)
}

export function generateCrackPattern(coverage: number = 0.1): string {
  const paths: string[] = []
  const numCracks = Math.floor(20 + coverage * 100)

  for (let i = 0; i < numCracks; i++) {
    const startX = Math.random() * 100
    const startY = Math.random() * 100
    let path = `M ${startX} ${startY}`

    let currentX = startX
    let currentY = startY
    const segments = 3 + Math.floor(Math.random() * 4)

    for (let j = 0; j < segments; j++) {
      const angle = Math.random() * Math.PI * 2
      const length = 2 + Math.random() * 8
      currentX += Math.cos(angle) * length
      currentY += Math.sin(angle) * length
      path += ` L ${currentX.toFixed(1)} ${currentY.toFixed(1)}`
    }

    paths.push(path)
  }

  return paths.join(' ')
}

export function getPressureAtHeight(profile: ProfilePoint[], originalProfile: ProfilePoint[], heightIndex: number): number {
  if (heightIndex < 0 || heightIndex >= profile.length) return 0
  const delta = Math.abs(profile[heightIndex].radius - originalProfile[heightIndex].radius)
  return Math.min(100, delta * 50)
}
