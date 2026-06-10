import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  createOzoneMolecule,
  createChlorineAtom,
  createOxygenMolecule,
  createClOMolecule,
  animateMoleculeMove,
  animateMoleculeRotate,
  createCollisionParticles,
  clearGroupChildren,
  CollisionParticles
} from './molecule'
import { EnergyChart } from './energyChart'

const REACTION_PHASES = ['初始状态', '碰撞中', '键断裂', '产物形成', '反应完成']

interface AppState {
  reactionProgress: number
  reactionPhase: number
  isReacting: boolean
  reactionStartTime: number
  initialDistance: number
  reactionSpeed: number
  moleculeScale: number
}

class ChemicalReactionApp {
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private controls!: OrbitControls
  private canvasContainer!: HTMLElement

  private ozoneGroup: THREE.Group | null = null
  private chlorineGroup: THREE.Group | null = null
  private oxygenGroup: THREE.Group | null = null
  private cloGroup: THREE.Group | null = null
  private particles: CollisionParticles | null = null

  private moveOzoneFn: ((elapsed: number) => boolean) | null = null
  private moveChlorineFn: ((elapsed: number) => boolean) | null = null
  private rotateOxygenFn: ((delta: number) => void) | null = null
  private rotateCloFn: ((delta: number) => void) | null = null

  private energyChart!: EnergyChart
  private stateLabel!: HTMLElement
  private startBtn!: HTMLElement
  private distanceSlider!: HTMLInputElement
  private speedSlider!: HTMLInputElement
  private scaleSlider!: HTMLInputElement
  private distanceValue!: HTMLElement
  private speedValue!: HTMLElement
  private scaleValue!: HTMLElement

  private state: AppState = {
    reactionProgress: 0,
    reactionPhase: 0,
    isReacting: false,
    reactionStartTime: 0,
    initialDistance: 4,
    reactionSpeed: 1.0,
    moleculeScale: 1.0
  }

  private lastTime = 0
  private stateTransitionStart = 0
  private currentStateOpacity = 1

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!
    this.stateLabel = document.getElementById('state-label')!
    this.startBtn = document.getElementById('start-btn')!
    this.distanceSlider = document.getElementById('distance-slider') as HTMLInputElement
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement
    this.scaleSlider = document.getElementById('scale-slider') as HTMLInputElement
    this.distanceValue = document.getElementById('distance-value')!
    this.speedValue = document.getElementById('speed-value')!
    this.scaleValue = document.getElementById('scale-value')!

    const chartCanvas = document.getElementById('energy-chart') as HTMLCanvasElement
    this.energyChart = new EnergyChart(chartCanvas, {
      width: 250,
      height: 240,
      title: '能量(kJ/mol)'
    })

    this.scene = new THREE.Scene()
    this.setupBackground()
    this.setupCamera()
    this.setupRenderer()
    this.setupLights()
    this.setupControls()
    this.setupInitialMolecules()
    this.setupEventListeners()
    this.updateStateLabel(0)

    this.lastTime = performance.now()
    this.animate = this.animate.bind(this)
    requestAnimationFrame(this.animate)
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#0a0e27')
    gradient.addColorStop(1, '#1a1e3e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 512)
    const texture = new THREE.CanvasTexture(canvas)
    this.scene.background = texture
  }

  private setupCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvasContainer.clientWidth / this.canvasContainer.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 0, 12)
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight)
    this.canvasContainer.appendChild(this.renderer.domElement)
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 8, 5)
    this.scene.add(directionalLight)
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.15
    this.controls.minDistance = 2
    this.controls.maxDistance = 50
  }

  private setupInitialMolecules(): void {
    this.clearMolecules()
    const scale = this.state.moleculeScale

    this.ozoneGroup = createOzoneMolecule(scale)
    this.ozoneGroup.position.set(-this.state.initialDistance / 2, 0, 0)
    this.scene.add(this.ozoneGroup)

    this.chlorineGroup = createChlorineAtom(scale)
    this.chlorineGroup.position.set(this.state.initialDistance / 2, 0, 0)
    this.scene.add(this.chlorineGroup)
  }

  private clearMolecules(): void {
    if (this.ozoneGroup) {
      clearGroupChildren(this.ozoneGroup)
      this.scene.remove(this.ozoneGroup)
      this.ozoneGroup = null
    }
    if (this.chlorineGroup) {
      clearGroupChildren(this.chlorineGroup)
      this.scene.remove(this.chlorineGroup)
      this.chlorineGroup = null
    }
    if (this.oxygenGroup) {
      clearGroupChildren(this.oxygenGroup)
      this.scene.remove(this.oxygenGroup)
      this.oxygenGroup = null
    }
    if (this.cloGroup) {
      clearGroupChildren(this.cloGroup)
      this.scene.remove(this.cloGroup)
      this.cloGroup = null
    }
    if (this.particles) {
      clearGroupChildren(this.particles.group)
      this.scene.remove(this.particles.group)
      this.particles = null
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize())

    this.startBtn.addEventListener('click', () => this.startReaction())

    this.distanceSlider.addEventListener('input', () => {
      this.state.initialDistance = parseFloat(this.distanceSlider.value)
      this.distanceValue.textContent = this.state.initialDistance.toFixed(1)
      if (!this.state.isReacting) {
        this.setupInitialMolecules()
      }
    })

    this.speedSlider.addEventListener('input', () => {
      this.state.reactionSpeed = parseFloat(this.speedSlider.value)
      this.speedValue.textContent = this.state.reactionSpeed.toFixed(1)
    })

    this.scaleSlider.addEventListener('input', () => {
      this.state.moleculeScale = parseFloat(this.scaleSlider.value)
      this.scaleValue.textContent = this.state.moleculeScale.toFixed(1)
      if (!this.state.isReacting) {
        this.setupInitialMolecules()
      }
    })
  }

  private onResize(): void {
    const width = this.canvasContainer.clientWidth
    const height = this.canvasContainer.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private updateStateLabel(phase: number): void {
    this.stateLabel.textContent = REACTION_PHASES[phase]
    this.stateTransitionStart = performance.now()
    this.currentStateOpacity = 0
    this.stateLabel.style.opacity = '0'
  }

  private startReaction(): void {
    if (this.state.isReacting) return

    this.state.isReacting = true
    this.state.reactionProgress = 0
    this.state.reactionPhase = 0
    this.state.reactionStartTime = performance.now()
    this.updateStateLabel(0)

    this.clearMolecules()
    const scale = this.state.moleculeScale

    this.ozoneGroup = createOzoneMolecule(scale)
    this.ozoneGroup.position.set(-this.state.initialDistance / 2, 0, 0)
    this.scene.add(this.ozoneGroup)

    this.chlorineGroup = createChlorineAtom(scale)
    this.chlorineGroup.position.set(this.state.initialDistance / 2, 0, 0)
    this.scene.add(this.chlorineGroup)

    this.moveOzoneFn = animateMoleculeMove(
      this.ozoneGroup,
      this.ozoneGroup.position.clone(),
      new THREE.Vector3(-0.8, 0, 0),
      0.8 / this.state.reactionSpeed
    )

    this.moveChlorineFn = animateMoleculeMove(
      this.chlorineGroup,
      this.chlorineGroup.position.clone(),
      new THREE.Vector3(0.8, 0, 0),
      0.8 / this.state.reactionSpeed
    )

    this.energyChart.setProgress(0)
  }

  private handleCollision(): void {
    if (!this.ozoneGroup || !this.chlorineGroup) return

    const collisionPos = new THREE.Vector3(0, 0, 0)
    this.particles = createCollisionParticles(collisionPos, 50, 1.2)
    this.scene.add(this.particles.group)

    this.updateStateLabel(1)
    this.state.reactionPhase = 1
  }

  private handleBondBreak(): void {
    if (!this.ozoneGroup || !this.chlorineGroup) return

    this.updateStateLabel(2)
    this.state.reactionPhase = 2

    const scale = this.state.moleculeScale

    this.oxygenGroup = createOxygenMolecule(scale)
    this.oxygenGroup.position.set(-1.8, 0.2, 0)
    this.scene.add(this.oxygenGroup)
    this.rotateOxygenFn = animateMoleculeRotate(this.oxygenGroup, 45)

    this.cloGroup = createClOMolecule(scale)
    this.cloGroup.position.set(1.5, -0.1, 0)
    this.scene.add(this.cloGroup)
    this.rotateCloFn = animateMoleculeRotate(this.cloGroup, -30)

    const ozonePos = this.ozoneGroup.position.clone()
    const chlorinePos = this.chlorineGroup.position.clone()

    clearGroupChildren(this.ozoneGroup)
    this.scene.remove(this.ozoneGroup)
    this.ozoneGroup = null

    clearGroupChildren(this.chlorineGroup)
    this.scene.remove(this.chlorineGroup)
    this.chlorineGroup = null
  }

  private animate(currentTime: number): void {
    requestAnimationFrame(this.animate)

    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.05)
    this.lastTime = currentTime

    this.controls.update()

    if (this.currentStateOpacity < 1) {
      const elapsed = (currentTime - this.stateTransitionStart) / 1000
      this.currentStateOpacity = Math.min(elapsed / 0.3, 1)
      this.stateLabel.style.opacity = String(this.currentStateOpacity)
    }

    if (this.state.isReacting) {
      const reactionElapsed = (currentTime - this.state.reactionStartTime) / 1000 * this.state.reactionSpeed
      const totalDuration = 2.0

      this.state.reactionProgress = Math.min(reactionElapsed / totalDuration, 1)
      this.energyChart.setProgress(this.state.reactionProgress)

      if (reactionElapsed <= 0.8) {
        if (this.moveOzoneFn && this.ozoneGroup) {
          this.moveOzoneFn(reactionElapsed)
        }
        if (this.moveChlorineFn && this.chlorineGroup) {
          this.moveChlorineFn(reactionElapsed)
        }
      }

      if (reactionElapsed >= 0.8 && this.state.reactionPhase < 1) {
        this.handleCollision()
      }

      if (reactionElapsed >= 0.95 && this.state.reactionPhase < 2) {
        this.handleBondBreak()
        this.updateStateLabel(2)
      }

      if (reactionElapsed >= 1.3 && this.state.reactionPhase < 3) {
        this.state.reactionPhase = 3
        this.updateStateLabel(3)
      }

      if (reactionElapsed >= 1.8 && this.state.reactionPhase < 4) {
        this.state.reactionPhase = 4
        this.updateStateLabel(4)
        this.state.isReacting = false
      }
    }

    if (this.particles) {
      const done = this.particles.update(delta)
      if (done) {
        clearGroupChildren(this.particles.group)
        this.scene.remove(this.particles.group)
        this.particles = null
      }
    }

    if (this.oxygenGroup && this.rotateOxygenFn) {
      this.rotateOxygenFn(delta)
    }
    if (this.cloGroup && this.rotateCloFn) {
      this.rotateCloFn(delta)
    }

    this.energyChart.render(currentTime)
    this.renderer.render(this.scene, this.camera)
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ChemicalReactionApp()
})
