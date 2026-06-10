import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DragControls } from 'three/examples/jsm/controls/DragControls.js'
import { FieldLine, PoleData } from './FieldLine'
import { ParticleSystem, ParticleParams } from './Particle'
import { UIManager, UIParams } from './UI'

interface PoleObject {
  mesh: THREE.Mesh
  halo: THREE.PointLight
  data: PoleData
}

class MagneticFieldApp {
  private container!: HTMLElement
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private orbitControls!: OrbitControls
  private dragControls!: DragControls
  private clock!: THREE.Clock

  private fieldLine!: FieldLine
  private particleSystem!: ParticleSystem
  private uiManager!: UIManager

  private poles: PoleObject[] = []
  private poleMeshes: THREE.Mesh[] = []
  private maxPoles: number = 4

  private raycaster!: THREE.Raycaster
  private mouse!: THREE.Vector2
  private hoveredPole: PoleObject | null = null
  private isDragging: boolean = false
  private poleReleaseTimer: number = 0

  constructor() {
    this.container = document.getElementById('app')!
    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.initScene()
    this.initRenderer()
    this.initCamera()
    this.initLights()
    this.initGround()

    this.fieldLine = new FieldLine(this.scene)
    this.particleSystem = new ParticleSystem(this.scene)

    this.initUI()
    this.initDefaultPoles()
    this.initControls()
    this.initEvents()

    this.updateFieldAndParticles(true)
    this.animate()
  }

  private initScene(): void {
    this.scene = new THREE.Scene()
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#0b1120')
    gradient.addColorStop(1, '#1a2332')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 512)
    const texture = new THREE.CanvasTexture(canvas)
    this.scene.background = texture
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.cursor = 'default'
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 6, 12)
    this.camera.lookAt(0, 0, 0)
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6)
    this.scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 10, 7)
    dirLight.castShadow = true
    this.scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0x00d4ff, 0.3)
    fillLight.position.set(-5, 3, -5)
    this.scene.add(fillLight)
  }

  private initGround(): void {
    const gridHelper = new THREE.GridHelper(30, 30, 0x4a6fa5, 0x4a6fa5)
    const gridMat = gridHelper.material as THREE.Material
    gridMat.transparent = true
    gridMat.opacity = 0.15
    this.scene.add(gridHelper)
  }

  private initUI(): void {
    const initialParams: UIParams = {
      nStrength: 1.5,
      sStrength: 1.5,
      initialSpeed: 2.0,
      charge: 1.0,
      particleCount: 10,
      zoom: 10
    }

    this.uiManager = new UIManager(this.container, initialParams, {
      onParamChange: (params) => this.handleParamChange(params),
      onAddPole: (type) => this.addPole(type),
      onRemovePole: () => this.removeLastPole()
    })
  }

  private initDefaultPoles(): void {
    this.addPole('N', new THREE.Vector3(-3, 0, 0))
    this.addPole('S', new THREE.Vector3(3, 0, 0))
  }

  private addPole(type: 'N' | 'S', position?: THREE.Vector3): void {
    if (this.poles.length >= this.maxPoles) return

    const nCount = this.poles.filter(p => p.data.type === 'N').length
    const sCount = this.poles.filter(p => p.data.type === 'S').length
    if (type === 'N' && nCount >= 2) return
    if (type === 'S' && sCount >= 2) return

    const params = this.uiManager.getParams()
    const strength = type === 'N' ? params.nStrength : params.sStrength

    let pos = position
    if (!pos) {
      const offset = this.poles.length * 2
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 6
      )
    }

    const color = type === 'N' ? 0xff3333 : 0x3366ff
    const emissiveColor = type === 'N' ? 0xff0000 : 0x0033ff

    const geometry = new THREE.SphereGeometry(0.5, 32, 32)
    const material = new THREE.MeshPhongMaterial({
      color,
      emissive: emissiveColor,
      emissiveIntensity: 0.3,
      shininess: 60
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(pos)
    mesh.userData.isPole = true
    mesh.castShadow = true
    this.scene.add(mesh)

    const halo = new THREE.PointLight(color, 0.3, 4)
    halo.position.copy(pos)
    this.scene.add(halo)

    const poleData: PoleData = {
      position: mesh.position,
      strength,
      type
    }

    this.poles.push({ mesh, halo, data: poleData })
    this.poleMeshes.push(mesh)

    this.refreshDragControls()
    this.updatePoleStrengths()
    this.updateFieldAndParticles()
  }

  private removeLastPole(): void {
    if (this.poles.length <= 2) return
    const pole = this.poles.pop()
    if (pole) {
      this.scene.remove(pole.mesh)
      this.scene.remove(pole.halo)
      pole.mesh.geometry.dispose()
      ;(pole.mesh.material as THREE.Material).dispose()
      const idx = this.poleMeshes.indexOf(pole.mesh)
      if (idx > -1) this.poleMeshes.splice(idx, 1)
    }
    this.refreshDragControls()
    this.updateFieldAndParticles()
  }

  private refreshDragControls(): void {
    if (this.dragControls) {
      this.dragControls.dispose()
    }
    this.dragControls = new DragControls(
      this.poleMeshes,
      this.camera,
      this.renderer.domElement
    )
    this.dragControls.addEventListener('dragstart', () => {
      this.orbitControls.enabled = false
      this.isDragging = true
      this.renderer.domElement.style.cursor = 'grabbing'
    })
    this.dragControls.addEventListener('drag', () => {
      this.updatePolePositions()
      this.updateFieldAndParticles(false)
    })
    this.dragControls.addEventListener('dragend', () => {
      this.orbitControls.enabled = true
      this.isDragging = false
      this.renderer.domElement.style.cursor = 'default'
      this.poleReleaseTimer = 0.5
      this.updateFieldAndParticles(false)
    })
  }

  private initControls(): void {
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
    this.orbitControls.enableDamping = true
    this.orbitControls.dampingFactor = 0.05
    this.orbitControls.minDistance = 2
    this.orbitControls.maxDistance = 40
    this.orbitControls.target.set(0, 0, 0)

    const params = this.uiManager.getParams()
    this.camera.position.setLength(params.zoom)
  }

  private initEvents(): void {
    window.addEventListener('resize', () => this.onResize())
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e))
    this.container.addEventListener('click', () => {
      this.uiManager.hideParticleInfo()
    })
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    if (this.isDragging) return

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.poleMeshes)

    if (this.hoveredPole) {
      const mat = this.hoveredPole.mesh.material as THREE.MeshPhongMaterial
      mat.emissiveIntensity = 0.3
      this.hoveredPole.halo.intensity = 0.3
      this.hoveredPole = null
    }

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh
      const pole = this.poles.find(p => p.mesh === mesh)
      if (pole) {
        this.hoveredPole = pole
        const mat = pole.mesh.material as THREE.MeshPhongMaterial
        mat.emissiveIntensity = 1.5
        pole.halo.intensity = 1.5
        this.renderer.domElement.style.cursor = 'grab'
      }
    } else {
      this.renderer.domElement.style.cursor = 'default'
    }
  }

  private onClick(event: MouseEvent): void {
    event.stopPropagation()
    if (this.isDragging) return

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const particleMeshes = this.particleSystem.getParticles().map(p => p.mesh)
    const intersects = this.raycaster.intersectObjects(particleMeshes)

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh
      const particle = mesh.userData.particle
      if (particle) {
        this.uiManager.showParticleInfo(particle, event.clientX, event.clientY)
      }
    }
  }

  private handleParamChange(params: UIParams): void {
    const dist = this.camera.position.length()
    this.camera.position.setLength(params.zoom)
    this.orbitControls.update()

    this.updatePoleStrengths()
    this.particleSystem.updateParams({
      initialSpeed: params.initialSpeed,
      charge: params.charge,
      helixRadius: 0.3,
      stepSize: 0.02
    })

    const currentCount = this.particleSystem.count
    if (currentCount !== params.particleCount) {
      this.recreateParticles()
    } else {
      this.updateFieldAndParticles()
    }
  }

  private updatePolePositions(): void {
    for (const pole of this.poles) {
      pole.halo.position.copy(pole.mesh.position)
    }
  }

  private updatePoleStrengths(): void {
    const params = this.uiManager.getParams()
    for (const pole of this.poles) {
      pole.data.strength = pole.data.type === 'N' ? params.nStrength : params.sStrength
    }
  }

  private recreateParticles(): void {
    const params = this.uiManager.getParams()
    const particleParams: ParticleParams = {
      charge: params.charge,
      initialSpeed: params.initialSpeed,
      helixRadius: 0.3,
      stepSize: 0.02
    }
    const poleDatas = this.poles.map(p => p.data)
    this.particleSystem.createParticles(
      params.particleCount,
      poleDatas,
      this.fieldLine,
      particleParams,
      (p) => {
        const worldPos = new THREE.Vector3()
        p.mesh.getWorldPosition(worldPos)
        const screenPos = worldPos.project(this.camera)
        const x = (screenPos.x + 1) / 2 * window.innerWidth
        const y = (-screenPos.y + 1) / 2 * window.innerHeight
        this.uiManager.showParticleInfo(p, x, y)
      }
    )
  }

  private updateFieldAndParticles(immediate: boolean = false): void {
    const poleDatas = this.poles.map(p => p.data)
    const isValid = this.fieldLine.hasValidConfiguration(poleDatas)
    this.uiManager.showWarning(!isValid)

    this.fieldLine.update(poleDatas, immediate)
    this.particleSystem.updatePoles(poleDatas)

    if (this.particleSystem.count === 0) {
      this.recreateParticles()
    } else {
      this.particleSystem.updateFieldLines(this.fieldLine)
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())
    const deltaTime = Math.min(this.clock.getDelta(), 0.1)

    if (this.poleReleaseTimer > 0) {
      this.poleReleaseTimer -= deltaTime
      if (this.poleReleaseTimer <= 0) {
        this.updateFieldAndParticles(true)
      }
    }

    this.orbitControls.update()
    this.fieldLine.animate(deltaTime)
    this.particleSystem.update(deltaTime, this.fieldLine)

    this.renderer.render(this.scene, this.camera)
  }

  public dispose(): void {
    this.uiManager.dispose()
    this.fieldLine.dispose()
    this.particleSystem.dispose()
    for (const pole of this.poles) {
      this.scene.remove(pole.mesh)
      this.scene.remove(pole.halo)
      pole.mesh.geometry.dispose()
      ;(pole.mesh.material as THREE.Material).dispose()
    }
    this.renderer.dispose()
    this.orbitControls.dispose()
    if (this.dragControls) this.dragControls.dispose()
  }
}

let app: MagneticFieldApp | null = null

window.addEventListener('DOMContentLoaded', () => {
  app = new MagneticFieldApp()
})

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose()
    app = null
  }
})
