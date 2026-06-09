import * as THREE from 'three'
import { Pottery } from './pottery'
import { Toolbar } from './toolbar'

class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private pottery!: Pottery
  private toolbar!: Toolbar
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private clock: THREE.Clock
  private isDragging = false
  private lastPointerPos: { x: number; y: number; t: number } | null = null
  private pointerVelocity = 0
  private cameraAngle = 0
  private cameraDistance = 7
  private cameraHeight = 3.5
  private isOrbiting = false
  private orbitStartX = 0
  private orbitStartAngle = 0
  private orbitStartY = 0
  private orbitStartHeight = 3.5

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0A0A0A)

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.updateCameraPosition()

    const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.clock = new THREE.Clock()

    this.setupLights()
    this.setupGround()
    this.pottery = new Pottery(this.scene)
    this.toolbar = new Toolbar(this.pottery)

    this.bindEvents()
    this.animate()
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0)
    keyLight.position.set(5, 8, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 30
    keyLight.shadow.camera.left = -5
    keyLight.shadow.camera.right = 5
    keyLight.shadow.camera.top = 5
    keyLight.shadow.camera.bottom = -5
    this.scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3)
    fillLight.position.set(-5, 4, -3)
    this.scene.add(fillLight)

    const rimLight = new THREE.PointLight(0xffaa66, 0.6, 15)
    rimLight.position.set(0, 3, -4)
    this.scene.add(rimLight)
  }

  private setupGround(): void {
    const groundGeo = new THREE.CircleGeometry(15, 64)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      roughness: 1.0,
      metalness: 0.0
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -2.2
    ground.receiveShadow = true
    this.scene.add(ground)
  }

  private updateCameraPosition(): void {
    this.camera.position.x = Math.sin(this.cameraAngle) * this.cameraDistance
    this.camera.position.z = Math.cos(this.cameraAngle) * this.cameraDistance
    this.camera.position.y = this.cameraHeight
    this.camera.lookAt(0, 0, 0)
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize())

    const canvas = this.renderer.domElement

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e))
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e))
    canvas.addEventListener('pointerup', () => this.onPointerUp())
    canvas.addEventListener('pointerleave', () => this.onPointerUp())
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private onPointerDown(e: PointerEvent): void {
    const now = performance.now()
    this.lastPointerPos = { x: e.clientX, y: e.clientY, t: now }
    this.pointerVelocity = 0

    if (e.button === 2 || e.button === 1) {
      this.isOrbiting = true
      this.orbitStartX = e.clientX
      this.orbitStartAngle = this.cameraAngle
      this.orbitStartY = e.clientY
      this.orbitStartHeight = this.cameraHeight
    } else if (e.button === 0) {
      this.isDragging = true
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const now = performance.now()

    if (this.isOrbiting) {
      const dx = e.clientX - this.orbitStartX
      this.cameraAngle = this.orbitStartAngle - dx * 0.005
      const dy = e.clientY - this.orbitStartY
      this.cameraHeight = Math.max(1.0, Math.min(8.0, this.orbitStartHeight + dy * 0.01))
      this.updateCameraPosition()
      return
    }

    if (!this.isDragging || !this.lastPointerPos) return

    const dx = e.clientX - this.lastPointerPos.x
    const dy = e.clientY - this.lastPointerPos.y
    const dt = Math.max(1, now - this.lastPointerPos.t)
    this.pointerVelocity = Math.sqrt(dx * dx + dy * dy) / dt * 16

    this.lastPointerPos = { x: e.clientX, y: e.clientY, t: now }

    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObject(this.pottery.mesh, false)

    if (hits.length > 0) {
      const hit = hits[0]
      if (hit.point && hit.face) {
        const normal = hit.face.normal.clone()
        this.pottery.deformVertex(hit.point, normal, this.pointerVelocity)
      }
    }
  }

  private onPointerUp(): void {
    if (this.isDragging) {
      this.pottery.endDeform()
    }
    this.isDragging = false
    this.isOrbiting = false
    this.lastPointerPos = null
    this.pointerVelocity = 0
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())
    const deltaTime = Math.min(this.clock.getDelta(), 0.05)
    this.pottery.update(deltaTime)
    this.renderer.render(this.scene, this.camera)
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App()
})
