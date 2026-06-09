import * as THREE from 'three'

export interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  radius: number
  baseColor: THREE.Color
  flashTimer: number
}

export interface SimulationStats {
  particleCount: number
  collisionCount: number
  averageSpeed: number
}

export class MolecularSimulation {
  private scene: THREE.Scene
  private particles: Particle[] = []
  private boundingBoxSize: number = 20
  private collisionRetention: number = 0.8
  private flashDuration: number = 0.2
  private speedFactor: number = 1.0
  private collisionCount: number = 0
  private speedAccumulator: number = 0
  private speedSamples: number = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  createParticle(): Particle {
    const radius = 0.3 + Math.random() * 0.3
    const geometry = new THREE.SphereGeometry(radius, 16, 12)
    const material = new THREE.MeshPhongMaterial({
      shininess: 80,
      specular: 0x333333,
    })
    const mesh = new THREE.Mesh(geometry, material)

    const half = this.boundingBoxSize / 2 - radius
    mesh.position.set(
      (Math.random() - 0.5) * 2 * half,
      (Math.random() - 0.5) * 2 * half,
      (Math.random() - 0.5) * 2 * half
    )

    const speed = 0.5 + Math.random() * 1.0
    const direction = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize()
    const velocity = direction.multiplyScalar(speed)

    const hue = (speed - 0.5) / 1.0
    const baseColor = new THREE.Color().setHSL(hue * 0.7, 1.0, 0.55)
    ;(material as THREE.MeshPhongMaterial).color.copy(baseColor)

    this.scene.add(mesh)

    return {
      mesh,
      velocity,
      radius,
      baseColor,
      flashTimer: 0,
    }
  }

  removeParticle(particle: Particle): void {
    this.scene.remove(particle.mesh)
    ;(particle.mesh.geometry as THREE.BufferGeometry).dispose()
    ;(particle.mesh.material as THREE.Material).dispose()
  }

  setParticleCount(count: number): void {
    while (this.particles.length < count) {
      this.particles.push(this.createParticle())
    }
    while (this.particles.length > count) {
      const removed = this.particles.pop()
      if (removed) this.removeParticle(removed)
    }
  }

  setSpeedFactor(factor: number): void {
    this.speedFactor = factor
  }

  getSpeedFactor(): number {
    return this.speedFactor
  }

  resetCollisionCount(): void {
    this.collisionCount = 0
    this.speedAccumulator = 0
    this.speedSamples = 0
  }

  getStats(): SimulationStats {
    const avgSpeed = this.speedSamples > 0
      ? this.speedAccumulator / this.speedSamples
      : 0
    return {
      particleCount: this.particles.length,
      collisionCount: this.collisionCount,
      averageSpeed: avgSpeed,
    }
  }

  resetSpeedSampling(): void {
    this.speedAccumulator = 0
    this.speedSamples = 0
  }

  update(deltaTime: number): void {
    const halfBox = this.boundingBoxSize / 2
    const dt = Math.min(deltaTime, 0.05)
    const particles = this.particles

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      p.mesh.position.addScaledVector(p.velocity, this.speedFactor * dt * 60)

      if (p.flashTimer > 0) {
        p.flashTimer -= deltaTime
        const material = p.mesh.material as THREE.MeshPhongMaterial
        if (p.flashTimer <= 0) {
          material.color.copy(p.baseColor)
          material.emissive.setHex(0x000000)
        } else {
          const t = p.flashTimer / this.flashDuration
          material.color.lerpColors(new THREE.Color(0xffffff), p.baseColor, 1 - t)
          material.emissive.setRGB(t * 0.6, t * 0.6, t * 0.6)
        }
      }

      const pos = p.mesh.position
      const r = p.radius
      if (pos.x - r < -halfBox) {
        pos.x = -halfBox + r
        p.velocity.x = Math.abs(p.velocity.x)
        this.collisionCount++
        this.triggerFlash(p)
      } else if (pos.x + r > halfBox) {
        pos.x = halfBox - r
        p.velocity.x = -Math.abs(p.velocity.x)
        this.collisionCount++
        this.triggerFlash(p)
      }
      if (pos.y - r < -halfBox) {
        pos.y = -halfBox + r
        p.velocity.y = Math.abs(p.velocity.y)
        this.collisionCount++
        this.triggerFlash(p)
      } else if (pos.y + r > halfBox) {
        pos.y = halfBox - r
        p.velocity.y = -Math.abs(p.velocity.y)
        this.collisionCount++
        this.triggerFlash(p)
      }
      if (pos.z - r < -halfBox) {
        pos.z = -halfBox + r
        p.velocity.z = Math.abs(p.velocity.z)
        this.collisionCount++
        this.triggerFlash(p)
      } else if (pos.z + r > halfBox) {
        pos.z = halfBox - r
        p.velocity.z = -Math.abs(p.velocity.z)
        this.collisionCount++
        this.triggerFlash(p)
      }

      this.speedAccumulator += p.velocity.length()
      this.speedSamples++
    }

    this.checkParticleCollisions()
  }

  private triggerFlash(p: Particle): void {
    if (p.flashTimer <= 0) {
      p.flashTimer = this.flashDuration
      const material = p.mesh.material as THREE.MeshPhongMaterial
      material.color.setHex(0xffffff)
      material.emissive.setHex(0xaaaaaa)
    }
  }

  private checkParticleCollisions(): void {
    const particles = this.particles
    const len = particles.length
    const useSampling = len > 150

    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        if (useSampling && Math.random() > 0.5) continue

        const a = particles[i]
        const b = particles[j]
        const dx = b.mesh.position.x - a.mesh.position.x
        const dy = b.mesh.position.y - a.mesh.position.y
        const dz = b.mesh.position.z - a.mesh.position.z
        const distSq = dx * dx + dy * dy + dz * dz
        const minDist = a.radius + b.radius

        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq)
          const nx = dx / dist
          const ny = dy / dist
          const nz = dz / dist

          const dvx = b.velocity.x - a.velocity.x
          const dvy = b.velocity.y - a.velocity.y
          const dvz = b.velocity.z - a.velocity.z
          const vn = dvx * nx + dvy * ny + dvz * nz

          if (vn < 0) {
            const restitution = this.collisionRetention
            const impulse = -(1 + restitution) * vn / 2

            a.velocity.x -= impulse * nx
            a.velocity.y -= impulse * ny
            a.velocity.z -= impulse * nz
            b.velocity.x += impulse * nx
            b.velocity.y += impulse * ny
            b.velocity.z += impulse * nz

            const overlap = minDist - dist
            const separationX = (overlap / 2 + 0.001) * nx
            const separationY = (overlap / 2 + 0.001) * ny
            const separationZ = (overlap / 2 + 0.001) * nz
            a.mesh.position.x -= separationX
            a.mesh.position.y -= separationY
            a.mesh.position.z -= separationZ
            b.mesh.position.x += separationX
            b.mesh.position.y += separationY
            b.mesh.position.z += separationZ

            this.collisionCount++
            this.triggerFlash(a)
            this.triggerFlash(b)
          }
        }
      }
    }
  }

  clearAll(): void {
    while (this.particles.length > 0) {
      const removed = this.particles.pop()
      if (removed) this.removeParticle(removed)
    }
    this.collisionCount = 0
    this.speedAccumulator = 0
    this.speedSamples = 0
  }
}
