import * as THREE from 'three'

export interface EnvironmentParams {
  light: number
  water: number
  temperature: number
}

export class Renderer {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private container: HTMLElement
  private ground: THREE.Mesh
  private ambientLight: THREE.AmbientLight
  private mainLight: THREE.DirectionalLight
  private fillLight: THREE.DirectionalLight
  private particleSystem: THREE.Points | null = null
  private particles: THREE.Points | null = null
  private particleData: Array<{
    velocity: THREE.Vector3
    life: number
    maxLife: number
  }> = []

  private isDragging: boolean = false
  private isPanning: boolean = false
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 }
  private cameraDistance: number = 8
  private cameraAngleY: number = 0
  private cameraAngleX: number = Math.PI / 6
  private panOffset: THREE.Vector2 = new THREE.Vector2(0, 0)

  private maxParticles: number = 100

  constructor(containerId: string) {
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Container with id ${containerId} not found`)
    }
    this.container = container

    this.scene = new THREE.Scene()
    this.scene.background = this.createGradientBackground()

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.updateCameraPosition()

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    this.scene.add(this.ambientLight)

    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.0)
    this.mainLight.position.set(-5, 5, 5)
    this.mainLight.castShadow = true
    this.mainLight.shadow.mapSize.width = 2048
    this.mainLight.shadow.mapSize.height = 2048
    this.mainLight.shadow.camera.near = 0.5
    this.mainLight.shadow.camera.far = 50
    this.mainLight.shadow.camera.left = -10
    this.mainLight.shadow.camera.right = 10
    this.mainLight.shadow.camera.top = 10
    this.mainLight.shadow.camera.bottom = -10
    this.scene.add(this.mainLight)

    this.fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    this.fillLight.position.set(5, -2, -5)
    this.scene.add(this.fillLight)

    this.ground = this.createGround()
    this.scene.add(this.ground)

    this.createStars()

    this.initParticleSystem()

    this.setupEventListeners()
  }

  private createGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const gradient = ctx.createLinearGradient(0, 0, 512, 512)
    gradient.addColorStop(0, '#0B0B45')
    gradient.addColorStop(1, '#2D004D')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(6, 64)
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    const ground = new THREE.Mesh(geometry, material)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true

    const gridHelper = new THREE.GridHelper(12, 24, 0xffffff, 0xffffff)
    gridHelper.position.y = 0.001
    const gridMaterial = gridHelper.material as THREE.Material
    gridMaterial.transparent = true
    gridMaterial.opacity = 0.1
    ground.add(gridHelper)

    return ground
  }

  private createStars(): void {
    const starsGeometry = new THREE.BufferGeometry()
    const starCount = 500
    const positions = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount; i++) {
      const radius = 30 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    })

    const stars = new THREE.Points(starsGeometry, starsMaterial)
    this.scene.add(stars)
  }

  private initParticleSystem(): void {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.maxParticles * 3)
    const colors = new Float32Array(this.maxParticles * 3)
    const sizes = new Float32Array(this.maxParticles)

    for (let i = 0; i < this.maxParticles; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = -100
      positions[i * 3 + 2] = 0
      
      colors[i * 3] = 1
      colors[i * 3 + 1] = 0.843
      colors[i * 3 + 2] = 0
      
      sizes[i] = 0
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })

    this.particles = new THREE.Points(geometry, material)
    this.scene.add(this.particles)
  }

  public spawnFlowerParticles(position: THREE.Vector3, count: number = 20): void {
    if (!this.particles) return

    const positions = this.particles.geometry.attributes.position.array as Float32Array
    const colors = this.particles.geometry.attributes.color.array as Float32Array
    const sizes = this.particles.geometry.attributes.size.array as Float32Array

    let spawned = 0
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      if (this.particleData[i] && this.particleData[i].life <= 0) {
        positions[i * 3] = position.x + (Math.random() - 0.5) * 0.2
        positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.2
        positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.2

        const color = new THREE.Color(0xFFD700)
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b

        sizes[i] = 0.03

        const angle = Math.random() * Math.PI * 2
        const speed = 0.01
        this.particleData[i] = {
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            speed * (0.5 + Math.random() * 0.5),
            Math.sin(angle) * speed
          ),
          life: 3,
          maxLife: 3
        }
        spawned++
      }
    }

    for (let i = this.particleData.length; i < this.maxParticles && spawned < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.2
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.2
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.2

      const color = new THREE.Color(0xFFD700)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] = 0.03

      const angle = Math.random() * Math.PI * 2
      const speed = 0.01
      this.particleData.push({
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          speed * (0.5 + Math.random() * 0.5),
          Math.sin(angle) * speed
        ),
        life: 3,
        maxLife: 3
      })
      spawned++
    }

    this.particles.geometry.attributes.position.needsUpdate = true
    this.particles.geometry.attributes.color.needsUpdate = true
    this.particles.geometry.attributes.size.needsUpdate = true
  }

  private updateParticles(deltaTime: number): void {
    if (!this.particles) return

    const positions = this.particles.geometry.attributes.position.array as Float32Array
    const sizes = this.particles.geometry.attributes.size.array as Float32Array

    for (let i = 0; i < this.particleData.length; i++) {
      const particle = this.particleData[i]
      if (particle.life > 0) {
        particle.life -= deltaTime
        
        positions[i * 3] += particle.velocity.x * deltaTime * 60
        positions[i * 3 + 1] += particle.velocity.y * deltaTime * 60
        positions[i * 3 + 2] += particle.velocity.z * deltaTime * 60

        const alpha = Math.max(0, particle.life / particle.maxLife)
        sizes[i] = 0.03 * alpha

        if (particle.life <= 0) {
          positions[i * 3 + 1] = -100
          sizes[i] = 0
        }
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true
    this.particles.geometry.attributes.size.needsUpdate = true
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true
      } else if (e.button === 2) {
        this.isPanning = true
      }
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    })

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x
        const deltaY = e.clientY - this.previousMousePosition.y
        
        this.cameraAngleY -= deltaX * 0.005
        this.cameraAngleX += deltaY * 0.005
        
        this.cameraAngleX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraAngleX))
        
        this.updateCameraPosition()
      }
      
      if (this.isPanning) {
        const deltaX = e.clientX - this.previousMousePosition.x
        const deltaY = e.clientY - this.previousMousePosition.y
        
        this.panOffset.x -= deltaX * 0.01
        this.panOffset.y += deltaY * 0.01
        
        this.updateCameraPosition()
      }
      
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    })

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDragging = false
      } else if (e.button === 2) {
        this.isPanning = false
      }
    })

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false
      this.isPanning = false
    })

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault()
    })

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      this.cameraDistance += e.deltaY * 0.01
      this.cameraDistance = Math.max(2, Math.min(20, this.cameraDistance))
      this.updateCameraPosition()
    }, { passive: false })

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX)
    const y = this.cameraDistance * Math.sin(this.cameraAngleX)
    const z = this.cameraDistance * Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX)
    
    this.camera.position.set(
      x + this.panOffset.x,
      y + this.panOffset.y,
      z
    )
    this.camera.lookAt(this.panOffset.x, this.panOffset.y, 0)
  }

  public getScene(): THREE.Scene {
    return this.scene
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer
  }

  public updateEnvironment(params: EnvironmentParams): void {
    const lightIntensity = 0.5 + (params.light / 100) * 1.0
    this.mainLight.intensity = lightIntensity
    this.fillLight.intensity = lightIntensity * 0.3
    this.ambientLight.intensity = 0.1 + (params.light / 100) * 0.2

    const tempColor = new THREE.Color()
    if (params.temperature > 60) {
      const t = (params.temperature - 60) / 40
      tempColor.setRGB(1, 1 - t * 0.3, 1 - t * 0.5)
    } else {
      const t = params.temperature / 60
      tempColor.setRGB(0.7 + t * 0.3, 0.8 + t * 0.2, 1)
    }
    
    this.mainLight.color.copy(tempColor)
  }

  public render(deltaTime: number): void {
    this.updateParticles(deltaTime)
    this.renderer.render(this.scene, this.camera)
  }

  public dispose(): void {
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
