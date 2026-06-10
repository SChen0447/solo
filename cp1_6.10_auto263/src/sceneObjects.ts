import * as THREE from 'three'
import { PrismData, LightPathResult, SPECTRUM_COLORS } from './lightPath'

export class SceneManager {
  scene: THREE.Scene
  prisms: PrismData[] = []
  lightSource!: THREE.Mesh
  lightGlow!: THREE.Sprite
  lightBeam!: THREE.Mesh
  lightBeamEnd!: THREE.Mesh
  gridPlane!: THREE.GridHelper
  gridPlaneTarget!: THREE.Mesh
  stars!: THREE.Points
  spectrumTubes: Map<string, THREE.Mesh> = new Map()
  spectrumGlows: Map<string, THREE.Sprite> = new Map()
  spectrumVisible: boolean = true
  lightIntensity: number = 1.0
  hoverPrism: PrismData | null = null
  selectedPrism: PrismData | null = null
  axisHelper: THREE.Group | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.init()
  }

  private init() {
    this.createBackground()
    this.createStars()
    this.createGrid()
  }

  private createBackground() {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 300)
    gradient.addColorStop(0, '#1a1a3d')
    gradient.addColorStop(1, '#0a0e27')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    const texture = new THREE.CanvasTexture(canvas)
    this.scene.background = texture
  }

  private createStars() {
    const geometry = new THREE.BufferGeometry()
    const positions: number[] = []
    const alphas: number[] = []

    for (let i = 0; i < 200; i++) {
      const radius = 40 + Math.random() * 30
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      positions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) + 10,
        radius * Math.sin(phi) * Math.sin(theta)
      )
      alphas.push(0.2 + Math.random() * 0.7)
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1))

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false
    })

    this.stars = new THREE.Points(geometry, material)
    this.scene.add(this.stars)
  }

  private createGrid() {
    this.gridPlane = new THREE.GridHelper(40, 40, 0x6496ff, 0x6496ff)
    const gridMat = this.gridPlane.material as THREE.Material
    gridMat.opacity = 0.2
    gridMat.transparent = true
    this.scene.add(this.gridPlane)

    const planeGeo = new THREE.PlaneGeometry(40, 40)
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    })
    this.gridPlaneTarget = new THREE.Mesh(planeGeo, planeMat)
    this.gridPlaneTarget.rotation.x = -Math.PI / 2
    this.gridPlaneTarget.position.y = 0.001
    this.scene.add(this.gridPlaneTarget)
  }

  private createGlowSprite(color: number, size: number, opacity: number = 0.8): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    const r = (color >> 16) & 255
    const g = (color >> 8) & 255
    const b = color & 255
    gradient.addColorStop(0, `rgba(${r},${g},${b},${opacity})`)
    gradient.addColorStop(0.4, `rgba(${r},${g},${b},${opacity * 0.5})`)
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(size, size, 1)
    return sprite
  }

  createLightSource(position: THREE.Vector3) {
    if (this.lightSource) {
      this.scene.remove(this.lightSource)
    }
    if (this.lightGlow) {
      this.scene.remove(this.lightGlow)
    }
    if (this.lightBeam) {
      this.scene.remove(this.lightBeam)
    }
    if (this.lightBeamEnd) {
      this.scene.remove(this.lightBeamEnd)
    }

    const sourceGeo = new THREE.SphereGeometry(0.3, 32, 32)
    const sourceMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    })
    this.lightSource = new THREE.Mesh(sourceGeo, sourceMat)
    this.lightSource.position.copy(position)
    this.scene.add(this.lightSource)

    this.lightGlow = this.createGlowSprite(0xffffff, 2.0, 0.9)
    this.lightGlow.position.copy(position)
    this.scene.add(this.lightGlow)

    this.updateLightBeam(position, new THREE.Vector3(1, 0, 0))
  }

  updateLightBeam(sourcePos: THREE.Vector3, direction: THREE.Vector3) {
    if (this.lightBeam) {
      this.scene.remove(this.lightBeam)
    }
    if (this.lightBeamEnd) {
      this.scene.remove(this.lightBeamEnd)
    }

    const dir = direction.clone().normalize()
    const beamLength = 5
    const radius = 0.05 * this.lightIntensity

    const beamGeo = new THREE.CylinderGeometry(radius, radius, beamLength, 12)
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    })
    this.lightBeam = new THREE.Mesh(beamGeo, beamMat)

    const endPos = sourcePos.clone().add(dir.multiplyScalar(beamLength))
    const midPos = sourcePos.clone().add(endPos).multiplyScalar(0.5)
    this.lightBeam.position.copy(midPos)
    this.lightBeam.lookAt(endPos)
    this.lightBeam.rotateX(Math.PI / 2)
    this.scene.add(this.lightBeam)

    const endGeo = new THREE.SphereGeometry(0.15, 16, 16)
    const endMat = new THREE.MeshBasicMaterial({
      color: 0xffffaa
    })
    this.lightBeamEnd = new THREE.Mesh(endGeo, endMat)
    this.lightBeamEnd.position.copy(endPos)
    this.scene.add(this.lightBeamEnd)
  }

  createPrism(
    type: 'triangle' | 'pyramid',
    position: THREE.Vector3,
    refractiveIndex: number = 1.5
  ): PrismData {
    let geometry: THREE.BufferGeometry
    let h: number

    if (type === 'triangle') {
      const s = 2
      h = Math.sqrt(3) * s
      const thickness = 0.5
      const shape = new THREE.Shape()
      shape.moveTo(-s, 0)
      shape.lineTo(s, 0)
      shape.lineTo(0, h)
      shape.lineTo(-s, 0)

      const extrudeSettings = {
        depth: thickness * 2,
        bevelEnabled: false
      }
      geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      geometry.translate(0, 0, -thickness)
    } else {
      const s = 1.5
      h = s * 1.2
      geometry = new THREE.ConeGeometry(s, h, 3, 1)
      geometry.translate(0, h / 2, 0)
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.9,
      ior: refractiveIndex,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)

    const edges = new THREE.EdgesGeometry(geometry)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x6699ff,
      transparent: true,
      opacity: 0.4
    })
    const wireframe = new THREE.LineSegments(edges, lineMat)
    mesh.add(wireframe)
    ;(mesh as any).userData.wireframe = wireframe
    ;(mesh as any).userData.wireframeMaterial = lineMat

    this.scene.add(mesh)

    const prism: PrismData = {
      position: position.clone(),
      rotationY: 0,
      scale: 1.0,
      type,
      refractiveIndex,
      mesh
    }

    this.prisms.push(prism)
    return prism
  }

  updatePrismTransform(prism: PrismData) {
    prism.mesh.position.copy(prism.position)
    prism.mesh.rotation.y = prism.rotationY
    prism.mesh.scale.setScalar(prism.scale)
  }

  setPrismRefractiveIndex(prism: PrismData, index: number) {
    prism.refractiveIndex = index
    const mat = prism.mesh.material as THREE.MeshPhysicalMaterial
    mat.ior = index
  }

  setHoverPrism(prism: PrismData | null) {
    if (this.hoverPrism && this.hoverPrism !== this.selectedPrism) {
      const wireframeMat = (this.hoverPrism.mesh as any).userData.wireframeMaterial as THREE.LineBasicMaterial
      wireframeMat.color.setHex(0x6699ff)
      wireframeMat.opacity = 0.4
    }
    this.hoverPrism = prism
    if (prism && prism !== this.selectedPrism) {
      const wireframeMat = (prism.mesh as any).userData.wireframeMaterial as THREE.LineBasicMaterial
      wireframeMat.color.setHex(0xffffff)
      wireframeMat.opacity = 0.3
    }
  }

  setSelectedPrism(prism: PrismData | null) {
    if (this.selectedPrism) {
      const wireframeMat = (this.selectedPrism.mesh as any).userData.wireframeMaterial as THREE.LineBasicMaterial
      wireframeMat.color.setHex(0x6699ff)
      wireframeMat.opacity = 0.4
    }
    if (this.axisHelper) {
      this.scene.remove(this.axisHelper)
      this.axisHelper = null
    }

    this.selectedPrism = prism

    if (prism) {
      const wireframeMat = (prism.mesh as any).userData.wireframeMaterial as THREE.LineBasicMaterial
      wireframeMat.color.setHex(0x00ffff)
      wireframeMat.opacity = 0.8
      this.createAxisHelper(prism)
    }
  }

  private createAxisHelper(prism: PrismData) {
    this.axisHelper = new THREE.Group()
    const axisLength = 0.8

    const xArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0xff0000,
      0.15,
      0.08
    )
    const yArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0x00ff00,
      0.15,
      0.08
    )
    const zArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0x0066ff,
      0.15,
      0.08
    )

    this.axisHelper.add(xArrow, yArrow, zArrow)
    this.axisHelper.position.copy(prism.position)
    this.axisHelper.position.y += prism.type === 'triangle' ? Math.sqrt(3) * 2 + 0.3 : 1.5 * 1.2 + 0.3
    this.scene.add(this.axisHelper)
  }

  updateAxisHelperPosition(prism: PrismData) {
    if (this.axisHelper) {
      this.axisHelper.position.copy(prism.position)
      this.axisHelper.position.y += prism.type === 'triangle' ? Math.sqrt(3) * 2 * prism.scale + 0.3 : 1.5 * 1.2 * prism.scale + 0.3
    }
  }

  updateSpectrum(paths: LightPathResult[]) {
    this.clearSpectrum()

    if (!this.spectrumVisible) return

    for (const path of paths) {
      if (path.points.length < 2) continue

      const curve = new THREE.CatmullRomCurve3(path.points)
      const tubeGeo = new THREE.TubeGeometry(curve, Math.max(path.points.length * 4, 16), 0.08, 8, false)

      const colors: number[] = []
      const baseColor = new THREE.Color(path.color.color)
      for (let i = 0; i < tubeGeo.attributes.position.count; i++) {
        const t = i / tubeGeo.attributes.position.count
        const color = baseColor.clone().lerp(new THREE.Color(0xffffff), t * 0.5)
        colors.push(color.r, color.g, color.b)
      }
      tubeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

      const tubeMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      this.scene.add(tube)
      this.spectrumTubes.set(path.color.name, tube)

      const endPoint = path.points[path.points.length - 1]
      const glow = this.createGlowSprite(path.color.color, 0.8, 0.7)
      glow.position.copy(endPoint)
      this.scene.add(glow)
      this.spectrumGlows.set(path.color.name, glow)
    }
  }

  clearSpectrum() {
    for (const tube of this.spectrumTubes.values()) {
      this.scene.remove(tube)
      tube.geometry.dispose()
      ;(tube.material as THREE.Material).dispose()
    }
    this.spectrumTubes.clear()

    for (const glow of this.spectrumGlows.values()) {
      this.scene.remove(glow)
      ;(glow.material as THREE.Material).dispose()
    }
    this.spectrumGlows.clear()
  }

  setSpectrumVisible(visible: boolean) {
    this.spectrumVisible = visible
    if (!visible) {
      this.clearSpectrum()
    }
  }

  setLightIntensity(intensity: number) {
    this.lightIntensity = intensity
    if (this.lightBeam) {
      this.lightBeam.scale.x = intensity
      this.lightBeam.scale.z = intensity
    }
    if (this.lightGlow) {
      this.lightGlow.scale.set(2.0 * intensity, 2.0 * intensity, 1)
    }
  }

  removePrism(prism: PrismData) {
    const index = this.prisms.indexOf(prism)
    if (index > -1) {
      this.prisms.splice(index, 1)
    }
    this.scene.remove(prism.mesh)
    prism.mesh.geometry.dispose()
    ;(prism.mesh.material as THREE.Material).dispose()

    if (this.selectedPrism === prism) {
      this.setSelectedPrism(null)
    }
    if (this.hoverPrism === prism) {
      this.setHoverPrism(null)
    }
  }

  clearAllPrisms() {
    for (const prism of [...this.prisms]) {
      this.removePrism(prism)
    }
  }

  animateStars(time: number) {
    if (this.stars) {
      const alphas = this.stars.geometry.attributes.alpha as THREE.BufferAttribute
      for (let i = 0; i < alphas.count; i++) {
        const baseAlpha = (alphas as any).userData?.baseAlpha?.[i] ?? (alphas.array as Float32Array)[i]
        if (!(alphas as any).userData) {
          (alphas as any).userData = { baseAlpha: new Float32Array(alphas.array as Float32Array) }
        }
        const flicker = 0.7 + 0.3 * Math.sin(time * 0.002 + i * 0.5)
        ;(alphas.array as Float32Array)[i] = baseAlpha * flicker
      }
      alphas.needsUpdate = true
    }
  }
}
