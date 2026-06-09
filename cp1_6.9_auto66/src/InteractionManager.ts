import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { FluidParticleSystem, ObstacleRef } from './FluidParticleSystem'

interface FluidSource {
  position: THREE.Vector3
  direction: THREE.Vector3
  age: number
  lifespan: number
  emitRate: number
  lastEmitTime: number
  emitInterval: number
  mesh: THREE.Mesh
}

interface Obstacle {
  mesh: THREE.Mesh
  body: CANNON.Body
  material: THREE.MeshPhongMaterial
  glowIntensity: number
  createdAt: number
  position: THREE.Vector3
}

interface PulseRing {
  mesh: THREE.Mesh
  age: number
  lifespan: number
  startScale: number
  endScale: number
}

interface DeathRing {
  positions: Float32Array
  geometry: THREE.BufferGeometry
  points: THREE.Points
  age: number
  lifespan: number
  particles: { pos: THREE.Vector3; vel: THREE.Vector3 }[]
}

const MAX_OBSTACLES = 15
const OBSTACLE_RADIUS = 0.5
const SOURCE_LIFESPAN = 5
const SOURCE_EMIT_RATE = 20
const PULSE_DURATION = 0.2
const DEATH_RING_DURATION = 0.3
const DRAG_DISTANCE_THRESHOLD = 0.5
const DRAG_SPEED_THRESHOLD = 1
const GLOW_DURATION = 0.1

export class InteractionManager {
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private particleSystem: FluidParticleSystem
  private world: CANNON.World
  private domElement: HTMLElement

  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private groundPlane: THREE.Plane

  private sources: FluidSource[] = []
  private obstacles: Obstacle[] = []
  private pulseRings: PulseRing[] = []
  private deathRings: DeathRing[] = []

  private isLeftDragging = false
  private isRightDragging = false
  private dragStartPos = new THREE.Vector2()
  private lastDragPos = new THREE.Vector3()
  private lastDragTime = 0
  private dragAccumulatedDist = 0
  private dragLastSourcePos = new THREE.Vector3()

  private obstacleRefs: ObstacleRef[] = []

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    particleSystem: FluidParticleSystem,
    world: CANNON.World
  ) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.particleSystem = particleSystem
    this.world = world
    this.domElement = renderer.domElement

    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

    this.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.domElement.addEventListener('pointermove', this.onPointerMove)
    this.domElement.addEventListener('pointerup', this.onPointerUp)
    this.domElement.addEventListener('contextmenu', this.onContextMenu)
  }

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault()
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.updateMouse(e)
    if (e.button === 0) {
      this.isLeftDragging = true
      this.dragStartPos.set(e.clientX, e.clientY)
      this.lastDragTime = performance.now()
      this.dragAccumulatedDist = 0
      const pos = this.getIntersectGround()
      if (pos) {
        this.lastDragPos.copy(pos)
        this.dragLastSourcePos.copy(pos)
        this.createSource(pos)
        this.createPulseRing(pos)
      }
    } else if (e.button === 2) {
      this.isRightDragging = true
      if (e.shiftKey) {
        this.deleteNearestObstacle()
      } else {
        const pos = this.getIntersectGround()
        if (pos && pos.y >= 1) {
          this.createObstacle(pos)
          this.createPulseRing(pos)
        } else if (pos) {
          pos.y = 1
          this.createObstacle(pos)
          this.createPulseRing(pos)
        }
      }
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isLeftDragging) return
    this.updateMouse(e)
    const pos = this.getIntersectGround()
    if (!pos) return
    const now = performance.now()
    const dt = Math.max((now - this.lastDragTime) / 1000, 0.001)
    this.lastDragTime = now
    const delta = pos.distanceTo(this.lastDragPos)
    const speed = dt > 0 ? delta / dt : 0
    this.dragAccumulatedDist += delta
    this.lastDragPos.copy(pos)

    if (speed >= DRAG_SPEED_THRESHOLD) {
      while (this.dragAccumulatedDist >= DRAG_DISTANCE_THRESHOLD) {
        this.dragAccumulatedDist -= DRAG_DISTANCE_THRESHOLD
        const interpT = 1 - this.dragAccumulatedDist / delta
        if (delta <= 0.001) {
          this.createSource(pos.clone())
          this.createPulseRing(pos.clone())
          this.dragLastSourcePos.copy(pos)
        } else {
          const t = 1 - (this.dragAccumulatedDist / delta)
          const newPos = this.dragLastSourcePos.clone().lerp(pos, Math.min(t, 1))
          this.createSource(newPos)
          this.createPulseRing(newPos)
          this.dragLastSourcePos.copy(newPos)
        }
      }
    } else {
      this.dragAccumulatedDist = 0
      this.dragLastSourcePos.copy(pos)
    }
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (e.button === 0) {
      this.isLeftDragging = false
    } else if (e.button === 2) {
      this.isRightDragging = false
    }
  }

  private updateMouse(e: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  private getIntersectGround(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const target = new THREE.Vector3()
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, target)
    if (!hit) return null
    const dir = this.raycaster.ray.direction.clone()
    if (dir.y >= -0.01) {
      dir.y = -0.5
    }
    const origin = this.raycaster.ray.origin
    const t = (1.5 - origin.y) / dir.y
    if (t > 0) {
      return origin.clone().addScaledVector(dir, t)
    }
    return target
  }

  private createSource(position: THREE.Vector3): void {
    const dir = this.camera.position.clone().sub(position).normalize()
    dir.y = Math.max(dir.y, 0.3)
    dir.normalize()
    const geo = new THREE.SphereGeometry(0.1, 8, 8)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.6
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(position)
    this.scene.add(mesh)
    this.sources.push({
      position: position.clone(),
      direction: dir,
      age: 0,
      lifespan: SOURCE_LIFESPAN,
      emitRate: SOURCE_EMIT_RATE,
      lastEmitTime: 0,
      emitInterval: 1 / SOURCE_EMIT_RATE,
      mesh
    })
  }

  private createObstacle(position: THREE.Vector3): void {
    if (this.obstacles.length >= MAX_OBSTACLES) {
      const oldest = this.obstacles.shift()!
      this.scene.remove(oldest.mesh)
      this.world.removeBody(oldest.body)
      oldest.mesh.geometry.dispose()
      ;(oldest.mesh.material as THREE.Material).dispose()
    }

    const geo = new THREE.SphereGeometry(OBSTACLE_RADIUS, 32, 32)
    const mat = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.5,
      shininess: 0.3 * 100,
      specular: 0xaaccff,
      emissive: 0x000000
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(position)
    this.scene.add(mesh)

    const shape = new CANNON.Sphere(OBSTACLE_RADIUS)
    const body = new CANNON.Body({
      mass: 0,
      shape,
      position: new CANNON.Vec3(position.x, position.y, position.z)
    })
    this.world.addBody(body)

    this.obstacles.push({
      mesh,
      body,
      material: mat,
      glowIntensity: 0,
      createdAt: performance.now(),
      position: position.clone()
    })

    this.updateObstacleRefs()
  }

  private deleteNearestObstacle(): void {
    if (this.obstacles.length === 0) return
    this.raycaster.setFromCamera(this.mouse, this.camera)
    let nearest: Obstacle | null = null
    let nearestDist = Infinity
    for (const obs of this.obstacles) {
      const dist = this.raycaster.ray.distanceToPoint(obs.mesh.position)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = obs
      }
    }
    if (nearest) {
      this.createPulseRing(nearest.mesh.position.clone())
      this.scene.remove(nearest.mesh)
      this.world.removeBody(nearest.body)
      nearest.mesh.geometry.dispose()
      ;(nearest.mesh.material as THREE.Material).dispose()
      const idx = this.obstacles.indexOf(nearest)
      if (idx >= 0) this.obstacles.splice(idx, 1)
      this.updateObstacleRefs()
    }
  }

  private updateObstacleRefs(): void {
    this.obstacleRefs = this.obstacles.map((o) => ({
      position: o.position,
      radius: OBSTACLE_RADIUS,
      onHit: () => {
        o.glowIntensity = 1.0
      }
    }))
    this.particleSystem.setObstacles(this.obstacleRefs)
  }

  private createPulseRing(position: THREE.Vector3): void {
    const geo = new THREE.RingGeometry(0.01, 0.02, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(position)
    mesh.lookAt(this.camera.position)
    this.scene.add(mesh)
    this.pulseRings.push({
      mesh,
      age: 0,
      lifespan: PULSE_DURATION,
      startScale: 0.1,
      endScale: 0.5
    })
  }

  private createDeathRing(position: THREE.Vector3): void {
    const count = 24
    const particles: { pos: THREE.Vector3; vel: THREE.Vector3 }[] = []
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const px = Math.cos(angle) * 0.05
      const pz = Math.sin(angle) * 0.05
      const p = position.clone().add(new THREE.Vector3(px, 0, pz))
      particles.push({
        pos: p,
        vel: new THREE.Vector3(Math.cos(angle) * 1.5, (Math.random() - 0.5) * 0.3, Math.sin(angle) * 1.5)
      })
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const points = new THREE.Points(geo, mat)
    this.scene.add(points)
    this.deathRings.push({ positions, geometry: geo, points, age: 0, lifespan: DEATH_RING_DURATION, particles })
  }

  public getObstacleCount(): number {
    return this.obstacles.length
  }

  public getSourceCount(): number {
    return this.sources.length
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05)
    const multiplier = this.particleSystem.getEmitRateMultiplier()

    for (let i = this.sources.length - 1; i >= 0; i--) {
      const s = this.sources[i]
      s.age += dt
      s.lastEmitTime += dt
      if (s.age >= s.lifespan) {
        this.createDeathRing(s.position.clone())
        this.scene.remove(s.mesh)
        s.mesh.geometry.dispose()
        ;(s.mesh.material as THREE.Material).dispose()
        this.sources.splice(i, 1)
        continue
      } else {
        const effectiveInterval = s.emitInterval / multiplier
        while (s.lastEmitTime >= effectiveInterval) {
          s.lastEmitTime -= effectiveInterval
          this.particleSystem.emitParticle(s.position, s.direction)
        }
        ;(s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - s.age / s.lifespan)
      }
    }

    for (const obs of this.obstacles) {
      if (obs.glowIntensity > 0) {
        obs.glowIntensity = Math.max(0, obs.glowIntensity - dt / GLOW_DURATION)
        obs.material.emissive.setRGB(obs.glowIntensity, obs.glowIntensity, obs.glowIntensity)
      }
    }

    for (let i = this.pulseRings.length - 1; i >= 0; i--) {
      const r = this.pulseRings[i]
      r.age += dt
      if (r.age >= r.lifespan) {
        this.scene.remove(r.mesh)
        r.mesh.geometry.dispose()
        ;(r.mesh.material as THREE.Material).dispose()
        this.pulseRings.splice(i, 1)
      } else {
        const t = r.age / r.lifespan
        const scale = r.startScale + (r.endScale - r.startScale) * t
        r.mesh.scale.setScalar(scale * 10)
        ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t)
        r.mesh.lookAt(this.camera.position)
      }
    }

    for (let i = this.deathRings.length - 1; i >= 0; i--) {
      const r = this.deathRings[i]
      r.age += dt
      if (r.age >= r.lifespan) {
        this.scene.remove(r.points)
        r.geometry.dispose()
        ;(r.points.material as THREE.Material).dispose()
        this.deathRings.splice(i, 1)
      } else {
        const t = r.age / r.lifespan
        const posAttr = r.geometry.getAttribute('position') as THREE.BufferAttribute
        const arr = posAttr.array as Float32Array
        for (let j = 0; j < r.particles.length; j++) {
          const p = r.particles[j]
          p.pos.addScaledVector(p.vel, dt)
          p.vel.multiplyScalar(0.97)
          arr[j * 3] = p.pos.x
          arr[j * 3 + 1] = p.pos.y
          arr[j * 3 + 2] = p.pos.z
        }
        posAttr.needsUpdate = true
        ;(r.points.material as THREE.PointsMaterial).opacity = 1 - t
      }
    }
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.domElement.removeEventListener('pointermove', this.onPointerMove)
    this.domElement.removeEventListener('pointerup', this.onPointerUp)
    this.domElement.removeEventListener('contextmenu', this.onContextMenu)
  }
}
