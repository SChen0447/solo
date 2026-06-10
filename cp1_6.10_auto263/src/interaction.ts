import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SceneManager } from './sceneObjects'
import { PrismData } from './lightPath'

export interface InteractionCallbacks {
  onPrismPlaced?: (position: THREE.Vector3, type: 'triangle' | 'pyramid') => void
  onPrismSelected?: (prism: PrismData | null) => void
  onPrismMoved?: (prism: PrismData) => void
  onLightSourceMoved?: (position: THREE.Vector3) => void
  onLightDirectionChanged?: (direction: THREE.Vector3) => void
  onParamsChanged?: () => void
}

export class InteractionManager {
  sceneManager: SceneManager
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  callbacks: InteractionCallbacks
  raycaster: THREE.Raycaster = new THREE.Raycaster()
  mouse: THREE.Vector2 = new THREE.Vector2()
  prismType: 'triangle' | 'pyramid' = 'triangle'
  isDragging: boolean = false
  dragTarget: 'lightEnd' | 'prism' | 'axisX' | 'axisY' | 'axisZ' | null = null
  dragStartPos: THREE.Vector3 = new THREE.Vector3()
  dragPrismStartPos: THREE.Vector3 = new THREE.Vector3()
  draggedPrism: PrismData | null = null
  downMouse: THREE.Vector2 = new THREE.Vector2()
  hasMoved: boolean = false
  sliderTimeouts: Map<string, number> = new Map()

  constructor(
    sceneManager: SceneManager,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    callbacks: InteractionCallbacks = {}
  ) {
    this.sceneManager = sceneManager
    this.camera = camera
    this.renderer = renderer
    this.callbacks = callbacks
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 5
    this.controls.maxDistance = 40
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.init()
  }

  private init() {
    this.setupCanvasEvents()
    this.setupControlPanel()
  }

  private setupCanvasEvents() {
    const canvas = this.renderer.domElement

    canvas.addEventListener('pointerdown', (e) => {
      this.onPointerDown(e)
    })
    canvas.addEventListener('pointermove', (e) => {
      this.onPointerMove(e)
    })
    canvas.addEventListener('pointerup', (e) => {
      this.onPointerUp(e)
    })
    canvas.addEventListener('pointerleave', (e) => {
      this.onPointerUp(e)
    })
  }

  private updateMouse(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  private onPointerDown(event: PointerEvent) {
    this.updateMouse(event)
    this.downMouse.copy(this.mouse)
    this.hasMoved = false
    this.raycaster.setFromCamera(this.mouse, this.camera)

    const lightEndHit = this.raycaster.intersectObject(this.sceneManager.lightBeamEnd)
    if (lightEndHit.length > 0) {
      this.dragTarget = 'lightEnd'
      this.controls.enabled = false
      this.dragStartPos.copy(this.sceneManager.lightBeamEnd.position)
      this.isDragging = true
      return
    }

    for (const prism of this.sceneManager.prisms) {
      const hit = this.raycaster.intersectObject(prism.mesh, true)
      if (hit.length > 0) {
        this.dragTarget = 'prism'
        this.draggedPrism = prism
        this.controls.enabled = false
        this.dragStartPos.copy(hit[0].point)
        this.dragPrismStartPos.copy(prism.position)
        this.isDragging = true
        return
      }
    }
  }

  private onPointerMove(event: PointerEvent) {
    this.updateMouse(event)

    if (Math.abs(this.mouse.x - this.downMouse.x) > 0.005 || Math.abs(this.mouse.y - this.downMouse.y) > 0.005) {
      this.hasMoved = true
    }

    if (this.isDragging && this.dragTarget) {
      this.handleDrag()
      return
    }

    this.raycaster.setFromCamera(this.mouse, this.camera)

    let hoveredPrism: PrismData | null = null
    for (const prism of this.sceneManager.prisms) {
      const hit = this.raycaster.intersectObject(prism.mesh, true)
      if (hit.length > 0) {
        hoveredPrism = prism
        break
      }
    }

    if (hoveredPrism !== this.sceneManager.hoverPrism) {
      this.sceneManager.setHoverPrism(hoveredPrism)
      this.renderer.domElement.style.cursor = hoveredPrism ? 'pointer' : 'default'
    }
  }

  private onPointerUp(event: PointerEvent) {
    this.updateMouse(event)

    if (!this.isDragging && !this.hasMoved) {
      this.handleClick()
    }

    if (this.isDragging && this.draggedPrism) {
      this.callbacks.onPrismMoved?.(this.draggedPrism)
    }

    this.isDragging = false
    this.dragTarget = null
    this.draggedPrism = null
    this.controls.enabled = true
  }

  private handleClick() {
    this.raycaster.setFromCamera(this.mouse, this.camera)

    for (const prism of this.sceneManager.prisms) {
      const hit = this.raycaster.intersectObject(prism.mesh, true)
      if (hit.length > 0) {
        const isAlreadySelected = this.sceneManager.selectedPrism === prism
        this.sceneManager.setSelectedPrism(isAlreadySelected ? null : prism)
        this.callbacks.onPrismSelected?.(this.sceneManager.selectedPrism)
        this.updateUIFromSelection()
        return
      }
    }

    const gridHit = this.raycaster.intersectObject(this.sceneManager.gridPlaneTarget)
    if (gridHit.length > 0) {
      const point = gridHit[0].point.clone()
      point.y = 0
      this.callbacks.onPrismPlaced?.(point, this.prismType)
    } else {
      this.sceneManager.setSelectedPrism(null)
      this.callbacks.onPrismSelected?.(null)
      this.updateUIFromSelection()
    }
  }

  private handleDrag() {
    if (!this.dragTarget) return

    if (this.dragTarget === 'lightEnd') {
      this.raycaster.setFromCamera(this.mouse, this.camera)
      const planeNormal = new THREE.Vector3(0, 1, 0)
      const planePoint = this.sceneManager.lightSource.position.clone()
      const denom = this.raycaster.ray.direction.dot(planeNormal)
      if (Math.abs(denom) > 1e-6) {
        const t = planePoint.clone().sub(this.raycaster.ray.origin).dot(planeNormal) / denom
        if (t > 0) {
          const hitPoint = this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(t))
          const direction = hitPoint.clone().sub(this.sceneManager.lightSource.position).normalize()
          this.sceneManager.updateLightBeam(this.sceneManager.lightSource.position, direction)
          this.callbacks.onLightDirectionChanged?.(direction)
          this.callbacks.onParamsChanged?.()
        }
      }
    } else if (this.dragTarget === 'prism' && this.draggedPrism) {
      this.raycaster.setFromCamera(this.mouse, this.camera)
      const planeNormal = new THREE.Vector3(0, 1, 0)
      const planePoint = this.dragPrismStartPos.clone()
      const denom = this.raycaster.ray.direction.dot(planeNormal)
      if (Math.abs(denom) > 1e-6) {
        const t = planePoint.clone().sub(this.raycaster.ray.origin).dot(planeNormal) / denom
        if (t > 0) {
          const hitPoint = this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(t))
          const delta = hitPoint.clone().sub(this.dragStartPos)
          this.draggedPrism.position.copy(this.dragPrismStartPos.clone().add(delta))
          this.draggedPrism.position.y = 0
          this.sceneManager.updatePrismTransform(this.draggedPrism)
          this.sceneManager.updateAxisHelperPosition(this.draggedPrism)
          this.callbacks.onParamsChanged?.()
        }
      }
    }
  }

  private updateUIFromSelection() {
    const prism = this.sceneManager.selectedPrism
    if (prism) {
      ;(document.getElementById('refraction-slider') as HTMLInputElement).value = prism.refractiveIndex.toString()
      ;(document.getElementById('refraction-value') as HTMLElement).textContent = prism.refractiveIndex.toFixed(2)
      ;(document.getElementById('rotation-slider') as HTMLInputElement).value = (prism.rotationY * 180 / Math.PI).toString()
      ;(document.getElementById('rotation-value') as HTMLElement).textContent = Math.round(prism.rotationY * 180 / Math.PI).toString()
      ;(document.getElementById('scale-slider') as HTMLInputElement).value = prism.scale.toString()
      ;(document.getElementById('scale-value') as HTMLElement).textContent = prism.scale.toFixed(1)
    }
  }

  private setupControlPanel() {
    this.setupSliderWithTooltip('refraction', (value) => {
      const prism = this.sceneManager.selectedPrism
      if (prism) {
        this.sceneManager.setPrismRefractiveIndex(prism, value)
        this.callbacks.onParamsChanged?.()
      }
    }, (v) => v.toFixed(2))

    this.setupSliderWithTooltip('rotation', (value) => {
      const prism = this.sceneManager.selectedPrism
      if (prism) {
        prism.rotationY = value * Math.PI / 180
        this.sceneManager.updatePrismTransform(prism)
        this.callbacks.onParamsChanged?.()
      }
    }, (v) => Math.round(v).toString() + '°')

    this.setupSliderWithTooltip('scale', (value) => {
      const prism = this.sceneManager.selectedPrism
      if (prism) {
        prism.scale = value
        this.sceneManager.updatePrismTransform(prism)
        this.sceneManager.updateAxisHelperPosition(prism)
        this.callbacks.onParamsChanged?.()
      }
    }, (v) => v.toFixed(1))

    this.setupSliderWithTooltip('intensity', (value) => {
      this.sceneManager.setLightIntensity(value)
    }, (v) => v.toFixed(1))

    document.getElementById('type-triangle')?.addEventListener('click', () => {
      this.prismType = 'triangle'
      ;(document.getElementById('type-triangle') as HTMLElement).classList.add('active')
      ;(document.getElementById('type-pyramid') as HTMLElement).classList.remove('active')
    })

    document.getElementById('type-pyramid')?.addEventListener('click', () => {
      this.prismType = 'pyramid'
      ;(document.getElementById('type-pyramid') as HTMLElement).classList.add('active')
      ;(document.getElementById('type-triangle') as HTMLElement).classList.remove('active')
    })

    ;(document.getElementById('show-spectrum') as HTMLInputElement)?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked
      this.sceneManager.setSpectrumVisible(checked)
      this.callbacks.onParamsChanged?.()
    })

    document.getElementById('collapse-btn')?.addEventListener('click', () => {
      document.getElementById('control-panel')?.classList.add('collapsed')
    })

    document.querySelector('.expand-btn')?.addEventListener('click', () => {
      document.getElementById('control-panel')?.classList.remove('collapsed')
    })
  }

  private setupSliderWithTooltip(
    id: string,
    onChange: (value: number) => void,
    formatValue: (v: number) => string
  ) {
    const slider = document.getElementById(`${id}-slider`) as HTMLInputElement
    const tooltip = document.getElementById(`${id}-tooltip`) as HTMLElement
    const valueDisplay = document.getElementById(`${id}-value`) as HTMLElement

    if (!slider || !tooltip) return

    const updateTooltipPosition = () => {
      const min = parseFloat(slider.min)
      const max = parseFloat(slider.max)
      const val = parseFloat(slider.value)
      const percent = (val - min) / (max - min)
      const sliderWidth = slider.offsetWidth
      const thumbPos = percent * sliderWidth
      tooltip.style.left = `${thumbPos}px`
      tooltip.textContent = formatValue(val)
    }

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value)
      if (valueDisplay) valueDisplay.textContent = formatValue(value)
      updateTooltipPosition()
      tooltip.classList.add('visible')
      onChange(value)
    })

    slider.addEventListener('mousedown', () => {
      updateTooltipPosition()
      tooltip.classList.add('visible')
    })

    slider.addEventListener('mouseup', () => {
      setTimeout(() => tooltip.classList.remove('visible'), 500)
    })

    slider.addEventListener('mouseleave', () => {
      setTimeout(() => tooltip.classList.remove('visible'), 300)
    })

    slider.addEventListener('touchstart', () => {
      updateTooltipPosition()
      tooltip.classList.add('visible')
    })

    slider.addEventListener('touchend', () => {
      setTimeout(() => tooltip.classList.remove('visible'), 500)
    })
  }

  setResetHandler(handler: () => void) {
    document.getElementById('reset-btn')?.addEventListener('click', handler)
  }

  update() {
    this.controls.update()
  }
}
