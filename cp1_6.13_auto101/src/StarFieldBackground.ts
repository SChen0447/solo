import * as THREE from 'three'

export class StarFieldBackground {
  public group: THREE.Group
  private starsMesh: THREE.Points
  private starCount: number = 200
  private starBrightness: Float32Array
  private starPhases: Float32Array
  private labMaterial: THREE.MeshBasicMaterial
  private labPlane: THREE.Mesh
  private starFieldOpacity: number = 0
  private labOpacity: number = 1
  public transitioning: boolean = false
  public targetStarOpacity: number = 0

  constructor() {
    this.group = new THREE.Group()

    this.labPlane = this.createLabBackground()
    this.group.add(this.labPlane)
    this.labMaterial = this.labPlane.material as THREE.MeshBasicMaterial

    this.starsMesh = this.createStarField()
    this.starBrightness = new Float32Array(this.starCount)
    this.starPhases = new Float32Array(this.starCount)
    for (let i = 0; i < this.starCount; i++) {
      this.starBrightness[i] = 0.3 + Math.random() * 0.7
      this.starPhases[i] = Math.random() * Math.PI * 2
    }
    this.group.add(this.starsMesh)
  }

  private createLabBackground(): THREE.Mesh {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 2048
    const ctx = canvas.getContext('2d')!

    const bgGradient = ctx.createRadialGradient(1024, 1024, 0, 1024, 1024, 1400)
    bgGradient.addColorStop(0, '#2a1f14')
    bgGradient.addColorStop(0.5, '#1a1208')
    bgGradient.addColorStop(1, '#0a0602')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, 2048, 2048)

    for (let y = 0; y < 2048; y += 4) {
      ctx.strokeStyle = `rgba(${40 + Math.random() * 20}, ${28 + Math.random() * 15}, ${14 + Math.random() * 10}, ${0.3 + Math.random() * 0.4})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(2048, y + (Math.random() - 0.5) * 4)
      ctx.stroke()
    }

    for (let i = 0; i < 80; i++) {
      ctx.strokeStyle = `rgba(${50 + Math.random() * 30}, ${35 + Math.random() * 20}, ${15 + Math.random() * 15}, ${0.2 + Math.random() * 0.3})`
      ctx.lineWidth = Math.random() * 2 + 1
      ctx.beginPath()
      const startX = Math.random() * 2048
      const startY = Math.random() * 2048
      const len = Math.random() * 600 + 100
      const angle = (Math.random() - 0.5) * 0.2
      ctx.moveTo(startX, startY)
      ctx.lineTo(startX + Math.cos(angle) * len, startY + Math.sin(angle) * len)
      ctx.stroke()
    }

    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = `rgba(${30 + Math.random() * 30}, ${20 + Math.random() * 20}, ${8 + Math.random() * 15}, ${Math.random() * 0.5})`
      ctx.fillRect(Math.random() * 2048, Math.random() * 2048, Math.random() * 3 + 1, Math.random() * 3 + 1)
    }

    for (let i = 0; i < 15; i++) {
      const lx = Math.random() * 2048
      const ly = Math.random() * 2048
      const lr = 100 + Math.random() * 250
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr)
      glow.addColorStop(0, 'rgba(255, 200, 100, 0.08)')
      glow.addColorStop(0.5, 'rgba(255, 180, 60, 0.03)')
      glow.addColorStop(1, 'rgba(255, 150, 30, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    const geometry = new THREE.PlaneGeometry(80, 80)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.z = -30
    mesh.renderOrder = -1000
    return mesh
  }

  private createStarField(): THREE.Points {
    const positions = new Float32Array(this.starCount * 3)
    const colors = new Float32Array(this.starCount * 3)
    const sizes = new Float32Array(this.starCount)

    for (let i = 0; i < this.starCount; i++) {
      const radius = 15 + Math.random() * 15
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = -20 - radius * Math.cos(phi) * 0.5

      const temp = Math.random()
      let r: number, g: number, b: number
      if (temp < 0.3) {
        r = 1
        g = 0.9
        b = 0.7
      } else if (temp < 0.6) {
        r = 0.9
        g = 0.95
        b = 1
      } else if (temp < 0.85) {
        r = 1
        g = 1
        b = 1
      } else {
        r = 0.8
        g = 0.9
        b = 1
      }
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      sizes[i] = 0.04 + Math.random() * 0.1
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
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)')
    grad.addColorStop(0.7, 'rgba(200, 220, 255, 0.3)')
    grad.addColorStop(1, 'rgba(150, 180, 255, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 32, 32)
    const tex = new THREE.CanvasTexture(canvas)

    const material = new THREE.PointsMaterial({
      size: 0.1,
      map: tex,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })

    const mesh = new THREE.Points(geometry, material)
    mesh.frustumCulled = false
    mesh.renderOrder = -900
    return mesh
  }

  public startTransition(): void {
    if (this.transitioning) return
    this.transitioning = true
    this.targetStarOpacity = 1
  }

  public update(deltaTime: number, currentTime: number): void {
    if (this.transitioning) {
      const transitionSpeed = 1 / 3
      if (this.starFieldOpacity < this.targetStarOpacity) {
        this.starFieldOpacity = Math.min(
          this.targetStarOpacity,
          this.starFieldOpacity + deltaTime * transitionSpeed
        )
      }
      if (this.labOpacity > (1 - this.targetStarOpacity) * 0.3) {
        this.labOpacity = Math.max(
          (1 - this.targetStarOpacity) * 0.3,
          this.labOpacity - deltaTime * transitionSpeed
        )
      }
      if (
        this.starFieldOpacity >= this.targetStarOpacity &&
        this.labOpacity <= (1 - this.targetStarOpacity) * 0.3 + 0.01
      ) {
        this.transitioning = false
      }
    }

    this.labMaterial.opacity = this.labOpacity
    ;(this.starsMesh.material as THREE.PointsMaterial).opacity = this.starFieldOpacity

    const colorAttr = this.starsMesh.geometry.getAttribute('color') as THREE.BufferAttribute
    const colorArr = colorAttr.array as Float32Array
    for (let i = 0; i < this.starCount; i++) {
      const base = this.starBrightness[i]
      const flicker = 0.5 + 0.5 * Math.sin(currentTime * (2 + this.starPhases[i]))
      const brightness = 0.4 + 0.6 * base * (0.6 + 0.4 * flicker)
      const idx = i * 3
      const originalColors = this.starsMesh.geometry.userData.originalColors
      if (originalColors) {
        colorArr[idx] = originalColors[idx] * brightness
        colorArr[idx + 1] = originalColors[idx + 1] * brightness
        colorArr[idx + 2] = originalColors[idx + 2] * brightness
      }
    }
    colorAttr.needsUpdate = true

    this.starsMesh.rotation.y += deltaTime * 0.005
  }

  public cacheOriginalColors(): void {
    const colorAttr = this.starsMesh.geometry.getAttribute('color') as THREE.BufferAttribute
    this.starsMesh.geometry.userData.originalColors = new Float32Array(colorAttr.array)
  }

  public reset(): void {
    this.targetStarOpacity = 0
    this.transitioning = true
    const resetStep = () => {
      const step = () => {
        const delta = 0.02
        if (this.starFieldOpacity > 0) {
          this.starFieldOpacity = Math.max(0, this.starFieldOpacity - delta)
          this.labOpacity = Math.min(1, this.labOpacity + delta)
          this.labMaterial.opacity = this.labOpacity
          ;(this.starsMesh.material as THREE.PointsMaterial).opacity = this.starFieldOpacity
          if (this.starFieldOpacity > 0 || this.labOpacity < 1) {
            requestAnimationFrame(step)
          } else {
            this.transitioning = false
          }
        }
      }
      step()
    }
    resetStep()
  }
}
