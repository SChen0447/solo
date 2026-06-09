import * as THREE from 'three'

const POT_HEIGHT = 3.0
const POT_RADIUS = 1.0
const RADIAL_SEGMENTS = 48
const HEIGHT_SEGMENTS = 48
const DEFORM_RADIUS = 0.35
const MIN_DEFORM = 0.01
const MAX_DEFORM = 0.05
const DAMPING = 0.95
const SPRING_STRENGTH = 3.0
const MAX_HISTORY = 10
const COLOR_DURATION = 0.5

export class Pottery {
  public readonly mesh: THREE.Mesh
  public readonly wheel: THREE.Mesh
  private geometry: THREE.CylinderGeometry
  private material: THREE.MeshPhysicalMaterial
  private originalPositions: Float32Array
  private velocities: Float32Array
  private displacements: Float32Array
  private activeVertices: Set<number> = new Set()
  private historyStack: Float32Array[] = []
  private redoStack: Float32Array[] = []
  private currentColor = new THREE.Color('#D4A574')
  private targetColor = new THREE.Color('#D4A574')
  private initialColor = new THREE.Color('#D4A574')
  private colorTransitionT = 1
  private isTransitioningColor = false

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.CylinderGeometry(
      POT_RADIUS, POT_RADIUS, POT_HEIGHT,
      RADIAL_SEGMENTS, HEIGHT_SEGMENTS,
      false
    )
    this.geometry.computeVertexNormals()

    this.material = new THREE.MeshPhysicalMaterial({
      color: 0xd4a574,
      roughness: 0.6,
      metalness: 0.0,
      transmission: 0.15,
      thickness: 0.5,
      transparent: true,
      side: THREE.DoubleSide,
      clearcoat: 0.3
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    scene.add(this.mesh)

    this.originalPositions = new Float32Array(this.geometry.attributes.position.array)
    this.velocities = new Float32Array(this.originalPositions.length)
    this.displacements = new Float32Array(this.originalPositions.length)

    this.activeVertices = new Set()

    this.wheel = this.createWheel(scene)
    this.saveHistory()
  }

  private createWheel(scene: THREE.Scene): THREE.Mesh {
    const wheelGeo = new THREE.CylinderGeometry(2.0, 2.0, 0.15, 64)
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x8B5E3C,
      roughness: 0.85,
      metalness: 0.1
    })
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.position.y = -POT_HEIGHT / 2 - 0.075
    wheel.receiveShadow = true
    scene.add(wheel)

    const wheelBaseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.2, 32)
    const wheelBaseMat = new THREE.MeshStandardMaterial({
      color: 0x5a3a1e,
      roughness: 0.9
    })
    const wheelBase = new THREE.Mesh(wheelBaseGeo, wheelBaseMat)
    wheelBase.position.y = -POT_HEIGHT / 2 - 0.25
    wheelBase.receiveShadow = true
    scene.add(wheelBase)

    return wheel
  }

  public deformVertex(point: THREE.Vector3, normal: THREE.Vector3, velocity: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array
    const normals = this.geometry.attributes.normal.array as Float32Array
    const clampedVel = Math.min(Math.max(velocity, 0), 100)
    const strength = MIN_DEFORM + (clampedVel / 100) * (MAX_DEFORM - MIN_DEFORM)
    const worldToLocal = this.mesh.worldToLocal(point.clone())

    let deformed = false
    for (let i = 0; i < positions.length; i += 3) {
      const vx = positions[i]
      const vy = positions[i + 1]
      const vz = positions[i + 2]
      const dx = vx - worldToLocal.x
      const dy = vy - worldToLocal.y
      const dz = vz - worldToLocal.z
      const distSq = dx * dx + dy * dy + dz * dz
      if (distSq < DEFORM_RADIUS * DEFORM_RADIUS) {
        const dist = Math.sqrt(distSq)
        const falloff = 1.0 - dist / DEFORM_RADIUS
        const falloffSq = falloff * falloff
        const nx = normals[i]
        const ny = normals[i + 1]
        const nz = normals[i + 2]
        const displacement = -strength * falloffSq
        positions[i] += nx * displacement
        positions[i + 1] += ny * displacement
        positions[i + 2] += nz * displacement
        const vi = i / 3
        this.displacements[i] += nx * displacement
        this.displacements[i + 1] += ny * displacement
        this.displacements[i + 2] += nz * displacement
        this.activeVertices.add(vi)
        deformed = true
      }
    }
    if (deformed) {
      this.geometry.attributes.position.needsUpdate = true
      this.geometry.computeVertexNormals()
    }
  }

  public endDeform(): void {
    this.saveHistory()
    this.redoStack.length = 0
  }

  private saveHistory(): void {
    const snapshot = new Float32Array(this.displacements)
    this.historyStack.push(snapshot)
    if (this.historyStack.length > MAX_HISTORY) {
      this.historyStack.shift()
    }
  }

  public setColor(hex: string): void {
    this.initialColor.copy(this.currentColor)
    this.targetColor.set(hex)
    this.colorTransitionT = 0
    this.isTransitioningColor = true
  }

  public setRoughness(value: number): void {
    this.material.roughness = value
    this.material.needsUpdate = true
  }

  public reset(): void {
    const positions = this.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < positions.length; i++) {
      positions[i] = this.originalPositions[i]
    }
    this.displacements.fill(0)
    this.velocities.fill(0)
    this.activeVertices.clear()
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.computeVertexNormals()
    this.saveHistory()
    this.redoStack.length = 0
  }

  public undo(): void {
    if (this.historyStack.length <= 1) return
    const current = this.historyStack.pop()!
    this.redoStack.push(current)
    const prev = this.historyStack[this.historyStack.length - 1]
    this.applyDisplacements(prev)
  }

  public redo(): void {
    if (this.redoStack.length === 0) return
    const next = this.redoStack.pop()!
    this.historyStack.push(next)
    this.applyDisplacements(next)
  }

  private applyDisplacements(snapshot: Float32Array): void {
    const positions = this.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < positions.length; i++) {
      positions[i] = this.originalPositions[i] + snapshot[i]
      this.displacements[i] = snapshot[i]
    }
    this.velocities.fill(0)
    this.activeVertices.clear()
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.computeVertexNormals()
  }

  public update(deltaTime: number): void {
    this.wheel.rotation.y += (15 * Math.PI / 180) * deltaTime
    this.mesh.rotation.y += (15 * Math.PI / 180) * deltaTime
    this.updateSpringPhysics(deltaTime)
    this.updateColorTransition(deltaTime)
  }

  private updateSpringPhysics(deltaTime: number): void {
    if (this.activeVertices.size === 0) return
    const positions = this.geometry.attributes.position.array as Float32Array
    let hasActive = false
    const toRemove: number[] = []
    for (const vi of this.activeVertices) {
      const i3 = vi * 3
      let stillActive = false
      for (let c = 0; c < 3; c++) {
        const disp = this.displacements[i3 + c]
        if (Math.abs(disp) > 0.0001) {
          stillActive = true
          hasActive = true
          const springForce = -disp * SPRING_STRENGTH
          this.velocities[i3 + c] = this.velocities[i3 + c] * DAMPING + springForce * deltaTime
          const delta = this.velocities[i3 + c] * deltaTime
          this.displacements[i3 + c] += delta
          positions[i3 + c] = this.originalPositions[i3 + c] + this.displacements[i3 + c]
        }
      }
      if (!stillActive) {
        toRemove.push(vi)
      }
    }
    for (const vi of toRemove) {
      this.activeVertices.delete(vi)
    }
    if (hasActive) {
      this.geometry.attributes.position.needsUpdate = true
      this.geometry.computeVertexNormals()
    }
  }

  private updateColorTransition(deltaTime: number): void {
    if (!this.isTransitioningColor) return
    this.colorTransitionT = Math.min(1, this.colorTransitionT + deltaTime / COLOR_DURATION)
    const t = this.colorTransitionT
    this.currentColor.lerpColors(this.initialColor, this.targetColor, t)
    this.material.color.copy(this.currentColor)
    this.material.needsUpdate = true
    if (this.colorTransitionT >= 1) {
      this.isTransitioningColor = false
    }
  }

  public getVertexCount(): number {
    return this.geometry.attributes.position.count
  }
}
