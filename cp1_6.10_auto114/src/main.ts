import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Terrain, createGroundGrid } from './terrain'
import { WaveSystem, createFlash, updateFlash } from './wave'
import { createGUI, GUIParams } from './gui'

class App {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private terrain: Terrain
  private waveSystem: WaveSystem
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private guiParams: GUIParams
  private flashes: THREE.Mesh[] = []
  private clock: THREE.Clock
  private fpsEl: HTMLElement | null
  private frameCount: number = 0
  private fpsTime: number = 0

  constructor() {
    this.clock = new THREE.Clock()

    const appEl = document.getElementById('app')
    if (!appEl) throw new Error('#app element not found')

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    appEl.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = this.createGradientTexture()
    this.scene.fog = new THREE.Fog(0x1a1a3a, 40, 120)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    )
    this.camera.position.set(25, 20, 35)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 10
    this.controls.maxDistance = 100
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.target.set(0, 7.5, 0)

    this.addLights()

    this.terrain = new Terrain()
    this.terrain.addToScene(this.scene)

    const grid = createGroundGrid()
    this.scene.add(grid)

    this.guiParams = {
      magnitude: 5,
      speed: 1.5,
      reflectionEnabled: true,
      refractionEnabled: true
    }

    this.waveSystem = new WaveSystem({
      magnitude: this.guiParams.magnitude,
      speed: this.guiParams.speed,
      reflectionEnabled: this.guiParams.reflectionEnabled,
      refractionEnabled: this.guiParams.refractionEnabled
    })
    this.waveSystem.addToScene(this.scene)

    createGUI(this.guiParams, (params) => {
      this.waveSystem.setParams({
        magnitude: params.magnitude,
        speed: params.speed,
        reflectionEnabled: params.reflectionEnabled,
        refractionEnabled: params.refractionEnabled
      })
    })

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.fpsEl = document.getElementById('fps')

    this.setupEventListeners()

    this.hideLoading()

    this.animate()
  }

  private createGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#0b0b2b')
    gradient.addColorStop(1, '#1a1a3a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 512)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(20, 40, 20)
    this.scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3)
    fillLight.position.set(-15, 20, -10)
    this.scene.add(fillLight)
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize())
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e))
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e))
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.terrain.meshes, false)

    this.renderer.domElement.style.cursor = intersects.length > 0 ? 'crosshair' : 'default'
  }

  private onClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.terrain.meshes, false)

    if (intersects.length > 0) {
      const point = intersects[0].point
      this.waveSystem.setEpicenter(point)

      const flash = createFlash(point)
      this.scene.add(flash)
      this.flashes.push(flash)
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private hideLoading(): void {
    setTimeout(() => {
      const el = document.getElementById('loading')
      if (el) el.classList.add('hidden')
    }, 300)
  }

  private updateFPS(delta: number): void {
    this.frameCount++
    this.fpsTime += delta
    if (this.fpsTime >= 0.5 && this.fpsEl) {
      const fps = Math.round(this.frameCount / this.fpsTime)
      this.fpsEl.textContent = `FPS: ${fps}`
      this.frameCount = 0
      this.fpsTime = 0
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate)

    const delta = Math.min(this.clock.getDelta(), 0.05)

    this.controls.update()

    this.waveSystem.update(delta)

    this.flashes = this.flashes.filter(flash => {
      const alive = updateFlash(flash, delta)
      if (!alive) {
        this.scene.remove(flash)
        flash.geometry.dispose()
        ;(flash.material as THREE.Material).dispose()
      }
      return alive
    })

    this.updateFPS(delta)

    this.renderer.render(this.scene, this.camera)
  }
}

new App()
