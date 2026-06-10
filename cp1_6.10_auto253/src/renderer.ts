import type { Particle, Creature, SoundWave, BurstParticle, RidgePoint } from './entities'

export interface GameState {
  width: number
  height: number
  plankton: Particle[]
  creatures: Creature[]
  soundWaves: SoundWave[]
  burstParticles: BurstParticle[]
  trailParticles: Particle[]
  collected: number
  ridgePoints: RidgePoint[]
}

export function createRenderer(ctx: CanvasRenderingContext2D) {
  function drawBackground(width: number, height: number): void {
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, '#001628')
    grad.addColorStop(1, '#000c14')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
  }

  function drawRidge(points: RidgePoint[]): void {
    if (points.length < 3) return
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.closePath()
    ctx.fillStyle = '#1a3a4a'
    ctx.fill()
  }

  function drawParticles(particles: Particle[]): void {
    for (const p of particles) {
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function drawCreature(c: Creature): void {
    const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius * 4)
    glow.addColorStop(0, c.color + 'cc')
    glow.addColorStop(0.3, c.color + '44')
    glow.addColorStop(1, c.color + '00')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.radius * 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 0.95
    ctx.fillStyle = c.color
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  function drawSoundWave(w: SoundWave): void {
    const t = w.age / w.maxAge
    const alpha = 1 - t
    ctx.globalAlpha = alpha
    ctx.strokeStyle = w.color
    ctx.lineWidth = Math.max(0.5, w.lineWidth)
    ctx.beginPath()
    ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function drawBurstParticles(particles: BurstParticle[]): void {
    for (const p of particles) {
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function drawUI(state: GameState): void {
    const { width, height, collected } = state
    const barHeight = 50
    const barY = height - barHeight

    ctx.fillStyle = 'rgba(10, 20, 40, 0.7)'
    ctx.fillRect(0, barY, width, barHeight)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`已收集: ${collected}`, width / 2, barY + barHeight / 2 - 8)

    const trackColors = ['#4a9eff', '#7aff6e', '#ff6eb4']
    const activeLayers = Math.min(3, Math.floor(collected / 3))
    const barW = 80
    const totalW = barW * 3 + 20
    const startX = (width - totalW) / 2
    for (let i = 0; i < 3; i++) {
      const x = startX + i * (barW + 10)
      const y = barY + barHeight / 2 + 12
      const fill = i < activeLayers ? barW : barW * 0.15
      ctx.fillStyle = i < activeLayers ? trackColors[i] : trackColors[i] + '33'
      ctx.fillRect(x, y, fill, 4)
      ctx.strokeStyle = trackColors[i] + '66'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, barW, 4)
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('点击扩散声波  收集发光生物', 16, 14)
  }

  function render(state: GameState): void {
    const { width, height, plankton, creatures, soundWaves, burstParticles, trailParticles, ridgePoints } = state

    drawBackground(width, height)
    drawRidge(ridgePoints)
    drawParticles(plankton)
    drawParticles(trailParticles)

    for (const c of creatures) {
      if (!c.collected) drawCreature(c)
    }

    for (const w of soundWaves) drawSoundWave(w)
    drawBurstParticles(burstParticles)
    drawUI(state)
  }

  return { render }
}
