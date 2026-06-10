import * as THREE from 'three'

export interface EnvironmentParams {
  light: number
  water: number
  soil: number
  speed: number
}

export interface BranchData {
  start: THREE.Vector3
  end: THREE.Vector3
  radius: number
  color: THREE.Color
  level: number
}

export interface PlantStats {
  branchCount: number
  leafCount: number
  avgAngle: number
}

export class PlantGrowth {
  private group: THREE.Group
  private branches: BranchData[] = []
  private targetBranches: BranchData[] = []
  private currentBranches: BranchData[] = []
  private meshes: THREE.Mesh[] = []
  private leafMeshes: THREE.Mesh[] = []
  private totalTime: number = 0
  private growthDuration: number = 30
  private isGrowing: boolean = true
  private maxLevel: number = 6
  private lengthDecay: number = 0.65
  private baseLength: number = 1.2
  private envParams: EnvironmentParams = {
    light: 50,
    water: 50,
    soil: 50,
    speed: 50
  }
  private targetEnvParams: EnvironmentParams = {
    light: 50,
    water: 50,
    soil: 50,
    speed: 50
  }
  private angleHistory: number[] = []

  constructor() {
    this.group = new THREE.Group()
  }

  getGroup(): THREE.Group {
    return this.group
  }

  setEnvironmentParams(params: Partial<EnvironmentParams>): void {
    this.targetEnvParams = { ...this.targetEnvParams, ...params }
  }

  getStats(): PlantStats {
    const avgAngle = this.angleHistory.length > 0
      ? this.angleHistory.reduce((a, b) => a + b, 0) / this.angleHistory.length
      : 0
    const score = Math.round((this.envParams.light + this.envParams.water + this.envParams.soil) / 3)
    return {
      branchCount: this.currentBranches.length,
      leafCount: this.leafMeshes.length,
      avgAngle: Math.round(avgAngle),
      score
    }
  }

  private lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
    return new THREE.Color().lerpColors(color1, color2, t)
  }

  private generateBranchData(): BranchData[] {
    const result: BranchData[] = []
    this.angleHistory = []
    const envFactor = (this.envParams.light + this.envParams.water + this.envParams.soil) / 300
    const growthMultiplier = 0.5 + envFactor * 0.5

    const stemColor = new THREE.Color(0x8B4513)
    const tipColor = new THREE.Color(0x7FFF00)

    const grow = (
      start: THREE.Vector3,
      direction: THREE.Vector3,
      length: number,
      level: number,
      angle: number
    ) => {
      if (level > this.maxLevel || length < 0.1) return

      const actualLength = length * growthMultiplier
      const end = start.clone().add(direction.clone().multiplyScalar(actualLength))
      const colorT = level / this.maxLevel
      const color = this.lerpColor(stemColor, tipColor, colorT)
      const radius = Math.max(0.02, 0.12 * (1 - level * 0.12))

      result.push({
        start: start.clone(),
        end: end.clone(),
        radius,
        color,
        level
      })

      if (level < this.maxLevel) {
        const branchAngle = 20 + Math.random() * 25
        this.angleHistory.push(branchAngle)
        const angleRad = (branchAngle * Math.PI) / 180

        const up = new THREE.Vector3(0, 1, 0)
        const right = new THREE.Vector3().crossVectors(direction, up).normalize()
        if (right.lengthSq() < 0.001) {
          right.set(1, 0, 0)
        }
        const perp = new THREE.Vector3().crossVectors(right, direction).normalize()

        const dir1 = direction.clone()
          .applyAxisAngle(right, angleRad)
          .applyAxisAngle(direction, Math.random() * Math.PI * 2)
          .normalize()

        const dir2 = direction.clone()
          .applyAxisAngle(perp, -angleRad)
          .applyAxisAngle(direction, Math.random() * Math.PI * 2)
          .normalize()

        const newLength = length * this.lengthDecay

        grow(end, dir1, newLength, level + 1, branchAngle)
        grow(end, dir2, newLength, level + 1, branchAngle)

        if (Math.random() > 0.5 && level >= 2) {
          const dir3 = direction.clone()
            .applyAxisAngle(right, -angleRad * 0.7)
            .applyAxisAngle(direction, Math.random() * Math.PI * 2)
            .normalize()
          grow(end, dir3, newLength * 0.8, level + 1, branchAngle * 0.7)
        }
      }
    }

    const start = new THREE.Vector3(0, 0, 0)
    const direction = new THREE.Vector3(0, 1, 0)
    grow(start, direction, this.baseLength, 0, 0)

    return result
  }

  private createBranchMesh(branch: BranchData): THREE.Mesh {
    const dir = new THREE.Vector3().subVectors(branch.end, branch.start)
    const length = dir.length()
    const geometry = new THREE.CylinderGeometry(
      branch.radius * 0.7,
      branch.radius,
      length,
      8
    )
    const material = new THREE.MeshStandardMaterial({
      color: branch.color,
      roughness: 0.8,
      metalness: 0.1
    })
    const mesh = new THREE.Mesh(geometry, material)

    const mid = new THREE.Vector3().addVectors(branch.start, branch.end).multiplyScalar(0.5)
    mesh.position.copy(mid)

    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize())
    mesh.quaternion.copy(quaternion)

    return mesh
  }

  private createLeafMesh(position: THREE.Vector3, color: THREE.Color): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.08, 6, 6)
    geometry.scale(1, 1.5, 0.3)
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.6,
      metalness: 0.05,
      emissive: color,
      emissiveIntensity: 0.1
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )
    return mesh
  }

  private clearMeshes(): void {
    this.meshes.forEach(mesh => {
      this.group.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose())
      } else {
        mesh.material.dispose()
      }
    })
    this.meshes = []

    this.leafMeshes.forEach(mesh => {
      this.group.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose())
      } else {
        mesh.material.dispose()
      }
    })
    this.leafMeshes = []
  }

  rebuildPlant(): void {
    this.targetBranches = this.generateBranchData()
    this.currentBranches = this.targetBranches
    this.renderPlant()
  }

  private renderPlant(): void {
    this.clearMeshes()

    this.currentBranches.forEach(branch => {
      const mesh = this.createBranchMesh(branch)
      this.meshes.push(mesh)
      this.group.add(mesh)

      if (branch.level >= 4) {
        const leafCount = Math.floor(1 + Math.random() * 2)
        for (let i = 0; i < leafCount; i++) {
          const leafPos = branch.end.clone()
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            Math.random() * 0.05,
            (Math.random() - 0.5) * 0.1
          )
          leafPos.add(offset)
          const leafMesh = this.createLeafMesh(leafPos, branch.color)
          this.leafMeshes.push(leafMesh)
          this.group.add(leafMesh)
        }
      }
    })
  }

  update(deltaTime: number): void {
    const speedFactor = 0.5 + (this.envParams.speed / 100) * 1.5
    const lerpFactor = 1 - Math.pow(0.001, deltaTime * speedFactor)

    this.envParams.light += (this.targetEnvParams.light - this.envParams.light) * Math.min(lerpFactor, deltaTime * 2)
    this.envParams.water += (this.targetEnvParams.water - this.envParams.water) * Math.min(lerpFactor, deltaTime * 2)
    this.envParams.soil += (this.targetEnvParams.soil - this.envParams.soil) * Math.min(lerpFactor, deltaTime * 2)
    this.envParams.speed += (this.targetEnvParams.speed - this.envParams.speed) * Math.min(lerpFactor, deltaTime * 2)

    if (this.isGrowing) {
      this.totalTime += deltaTime * speedFactor
      const progress = Math.min(this.totalTime / this.growthDuration, 1)

      const targetBranches = this.generateBranchData()
      const displayCount = Math.floor(progress * targetBranches.length)

      if (displayCount !== this.currentBranches.length) {
        this.currentBranches = targetBranches.slice(0, displayCount)
        this.renderPlant()
      }

      if (progress >= 1) {
        this.isGrowing = false
      }
    }
  }

  resetGrowth(): void {
    this.totalTime = 0
    this.isGrowing = true
    this.currentBranches = []
    this.clearMeshes()
  }
}
