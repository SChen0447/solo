import * as THREE from 'three'
import { TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_DEPTH, LAYER_BOUNDS } from './terrain'

export interface WaveParams {
  magnitude: number
  speed: number
  reflectionEnabled: boolean
  refractionEnabled: boolean
}

interface Particle {
  position: THREE.Vector3
  direction: THREE.Vector3
  speed: number
  life: number
  maxLife: number
  startColor: THREE.Color
  endColor: THREE.Color
  size: number
  active: boolean
  layer: number
  type: 'primary' | 'reflection' | 'refraction' | 'aftershock'
  startTime: number
  rotationAngle: number
}

interface Trail {
  points: THREE.Vector3[]
  color: THREE.Color
  startTime: number
  line: THREE.Line | null
}

const COLOR_PRIMARY_START = new THREE.Color(0xff3300)
const COLOR_PRIMARY_END = new THREE.Color(0x0033ff)
const COLOR_REFLECTION = new THREE.Color(0x00ff88)
const COLOR_REFRACTION = new THREE.Color(0x00aaff)
const COLOR_AFTERSHOCK_START = new THREE.Color(0xcc00ff)
const COLOR_AFTERSHOCK_END = new THREE.Color(0x6600aa)

const LAYER_SPEED_FACTOR = [1.0, 0.75, 0.5]
const MAX_PARTICLES = 8000
const BOUNDARY_MARGIN = 2

export class WaveSystem {
  public group: THREE.Group
  private particles: Particle[] = []
  private points: THREE.Points | null = null
  private geometry: THREE.BufferGeometry | null = null
  private epicenter: THREE.Vector3 | null = null
  private epicenterMarker: THREE.Group | null = null
  private pulseTime: number = 0
  private params: WaveParams
  private trails: Trail[] = []
  private trailGroup: THREE.Group
  private aftershockScheduled: boolean = false
  private aftershockTime: number = 0
  private mainShakeComplete: boolean = false
  private currentTime: number = 0
  private rotationAccumulator: number = 0

  constructor(params: WaveParams) {
    this.params = params
    this.group = new THREE.Group()
    this.trailGroup = new THREE.Group()
    this.group.add(this.trailGroup)
    this.initGeometry()
  }

  private initGeometry(): void {
    this.geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_PARTICLES * 3)
    const colors = new Float32Array(MAX_PARTICLES * 3)
    const sizes = new Float32Array(MAX_PARTICLES)

    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3 + 1] = -10000
      sizes[i] = 0
      colors[i * 3] = 0
      colors[i * 3 + 1] = 0
      colors[i * 3 + 2] = 0
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    this.geometry.setDrawRange(0, 0)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 800.0 * uPixelRatio / max(-mvPosition.z, 0.1);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.1, 0.5, d);
          gl_FragColor = vec4(vColor, alpha * 0.95);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.points = new THREE.Points(this.geometry, material)
    this.points.frustumCulled = false
    this.group.add(this.points)
  }

  public setEpicenter(position: THREE.Vector3): void {
    this.clearAll()
    this.epicenter = position.clone()
    this.aftershockScheduled = false
    this.mainShakeComplete = false

    if (this.epicenterMarker) {
      this.group.remove(this.epicenterMarker)
      this.epicenterMarker = null
    }

    this.epicenterMarker = new THREE.Group()

    const coreGeo = new THREE.SphereGeometry(0.8, 16, 16)
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.9
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    this.epicenterMarker.add(core)

    const haloGeo = new THREE.RingGeometry(1, 1.1, 32)
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff6644,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    const halo = new THREE.Mesh(haloGeo, haloMat)
    halo.rotation.x = -Math.PI / 2
    halo.name = 'halo'
    this.epicenterMarker.add(halo)

    this.epicenterMarker.position.copy(position)
    this.group.add(this.epicenterMarker)

    this.spawnPrimaryWave(position, this.params.magnitude, false)
  }

  private clearAll(): void {
    this.particles = []
    this.trails.forEach(t => {
      if (t.line) this.trailGroup.remove(t.line)
    })
    this.trails = []
    this.aftershockScheduled = false
    this.mainShakeComplete = false
  }

  private spawnPrimaryWave(
    center: THREE.Vector3,
    magnitude: number,
    isAftershock: boolean
  ): void {
    const baseCount = 500 + magnitude * 500
    const count = Math.min(baseCount, MAX_PARTICLES - this.particles.length)

    const startColor = isAftershock ? COLOR_AFTERSHOCK_START : COLOR_PRIMARY_START
    const endColor = isAftershock ? COLOR_AFTERSHOCK_END : COLOR_PRIMARY_END
    const type = isAftershock ? 'aftershock' : 'primary'

    const layer = this.getLayerAtY(center.y)

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).normalize()

      const jitter = 0.05
      dir.x += (Math.random() - 0.5) * jitter
      dir.y += (Math.random() - 0.5) * jitter
      dir.z += (Math.random() - 0.5) * jitter
      dir.normalize()

      this.particles.push({
        position: center.clone(),
        direction: dir,
        speed: 0.1 + Math.random() * 0.2,
        life: 0,
        maxLife: 60,
        startColor: startColor.clone(),
        endColor: endColor.clone(),
        size: 0.8 + Math.random() * 0.7,
        active: true,
        layer,
        type,
        startTime: this.currentTime,
        rotationAngle: Math.random() * Math.PI * 2
      })
    }

    this.addTrail(center, isAftershock ? COLOR_AFTERSHOCK_END : COLOR_PRIMARY_END)
  }

  private addTrail(center: THREE.Vector3, color: THREE.Color): void {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < 100; i++) {
      points.push(center.clone())
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.5
    })
    const line = new THREE.Line(geo, mat)

    this.trailGroup.add(line)
    this.trails.push({
      points,
      color: color.clone(),
      startTime: this.currentTime,
      line
    })
  }

  private getLayerAtY(y: number): number {
    for (let i = 0; i < LAYER_BOUNDS.length; i++) {
      if (y >= LAYER_BOUNDS[i].bottom && y < LAYER_BOUNDS[i].top) {
        return i
      }
    }
    return y >= TERRAIN_HEIGHT ? 0 : 2
  }

  private spawnSecondaryWave(
    p: Particle,
    type: 'reflection' | 'refraction',
    newDirection: THREE.Vector3
  ): void {
    if (this.particles.length >= MAX_PARTICLES) return

    const count = Math.min(3, Math.floor(MAX_PARTICLES * 0.3 / 100))

    for (let i = 0; i < count; i++) {
      const dir = newDirection.clone()
      dir.x += (Math.random() - 0.5) * 0.2
      dir.y += (Math.random() - 0.5) * 0.2
      dir.z += (Math.random() - 0.5) * 0.2
      dir.normalize()

      const color = type === 'reflection' ? COLOR_REFLECTION : COLOR_REFRACTION

      this.particles.push({
        position: p.position.clone(),
        direction: dir,
        speed: p.speed * (type === 'refraction' ? 0.8 : 0.9),
        life: 0,
        maxLife: 45,
        startColor: color.clone(),
        endColor: color.clone().multiplyScalar(0.3),
        size: p.size * 0.9,
        active: true,
        layer: p.layer,
        type,
        startTime: this.currentTime,
        rotationAngle: Math.random() * Math.PI * 2
      })
    }
  }

  private handleInterface(p: Particle, oldY: number, newY: number): boolean {
    const interfaces = [4, 10]
    for (const iface of interfaces) {
      if ((oldY < iface && newY >= iface) || (oldY > iface && newY <= iface)) {
        if (p.type === 'primary' || p.type === 'aftershock') {
          const normal = new THREE.Vector3(0, newY > oldY ? 1 : -1, 0)

          if (this.params.reflectionEnabled) {
            const reflectDir = p.direction.clone()
              .sub(normal.clone().multiplyScalar(2 * p.direction.dot(normal)))
              .normalize()
            this.spawnSecondaryWave(p, 'reflection', reflectDir)
          }

          if (this.params.refractionEnabled) {
            const v1 = p.direction.y
            const theta1 = Math.acos(Math.abs(v1) / p.direction.length())
            const n1 = LAYER_SPEED_FACTOR[p.layer] || 1
            const newLayer = this.getLayerAtY(newY)
            const n2 = LAYER_SPEED_FACTOR[newLayer] || 0.8
            const sinTheta2 = (n1 / n2) * Math.sin(theta1)

            if (Math.abs(sinTheta2) <= 1) {
              const refractDir = this.snellRefract(p.direction, normal, n1 / n2)
              if (refractDir) {
                this.spawnSecondaryWave(p, 'refraction', refractDir)
              }
            }
          }

          return true
        }
      }
    }
    return false
  }

  private snellRefract(
    incident: THREE.Vector3,
    normal: THREE.Vector3,
    eta: number
  ): THREE.Vector3 | null {
    const cosI = -incident.dot(normal)
    const sinT2 = eta * eta * (1.0 - cosI * cosI)
    if (sinT2 > 1.0) return null
    const cosT = Math.sqrt(1.0 - sinT2)
    return incident.clone()
      .multiplyScalar(eta)
      .add(normal.clone().multiplyScalar(eta * cosI - cosT))
      .normalize()
  }

  private isOutOfBounds(pos: THREE.Vector3): boolean {
    const halfW = TERRAIN_WIDTH / 2 + BOUNDARY_MARGIN
    const halfD = TERRAIN_DEPTH / 2 + BOUNDARY_MARGIN
    return (
      pos.x < -halfW || pos.x > halfW ||
      pos.y < -BOUNDARY_MARGIN || pos.y > TERRAIN_HEIGHT + BOUNDARY_MARGIN ||
      pos.z < -halfD || pos.z > halfD
    )
  }

  public update(delta: number): void {
    this.currentTime += delta
    this.pulseTime += delta
    this.rotationAccumulator += delta * 10 * Math.PI / 180

    if (this.epicenterMarker) {
      const halo = this.epicenterMarker.getObjectByName('halo') as THREE.Mesh
      if (halo) {
        const scale = 1 + 0.5 * Math.sin(this.pulseTime * 4)
        halo.scale.set(scale, scale, scale)
        ;(halo.material as THREE.MeshBasicMaterial).opacity = 0.8 - 0.6 * Math.abs(Math.sin(this.pulseTime * 4))
      }
      const core = this.epicenterMarker.children[0] as THREE.Mesh
      const coreScale = 1 + 0.15 * Math.sin(this.pulseTime * 4)
      core.scale.set(coreScale, coreScale, coreScale)
    }

    if (this.epicenter && !this.aftershockScheduled && !this.mainShakeComplete) {
      const allDone = this.particles.filter(p => p.type === 'primary').every(p => !p.active)
      const timePassed = this.particles.length > 0
        ? this.currentTime - this.particles.filter(p => p.type === 'primary')[0]?.startTime || 0
        : 0

      if ((allDone && this.particles.filter(p => p.type === 'primary').length > 0) || timePassed > 8) {
        this.mainShakeComplete = true
        this.aftershockScheduled = true
        this.aftershockTime = this.currentTime + 10
      }
    }

    if (this.aftershockScheduled && this.epicenter && this.currentTime >= this.aftershockTime) {
      this.aftershockScheduled = false
      const aftershockMag = Math.max(1, Math.floor(this.params.magnitude * 0.6))
      this.spawnPrimaryWave(this.epicenter, aftershockMag, true)

      if (this.epicenterMarker) {
        const core = this.epicenterMarker.children[0] as THREE.Mesh
        ;(core.material as THREE.MeshBasicMaterial).color.setHex(0xcc00ff)
      }
    }

    this.updateParticles(delta)
    this.updateTrails(delta)
    this.updateBuffers()
  }

  private updateParticles(delta: number): void {
    const rotSpeed = 10 * Math.PI / 180

    for (const p of this.particles) {
      if (!p.active) continue

      p.life += delta
      if (p.life >= p.maxLife || this.isOutOfBounds(p.position)) {
        p.active = false
        continue
      }

      const oldY = p.position.y
      const layerFactor = LAYER_SPEED_FACTOR[p.layer] || 1
      const speed = p.speed * this.params.speed * layerFactor

      const rotationAxis = new THREE.Vector3(0, 1, 0)
      p.direction.applyAxisAngle(rotationAxis, rotSpeed * delta)

      p.position.add(p.direction.clone().multiplyScalar(speed))
      const newY = p.position.y

      const newLayer = this.getLayerAtY(newY)
      if (newLayer !== p.layer && newLayer >= 0) {
        this.handleInterface(p, oldY, newY)
        p.layer = newLayer
      }
    }

    this.particles = this.particles.filter(p => p.active)
  }

  private updateTrails(delta: number): void {
    const fadeStart = 1.0
    const fadeEnd = 2.0

    this.trails = this.trails.filter(trail => {
      const age = this.currentTime - trail.startTime
      if (age > fadeEnd) {
        if (trail.line) this.trailGroup.remove(trail.line)
        return false
      }

      const fadeAlpha = age > fadeStart ? 1 - (age - fadeStart) / (fadeEnd - fadeStart) : 0.5
      if (trail.line) {
        (trail.line.material as THREE.LineBasicMaterial).opacity = fadeAlpha
      }
      return true
    })
  }

  private updateBuffers(): void {
    if (!this.geometry || !this.points) return

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute

    const posArray = positionAttr.array as Float32Array
    const colArray = colorAttr.array as Float32Array
    const sizeArray = sizeAttr.array as Float32Array

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i]
        const t = Math.min(p.life / p.maxLife, 1)
        const color = p.startColor.clone().lerp(p.endColor, t)

        posArray[i * 3] = p.position.x
        posArray[i * 3 + 1] = p.position.y
        posArray[i * 3 + 2] = p.position.z

        colArray[i * 3] = color.r
        colArray[i * 3 + 1] = color.g
        colArray[i * 3 + 2] = color.b

        sizeArray[i] = p.size * (1 - t * 0.3)
      } else {
        posArray[i * 3] = 0
        posArray[i * 3 + 1] = -10000
        posArray[i * 3 + 2] = 0
        sizeArray[i] = 0
      }
    }

    this.geometry.setDrawRange(0, this.particles.length)
    positionAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
  }

  public setParams(params: WaveParams): void {
    this.params = { ...this.params, ...params }
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.group)
  }
}

export function createFlash(position: THREE.Vector3): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.5, 0.6, 32)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide
  })
  const flash = new THREE.Mesh(geo, mat)
  flash.rotation.x = -Math.PI / 2
  flash.position.copy(position)
  flash.userData.flashTime = 0
  flash.userData.isFlash = true
  return flash
}

export function updateFlash(flash: THREE.Mesh, delta: number): boolean {
  flash.userData.flashTime += delta
  const t = flash.userData.flashTime / 0.3
  if (t >= 1) return false

  const scale = 1 + t * 4
  flash.scale.set(scale, scale, scale)
  ;(flash.material as THREE.MeshBasicMaterial).opacity = 1 - t
  return true
}
