import { SimulationStats } from './simulation'

export class StatsPanel {
  private container: HTMLDivElement
  private particleCountEl: HTMLSpanElement
  private collisionCountEl: HTMLSpanElement
  private averageSpeedEl: HTMLSpanElement
  private fpsEl: HTMLSpanElement

  constructor() {
    this.container = document.createElement('div')
    this.container.id = 'stats-panel'
    this.container.innerHTML = `
      <div class="stats-row">
        <span class="stats-label">粒子总数</span>
        <span class="stats-value" id="stat-particles">0</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">碰撞次数</span>
        <span class="stats-value" id="stat-collisions">0</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">平均速度</span>
        <span class="stats-value" id="stat-speed">0.00</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">帧率 FPS</span>
        <span class="stats-value" id="stat-fps">0</span>
      </div>
    `
    document.body.appendChild(this.container)

    this.particleCountEl = document.getElementById('stat-particles') as HTMLSpanElement
    this.collisionCountEl = document.getElementById('stat-collisions') as HTMLSpanElement
    this.averageSpeedEl = document.getElementById('stat-speed') as HTMLSpanElement
    this.fpsEl = document.getElementById('stat-fps') as HTMLSpanElement
  }

  update(stats: SimulationStats, fps: number): void {
    this.particleCountEl.textContent = stats.particleCount.toString()
    this.collisionCountEl.textContent = stats.collisionCount.toString()
    this.averageSpeedEl.textContent = stats.averageSpeed.toFixed(2)
    this.fpsEl.textContent = Math.round(fps).toString()

    if (fps >= 55) {
      this.fpsEl.style.color = '#7fff7f'
    } else if (fps >= 30) {
      this.fpsEl.style.color = '#ffff7f'
    } else {
      this.fpsEl.style.color = '#ff7f7f'
    }
  }
}
