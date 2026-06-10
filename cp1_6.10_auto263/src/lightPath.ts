import * as THREE from 'three'

export interface SpectrumColor {
  name: string
  color: number
  wavelength: number
  refractiveOffset: number
}

export const SPECTRUM_COLORS: SpectrumColor[] = [
  { name: 'red', color: 0xff0000, wavelength: 700, refractiveOffset: -0.03 },
  { name: 'orange', color: 0xff8800, wavelength: 620, refractiveOffset: -0.018 },
  { name: 'yellow', color: 0xffff00, wavelength: 580, refractiveOffset: -0.008 },
  { name: 'green', color: 0x00ff00, wavelength: 530, refractiveOffset: 0.004 },
  { name: 'blue', color: 0x0066ff, wavelength: 470, refractiveOffset: 0.018 },
  { name: 'purple', color: 0x8800ff, wavelength: 400, refractiveOffset: 0.03 }
]

export interface PrismData {
  position: THREE.Vector3
  rotationY: number
  scale: number
  type: 'triangle' | 'pyramid'
  refractiveIndex: number
  mesh: THREE.Mesh
}

export interface LightPathResult {
  color: SpectrumColor
  points: THREE.Vector3[]
}

export function getWavelengthRefractiveIndex(baseIndex: number, offset: number): number {
  return baseIndex + offset
}

export function refract(
  incident: THREE.Vector3,
  normal: THREE.Vector3,
  n1: number,
  n2: number
): THREE.Vector3 | null {
  const cosThetaI = -incident.dot(normal)
  const eta = n1 / n2

  if (cosThetaI < 0) {
    return refract(incident, normal.clone().negate(), n1, n2)
  }

  const sin2ThetaT = eta * eta * (1 - cosThetaI * cosThetaI)

  if (sin2ThetaT > 1) {
    return null
  }

  const cosThetaT = Math.sqrt(1 - sin2ThetaT)
  const refracted = new THREE.Vector3()
  refracted.copy(incident).multiplyScalar(eta)
  refracted.add(normal.clone().multiplyScalar(eta * cosThetaI - cosThetaT))
  refracted.normalize()

  return refracted
}

export function reflect(
  incident: THREE.Vector3,
  normal: THREE.Vector3
): THREE.Vector3 {
  const reflected = incident.clone()
  const dot = incident.dot(normal)
  reflected.sub(normal.clone().multiplyScalar(2 * dot))
  reflected.normalize()
  return reflected
}

function getTrianglePrismFaces(prism: PrismData): { vertices: THREE.Vector3[], normal: THREE.Vector3 }[] {
  const s = prism.scale
  const h = Math.sqrt(3) * s
  const thickness = 0.5 * s

  const localVertices = [
    new THREE.Vector3(-s, 0, -thickness),
    new THREE.Vector3(s, 0, -thickness),
    new THREE.Vector3(0, h, -thickness),
    new THREE.Vector3(-s, 0, thickness),
    new THREE.Vector3(s, 0, thickness),
    new THREE.Vector3(0, h, thickness)
  ]

  const cosR = Math.cos(prism.rotationY)
  const sinR = Math.sin(prism.rotationY)
  const worldVertices = localVertices.map(v => {
    const x = v.x * cosR - v.z * sinR
    const z = v.x * sinR + v.z * cosR
    return new THREE.Vector3(x + prism.position.x, v.y + prism.position.y, z + prism.position.z)
  })

  const faces = [
    { vertices: [worldVertices[0], worldVertices[2], worldVertices[1]] },
    { vertices: [worldVertices[3], worldVertices[4], worldVertices[5]] },
    { vertices: [worldVertices[0], worldVertices[1], worldVertices[4], worldVertices[3]] },
    { vertices: [worldVertices[1], worldVertices[2], worldVertices[5], worldVertices[4]] },
    { vertices: [worldVertices[2], worldVertices[0], worldVertices[3], worldVertices[5]] }
  ]

  return faces.map(f => {
    const v0 = f.vertices[0]
    const v1 = f.vertices[1]
    const v2 = f.vertices[2]
    const e1 = v1.clone().sub(v0)
    const e2 = v2.clone().sub(v0)
    const normal = new THREE.Vector3().crossVectors(e1, e2).normalize()
    return { vertices: f.vertices, normal }
  })
}

function getPyramidPrismFaces(prism: PrismData): { vertices: THREE.Vector3[], normal: THREE.Vector3 }[] {
  const s = 1.5 * prism.scale
  const h = s * 1.2

  const localVertices = [
    new THREE.Vector3(-s / 2, 0, -s / 2),
    new THREE.Vector3(s / 2, 0, -s / 2),
    new THREE.Vector3(0, 0, s / 2),
    new THREE.Vector3(0, h, 0)
  ]

  const cosR = Math.cos(prism.rotationY)
  const sinR = Math.sin(prism.rotationY)
  const worldVertices = localVertices.map(v => {
    const x = v.x * cosR - v.z * sinR
    const z = v.x * sinR + v.z * cosR
    return new THREE.Vector3(x + prism.position.x, v.y + prism.position.y, z + prism.position.z)
  })

  const faces = [
    { vertices: [worldVertices[0], worldVertices[1], worldVertices[2]] },
    { vertices: [worldVertices[0], worldVertices[3], worldVertices[1]] },
    { vertices: [worldVertices[1], worldVertices[3], worldVertices[2]] },
    { vertices: [worldVertices[2], worldVertices[3], worldVertices[0]] }
  ]

  return faces.map(f => {
    const v0 = f.vertices[0]
    const v1 = f.vertices[1]
    const v2 = f.vertices[2]
    const e1 = v1.clone().sub(v0)
    const e2 = v2.clone().sub(v0)
    const normal = new THREE.Vector3().crossVectors(e1, e2).normalize()
    return { vertices: f.vertices, normal }
  })
}

function rayPlaneIntersection(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  planeNormal: THREE.Vector3,
  planePoint: THREE.Vector3
): number | null {
  const denom = direction.dot(planeNormal)
  if (Math.abs(denom) < 1e-8) return null

  const t = planePoint.clone().sub(origin).dot(planeNormal) / denom
  return t > 1e-4 ? t : null
}

function pointInPolygon(
  point: THREE.Vector3,
  polygon: THREE.Vector3[],
  normal: THREE.Vector3
): boolean {
  if (polygon.length < 3) return false

  for (let i = 0; i < polygon.length; i++) {
    const v1 = polygon[i]
    const v2 = polygon[(i + 1) % polygon.length]
    const edge = v2.clone().sub(v1)
    const toPoint = point.clone().sub(v1)
    const cross = new THREE.Vector3().crossVectors(edge, toPoint)
    if (cross.dot(normal) < -1e-6) return false
  }
  return true
}

function findPrismIntersection(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  prism: PrismData
): { point: THREE.Vector3, normal: THREE.Vector3, t: number } | null {
  const faces = prism.type === 'triangle' ? getTrianglePrismFaces(prism) : getPyramidPrismFaces(prism)

  let closestT = Infinity
  let closestHit: { point: THREE.Vector3, normal: THREE.Vector3, t: number } | null = null

  for (const face of faces) {
    const t = rayPlaneIntersection(origin, direction, face.normal, face.vertices[0])
    if (t !== null && t < closestT) {
      const hitPoint = origin.clone().add(direction.clone().multiplyScalar(t))
      if (pointInPolygon(hitPoint, face.vertices, face.normal)) {
        closestT = t
        closestHit = { point: hitPoint, normal: face.normal.clone(), t }
      }
    }
  }

  return closestHit
}

export function computeLightPath(
  sourcePosition: THREE.Vector3,
  sourceDirection: THREE.Vector3,
  prisms: PrismData[],
  spectrumColor: SpectrumColor,
  maxBounces: number = 5,
  maxDistance: number = 30
): LightPathResult {
  const points: THREE.Vector3[] = [sourcePosition.clone()]
  let currentOrigin = sourcePosition.clone()
  let currentDirection = sourceDirection.clone().normalize()
  let currentN = 1.0
  let insidePrism: PrismData | null = null

  for (let bounce = 0; bounce < maxBounces; bounce++) {
    let closestHit: { point: THREE.Vector3, normal: THREE.Vector3, t: number, prism: PrismData | null } | null = null

    for (const prism of prisms) {
      if (prism === insidePrism) continue

      const hit = findPrismIntersection(currentOrigin, currentDirection, prism)
      if (hit && (!closestHit || hit.t < closestHit.t)) {
        closestHit = { ...hit, prism }
      }
    }

    if (!closestHit || closestHit.t > maxDistance) {
      const endPoint = currentOrigin.clone().add(currentDirection.clone().multiplyScalar(maxDistance))
      points.push(endPoint)
      break
    }

    points.push(closestHit.point.clone())

    const n1 = currentN
    const n2 = insidePrism
      ? 1.0
      : getWavelengthRefractiveIndex(closestHit.prism!.refractiveIndex, spectrumColor.refractiveOffset)

    let refracted = refract(currentDirection, closestHit.normal, n1, n2)

    if (refracted) {
      currentDirection = refracted
      currentOrigin = closestHit.point.clone().add(currentDirection.clone().multiplyScalar(1e-3))
      insidePrism = insidePrism ? null : closestHit.prism
      currentN = n2
    } else {
      currentDirection = reflect(currentDirection, closestHit.normal)
      currentOrigin = closestHit.point.clone().add(currentDirection.clone().multiplyScalar(1e-3))
    }
  }

  return { color: spectrumColor, points }
}

export function computeAllLightPaths(
  sourcePosition: THREE.Vector3,
  sourceDirection: THREE.Vector3,
  prisms: PrismData[]
): LightPathResult[] {
  return SPECTRUM_COLORS.map(color =>
    computeLightPath(sourcePosition, sourceDirection, prisms, color)
  )
}
