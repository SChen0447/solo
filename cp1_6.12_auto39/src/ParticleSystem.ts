import * as THREE from 'three'

export interface ParticleParams {
  count: number
  speed: number
  turbulence: number
  hueOffset: number
  attractorX: number
  attractorY: number
  attractorZ: number
}

const DEFAULT_PARAMS: ParticleParams = {
  count: 3000,
  speed: 1.0,
  turbulence: 1.0,
  hueOffset: 0,
  attractorX: 0,
  attractorY: 0,
  attractorZ: 0
}

const COLOR_TRANSITION_SPEED = 1 / 0.3

export class ParticleSystem {
  public params: ParticleParams
  public geometry: THREE.BufferGeometry
  public material: THREE.PointsMaterial
  public points: THREE.Points

  private positions: Float32Array
  private velocities: Float32Array
  private currentColors: Float32Array
  private targetColors: Float32Array
  private baseHues: Float32Array
  private time = 0
  private noiseSeedX: Float32Array
  private noiseSeedY: Float32Array
  private noiseSeedZ: Float32Array
  private currentMaxCount: number

  constructor(params: Partial<ParticleParams> = {}) {
    this.params = { ...DEFAULT_PARAMS, ...params }
    this.currentMaxCount = 8000

    this.positions = new Float32Array(this.currentMaxCount * 3)
    this.velocities = new Float32Array(this.currentMaxCount * 3)
    this.currentColors = new Float32Array(this.currentMaxCount * 3)
    this.targetColors = new Float32Array(this.currentMaxCount * 3)
    this.baseHues = new Float32Array(this.currentMaxCount)
    this.noiseSeedX = new Float32Array(this.currentMaxCount)
    this.noiseSeedY = new Float32Array(this.currentMaxCount)
    this.noiseSeedZ = new Float32Array(this.currentMaxCount)

    this.initializeParticles()

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    )
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.currentColors, 3)
    )
    this.updateDrawRange()

    const canvas = this.createCircleTexture()
    const texture = new THREE.CanvasTexture(canvas)

    this.material = new THREE.PointsMaterial({
      size: 0.12,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: texture,
      alphaTest: 0.001
    })

    this.points = new THREE.Points(this.geometry, this.material)
  }

  private createCircleTexture(): HTMLCanvasElement {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    )
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.85)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.45)')
    gradient.addColorStop(0.75, 'rgba(255,255,255,0.1)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    return canvas
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.currentMaxCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 10 * Math.cbrt(Math.random())

      const i3 = i * 3
      this.positions[i3] = r * Math.sin(phi) * Math.cos(theta)
      this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      this.positions[i3 + 2] = r * Math.cos(phi)

      this.velocities[i3] = (Math.random() - 0.5) * 0.2
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.2
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.2

      this.baseHues[i] = Math.random() * 360

      this.noiseSeedX[i] = Math.random() * 100
      this.noiseSeedY[i] = Math.random() * 100
      this.noiseSeedZ[i] = Math.random() * 100

      this.updateTargetColor(i)
      this.currentColors[i3] = this.targetColors[i3]
      this.currentColors[i3 + 1] = this.targetColors[i3 + 1]
      this.currentColors[i3 + 2] = this.targetColors[i3 + 2]
    }
  }

  private updateTargetColor(i: number): void {
    const hue = (this.baseHues[i] + this.params.hueOffset) % 360
    const sat = 0.85 + Math.random() * 0.1
    const light = 0.55 + Math.random() * 0.1
    const rgb = this.hslToRgb(hue / 360, sat, light)
    const i3 = i * 3
    this.targetColors[i3] = rgb[0]
    this.targetColors[i3 + 1] = rgb[1]
    this.targetColors[i3 + 2] = rgb[2]
  }

  public recalcAllTargetColors(): void {
    for (let i = 0; i < this.currentMaxCount; i++) {
      this.updateTargetColor(i)
    }
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) return [l, l, l]
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    return [
      hue2rgb(p, q, h + 1 / 3),
      hue2rgb(p, q, h),
      hue2rgb(p, q, h - 1 / 3)
    ]
  }

  private pseudoNoise(x: number, y: number, z: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
    return (n - Math.floor(n)) * 2 - 1
  }

  public update(delta: number, running: boolean): void {
    this.time += delta

    const count = Math.min(this.params.count, this.currentMaxCount)
    const speed = this.params.speed
    const turb = this.params.turbulence
    const ax = this.params.attractorX
    const ay = this.params.attractorY
    const az = this.params.attractorZ
    const t = this.time

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const colArr = colAttr.array as Float32Array

    const colorTransitionAmt = Math.min(1, delta * COLOR_TRANSITION_SPEED)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      const px = posArr[i3]
      const py = posArr[i3 + 1]
      const pz = posArr[i3 + 2]

      if (running) {
        const dx = ax - px
        const dy = ay - py
        const dz = az - pz
        const dist2 = dx * dx + dy * dy + dz * dz
        const dist = Math.sqrt(dist2) + 0.0001
        const gravStrength = 0.35 / (0.3 + dist2 * 0.02)

        let vx = this.velocities[i3] + (dx / dist) * gravStrength * delta * speed
        let vy =
          this.velocities[i3 + 1] + (dy / dist) * gravStrength * delta * speed
        let vz =
          this.velocities[i3 + 2] + (dz / dist) * gravStrength * delta * speed

        if (turb > 0) {
          const tScale = 0.35
          const sX = this.noiseSeedX[i]
          const sY = this.noiseSeedY[i]
          const sZ = this.noiseSeedZ[i]
          const nx = this.pseudoNoise(px * tScale + sX, py * tScale, t * 0.5)
          const ny = this.pseudoNoise(py * tScale + sY, pz * tScale, t * 0.5)
          const nz = this.pseudoNoise(pz * tScale + sZ, px * tScale, t * 0.5)
          const turbScale = turb * delta * speed * 2.2
          vx += nx * turbScale
          vy += ny * turbScale
          vz += nz * turbScale
        }

        const r2 = px * px + py * py + pz * pz
        const boundary = 18
        if (r2 > boundary * boundary) {
          const r = Math.sqrt(r2)
          const nx = px / r
          const ny = py / r
          const nz = pz / r
          const dot = vx * nx + vy * ny + vz * nz
          if (dot > 0) {
            vx -= 2 * dot * nx
            vy -= 2 * dot * ny
            vz -= 2 * dot * nz
          }
          const pull = (r - boundary) * 0.5 * delta
          vx -= nx * pull
          vy -= ny * pull
          vz -= nz * pull
        }

        vx *= 1 - 0.6 * delta
        vy *= 1 - 0.6 * delta
        vz *= 1 - 0.6 * delta

        this.velocities[i3] = vx
        this.velocities[i3 + 1] = vy
        this.velocities[i3 + 2] = vz

        posArr[i3] = px + vx * delta * speed
        posArr[i3 + 1] = py + vy * delta * speed
        posArr[i3 + 2] = pz + vz * delta * speed
      }

      const tcR = this.targetColors[i3]
      const tcG = this.targetColors[i3 + 1]
      const tcB = this.targetColors[i3 + 2]
      colArr[i3] += (tcR - colArr[i3]) * colorTransitionAmt
      colArr[i3 + 1] += (tcG - colArr[i3 + 1]) * colorTransitionAmt
      colArr[i3 + 2] += (tcB - colArr[i3 + 2]) * colorTransitionAmt
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  }

  public updateDrawRange(): void {
    const count = Math.min(this.params.count, this.currentMaxCount)
    this.geometry.setDrawRange(0, count)
  }

  public setCount(count: number): void {
    this.params.count = count
    this.updateDrawRange()
  }

  public setHueOffset(offset: number): void {
    this.params.hueOffset = offset
    this.recalcAllTargetColors()
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    if (this.material.map) this.material.map.dispose()
  }
}
