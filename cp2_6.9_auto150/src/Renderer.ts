import type {
  GameState,
  Player,
  Creature,
  Underflow,
  VolcanoParticle,
  FloatingParticle,
  Terrain,
  Vec2,
  CreatureShape,
  CollectRecord,
} from './GameEntity'
import {
  PULSE_PERIOD,
  PULSE_AMPLITUDE,
  MAX_HEALTH,
  MAP_HEIGHT,
  COLLECT_ANIM_DURATION,
} from './GameEntity'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private width: number = 0
  private height: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx
    this.resize()
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.canvas.style.width = this.width + 'px'
    this.canvas.style.height = this.height + 'px'
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  getViewportSize(): { w: number; h: number } {
    return { w: this.width, h: this.height }
  }

  render(state: GameState): void {
    const ctx = this.ctx
    const { w, h } = { w: this.width, h: this.height }
    const cam = state.cameraOffset

    ctx.clearRect(0, 0, w, h)
    this.drawBackground(ctx, w, h)
    this.drawTerrain(ctx, state.terrain, cam, w, h, state.mapHeight)
    this.drawFloatingParticles(ctx, state.floatingParticles, cam, w, h)
    this.drawUnderflows(ctx, state.underflows, cam)
    this.drawVolcanoParticles(ctx, state.volcanoParticles, cam)
    this.drawCreatures(ctx, state.creatures, cam, state.player)
    this.drawPlayer(ctx, state.player, cam)
    this.drawHUD(ctx, state, w, h)
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0077B6')
    grad.addColorStop(1, '#001F3F')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  private drawTerrain(
    ctx: CanvasRenderingContext2D,
    terrain: Terrain,
    cam: Vec2,
    w: number,
    h: number,
    mapHeight: number
  ): void {
    ctx.save()
    ctx.beginPath()
    const startX = -cam.x
    const step = 2
    const scaleX = w / terrain.width
    const scaleY = h / mapHeight
    ctx.moveTo(0, h)
    for (let i = 0; i < terrain.width; i += step) {
      const worldX = i
      const screenX = (worldX + startX) * scaleX
      if (screenX < -10 || screenX > w + 10) continue
      const heightVal = terrain.heights[i]
      const screenY = h - heightVal * scaleY
      ctx.lineTo(screenX, screenY)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, h * 0.5, 0, h)
    grad.addColorStop(0, 'rgba(30, 60, 114, 0.6)')
    grad.addColorStop(1, 'rgba(10, 25, 47, 0.95)')
    ctx.fillStyle = grad
    ctx.fill()
    ctx.strokeStyle = 'rgba(77, 150, 255, 0.4)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
  }

  private drawFloatingParticles(
    ctx: CanvasRenderingContext2D,
    particles: FloatingParticle[],
    cam: Vec2,
    w: number,
    h: number
  ): void {
    ctx.save()
    const scaleX = w / 1000
    const scaleY = h / 800
    for (const p of particles) {
      const sx = (p.x - cam.x) * scaleX
      const sy = (p.y - cam.y) * scaleY
      if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = '#a8d8ea'
      ctx.beginPath()
      ctx.arc(sx, sy, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private drawUnderflows(
    ctx: CanvasRenderingContext2D,
    underflows: Underflow[],
    cam: Vec2
  ): void {
    const { w, h } = { w: this.width, h: this.height }
    const scaleX = w / 1000
    const scaleY = h / 800
    for (const u of underflows) {
      const cx = (u.position.x - cam.x) * scaleX
      const cy = (u.position.y - cam.y) * scaleY
      const r = u.radius * scaleX
      ctx.save()
      ctx.translate(cx, cy)
      const angle = Math.atan2(u.direction.y, u.direction.x)
      ctx.rotate(angle)
      const alpha = Math.min(1, u.lifetime / 2) * 0.55
      ctx.fillStyle = `rgba(77, 150, 255, ${alpha})`
      ctx.strokeStyle = `rgba(173, 216, 255, ${alpha * 1.2})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      const arrowLen = r * 0.7
      const ah = r * 0.35
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 1.2})`
      ctx.beginPath()
      ctx.moveTo(-arrowLen * 0.6, -ah * 0.5)
      ctx.lineTo(arrowLen * 0.4, -ah * 0.5)
      ctx.lineTo(arrowLen * 0.4, -ah)
      ctx.lineTo(arrowLen, 0)
      ctx.lineTo(arrowLen * 0.4, ah)
      ctx.lineTo(arrowLen * 0.4, ah * 0.5)
      ctx.lineTo(-arrowLen * 0.6, ah * 0.5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }

  private drawVolcanoParticles(
    ctx: CanvasRenderingContext2D,
    particles: VolcanoParticle[],
    cam: Vec2
  ): void {
    const { w, h } = { w: this.width, h: this.height }
    const scaleX = w / 1000
    const scaleY = h / 800
    for (const p of particles) {
      const sx = (p.position.x - cam.x) * scaleX
      const sy = (p.position.y - cam.y) * scaleY
      const r = p.radius * scaleX
      const lifeRatio = p.lifetime / p.maxLifetime
      const alpha = Math.max(0, Math.min(1, lifeRatio))
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 15 * scaleX
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawCreatures(
    ctx: CanvasRenderingContext2D,
    creatures: Creature[],
    cam: Vec2,
    player: Player
  ): void {
    const { w, h } = { w: this.width, h: this.height }
    const scaleX = w / 1000
    const scaleY = h / 800
    for (const c of creatures) {
      if (!c.alive && !c.collectAnimating) continue
      let sx: number, sy: number, scale: number
      const pulse = 1 + PULSE_AMPLITUDE * Math.sin(c.pulsePhase * Math.PI * 2)
      if (c.collectAnimating) {
        const t = c.collectProgress / COLLECT_ANIM_DURATION
        const targetX = 20
        const targetY = 20
        const worldX = c.position.x
        const worldY = c.position.y
        const curX = (worldX - cam.x) * scaleX
        const curY = (worldY - cam.y) * scaleY
        sx = curX + (targetX - curX) * t
        sy = curY + (targetY - curY) * t
        scale = (1 - t) * pulse
      } else {
        sx = (c.position.x - cam.x) * scaleX
        sy = (c.position.y - cam.y) * scaleY
        scale = pulse
      }
      if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue
      ctx.save()
      ctx.translate(sx, sy)
      const dx = c.position.x - player.position.x
      const dy = c.position.y - player.position.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 60 && !c.collectAnimating) {
        ctx.shadowColor = c.color
        ctx.shadowBlur = 20 + 10 * Math.sin(c.pulsePhase * Math.PI * 8)
      } else if (c.isRare && !c.collectAnimating) {
        ctx.shadowColor = '#FFD700'
        ctx.shadowBlur = 18
      } else {
        ctx.shadowColor = c.color
        ctx.shadowBlur = 12
      }
      const baseR = c.baseRadius * Math.min(scaleX, scaleY)
      this.drawCreatureShape(ctx, c.shape, c.color, baseR * scale)
      ctx.restore()
    }
  }

  private drawCreatureShape(
    ctx: CanvasRenderingContext2D,
    shape: CreatureShape,
    color: string,
    size: number
  ): void {
    ctx.fillStyle = color
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.85
    if (shape === 'jellyfish') {
      ctx.beginPath()
      ctx.arc(0, -size * 0.2, size, Math.PI, 0)
      ctx.lineTo(size, size * 0.1)
      ctx.bezierCurveTo(size * 0.8, size * 0.5, size * 0.3, size * 0.6, 0, size * 0.5)
      ctx.bezierCurveTo(-size * 0.3, size * 0.6, -size * 0.8, size * 0.5, -size, size * 0.1)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 1.5
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(i * size * 0.25, size * 0.1)
        ctx.quadraticCurveTo(
          i * size * 0.25 + Math.sin(Date.now() / 300 + i) * size * 0.15,
          size * 0.6,
          i * size * 0.25,
          size
        )
        ctx.strokeStyle = color
        ctx.stroke()
      }
    } else if (shape === 'starfish') {
      const spikes = 5
      const outer = size
      const inner = size * 0.45
      ctx.beginPath()
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outer : inner
        const a = (i * Math.PI) / spikes - Math.PI / 2
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.ellipse(0, 0, size * 1.4, size * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(size * 1.4, 0)
      ctx.lineTo(size * 2.0, -size * 0.5)
      ctx.lineTo(size * 2.0, size * 0.5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.beginPath()
      ctx.arc(size * 0.4, -size * 0.15, size * 0.12, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, player: Player, cam: Vec2): void {
    const { w, h } = { w: this.width, h: this.height }
    const scaleX = w / 1000
    const scaleY = h / 800
    const sx = (player.position.x - cam.x) * scaleX
    const sy = (player.position.y - cam.y) * scaleY
    const r = player.radius * Math.min(scaleX, scaleY)
    ctx.save()
    ctx.shadowColor = 'rgba(255,255,255,0.8)'
    ctx.shadowBlur = 12
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(77, 150, 255, 0.8)'
    ctx.lineWidth = 3
    ctx.stroke()
    const angle = Math.atan2(player.velocity.y + player.currentVelocityOffset.y, player.velocity.x + player.currentVelocityOffset.x)
    if (!isNaN(angle) && (Math.abs(player.velocity.x) + Math.abs(player.velocity.y) > 1 || Math.abs(player.currentVelocityOffset.x) + Math.abs(player.currentVelocityOffset.y) > 1)) {
      ctx.strokeStyle = 'rgba(255,217,61,0.8)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx + Math.cos(angle) * r * 1.8, sy + Math.sin(angle) * r * 1.8)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(77, 150, 255, 0.9)'
    ctx.beginPath()
    ctx.arc(sx - r * 0.25, sy - r * 0.1, r * 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(sx + r * 0.25, sy - r * 0.1, r * 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawHUD(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    w: number,
    h: number
  ): void {
    this.drawDepthGauge(ctx, state, w, h)
    this.drawHealthBar(ctx, state, w, h)
    this.drawInfoPanel(ctx, state, w, h)
  }

  private drawDepthGauge(ctx: CanvasRenderingContext2D, state: GameState, w: number, _h: number): void {
    const panelW = 28
    const panelH = 260
    const x = 20
    const y = (_h - panelH) / 2
    ctx.save()
    this.drawGlassPanel(ctx, x, y, panelW, panelH, 8)
    const barX = x + 6
    const barY = y + 10
    const barW = panelW - 12
    const barH = panelH - 20
    ctx.fillStyle = 'rgba(0, 20, 40, 0.8)'
    this.roundRect(ctx, barX, barY, barW, barH, 4)
    ctx.fill()
    const depthRatio = Math.min(1, Math.max(0, state.player.position.y / state.mapHeight))
    const fillH = barH * depthRatio
    const grad = ctx.createLinearGradient(0, barY, 0, barY + barH)
    grad.addColorStop(0, '#4D96FF')
    grad.addColorStop(1, '#001F3F')
    ctx.fillStyle = grad
    this.roundRect(ctx, barX, barY + (barH - fillH), barW, fillH, 4)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    const pct = Math.round(depthRatio * 100)
    ctx.fillText(`${pct}%`, x + panelW / 2, y + panelH + 16)
    ctx.font = '10px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('深度', x + panelW / 2, y - 6)
    ctx.restore()
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D, state: GameState, _w: number, h: number): void {
    const x = 20
    const y = h - 50
    const barW = 200
    const barH = 18
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('生命值', x, y - 6)
    this.drawGlassPanel(ctx, x - 4, y - 2, barW + 8, barH + 4, 8)
    const ratio = Math.max(0, state.player.health / MAX_HEALTH)
    ctx.fillStyle = 'rgba(0, 20, 40, 0.7)'
    this.roundRect(ctx, x, y, barW, barH, 6)
    ctx.fill()
    const grad = ctx.createLinearGradient(x, y, x + barW, y)
    grad.addColorStop(0, '#FF6B6B')
    grad.addColorStop(1, '#FFD93D')
    ctx.fillStyle = grad
    this.roundRect(ctx, x, y, barW * ratio, barH, 6)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${state.player.health} / ${MAX_HEALTH}`, x + barW / 2, y + barH - 5)
    ctx.restore()
  }

  private drawInfoPanel(ctx: CanvasRenderingContext2D, state: GameState, w: number, _h: number): void {
    const panelW = 180
    const pad = 12
    const x = w - panelW - 20
    const y = 20
    ctx.save()
    let borderColor = 'rgba(77, 150, 255, 0.25)'
    if (state.rareFlashTimer > 0) {
      const pulse = Math.sin(state.rareFlashTimer * 20) * 0.5 + 0.5
      borderColor = `rgba(255, 215, 0, ${0.3 + pulse * 0.7})`
    }
    this.drawGlassPanelWithBorder(ctx, x, y, panelW, 300, 12, borderColor)
    let cy = y + pad
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('收集图鉴', x + pad, cy)
    cy += 20
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + pad, cy)
    ctx.lineTo(x + panelW - pad, cy)
    ctx.stroke()
    cy += 8
    const records: CollectRecord[] = Array.from(state.collectedCreatures.values())
    if (records.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '11px sans-serif'
      ctx.fillText('点击生物进行收集', x + pad, cy + 12)
    } else {
      ctx.font = '11px sans-serif'
      for (let i = 0; i < records.length && i < 8; i++) {
        const r = records[i]
        const ix = x + pad
        const iy = cy + i * 24
        this.drawMiniCreature(ctx, ix + 10, iy + 10, r.shape, r.color, 8)
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        ctx.fillText(`x ${r.count}`, ix + 26, iy + 14)
      }
    }
    cy = y + 230
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.moveTo(x + pad, cy)
    ctx.lineTo(x + panelW - pad, cy)
    ctx.stroke()
    cy += 10
    ctx.fillStyle = '#FFD93D'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText(`得分: ${state.totalScore}`, x + pad, cy + 12)
    cy += 22
    ctx.fillStyle = '#6BCB77'
    ctx.font = '12px sans-serif'
    const total = state.collectedCreatures.size
    ctx.fillText(`进度: ${total} / 20`, x + pad, cy + 8)
    ctx.restore()
  }

  private drawMiniCreature(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    shape: CreatureShape,
    color: string,
    size: number
  ): void {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 4
    if (shape === 'jellyfish') {
      ctx.beginPath()
      ctx.arc(0, -size * 0.2, size, Math.PI, 0)
      ctx.lineTo(size, 0)
      ctx.quadraticCurveTo(0, size * 0.6, -size, 0)
      ctx.closePath()
      ctx.fill()
    } else if (shape === 'starfish') {
      const spikes = 5
      ctx.beginPath()
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? size : size * 0.45
        const a = (i * Math.PI) / spikes - Math.PI / 2
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.ellipse(0, 0, size * 1.3, size * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(size * 1.3, 0)
      ctx.lineTo(size * 1.9, -size * 0.5)
      ctx.lineTo(size * 1.9, size * 0.5)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  private drawGlassPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.save()
    ctx.fillStyle = 'rgba(0, 31, 63, 0.55)'
    this.roundRect(ctx, x, y, w, h, r)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }

  private drawGlassPanelWithBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    borderColor: string
  ): void {
    ctx.save()
    ctx.fillStyle = 'rgba(0, 31, 63, 0.55)'
    this.roundRect(ctx, x, y, w, h, r)
    ctx.fill()
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }
}
