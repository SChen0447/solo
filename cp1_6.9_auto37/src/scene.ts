import * as THREE from 'three'

export interface IslandData {
  id: string
  name: string
  shape: 'dome' | 'peak' | 'platform'
  color: string
  size: number
  position: { x: number; y: number; z: number }
}

export interface RouteData {
  id: string
  fromId: string
  toId: string
}

export interface SceneEvents {
  onIslandClick?: (id: string | null) => void
  onEmptyClick?: (position: THREE.Vector3) => void
  onRouteCreate?: (fromId: string, toId: string) => void
  onRouteClick?: (routeId: string) => void
  onIslandHover?: (id: string | null) => void
}

interface IslandObject {
  data: IslandData
  group: THREE.Group
  base: THREE.Mesh
  halo?: THREE.Mesh
  heart: THREE.Mesh
  heartBaseY: number
  rocks: THREE.Mesh[]
  trees: THREE.Group[]
  originalScale: number
  isSelected: boolean
  isHovered: boolean
}

interface RouteObject {
  data: RouteData
  line: THREE.Line
  flowPoints: THREE.Points
  midButton?: THREE.Mesh
}

interface ResourcePacket {
  mesh: THREE.Mesh
  fromIsland: string
  toIsland: string
  startTime: number
  duration: number
  color: THREE.Color
  trail: THREE.Points
  trailPositions: Float32Array
}

interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  startTime: number
  duration: number
}

export class SkyScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private container: HTMLElement
  private islands: Map<string, IslandObject> = new Map()
  private routes: Map<string, RouteObject> = new Map()
  private resourcePackets: ResourcePacket[] = []
  private particles: Particle[] = []
  private events: SceneEvents

  private isDragging = false
  private previousMouse = { x: 0, y: 0 }
  private cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 3 }
  private cameraDistance = 30
  private cameraTarget = new THREE.Vector3(0, 0, 0)

  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()

  private routeDragActive = false
  private routeStartIsland: string | null = null
  private routePreviewLine: THREE.Line | null = null

  private locatorRing: THREE.Mesh

  private clock = new THREE.Clock()
  private animationFrameId: number = 0

  constructor(container: HTMLElement, events: SceneEvents = {}) {
    this.container = container
    this.events = events

    this.scene = new THREE.Scene()
    this.scene.background = this.createSkyGradient()
    this.scene.fog = new THREE.Fog(0x87ceeb, 40, 80)

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    )
    this.updateCameraPosition()

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.addLights()
    this.createClouds()

    this.locatorRing = this.createLocatorRing()
    this.locatorRing.visible = false
    this.scene.add(this.locatorRing)

    this.setupEventListeners()
    this.animate()
  }

  private createSkyGradient(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#87ceeb')
    gradient.addColorStop(1, '#e0f7fa')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 256)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 0.9)
    directional.position.set(10, 20, 10)
    directional.castShadow = true
    directional.shadow.mapSize.width = 1024
    directional.shadow.mapSize.height = 1024
    this.scene.add(directional)

    const fill = new THREE.DirectionalLight(0x87ceeb, 0.3)
    fill.position.set(-5, 5, -5)
    this.scene.add(fill)
  }

  private createClouds(): void {
    for (let i = 0; i < 10; i++) {
      const size = 3 + Math.random() * 5
      const geometry = new THREE.CircleGeometry(size, 16)
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().lerpColors(
          new THREE.Color(0xffffff),
          new THREE.Color(0xf0f0f0),
          Math.random()
        ),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      })
      const cloud = new THREE.Mesh(geometry, material)
      cloud.rotation.x = -Math.PI / 2
      cloud.position.set(
        (Math.random() - 0.5) * 60,
        -8 - Math.random() * 3,
        (Math.random() - 0.5) * 60
      )
      this.scene.add(cloud)
    }
  }

  private createLocatorRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(0.2, 0.5, 32)
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(geometry, material)
    ring.rotation.x = -Math.PI / 2
    return ring
  }

  private createIslandGeometry(shape: string, size: number): THREE.BufferGeometry {
    switch (shape) {
      case 'peak':
        return new THREE.ConeGeometry(size, size * 1.5, 8)
      case 'platform':
        return new THREE.CylinderGeometry(size * 1.2, size * 0.8, size * 0.6, 16)
      case 'dome':
      default:
        return new THREE.SphereGeometry(size, 32, 32)
    }
  }

  private createGrassTexture(baseColor: THREE.Color): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#' + baseColor.getHexString()
    ctx.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 128
      const y = Math.random() * 128
      const green = 100 + Math.random() * 100
      ctx.fillStyle = `rgba(${Math.random() * 50}, ${green}, ${Math.random() * 50}, 0.5)`
      ctx.fillRect(x, y, 2, 2)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }

  public addIsland(data: IslandData): void {
    const group = new THREE.Group()

    const baseColor = new THREE.Color(data.color)
    const baseGeometry = this.createIslandGeometry(data.shape, data.size)

    const baseMaterial = new THREE.MeshStandardMaterial({
      map: this.createGrassTexture(baseColor),
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95
    })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    base.castShadow = true
    base.receiveShadow = true
    base.userData.islandId = data.id
    base.userData.isIslandBase = true
    group.add(base)

    const haloGeometry = new THREE.RingGeometry(data.size * 1.1, data.size * 1.25, 64)
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    })
    const halo = new THREE.Mesh(haloGeometry, haloMaterial)
    halo.rotation.x = -Math.PI / 2
    halo.position.y = data.size * 0.1
    group.add(halo)

    const rocks: THREE.Mesh[] = []
    const rockCount = Math.floor(3 + Math.random() * 5)
    for (let i = 0; i < rockCount; i++) {
      const rockSize = 0.15 + Math.random() * 0.3
      const rockGeometry = new THREE.BoxGeometry(rockSize, rockSize, rockSize)
      const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 })
      const rock = new THREE.Mesh(rockGeometry, rockMaterial)
      const angle = Math.random() * Math.PI * 2
      const dist = data.size * (0.3 + Math.random() * 0.4)
      rock.position.set(
        Math.cos(angle) * dist,
        data.size * 0.3,
        Math.sin(angle) * dist
      )
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      rock.castShadow = true
      rocks.push(rock)
      group.add(rock)
    }

    const trees: THREE.Group[] = []
    const treeCount = Math.floor(2 + Math.random() * 4)
    for (let i = 0; i < treeCount; i++) {
      const treeGroup = new THREE.Group()
      const trunkGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8)
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 })
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
      trunk.position.y = 0.25
      treeGroup.add(trunk)

      const foliageGeometry = new THREE.ConeGeometry(0.3, 0.6, 8)
      const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 })
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial)
      foliage.position.y = 0.75
      treeGroup.add(foliage)

      const angle = Math.random() * Math.PI * 2
      const dist = data.size * (0.3 + Math.random() * 0.4)
      treeGroup.position.set(
        Math.cos(angle) * dist,
        data.size * 0.3,
        Math.sin(angle) * dist
      )
      treeGroup.scale.setScalar(0.8 + Math.random() * 0.6)
      trees.push(treeGroup)
      group.add(treeGroup)
    }

    const heartShape = new THREE.Shape()
    const x = 0
    const y = 0
    heartShape.moveTo(x + 0.05, y + 0.05)
    heartShape.bezierCurveTo(x + 0.05, y + 0.05, x + 0.04, y, x, y)
    heartShape.bezierCurveTo(x - 0.06, y, x - 0.06, y + 0.07, x - 0.06, y + 0.07)
    heartShape.bezierCurveTo(x - 0.06, y + 0.11, x - 0.03, y + 0.154, x + 0.05, y + 0.19)
    heartShape.bezierCurveTo(x + 0.12, y + 0.154, x + 0.16, y + 0.11, x + 0.16, y + 0.07)
    heartShape.bezierCurveTo(x + 0.16, y + 0.07, x + 0.16, y, x + 0.10, y)
    heartShape.bezierCurveTo(x + 0.07, y, x + 0.05, y + 0.05, x + 0.05, y + 0.05)

    const heartGeometry = new THREE.ShapeGeometry(heartShape)
    const heartMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    const heart = new THREE.Mesh(heartGeometry, heartMaterial)
    heart.scale.setScalar(2)
    const heartBaseY = data.size + 1.5
    heart.position.set(0, heartBaseY, 0)
    heart.userData.isHeart = true
    heart.userData.islandId = data.id
    group.add(heart)

    group.position.set(data.position.x, data.position.y, data.position.z)
    group.userData.islandId = data.id

    this.islands.set(data.id, {
      data,
      group,
      base,
      halo,
      heart,
      heartBaseY,
      rocks,
      trees,
      originalScale: 1,
      isSelected: false,
      isHovered: false
    })

    this.scene.add(group)
    this.spawnParticles(new THREE.Vector3(data.position.x, data.position.y, data.position.z), baseColor, 50, 0.5)
  }

  public removeIsland(id: string): void {
    const island = this.islands.get(id)
    if (!island) return

    const pos = island.group.position.clone()
    const color = new THREE.Color(island.data.color)
    this.spawnParticles(pos, color, 50, 0.5)

    this.scene.remove(island.group)
    this.islands.delete(id)

    for (const [routeId, route] of this.routes) {
      if (route.data.fromId === id || route.data.toId === id) {
        this.scene.remove(route.line)
        this.scene.remove(route.flowPoints)
        if (route.midButton) this.scene.remove(route.midButton)
        this.routes.delete(routeId)
      }
    }
  }

  public updateIsland(id: string, updates: Partial<IslandData>): void {
    const island = this.islands.get(id)
    if (!island) return
    if (updates.position) {
      island.group.position.set(updates.position.x, updates.position.y, updates.position.z)
    }
    if (updates.size !== undefined) {
      island.group.scale.setScalar(updates.size / island.data.size)
    }
    if (updates.color) {
      const mat = island.base.material as THREE.MeshStandardMaterial
      if (mat.map) {
        mat.map.dispose()
      }
      mat.map = this.createGrassTexture(new THREE.Color(updates.color))
      mat.needsUpdate = true
    }
    island.data = { ...island.data, ...updates }
  }

  public selectIsland(id: string | null): void {
    for (const [islandId, island] of this.islands) {
      island.isSelected = islandId === id
      if (island.halo) {
        const haloMat = island.halo.material as THREE.MeshBasicMaterial
        haloMat.opacity = island.isSelected ? 0.6 : 0
      }
    }
  }

  public addRoute(data: RouteData): void {
    const fromIsland = this.islands.get(data.fromId)
    const toIsland = this.islands.get(data.toId)
    if (!fromIsland || !toIsland) return

    const fromPos = fromIsland.group.position.clone()
    const toPos = toIsland.group.position.clone()

    const points: THREE.Vector3[] = []
    const segments = 20
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const x = THREE.MathUtils.lerp(fromPos.x, toPos.x, t)
      const z = THREE.MathUtils.lerp(fromPos.z, toPos.z, t)
      const y = THREE.MathUtils.lerp(fromPos.y, toPos.y, t) + Math.sin(t * Math.PI) * 2
      points.push(new THREE.Vector3(x, y, z))
    }

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.8
    })
    const line = new THREE.Line(lineGeometry, lineMaterial)
    line.userData.routeId = data.id
    line.userData.isRoute = true
    this.scene.add(line)

    const flowCount = 8
    const flowPositions = new Float32Array(flowCount * 3)
    const flowGeometry = new THREE.BufferGeometry()
    flowGeometry.setAttribute('position', new THREE.BufferAttribute(flowPositions, 3))
    const flowMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.9
    })
    const flowPoints = new THREE.Points(flowGeometry, flowMaterial)
    this.scene.add(flowPoints)

    const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5)
    midPoint.y += 2
    const btnGeometry = new THREE.SphereGeometry(0.3, 16, 16)
    const btnMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0
    })
    const midButton = new THREE.Mesh(btnGeometry, btnMaterial)
    midButton.position.copy(midPoint)
    midButton.userData.routeId = data.id
    midButton.userData.isRouteButton = true
    this.scene.add(midButton)

    this.routes.set(data.id, { data, line, flowPoints, midButton })
    this.spawnStarBurst(fromPos, 0x00aaff)
  }

  public removeRoute(id: string): void {
    const route = this.routes.get(id)
    if (!route) return
    this.scene.remove(route.line)
    this.scene.remove(route.flowPoints)
    if (route.midButton) this.scene.remove(route.midButton)
    this.routes.delete(id)
  }

  public spawnResourcePacket(fromId: string, toId: string): void {
    const fromIsland = this.islands.get(fromId)
    const toIsland = this.islands.get(toId)
    if (!fromIsland || !toIsland) return

    const color = new THREE.Color().setHSL(Math.random(), 0.8, 0.6)
    const geometry = new THREE.SphereGeometry(0.3, 16, 16)
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(fromIsland.group.position)
    mesh.position.y += fromIsland.data.size * 0.5
    this.scene.add(mesh)

    const trailCount = 5
    const trailPositions = new Float32Array(trailCount * 3)
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
    const trailMaterial = new THREE.PointsMaterial({
      color,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    })
    const trail = new THREE.Points(trailGeometry, trailMaterial)
    this.scene.add(trail)

    this.resourcePackets.push({
      mesh,
      fromIsland: fromId,
      toIsland: toId,
      startTime: this.clock.getElapsedTime(),
      duration: 5,
      color,
      trail,
      trailPositions
    })
  }

  private spawnParticles(position: THREE.Vector3, color: THREE.Color, count: number, duration: number): void {
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.SphereGeometry(0.08, 8, 8)
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(position)
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6,
        (Math.random() - 0.5) * 8
      )
      this.scene.add(mesh)
      this.particles.push({
        mesh,
        velocity,
        startTime: this.clock.getElapsedTime(),
        duration
      })
    }
  }

  private spawnStarBurst(position: THREE.Vector3, color: number): void {
    this.spawnParticles(position, new THREE.Color(color), 20, 0.3)
  }

  private spawnAuraBurst(position: THREE.Vector3, color: number): void {
    const geometry = new THREE.RingGeometry(0.1, 0.3, 32)
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(geometry, material)
    ring.position.copy(position)
    ring.rotation.x = -Math.PI / 2
    this.scene.add(ring)

    const startTime = this.clock.getElapsedTime()
    const duration = 0.5
    const animateRing = () => {
      const t = (this.clock.getElapsedTime() - startTime) / duration
      if (t >= 1) {
        this.scene.remove(ring)
        geometry.dispose()
        material.dispose()
        return
      }
      ring.scale.setScalar(1 + t * 8)
      material.opacity = 0.8 * (1 - t)
      requestAnimationFrame(animateRing)
    }
    animateRing()
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement

    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true
      this.previousMouse = { x: e.clientX, y: e.clientY }
    })

    dom.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / dom.clientWidth) * 2 - 1
      this.mouse.y = -(e.clientY / dom.clientHeight) * 2 + 1

      if (this.isDragging && !this.routeDragActive) {
        const dx = e.clientX - this.previousMouse.x
        const dy = e.clientY - this.previousMouse.y
        this.cameraAngle.theta -= dx * 0.01
        this.cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.cameraAngle.phi + dy * 0.01))
        this.updateCameraPosition()
        this.previousMouse = { x: e.clientX, y: e.clientY }
      }

      if (this.routeDragActive && this.routePreviewLine) {
        this.updateRoutePreview()
      }

      this.updateHover()
      this.updateLocatorRing()
    })

    dom.addEventListener('mouseup', (e) => {
      const moved = Math.abs(e.clientX - this.previousMouse.x) + Math.abs(e.clientY - this.previousMouse.y)
      if (moved < 5) {
        this.handleClick()
      }
      if (this.routeDragActive) {
        this.finishRouteDrag()
      }
      this.isDragging = false
    })

    dom.addEventListener('wheel', (e) => {
      e.preventDefault()
      this.cameraDistance = Math.max(10, Math.min(80, this.cameraDistance + e.deltaY * 0.05))
      this.updateCameraPosition()
    })

    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        this.cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 3 }
        this.cameraDistance = 30
        this.cameraTarget = new THREE.Vector3(0, 0, 0)
        this.updateCameraPosition()
      }
    })

    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    })
  }

  private updateCameraPosition(): void {
    const x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.cos(this.cameraAngle.theta)
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraAngle.phi)
    const z = this.cameraTarget.z + this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.sin(this.cameraAngle.theta)
    this.camera.position.set(x, y, z)
    this.camera.lookAt(this.cameraTarget)
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const bases = Array.from(this.islands.values()).map((i) => i.base)
    const hearts = Array.from(this.islands.values()).map((i) => i.heart)
    const routeButtons = Array.from(this.routes.values()).filter(r => r.midButton).map((r) => r.midButton!)
    const allTargets = [...bases, ...hearts, ...routeButtons]

    const intersects = this.raycaster.intersectObjects(allTargets, false)

    let hoveredIslandId: string | null = null

    for (const [id, island] of this.islands) {
      island.isHovered = false
    }

    if (intersects.length > 0) {
      const obj = intersects[0].object
      if (obj.userData.isIslandBase || obj.userData.isHeart) {
        hoveredIslandId = obj.userData.islandId
        if (hoveredIslandId) {
          const island = this.islands.get(hoveredIslandId)
          if (island) {
            island.isHovered = true
          }
        }
      }
      if (obj.userData.isRouteButton) {
        const route = this.routes.get(obj.userData.routeId)
        if (route && route.midButton) {
          const mat = route.midButton.material as THREE.MeshBasicMaterial
          mat.opacity = 0.9
        }
      }
    }

    for (const [, route] of this.routes) {
      if (route.midButton && !intersects.some(i => i.object === route.midButton)) {
        const mat = route.midButton.material as THREE.MeshBasicMaterial
        mat.opacity = 0
      }
    }

    this.events.onIslandHover?.(hoveredIslandId)
  }

  private updateLocatorRing(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersectPoint = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(plane, intersectPoint)

    const bases = Array.from(this.islands.values()).map((i) => i.base)
    const islandIntersects = this.raycaster.intersectObjects(bases, false)

    if (intersectPoint && islandIntersects.length === 0) {
      this.locatorRing.visible = true
      this.locatorRing.position.set(intersectPoint.x, 0.01, intersectPoint.z)
    } else {
      this.locatorRing.visible = false
    }
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera)

    const routeButtons = Array.from(this.routes.values()).filter(r => r.midButton).map((r) => r.midButton!)
    const routeBtnIntersects = this.raycaster.intersectObjects(routeButtons, false)
    if (routeBtnIntersects.length > 0) {
      const routeId = routeBtnIntersects[0].object.userData.routeId
      this.events.onRouteClick?.(routeId)
      return
    }

    const bases = Array.from(this.islands.values()).map((i) => i.base)
    const hearts = Array.from(this.islands.values()).map((i) => i.heart)
    const allIslandTargets = [...bases, ...hearts]
    const islandIntersects = this.raycaster.intersectObjects(allIslandTargets, false)

    if (islandIntersects.length > 0) {
      const islandId = islandIntersects[0].object.userData.islandId
      const island = this.islands.get(islandId)
      if (island) {
        this.playBounceAnimation(island)
        this.events.onIslandClick?.(islandId)
      }
    } else {
      this.events.onIslandClick?.(null)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersectPoint = new THREE.Vector3()
      this.raycaster.ray.intersectPlane(plane, intersectPoint)
      if (intersectPoint) {
        this.events.onEmptyClick?.(intersectPoint)
      }
    }
  }

  private playBounceAnimation(island: IslandObject): void {
    const startTime = this.clock.getElapsedTime()
    const duration = 0.3
    const originalScale = island.group.scale.x
    const animate = () => {
      const t = (this.clock.getElapsedTime() - startTime) / duration
      if (t >= 1) {
        island.group.scale.setScalar(originalScale)
        return
      }
      const bounce = Math.sin(t * Math.PI) * 0.1
      island.group.scale.setScalar(originalScale + bounce)
      requestAnimationFrame(animate)
    }
    animate()
  }

  public startRouteDrag(fromIslandId: string): void {
    this.routeDragActive = true
    this.routeStartIsland = fromIslandId

    const fromIsland = this.islands.get(fromIslandId)
    if (!fromIsland) return

    const points = [fromIsland.group.position.clone(), fromIsland.group.position.clone()]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.3,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.9
    })
    this.routePreviewLine = new THREE.Line(geometry, material)
    this.routePreviewLine.computeLineDistances()
    this.scene.add(this.routePreviewLine)
  }

  private updateRoutePreview(): void {
    if (!this.routePreviewLine || !this.routeStartIsland) return
    const fromIsland = this.islands.get(this.routeStartIsland)
    if (!fromIsland) return

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersectPoint = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(plane, intersectPoint)

    const positions = this.routePreviewLine.geometry.attributes.position.array as Float32Array
    const fromPos = fromIsland.group.position
    positions[0] = fromPos.x
    positions[1] = fromPos.y + fromPos.y + fromIsland.data.size * 0.3
    positions[2] = fromPos.z
    positions[3] = intersectPoint.x
    positions[4] = 0
    positions[5] = intersectPoint.z
    this.routePreviewLine.geometry.attributes.position.needsUpdate = true
    this.routePreviewLine.computeLineDistances()
  }

  private finishRouteDrag(): void {
    if (!this.routeStartIsland) {
      this.cleanupRoutePreview()
      return
    }

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const bases = Array.from(this.islands.values())
      .filter((i) => i.data.id !== this.routeStartIsland)
      .map((i) => i.base)
    const intersects = this.raycaster.intersectObjects(bases, false)

    if (intersects.length > 0) {
      const toIslandId = intersects[0].object.userData.islandId
      this.events.onRouteCreate?.(this.routeStartIsland, toIslandId)
    }

    this.cleanupRoutePreview()
  }

  private cleanupRoutePreview(): void {
    if (this.routePreviewLine) {
      this.scene.remove(this.routePreviewLine)
      this.routePreviewLine.geometry.dispose()
      ;(this.routePreviewLine.material as THREE.Material).dispose()
      this.routePreviewLine = null
    }
    this.routeDragActive = false
    this.routeStartIsland = null
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate)
    const elapsed = this.clock.getElapsedTime()

    for (const [, island] of this.islands) {
      const targetScale = (island.isHovered || island.isSelected ? 1.05 : 1) * island.originalScale
      island.group.scale.x += (targetScale - island.group.scale.x) * 0.1
      island.group.scale.y += (targetScale - island.group.scale.y) * 0.1
      island.group.scale.z += (targetScale - island.group.scale.z) * 0.1

      if (island.halo && island.isSelected) {
        const haloMat = island.halo.material as THREE.MeshBasicMaterial
        const pulse = 0.4 + 0.2 * Math.sin(elapsed * Math.PI * 4)
        haloMat.opacity = pulse
        const baseColor = new THREE.Color(island.data.color)
        haloMat.color.lerpColors(baseColor, new THREE.Color(0xffffff), (Math.sin(elapsed * Math.PI * 4) + 1) / 2)
      }

      const heartFloat = Math.sin(elapsed * Math.PI) * 0.3
      island.heart.position.y = island.heartBaseY + heartFloat
      const heartMat = island.heart.material as THREE.MeshBasicMaterial
      heartMat.opacity = 0.6 + 0.4 * (Math.sin(elapsed * Math.PI) + 1) / 2
      island.heart.lookAt(this.camera.position)
    }

    for (const [, route] of this.routes) {
      const flowPositions = route.flowPoints.geometry.attributes.position.array as Float32Array
      const flowCount = flowPositions.length / 3
      const linePositions = route.line.geometry.attributes.position.array as Float32Array
      const linePointCount = linePositions.length / 3

      for (let i = 0; i < flowCount; i++) {
        const t = ((elapsed * 0.5 + i / flowCount) % 1)
        const idx = t * (linePointCount - 1)
        const i0 = Math.floor(idx)
        const i1 = Math.min(i0 + 1, linePointCount - 1)
        const frac = idx - i0
        flowPositions[i * 3] = THREE.MathUtils.lerp(linePositions[i0 * 3], linePositions[i1 * 3], frac)
        flowPositions[i * 3 + 1] = THREE.MathUtils.lerp(linePositions[i0 * 3 + 1], linePositions[i1 * 3 + 1], frac)
        flowPositions[i * 3 + 2] = THREE.MathUtils.lerp(linePositions[i0 * 3 + 2], linePositions[i1 * 3 + 2], frac)
      }
      route.flowPoints.geometry.attributes.position.needsUpdate = true
    }

    for (let i = this.resourcePackets.length - 1; i >= 0; i--) {
      const packet = this.resourcePackets[i]
      const fromIsland = this.islands.get(packet.fromIsland)
      const toIsland = this.islands.get(packet.toIsland)
      if (!fromIsland || !toIsland) {
        this.removeResourcePacket(packet, i)
        continue
      }

      const t = Math.min((elapsed - packet.startTime) / packet.duration, 1)
      const fromPos = fromIsland.group.position
      const toPos = toIsland.group.position
      packet.mesh.position.x = THREE.MathUtils.lerp(fromPos.x, toPos.x, t)
      packet.mesh.position.z = THREE.MathUtils.lerp(fromPos.z, toPos.z, t)
      packet.mesh.position.y = THREE.MathUtils.lerp(fromPos.y, toPos.y, t) + Math.sin(t * Math.PI) * 4

      const trailCount = packet.trailPositions.length / 3
      for (let j = trailCount - 1; j > 0; j--) {
        packet.trailPositions[j * 3] = packet.trailPositions[(j - 1) * 3]
        packet.trailPositions[j * 3 + 1] = packet.trailPositions[(j - 1) * 3 + 1]
        packet.trailPositions[j * 3 + 2] = packet.trailPositions[(j - 1) * 3 + 2]
      }
      packet.trailPositions[0] = packet.mesh.position.x
      packet.trailPositions[1] = packet.mesh.position.y
      packet.trailPositions[2] = packet.mesh.position.z
      packet.trail.geometry.attributes.position.needsUpdate = true

      if (t >= 1) {
        this.spawnAuraBurst(toPos, 0xffd700)
        this.removeResourcePacket(packet, i)
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      const t = (elapsed - p.startTime) / p.duration
      if (t >= 1) {
        this.scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        ;(p.mesh.material as THREE.Material).dispose()
        this.particles.splice(i, 1)
        continue
      }
      p.mesh.position.addScaledVector(p.velocity, 0.016)
      p.velocity.y -= 0.2
      const mat = p.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 1 - t
    }

    this.renderer.render(this.scene, this.camera)
  }

  private removeResourcePacket(packet: ResourcePacket, index: number): void {
    this.scene.remove(packet.mesh)
    this.scene.remove(packet.trail)
    packet.mesh.geometry.dispose()
    ;(packet.mesh.material as THREE.Material).dispose()
    packet.trail.geometry.dispose()
    ;(packet.trail.material as THREE.Material).dispose()
    this.resourcePackets.splice(index, 1)
  }

  public clearAll(): void {
    for (const id of Array.from(this.islands.keys())) {
      this.removeIsland(id)
    }
    for (const id of Array.from(this.routes.keys())) {
      this.removeRoute(id)
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId)
    this.clearAll()
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }

  public getIslandsBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const [, island] of this.islands) {
      minX = Math.min(minX, island.group.position.x)
      maxX = Math.max(maxX, island.group.position.x)
      minZ = Math.min(minZ, island.group.position.z)
      maxZ = Math.max(maxZ, island.group.position.z)
    }
    if (minX === Infinity) {
      minX = -10; maxX = 10; minZ = -10; maxZ = 10
    }
    return { minX, maxX, minZ, maxZ }
  }

  public getIslandPositions(): Map<string, { x: number; z: number; color: string }> {
    const result = new Map()
    for (const [id, island] of this.islands) {
      result.set(id, {
        x: island.group.position.x,
        z: island.group.position.z,
        color: island.data.color
      })
    }
    return result
  }
}
