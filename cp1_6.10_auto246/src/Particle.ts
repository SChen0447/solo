import * as THREE from 'three'
import { FieldLine, FieldLineData, PoleData } from './FieldLine'

export interface ParticleParams {
  charge: number
  initialSpeed: number
  helixRadius: number
  stepSize: number
}

export class Particle {
  public mesh: THREE.Mesh
  public charge: number
  public speed: number
  public position: THREE.Vector3
  public velocity: THREE.Vector3
  private helixRadius: number
  private stepSize: number
  private fieldLine: FieldLineData | null = null
  private pathProgress: number = 0
  private helixAngle: number = 0
  private helixAxis: THREE.Vector3 = new THREE.Vector3(0, 1, 0)
  private poles: PoleData[] = []
  private onClick: ((particle: Particle) => void) | null = null

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    params: ParticleParams,
    poles: PoleData[],
    onClick?: (particle: Particle) => void
  ) {
    this.charge = params.charge
    this.speed = params.initialSpeed
    this.helixRadius = params.helixRadius
    this.stepSize = params.stepSize
    this.position = position.clone()
    this.velocity = new THREE.Vector3(0, 0, 0)
    this.poles = poles
    this.onClick = onClick || null

    const isPositive = params.charge > 0
    const color = isPositive ? 0xff3333 : 0x3366ff
    const geometry = new THREE.SphereGeometry(0.15, 16, 16)
    const material = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      shininess: 80
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.copy(this.position)
    this.mesh.userData.particle = this
    scene.add(this.mesh)
  }

  public setFieldLine(line: FieldLineData | null): void {
    this.fieldLine = line
    this.pathProgress = 0
    if (line && line.points.length > 1) {
      const start = line.points[0]
      this.position.copy(start)
      this.updateHelixAxis()
    }
  }

  public updateParams(params: Partial<ParticleParams>): void {
    if (params.charge !== undefined) {
      this.charge = params.charge
      const isPositive = params.charge > 0
      const color = isPositive ? 0xff3333 : 0x3366ff
      const mat = this.mesh.material as THREE.MeshPhongMaterial
      mat.color.setHex(color)
      mat.emissive.setHex(color)
    }
    if (params.initialSpeed !== undefined) this.speed = params.initialSpeed
    if (params.helixRadius !== undefined) this.helixRadius = params.helixRadius
    if (params.stepSize !== undefined) this.stepSize = params.stepSize
  }

  public updatePoles(poles: PoleData[]): void {
    this.poles = poles
  }

  private updateHelixAxis(): void {
    if (!this.fieldLine || this.fieldLine.points.length < 2) return
    const idx = Math.min(Math.floor(this.pathProgress), this.fieldLine.points.length - 2)
    const p1 = this.fieldLine.points[idx]
    const p2 = this.fieldLine.points[Math.min(idx + 1, this.fieldLine.points.length - 1)]
    this.helixAxis = new THREE.Vector3().subVectors(p2, p1).normalize()
  }

  public update(deltaTime: number, fieldLineModule: FieldLine): void {
    if (!this.fieldLine || this.fieldLine.points.length < 2) {
      const nearest = fieldLineModule.findNearestLine(this.position)
      if (nearest) this.setFieldLine(nearest)
      return
    }

    this.pathProgress += this.stepSize * this.speed * deltaTime * 60
    const points = this.fieldLine.points

    if (this.pathProgress >= points.length - 1) {
      this.pathProgress = 0
    }
    if (this.pathProgress < 0) {
      this.pathProgress = points.length - 1
    }

    const idx = Math.floor(this.pathProgress)
    const t = this.pathProgress - idx
    const p1 = points[Math.min(idx, points.length - 1)]
    const p2 = points[Math.min(idx + 1, points.length - 1)]
    const linePos = new THREE.Vector3().lerpVectors(p1, p2, t)

    this.updateHelixAxis()
    this.helixAngle += this.speed * deltaTime * 2

    const perp1 = new THREE.Vector3()
    const perp2 = new THREE.Vector3()
    const up = Math.abs(this.helixAxis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    perp1.crossVectors(this.helixAxis, up).normalize()
    perp2.crossVectors(this.helixAxis, perp1).normalize()

    const chargeSign = this.charge > 0 ? 1 : -1
    const helixOffset = new THREE.Vector3()
      .addScaledVector(perp1, Math.cos(this.helixAngle * chargeSign) * this.helixRadius)
      .addScaledVector(perp2, Math.sin(this.helixAngle * chargeSign) * this.helixRadius)

    this.position.copy(linePos).add(helixOffset)
    this.mesh.position.copy(this.position)
  }

  public getVelocity(): THREE.Vector3 {
    const v = this.helixAxis.clone().multiplyScalar(this.speed)
    return v
  }

  public getFieldStrength(): number {
    if (this.poles.length === 0) return 0
    let total = 0
    for (const pole of this.poles) {
      const dist = this.position.distanceTo(pole.position)
      if (dist < 0.1) continue
      total += pole.strength / (dist * dist)
    }
    return total
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose()
    }
  }
}

export class ParticleSystem {
  private scene: THREE.Scene
  private particles: Particle[] = []
  private maxParticles: number = 30

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  public createParticles(
    count: number,
    poles: PoleData[],
    fieldLineModule: FieldLine,
    params: ParticleParams,
    onClick?: (p: Particle) => void
  ): void {
    this.clearParticles()

    const nPoles = poles.filter(p => p.type === 'N')
    if (nPoles.length === 0) return

    const lines = fieldLineModule.getFieldLineData()

    for (let i = 0; i < Math.min(count, this.maxParticles); i++) {
      const nPole = nPoles[i % nPoles.length]
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      )
      const startPos = nPole.position.clone().add(offset)

      const charge = Math.random() > 0.5 ? params.charge : -params.charge
      const particle = new Particle(
        this.scene,
        startPos,
        { ...params, charge },
        poles,
        onClick
      )

      if (lines.length > 0) {
        const lineIdx = i % lines.length
        particle.setFieldLine(lines[lineIdx])
      }

      this.particles.push(particle)
    }
  }

  public updateParams(params: Partial<ParticleParams>): void {
    for (const p of this.particles) {
      p.updateParams(params)
    }
  }

  public updatePoles(poles: PoleData[]): void {
    for (const p of this.particles) {
      p.updatePoles(poles)
    }
  }

  public updateFieldLines(fieldLineModule: FieldLine): void {
    const lines = fieldLineModule.getFieldLineData()
    for (let i = 0; i < this.particles.length; i++) {
      if (lines.length > 0) {
        const lineIdx = i % lines.length
        this.particles[i].setFieldLine(lines[lineIdx])
      }
    }
  }

  public update(deltaTime: number, fieldLineModule: FieldLine): void {
    for (const p of this.particles) {
      p.update(deltaTime, fieldLineModule)
    }
  }

  public getParticles(): Particle[] {
    return this.particles
  }

  private clearParticles(): void {
    for (const p of this.particles) {
      p.dispose(this.scene)
    }
    this.particles = []
  }

  public get count(): number {
    return this.particles.length
  }

  public dispose(): void {
    this.clearParticles()
  }
}
