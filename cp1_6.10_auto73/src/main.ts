import * as THREE from 'three'
import { CardManager, Card } from './cardManager'
import { ParticleEffect } from './particleEffect'

type GameState = 'idle' | 'playing' | 'won'

class Game {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private container: HTMLElement
  private cardManager: CardManager
  private particleEffect: ParticleEffect
  private gameState: GameState = 'idle'
  private score: number = 0
  private startTime: number = 0
  private elapsedTime: number = 0
  private clock: THREE.Clock
  private audioContext: AudioContext | null = null
  private scoreElement: HTMLElement
  private timeElement: HTMLElement
  private victoryOverlay: HTMLElement
  private finalScoreElement: HTMLElement
  private finalTimeElement: HTMLElement
  private restartBtn: HTMLElement

  constructor() {
    this.container = document.getElementById('canvas-container')!
    this.scoreElement = document.getElementById('score-value')!
    this.timeElement = document.getElementById('time-value')!
    this.victoryOverlay = document.getElementById('victory-overlay')!
    this.finalScoreElement = document.getElementById('final-score')!
    this.finalTimeElement = document.getElementById('final-time')!
    this.restartBtn = document.getElementById('restart-btn')!

    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a1a)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.camera.position.set(0, 0, 5)
    this.camera.lookAt(0, 0, -5)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)

    this.setupLights()

    this.particleEffect = new ParticleEffect(this.scene)

    this.cardManager = new CardManager(
      this.scene,
      this.camera,
      (c1: Card, c2: Card, matched: boolean) => this.handlePairCheck(c1, c2, matched),
      (card: Card) => this.handleCardFlip(card),
      () => this.handleVictory()
    )

    window.addEventListener('resize', () => this.onResize())
    this.renderer.domElement.addEventListener('click', (e) => {
      this.ensureAudioContext()
      if (this.gameState === 'idle') {
        this.gameState = 'playing'
        this.startTime = performance.now() / 1000
      }
      if (this.gameState === 'playing') {
        this.cardManager.handleClick(e, this.container)
      }
    })
    this.restartBtn.addEventListener('click', () => this.restart())

    this.animate()
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(-5, 5, 8)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 1024
    directionalLight.shadow.mapSize.height = 1024
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    this.scene.add(directionalLight)

    const fillLight = new THREE.DirectionalLight(0x6688cc, 0.2)
    fillLight.position.set(5, -3, 3)
    this.scene.add(fillLight)

    const groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    )
    groundPlane.rotation.x = -Math.PI / 2
    groundPlane.position.y = -4
    groundPlane.receiveShadow = true
    this.scene.add(groundPlane)
  }

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  private playFlipSound(): void {
    if (!this.audioContext) return
    const now = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
    osc.connect(gain).connect(this.audioContext.destination)
    osc.start(now)
    osc.stop(now + 0.1)
  }

  private playMatchSound(): void {
    if (!this.audioContext) return
    const now = this.audioContext.currentTime
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator()
      const gain = this.audioContext!.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.08)
      gain.gain.setValueAtTime(0.2, now + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2)
      osc.connect(gain).connect(this.audioContext!.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.2)
    })
  }

  private playFailSound(): void {
    if (!this.audioContext) return
    const now = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    osc.connect(gain).connect(this.audioContext.destination)
    osc.start(now)
    osc.stop(now + 0.15)
  }

  private playVictorySound(): void {
    if (!this.audioContext) return
    const now = this.audioContext.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator()
      const gain = this.audioContext!.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + i * 0.12)
      gain.gain.setValueAtTime(0.2, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4)
      osc.connect(gain).connect(this.audioContext!.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.4)
    })
  }

  private handleCardFlip(_card: Card): void {
    this.playFlipSound()
  }

  private handlePairCheck(c1: Card, c2: Card, matched: boolean): void {
    if (matched) {
      this.playMatchSound()
      this.particleEffect.spawnExplosion(this.cardManager.getCardWorldPosition(c1), 150)
      this.particleEffect.spawnExplosion(this.cardManager.getCardWorldPosition(c2), 150)
      this.score += 100
      this.updateScore()
    } else {
      this.playFailSound()
    }
  }

  private handleVictory(): void {
    this.gameState = 'won'
    this.playVictorySound()
    this.particleEffect.spawnVictory()
    this.finalScoreElement.textContent = this.score.toString()
    this.finalTimeElement.textContent = `${this.elapsedTime.toFixed(1)}s`
    setTimeout(() => {
      this.victoryOverlay.classList.add('show')
    }, 500)
  }

  private updateScore(): void {
    this.scoreElement.textContent = this.score.toString()
    this.scoreElement.classList.add('score-pop')
    setTimeout(() => {
      this.scoreElement.classList.remove('score-pop')
    }, 300)
  }

  private restart(): void {
    this.victoryOverlay.classList.remove('show')
    this.gameState = 'idle'
    this.score = 0
    this.elapsedTime = 0
    this.startTime = 0
    this.updateScore()
    this.timeElement.textContent = '0.0s'
    this.cardManager.reset()
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())
    const delta = this.clock.getDelta()
    const currentTime = performance.now() / 1000

    if (this.gameState === 'playing') {
      this.elapsedTime = currentTime - this.startTime
      this.timeElement.textContent = `${this.elapsedTime.toFixed(1)}s`
    }

    this.cardManager.update(currentTime)
    this.particleEffect.update(delta)
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.cardManager.dispose()
    this.particleEffect.dispose()
    this.renderer.dispose()
    this.scene.clear()
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game()
})
