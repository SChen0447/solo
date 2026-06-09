export class UIOverlay {
  private container: HTMLElement
  private panel: HTMLDivElement
  private particleCountEl: HTMLSpanElement
  private obstacleCountEl: HTMLSpanElement
  private fpsEl: HTMLDivElement
  private fpsValueEl: HTMLSpanElement
  private fpsBorderAnim: HTMLStyleElement | null = null
  private helpEl: HTMLDivElement
  private warningEl: HTMLDivElement
  private lastUpdateTime = 0
  private fpsHistory: number[] = []
  private currentParticleCount = 0
  private currentObstacleCount = 0
  private currentFps = 0
  private lowFpsStartTime = 0
  private recoveryStartTime = 0
  private isDegraded = false
  private onPerformanceChange: ((degraded: boolean) => void) | null = null

  constructor(container: HTMLElement) {
    this.container = container

    this.panel = document.createElement('div')
    this.panel.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 6px;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(100, 150, 255, 0.2);
      font-family: monospace;
      user-select: none;
      pointer-events: none;
      z-index: 100;
    `

    const particleLine = document.createElement('div')
    particleLine.style.cssText = `font-size: 16px; color: #ffffff; margin-bottom: 6px; line-height: 1.5;`
    particleLine.innerHTML = `粒子数: <span id="pf-particles">0</span> / 2000`
    this.particleCountEl = particleLine.querySelector('#pf-particles') as HTMLSpanElement

    const obstacleLine = document.createElement('div')
    obstacleLine.style.cssText = `font-size: 16px; color: #4488ff; margin-bottom: 6px; line-height: 1.5;`
    obstacleLine.innerHTML = `障碍物: <span id="pf-obstacles">0</span> / 15`
    this.obstacleCountEl = obstacleLine.querySelector('#pf-obstacles') as HTMLSpanElement

    this.fpsEl = document.createElement('div')
    this.fpsEl.style.cssText = `
      display: inline-block;
      font-size: 16px;
      margin-bottom: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(50, 200, 80, 0.7);
      color: #ffffff;
      font-weight: bold;
      transition: background 0.3s, color 0.3s;
      line-height: 1.5;
    `
    this.fpsEl.innerHTML = `FPS: <span id="pf-fps">60</span>`
    this.fpsValueEl = this.fpsEl.querySelector('#pf-fps') as HTMLSpanElement

    const fpsWrap = document.createElement('div')
    fpsWrap.style.marginBottom = '10px'
    fpsWrap.appendChild(this.fpsEl)

    this.helpEl = document.createElement('div')
    this.helpEl.style.cssText = `
      font-size: 13px;
      color: rgba(180, 180, 200, 0.6);
      line-height: 1.8;
      border-top: 1px solid rgba(100, 150, 255, 0.15);
      padding-top: 10px;
    `
    this.helpEl.innerHTML = `
      <div>LMB: 创建喷泉</div>
      <div>拖拽: 连续喷泉</div>
      <div>RMB: 放置障碍</div>
      <div>Shift+RMB: 删除障碍</div>
      <div>拖拽旋转 / 滚轮缩放</div>
    `

    this.warningEl = document.createElement('div')
    this.warningEl.style.cssText = `
      display: none;
      margin-top: 10px;
      padding: 6px 10px;
      background: rgba(255, 80, 80, 0.3);
      border: 1px solid rgba(255, 80, 80, 0.6);
      border-radius: 4px;
      font-size: 13px;
      color: #ff6666;
      font-weight: bold;
      animation: pf-pulse 1s infinite;
    `
    this.warningEl.textContent = '⚠ 性能降级'

    const style = document.createElement('style')
    style.textContent = `
      @keyframes pf-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes pf-border-flash {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255, 60, 60, 0.8); }
        50% { box-shadow: 0 0 0 3px rgba(255, 60, 60, 0.4); }
      }
    `
    document.head.appendChild(style)

    this.panel.appendChild(particleLine)
    this.panel.appendChild(obstacleLine)
    this.panel.appendChild(fpsWrap)
    this.panel.appendChild(this.helpEl)
    this.panel.appendChild(this.warningEl)

    this.container.appendChild(this.panel)
  }

  public setOnPerformanceChange(callback: (degraded: boolean) => void): void {
    this.onPerformanceChange = callback
  }

  public update(particleCount: number, obstacleCount: number, instantFps: number): void {
    this.currentParticleCount = particleCount
    this.currentObstacleCount = obstacleCount
    this.fpsHistory.push(instantFps)
    if (this.fpsHistory.length > 15) {
      this.fpsHistory.shift()
    }

    const now = performance.now()
    if (now - this.lastUpdateTime >= 500) {
      this.lastUpdateTime = now
      const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      this.currentFps = Math.round(avgFps)
      this.renderUi()
      this.checkPerformance(avgFps)
    }
  }

  private renderUi(): void {
    this.particleCountEl.textContent = String(this.currentParticleCount)
    this.obstacleCountEl.textContent = String(this.currentObstacleCount)
    this.fpsValueEl.textContent = String(this.currentFps)

    if (this.currentFps < 30) {
      this.fpsEl.style.background = 'rgba(255, 60, 60, 0.7)'
      this.fpsEl.style.color = '#ffffff'
      this.fpsEl.style.animation = 'pf-border-flash 0.6s infinite'
    } else {
      this.fpsEl.style.background = 'rgba(50, 200, 80, 0.7)'
      this.fpsEl.style.color = '#ffffff'
      this.fpsEl.style.animation = 'none'
    }
  }

  private checkPerformance(avgFps: number): void {
    if (!this.isDegraded) {
      if (avgFps < 40) {
        if (this.lowFpsStartTime === 0) {
          this.lowFpsStartTime = performance.now()
        } else if (performance.now() - this.lowFpsStartTime > 1000) {
          this.isDegraded = true
          this.warningEl.style.display = 'block'
          this.onPerformanceChange?.(true)
        }
      } else {
        this.lowFpsStartTime = 0
      }
    } else {
      if (avgFps >= 50) {
        if (this.recoveryStartTime === 0) {
          this.recoveryStartTime = performance.now()
        } else if (performance.now() - this.recoveryStartTime > 3000) {
          this.isDegraded = false
          this.warningEl.style.display = 'none'
          this.onPerformanceChange?.(false)
          this.recoveryStartTime = 0
          this.lowFpsStartTime = 0
        }
      } else {
        this.recoveryStartTime = 0
      }
    }
  }

  public isPerformanceDegraded(): boolean {
    return this.isDegraded
  }

  public dispose(): void {
    this.panel.remove()
  }
}
