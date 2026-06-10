import * as THREE from 'three'

const MAX_PARTICLES = 500

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  life: number
  maxLife: number
  size: number
  active: boolean
}

export class ParticleEffect {
  private scene: THREE.Scene
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.colors = new Float32Array(MAX_PARTICLES * 3)
    this.sizes = new Float32Array(MAX_PARTICLES)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
    this.scene.add(this.points)

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        life: 0,
        maxLife: 0,
        size: 0,
        active: false
      })
    }

    this.hideAll()
  }

  private hideAll(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.sizes[i] = 0
    }
    this.geometry.attributes.size.needsUpdate = true
  }

  private getInactiveParticle(): Particle | null {
    for (const p of this.particles) {
      if (!p.active) return p
    }
    return null
  }

  spawnExplosion(position: THREE.Vector3, count: number = 150): void {
    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle()
      if (!p) break

      p.position.copy(position)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 2 + Math.random() * 3
      p.velocity.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      )
      const hue = Math.random() * 360
      p.color.setHSL(hue / 360, 0.8, 0.6)
      p.life = 2
      p.maxLife = 2
      p.size = 0.3
      p.active = true
    }
  }

  spawnVictory(): void {
    const center = new THREE.Vector3(0, 0, -5)
    for (let i = 0; i < 400; i++) {
      const p = this.getInactiveParticle()
      if (!p) break

      p.position.copy(center)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 3 + Math.random() * 5
      p.velocity.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      )
      p.color.setHex(0xFFD700)
      const hueVariation = (Math.random() - 0.5) * 0.1
      p.color.offsetHSL(hueVariation, 0, 0)
      p.life = 5
      p.maxLife = 5
      p.size = 0.35
      p.active = true
    }
  }

  update(delta: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      if (!p.active) {
        this.sizes[i] = 0
        continue
      }

      p.life -= delta
      if (p.life <= 0) {
        p.active = false
        this.sizes[i] = 0
        continue
      }

      const t = p.life / p.maxLife
      p.position.addScaledVector(p.velocity, delta)
      p.velocity.y -= 2 * delta

      this.positions[i * 3] = p.position.x
      this.positions[i * 3 + 1] = p.position.y
      this.positions[i * 3 + 2] = p.position.z
      this.colors[i * 3] = p.color.r
      this.colors[i * 3 + 1] = p.color.g
      this.colors[i * 3 + 2] = p.color.b
      this.sizes[i] = p.size * t
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true

    this.material.opacity = 1
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.scene.remove(this.points)
  }
}
