import { RhythmConfig, FreqVariationCurve } from '../data/rhythmConfigs'

interface WaveSample {
  x: number
  y: number
  time: number
}

export class RhythmVisualizer {
  private canvas: HTMLCanvasElement
  private fingerprintCanvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private fingerprintCtx: CanvasRenderingContext2D
  private config: RhythmConfig
  private samples: WaveSample[] = []
  private isPlaying: boolean = false
  private animationFrameId: number | null = null
  private currentTime: number = 0
  private lastTimestamp: number = 0
  private speedMultiplier: number = 1
  private pixelsPerSecond: number = 200
  private sampleRate: number = 200
  private fadeProgress: number = 1
  private fadeDirection: 1 | -1 | 0 = 0
  private offscreenCanvas: HTMLCanvasElement | null = null
  private offscreenCtx: CanvasRenderingContext2D | null = null
  private dpr: number = 1

  constructor(
    canvas: HTMLCanvasElement,
    fingerprintCanvas: HTMLCanvasElement,
    config: RhythmConfig
  ) {
    this.canvas = canvas
    this.fingerprintCanvas = fingerprintCanvas
    const ctx = canvas.getContext('2d')
    const fpCtx = fingerprintCanvas.getContext('2d')
    if (!ctx || !fpCtx) {
      throw new Error('Canvas 2D context not available')
    }
    this.ctx = ctx
    this.fingerprintCtx = fpCtx
    this.config = config
    this.setupCanvas()
    this.setupOffscreen()
    this.drawFingerprint()
  }

  private setupCanvas(): void {
    this.dpr = window.devicePixelRatio || 1
    this.resize()
  }

  private setupOffscreen(): void {
    this.offscreenCanvas = document.createElement('canvas')
    const ctx = this.offscreenCanvas.getContext('2d')
    if (!ctx) return
    this.offscreenCtx = ctx
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.ctx.scale(this.dpr, this.dpr)

    const fpRect = this.fingerprintCanvas.getBoundingClientRect()
    this.fingerprintCanvas.width = fpRect.width * this.dpr
    this.fingerprintCanvas.height = fpRect.height * this.dpr
    this.fingerprintCtx.scale(this.dpr, this.dpr)

    this.drawFingerprint()
  }

  private generateWaveValue(time: number): number {
    const { amplitudeRange, freqVariationCurve, edgeFactor } = this.config.waveParams
    const bpm = this.config.bpm * this.speedMultiplier
    const beatDuration = 60 / bpm
    const beatIndex = Math.floor((time / beatDuration) % 16)
    const beatStrength = this.config.beatPattern[beatIndex] || 0.5

    const baseFreq = 2
    let freqMod = 0

    switch (freqVariationCurve as FreqVariationCurve) {
      case 'sine':
        freqMod = Math.sin(time * baseFreq * Math.PI * 2) * 0.5 + 0.5
        break
      case 'sawtooth':
        freqMod = ((time * baseFreq) % 1)
        break
      case 'square':
        freqMod = Math.sin(time * baseFreq * Math.PI * 2) > 0 ? 1 : 0
        break
    }

    const amplitude = amplitudeRange[0] + (amplitudeRange[1] - amplitudeRange[0]) * beatStrength
    const baseWave = Math.sin(time * (baseFreq + freqMod * 4) * Math.PI * 2)
    const harmonic = Math.sin(time * (baseFreq * 3 + freqMod * 8) * Math.PI * 2) * 0.3

    let waveValue = (baseWave + harmonic) * amplitude * beatStrength

    if (edgeFactor > 0) {
      waveValue = waveValue >= 0
        ? Math.pow(Math.abs(waveValue) / amplitude, 1 - edgeFactor * 0.6) * amplitude
        : -Math.pow(Math.abs(waveValue) / amplitude, 1 - edgeFactor * 0.6) * amplitude
    }

    return waveValue
  }

  private addSample(time: number): void {
    const rect = this.canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const centerY = height / 2

    const visibleDuration = width / this.pixelsPerSecond
    const oldestAllowedTime = time - visibleDuration - 0.1

    this.samples = this.samples.filter(s => s.time > oldestAllowedTime)

    const y = centerY + this.generateWaveValue(time)
    this.samples.push({ x: width, y, time })
  }

  private updateSamplePositions(): void {
    const rect = this.canvas.getBoundingClientRect()
    const width = rect.width

    for (let i = 0; i < this.samples.length; i++) {
      const sample = this.samples[i]
      const age = this.currentTime - sample.time
      sample.x = width - age * this.pixelsPerSecond
    }
  }

  private createGradient(y1: number, y2: number): CanvasGradient {
    const gradient = this.ctx.createLinearGradient(0, y1, 0, y2)
    const stops = this.config.colorStops
    stops.forEach((color, i) => {
      gradient.addColorStop(i / (stops.length - 1), color)
    })
    return gradient
  }

  private drawWaveform(): void {
    const rect = this.canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    this.ctx.clearRect(0, 0, width, height)

    if (this.samples.length < 2) return

    this.ctx.save()

    this.ctx.beginPath()
    this.ctx.moveTo(this.samples[0].x, this.samples[0].y)

    for (let i = 1; i < this.samples.length; i++) {
      const prev = this.samples[i - 1]
      const curr = this.samples[i]
      const cpx = (prev.x + curr.x) / 2
      const cpy = (prev.y + curr.y) / 2
      this.ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy)
    }

    const lastSample = this.samples[this.samples.length - 1]
    this.ctx.lineTo(lastSample.x, lastSample.y)

    this.ctx.lineWidth = 2
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.strokeStyle = this.createGradient(0, height)
    this.ctx.shadowColor = this.config.colorStops[0]
    this.ctx.shadowBlur = 8
    this.ctx.globalAlpha = this.fadeProgress
    this.ctx.stroke()

    this.ctx.restore()

    if (this.fadeDirection !== 0 && this.offscreenCanvas && this.offscreenCtx) {
      this.ctx.save()
      this.ctx.globalAlpha = 1 - this.fadeProgress
      this.ctx.drawImage(this.offscreenCanvas, 0, 0, width, height)
      this.ctx.restore()
    }
  }

  private drawFingerprint(): void {
    const rect = this.fingerprintCanvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const bars = 16
    const barWidth = width / bars

    this.fingerprintCtx.clearRect(0, 0, width, height)

    for (let i = 0; i < bars; i++) {
      const strength = this.config.beatPattern[i] || 0
      const barHeight = strength * (height - 8)
      const x = i * barWidth + barWidth * 0.2
      const y = height - barHeight - 2

      const gradient = this.fingerprintCtx.createLinearGradient(0, height, 0, y)
      gradient.addColorStop(0, '#1a1a2e')
      gradient.addColorStop(1, '#e94560')

      this.fingerprintCtx.fillStyle = gradient
      this.fingerprintCtx.fillRect(x, y, barWidth * 0.6, barHeight)
    }
  }

  private renderToOffscreen(): void {
    if (!this.offscreenCanvas || !this.offscreenCtx) return
    const rect = this.canvas.getBoundingClientRect()
    this.offscreenCanvas.width = rect.width
    this.offscreenCanvas.height = rect.height
    this.offscreenCtx.drawImage(this.canvas, 0, 0, rect.width, rect.height)
  }

  public setConfig(newConfig: RhythmConfig): void {
    this.renderToOffscreen()
    this.config = newConfig
    this.fadeProgress = 0
    this.fadeDirection = 1
    this.samples = []
    this.drawFingerprint()
  }

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = multiplier
  }

  public getSpeed(): number {
    return this.speedMultiplier
  }

  public start(): void {
    if (this.isPlaying) return
    this.isPlaying = true
    this.lastTimestamp = performance.now()
    this.loop(this.lastTimestamp)
  }

  public stop(): void {
    this.isPlaying = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  public reset(): void {
    this.currentTime = 0
    this.samples = []
    this.lastTimestamp = performance.now()
    this.drawWaveform()
  }

  public getCurrentTime(): number {
    return this.currentTime
  }

  public getConfig(): RhythmConfig {
    return this.config
  }

  private loop(timestamp: number): void {
    if (!this.isPlaying) return

    const deltaTime = (timestamp - this.lastTimestamp) / 1000
    this.lastTimestamp = timestamp

    this.currentTime += deltaTime * this.speedMultiplier

    if (this.fadeDirection === 1 && this.fadeProgress < 1) {
      this.fadeProgress = Math.min(1, this.fadeProgress + deltaTime * 2)
      if (this.fadeProgress >= 1) this.fadeDirection = 0
    } else if (this.fadeDirection === -1 && this.fadeProgress > 0) {
      this.fadeProgress = Math.max(0, this.fadeProgress - deltaTime * 2)
      if (this.fadeProgress <= 0) this.fadeDirection = 0
    }

    const sampleInterval = 1 / this.sampleRate
    let sampleTime = this.samples.length > 0
      ? this.samples[this.samples.length - 1].time + sampleInterval
      : this.currentTime

    while (sampleTime <= this.currentTime) {
      this.addSample(sampleTime)
      sampleTime += sampleInterval
    }

    this.updateSamplePositions()
    this.drawWaveform()

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t))
  }

  public drawStaticFrame(time: number): void {
    const rect = this.canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const visibleDuration = width / this.pixelsPerSecond
    const startTime = time - visibleDuration

    this.samples = []
    const sampleInterval = 1 / this.sampleRate
    for (let t = startTime; t <= time; t += sampleInterval) {
      const y = height / 2 + this.generateWaveValue(t)
      const x = (t - startTime) * this.pixelsPerSecond
      this.samples.push({ x, y, time: t })
    }

    this.drawWaveform()
  }

  public getBeatPositionAtTime(time: number): number {
    const bpm = this.config.bpm
    const beatDuration = 60 / bpm
    const totalBeats = (time / beatDuration) % 16
    return totalBeats / 16
  }

  public getDisplayBpm(): { current: number; original: number } {
    return {
      current: Math.round(this.config.bpm * this.speedMultiplier),
      original: this.config.bpm
    }
  }
}
