import * as THREE from 'three'
import type { VaseType } from '@/types'

export const createVaseGeometry = (type: VaseType): THREE.BufferGeometry => {
  switch (type) {
    case 'round':
      return createRoundVase()
    case 'square':
      return createSquareVase()
    case 'long':
      return createLongVase()
    default:
      return createRoundVase()
  }
}

const createRoundVase = (): THREE.BufferGeometry => {
  const points: THREE.Vector2[] = []
  const height = 2.0
  const segments = 40
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const y = t * height
    let r
    
    if (t < 0.15) {
      r = 0.75 - (0.15 - t) * 1.5
    } else if (t < 0.45) {
      const phase = (t - 0.15) / 0.3
      r = 0.75 + Math.sin(phase * Math.PI) * 0.25
    } else if (t < 0.85) {
      const phase = (t - 0.45) / 0.4
      r = 1.0 - phase * 0.55
    } else {
      const phase = (t - 0.85) / 0.15
      r = 0.45 + phase * 0.15
    }
    
    points.push(new THREE.Vector2(r, y))
  }
  
  const geometry = new THREE.LatheGeometry(points, 64)
  geometry.translate(0, -height * 0.2, 0)
  return geometry
}

const createSquareVase = (): THREE.BufferGeometry => {
  const shape = new THREE.Shape()
  const size = 0.7
  
  shape.moveTo(-size, -size)
  shape.lineTo(size, -size)
  shape.lineTo(size, size)
  shape.lineTo(-size, size)
  shape.lineTo(-size, -size)
  
  const height = 2.2
  
  const extrudeSettings = {
    steps: 30,
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments: 8
  }
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, -height * 0.2, 0)
  
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    const yRatio = (y + height * 0.2) / height
    
    let scale
    if (yRatio < 0.2) {
      scale = 0.9 + yRatio * 0.5
    } else if (yRatio < 0.6) {
      const phase = (yRatio - 0.2) / 0.4
      scale = 1.1 + Math.sin(phase * Math.PI) * 0.1
    } else {
      const phase = (yRatio - 0.6) / 0.4
      scale = 1.2 - phase * 0.25
    }
    
    const x = positions.getX(i)
    const z = positions.getZ(i)
    positions.setX(i, x * scale)
    positions.setZ(i, z * scale)
  }
  
  geometry.computeVertexNormals()
  return geometry
}

const createLongVase = (): THREE.BufferGeometry => {
  const points: THREE.Vector2[] = []
  const height = 2.8
  const segments = 40
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const y = t * height
    let r
    
    if (t < 0.1) {
      r = 0.45 - (0.1 - t) * 2
    } else if (t < 0.25) {
      const phase = (t - 0.1) / 0.15
      r = 0.45 + Math.sin(phase * Math.PI) * 0.08
    } else if (t < 0.85) {
      const phase = (t - 0.25) / 0.6
      r = 0.53 - phase * 0.2
    } else {
      const phase = (t - 0.85) / 0.15
      r = 0.33 + phase * 0.1
    }
    
    points.push(new THREE.Vector2(r, y))
  }
  
  const geometry = new THREE.LatheGeometry(points, 64)
  geometry.translate(0, -height * 0.15, 0)
  return geometry
}

export const createVaseMaterial = (): THREE.MeshPhysicalMaterial => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xe8f4f8,
    transparent: true,
    opacity: 0.45,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    transmission: 0.5,
    thickness: 0.3,
    side: THREE.DoubleSide,
    ior: 1.5
  })
}

export const getVaseHeight = (type: VaseType): number => {
  switch (type) {
    case 'round': return 1.6
    case 'square': return 1.76
    case 'long': return 2.38
    default: return 1.6
  }
}

export const getVaseTopY = (type: VaseType): number => {
  const baseY = -1.0
  return baseY + getVaseHeight(type)
}

export const getVaseOpeningRadius = (type: VaseType): number => {
  switch (type) {
    case 'round': return 0.45
    case 'square': return 0.66
    case 'long': return 0.3
    default: return 0.45
  }
}
