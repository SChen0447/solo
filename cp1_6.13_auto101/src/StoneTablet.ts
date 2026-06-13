import * as THREE from 'three'

export interface StarPoint {
  id: number
  position: THREE.Vector3
  mesh: THREE.Mesh
  haloMesh?: THREE.Mesh
  activated: boolean
  activationProgress: number
  constellationId: number
  size: number
  rippleStartTime: number
}

export interface Constellation {
  id: number
  name: string
  story: string
  starIds: number[]
  connectionIndices: [number, number][]
  connections: THREE.Line[]
  nameLabel?: THREE.Sprite
  storyLabel?: THREE.Sprite
  completed: boolean
}

export class StoneTablet {
  public group: THREE.Group
  public tabletMesh: THREE.Mesh
  public stars: StarPoint[] = []
  public constellations: Constellation[] = []
  public tabletMaterial: THREE.MeshPhysicalMaterial
  public horizonCircle: THREE.Line
  public totalStars: number = 0
  public activatedStars: number = 0
  public fullyTransparent: boolean = false
  public tabletTransparency: number = 0.6

  private tabletSize: number
  private starTexture: THREE.Texture | null = null
  private haloTexture: THREE.Texture | null = null

  constructor(tabletSize: number = 4) {
    this.tabletSize = tabletSize
    this.group = new THREE.Group()

    this.tabletMaterial = this.createTabletMaterial()
    this.tabletMesh = this.createTabletMesh()
    this.group.add(this.tabletMesh)

    this.createScratchesAndCracks()
    this.starTexture = this.createStarTexture()
    this.haloTexture = this.createHaloTexture()

    this.createConstellationData()
    this.horizonCircle = this.createHorizonCircle()
    this.horizonCircle.visible = false
    this.group.add(this.horizonCircle)
  }

  private createTabletMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: 0x5a5247,
      transparent: true,
      opacity: 0.6,
      roughness: 0.85,
      metalness: 0.05,
      transmission: 0.1,
      thickness: 0.5,
      clearcoat: 0.1,
      clearcoatRoughness: 0.8,
      sheen: 0.1,
      sheenColor: 0xb8860b,
      side: THREE.DoubleSide
    })
  }

  private createTabletMesh(): THREE.Mesh {
    const shape = new THREE.Shape()
    const s = this.tabletSize / 2
    const r = 0.3
    shape.moveTo(-s + r, -s)
    shape.lineTo(s - r, -s)
    shape.quadraticCurveTo(s, -s, s, -s + r)
    shape.lineTo(s, s - r)
    shape.quadraticCurveTo(s, s, s - r, s)
    shape.lineTo(-s + r, s)
    shape.quadraticCurveTo(-s, s, -s, s - r)
    shape.lineTo(-s, -s + r)
    shape.quadraticCurveTo(-s, -s, -s + r, -s)

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.01,
      bevelSegments: 2
    }

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geometry.center()
    const mesh = new THREE.Mesh(geometry, this.tabletMaterial)
    mesh.rotation.x = -Math.PI / 2
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  private createScratchesAndCracks(): void {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#3d3830'
    ctx.fillRect(0, 0, 1024, 1024)

    for (let i = 0; i < 200; i++) {
      ctx.strokeStyle = `rgba(80, 70, 60, ${Math.random() * 0.3})`
      ctx.lineWidth = Math.random() * 1.5 + 0.5
      ctx.beginPath()
      const x1 = Math.random() * 1024
      const y1 = Math.random() * 1024
      const length = Math.random() * 150 + 20
      const angle = Math.random() * Math.PI * 2
      ctx.moveTo(x1, y1)
      ctx.lineTo(x1 + Math.cos(angle) * length, y1 + Math.sin(angle) * length)
      ctx.stroke()
    }

    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = `rgba(50, 45, 40, ${Math.random() * 0.5 + 0.2})`
      ctx.lineWidth = Math.random() * 2 + 1
      ctx.beginPath()
      let x = Math.random() * 1024
      let y = Math.random() * 1024
      ctx.moveTo(x, y)
      for (let j = 0; j < 10; j++) {
        x += (Math.random() - 0.5) * 100
        y += (Math.random() - 0.5) * 100
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 90 : 50}, ${Math.random() > 0.5 ? 80 : 45}, ${Math.random() > 0.5 ? 70 : 35}, ${Math.random() * 0.4})`
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, Math.random() * 2, Math.random() * 2)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    this.tabletMaterial.map = texture
    this.tabletMaterial.needsUpdate = true
  }

  private createStarTexture(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)')
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(canvas)
  }

  private createHaloTexture(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)')
    gradient.addColorStop(0.4, 'rgba(255, 215, 0, 0.3)')
    gradient.addColorStop(0.7, 'rgba(255, 180, 0, 0.1)')
    gradient.addColorStop(1, 'rgba(255, 180, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(canvas)
  }

  private createConstellationData(): void {
    const half = this.tabletSize / 2 - 0.3
    const constellationsData = [
      {
        name: '北斗七星',
        story: '北斗七星：帝车之象，运于中央，临制四乡。分阴阳，建四时，均五行，移节度，定诸纪。天之三明，辅星为弼。',
        stars: [
          { x: -1.2, y: 0.8, size: 0.06 },
          { x: -0.8, y: 1.0, size: 0.05 },
          { x: -0.4, y: 0.9, size: 0.055 },
          { x: 0.0, y: 0.75, size: 0.05 },
          { x: 0.3, y: 0.4, size: 0.045 },
          { x: 0.65, y: 0.5, size: 0.055 },
          { x: 0.85, y: 0.85, size: 0.05 }
        ],
        connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]
      },
      {
        name: '仙女座',
        story: '仙女座：安德洛墨达，埃塞俄比亚公主，因母之夸口而被缚于海岩之上献于海怪，后为珀耳修斯所救。',
        stars: [
          { x: -1.0, y: -0.2, size: 0.06 },
          { x: -0.6, y: -0.4, size: 0.045 },
          { x: -0.2, y: -0.5, size: 0.05 },
          { x: 0.2, y: -0.35, size: 0.04 },
          { x: 0.5, y: -0.15, size: 0.055 },
          { x: 0.3, y: 0.15, size: 0.04 }
        ],
        connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]]
      },
      {
        name: '猎户座',
        story: '猎户座：参宿，主斩刈、狩猎之事。昔有猎人俄里翁，自夸无敌，为天蝎所螫，死后升天为星座，与天蝎永不相见。',
        stars: [
          { x: 0.9, y: -0.7, size: 0.06 },
          { x: 1.2, y: -0.4, size: 0.055 },
          { x: 0.95, y: -0.1, size: 0.05 },
          { x: 1.3, y: -0.1, size: 0.06 },
          { x: 1.05, y: 0.2, size: 0.045 },
          { x: 1.4, y: 0.4, size: 0.05 },
          { x: 0.7, y: 0.4, size: 0.045 }
        ],
        connections: [[0, 1], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 5], [4, 6]]
      },
      {
        name: '天蝎座',
        story: '天蝎座：心宿，又称大火，主司察。昔天蝎奉赫拉之命，刺杀俄里翁，二者遂分居天球两端，永不相见。',
        stars: [
          { x: -1.3, y: -0.9, size: 0.06 },
          { x: -1.0, y: -1.1, size: 0.05 },
          { x: -0.7, y: -1.0, size: 0.055 },
          { x: -0.4, y: -0.8, size: 0.045 },
          { x: -0.15, y: -0.95, size: 0.05 },
          { x: 0.1, y: -1.15, size: 0.04 },
          { x: 0.35, y: -1.0, size: 0.045 }
        ],
        connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]]
      },
      {
        name: '织女星',
        story: '织女星：天孙也，主果蓏、丝帛、珍宝。昔有牛郎织女，隔银河相望，七夕鹊桥相会，千古流传。',
        stars: [
          { x: -0.5, y: 1.2, size: 0.065 },
          { x: -0.85, y: 1.4, size: 0.04 },
          { x: -0.2, y: 1.45, size: 0.045 },
          { x: 0.1, y: 1.25, size: 0.05 },
          { x: 0.25, y: 0.95, size: 0.04 }
        ],
        connections: [[0, 1], [0, 2], [0, 3], [3, 4]]
      }
    ]

    let starId = 0
    constellationsData.forEach((data, constIdx) => {
      const constellation: Constellation = {
        id: constIdx,
        name: data.name,
        story: data.story,
        starIds: [],
        connectionIndices: data.connections as [number, number][],
        connections: [],
        completed: false
      }

      data.stars.forEach((starData, starIdx) => {
        const position = new THREE.Vector3(
          Math.max(-half, Math.min(half, starData.x)),
          Math.max(-half, Math.min(half, starData.y)),
          0.03
        )
        const star = this.createStarPoint(starId, position, starData.size, constIdx)
        this.stars.push(star)
        this.group.add(star.mesh)
        if (star.haloMesh) this.group.add(star.haloMesh)
        constellation.starIds.push(starId)
        starId++
      })

      this.constellations.push(constellation)
    })

    this.totalStars = this.stars.length
    this.addRandomStars()
  }

  private addRandomStars(): void {
    const half = this.tabletSize / 2 - 0.3
    const count = Math.max(0, 100 - this.stars.length)
    for (let i = 0; i < count; i++) {
      let x: number, y: number
      let valid = false
      let attempts = 0
      while (!valid && attempts < 20) {
        x = (Math.random() - 0.5) * 2 * half
        y = (Math.random() - 0.5) * 2 * half
        valid = true
        for (const star of this.stars) {
          const dx = star.position.x - x
          const dy = star.position.y - y
          if (Math.sqrt(dx * dx + dy * dy) < 0.18) {
            valid = false
            break
          }
        }
        attempts++
      }
      if (!valid) continue
      const position = new THREE.Vector3(x!, y!, 0.03)
      const size = 0.025 + Math.random() * 0.025
      const star = this.createStarPoint(this.stars.length, position, size, -1)
      this.stars.push(star)
      this.group.add(star.mesh)
      if (star.haloMesh) this.group.add(star.haloMesh)
    }
    this.totalStars = this.stars.length
  }

  private createStarPoint(id: number, position: THREE.Vector3, size: number, constellationId: number): StarPoint {
    const geometry = new THREE.SphereGeometry(size, 16, 16)
    const material = new THREE.MeshBasicMaterial({
      color: 0xb8860b,
      transparent: true,
      opacity: 0.85
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)

    const haloGeometry = new THREE.PlaneGeometry(size * 4, size * 4)
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
      map: this.haloTexture!,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial)
    haloMesh.position.copy(position)
    haloMesh.position.z += 0.005
    haloMesh.lookAt(new THREE.Vector3(position.x, position.y, 10))

    return {
      id,
      position: position.clone(),
      mesh,
      haloMesh,
      activated: false,
      activationProgress: 0,
      constellationId,
      size,
      rippleStartTime: -1
    }
  }

  private createHorizonCircle(): THREE.Line {
    const points: THREE.Vector3[] = []
    const segments = 128
    const radius = this.tabletSize / 2 - 0.1
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0.08
      ))
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const colors: number[] = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const r = Math.floor(100 + t * 80)
      const g = Math.floor(80 + (1 - t) * 60)
      const b = Math.floor(200 + t * 55)
      colors.push(r / 255, g / 255, b / 255)
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      linewidth: 1
    })
    const line = new THREE.Line(geometry, material)
    line.rotation.x = -Math.PI / 2
    return line
  }

  private createTextSprite(text: string, fontSize: number = 18, color: string = '#FFD700', glow: boolean = true): THREE.Sprite {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const scale = 2
    canvas.width = 1024
    canvas.height = fontSize * 4 * scale

    ctx.font = `${fontSize * scale}px "KaiTi", "STKaiti", "楷体", serif`
    const metrics = ctx.measureText(text)
    canvas.width = Math.ceil(metrics.width + 40 * scale)

    if (glow) {
      ctx.shadowColor = color
      ctx.shadowBlur = 20 * scale
    }
    ctx.fillStyle = color
    ctx.font = `${fontSize * scale}px "KaiTi", "STKaiti", "楷体", serif`
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 20 * scale, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const sprite = new THREE.Sprite(material)
    const aspect = canvas.width / canvas.height
    const width = Math.min(aspect * 0.8, 3.5)
    sprite.scale.set(width, width / aspect, 1)
    return sprite
  }

  public activateStar(star: StarPoint, currentTime: number): void {
    if (star.activated) return
    star.activated = true
    star.rippleStartTime = currentTime
    this.activatedStars++

    if (star.constellationId >= 0) {
      this.checkConstellationConnections(star.constellationId)
    }
  }

  private checkConstellationConnections(constellationId: number): void {
    const constellation = this.constellations[constellationId]
    if (!constellation || constellation.completed) return

    const activatedStars = constellation.starIds.filter(id => this.stars[id].activated)

    if (activatedStars.length >= 4 && constellation.connections.length === 0) {
      this.drawConstellationConnections(constellation)
      this.showConstellationName(constellation)
    }

    const allActivated = constellation.starIds.every(id => this.stars[id].activated)
    if (allActivated && !constellation.completed) {
      constellation.completed = true
      if (constellation.connections.length === 0) {
        this.drawConstellationConnections(constellation)
      }
      if (!constellation.nameLabel) {
        this.showConstellationName(constellation)
      }
      this.showConstellationStory(constellation)
    }
  }

  private drawConstellationConnections(constellation: Constellation): void {
    for (const [aIdx, bIdx] of constellation.connectionIndices) {
      const starA = this.stars[constellation.starIds[aIdx]]
      const starB = this.stars[constellation.starIds[bIdx]]
      if (!starA || !starB) continue

      const points = [
        new THREE.Vector3(starA.position.x, starA.position.y, 0.06),
        new THREE.Vector3(starB.position.x, starB.position.y, 0.06)
      ]
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0,
        linewidth: 2
      })
      const line = new THREE.Line(geometry, material)
      line.rotation.x = -Math.PI / 2
      this.group.add(line)
      constellation.connections.push(line)
    }
  }

  private showConstellationName(constellation: Constellation): void {
    if (constellation.nameLabel) return
    let centerX = 0, centerY = 0
    constellation.starIds.forEach(id => {
      centerX += this.stars[id].position.x
      centerY += this.stars[id].position.y
    })
    centerX /= constellation.starIds.length
    centerY /= constellation.starIds.length

    const sprite = this.createTextSprite(constellation.name, 20, '#00FFFF', true)
    sprite.position.set(centerX, centerY + 0.35, 0.1)
    sprite.rotation.x = -Math.PI / 2
    this.group.add(sprite)
    constellation.nameLabel = sprite
  }

  private showConstellationStory(constellation: Constellation): void {
    if (constellation.storyLabel) return
    let centerX = 0, centerY = 0
    constellation.starIds.forEach(id => {
      centerX += this.stars[id].position.x
      centerY += this.stars[id].position.y
    })
    centerX /= constellation.starIds.length
    centerY /= constellation.starIds.length

    const sprite = this.createTextSprite(constellation.story, 16, '#FFD700', true)
    sprite.position.set(centerX, centerY - 0.4, 0.12)
    sprite.rotation.x = -Math.PI / 2
    this.group.add(sprite)
    constellation.storyLabel = sprite

    this.dispatchStoryParticles(centerX, centerY)
  }

  private storyParticleCallback?: () => THREE.Points
  public setStoryParticleCallback(cb: () => THREE.Points): void {
    this.storyParticleCallback = cb
  }

  private dispatchStoryParticles(x: number, y: number): void {
    if (this.storyParticleCallback) {
      const particles = this.storyParticleCallback()
      particles.position.set(x, y, 0.15)
      particles.rotation.x = -Math.PI / 2
      this.group.add(particles)
    }
  }

  public update(deltaTime: number, currentTime: number): void {
    for (const star of this.stars) {
      const material = star.mesh.material as THREE.MeshBasicMaterial
      if (star.activated && star.activationProgress < 1) {
        star.activationProgress = Math.min(1, star.activationProgress + deltaTime / 1.2)
        const t = star.activationProgress
        const r = Math.floor(0xb8 + (0xff - 0xb8) * t)
        const g = Math.floor(0x86 + (0xd7 - 0x86) * t)
        const b = Math.floor(0x0b + (0x00 - 0x0b) * t)
        material.color.setRGB(r / 255, g / 255, b / 255)
        material.opacity = 0.85 + 0.15 * t
      }

      if (star.haloMesh && star.rippleStartTime > 0) {
        const elapsed = currentTime - star.rippleStartTime
        if (elapsed < 1.0) {
          const t = elapsed / 1.0
          const scale = 1 + t * 5
          star.haloMesh.scale.setScalar(scale)
          const haloMat = star.haloMesh.material as THREE.MeshBasicMaterial
          haloMat.opacity = 0.8 * (1 - t)
        } else {
          const haloMat = star.haloMesh.material as THREE.MeshBasicMaterial
          if (star.activated) {
            haloMat.opacity = 0.25 + 0.1 * Math.sin(currentTime * 3)
            star.haloMesh.scale.setScalar(1.5)
          } else {
            haloMat.opacity = 0
          }
        }
      }
    }

    for (const constellation of this.constellations) {
      for (const line of constellation.connections) {
        const mat = line.material as THREE.LineBasicMaterial
        if (mat.opacity < 0.75) {
          mat.opacity = Math.min(0.75, mat.opacity + deltaTime * 0.8)
        } else {
          mat.opacity = 0.6 + 0.3 * (0.5 + 0.5 * Math.sin(currentTime * Math.PI * 2))
        }
      }

      if (constellation.nameLabel) {
        const mat = constellation.nameLabel.material as THREE.SpriteMaterial
        if (mat.opacity < 1) mat.opacity = Math.min(1, mat.opacity + deltaTime * 0.6)
      }
      if (constellation.storyLabel) {
        const mat = constellation.storyLabel.material as THREE.SpriteMaterial
        if (mat.opacity < 1) mat.opacity = Math.min(1, mat.opacity + deltaTime * 0.4)
      }
    }

    if (this.activatedStars === this.totalStars && this.totalStars > 0) {
      if (!this.fullyTransparent) {
        this.tabletTransparency = Math.min(0.9, this.tabletTransparency + deltaTime / 3)
        this.tabletMaterial.opacity = this.tabletTransparency
        this.tabletMaterial.roughness = Math.max(0.2, this.tabletMaterial.roughness - deltaTime)
        if (this.tabletTransparency >= 0.9) {
          this.fullyTransparent = true
        }
      }
      this.horizonCircle.visible = true
      const horizonMat = this.horizonCircle.material as THREE.LineBasicMaterial
      if (horizonMat.opacity < 0.9) {
        horizonMat.opacity = Math.min(0.9, horizonMat.opacity + deltaTime * 0.3)
      }
      this.horizonCircle.rotation.z += deltaTime * (Math.PI * 2 / 12)
    }
  }

  public getProgress(): number {
    if (this.totalStars === 0) return 0
    return this.activatedStars / this.totalStars
  }

  public reset(): void {
    for (const star of this.stars) {
      star.activated = false
      star.activationProgress = 0
      star.rippleStartTime = -1
      const material = star.mesh.material as THREE.MeshBasicMaterial
      material.color.setHex(0xb8860b)
      material.opacity = 0.85
      if (star.haloMesh) {
        const haloMat = star.haloMesh.material as THREE.MeshBasicMaterial
        haloMat.opacity = 0
        star.haloMesh.scale.setScalar(1)
      }
    }
    this.activatedStars = 0

    for (const constellation of this.constellations) {
      constellation.completed = false
      for (const line of constellation.connections) {
        this.group.remove(line)
        line.geometry.dispose()
        ;(line.material as THREE.Material).dispose()
      }
      constellation.connections = []
      if (constellation.nameLabel) {
        this.group.remove(constellation.nameLabel)
        const mat = constellation.nameLabel.material as THREE.SpriteMaterial
        mat.map?.dispose()
        mat.dispose()
        constellation.nameLabel = undefined
      }
      if (constellation.storyLabel) {
        this.group.remove(constellation.storyLabel)
        const mat = constellation.storyLabel.material as THREE.SpriteMaterial
        mat.map?.dispose()
        mat.dispose()
        constellation.storyLabel = undefined
      }
    }

    this.fullyTransparent = false
    this.tabletTransparency = 0.6
    this.tabletMaterial.opacity = 0.6
    this.tabletMaterial.roughness = 0.85
    this.horizonCircle.visible = false
    const horizonMat = this.horizonCircle.material as THREE.LineBasicMaterial
    horizonMat.opacity = 0
    this.horizonCircle.rotation.z = 0
  }
}
