import { Player, Obstacle, EnergyBall } from './entities'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

export class ParticleSystem {
  private particles: Particle[] = []

  emitDebris(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 400,
        vy: (Math.random() - 0.8) * 350,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        size: 2 + Math.floor(Math.random() * 4),
        color: ['#ffdd00', '#ff9900', '#ffaa22', '#ffee55'][Math.floor(Math.random() * 4)]
      })
    }
  }

  emitCollect(x: number, y: number): void {
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.3
      const speed = 80 + Math.random() * 160
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 2 + Math.floor(Math.random() * 3),
        color: ['#00ffff', '#00ccff', '#66eeff', '#aaeeff'][Math.floor(Math.random() * 4)]
      })
    }
  }

  emitHit(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 280,
        vy: (Math.random() - 0.5) * 280,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 2 + Math.floor(Math.random() * 3),
        color: ['#ff0044', '#ff2266', '#ff0033'][Math.floor(Math.random() * 3)]
      })
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.vy += 500 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife)
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      const s = Math.max(1, Math.floor(p.size * alpha))
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), s, s)
    }
    ctx.globalAlpha = 1
  }
}

export class LayeredBackground {
  private skyOffset: number = 0
  private midOffset: number = 0
  private nearOffset: number = 0
  private readonly canvasW: number
  private readonly canvasH: number

  constructor(w: number, h: number) {
    this.canvasW = w
    this.canvasH = h
  }

  reset(): void {
    this.skyOffset = 0
    this.midOffset = 0
    this.nearOffset = 0
  }

  update(dt: number, speed: number): void {
    this.skyOffset -= speed * 0.08 * dt
    this.midOffset -= speed * 0.35 * dt
    this.nearOffset -= speed * 0.85 * dt
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawSky(ctx)
    this.drawMidBuildings(ctx)
    this.drawNearProps(ctx)
    this.drawGround(ctx)
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvasH)
    grad.addColorStop(0, '#1a0033')
    grad.addColorStop(0.4, '#2d0a4a')
    grad.addColorStop(0.7, '#1a0530')
    grad.addColorStop(1, '#0a0014')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.canvasW, this.canvasH)

    ctx.fillStyle = 'rgba(80, 40, 100, 0.5)'
    let offset = ((this.skyOffset % 400) + 400) % 400
    for (let x = -offset; x < this.canvasW + 400; x += 400) {
      this.drawCloud(ctx, x + 20, 40, 120, 24, 'rgba(90, 50, 120, 0.45)')
      this.drawCloud(ctx, x + 220, 80, 160, 28, 'rgba(70, 35, 100, 0.35)')
      this.drawCloud(ctx, x + 100, 130, 140, 22, 'rgba(60, 30, 90, 0.4)')
    }

    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)'
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137 + 50) % this.canvasW
      const sy = (i * 71 + 20) % 200
      ctx.fillRect(sx, sy, 2, 2)
    }
    ctx.fillStyle = 'rgba(255, 0, 255, 0.6)'
    for (let i = 0; i < 20; i++) {
      const sx = (i * 191 + 80) % this.canvasW
      const sy = (i * 53 + 40) % 180
      ctx.fillRect(sx, sy, 2, 2)
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
    ctx.fillStyle = color
    ctx.fillRect(x, y + h * 0.3, w, h * 0.5)
    ctx.fillRect(x + w * 0.15, y, w * 0.7, h * 0.6)
    ctx.fillRect(x + w * 0.05, y + h * 0.15, w * 0.9, h * 0.5)
  }

  private drawMidBuildings(ctx: CanvasRenderingContext2D): void {
    const buildingW = 180
    let offset = ((this.midOffset % buildingW) + buildingW) % buildingW
    const baseY = 300

    for (let x = -offset - buildingW; x < this.canvasW + buildingW; x += buildingW) {
      const seed = Math.floor((x + offset) / buildingW)
      const bh = 90 + Math.abs(((seed * 73) % 110))
      const bw = 120 + ((seed * 37) % 50)
      const bx = x + ((seed * 19) % 30)
      const by = baseY - bh

      ctx.fillStyle = '#1a1028'
      ctx.fillRect(bx, by, bw, bh)

      ctx.fillStyle = '#2a1838'
      for (let wy = by + 8; wy < baseY - 8; wy += 14) {
        for (let wx = bx + 8; wx < bx + bw - 8; wx += 16) {
          if (((wx + wy + seed) * 13) % 5 < 2) {
            ctx.fillStyle = ((wx * wy) % 7 < 2) ? '#ff00aa' : ((wx + wy) % 5 < 2 ? '#00ffff' : '#663366')
          } else {
            ctx.fillStyle = '#1a0820'
          }
          ctx.fillRect(wx, wy, 6, 8)
        }
      }

      ctx.fillStyle = '#0f0818'
      ctx.fillRect(bx - 3, by, 3, bh)
      ctx.fillRect(bx + bw, by, 3, bh)

      if (seed % 3 === 0) {
        ctx.fillStyle = '#0f0818'
        ctx.fillRect(bx + bw * 0.3, by - 20, bw * 0.1, 20)
        ctx.fillRect(bx + bw * 0.6, by - 14, bw * 0.08, 14)
      }
    }
  }

  private drawNearProps(ctx: CanvasRenderingContext2D): void {
    const propSpacing = 300
    let offset = ((this.nearOffset % propSpacing) + propSpacing) % propSpacing

    for (let x = -offset - propSpacing; x < this.canvasW + propSpacing; x += propSpacing) {
      const seed = Math.floor((x + offset) / propSpacing)

      this.drawPole(ctx, x + 30, 410, seed)

      if (seed % 2 === 0) {
        this.drawNeonSign(ctx, x + 160, 150 + (seed % 3) * 40, seed)
      }
    }
  }

  private drawPole(ctx: CanvasRenderingContext2D, x: number, groundY: number, seed: number): void {
    const poleH = 140
    const poleW = 6
    const poleX = x
    const poleY = groundY - poleH

    ctx.fillStyle = '#2a2030'
    ctx.fillRect(poleX, poleY, poleW, poleH)
    ctx.fillStyle = '#1a1520'
    ctx.fillRect(poleX - 2, poleY, 2, poleH)

    ctx.fillStyle = '#1a1520'
    ctx.fillRect(poleX - 20, poleY, 46, 4)
    ctx.fillRect(poleX - 15, poleY + 14, 36, 3)

    const wireColor = seed % 2 === 0 ? '#ff00aa' : '#00ffff'
    ctx.strokeStyle = wireColor
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(poleX - 20, poleY + 2)
    ctx.lineTo(poleX + 280, poleY + 8)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  private drawNeonSign(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
    const color = seed % 3 === 0 ? '#ff00ff' : (seed % 3 === 1 ? '#00ffff' : '#ffaa00')
    const w = 70 + (seed % 3) * 20
    const h = 26

    ctx.fillStyle = 'rgba(20, 10, 30, 0.9)'
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4)

    ctx.shadowBlur = 12
    ctx.shadowColor = color
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, 3)
    ctx.fillRect(x, y + h - 3, w, 3)
    ctx.fillRect(x, y, 3, h)
    ctx.fillRect(x + w - 3, y, 3, h)

    for (let i = 0; i < 4; i++) {
      const sx = x + 10 + i * 14
      ctx.fillRect(sx, y + 8, 8, 10)
    }
    ctx.shadowBlur = 0
  }

  private drawGround(ctx: CanvasRenderingContext2D): void {
    const groundY = 410
    ctx.fillStyle = '#120818'
    ctx.fillRect(0, groundY, this.canvasW, this.canvasH - groundY)

    ctx.fillStyle = '#2a1a38'
    ctx.fillRect(0, groundY, this.canvasW, 4)

    const stripeSpacing = 80
    let offset = ((this.nearOffset % stripeSpacing) + stripeSpacing) % stripeSpacing
    ctx.fillStyle = '#3a2848'
    for (let x = -offset; x < this.canvasW; x += stripeSpacing) {
      ctx.fillRect(x, groundY + 12, 40, 2)
    }

    ctx.fillStyle = '#ff00aa'
    for (let x = -offset; x < this.canvasW; x += stripeSpacing * 2) {
      ctx.fillRect(x, groundY + 2, 20, 2)
    }
    ctx.fillStyle = '#00ffff'
    for (let x = -offset + stripeSpacing; x < this.canvasW; x += stripeSpacing * 2) {
      ctx.fillRect(x, groundY + 2, 20, 2)
    }
  }
}

export class GameRenderer {
  private ctx: CanvasRenderingContext2D
  private readonly canvasW: number
  private readonly canvasH: number
  readonly background: LayeredBackground
  readonly particles: ParticleSystem

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx
    this.canvasW = canvas.width
    this.canvasH = canvas.height
    this.background = new LayeredBackground(canvas.width, canvas.height)
    this.particles = new ParticleSystem()
    this.ctx.imageSmoothingEnabled = false
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvasW, this.canvasH)
  }

  drawScore(score: number, displayScore: number, lives: number): void {
    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = 'rgba(10, 0, 20, 0.55)'
    ctx.fillRect(16, 16, 200, 64)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.strokeRect(16, 16, 200, 64)

    ctx.fillStyle = '#00ffff'
    ctx.font = 'bold 14px "Courier New", monospace'
    ctx.textAlign = 'left'
    ctx.shadowBlur = 4
    ctx.shadowColor = '#00ffff'
    ctx.fillText('SCORE', 28, 38)
    ctx.shadowBlur = 0

    ctx.fillStyle = '#ffaa00'
    ctx.font = 'bold 28px "Courier New", monospace'
    ctx.shadowBlur = 6
    ctx.shadowColor = 'rgba(255, 170, 0, 0.8)'
    const scoreStr = String(Math.floor(displayScore)).padStart(6, '0')
    ctx.fillText(scoreStr, 28, 66)
    ctx.shadowBlur = 0

    ctx.fillStyle = '#ff00ff'
    ctx.font = 'bold 14px "Courier New", monospace'
    ctx.textAlign = 'right'
    ctx.shadowBlur = 4
    ctx.shadowColor = '#ff00ff'
    ctx.fillText('HP', 204, 38)
    ctx.shadowBlur = 0

    for (let i = 0; i < 3; i++) {
      const hx = 140 + i * 22
      const hy = 50
      if (i < lives) {
        this.drawHeart(ctx, hx, hy, '#ff0066')
      } else {
        this.drawHeart(ctx, hx, hy, '#3a1a2a')
      }
    }
    ctx.restore()
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.fillStyle = color
    ctx.fillRect(x + 2, y, 4, 2)
    ctx.fillRect(x + 10, y, 4, 2)
    ctx.fillRect(x, y + 2, 16, 4)
    ctx.fillRect(x + 2, y + 6, 12, 3)
    ctx.fillRect(x + 4, y + 9, 8, 2)
    ctx.fillRect(x + 6, y + 11, 4, 2)
  }

  drawFlashRed(alpha: number): void {
    this.ctx.fillStyle = `rgba(255, 0, 30, ${alpha})`
    this.ctx.fillRect(0, 0, this.canvasW, this.canvasH)
  }

  drawPlayer(player: Player): void {
    const ctx = this.ctx
    ctx.save()
    const px = Math.floor(player.x)
    const py = Math.floor(player.y)

    if (player.state === 'sliding') {
      this.drawPlayerSliding(ctx, px, py, player)
    } else {
      this.drawPlayerNormal(ctx, px, py, player)
    }
    ctx.restore()
  }

  private drawPlayerNormal(ctx: CanvasRenderingContext2D, x: number, y: number, player: Player): void {
    const bodyColor = '#ff8822'
    const bodyDark = '#cc5500'
    const bodyLight = '#ffbb44'
    const eyeColor = '#00ffff'
    const metal = '#8888aa'

    const runFrame = Math.floor(player.animTime * 12) % 4
    const legOffset = player.state === 'running' ? [0, 2, 0, -2][runFrame] : 0

    if (player.state === 'jumping') {
      this.drawTail(ctx, x, y, true)
    } else {
      this.drawTail(ctx, x, y, false)
    }

    ctx.fillStyle = bodyColor
    ctx.fillRect(x + 6, y + 10, 28, 22)
    ctx.fillStyle = bodyDark
    ctx.fillRect(x + 6, y + 28, 28, 4)
    ctx.fillStyle = bodyLight
    ctx.fillRect(x + 8, y + 12, 24, 2)

    ctx.fillStyle = bodyColor
    ctx.fillRect(x + 26, y + 2, 14, 18)
    ctx.fillStyle = bodyDark
    ctx.fillRect(x + 26, y + 16, 14, 4)

    ctx.fillStyle = bodyColor
    ctx.fillRect(x + 26, y, 4, 6)
    ctx.fillRect(x + 36, y, 4, 6)
    ctx.fillStyle = '#ff00aa'
    ctx.fillRect(x + 27, y + 2, 2, 3)
    ctx.fillRect(x + 37, y + 2, 2, 3)

    ctx.fillStyle = eyeColor
    ctx.fillRect(x + 30, y + 7, 3, 4)
    ctx.fillRect(x + 36, y + 7, 3, 4)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + 30, y + 7, 1, 2)
    ctx.fillRect(x + 36, y + 7, 1, 2)

    ctx.fillStyle = metal
    ctx.fillRect(x + 28, y + 14, 8, 2)
    ctx.fillRect(x + 30, y + 13, 4, 1)

    ctx.fillStyle = bodyDark
    ctx.fillRect(x + 8, y + 32, 8, 8 + legOffset)
    ctx.fillRect(x + 24, y + 32, 8, 8 - legOffset)
    ctx.fillStyle = metal
    ctx.fillRect(x + 8, y + 38 + legOffset, 8, 2)
    ctx.fillRect(x + 24, y + 38 - legOffset, 8, 2)
  }

  private drawPlayerSliding(ctx: CanvasRenderingContext2D, x: number, y: number, player: Player): void {
    const bodyColor = '#ff8822'
    const bodyDark = '#cc5500'
    const bodyLight = '#ffbb44'
    const eyeColor = '#00ffff'
    const metal = '#8888aa'

    ctx.fillStyle = bodyColor
    ctx.fillRect(x + 2, y + 2, 52, 16)
    ctx.fillStyle = bodyDark
    ctx.fillRect(x + 2, y + 14, 52, 4)
    ctx.fillStyle = bodyLight
    ctx.fillRect(x + 4, y + 4, 48, 2)

    ctx.fillStyle = bodyColor
    ctx.fillRect(x + 44, y, 10, 10)
    ctx.fillStyle = eyeColor
    ctx.fillRect(x + 47, y + 3, 2, 3)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + 47, y + 3, 1, 1)

    ctx.fillStyle = metal
    ctx.fillRect(x + 6, y + 8, 6, 2)
    ctx.fillRect(x + 20, y + 8, 6, 2)
    ctx.fillRect(x + 34, y + 8, 6, 2)

    ctx.fillStyle = bodyDark
    ctx.fillRect(x, y - 2, 8, 4)
    ctx.fillStyle = '#ff00aa'
    ctx.fillRect(x + 2, y - 1, 3, 2)
  }

  private drawTail(ctx: CanvasRenderingContext2D, x: number, y: number, jumping: boolean): void {
    const bodyColor = '#ff8822'
    const bodyDark = '#cc5500'
    const tipColor = '#ff00aa'
    if (jumping) {
      ctx.fillStyle = bodyColor
      ctx.fillRect(x, y + 4, 6, 4)
      ctx.fillRect(x - 4, y, 6, 6)
      ctx.fillRect(x - 6, y - 6, 6, 8)
      ctx.fillStyle = bodyDark
      ctx.fillRect(x - 6, y + 2, 6, 2)
      ctx.fillStyle = tipColor
      ctx.fillRect(x - 6, y - 6, 6, 3)
    } else {
      ctx.fillStyle = bodyColor
      ctx.fillRect(x, y + 20, 6, 4)
      ctx.fillRect(x - 6, y + 22, 8, 4)
      ctx.fillRect(x - 12, y + 26, 8, 4)
      ctx.fillStyle = bodyDark
      ctx.fillRect(x - 12, y + 28, 8, 2)
      ctx.fillStyle = tipColor
      ctx.fillRect(x - 12, y + 26, 3, 4)
    }
  }

  drawObstacle(obs: Obstacle): void {
    const ctx = this.ctx
    const ox = Math.floor(obs.x)
    const oy = Math.floor(obs.y)

    switch (obs.type) {
      case 'spike':
        this.drawSpike(ctx, ox, oy)
        break
      case 'drone':
        this.drawDrone(ctx, ox, oy, obs.animTime)
        break
      case 'billboard':
        this.drawBillboard(ctx, ox, oy)
        break
    }
  }

  private drawSpike(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const baseColor = '#cc2233'
    const darkColor = '#881122'
    const lightColor = '#ff4455'

    for (let i = 0; i < 3; i++) {
      const sx = x + i * 9
      ctx.fillStyle = baseColor
      for (let j = 0; j < 14; j++) {
        const w = Math.max(2, 10 - j)
        ctx.fillRect(sx + (10 - w) / 2, y + 32 - j * 2 - 2, w, 2)
      }
      ctx.fillStyle = lightColor
      ctx.fillRect(sx + 3, y + 6, 2, 20)
      ctx.fillStyle = darkColor
      ctx.fillRect(sx + 6, y + 10, 2, 16)
    }

    ctx.fillStyle = '#442233'
    ctx.fillRect(x - 2, y + 28, 32, 4)
    ctx.fillStyle = '#663344'
    ctx.fillRect(x - 2, y + 28, 32, 1)
  }

  private drawDrone(ctx: CanvasRenderingContext2D, x: number, y: number, animTime: number): void {
    const bodyColor = '#555566'
    const bodyDark = '#333344'
    const bodyLight = '#777788'
    const redLight = '#ff2244'

    const hover = Math.sin(animTime * 6) * 2
    const dy = y + hover

    ctx.fillStyle = '#222233'
    const propOffset = Math.floor(animTime * 40) % 2 === 0 ? 0 : 2
    ctx.fillRect(x - 2 - propOffset, dy + 2, 14, 2)
    ctx.fillRect(x + 32 + propOffset, dy + 2, 14, 2)

    ctx.fillStyle = bodyColor
    ctx.fillRect(x + 8, dy + 4, 28, 16)
    ctx.fillStyle = bodyDark
    ctx.fillRect(x + 8, dy + 16, 28, 4)
    ctx.fillStyle = bodyLight
    ctx.fillRect(x + 10, dy + 6, 24, 2)

    ctx.fillStyle = '#222222'
    ctx.fillRect(x + 14, dy + 8, 16, 8)
    ctx.fillStyle = redLight
    ctx.fillRect(x + 18, dy + 10, 8, 4)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + 18, dy + 10, 2, 2)

    ctx.fillStyle = redLight
    ctx.globalAlpha = 0.5 + Math.sin(animTime * 8) * 0.5
    ctx.fillRect(x + 20, dy + 2, 4, 2)
    ctx.globalAlpha = 1

    ctx.fillStyle = bodyDark
    ctx.fillRect(x + 12, dy + 20, 4, 6)
    ctx.fillRect(x + 28, dy + 20, 4, 6)
  }

  private drawBillboard(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const frameColor = '#444455'
    const frameDark = '#222233'
    const broken = '#662233'

    ctx.fillStyle = frameColor
    ctx.fillRect(x, y, 60, 70)
    ctx.fillStyle = frameDark
    ctx.fillRect(x, y + 66, 60, 4)
    ctx.fillRect(x + 56, y, 4, 70)

    ctx.fillStyle = broken
    ctx.fillRect(x + 4, y + 4, 52, 62)

    ctx.fillStyle = '#ff0066'
    ctx.fillRect(x + 8, y + 10, 20, 8)
    ctx.fillStyle = '#00ffff'
    ctx.fillRect(x + 32, y + 10, 16, 8)
    ctx.fillStyle = '#ffaa00'
    ctx.fillRect(x + 8, y + 24, 40, 6)
    ctx.fillStyle = '#ff00ff'
    ctx.fillRect(x + 8, y + 36, 30, 6)
    ctx.fillStyle = '#00ffff'
    ctx.fillRect(x + 8, y + 48, 44, 8)

    ctx.fillStyle = '#0a0014'
    ctx.fillRect(x + 18, y + 4, 4, 20)
    ctx.fillRect(x + 40, y + 18, 8, 6)
    ctx.fillRect(x + 12, y + 56, 16, 8)
    ctx.fillRect(x + 36, y + 32, 12, 4)

    ctx.fillStyle = frameDark
    ctx.fillRect(x + 16, y + 70, 4, 20)
    ctx.fillRect(x + 40, y + 70, 4, 20)
  }

  drawEnergyBall(ball: EnergyBall): void {
    const ctx = this.ctx
    const cx = Math.floor(ball.x + EnergyBall.RADIUS)
    const cy = Math.floor(ball.y + EnergyBall.RADIUS + ball.bobOffset)
    const r = EnergyBall.RADIUS

    ctx.save()
    ctx.globalAlpha = 0.3 + Math.sin(ball.animTime * 4) * 0.1
    ctx.fillStyle = '#00ffff'
    ctx.beginPath()
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.shadowBlur = 10
    ctx.shadowColor = '#00ffff'
    ctx.fillStyle = '#66ffff'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#aaffff'
    ctx.beginPath()
    ctx.arc(cx, cy, r - 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cx - 4, cy - 6, 3, 3)
    ctx.fillRect(cx + 1, cy - 4, 2, 2)

    ctx.restore()
  }
}
