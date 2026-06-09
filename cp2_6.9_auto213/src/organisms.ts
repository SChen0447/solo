import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ThermalSystem } from './thermal'

export interface OrganismParams {
  temperatureGradient: number
  density: number
}

interface OrganismData {
  basePosition: THREE.Vector3
  offset: number
  temperature: number
}

export class OrganismSystem {
  public group: THREE.Group
  public interactiveObjects: THREE.Object3D[] = []

  private tubeWormMesh!: THREE.InstancedMesh
  private tubeWormData: OrganismData[] = []
  private tubeWormCount: number = 0

  private microbialMat!: THREE.Mesh
  private matUniforms!: { [key: string]: THREE.IUniform }

  private shrimpMesh!: THREE.InstancedMesh
  private shrimpData: OrganismData[] = []
  private shrimpCount: number = 0

  private params: OrganismParams
  private thermal: ThermalSystem
  private dummy = new THREE.Object3D()
  private hoveredObject: THREE.Object3D | null = null

  private tubeWormEmissiveMat: THREE.MeshStandardMaterial
  private tubeWormNormalMat: THREE.MeshStandardMaterial
  private shrimpEmissiveMat: THREE.MeshStandardMaterial
  private shrimpNormalMat: THREE.MeshStandardMaterial

  constructor(scene: THREE.Scene, params: OrganismParams, thermal: ThermalSystem) {
    this.params = { ...params }
    this.thermal = thermal
    this.group = new THREE.Group()
    scene.add(this.group)

    this.tubeWormNormalMat = new THREE.MeshStandardMaterial({
      color: 0xFF4D4D,
      roughness: 0.6,
      metalness: 0.1,
      vertexColors: true
    })

    this.tubeWormEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xFF4D4D,
      roughness: 0.6,
      metalness: 0.1,
      vertexColors: true,
      emissive: 0xFFFF00,
      emissiveIntensity: 0.5
    })

    this.shrimpNormalMat = new THREE.MeshStandardMaterial({
      color: 0xF0F0F0,
      roughness: 0.5,
      metalness: 0.2,
      vertexColors: true
    })

    this.shrimpEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xF0F0F0,
      roughness: 0.5,
      metalness: 0.2,
      vertexColors: true,
      emissive: 0xFFFF00,
      emissiveIntensity: 0.5
    })

    this.createTubeWorms()
    this.createMicrobialMat()
    this.createShrimps()
    this.createEnvironment(scene)
  }

  private createTubeWorms(): void {
    const maxCount = 80
    const geo = this.createTubeWormGeometry()

    this.tubeWormMesh = new THREE.InstancedMesh(geo, this.tubeWormNormalMat, maxCount)
    this.tubeWormMesh.count = 0
    this.tubeWormMesh.userData = { type: 'tubeWorm' }
    this.group.add(this.tubeWormMesh)
    this.interactiveObjects.push(this.tubeWormMesh)

    this.regenerateTubeWorms()
  }

  private createTubeWormGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = []

    const tubeGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.8, 8, 1, true)
    tubeGeo.translate(0, 0.4, 0)
    geometries.push(tubeGeo)

    const topGeo = new THREE.SphereGeometry(0.04, 8, 6)
    topGeo.translate(0, 0.82, 0)
    geometries.push(topGeo)

    const merged = mergeGeometries(geometries, false)
    const colors = new Float32Array(merged.attributes.position.count * 3)
    const colorStart = new THREE.Color(0xFF4D4D)
    const colorEnd = new THREE.Color(0xCC0000)

    for (let i = 0; i < merged.attributes.position.count; i++) {
      const y = merged.attributes.position.getY(i)
      const t = Math.min(y / 0.9, 1)
      colors[i * 3] = colorStart.r + (colorEnd.r - colorStart.r) * t
      colors[i * 3 + 1] = colorStart.g + (colorEnd.g - colorStart.g) * t
      colors[i * 3 + 2] = colorStart.b + (colorEnd.b - colorStart.b) * t
    }
    merged.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return merged
  }

  private regenerateTubeWorms(): void {
    this.tubeWormData = []
    const densityFactor = this.params.density / 100
    const maxRadius = 2 + (this.params.temperatureGradient / 100) * 1.5
    const targetCount = Math.floor(15 * 3 * densityFactor)
    const actualCount = Math.min(targetCount, 80)

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 0.3 + Math.random() * (maxRadius - 0.3)
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const temp = this.thermal.getTemperatureAt(x, z)

      this.tubeWormData.push({
        basePosition: new THREE.Vector3(x, -2, z),
        offset: Math.random() * Math.PI * 2,
        temperature: temp
      })
    }

    this.tubeWormCount = actualCount
    this.tubeWormMesh.count = actualCount
  }

  private createMicrobialMat(): void {
    const geometry = new THREE.RingGeometry(2, 5, 64)
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const colors = new Float32Array(posAttr.count * 3)
    const colorStart = new THREE.Color(0x00FF66)
    const colorEnd = new THREE.Color(0x009933)

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i)
      const z = posAttr.getZ(i)
      const dist = Math.sqrt(x * x + z * z)
      const t = (dist - 2) / 3

      colors[i * 3] = colorStart.r + (colorEnd.r - colorStart.r) * t
      colors[i * 3 + 1] = colorStart.g + (colorEnd.g - colorStart.g) * t
      colors[i * 3 + 2] = colorStart.b + (colorEnd.b - colorStart.b) * t
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    this.matUniforms = {
      uTime: { value: 0 },
      uWaveStrength: { value: 0.05 }
    }

    const material = new THREE.ShaderMaterial({
      uniforms: this.matUniforms,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        uniform float uWaveStrength;
        varying vec3 vColor;
        varying vec2 vUv;

        void main() {
          vColor = color;
          vUv = uv;
          vec3 pos = position;
          float wave = sin(pos.x * 5.0 + uTime * 1.5) * cos(pos.z * 5.0 + uTime * 1.2) * uWaveStrength;
          pos.y += wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying vec2 vUv;

        void main() {
          gl_FragColor = vec4(vColor, 0.7);
        }
      `
    })

    this.microbialMat = new THREE.Mesh(geometry, material)
    this.microbialMat.rotation.x = -Math.PI / 2
    this.microbialMat.position.y = -1.98
    this.group.add(this.microbialMat)
  }

  private createShrimps(): void {
    const maxCount = 120
    const geo = this.createShrimpGeometry()

    this.shrimpMesh = new THREE.InstancedMesh(geo, this.shrimpNormalMat, maxCount)
    this.shrimpMesh.count = 0
    this.shrimpMesh.userData = { type: 'shrimp' }
    this.group.add(this.shrimpMesh)
    this.interactiveObjects.push(this.shrimpMesh)

    this.regenerateShrimps()
  }

  private createShrimpGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = []

    const bodyGeo = new THREE.ConeGeometry(0.025, 0.06, 6)
    bodyGeo.rotateX(Math.PI / 2)
    geometries.push(bodyGeo)

    const headGeo = new THREE.SphereGeometry(0.02, 6, 4)
    headGeo.translate(0, 0, 0.035)
    geometries.push(headGeo)

    const tailGeo = new THREE.ConeGeometry(0.015, 0.025, 4)
    tailGeo.rotateX(-Math.PI / 2)
    tailGeo.translate(0, 0, -0.04)
    geometries.push(tailGeo)

    const merged = mergeGeometries(geometries, false)
    const colors = new Float32Array(merged.attributes.position.count * 3)
    const colorStart = new THREE.Color(0xF0F0F0)
    const colorEnd = new THREE.Color(0xD0D0D0)

    for (let i = 0; i < merged.attributes.position.count; i++) {
      const t = Math.random()
      colors[i * 3] = colorStart.r + (colorEnd.r - colorStart.r) * t
      colors[i * 3 + 1] = colorStart.g + (colorEnd.g - colorStart.g) * t
      colors[i * 3 + 2] = colorStart.b + (colorEnd.b - colorStart.b) * t
    }
    merged.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return merged
  }

  private regenerateShrimps(): void {
    this.shrimpData = []
    const densityFactor = this.params.density / 100
    const minRadius = 5 - (this.params.temperatureGradient / 100) * 2
    const maxRadius = 10
    const targetCount = Math.floor(60 * densityFactor)
    const actualCount = Math.min(targetCount, 120)

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = minRadius + Math.random() * (maxRadius - minRadius)
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const temp = this.thermal.getTemperatureAt(x, z)

      this.shrimpData.push({
        basePosition: new THREE.Vector3(x, -1.85 + Math.random() * 0.3, z),
        offset: Math.random() * Math.PI * 2,
        temperature: temp
      })
    }

    this.shrimpCount = actualCount
    this.shrimpMesh.count = actualCount
  }

  private createEnvironment(scene: THREE.Scene): void {
    const groundGeo = new THREE.CircleGeometry(15, 64)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2B1B0E,
      roughness: 1.0,
      metalness: 0.0
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -2
    scene.add(ground)

    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 3 + Math.random() * 11
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      const rockGeo = new THREE.IcosahedronGeometry(0.1 + Math.random() * 0.2, 0)
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x4A3B32,
        roughness: 0.95
      })
      const rock = new THREE.Mesh(rockGeo, rockMat)
      rock.position.set(x, -2 + Math.random() * 0.1, z)
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      scene.add(rock)
    }

    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 6 + Math.random() * 8
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      const depositGeo = new THREE.ConeGeometry(0.1 + Math.random() * 0.15, 0.2 + Math.random() * 0.3, 6)
      const depositMat = new THREE.MeshStandardMaterial({
        color: 0x5C4033,
        roughness: 0.9
      })
      const deposit = new THREE.Mesh(depositGeo, depositMat)
      deposit.position.set(x, -2 + (0.2 + Math.random() * 0.3) / 2, z)
      scene.add(deposit)
    }
  }

  public update(delta: number, time: number): void {
    for (let i = 0; i < this.tubeWormCount; i++) {
      const data = this.tubeWormData[i]
      const sway = Math.sin(time * 1.5 + data.offset) * 0.05
      const height = 0.5 + Math.sin(data.offset) * 0.35

      this.dummy.position.copy(data.basePosition)
      this.dummy.position.y = -2 + height / 2
      this.dummy.rotation.z = sway
      this.dummy.rotation.x = sway * 0.5
      this.dummy.scale.set(1, height * 1.2, 1)
      this.dummy.updateMatrix()
      this.tubeWormMesh.setMatrixAt(i, this.dummy.matrix)
    }
    this.tubeWormMesh.instanceMatrix.needsUpdate = true

    this.matUniforms.uTime.value = time

    for (let i = 0; i < this.shrimpCount; i++) {
      const data = this.shrimpData[i]
      const angle = (time * 0.3 + data.offset) % (Math.PI * 2)
      const baseRadius = Math.sqrt(
        data.basePosition.x * data.basePosition.x +
        data.basePosition.z * data.basePosition.z
      )
      const wobble = Math.sin(time * 2 + data.offset) * 0.3
      const radius = baseRadius + wobble
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = data.basePosition.y + Math.sin(time * 1.5 + data.offset) * 0.1

      this.dummy.position.set(x, y, z)
      this.dummy.rotation.y = -angle + Math.PI / 2
      this.dummy.rotation.z = Math.sin(time * 3 + data.offset) * 0.1
      this.dummy.scale.setScalar(1)
      this.dummy.updateMatrix()
      this.shrimpMesh.setMatrixAt(i, this.dummy.matrix)
    }
    this.shrimpMesh.instanceMatrix.needsUpdate = true
  }

  public setParams(params: Partial<OrganismParams>): void {
    const needRegenerate =
      params.temperatureGradient !== undefined && params.temperatureGradient !== this.params.temperatureGradient ||
      params.density !== undefined && params.density !== this.params.density

    if (params.temperatureGradient !== undefined) {
      this.params.temperatureGradient = params.temperatureGradient
    }
    if (params.density !== undefined) {
      this.params.density = params.density
    }

    if (needRegenerate) {
      this.regenerateTubeWorms()
      this.regenerateShrimps()
    }
  }

  public setHovered(object: THREE.Object3D | null): void {
    if (this.hoveredObject === object) return

    if (this.hoveredObject === this.tubeWormMesh) {
      this.tubeWormMesh.material = this.tubeWormNormalMat
    } else if (this.hoveredObject === this.shrimpMesh) {
      this.shrimpMesh.material = this.shrimpNormalMat
    }

    this.hoveredObject = object

    if (object === this.tubeWormMesh) {
      this.tubeWormMesh.material = this.tubeWormEmissiveMat
    } else if (object === this.shrimpMesh) {
      this.shrimpMesh.material = this.shrimpEmissiveMat
    }
  }

  public getHoveredInfo(object: THREE.Object3D, instanceId: number): { name: string; temperature: number } {
    if (object === this.tubeWormMesh && instanceId >= 0 && instanceId < this.tubeWormCount) {
      return {
        name: '管虫 (Tube Worm)',
        temperature: Math.round(this.tubeWormData[instanceId].temperature)
      }
    }
    if (object === this.shrimpMesh && instanceId >= 0 && instanceId < this.shrimpCount) {
      return {
        name: '热泉虾 (Vent Shrimp)',
        temperature: Math.round(this.shrimpData[instanceId].temperature)
      }
    }
    if (object === this.microbialMat) {
      return {
        name: '微生物席 (Microbial Mat)',
        temperature: Math.round(this.thermal.getTemperatureAt(0, 3))
      }
    }
    return { name: '', temperature: 0 }
  }
}

export function createOrganisms(
  scene: THREE.Scene,
  params: OrganismParams,
  thermal: ThermalSystem
): OrganismSystem {
  return new OrganismSystem(scene, params, thermal)
}
