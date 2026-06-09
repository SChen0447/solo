import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MolecularSimulation } from './simulation'
import { StatsPanel } from './statsPanel'

const DEFAULT_PARTICLE_COUNT = 100
const DEFAULT_SPEED_FACTOR = 1.0

class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private simulation: MolecularSimulation
  private statsPanel: StatsPanel
  private clock: THREE.Clock
  private particleSlider: HTMLInputElement
  private speedSlider: HTMLInputElement
  private particleValue: HTMLSpanElement
  private speedValue: HTMLSpanElement
  private resetButton: HTMLButtonElement
  private fpsFrames: number = 0
  private fpsTime: number = 0
  private currentFps: number = 60
  private statsUpdateTimer: number = 0

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = this.createGradientBackground()

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(25, 20, 30)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.domElement.id = 'three-canvas'
    document.body.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.enablePan = false
    this.controls.minDistance = 15
    this.controls.maxDistance = 80
    this.controls.maxPolarAngle = Math.PI * 0.9

    this.setupLights()
    this.setupBoundingBox()

    this.simulation = new MolecularSimulation(this.scene)
    this.simulation.setParticleCount(DEFAULT_PARTICLE_COUNT)
    this.simulation.setSpeedFactor(DEFAULT_SPEED_FACTOR)

    this.statsPanel = new StatsPanel()
    this.clock = new THREE.Clock()

    this.particleSlider = document.getElementById('particle-slider') as HTMLInputElement
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement
    this.particleValue = document.getElementById('particle-value') as HTMLSpanElement
    this.speedValue = document.getElementById('speed-value') as HTMLSpanElement
    this.resetButton = document.getElementById('reset-btn') as HTMLButtonElement

    this.bindEvents()
    this.updateSliderLabels()
    window.addEventListener('resize', () => this.onResize())

    this.animate = this.animate.bind(this)
    this.animate()
  }

  private createGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#0a0a2e')
    gradient.addColorStop(1, '#000000')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 512)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6)
    this.scene.add(ambient)

    const pointLight1 = new THREE.PointLight(0xffffff, 1.2, 80)
    pointLight1.position.set(15, 15, 15)
    this.scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0x6688ff, 0.8, 80)
    pointLight2.position.set(-15, -10, -15)
    this.scene.add(pointLight2)
  }

  private setupBoundingBox(): void {
    const size = 20
    const geometry = new THREE.BoxGeometry(size, size, size)
    const edges = new THREE.EdgesGeometry(geometry)
    const material = new THREE.LineBasicMaterial({
      color: 0x555577,
      transparent: true,
      opacity: 0.5,
    })
    const wireframe = new THREE.LineSegments(edges, material)
    this.scene.add(wireframe)
  }

  private bindEvents(): void {
    this.particleSlider.addEventListener('input', () => {
      const count = parseInt(this.particleSlider.value, 10)
      this.simulation.setParticleCount(count)
      this.updateSliderLabels()
    })

    this.speedSlider.addEventListener('input', () => {
      const factor = parseFloat(this.speedSlider.value)
      this.simulation.setSpeedFactor(factor)
      this.updateSliderLabels()
    })

    this.resetButton.addEventListener('click', () => {
      this.simulation.clearAll()
      this.simulation.setParticleCount(DEFAULT_PARTICLE_COUNT)
      this.simulation.setSpeedFactor(DEFAULT_SPEED_FACTOR)
      this.particleSlider.value = DEFAULT_PARTICLE_COUNT.toString()
      this.speedSlider.value = DEFAULT_SPEED_FACTOR.toString()
      this.updateSliderLabels()
    })
  }

  private updateSliderLabels(): void {
    this.particleValue.textContent = this.particleSlider.value
    this.speedValue.textContent = parseFloat(this.speedSlider.value).toFixed(1)
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private animate(): void {
    requestAnimationFrame(this.animate)

    const delta = this.clock.getDelta()
    this.fpsFrames++
    this.fpsTime += delta
    this.statsUpdateTimer += delta

    if (this.fpsTime >= 0.5) {
      this.currentFps = this.fpsFrames / this.fpsTime
      this.fpsFrames = 0
      this.fpsTime = 0
    }

    this.simulation.update(delta)

    if (this.statsUpdateTimer >= 1.0) {
      const stats = this.simulation.getStats()
      this.statsPanel.update(stats, this.currentFps)
      this.simulation.resetSpeedSampling()
      this.statsUpdateTimer = 0
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}

new App()
