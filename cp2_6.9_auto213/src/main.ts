import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createThermalVents, ThermalSystem } from './thermal'
import { createOrganisms, OrganismSystem } from './organisms'
import { createGUI, GUIController } from './gui'

class HydrothermalVentApp {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private clock: THREE.Clock

  private thermalSystem!: ThermalSystem
  private organismSystem!: OrganismSystem
  private guiController!: GUIController

  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private tooltipEl: HTMLElement

  private container: HTMLElement
  private loadingEl: HTMLElement

  constructor() {
    this.container = document.getElementById('app') as HTMLElement
    this.loadingEl = document.getElementById('loading') as HTMLElement
    this.tooltipEl = document.getElementById('tooltip') as HTMLElement

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)
    this.scene.fog = new THREE.FogExp2(0x000033, 0.003)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.camera.position.set(12, 4, 12)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 3
    this.controls.maxDistance = 30
    this.controls.target.set(0, 0, 0)
    this.controls.update()

    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.setupLights()
    this.initModules()
    this.setupEvents()
    this.hideLoading()

    this.animate()
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x0a1a3a, 0.6)
    this.scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0x1a3a5a, 0.4)
    dirLight.position.set(5, 10, 5)
    this.scene.add(dirLight)

    const blueLight = new THREE.PointLight(0x0044aa, 0.3, 30)
    blueLight.position.set(-8, 3, -8)
    this.scene.add(blueLight)

    const blueLight2 = new THREE.PointLight(0x003388, 0.2, 25)
    blueLight2.position.set(8, 2, -5)
    this.scene.add(blueLight2)
  }

  private initModules(): void {
    this.thermalSystem = createThermalVents(this.scene, {
      temperatureGradient: 50,
      particleCount: 200
    })

    this.organismSystem = createOrganisms(this.scene, {
      temperatureGradient: 50,
      density: 100
    }, this.thermalSystem)

    const guiContainer = document.getElementById('gui-container') as HTMLElement
    this.guiController = createGUI(guiContainer, this.camera, this.controls, {
      temperatureGradient: 50,
      organismDensity: 100,
      particleCount: 200,
      viewMode: 'side'
    })

    this.guiController.setCallbacks({
      onTemperatureChange: (value: number) => {
        this.thermalSystem.setParams({ temperatureGradient: value })
        this.organismSystem.setParams({ temperatureGradient: value })
      },
      onDensityChange: (value: number) => {
        this.organismSystem.setParams({ density: value })
      },
      onParticleCountChange: (value: number) => {
        this.thermalSystem.setParams({ particleCount: value })
      }
    })
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this))
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.renderer.domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this))
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(
      this.organismSystem.interactiveObjects,
      true
    )

    if (intersects.length > 0) {
      const hit = intersects[0]
      const object = hit.object
      const instanceId = hit.instanceId !== undefined ? hit.instanceId : -1

      this.organismSystem.setHovered(object as THREE.Mesh)
      const info = this.organismSystem.getHoveredInfo(object as THREE.Mesh, instanceId)

      if (info.name) {
        this.tooltipEl.style.display = 'block'
        this.tooltipEl.style.left = `${event.clientX + 12}px`
        this.tooltipEl.style.top = `${event.clientY + 12}px`
        this.tooltipEl.textContent = `${info.name} | 温度: ${info.temperature}°C`
      } else {
        this.tooltipEl.style.display = 'none'
      }
    } else {
      this.organismSystem.setHovered(null)
      this.tooltipEl.style.display = 'none'
    }
  }

  private onMouseLeave(): void {
    this.organismSystem.setHovered(null)
    this.tooltipEl.style.display = 'none'
  }

  private hideLoading(): void {
    if (this.loadingEl) {
      this.loadingEl.style.display = 'none'
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    const delta = this.clock.getDelta()
    const elapsed = this.clock.getElapsedTime()

    this.thermalSystem.update(delta)
    this.organismSystem.update(delta, elapsed)
    this.guiController.update(delta)

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}

new HydrothermalVentApp()
