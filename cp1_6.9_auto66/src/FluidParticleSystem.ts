import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  age: number
  lifespan: number
  isOnGround: boolean
  groundTime: number
  trailPositions: THREE.Vector3[]
  trailActive: boolean
  trailAge: number
}

export interface ObstacleRef {
  position: THREE.Vector3
  radius: number
  onHit: () => void
}

const MAX_PARTICLES = 2000
const GRAVITY = 9.8
const GROUND_RESTITUTION = 0.3
const GROUND_PERTURBATION = 0.2
const OBSTACLE_RESTITUTION = 0.5
const MAX_SPEED = 3
const GROUND_SLIDE_TIME = 0.5
const GROUND_FADE_TIME = 2
const TRAIL_DURATION = 0.2
const TRAIL_LENGTH = 8

export class FluidParticleSystem {
  private scene: THREE.Scene
  private particles: Particle[] = []
  private points: THREE.Points
  private geometry: THREE.BufferGeometry
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private trailLines: THREE.Line[] = []
  private trailGeometries: THREE.BufferGeometry[] = []
  private trailMaterials: THREE.LineBasicMaterial[] = []
  private freeTrailSlots: number[] = []
  private emitRateMultiplier = 1
  private obstacles: ObstacleRef[] = []

  private colorInjection = new THREE.Color(0xffffff)
  private colorBlue = new THREE.Color(0x0064ff)
  private colorPurple = new THREE.Color(0x9600ff)
  private colorRed = new THREE.Color(0xff3232)
  private colorFadeOut = new THREE.Color(0xffffff)
  private tmpColor = new THREE.Color()

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.colors = new Float32Array(MAX_PARTICLES * 3)
    this.sizes = new Float32Array(MAX_PARTICLES)

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)')
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.3)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    const texture = new THREE.CanvasTexture(canvas)

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      map: texture,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    this.points = new THREE.Points(this.geometry, material)
    this.points.frustumCulled = false
    this.scene.add(this.points)

    this.initTrailPool()
  }

  private initTrailPool(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const geo = new THREE.BufferGeometry()
      const trailPos = new Float32Array(TRAIL_LENGTH * 3)
      geo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3))
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const line = new THREE.Line(geo, mat)
      line.visible = false
      this.trailGeometries.push(geo)
      this.trailMaterials.push(mat)
      this.trailLines.push(line)
      this.freeTrailSlots.push(i)
      this.scene.add(line)
    }
  }

  public setObstacles(obstacles: ObstacleRef[]): void {
    this.obstacles = obstacles
  }

  public setEmitRateMultiplier(multiplier: number): void {
    this.emitRateMultiplier = multiplier
  }

  public getEmitRateMultiplier(): number {
    return this.emitRateMultiplier
  }

  public emitParticle(position: THREE.Vector3, direction: THREE.Vector3): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift()
    }

    const dir = direction.clone().normalize()
    const angleOffset = (Math.random() - 0.5) * Math.PI * 2
    const tiltOffset = (Math.random() - 0.5) * (15 * Math.PI / 180) * 2
    const axis = new THREE.Vector3(-dir.y, dir.x, 0).normalize()
    if (axis.lengthSq() < 0.001) axis.set(1, 0, 0)
    dir.applyAxisAngle(axis, tiltOffset)
    const upAxis = dir.clone().cross(axis).normalize()
    dir.applyAxisAngle(upAxis, angleOffset)
    dir.normalize()

    const speed = 2 + Math.random() * 1
    const particle: Particle = {
      position: position.clone(),
      velocity: dir.multiplyScalar(speed),
      age: 0,
      lifespan: 10,
      isOnGround: false,
      groundTime: 0,
      trailPositions: [],
      trailActive: false,
      trailAge: 0
    }

    this.particles.push(particle)
  }

  public getParticleCount(): number {
    return this.particles.length
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05)

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.age += dt

      if (p.age >= p.lifespan) {
        this.releaseTrail(p)
        this.particles.splice(i, 1)
        continue
      }

      if (p.isOnGround) {
        p.groundTime += dt
        if (p.groundTime > GROUND_SLIDE_TIME + GROUND_FADE_TIME) {
          this.releaseTrail(p)
          this.particles.splice(i, 1)
          continue
        }
        if (p.groundTime <= GROUND_SLIDE_TIME) {
          p.velocity.multiplyScalar(Math.pow(0.02, dt / GROUND_SLIDE_TIME))
        } else {
          p.velocity.set(0, 0, 0)
        }
      } else {
        p.velocity.y -= GRAVITY * dt
      }

      p.position.addScaledVector(p.velocity, dt)

      if (!p.isOnGround && p.position.y <= 0) {
        p.position.y = 0.001
        p.velocity.y = -p.velocity.y * GROUND_RESTITUTION
        p.velocity.x += (Math.random() - 0.5) * GROUND_PERTURBATION
        p.velocity.z += (Math.random() - 0.5) * GROUND_PERTURBATION
        if (p.velocity.length() < 0.5) {
          p.isOnGround = true
          p.groundTime = 0
        }
      }

      if (!p.isOnGround) {
        for (const obs of this.obstacles) {
          const dx = p.position.x - obs.position.x
          const dy = p.position.y - obs.position.y
          const dz = p.position.z - obs.position.z
          const distSq = dx * dx + dy * dy + dz * dz
          const minDist = obs.radius + 0.04
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001
            const nx = dx / dist
            const ny = dy / dist
            const nz = dz / dist
            const dot = p.velocity.x * nx + p.velocity.y * ny + p.velocity.z * nz
            if (dot < 0) {
              p.velocity.x = (p.velocity.x - 2 * dot * nx) * OBSTACLE_RESTITUTION
              p.velocity.y = (p.velocity.y - 2 * dot * ny) * OBSTACLE_RESTITUTION
              p.velocity.z = (p.velocity.z - 2 * dot * nz) * OBSTACLE_RESTITUTION
              p.velocity.multiplyScalar(1.1)
              const speed = p.velocity.length()
              if (speed > MAX_SPEED) {
                p.velocity.multiplyScalar(MAX_SPEED / speed)
              }
              p.position.x = obs.position.x + nx * (minDist + 0.001)
              p.position.y = obs.position.y + ny * (minDist + 0.001)
              p.position.z = obs.position.z + nz * (minDist + 0.001)
              obs.onHit()
              this.activateTrail(p)
            }
          }
        }
      }

      if (p.trailActive) {
        p.trailAge += dt
        if (p.trailAge >= TRAIL_DURATION) {
          this.releaseTrail(p)
        } else {
          p.trailPositions.unshift(p.position.clone())
          if (p.trailPositions.length > TRAIL_LENGTH) {
            p.trailPositions.pop()
          }
        }
      }
    }

    this.updateBuffers()
    this.updateTrails()
  }

  private activateTrail(p: Particle): void {
    if (p.trailActive) return
    if (this.freeTrailSlots.length === 0) return
    const slot = this.freeTrailSlots.pop()!
    ;(p as any)._trailSlot = slot
    p.trailActive = true
    p.trailAge = 0
    p.trailPositions = [p.position.clone()]
    this.trailLines[slot].visible = true
  }

  private releaseTrail(p: Particle): void {
    if (!p.trailActive) return
    const slot = (p as any)._trailSlot
    if (slot !== undefined) {
      this.trailLines[slot].visible = false
      this.trailMaterials[slot].opacity = 0
      this.freeTrailSlots.push(slot)
    }
    p.trailActive = false
    p.trailPositions = []
    p.trailAge = 0
  }

  private updateTrails(): void {
    for (const p of this.particles) {
      if (!p.trailActive) continue
      const slot = (p as any)._trailSlot
      if (slot === undefined) continue
      const geo = this.trailGeometries[slot]
      const mat = this.trailMaterials[slot]
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
      const arr = posAttr.array as Float32Array
      const positions = p.trailPositions
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        if (i < positions.length) {
          arr[i * 3] = positions[i].x
          arr[i * 3 + 1] = positions[i].y
          arr[i * 3 + 2] = positions[i].z
        } else if (positions.length > 0) {
          const last = positions[positions.length - 1]
          arr[i * 3] = last.x
          arr[i * 3 + 1] = last.y
          arr[i * 3 + 2] = last.z
        }
      }
      posAttr.needsUpdate = true
      geo.setDrawRange(0, Math.max(2, positions.length))
      const alpha = 1 - p.trailAge / TRAIL_DURATION
      mat.opacity = alpha * 0.8
      mat.color.copy(this.colorRed).lerp(this.colorBlue, alpha)
    }
  }

  private updateBuffers(): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const colArr = colAttr.array as Float32Array
    const sizeArr = sizeAttr.array as Float32Array

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i]
        const t = p.age / p.lifespan
        posArr[i * 3] = p.position.x
        posArr[i * 3 + 1] = p.position.y
        posArr[i * 3 + 2] = p.position.z

        this.computeParticleColor(p.age, p.lifespan, this.tmpColor)
        let alpha = 1
        if (p.age >= 8) {
          alpha = 1 - (p.age - 8) / 2
        }
        if (p.isOnGround && p.groundTime > GROUND_SLIDE_TIME) {
          alpha = 0.2 * (1 - (p.groundTime - GROUND_SLIDE_TIME) / GROUND_FADE_TIME)
        }
        colArr[i * 3] = this.tmpColor.r * alpha
        colArr[i * 3 + 1] = this.tmpColor.g * alpha
        colArr[i * 3 + 2] = this.tmpColor.b * alpha

        const speed = p.velocity.length()
        let baseSize = 0.04 + Math.min(speed / MAX_SPEED, 1) * 0.04
        if (p.age < 1) {
          baseSize = 0.01 + (p.age / 1) * 0.03
        } else if (p.age >= 8) {
          baseSize = 0.04 * (1 - (p.age - 8) / 2) + 0.01 * ((p.age - 8) / 2)
        } else {
          baseSize = 0.02 + Math.min(speed / MAX_SPEED, 1) * 0.06 + Math.sin(p.age * 8) * 0.005
        }
        sizeArr[i] = baseSize
      } else {
        sizeArr[i] = 0
      }
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    this.geometry.setDrawRange(0, this.particles.length)
  }

  private computeParticleColor(age: number, lifespan: number, out: THREE.Color): void {
    if (age < 1) {
      const t = age / 1
      out.copy(this.colorInjection).lerp(this.colorBlue, t)
    } else if (age < 4.5) {
      const t = (age - 1) / 3.5
      out.copy(this.colorBlue).lerp(this.colorPurple, t)
    } else if (age < 8) {
      const t = (age - 4.5) / 3.5
      out.copy(this.colorPurple).lerp(this.colorRed, t)
    } else {
      const t = (age - 8) / 2
      out.copy(this.colorRed).lerp(this.colorFadeOut, t)
    }
  }

  public dispose(): void {
    this.scene.remove(this.points)
    this.geometry.dispose()
    ;(this.points.material as THREE.Material).dispose()
    for (let i = 0; i < this.trailLines.length; i++) {
      this.scene.remove(this.trailLines[i])
      this.trailGeometries[i].dispose()
      this.trailMaterials[i].dispose()
    }
  }
}
