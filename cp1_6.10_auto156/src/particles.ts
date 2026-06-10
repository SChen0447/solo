import * as THREE from 'three'
import { JointName, JOINT_NAMES, Skeleton } from './skeleton'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  size: number
  baseSize: number
  color: THREE.Color
  life: number
  maxLife: number
  jointName: JointName
}

const vertexShader = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    gl_FragColor = vec4(vColor, alpha);
  }
`

export class ParticleSystem {
  public points: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  private particles: Particle[]
  private maxParticles: number = 300
  private skeleton: Skeleton

  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton
    this.particles = []
    this.maxParticles = 300

    this.positions = new Float32Array(this.maxParticles * 3)
    this.colors = new Float32Array(this.maxParticles * 3)
    this.sizes = new Float32Array(this.maxParticles)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setDrawRange(0, 0)

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.renderOrder = 1
  }

  private lerpColor(speed: number): THREE.Color {
    const t = Math.min(speed / 10, 1)
    const blue = new THREE.Color(0x3498db)
    const orange = new THREE.Color(0xe67e22)
    return blue.clone().lerp(orange, t)
  }

  private spawnParticlesForJoint(name: JointName): void {
    if (!this.skeleton.isJointMoving(name)) return
    if (this.particles.length >= this.maxParticles) return

    const speed = this.skeleton.getJointSpeed(name)
    const worldPos = this.skeleton.getJointWorldPosition(name)
    const count = 2 + Math.floor(Math.random() * 4)

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      )

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      )

      const baseSize = 0.05 + Math.random() * 0.1

      this.particles.push({
        position: worldPos.clone().add(offset),
        velocity,
        size: baseSize,
        baseSize,
        color: this.lerpColor(speed),
        life: 0.8,
        maxLife: 0.8,
        jointName: name
      })
    }
  }

  private updateBufferAttributes(): void {
    const count = this.particles.length

    for (let i = 0; i < count; i++) {
      const p = this.particles[i]
      const i3 = i * 3

      this.positions[i3] = p.position.x
      this.positions[i3 + 1] = p.position.y
      this.positions[i3 + 2] = p.position.z

      const lifeRatio = p.life / p.maxLife
      this.colors[i3] = p.color.r * lifeRatio
      this.colors[i3 + 1] = p.color.g * lifeRatio
      this.colors[i3 + 2] = p.color.b * lifeRatio

      this.sizes[i] = p.size
    }

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute
    const sizeAttr = this.geometry.attributes.size as THREE.BufferAttribute

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    this.geometry.setDrawRange(0, count)
  }

  public update(deltaTime: number): void {
    JOINT_NAMES.forEach(name => {
      this.spawnParticlesForJoint(name)
    })

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= deltaTime

      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }

      const lifeRatio = p.life / p.maxLife
      p.size = p.baseSize * lifeRatio

      p.position.add(p.velocity.clone().multiplyScalar(deltaTime * 60))
      p.velocity.multiplyScalar(0.98)
    }

    this.updateBufferAttributes()
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
