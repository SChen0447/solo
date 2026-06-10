import * as THREE from 'three'
import { PlantGrowth } from './plant'

export interface CameraState {
  theta: number
  phi: number
  distance: number
}

export class SceneManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private plant: PlantGrowth
  private clock: THREE.Clock
  private helperRing: THREE.Mesh
  private helperRingVisible: boolean = false
  private helperOpacity: number = 0
  private cameraState: CameraState = {
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    distance: 12
  }
  private targetCameraState: CameraState = {
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    distance: 12
  }
  private isDragging: boolean = false
  private lastMouseX: number = 0
  private lastMouseY: number = 0
  private container: HTMLElement
  private onStatsUpdate?: (stats: ReturnType<PlantGrowth['getStats']>) => void

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.clock = new THREE.Clock()

    const width = container.clientWidth
    const height = container.clientHeight

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    this.updateCameraPosition()

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(width, height)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.plant = new PlantGrowth()
    this.scene.add(this.plant.getGroup())

    this.helperRing = this.createHelperRing()
    this.scene.add(this.helperRing)

    this.setupLighting()
    this.setupGround()
    this.setupEventListeners()
    this.animate()
  }

  getPlant(): PlantGrowth {
    return this.plant
  }

  setStatsCallback(callback: (stats: ReturnType<PlantGrowth['getStats']>) => void): void {
    this.onStatsUpdate = callback
  }

  private createHelperRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(5.95, 6.05, 64)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    const ring = new THREE.Mesh(geometry, material)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.01
    return ring
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    this.scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0x4fc3f7, 0.5, 20)
    pointLight.position.set(-3, 5, -3)
    this.scene.add(pointLight)
  }

  private setupGround(): void {
    const geometry = new THREE.CircleGeometry(8, 64)
    const material = new THREE.MeshStandardMaterial({
      color: 0x2d4a3e,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.6
    })
    const ground = new THREE.Mesh(geometry, material)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    const gridHelper = new THREE.GridHelper(16, 32, 0x16c79a, 0x0f3460)
    gridHelper.position.y = 0.001
    const gridMaterial = gridHelper.material as THREE.Material
    gridMaterial.transparent = true
    gridMaterial.opacity = 0.15
    this.scene.add(gridHelper)
  }

  private updateCameraPosition(): void {
    const { theta, phi, distance } = this.cameraState
    const x = distance * Math.sin(phi) * Math.cos(theta)
    const y = distance * Math.cos(phi)
    const z = distance * Math.sin(phi) * Math.sin(theta)
    this.camera.position.set(x, y, z)
    this.camera.lookAt(0, 2.5, 0)
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      this.helperRingVisible = true
    })

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return

      const deltaX = e.clientX - this.lastMouseX
      const deltaY = e.clientY - this.lastMouseY

      this.targetCameraState.theta -= deltaX * 0.005
      this.targetCameraState.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.targetCameraState.phi - deltaY * 0.005)
      )

      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    })

    window.addEventListener('mouseup', () => {
      this.isDragging = false
      this.helperRingVisible = false
    })

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const zoomSpeed = 0.001
      this.targetCameraState.distance = Math.max(
        0.5 * 6,
        Math.min(3 * 6, this.targetCameraState.distance + e.deltaY * zoomSpeed * 6)
      )
      this.helperRingVisible = true
      clearTimeout((this as any)._zoomTimeout)
      ;(this as any)._zoomTimeout = setTimeout(() => {
        this.helperRingVisible = false
      }, 800)
    }, { passive: false })

    window.addEventListener('resize', () => {
      this.onResize()
    })
  }

  private onResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())

    const deltaTime = Math.min(this.clock.getDelta(), 0.1)

    const lerpFactor = 1 - Math.pow(0.001, deltaTime * 3)
    this.cameraState.theta += (this.targetCameraState.theta - this.cameraState.theta) * lerpFactor
    this.cameraState.phi += (this.targetCameraState.phi - this.cameraState.phi) * lerpFactor
    this.cameraState.distance += (this.targetCameraState.distance - this.cameraState.distance) * lerpFactor

    this.updateCameraPosition()

    const targetOpacity = this.helperRingVisible ? 0.2 : 0
    this.helperOpacity += (targetOpacity - this.helperOpacity) * Math.min(lerpFactor * 2, 1)
    const ringMaterial = this.helperRing.material as THREE.MeshBasicMaterial
    ringMaterial.opacity = this.helperOpacity

    this.plant.update(deltaTime)

    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.plant.getStats())
    }

    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
