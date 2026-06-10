import { InputManager } from './input'
import { Player, Obstacle, EnergyBall, ObstacleType, rectOverlap } from './entities'
import { GameRenderer } from './renderer'

type GameState = 'menu' | 'playing' | 'gameover'

const CANVAS_W = 800
const CANVAS_H = 450
const BASE_SPEED = 260
const BEST_SCORE_KEY = 'cyberpunk_cat_best_score'

class Game {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly renderer: GameRenderer
  private readonly input: InputManager

  private state: GameState = 'playing'
  private player!: Player
  private obstacles: Obstacle[] = []
  private energyBalls: EnergyBall[] = []

  private score: number = 0
  private displayScore: number = 0
  private bestScore: number = 0
  private lives: number = 3
  private speed: number = BASE_SPEED

  private lastTime: number = 0
  private accumulator: number = 0
  private readonly fixedDt: number = 1 / 60

  private hitFlashTime: number = 0
  private hitPauseTime: number = 0
  private readonly HIT_FLASH_DURATION = 0.3
  private readonly HIT_PAUSE_DURATION = 0.2
  private invulnerableTime: number = 0
  private readonly INVULNERABLE_DURATION = 1.0

  private spawnTimer: number = 0
  private nextSpawnInterval: number = 1.5
  private ballSpawnTimer: number = 0
  private nextBallInterval: number = 3.0

  private rafId: number = 0
  private gameOverPanel!: HTMLElement
  private finalScoreEl!: HTMLElement
  private bestScoreEl!: HTMLElement
  private restartBtn!: HTMLButtonElement
  private animatingFinalScore: number = 0

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
    if (!canvas) throw new Error('Canvas not found')
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx

    this.renderer = new GameRenderer(canvas)
    this.input = new InputManager(canvas)

    this.setupDom()
    this.loadBestScore()
    this.setupInputCallbacks()
    this.resetGame()

    this.lastTime = performance.now()
    this.loop = this.loop.bind(this)
    this.rafId = requestAnimationFrame(this.loop)
  }

  private setupDom(): void {
    this.gameOverPanel = document.getElementById('game-over') as HTMLElement
    this.finalScoreEl = document.getElementById('final-score') as HTMLElement
    this.bestScoreEl = document.getElementById('best-score') as HTMLElement
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement
    this.restartBtn.addEventListener('click', () => this.restart())
  }

  private loadBestScore(): void {
    try {
      const stored = localStorage.getItem(BEST_SCORE_KEY)
      this.bestScore = stored ? parseInt(stored, 10) || 0 : 0
    } catch {
      this.bestScore = 0
    }
  }

  private saveBestScore(): void {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore))
    } catch {
    }
  }

  private setupInputCallbacks(): void {
    this.input.on((action) => {
      if (this.state !== 'playing') return
      if (action === 'jump') {
        this.player.jump()
      } else if (action === 'slideStart') {
        this.player.startSlide()
      } else if (action === 'slideEnd') {
        this.player.endSlide()
      }
    })
  }

  private resetGame(): void {
    this.player = new Player(120)
    this.obstacles = []
    this.energyBalls = []
    this.score = 0
    this.displayScore = 0
    this.lives = 3
    this.speed = BASE_SPEED
    this.hitFlashTime = 0
    this.hitPauseTime = 0
    this.invulnerableTime = 0
    this.spawnTimer = 0
    this.nextSpawnInterval = 1.5
    this.ballSpawnTimer = 0
    this.nextBallInterval = 2.5
    this.renderer.background.reset()
    this.state = 'playing'
    this.gameOverPanel.style.display = 'none'
  }

  private restart(): void {
    this.resetGame()
    this.lastTime = performance.now()
  }

  private loop(now: number): void {
    this.rafId = requestAnimationFrame(this.loop)

    let delta = (now - this.lastTime) / 1000
    this.lastTime = now
    if (delta > 0.1) delta = 0.1

    if (this.hitPauseTime > 0) {
      this.hitPauseTime -= delta
      this.render(delta)
      return
    }

    this.accumulator += delta
    while (this.accumulator >= this.fixedDt) {
      this.update(this.fixedDt)
      this.accumulator -= this.fixedDt
    }

    const scoreDiff = this.score - this.displayScore
    if (scoreDiff > 0) {
      this.displayScore += Math.max(1, scoreDiff * 0.12)
      if (this.displayScore > this.score) this.displayScore = this.score
    }

    this.render(delta)
  }

  private update(dt: number): void {
    if (this.state !== 'playing') return

    this.score += this.speed * dt * 0.05

    const speedTier = Math.floor(this.score / 100)
    this.speed = BASE_SPEED * Math.pow(1.1, speedTier)
    if (this.speed > 700) this.speed = 700

    this.renderer.background.update(dt, this.speed)
    this.renderer.particles.update(dt)

    this.player.update(dt)

    for (const obs of this.obstacles) {
      obs.update(dt, this.speed)
    }
    this.obstacles = this.obstacles.filter(o => o.active)

    for (const ball of this.energyBalls) {
      ball.update(dt, this.speed)
    }
    this.energyBalls = this.energyBalls.filter(b => b.active)

    this.spawnTimer += dt
    this.ballSpawnTimer += dt

    const baseInterval = Math.max(0.55, 1.6 - speedTier * 0.08)
    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnTimer = 0
      this.nextSpawnInterval = baseInterval * (0.75 + Math.random() * 0.5)
      this.spawnObstacle()
    }

    if (this.ballSpawnTimer >= this.nextBallInterval) {
      this.ballSpawnTimer = 0
      this.nextBallInterval = 2.5 + Math.random() * 2.5
      this.spawnEnergyBall()
    }

    this.checkCollisions()

    if (this.hitFlashTime > 0) this.hitFlashTime -= dt
    if (this.invulnerableTime > 0) this.invulnerableTime -= dt
  }

  private spawnObstacle(): void {
    const types: ObstacleType[] = ['spike', 'drone', 'billboard']
    const speedTier = Math.floor(this.score / 100)
    const weights = speedTier < 2
      ? [0.6, 0.25, 0.15]
      : speedTier < 5
      ? [0.4, 0.35, 0.25]
      : [0.3, 0.4, 0.3]

    let r = Math.random()
    let type: ObstacleType = 'spike'
    for (let i = 0; i < types.length; i++) {
      if (r < weights[i]) { type = types[i]; break }
      r -= weights[i]
    }

    const obs = new Obstacle(type, CANVAS_W + 40, Player.GROUND_Y)
    this.obstacles.push(obs)
  }

  private spawnEnergyBall(): void {
    const yOptions = [
      Player.GROUND_Y - 30,
      Player.GROUND_Y - 80,
      Player.GROUND_Y - 130
    ]
    const y = yOptions[Math.floor(Math.random() * yOptions.length)]
    const ball = new EnergyBall(CANVAS_W + 40, y)
    this.energyBalls.push(ball)
  }

  private checkCollisions(): void {
    if (this.invulnerableTime > 0) return

    const playerRect = this.player.getCollisionRect()

    for (const obs of this.obstacles) {
      if (!obs.active) continue
      if (rectOverlap(playerRect, obs.getCollisionRect())) {
        this.onPlayerHit(obs)
        break
      }
    }

    for (const ball of this.energyBalls) {
      if (!ball.active || ball.collected) continue
      if (rectOverlap(playerRect, ball.getCollisionRect())) {
        this.onBallCollected(ball)
      }
    }
  }

  private onPlayerHit(obs: Obstacle): void {
    this.lives--
    this.hitFlashTime = this.HIT_FLASH_DURATION
    this.hitPauseTime = this.HIT_PAUSE_DURATION
    this.invulnerableTime = this.INVULNERABLE_DURATION
    this.renderer.particles.emitHit(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2
    )

    if (obs.type === 'drone' || obs.type === 'billboard') {
      obs.active = false
      this.renderer.particles.emitDebris(obs.x + obs.w / 2, obs.y + obs.h / 2)
    }

    if (this.lives <= 0) {
      this.gameOver()
    }
  }

  private onBallCollected(ball: EnergyBall): void {
    ball.collected = true
    ball.active = false
    if (this.lives < 3) this.lives++
    this.renderer.particles.emitCollect(
      ball.x + EnergyBall.RADIUS,
      ball.y + EnergyBall.RADIUS + ball.bobOffset
    )
  }

  private gameOver(): void {
    this.state = 'gameover'
    if (this.score > this.bestScore) {
      this.bestScore = Math.floor(this.score)
      this.saveBestScore()
    }
    this.animatingFinalScore = 0
    this.gameOverPanel.style.display = 'block'
    this.bestScoreEl.textContent = String(this.bestScore)
    this.animateFinalScore()
  }

  private animateFinalScore(): void {
    const target = Math.floor(this.score)
    const step = () => {
      const diff = target - this.animatingFinalScore
      if (diff <= 0) {
        this.animatingFinalScore = target
        this.finalScoreEl.textContent = String(target)
        return
      }
      const inc = Math.max(1, Math.ceil(diff / 20))
      this.animatingFinalScore += inc
      if (this.animatingFinalScore > target) this.animatingFinalScore = target
      this.finalScoreEl.textContent = String(this.animatingFinalScore)
      requestAnimationFrame(step)
    }
    setTimeout(step, 300)
  }

  private render(_dt: number): void {
    this.renderer.clear()
    this.renderer.background.draw(this.ctx)

    if (this.invulnerableTime > 0 && Math.floor(this.invulnerableTime * 16) % 2 === 0) {
    } else {
      this.renderer.drawPlayer(this.player)
    }

    for (const obs of this.obstacles) {
      this.renderer.drawObstacle(obs)
    }
    for (const ball of this.energyBalls) {
      this.renderer.drawEnergyBall(ball)
    }

    this.renderer.particles.draw(this.ctx)
    this.renderer.drawScore(this.score, this.displayScore, this.lives)

    if (this.hitFlashTime > 0) {
      const alpha = Math.min(0.6, this.hitFlashTime / this.HIT_FLASH_DURATION * 0.6)
      this.renderer.drawFlashRed(alpha)
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game()
})
