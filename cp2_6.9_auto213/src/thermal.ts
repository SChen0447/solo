import * as THREE from 'three'

export interface ThermalParams {
  temperatureGradient: number
  particleCount: number
}

interface ParticleData {
  velocity: THREE.Vector3
  life: number
  maxLife: number
}

export class ThermalSystem {
  public group: THREE.Group
  private particles!: THREE.Points
  private particleData: ParticleData[] = []
  private params: ThermalParams
  private positions!: Float32Array
  private colors!: Float32Array
  private sizes!: Float32Array
  private maxParticles: number = 500
  private startColor = new THREE.Color(0xFF6600)
  private endColor = new THREE.Color(0x003366)

  constructor(scene: THREE.Scene, params: ThermalParams) {
    this.params = { ...params }
    this.group = new THREE.Group()
    scene.add(this.group)

    this.createVent()
    this.createParticleSystem()
    this.addVentLight(scene)
  }

  private createVent(): void {
    const ventGroup = new THREE.Group()

    const baseGeo = new THREE.CylinderGeometry(0.8, 1.2, 1.0, 16)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1
    })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = -1.5
    ventGroup.add(base)

    const chimneyGeo = new THREE.CylinderGeometry(0.3, 0.7, 1.5, 12)
    const chimney = new THREE.Mesh(chimneyGeo, baseMat)
    chimney.position.y = -0.25
    ventGroup.add(chimney)

    for (let i = 0; i < 5; i++) {
      const rockGeo = new THREE.IcosahedronGeometry(0.2 + Math.random() * 0.15, 0)
      const rock = new THREE.Mesh(rockGeo, baseMat)
      const angle = (i / 5) * Math.PI * 2
      const dist = 0.6 + Math.random() * 0.3
      rock.position.set(
        Math.cos(angle) * dist,
        -1.8 + Math.random() * 0.3,
        Math.sin(angle) * dist
      )
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      rock.scale.setScalar(0.8 + Math.random() * 0.5)
      ventGroup.add(rock)
    }

    this.group.add(ventGroup)
  }

  private createParticleSystem(): void {
    const geometry = new THREE.BufferGeometry()
    const count = this.maxParticles

    this.positions = new Float32Array(count * 3)
    this.colors = new Float32Array(count * 3)
    this.sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = 0
      this.positions[i * 3 + 1] = -1
      this.positions[i * 3 + 2] = 0

      this.colors[i * 3] = this.startColor.r
      this.colors[i * 3 + 1] = this.startColor.g
      this.colors[i * 3 + 2] = this.startColor.b

      this.sizes[i] = 0.15
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    this.particles = new THREE.Points(geometry, material)
    this.group.add(this.particles)

    for (let i = 0; i < count; i++) {
      this.particleData.push({
        velocity: new THREE.Vector3(0, 0, 0),
        life: Math.random(),
        maxLife: 3 + Math.random() * 2
      })
      this.resetParticle(i)
    }
  }

  private addVentLight(scene: THREE.Scene): void {
    const pointLight = new THREE.PointLight(0xFF6600, 2, 10)
    pointLight.position.set(0, -1, 0)
    scene.add(pointLight)
  }

  private resetParticle(index: number): void {
    const spread = 0.2
    this.positions[index * 3] = (Math.random() - 0.5) * spread
    this.positions[index * 3 + 1] = -1 + Math.random() * 0.1
    this.positions[index * 3 + 2] = (Math.random() - 0.5) * spread

    const speed = 0.5 + (this.params.temperatureGradient / 100) * 1.5
    this.particleData[index].velocity.set(
      (Math.random() - 0.5) * 0.1,
      speed + Math.random() * 0.5,
      (Math.random() - 0.5) * 0.1
    )
    this.particleData[index].life = 0
    this.particleData[index].maxLife = 3 + Math.random() * 2
  }

  public update(delta: number): void {
    const activeCount = Math.min(this.params.particleCount, this.maxParticles)
    const geo = this.particles.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = geo.getAttribute('color') as THREE.BufferAttribute

    for (let i = 0; i < this.maxParticles; i++) {
      if (i >= activeCount) {
        this.positions[i * 3 + 1] = -100
        continue
      }

      const pd = this.particleData[i]
      pd.life += delta

      if (pd.life >= pd.maxLife) {
        this.resetParticle(i)
      } else {
        const t = pd.life / pd.maxLife
        this.positions[i * 3] += pd.velocity.x * delta
        this.positions[i * 3 + 1] += pd.velocity.y * delta
        this.positions[i * 3 + 2] += pd.velocity.z * delta

        pd.velocity.x += (Math.random() - 0.5) * 0.02
        pd.velocity.z += (Math.random() - 0.5) * 0.02

        const heightRatio = Math.min((this.positions[i * 3 + 1] + 1) / 6, 1)
        const colorT = Math.min(heightRatio * (1 + (100 - this.params.temperatureGradient) / 100), 1)

        const r = this.startColor.r + (this.endColor.r - this.startColor.r) * colorT
        const g = this.startColor.g + (this.endColor.g - this.startColor.g) * colorT
        const b = this.startColor.b + (this.endColor.b - this.startColor.b) * colorT

        this.colors[i * 3] = r
        this.colors[i * 3 + 1] = g
        this.colors[i * 3 + 2] = b

        const mat = this.particles.material as THREE.PointsMaterial
        mat.opacity = 0.6 - 0.5 * t
      }
    }

    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    this.particles.geometry.setDrawRange(0, activeCount)
  }

  public setParams(params: Partial<ThermalParams>): void {
    if (params.temperatureGradient !== undefined) {
      this.params.temperatureGradient = params.temperatureGradient
    }
    if (params.particleCount !== undefined) {
      this.params.particleCount = Math.max(50, Math.min(500, params.particleCount))
    }
  }

  public getTemperatureAt(x: number, z: number): number {
    const dist = Math.sqrt(x * x + z * z)
    const gradient = this.params.temperatureGradient / 100
    if (dist < 2) return 80 + gradient * 40
    if (dist < 5) return 40 + (1 - (dist - 2) / 3) * 40 * gradient
    if (dist < 10) return 10 + (1 - (dist - 5) / 5) * 30 * gradient
    return 10
  }
}

export function createThermalVents(scene: THREE.Scene, params: ThermalParams): ThermalSystem {
  return new ThermalSystem(scene, params)
}
