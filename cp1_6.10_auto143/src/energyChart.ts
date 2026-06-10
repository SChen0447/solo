export interface EnergyChartOptions {
  width: number
  height: number
  title?: string
}

export class EnergyChart {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  private title: string
  private progress: number = 0
  private padding = { top: 40, right: 20, bottom: 40, left: 50 }

  private readonly startEnergy = 100
  private readonly peakEnergy = 250
  private readonly endEnergy = 80
  private readonly maxEnergy = 300

  constructor(canvas: HTMLCanvasElement, options: EnergyChartOptions) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx
    this.width = options.width
    this.height = options.height
    this.title = options.title || '能量(kJ/mol)'
    this.resize(options.width, options.height)
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  setProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(1, progress))
  }

  private getChartWidth(): number {
    return this.width - this.padding.left - this.padding.right
  }

  private getChartHeight(): number {
    return this.height - this.padding.top - this.padding.bottom
  }

  private energyToY(energy: number): number {
    const chartHeight = this.getChartHeight()
    return this.padding.top + chartHeight - (energy / this.maxEnergy) * chartHeight
  }

  private progressToX(progress: number): number {
    return this.padding.left + progress * this.getChartWidth()
  }

  private getCurveY(xProgress: number): number {
    const startE = this.startEnergy
    const peakE = this.peakEnergy
    const endE = this.endEnergy

    if (xProgress <= 0.5) {
      const t = xProgress / 0.5
      const energy = startE + (peakE - startE) * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
      return this.energyToY(energy)
    } else {
      const t = (xProgress - 0.5) / 0.5
      const energy = peakE + (endE - peakE) * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
      return this.energyToY(energy)
    }
  }

  render(time: number): void {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.title, this.width / 2, 25)

    ctx.strokeStyle = '#555555'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(this.padding.left, this.padding.top)
    ctx.lineTo(this.padding.left, this.height - this.padding.bottom)
    ctx.lineTo(this.width - this.padding.right, this.height - this.padding.bottom)
    ctx.stroke()

    ctx.fillStyle = '#e0e1dd'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'right'
    for (let e = 0; e <= this.maxEnergy; e += 50) {
      const y = this.energyToY(e)
      ctx.fillText(String(e), this.padding.left - 8, y + 4)
      ctx.strokeStyle = '#333333'
      ctx.beginPath()
      ctx.moveTo(this.padding.left, y)
      ctx.lineTo(this.width - this.padding.right, y)
      ctx.stroke()
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = '#e0e1dd'
    ctx.fillText('0%', this.progressToX(0), this.height - this.padding.bottom + 20)
    ctx.fillText('50%', this.progressToX(0.5), this.height - this.padding.bottom + 20)
    ctx.fillText('100%', this.progressToX(1), this.height - this.padding.bottom + 20)

    ctx.font = '13px sans-serif'
    ctx.fillText('反应进度', this.width / 2, this.height - 8)

    ctx.strokeStyle = '#e07a5f'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    const steps = 100
    for (let i = 0; i <= steps; i++) {
      const xProgress = i / steps
      if (xProgress > this.progress && i > 0) break
      const x = this.progressToX(xProgress)
      const y = this.getCurveY(xProgress)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    const startX = this.progressToX(0)
    const startY = this.energyToY(this.startEnergy)
    ctx.fillStyle = '#e07a5f'
    ctx.beginPath()
    ctx.arc(startX, startY, 4, 0, Math.PI * 2)
    ctx.fill()

    const endX = this.progressToX(1)
    const endY = this.energyToY(this.endEnergy)
    if (this.progress >= 1) {
      ctx.fillStyle = '#e07a5f'
      ctx.beginPath()
      ctx.arc(endX, endY, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    if (this.progress >= 0.4) {
      const peakX = this.progressToX(0.5)
      const peakY = this.energyToY(this.peakEnergy)
      const flash = 0.5 + 0.5 * Math.sin((time / 1000) * Math.PI * 2 / 0.8)
      ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + 0.5 * flash})`
      ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'
      ctx.shadowBlur = 15 * flash
      ctx.beginPath()
      ctx.arc(peakX, peakY, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    if (this.progress > 0 && this.progress < 1) {
      const indicatorX = this.progressToX(this.progress)
      const indicatorY = this.getCurveY(this.progress)
      ctx.fillStyle = '#81b29a'
      ctx.beginPath()
      ctx.arc(indicatorX, indicatorY, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
