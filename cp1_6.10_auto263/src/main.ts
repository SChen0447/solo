import * as THREE from 'three'
import { SceneManager } from './sceneObjects'
import { InteractionManager } from './interaction'
import { computeAllLightPaths, PrismData } from './lightPath'

class CrystalPrismApp {
  container: HTMLElement
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  sceneManager: SceneManager
  interactionManager: InteractionManager
  clock: THREE.Clock = new THREE.Clock()
  lightSourcePosition: THREE.Vector3 = new THREE.Vector3(-8, 3, 0)
  lightDirection: THREE.Vector3 = new THREE.Vector3(1, 0, 0)
  needsSpectrumUpdate: boolean = true
  spectrumUpdateDebounce: number = 0

  constructor() {
    this.container = document.getElementById('canvas-container')!
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.camera.position.set(10, 8, 12)
    this.camera.lookAt(0, 2, 0)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.container.appendChild(this.renderer.domElement)

    this.setupLights()

    this.sceneManager = new SceneManager(this.scene)

    this.interactionManager = new InteractionManager(
      this.sceneManager,
      this.camera,
      this.renderer,
      {
        onPrismPlaced: (pos, type) => this.onPrismPlaced(pos, type),
        onPrismSelected: () => { },
        onPrismMoved: () => { },
        onLightDirectionChanged: (dir) => this.onLightDirectionChanged(dir),
        onParamsChanged: () => this.requestSpectrumUpdate()
      }
    )

    this.interactionManager.setResetHandler(() => this.resetScene())

    this.setupInitialScene()
    this.setupWindowResize()
    this.animate()
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6)
    this.scene.add(ambientLight)

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight1.position.set(5, 10, 5)
    this.scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0x8888ff, 0.4)
    directionalLight2.position.set(-5, 5, -5)
    this.scene.add(directionalLight2)

    const pointLight = new THREE.PointLight(0xffffff, 0.5, 30)
    pointLight.position.set(-8, 3, 0)
    this.scene.add(pointLight)
  }

  private setupInitialScene() {
    this.sceneManager.createLightSource(this.lightSourcePosition)
    this.sceneManager.updateLightBeam(this.lightSourcePosition, this.lightDirection)

    const prism1 = this.sceneManager.createPrism(
      'triangle',
      new THREE.Vector3(0, 0, 0),
      1.5
    )
    prism1.rotationY = Math.PI / 6
    this.sceneManager.updatePrismTransform(prism1)

    const prism2 = this.sceneManager.createPrism(
      'pyramid',
      new THREE.Vector3(4, 0, 0),
      1.5
    )
    prism2.rotationY = -Math.PI / 4
    this.sceneManager.updatePrismTransform(prism2)

    this.requestSpectrumUpdate()
  }

  private onPrismPlaced(position: THREE.Vector3, type: 'triangle' | 'pyramid') {
    this.sceneManager.createPrism(type, position, 1.5)
    this.requestSpectrumUpdate()
  }

  private onLightDirectionChanged(direction: THREE.Vector3) {
    this.lightDirection.copy(direction)
    this.requestSpectrumUpdate()
  }

  private requestSpectrumUpdate() {
    this.needsSpectrumUpdate = true
    this.spectrumUpdateDebounce = performance.now()
  }

  private updateSpectrumIfNeeded() {
    if (!this.needsSpectrumUpdate) return

    const now = performance.now()
    if (now - this.spectrumUpdateDebounce < 16) return

    this.needsSpectrumUpdate = false
    const startTime = performance.now()

    const paths = computeAllLightPaths(
      this.lightSourcePosition,
      this.lightDirection,
      this.sceneManager.prisms
    )
    this.sceneManager.updateSpectrum(paths)

    const elapsed = performance.now() - startTime
    if (elapsed > 50) {
      console.warn(`Spectrum update took ${elapsed.toFixed(1)}ms`)
    }
  }

  private resetScene() {
    this.sceneManager.clearAllPrisms()
    this.sceneManager.setSelectedPrism(null)

    this.lightSourcePosition.set(-8, 3, 0)
    this.lightDirection.set(1, 0, 0)
    this.sceneManager.createLightSource(this.lightSourcePosition)
    this.sceneManager.updateLightBeam(this.lightSourcePosition, this.lightDirection)

    const prism1 = this.sceneManager.createPrism(
      'triangle',
      new THREE.Vector3(0, 0, 0),
      1.5
    )
    prism1.rotationY = Math.PI / 6
    this.sceneManager.updatePrismTransform(prism1)

    const prism2 = this.sceneManager.createPrism(
      'pyramid',
      new THREE.Vector3(4, 0, 0),
      1.5
    )
    prism2.rotationY = -Math.PI / 4
    this.sceneManager.updatePrismTransform(prism2)

    ;(document.getElementById('refraction-slider') as HTMLInputElement).value = '1.5'
    ;(document.getElementById('refraction-value') as HTMLElement).textContent = '1.50'
    ;(document.getElementById('rotation-slider') as HTMLInputElement).value = '0'
    ;(document.getElementById('rotation-value') as HTMLElement).textContent = '0'
    ;(document.getElementById('scale-slider') as HTMLInputElement).value = '1.0'
    ;(document.getElementById('scale-value') as HTMLElement).textContent = '1.0'
    ;(document.getElementById('intensity-slider') as HTMLInputElement).value = '1.0'
    ;(document.getElementById('intensity-value') as HTMLElement).textContent = '1.0'
    ;(document.getElementById('show-spectrum') as HTMLInputElement).checked = true
    this.sceneManager.setSpectrumVisible(true)
    this.sceneManager.setLightIntensity(1.0)

    ;(document.getElementById('type-triangle') as HTMLElement).classList.add('active')
    ;(document.getElementById('type-pyramid') as HTMLElement).classList.remove('active')

    this.camera.position.set(10, 8, 12)
    this.camera.lookAt(0, 2, 0)
    this.interactionManager.controls.target.set(0, 2, 0)

    this.requestSpectrumUpdate()
  }

  private setupWindowResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  private animate() {
    requestAnimationFrame(() => this.animate())

    const time = performance.now()
    this.sceneManager.animateStars(time)
    this.interactionManager.update()
    this.updateSpectrumIfNeeded()

    this.renderer.render(this.scene, this.camera)
  }
}

new CrystalPrismApp()
