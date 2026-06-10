import * as THREE from 'three'

export const TERRAIN_WIDTH = 30
export const TERRAIN_HEIGHT = 15
export const TERRAIN_DEPTH = 20

export const LAYER_BOUNDS = [
  { top: 4, bottom: 0, color: 0xc2a77a, name: '地表层' },
  { top: 10, bottom: 4, color: 0xb87333, name: '沉积岩层' },
  { top: 15, bottom: 10, color: 0x4a4a4a, name: '基岩层' }
]

const WAVE_AMPLITUDE = 0.5
const WAVE_FREQUENCY = 0.3

function createWavyLayer(
  width: number,
  height: number,
  depth: number,
  color: number,
  yBase: number,
  opacity: number,
  segments: number = 40
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth, segments, segments, segments)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)

    const yLocal = y + height / 2

    if (yLocal >= height - 0.01) {
      const wave = Math.sin(x * WAVE_FREQUENCY) * Math.cos(z * WAVE_FREQUENCY) * WAVE_AMPLITUDE
      position.setY(i, y + wave)
    }

    if (yLocal <= 0.01) {
      const wave = Math.sin(x * WAVE_FREQUENCY) * Math.cos(z * WAVE_FREQUENCY) * WAVE_AMPLITUDE * 0.5
      position.setY(i, y + wave)
    }
  }

  geometry.computeVertexNormals()

  const material = new THREE.MeshPhongMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    shininess: 10
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = yBase + height / 2
  mesh.userData.isTerrain = true

  return mesh
}

function createDashedLine(
  width: number,
  depth: number,
  y: number
): THREE.LineSegments {
  const points: THREE.Vector3[] = []
  const halfW = width / 2
  const halfD = depth / 2
  const step = 1

  for (let x = -halfW; x <= halfW; x += step) {
    const wave = Math.sin(x * WAVE_FREQUENCY) * WAVE_AMPLITUDE
    points.push(new THREE.Vector3(x, y + wave, -halfD))
    points.push(new THREE.Vector3(x + step * 0.5, y + Math.sin((x + step * 0.5) * WAVE_FREQUENCY) * WAVE_AMPLITUDE, -halfD))
  }
  for (let z = -halfD; z <= halfD; z += step) {
    const wave = Math.cos(z * WAVE_FREQUENCY) * WAVE_AMPLITUDE
    points.push(new THREE.Vector3(halfW, y + wave, z))
    points.push(new THREE.Vector3(halfW, y + Math.cos((z + step * 0.5) * WAVE_FREQUENCY) * WAVE_AMPLITUDE, z + step * 0.5))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineDashedMaterial({
    color: 0xffffff,
    dashSize: 0.3,
    gapSize: 0.2,
    transparent: true,
    opacity: 0.7
  })

  const line = new THREE.LineSegments(geometry, material)
  line.computeLineDistances()
  return line
}

export class Terrain {
  public group: THREE.Group
  public layers: THREE.Mesh[] = []
  public meshes: THREE.Mesh[] = []

  constructor() {
    this.group = new THREE.Group()

    const opacities = [0.85, 0.6, 0.8]
    LAYER_BOUNDS.forEach((layer, index) => {
      const layerHeight = layer.top - layer.bottom
      const mesh = createWavyLayer(
        TERRAIN_WIDTH,
        layerHeight,
        TERRAIN_DEPTH,
        layer.color,
        layer.bottom,
        opacities[index],
        30
      )
      this.layers.push(mesh)
      this.meshes.push(mesh)
      this.group.add(mesh)
    })

    this.group.add(createDashedLine(TERRAIN_WIDTH, TERRAIN_DEPTH, 4))
    this.group.add(createDashedLine(TERRAIN_WIDTH, TERRAIN_DEPTH, 10))

    const boxEdges = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_DEPTH)
    )
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.4
    })
    const outline = new THREE.LineSegments(boxEdges, outlineMaterial)
    outline.position.y = TERRAIN_HEIGHT / 2
    this.group.add(outline)
  }

  public getLayerAtY(y: number): number {
    for (let i = 0; i < LAYER_BOUNDS.length; i++) {
      if (y >= LAYER_BOUNDS[i].bottom && y < LAYER_BOUNDS[i].top) {
        return i
      }
    }
    return -1
  }

  public getWaveOffset(x: number, z: number, y: number): number {
    return Math.sin(x * WAVE_FREQUENCY) * Math.cos(z * WAVE_FREQUENCY) * WAVE_AMPLITUDE
  }

  public isInsideBounds(point: THREE.Vector3): boolean {
    const halfW = TERRAIN_WIDTH / 2
    const halfD = TERRAIN_DEPTH / 2
    return (
      point.x >= -halfW && point.x <= halfW &&
      point.y >= 0 && point.y <= TERRAIN_HEIGHT &&
      point.z >= -halfD && point.z <= halfD
    )
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.group)
  }
}

export function createGroundGrid(): THREE.GridHelper {
  const grid = new THREE.GridHelper(60, 30, 0x888888, 0x555555)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.2
  grid.position.y = 0
  return grid
}
