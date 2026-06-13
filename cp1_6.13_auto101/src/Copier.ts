import * as THREE from 'three'
import { StoneTablet, StarPoint } from './StoneTablet'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
}

export class Copier {
  public group: THREE.Group
  public brushSprite: THREE.Sprite
  public isBrushing: boolean = false
  public brushPosition: THREE.Vector3 = new THREE.Vector3()
  public brushRadius: number = 0.3
  public longPressStartTime: number = 0
  public longPressThreshold: number = 0.15

  private camera: THREE.PerspectiveCamera
  private raycaster: THREE.Raycaster
  private mouseNDC: THREE.Vector2
  private tablet: StoneTablet
  private particles: Particle[] = []
  private particleMesh: THREE.Points | null = null
  private particleMaterial: THREE.PointsMaterial | null = null
  private storyParticlesPool: Particle[] = []

  constructor(camera: THREE.PerspectiveCamera, tablet: StoneTablet) {
    this.camera = camera
    this.tablet = tablet
    this.group = new THREE.Group()
    this.raycaster = new THREE.Raycaster()
    this.mouseNDC = new THREE.Vector2()

    this.brushSprite = this.createBrushSprite()
    this.brushSprite.visible = false
    this.brushSprite.renderOrder = 1000
    this.group.add(this.brushSprite)

    this.setupParticleSystem()
    this.tablet.setStoryParticleCallback(() => this.createStoryParticles())
  }

  private createBrushSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, 'rgba(255, 240, 150, 0.5)')
    gradient.addColorStop(0.3, 'rgba(255, 220, 100, 0.35)')
    gradient.addColorStop(0.6, 'rgba(255, 200, 50, 0.15)')
    gradient.addColorStop(0.85, 'rgba(255, 180, 0, 0.05)')
    gradient.addColorStop(1, 'rgba(255, 180, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    ctx.strokeStyle = 'rgba(255, 230, 150, 0.7)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(128, 128, 110, 0, Math.PI * 2)
    ctx.stroke()

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(this.brushRadius * 2, this.brushRadius * 2, 1)
    return sprite
  }

  private setupParticleSystem(): void {
    const maxParticles = 200
    const positions = new Float32Array(maxParticles * 3)
    const colors = new Float32Array(maxParticles * 3)
    const sizes = new Float32Array(maxParticles)

    for (let i = 0; i < maxParticles; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = -1000
      colors[i * 3] = 1
      colors[i * 3 + 1] = 0.85
      colors[i * 3 + 2] = 0.2
      sizes[i] = 0
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    grad.addColorStop(0.4, 'rgba(255, 230, 150, 0.8)')
    grad.addColorStop(1, 'rgba(255, 200, 50, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 32, 32)
    const tex = new THREE.CanvasTexture(canvas)

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      map: tex,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })

    this.particleMesh = new THREE.Points(geometry, this.particleMaterial)
    this.particleMesh.frustumCulled = false
    this.group.add(this.particleMesh)
  }

  public createStoryParticles(): THREE.Points {
    const count = 30
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      colors[i * 3] = 1
      colors[i * 3 + 1] = 0.84
      colors[i * 3 + 2] = 0
      sizes[i] = (3 + Math.random() * 2) / 100
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    grad.addColorStop(0, 'rgba(255, 255, 200, 1)')
    grad.addColorStop(0.5, 'rgba(255, 215, 0, 0.6)')
    grad.addColorStop(1, 'rgba(255, 180, 0, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 32, 32)
    const tex = new THREE.CanvasTexture(canvas)

    const material = new THREE.PointsMaterial({
      size: 0.04,
      map: tex,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    points.userData.life = 0
    points.userData.maxLife = 0.5
    points.userData.particles = []

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.3 + Math.random() * 0.6
      points.userData.particles.push({
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 0.3
        ),
        index: i
      })
    }

    return points
  }

  public handleMouseMove(clientX: number, clientY: number, rect: DOMRect): void {
    this.mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouseNDC, this.camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const intersectPoint = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(plane, intersectPoint)

    const tabletWorldPos = new THREE.Vector3()
    this.tablet.group.getWorldPosition(tabletWorldPos)

    const invQuat = this.tablet.group.quaternion.clone().invert()
    const relPos = intersectPoint.clone().sub(tabletWorldPos)
    relPos.applyQuaternion(invQuat)

    this.brushPosition.copy(relPos)

    const brushWorld = new THREE.Vector3(0, 0, 0.1)
    brushWorld.applyQuaternion(this.tablet.group.quaternion)
    brushWorld.add(tabletWorldPos)
    brushWorld.x = intersectPoint.x
    brushWorld.y = intersectPoint.y
    this.brushSprite.position.copy(brushWorld)

    if (this.isBrushing) {
      this.checkCollisions(performance.now() / 1000)
    }
  }

  public handlePointerDown(currentTime: number): void {
    this.longPressStartTime = currentTime
    this.isBrushing = true
    this.brushSprite.visible = true
    this.brushFadeIn()
    this.checkCollisions(currentTime / 1000)
  }

  public handlePointerUp(): void {
    this.isBrushing = false
    this.longPressStartTime = 0
    this.brushFadeOut()
  }

  private brushFadeIn(): void {
    const mat = this.brushSprite.material as THREE.SpriteMaterial
    const start = performance.now()
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / 200)
      mat.opacity = t * 0.85
      if (t < 1 && this.isBrushing) {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  private brushFadeOut(): void {
    const mat = this.brushSprite.material as THREE.SpriteMaterial
    const start = performance.now()
    const startOpacity = mat.opacity
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / 300)
      mat.opacity = startOpacity * (1 - t)
      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        this.brushSprite.visible = false
      }
    }
    animate()
  }

  private checkCollisions(currentTime: number): void {
    for (const star of this.tablet.stars) {
      if (star.activated) continue

      const dx = this.brushPosition.x - star.position.x
      const dy = this.brushPosition.y - star.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < this.brushRadius + star.size) {
        this.tablet.activateStar(star, currentTime)
        this.spawnActivationParticles(star.position, star.size)
      }
    }
  }

  private spawnActivationParticles(pos: THREE.Vector3, starSize: number): void {
    const count = 8 + Math.floor(Math.random() * 5)
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 150) break
      const angle = Math.random() * Math.PI * 2
      const speed = 0.15 + Math.random() * 0.25
      this.particles.push({
        position: pos.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 0.1
        ),
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        size: 0.03 + Math.random() * 0.03
      })
    }
  }

  public update(deltaTime: number, currentTime: number): void {
    if (this.particleMesh) {
      const posAttr = this.particleMesh.geometry.getAttribute('position') as THREE.BufferAttribute
      const sizeAttr = this.particleMesh.geometry.getAttribute('size') as THREE.BufferAttribute
      const posArr = posAttr.array as Float32Array
      const sizeArr = sizeAttr.array as Float32Array

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]
        p.life += deltaTime
        if (p.life >= p.maxLife) {
          this.particles.splice(i, 1)
          continue
        }
        p.position.addScaledVector(p.velocity, deltaTime)
        p.velocity.multiplyScalar(0.96)
        const t = p.life / p.maxLife
        const idx = i * 3
        posArr[idx] = p.position.x
        posArr[idx + 1] = p.position.y
        posArr[idx + 2] = p.position.z + 0.1
        sizeArr[i] = p.size * (1 - t * 0.5)
      }

      for (let i = this.particles.length; i < 200; i++) {
        posArr[i * 3 + 2] = -1000
        sizeArr[i] = 0
      }

      posAttr.needsUpdate = true
      sizeAttr.needsUpdate = true
    }

    this.updateStoryParticles(deltaTime)

    if (this.isBrushing) {
      const mat = this.brushSprite.material as THREE.SpriteMaterial
      const pulse = 0.75 + 0.1 * Math.sin(currentTime * 5)
      mat.opacity = pulse
      const scale = 1 + 0.05 * Math.sin(currentTime * 3)
      this.brushSprite.scale.set(
        this.brushRadius * 2 * scale,
        this.brushRadius * 2 * scale,
        1
      )
    }
  }

  private updateStoryParticles(deltaTime: number): void {
    const toRemove: THREE.Object3D[] = []
    this.tablet.group.traverse((obj) => {
      if (obj instanceof THREE.Points && obj.userData.particles) {
        obj.userData.life += deltaTime
        const posAttr = obj.geometry.getAttribute('position') as THREE.BufferAttribute
        const posArr = posAttr.array as Float32Array
        const mat = obj.material as THREE.PointsMaterial

        for (const p of obj.userData.particles) {
          const idx = p.index * 3
          posArr[idx] += p.velocity.x * deltaTime
          posArr[idx + 1] += p.velocity.y * deltaTime
          posArr[idx + 2] += p.velocity.z * deltaTime
          p.velocity.multiplyScalar(0.94)
        }
        posAttr.needsUpdate = true

        const t = obj.userData.life / obj.userData.maxLife
        mat.opacity = Math.max(0, 1 - t)

        if (obj.userData.life >= obj.userData.maxLife) {
          toRemove.push(obj)
        }
      }
    })

    for (const obj of toRemove) {
      this.tablet.group.remove(obj)
      if (obj instanceof THREE.Points) {
        obj.geometry.dispose()
        const mat = obj.material as THREE.PointsMaterial
        mat.map?.dispose()
        mat.dispose()
      }
    }
  }

  public reset(): void {
    this.isBrushing = false
    this.brushSprite.visible = false
    ;(this.brushSprite.material as THREE.SpriteMaterial).opacity = 0
    this.particles = []
  }
}
