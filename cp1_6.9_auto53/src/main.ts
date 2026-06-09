import * as THREE from 'three'
import { HoloElement, ElementType, GeometryType } from './elements'
import { UI } from './ui'

class OrbitControls {
  camera: THREE.PerspectiveCamera
  domElement: HTMLElement
  target: THREE.Vector3
  theta = Math.PI / 4
  phi = Math.PI / 3
  distance = 12
  minDistance = 6
  maxDistance = 36
  minPhi = THREE.MathUtils.degToRad(30)
  maxPhi = THREE.MathUtils.degToRad(120)
  isDragging = false
  private prevX = 0
  private prevY = 0
  private onUpdateCallback?: () => void

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement
    this.target = new THREE.Vector3(0, 1.5, 0)
    this._bindEvents()
    this.update()
  }

  onUpdate(cb: () => void) {
    this.onUpdateCallback = cb
  }

  private _bindEvents() {
    this.domElement.addEventListener('mousedown', this._onMouseDown)
    this.domElement.addEventListener('wheel', this._onWheel, { passive: false })
    window.addEventListener('mousemove', this._onMouseMove)
    window.addEventListener('mouseup', this._onMouseUp)
  }

  dispose() {
    this.domElement.removeEventListener('mousedown', this._onMouseDown)
    this.domElement.removeEventListener('wheel', this._onWheel)
    window.removeEventListener('mousemove', this._onMouseMove)
    window.removeEventListener('mouseup', this._onMouseUp)
  }

  private _onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.control-panel, .global-bar, .element-controls-wrap, .download-modal')) return
    this.isDragging = true
    this.prevX = e.clientX
    this.prevY = e.clientY
  }

  private _onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return
    const dx = e.clientX - this.prevX
    const dy = e.clientY - this.prevY
    this.prevX = e.clientX
    this.prevY = e.clientY
    this.theta -= dx * 0.005
    this.phi -= dy * 0.005
    this.phi = THREE.MathUtils.clamp(this.phi, this.minPhi, this.maxPhi)
    this.theta = ((this.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    this.update()
  }

  private _onMouseUp = () => {
    this.isDragging = false
  }

  private _onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const scale = e.deltaY > 0 ? 1.1 : 0.9
    this.distance = THREE.MathUtils.clamp(this.distance * scale, this.minDistance, this.maxDistance)
    this.update()
  }

  update() {
    const x = this.distance * Math.sin(this.phi) * Math.sin(this.theta)
    const y = this.distance * Math.cos(this.phi)
    const z = this.distance * Math.sin(this.phi) * Math.cos(this.theta)
    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    )
    this.camera.lookAt(this.target)
    if (this.onUpdateCallback) this.onUpdateCallback()
  }
}

class Stage {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  canvas: HTMLCanvasElement
  controls: OrbitControls
  clock = new THREE.Clock()
  elements: Map<string, HoloElement> = new Map()
  ui: UI
  stageRings: THREE.Mesh[] = []
  stars: THREE.Points | null = null
  starOpacities: Float32Array | null = null
  private _draggingElement: HoloElement | null = null
  private _raycaster = new THREE.Raycaster()
  private _mouse = new THREE.Vector2()
  private _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private _recording = false
  private _recordedChunks: ImageData[] = []
  private _recordStartTime = 0
  private _recordDuration = 10
  private _recordFps = 15
  private _offscreenCanvas: HTMLCanvasElement | null = null
  private _offscreenCtx: CanvasRenderingContext2D | null = null

  constructor() {
    this.canvas = document.getElementById('stage') as HTMLCanvasElement
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    this.controls = new OrbitControls(this.camera, this.canvas)

    this.ui = new UI({
      onAddElement: this._onAddElement,
      onToggleRotate: () => {},
      onDeleteElement: this._onDeleteElement,
      onChangeColor: this._onChangeColor,
      onRecord: this._onRecord,
      onReset: this._onReset,
    })

    this._createStage()
    this._createStars()
    this._bindDragEvents()
    window.addEventListener('resize', this._onResize)

    this._animate()
  }

  private _createStage() {
    const platformGeo = new THREE.CircleGeometry(3, 64)
    const platformMat = new THREE.MeshBasicMaterial({
      color: 0x00bfff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    })
    const platform = new THREE.Mesh(platformGeo, platformMat)
    platform.rotation.x = -Math.PI / 2
    platform.position.y = 0.01
    this.scene.add(platform)

    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(0.1, 0.15, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00bfff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.02 + i * 0.005
      ring.userData.phase = (i / 3) * Math.PI * 2
      this.stageRings.push(ring)
      this.scene.add(ring)
    }

    const edgeGeo = new THREE.RingGeometry(2.95, 3.05, 64)
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x00bfff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    })
    const edge = new THREE.Mesh(edgeGeo, edgeMat)
    edge.rotation.x = -Math.PI / 2
    edge.position.y = 0.03
    this.scene.add(edge)
  }

  private _createStars() {
    const count = 100
    const positions = new Float32Array(count * 3)
    this.starOpacities = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = 50 + Math.random() * 30
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 0.8 + 0.1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      this.starOpacities[i] = 0.3 + Math.random() * 0.7
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      size: 0.3,
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    })
    this.stars = new THREE.Points(geometry, material)
    this.scene.add(this.stars)
  }

  private _bindDragEvents() {
    this.canvas.addEventListener('mousedown', this._onCanvasMouseDown)
    this.canvas.addEventListener('mousemove', this._onCanvasMouseMove)
    window.addEventListener('mouseup', this._onCanvasMouseUp)
  }

  private _onCanvasMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.control-panel, .global-bar, .element-controls-wrap, .download-modal')) return

    const rect = this.canvas.getBoundingClientRect()
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    this._raycaster.setFromCamera(this._mouse, this.camera)
    const intersects: THREE.Intersection[] = []
    this.elements.forEach((el) => {
      const hits = this._raycaster.intersectObject(el.group, true)
      if (hits.length > 0) {
        intersects.push(...hits.map((h) => ({ ...h, object: el.group })))
      }
    })

    if (intersects.length > 0) {
      const hitGroup = intersects[0].object
      let found: HoloElement | null = null
      this.elements.forEach((el) => {
        if (el.group === hitGroup) found = el
      })
      if (found) {
        const el: HoloElement = found
        this._draggingElement = el
        el.startDrag()
        this.controls.isDragging = false
      }
    }
  }

  private _onCanvasMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    if (this._draggingElement) {
      this._raycaster.setFromCamera(this._mouse, this.camera)
      const intersection = new THREE.Vector3()
      this._plane.constant = -this._draggingElement.position.y
      this._raycaster.ray.intersectPlane(this._plane, intersection)
      if (intersection) {
        this._draggingElement.setDragTarget(intersection)
      }
    }
  }

  private _onCanvasMouseUp = () => {
    if (this._draggingElement) {
      this._draggingElement.endDrag()
      this._draggingElement = null
    }
  }

  private _onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private _onAddElement = (type: ElementType, options?: { geometryType?: GeometryType; text?: string }) => {
    const element = new HoloElement({
      type,
      geometryType: options?.geometryType,
      text: options?.text,
    })
    this.elements.set(element.id, element)
    this.scene.add(element.group)
    element.startEnterAnimation()
    this.ui.addElementControls(element)
  }

  private _onDeleteElement = (id: string) => {
    const element = this.elements.get(id)
    if (!element) return
    element.startExitAnimation()
    setTimeout(() => {
      this.scene.remove(element.group)
      this.elements.delete(id)
      this.ui.removeElementControls(id)
      element.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => m.dispose())
        }
      })
    }, 400)
  }

  private _onChangeColor = (id: string, colorStr: string) => {
    const element = this.elements.get(id)
    if (!element) return
    const color = new THREE.Color(colorStr)
    element.setColor(color.getHex())
  }

  private _onRecord = () => {
    if (this._recording) return
    this._recording = true
    this.ui.setRecording(true)
    this._recordedChunks = []
    this._recordStartTime = this.clock.getElapsedTime()

    if (!this._offscreenCanvas) {
      this._offscreenCanvas = document.createElement('canvas')
      this._offscreenCanvas.width = 800
      this._offscreenCanvas.height = 600
      this._offscreenCtx = this._offscreenCanvas.getContext('2d')!
    }
  }

  private _stopRecording() {
    this._recording = false
    this.ui.setRecording(false)
    this._exportGif()
  }

  private _captureFrame() {
    if (!this._offscreenCtx || !this._offscreenCanvas) return
    this._offscreenCtx.drawImage(
      this.canvas,
      0, 0, this.canvas.width, this.canvas.height,
      0, 0, this._offscreenCanvas.width, this._offscreenCanvas.height
    )
    const frame = this._offscreenCtx.getImageData(0, 0, this._offscreenCanvas.width, this._offscreenCanvas.height)
    this._recordedChunks.push(frame)
  }

  private _exportGif() {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    const ctx = canvas.getContext('2d')!

    const maxFrames = this._recordDuration * this._recordFps
    const frames = this._recordedChunks.slice(0, maxFrames)
    const palette = this._buildPalette(frames)

    const gif = this._buildGif(800, 600, frames, palette, Math.round(1000 / this._recordFps))
    const blob = new Blob([gif], { type: 'image/gif' })
    const url = URL.createObjectURL(blob)
    this.ui.showDownloadModal(url)
  }

  private _buildPalette(frames: ImageData[]): number[] {
    const colorSet = new Set<number>()
    for (const frame of frames) {
      for (let i = 0; i < frame.data.length; i += 4) {
        const r = frame.data[i] >> 5 << 5
        const g = frame.data[i + 1] >> 5 << 5
        const b = frame.data[i + 2] >> 5 << 5
        colorSet.add((r << 16) | (g << 8) | b)
      }
    }
    let palette = Array.from(colorSet)
    if (palette.length > 256) {
      palette = palette.slice(0, 256)
    }
    while (palette.length < 256) palette.push(0)
    return palette
  }

  private _nearestColor(r: number, g: number, b: number, palette: number[]): number {
    let minDist = Infinity
    let idx = 0
    for (let i = 0; i < palette.length; i++) {
      const pr = (palette[i] >> 16) & 0xff
      const pg = (palette[i] >> 8) & 0xff
      const pb = palette[i] & 0xff
      const dr = r - pr, dg = g - pg, db = b - pb
      const d = dr * dr + dg * dg + db * db
      if (d < minDist) {
        minDist = d
        idx = i
      }
    }
    return idx
  }

  private _buildGif(width: number, height: number, frames: ImageData[], palette: number[], delay: number): Uint8Array {
    const parts: Uint8Array[] = []

    const header = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    parts.push(header)

    const lsd = new Uint8Array(7)
    lsd[0] = width & 0xff
    lsd[1] = (width >> 8) & 0xff
    lsd[2] = height & 0xff
    lsd[3] = (height >> 8) & 0xff
    lsd[4] = 0xf7
    lsd[5] = 0
    lsd[6] = 0
    parts.push(lsd)

    const gct = new Uint8Array(256 * 3)
    for (let i = 0; i < 256; i++) {
      gct[i * 3] = (palette[i] >> 16) & 0xff
      gct[i * 3 + 1] = (palette[i] >> 8) & 0xff
      gct[i * 3 + 2] = palette[i] & 0xff
    }
    parts.push(gct)

    const netscapeExt = new Uint8Array([0x21, 0xff, 0x0b, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, 0x03, 0x01, 0x00, 0x00, 0x00])
    parts.push(netscapeExt)

    for (const frame of frames) {
      const gce = new Uint8Array([0x21, 0xf9, 0x04, 0x09, (delay & 0xff), ((delay >> 8) & 0xff), 0x00, 0x00])
      parts.push(gce)

      const imgData = this._quantizeImage(frame, width, height, palette)
      const compressed = this._lzwCompress(imgData, 8)

      const id = new Uint8Array(10)
      id[0] = 0x2c
      id[1] = 0
      id[2] = 0
      id[3] = 0
      id[4] = 0
      id[5] = width & 0xff
      id[6] = (width >> 8) & 0xff
      id[7] = height & 0xff
      id[8] = (height >> 8) & 0xff
      id[9] = 0
      parts.push(id)

      parts.push(new Uint8Array([8]))
      parts.push(compressed)
      parts.push(new Uint8Array([0x00]))
    }

    parts.push(new Uint8Array([0x3b]))

    let totalLen = 0
    for (const p of parts) totalLen += p.length
    const result = new Uint8Array(totalLen)
    let offset = 0
    for (const p of parts) {
      result.set(p, offset)
      offset += p.length
    }
    return result
  }

  private _quantizeImage(frame: ImageData, width: number, height: number, palette: number[]): Uint8Array {
    const out = new Uint8Array(width * height)
    for (let i = 0, j = 0; i < frame.data.length; i += 4, j++) {
      out[j] = this._nearestColor(
        frame.data[i] >> 5 << 5,
        frame.data[i + 1] >> 5 << 5,
        frame.data[i + 2] >> 5 << 5,
        palette
      )
    }
    return out
  }

  private _lzwCompress(indices: Uint8Array, minCodeSize: number): Uint8Array {
    const result: number[] = []
    const clearCode = 1 << minCodeSize
    const eoiCode = clearCode + 1
    let codeSize = minCodeSize + 1
    let nextCode = eoiCode + 1
    const dict: Map<string, number> = new Map()
    for (let i = 0; i < clearCode; i++) dict.set(String.fromCharCode(i), i)

    let bitBuffer = 0
    let bitCount = 0

    const writeCode = (code: number) => {
      bitBuffer |= code << bitCount
      bitCount += codeSize
      while (bitCount >= 8) {
        result.push(bitBuffer & 0xff)
        bitBuffer >>= 8
        bitCount -= 8
      }
    }

    writeCode(clearCode)
    let w = String.fromCharCode(indices[0])
    for (let i = 1; i < indices.length; i++) {
      const c = String.fromCharCode(indices[i])
      const wc = w + c
      if (dict.has(wc)) {
        w = wc
      } else {
        writeCode(dict.get(w)!)
        if (nextCode < 4096) {
          dict.set(wc, nextCode++)
          if (nextCode === 1 << codeSize && codeSize < 12) codeSize++
        } else {
          writeCode(clearCode)
          dict.clear()
          for (let j = 0; j < clearCode; j++) dict.set(String.fromCharCode(j), j)
          codeSize = minCodeSize + 1
          nextCode = eoiCode + 1
        }
        w = c
      }
    }
    writeCode(dict.get(w)!)
    writeCode(eoiCode)
    if (bitCount > 0) result.push(bitBuffer & 0xff)

    const blocks: number[] = []
    for (let i = 0; i < result.length; i += 255) {
      const chunk = result.slice(i, i + 255)
      blocks.push(chunk.length)
      blocks.push(...chunk)
    }
    return new Uint8Array(blocks)
  }

  private _onReset = () => {
    this.elements.forEach((el) => {
      this.scene.remove(el.group)
      this.ui.removeElementControls(el.id)
    })
    this.elements.clear()
    this.ui.flashStage()
  }

  private _updateElementUIPositions() {
    this.ui.hideAllElementControls()
    this.elements.forEach((el) => {
      const pos = el.group.position.clone()
      pos.y += 2
      pos.project(this.camera)
      const x = (pos.x * 0.5 + 0.5) * window.innerWidth
      const y = (-pos.y * 0.5 + 0.5) * window.innerHeight
      if (pos.z < 1) {
        this.ui.updateElementControlPosition(el.id, x, y)
      }
    })
  }

  private _lastFrameTime = 0

  private _animate = () => {
    requestAnimationFrame(this._animate)
    const delta = this.clock.getDelta()
    const elapsed = this.clock.getElapsedTime()

    this.stageRings.forEach((ring) => {
      const phase = ring.userData.phase as number
      const t = ((elapsed / 2 + phase) % 1)
      ring.scale.setScalar(1 + t * 2.5)
      const mat = ring.material as THREE.MeshBasicMaterial
      mat.opacity = (1 - t) * 0.6
    })

    if (this.stars && this.starOpacities) {
      const mat = this.stars.material as THREE.PointsMaterial
      const positions = this.stars.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < this.starOpacities.length; i++) {
        this.starOpacities[i] = 0.3 + (Math.sin(elapsed * 0.5 + i * 0.3) * 0.5 + 0.5) * 0.7
        positions.setY(i, positions.getY(i) + Math.sin(elapsed + i) * 0.001)
      }
      positions.needsUpdate = true
      mat.opacity = 1
    }

    this.elements.forEach((el) => el.update(delta, elapsed))

    this.renderer.render(this.scene, this.camera)
    this._updateElementUIPositions()

    if (this._recording) {
      const frameInterval = 1 / this._recordFps
      if (elapsed - this._lastFrameTime >= frameInterval) {
        this._captureFrame()
        this._lastFrameTime = elapsed
      }
      if (elapsed - this._recordStartTime >= this._recordDuration) {
        this._stopRecording()
      }
    }
  }
}

new Stage()
