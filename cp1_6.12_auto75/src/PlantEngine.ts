import * as THREE from 'three'

export interface EnvironmentParams {
  light: number
  water: number
  temperature: number
}

interface BranchNode {
  position: THREE.Vector3
  direction: THREE.Vector3
  length: number
  radius: number
  level: number
  children: BranchNode[]
  hasLeaf: boolean
  mesh: THREE.Mesh | null
  leafMesh: THREE.Mesh | null
  swayOffset: number
}

export class PlantEngine {
  private scene: THREE.Scene
  private plantGroup: THREE.Group
  private seed: THREE.Mesh | null = null
  private seedCore: THREE.Points | null = null
  
  private targetParams: EnvironmentParams = { light: 50, water: 50, temperature: 60 }
  private currentParams: EnvironmentParams = { light: 50, water: 50, temperature: 60 }
  
  private growthStartTime: number = 0
  private isGrowing: boolean = false
  private hasGerminated: boolean = false
  
  private rootNode: BranchNode | null = null
  private maxLevel: number = 3
  private maxLeaves: number = 300
  private leafCount: number = 0
  
  private flower: THREE.Group | null = null
  private hasFlower: boolean = false
  private flowerProgress: number = 0
  
  private time: number = 0
  private lastGrowthTime: number = 0
  private growthInterval: number = 3
  
  private onFlowerSpawned: ((position: THREE.Vector3) => void) | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.plantGroup = new THREE.Group()
    this.scene.add(this.plantGroup)
    
    this.createSeed()
  }

  private createSeed(): void {
    const seedGeometry = new THREE.SphereGeometry(0.3, 32, 32)
    const seedMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      transparent: true,
      opacity: 0.6,
      roughness: 0.8,
      metalness: 0.2
    })
    this.seed = new THREE.Mesh(seedGeometry, seedMaterial)
    this.seed.position.y = 0.1
    this.seed.castShadow = true
    this.plantGroup.add(this.seed)

    const coreGeometry = new THREE.BufferGeometry()
    const corePositions = new Float32Array(20 * 3)
    const coreColors = new Float32Array(20 * 3)
    
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const r = 0.1 + Math.random() * 0.1
      
      corePositions[i * 3] = r * Math.sin(phi) * Math.cos(angle)
      corePositions[i * 3 + 1] = r * Math.cos(phi)
      corePositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(angle)
      
      coreColors[i * 3] = 1
      coreColors[i * 3 + 1] = 0.9
      coreColors[i * 3 + 2] = 0.3
    }
    
    coreGeometry.setAttribute('position', new THREE.BufferAttribute(corePositions, 3))
    coreGeometry.setAttribute('color', new THREE.BufferAttribute(coreColors, 3))
    
    const coreMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    
    this.seedCore = new THREE.Points(coreGeometry, coreMaterial)
    this.seedCore.position.y = 0.1
    this.plantGroup.add(this.seedCore)
  }

  public startGrowth(): void {
    if (this.isGrowing) return
    this.isGrowing = true
    this.growthStartTime = this.time
  }

  public setEnvironmentParams(params: EnvironmentParams): void {
    this.targetParams = { ...params }
  }

  public setFlowerSpawnCallback(callback: (position: THREE.Vector3) => void): void {
    this.onFlowerSpawned = callback
  }

  private interpolateParams(): void {
    const speed = 0.02
    this.currentParams.light += (this.targetParams.light - this.currentParams.light) * speed
    this.currentParams.water += (this.targetParams.water - this.currentParams.water) * speed
    this.currentParams.temperature += (this.targetParams.temperature - this.currentParams.temperature) * speed
  }

  public update(deltaTime: number): void {
    this.time += deltaTime
    
    this.interpolateParams()
    
    if (this.isGrowing && !this.hasGerminated) {
      if (this.time - this.growthStartTime >= 3) {
        this.germinate()
      }
    }
    
    if (this.hasGerminated && this.rootNode) {
      const growthSpeed = this.getGrowthSpeed()
      if (this.time - this.lastGrowthTime >= this.growthInterval / growthSpeed) {
        this.grow()
        this.lastGrowthTime = this.time
      }
      
      this.updatePlantMorphology()
      this.updateSway(deltaTime)
      this.updateFlower(deltaTime)
    }
    
    if (this.seedCore) {
      this.seedCore.rotation.y += deltaTime * 0.5
      if (this.seed) {
        this.seedCore.position.copy(this.seed.position)
      }
    }
  }

  private getGrowthSpeed(): number {
    const tempFactor = this.currentParams.temperature / 100
    const lightFactor = this.currentParams.light / 100
    const waterFactor = this.currentParams.water / 100
    return 0.5 + tempFactor * 0.5 + (lightFactor + waterFactor) * 0.25
  }

  private germinate(): void {
    this.hasGerminated = true
    
    if (this.seed) {
      this.plantGroup.remove(this.seed)
      this.seed = null
    }
    if (this.seedCore) {
      this.plantGroup.remove(this.seedCore)
      this.seedCore = null
    }
    
    this.rootNode = this.createBranch(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      0.5,
      0.05,
      0
    )
    
    this.updatePlantMesh()
  }

  private createBranch(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    radius: number,
    level: number
  ): BranchNode {
    const node: BranchNode = {
      position: position.clone(),
      direction: direction.clone().normalize(),
      length,
      radius,
      level,
      children: [],
      hasLeaf: level > 0,
      mesh: null,
      leafMesh: null,
      swayOffset: Math.random() * Math.PI * 2
    }
    return node
  }

  private grow(): void {
    if (!this.rootNode) return
    
    this.growBranch(this.rootNode)
    this.updatePlantMesh()
    this.checkFlowerCondition()
  }

  private growBranch(node: BranchNode): void {
    node.length += 0.2
    
    if (node.level < this.maxLevel && node.length >= 2) {
      const canBranch = node.children.length === 0
      if (canBranch && this.leafCount < this.maxLeaves) {
        this.createChildBranches(node)
      }
    }
    
    node.children.forEach(child => this.growBranch(child))
  }

  private createChildBranches(node: BranchNode): void {
    const branchCount = 2
    const waterFactor = this.currentParams.water / 100
    const baseAngle = THREE.MathUtils.degToRad(30 + waterFactor * 15)
    
    for (let i = 0; i < branchCount; i++) {
      const angleOffset = (i - (branchCount - 1) / 2) * THREE.MathUtils.degToRad(90)
      const angle = baseAngle + (Math.random() - 0.5) * THREE.MathUtils.degToRad(15)
      
      const direction = node.direction.clone()
      
      const perpendicular = new THREE.Vector3(1, 0, 0)
      if (Math.abs(direction.y) > 0.9) {
        perpendicular.set(0, 1, 0)
      }
      const axis = new THREE.Vector3().crossVectors(direction, perpendicular).normalize()
      
      const quaternion1 = new THREE.Quaternion().setFromAxisAngle(axis, angle)
      const quaternion2 = new THREE.Quaternion().setFromAxisAngle(direction, angleOffset)
      
      const newDirection = direction.clone()
      newDirection.applyQuaternion(quaternion1)
      newDirection.applyQuaternion(quaternion2)
      newDirection.normalize()
      
      const endPosition = new THREE.Vector3()
        .copy(node.position)
        .add(direction.clone().multiplyScalar(node.length))
      
      const childRadius = node.radius * 0.7
      const childLength = 0.3 + Math.random() * 0.2
      
      const child = this.createBranch(
        endPosition,
        newDirection,
        childLength,
        childRadius,
        node.level + 1
      )
      
      node.children.push(child)
    }
  }

  private updatePlantMesh(): void {
    this.clearPlantMeshes(this.rootNode)
    this.leafCount = 0
    if (this.rootNode) {
      this.createBranchMesh(this.rootNode)
    }
  }

  private clearPlantMeshes(node: BranchNode | null): void {
    if (!node) return
    
    if (node.mesh) {
      this.plantGroup.remove(node.mesh)
      node.mesh.geometry.dispose()
      ;(node.mesh.material as THREE.Material).dispose()
      node.mesh = null
    }
    
    if (node.leafMesh) {
      this.plantGroup.remove(node.leafMesh)
      node.leafMesh.geometry.dispose()
      ;(node.leafMesh.material as THREE.Material).dispose()
      node.leafMesh = null
    }
    
    node.children.forEach(child => this.clearPlantMeshes(child))
  }

  private createBranchMesh(node: BranchNode): void {
    const lightFactor = this.currentParams.light / 100
    const stemRadius = node.radius * (0.8 + lightFactor * 0.4)
    
    const geometry = new THREE.CylinderGeometry(
      stemRadius * 0.8,
      stemRadius,
      node.length,
      8
    )
    
    const lightGreen = new THREE.Color(0x7CFC00)
    const darkGreen = new THREE.Color(0x228B22)
    const stemColor = lightGreen.clone().lerp(darkGreen, 1 - lightFactor)
    
    const material = new THREE.MeshStandardMaterial({
      color: stemColor,
      roughness: 0.7,
      metalness: 0.1
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    const midPosition = new THREE.Vector3()
      .copy(node.position)
      .add(node.direction.clone().multiplyScalar(node.length / 2))
    
    mesh.position.copy(midPosition)
    
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, node.direction.clone().normalize())
    mesh.quaternion.copy(quaternion)
    
    this.plantGroup.add(mesh)
    node.mesh = mesh
    
    if (node.hasLeaf && node.level > 0 && this.leafCount < this.maxLeaves) {
      this.createLeaf(node)
      this.leafCount++
    }
    
    node.children.forEach(child => this.createBranchMesh(child))
  }

  private createLeaf(node: BranchNode): void {
    const endPosition = new THREE.Vector3()
      .copy(node.position)
      .add(node.direction.clone().multiplyScalar(node.length * 0.7))
    
    const geometry = new THREE.SphereGeometry(0.15, 16, 8)
    geometry.scale(1, 0.13, 1)
    
    const lightFactor = this.currentParams.light / 100
    const lightGreen = new THREE.Color(0x7CFC00)
    const darkGreen = new THREE.Color(0x228B22)
    const leafColor = lightGreen.clone().lerp(darkGreen, 1 - lightFactor * 0.7)
    
    const material = new THREE.MeshStandardMaterial({
      color: leafColor,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.05
    })
    
    const leaf = new THREE.Mesh(geometry, material)
    leaf.castShadow = true
    
    const leafDirection = node.direction.clone()
    const perpendicular = new THREE.Vector3(1, 0, 0)
    if (Math.abs(leafDirection.y) > 0.9) {
      perpendicular.set(0, 1, 0)
    }
    const axis = new THREE.Vector3().crossVectors(leafDirection, perpendicular).normalize()
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, Math.PI / 4)
    leafDirection.applyQuaternion(quaternion)
    
    const up = new THREE.Vector3(0, 1, 0)
    const leafQuat = new THREE.Quaternion().setFromUnitVectors(up, leafDirection.clone().normalize())
    leaf.quaternion.copy(leafQuat)
    
    leaf.position.copy(endPosition)
    
    this.plantGroup.add(leaf)
    node.leafMesh = leaf
  }

  private updatePlantMorphology(): void {
    const waterFactor = this.currentParams.water / 100
    const bendAmount = (1 - waterFactor) * 0.3
    
    if (this.rootNode) {
      this.applyBend(this.rootNode, bendAmount)
    }
  }

  private applyBend(node: BranchNode, bendAmount: number): void {
    if (node.children.length > 0) {
      node.children.forEach((child, index) => {
        const bendDirection = index % 2 === 0 ? 1 : -1
        const bendAngle = bendAmount * bendDirection
        
        const baseDirection = child.direction.clone()
        const axis = new THREE.Vector3(0, 0, 1)
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, bendAngle)
        
        const newDirection = baseDirection.clone()
        newDirection.applyQuaternion(quaternion)
        newDirection.normalize()
        
        if (child.mesh) {
          const up = new THREE.Vector3(0, 1, 0)
          const meshQuat = new THREE.Quaternion().setFromUnitVectors(up, newDirection)
          child.mesh.quaternion.copy(meshQuat)
        }
      })
    }
    
    node.children.forEach(child => this.applyBend(child, bendAmount * 0.7))
  }

  private updateSway(deltaTime: number): void {
    const swayAmplitude = 0.02
    const swayFrequency = 0.5
    
    if (this.rootNode) {
      this.applySway(this.rootNode, swayAmplitude, swayFrequency)
    }
    
    if (this.flower) {
      const swayX = Math.sin(this.time * 2) * swayAmplitude
      const swayZ = Math.cos(this.time * 1.5) * swayAmplitude
      this.flower.position.x += swayX
      this.flower.position.z += swayZ
    }
  }

  private applySway(node: BranchNode, amplitude: number, frequency: number): void {
    if (node.mesh) {
      const swayX = Math.sin(this.time * frequency + node.swayOffset) * amplitude
      const swayZ = Math.cos(this.time * frequency * 0.7 + node.swayOffset) * amplitude
      
      node.mesh.position.x += swayX
      node.mesh.position.z += swayZ
      
      if (node.leafMesh) {
        node.leafMesh.position.x += swayX * 1.2
        node.leafMesh.position.z += swayZ * 1.2
      }
    }
    
    node.children.forEach(child => {
      this.applySway(child, amplitude * 1.2, frequency)
    })
  }

  private checkFlowerCondition(): void {
    const tempOk = this.currentParams.temperature > 70
    const waterOk = this.currentParams.water > 60
    const hasHeight = this.rootNode && this.rootNode.length >= 2
    
    if (tempOk && waterOk && hasHeight && !this.hasFlower) {
      this.spawnFlower()
    } else if ((!tempOk || !waterOk) && this.hasFlower) {
      this.removeFlower()
    }
  }

  private spawnFlower(): void {
    if (!this.rootNode) return
    
    this.hasFlower = true
    this.flowerProgress = 0
    
    const flowerGroup = new THREE.Group()
    
    const petalCount = 5
    const petalColorStart = new THREE.Color(0xFF00FF)
    const petalColorEnd = new THREE.Color(0xFFA500)
    
    const points: THREE.Vector2[] = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      const x = 0.1 * Math.sin(t * Math.PI)
      const y = t * 0.3
      points.push(new THREE.Vector2(x, y))
    }
    
    for (let i = 0; i < petalCount; i++) {
      const petalGeometry = new THREE.LatheGeometry(points, 8)
      const petalMaterial = new THREE.MeshStandardMaterial({
        color: petalColorStart.clone().lerp(petalColorEnd, i / petalCount),
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0.1
      })
      
      const petal = new THREE.Mesh(petalGeometry, petalMaterial)
      petal.castShadow = true
      
      const angle = (i / petalCount) * Math.PI * 2
      petal.rotation.y = angle
      petal.rotation.x = Math.PI / 6
      
      petal.scale.set(0, 0, 0)
      petal.userData.targetScale = 1
      petal.userData.index = i
      
      flowerGroup.add(petal)
    }
    
    const centerGeometry = new THREE.SphereGeometry(0.08, 16, 16)
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFA500,
      emissiveIntensity: 0.5
    })
    const center = new THREE.Mesh(centerGeometry, centerMaterial)
    center.scale.set(0, 0, 0)
    center.userData.targetScale = 1
    flowerGroup.add(center)
    
    const topPosition = new THREE.Vector3()
      .copy(this.rootNode.position)
      .add(this.rootNode.direction.clone().multiplyScalar(this.rootNode.length))
    
    flowerGroup.position.copy(topPosition)
    flowerGroup.position.y += 0.15
    
    this.plantGroup.add(flowerGroup)
    this.flower = flowerGroup
    
    if (this.onFlowerSpawned) {
      this.onFlowerSpawned(flowerGroup.position.clone())
    }
  }

  private removeFlower(): void {
    this.hasFlower = false
    this.flowerProgress = 0
    
    if (this.flower) {
      this.plantGroup.remove(this.flower)
      this.flower.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
      this.flower = null
    }
  }

  private updateFlower(deltaTime: number): void {
    if (!this.flower || !this.hasFlower) return
    
    const tempFactor = (this.currentParams.temperature - 70) / 30
    const targetProgress = Math.max(0, Math.min(1, tempFactor))
    
    const speed = 0.5
    if (this.flowerProgress < targetProgress) {
      this.flowerProgress = Math.min(targetProgress, this.flowerProgress + deltaTime * speed)
    } else if (this.flowerProgress > targetProgress) {
      this.flowerProgress = Math.max(targetProgress, this.flowerProgress - deltaTime * speed * 0.5)
    }
    
    this.flower.children.forEach((petal, index) => {
      if (petal instanceof THREE.Mesh) {
        const scale = this.flowerProgress * (petal.userData.targetScale || 1)
        petal.scale.set(scale, scale, scale)
      }
    })
  }

  public getPlantHeight(): number {
    if (!this.rootNode) return 0
    return this.rootNode.length
  }

  public getCurrentParams(): EnvironmentParams {
    return { ...this.currentParams }
  }

  public dispose(): void {
    this.clearPlantMeshes(this.rootNode)
    this.removeFlower()
    
    if (this.seed) {
      this.seed.geometry.dispose()
      ;(this.seed.material as THREE.Material).dispose()
    }
    if (this.seedCore) {
      this.seedCore.geometry.dispose()
      ;(this.seedCore.material as THREE.Material).dispose()
    }
    
    this.scene.remove(this.plantGroup)
  }
}
