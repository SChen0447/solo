import { GUI } from 'dat.gui'
import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type ViewMode = 'top' | 'side' | 'follow'

export interface GUIParams {
  temperatureGradient: number
  organismDensity: number
  particleCount: number
  viewMode: ViewMode
}

interface ViewPreset {
  position: THREE.Vector3
  target: THREE.Vector3
}

const VIEW_PRESETS: Record<ViewMode, ViewPreset> = {
  top: {
    position: new THREE.Vector3(0, 18, 0.01),
    target: new THREE.Vector3(0, -1, 0)
  },
  side: {
    position: new THREE.Vector3(12, 4, 12),
    target: new THREE.Vector3(0, 0, 0)
  },
  follow: {
    position: new THREE.Vector3(2, 1.5, 2),
    target: new THREE.Vector3(0, 1, 0)
  }
}

export class GUIController {
  public params: GUIParams
  public gui!: GUI

  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls

  private onTemperatureChange?: (value: number) => void
  private onDensityChange?: (value: number) => void
  private onParticleCountChange?: (value: number) => void

  private tweening = false
  private tweenStart = { pos: new THREE.Vector3(), target: new THREE.Vector3() }
  private tweenEnd = { pos: new THREE.Vector3(), target: new THREE.Vector3() }
  private tweenProgress = 0
  private tweenDuration = 0.5

  constructor(
    container: HTMLElement,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    initialParams: Partial<GUIParams> = {}
  ) {
    this.camera = camera
    this.controls = controls

    this.params = {
      temperatureGradient: initialParams.temperatureGradient ?? 50,
      organismDensity: initialParams.organismDensity ?? 100,
      particleCount: initialParams.particleCount ?? 200,
      viewMode: initialParams.viewMode ?? 'side'
    }

    this.gui = new GUI({ autoPlace: false, width: 320 })
    container.appendChild(this.gui.domElement)

    this.buildControls()
  }

  private buildControls(): void {
    const ventFolder = this.gui.addFolder('热泉参数')
    ventFolder.open()

    ventFolder
      .add(this.params, 'temperatureGradient', 0, 100, 1)
      .name('温度梯度强度')
      .onChange((value: number) => {
        this.onTemperatureChange?.(value)
      })

    ventFolder
      .add(this.params, 'particleCount', 50, 500, 10)
      .name('粒子数量')
      .onChange((value: number) => {
        this.onParticleCountChange?.(value)
      })

    const organismFolder = this.gui.addFolder('生物参数')
    organismFolder.open()

    organismFolder
      .add(this.params, 'organismDensity', 0, 200, 5)
      .name('生物密度 (%)')
      .onChange((value: number) => {
        this.onDensityChange?.(value)
      })

    const viewFolder = this.gui.addFolder('视角控制')
    viewFolder.open()

    viewFolder
      .add(this.params, 'viewMode', {
        '俯视': 'top',
        '侧视': 'side',
        '跟随烟柱': 'follow'
      })
      .name('视角模式')
      .onChange((_value: ViewMode) => {
        this.startViewTween(this.params.viewMode)
      })
  }

  public setCallbacks(callbacks: {
    onTemperatureChange?: (value: number) => void
    onDensityChange?: (value: number) => void
    onParticleCountChange?: (value: number) => void
  }): void {
    this.onTemperatureChange = callbacks.onTemperatureChange
    this.onDensityChange = callbacks.onDensityChange
    this.onParticleCountChange = callbacks.onParticleCountChange
  }

  private startViewTween(mode: ViewMode): void {
    const preset = VIEW_PRESETS[mode]
    this.tweenStart.pos.copy(this.camera.position)
    this.tweenStart.target.copy(this.controls.target)
    this.tweenEnd.pos.copy(preset.position)
    this.tweenEnd.target.copy(preset.target)
    this.tweenProgress = 0
    this.tweening = true
  }

  public update(delta: number): void {
    if (!this.tweening) return

    this.tweenProgress = Math.min(this.tweenProgress + delta / this.tweenDuration, 1)
    const t = this.easeInOutCubic(this.tweenProgress)

    this.camera.position.lerpVectors(this.tweenStart.pos, this.tweenEnd.pos, t)
    this.controls.target.lerpVectors(this.tweenStart.target, this.tweenEnd.target, t)
    this.controls.update()

    if (this.tweenProgress >= 1) {
      this.tweening = false
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
}

export function createGUI(
  container: HTMLElement,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  initialParams?: Partial<GUIParams>
): GUIController {
  return new GUIController(container, camera, controls, initialParams)
}
