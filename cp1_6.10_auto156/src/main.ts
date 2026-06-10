import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Skeleton, JointName, JOINT_NAMES } from './skeleton'
import { ParticleSystem } from './particles'
import { UI, Pose } from './ui'

interface SequenceStep {
  joint: JointName
  targetAngle: number
  duration: number
}

const PRESET_SEQUENCE: SequenceStep[] = [
  { joint: 'shoulder', targetAngle: 0, duration: 2000 },
  { joint: 'shoulder', targetAngle: 60, duration: 2000 },
  { joint: 'elbow', targetAngle: 0, duration: 2000 },
  { joint: 'elbow', targetAngle: 90, duration: 2000 },
  { joint: 'wrist', targetAngle: 0, duration: 2000 },
  { joint: 'wrist', targetAngle: -45, duration: 2000 },
  { joint: 'hip', targetAngle: 0, duration: 2000 },
  { joint: 'hip', targetAngle: 45, duration: 2000 },
  { joint: 'knee', targetAngle: 0, duration: 2000 },
  { joint: 'knee', targetAngle: 60, duration: 2000 },
  { joint: 'ankle', targetAngle: 0, duration: 2000 },
  { joint: 'ankle', targetAngle: 30, duration: 2000 }
]

class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private skeleton: Skeleton
  private particleSystem: ParticleSystem
  private ui: UI

  private clock: THREE.Clock

  private isPlayingSequence: boolean = false
  private currentStepIndex: number = 0
  private sequenceStartTime: number = 0
  private sequenceStartAngle: number = 0
  private totalSequenceDuration: number = 0

  constructor() {
    this.clock = new THREE.Clock()

    this.scene = this.createScene()
    this.camera = this.createCamera()
    this.renderer = this.createRenderer()
    this.controls = this.createControls()

    this.skeleton = new Skeleton()
    this.scene.add(this.skeleton.root)

    this.particleSystem = new ParticleSystem(this.skeleton)
    this.scene.add(this.particleSystem.points)

    this.totalSequenceDuration = PRESET_SEQUENCE.reduce((sum, step) => sum + step.duration, 0)

    this.ui = new UI(
      (name: JointName, angle: number) => this.handleUpdateJoint(name, angle),
      () => this.startSequence(),
      () => this.stopSequence(),
      (pose: Pose) => this.applyPose(pose)
    )

    this.setupResizeHandler()
    this.animate()
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene()
    scene.background = this.createGradientTexture()

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9)
    directionalLight.position.set(-5, 10, 5)
    scene.add(directionalLight)

    return scene
  }

  private createGradientTexture(): THREE.Texture {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createLinearGradient(0, 0, 0, size)
    gradient.addColorStop(0, '#0a0e27')
    gradient.addColorStop(1, '#1e3a5f')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth * 0.75 / window.innerHeight,
      0.1,
      100
    )
    camera.position.set(0, 5, 12)
    camera.lookAt(0, 1.5, 0)
    return camera
  }

  private createRenderer(): THREE.WebGLRenderer {
    const canvas = document.getElementById('three-canvas') as HTMLCanvasElement
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth * 0.75, window.innerHeight)
    renderer.setClearColor(0x0a0e27, 1)
    return renderer
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.15
    controls.minDistance = 3
    controls.maxDistance = 30
    controls.target.set(0, 1.5, 0)
    controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    }
    controls.update()
    return controls
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const isMobile = window.innerWidth <= 900
      const width = isMobile ? window.innerWidth : window.innerWidth * 0.75
      const height = isMobile ? window.innerHeight - 200 : window.innerHeight

      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(width, height)
    })
  }

  private handleUpdateJoint(name: JointName, angle: number): void {
    this.skeleton.updateJoint(name, angle, 300)
  }

  private applyPose(pose: Pose): void {
    JOINT_NAMES.forEach(name => {
      this.skeleton.updateJoint(name, pose.angles[name], 300)
    })
  }

  private startSequence(): void {
    this.isPlayingSequence = true
    this.currentStepIndex = 0
    this.sequenceStartTime = performance.now()
    this.sequenceStartAngle = this.skeleton.getCurrentAngle(PRESET_SEQUENCE[0].joint)
  }

  private stopSequence(): void {
    this.isPlayingSequence = false
    this.ui.setProgress(0)
    this.ui.resetPlayButtons()
  }

  private updateSequence(): void {
    if (!this.isPlayingSequence) return

    const now = performance.now()
    const currentStep = PRESET_SEQUENCE[this.currentStepIndex]
    const elapsed = now - this.sequenceStartTime

    if (elapsed >= currentStep.duration) {
      this.skeleton.updateJoint(currentStep.joint, currentStep.targetAngle, 0)
      this.currentStepIndex++

      if (this.currentStepIndex >= PRESET_SEQUENCE.length) {
        this.stopSequence()
        return
      }

      this.sequenceStartTime = now
      this.sequenceStartAngle = this.skeleton.getCurrentAngle(PRESET_SEQUENCE[this.currentStepIndex].joint)
    } else {
      const progress = elapsed / currentStep.duration
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentAngle = this.sequenceStartAngle + (currentStep.targetAngle - this.sequenceStartAngle) * eased
      this.skeleton.updateJoint(currentStep.joint, currentAngle, 0)
    }

    let totalElapsed = 0
    for (let i = 0; i < this.currentStepIndex; i++) {
      totalElapsed += PRESET_SEQUENCE[i].duration
    }
    totalElapsed += Math.min(now - this.sequenceStartTime, currentStep.duration)

    const totalProgress = (totalElapsed / this.totalSequenceDuration) * 100
    this.ui.setProgress(totalProgress)
  }

  private updateUI(): void {
    JOINT_NAMES.forEach(name => {
      const angle = this.skeleton.getCurrentAngle(name)
      this.ui.updateJointAngle(name, angle)
    })
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())

    const deltaTime = this.clock.getDelta()

    this.controls.update()
    this.skeleton.animate()
    this.updateSequence()
    this.particleSystem.update(deltaTime)
    this.updateUI()

    this.renderer.render(this.scene, this.camera)
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App()
})
