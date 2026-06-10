import * as THREE from 'three'

export interface Card {
  id: number
  color: THREE.Color
  isFlipped: boolean
  isMatched: boolean
  mesh: THREE.Group
  targetRotation: number
  currentRotation: number
  flipStartTime: number
  flipDuration: number
  isAnimating: boolean
  fadeStartTime: number
  isFading: boolean
  glowLight: THREE.PointLight | null
  redGlowStartTime: number
  isRedGlowing: boolean
}

type PairCheckCallback = (card1: Card, card2: Card, matched: boolean) => void
type FlipCallback = (card: Card) => void
type VictoryCallback = () => void

const CARD_SIZE = 2
const CARD_DEPTH = 0.3
const CARD_SPACING = 0.5
const GRID_COLS = 4
const GRID_ROWS = 4
const FLIP_DURATION = 0.6
const FLIP_BACK_DURATION = 0.4
const MATCH_DISPLAY_TIME = 1.5
const FADE_DURATION = 1
const RED_GLOW_DURATION = 0.3

const PAIR_COLORS: number[] = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12,
  0x9b59b6, 0x1abc9c, 0xe67e22, 0xe91e63
]

export class CardManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private cards: Card[] = []
  private selectedCards: Card[] = []
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private onPairCheck: PairCheckCallback
  private onCardFlip: FlipCallback
  private onVictory: VictoryCallback
  private isLocked: boolean = false
  private matchedPairs: number = 0

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    onPairCheck: PairCheckCallback,
    onCardFlip: FlipCallback,
    onVictory: VictoryCallback
  ) {
    this.scene = scene
    this.camera = camera
    this.onPairCheck = onPairCheck
    this.onCardFlip = onCardFlip
    this.onVictory = onVictory
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.createCards()
  }

  private createCardTexture(color: THREE.Color): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const r = Math.floor(color.r * 255)
    const g = Math.floor(color.g * 255)
    const b = Math.floor(color.b * 255)
    const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 180)
    gradient.addColorStop(0, `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`)
    gradient.addColorStop(1, `rgb(${r}, ${g}, ${b})`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 4
    ctx.strokeRect(10, 10, 236, 236)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  private createCards(): void {
    const totalWidth = GRID_COLS * CARD_SIZE + (GRID_COLS - 1) * CARD_SPACING
    const totalHeight = GRID_ROWS * CARD_SIZE + (GRID_ROWS - 1) * CARD_SPACING
    const startX = -totalWidth / 2 + CARD_SIZE / 2
    const startY = totalHeight / 2 - CARD_SIZE / 2
    const zPos = -5

    const colors: THREE.Color[] = []
    for (const hex of PAIR_COLORS) {
      const c = new THREE.Color(hex)
      colors.push(c, c.clone())
    }
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[colors[i], colors[j]] = [colors[j], colors[i]]
    }

    let id = 0
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const color = colors[id]
        const x = startX + col * (CARD_SIZE + CARD_SPACING)
        const y = startY - row * (CARD_SIZE + CARD_SPACING)

        const group = new THREE.Group()
        group.position.set(x, y, zPos)

        const cardGeometry = new THREE.BoxGeometry(CARD_SIZE, CARD_SIZE, CARD_DEPTH)
        const backMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333,
          transparent: true,
          opacity: 0.8,
          metalness: 0.3,
          roughness: 0.5
        })
        const frontMaterial = new THREE.MeshStandardMaterial({
          map: this.createCardTexture(color),
          transparent: true,
          opacity: 1,
          metalness: 0.1,
          roughness: 0.6
        })

        const materials = [
          backMaterial, backMaterial, backMaterial,
          backMaterial, frontMaterial, backMaterial
        ]
        const cardMesh = new THREE.Mesh(cardGeometry, materials)
        cardMesh.castShadow = true
        cardMesh.receiveShadow = true
        cardMesh.userData.cardId = id
        group.add(cardMesh)

        const edgesGeometry = new THREE.EdgesGeometry(cardGeometry)
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
        group.add(edges)

        const glowLight = new THREE.PointLight(0xFFD700, 0, 5)
        glowLight.position.set(0, 0, 0.5)
        glowLight.visible = false
        group.add(glowLight)

        this.scene.add(group)

        this.cards.push({
          id,
          color,
          isFlipped: false,
          isMatched: false,
          mesh: group,
          targetRotation: 0,
          currentRotation: 0,
          flipStartTime: 0,
          flipDuration: FLIP_DURATION,
          isAnimating: false,
          fadeStartTime: 0,
          isFading: false,
          glowLight,
          redGlowStartTime: 0,
          isRedGlowing: false
        })
        id++
      }
    }
  }

  handleClick(event: MouseEvent, container: HTMLElement): void {
    if (this.isLocked) return

    const rect = container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const cardMeshes: THREE.Object3D[] = []
    for (const card of this.cards) {
      if (!card.isMatched && !card.isFlipped && !card.isAnimating && !card.isFading) {
        cardMeshes.push(card.mesh)
      }
    }

    const intersects = this.raycaster.intersectObjects(cardMeshes, true)
    if (intersects.length === 0) return

    let clickedCard: Card | null = null
    for (const card of this.cards) {
      let obj: THREE.Object3D | null = intersects[0].object
      while (obj) {
        if (obj === card.mesh) {
          clickedCard = card
          break
        }
        obj = obj.parent
      }
      if (clickedCard) break
    }

    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched || clickedCard.isAnimating) return

    this.flipCard(clickedCard)
  }

  private flipCard(card: Card): void {
    card.isFlipped = true
    card.isAnimating = true
    card.targetRotation = Math.PI
    card.flipStartTime = performance.now() / 1000
    card.flipDuration = FLIP_DURATION

    this.selectedCards.push(card)
    this.onCardFlip(card)

    if (this.selectedCards.length === 2) {
      this.isLocked = true
      const [c1, c2] = this.selectedCards
      const matched = c1.color.getHex() === c2.color.getHex()
      setTimeout(() => {
        this.onPairCheck(c1, c2, matched)
        if (matched) {
          this.handleMatch(c1, c2)
        } else {
          this.handleMismatch(c1, c2)
        }
      }, FLIP_DURATION * 1000 + 100)
    }
  }

  private handleMatch(c1: Card, c2: Card): void {
    c1.isMatched = true
    c2.isMatched = true

    if (c1.glowLight) {
      c1.glowLight.visible = true
      c1.glowLight.intensity = 0.5
      setTimeout(() => { if (c1.glowLight) { c1.glowLight.visible = false; c1.glowLight.intensity = 0 } }, 500)
    }
    if (c2.glowLight) {
      c2.glowLight.visible = true
      c2.glowLight.intensity = 0.5
      setTimeout(() => { if (c2.glowLight) { c2.glowLight.visible = false; c2.glowLight.intensity = 0 } }, 500)
    }

    setTimeout(() => {
      c1.isFading = true
      c2.isFading = true
      c1.fadeStartTime = performance.now() / 1000
      c2.fadeStartTime = performance.now() / 1000

      setTimeout(() => {
        this.selectedCards = []
        this.isLocked = false
        this.matchedPairs++
        if (this.matchedPairs === PAIR_COLORS.length) {
          this.onVictory()
        }
      }, FADE_DURATION * 1000)
    }, 200)
  }

  private handleMismatch(c1: Card, c2: Card): void {
    c1.isRedGlowing = true
    c2.isRedGlowing = true
    c1.redGlowStartTime = performance.now() / 1000
    c2.redGlowStartTime = performance.now() / 1000

    setTimeout(() => {
      c1.isAnimating = true
      c2.isAnimating = true
      c1.targetRotation = 0
      c2.targetRotation = 0
      c1.flipStartTime = performance.now() / 1000
      c2.flipStartTime = performance.now() / 1000
      c1.flipDuration = FLIP_BACK_DURATION
      c2.flipDuration = FLIP_BACK_DURATION

      setTimeout(() => {
        c1.isFlipped = false
        c2.isFlipped = false
        this.selectedCards = []
        this.isLocked = false
      }, FLIP_BACK_DURATION * 1000)
    }, MATCH_DISPLAY_TIME * 1000)
  }

  update(currentTime: number): void {
    for (const card of this.cards) {
      if (card.isAnimating) {
        const elapsed = currentTime - card.flipStartTime
        const t = Math.min(elapsed / card.flipDuration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        card.currentRotation = eased * card.targetRotation
        card.mesh.rotation.y = card.currentRotation
        if (t >= 1) card.isAnimating = false
      }

      if (card.isFading) {
        const elapsed = currentTime - card.fadeStartTime
        const t = Math.min(elapsed / FADE_DURATION, 1)
        const opacity = 1 - t
        card.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (Array.isArray(child.material)) {
              for (const m of child.material) {
                m.opacity = opacity
                m.transparent = true
              }
            } else {
              child.material.opacity = opacity
              child.material.transparent = true
            }
          }
          if (child instanceof THREE.LineSegments) {
            if (!Array.isArray(child.material)) {
              child.material.opacity = opacity * 0.6
              child.material.transparent = true
            }
          }
        })
        card.mesh.position.z = -5 - t * 2
      }

      if (card.isRedGlowing) {
        const elapsed = currentTime - card.redGlowStartTime
        const t = elapsed / RED_GLOW_DURATION
        if (t >= 1) {
          card.isRedGlowing = false
          card.mesh.traverse((child) => {
            if (child instanceof THREE.LineSegments && !Array.isArray(child.material)) {
              child.material.color.setHex(0xffffff)
              ;(child.material as THREE.LineBasicMaterial).opacity = 0.6
            }
          })
        } else {
          const intensity = 0.5 * (1 - t)
          card.mesh.traverse((child) => {
            if (child instanceof THREE.LineSegments && !Array.isArray(child.material)) {
              child.material.color.setHex(0xff0000)
              ;(child.material as THREE.LineBasicMaterial).opacity = 0.6 + intensity
            }
          })
        }
      }
    }
  }

  getCardWorldPosition(card: Card): THREE.Vector3 {
    const pos = new THREE.Vector3()
    card.mesh.getWorldPosition(pos)
    return pos
  }

  reset(): void {
    for (const card of this.cards) {
      this.scene.remove(card.mesh)
    }
    this.cards = []
    this.selectedCards = []
    this.matchedPairs = 0
    this.isLocked = false
    this.createCards()
  }

  dispose(): void {
    for (const card of this.cards) {
      card.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (Array.isArray(child.material)) {
            for (const m of child.material) m.dispose()
          } else {
            child.material.dispose()
          }
        }
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose()
          if (!Array.isArray(child.material)) child.material.dispose()
        }
      })
      this.scene.remove(card.mesh)
    }
    this.cards = []
  }
}
