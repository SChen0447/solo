import { rhythmConfigs, getConfigById } from './data/rhythmConfigs'
import { RhythmVisualizer } from './core/RhythmVisualizer'
import { ComparisonController, UIElements } from './ui/ComparisonController'

const LOCKED_SVG = `
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
`

const UNLOCKED_SVG = `
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
  <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
`

const PLAY_SVG = `<path d="M8 5v14l11-7z"/>`
const PAUSE_SVG = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`

class AppManager {
  private leftVisualizer!: RhythmVisualizer
  private rightVisualizer!: RhythmVisualizer
  private comparisonController!: ComparisonController
  private isPlaying: boolean = true
  private leftLocked: boolean = false
  private rightLocked: boolean = false
  private leftConfigId: string = 'jazz'
  private rightConfigId: string = 'electronic'
  private animationLoopId: number | null = null

  constructor() {
    this.init()
  }

  private init(): void {
    const leftCanvas = document.getElementById('leftCanvas') as HTMLCanvasElement
    const rightCanvas = document.getElementById('rightCanvas') as HTMLCanvasElement
    const leftFpCanvas = document.getElementById('leftFingerprintCanvas') as HTMLCanvasElement
    const rightFpCanvas = document.getElementById('rightFingerprintCanvas') as HTMLCanvasElement

    if (!leftCanvas || !rightCanvas || !leftFpCanvas || !rightFpCanvas) {
      console.error('Canvas elements not found')
      return
    }

    const leftConfig = getConfigById(this.leftConfigId) || rhythmConfigs[0]
    const rightConfig = getConfigById(this.rightConfigId) || rhythmConfigs[1]

    this.leftVisualizer = new RhythmVisualizer(leftCanvas, leftFpCanvas, leftConfig)
    this.rightVisualizer = new RhythmVisualizer(rightCanvas, rightFpCanvas, rightConfig)

    this.populateGenreSelects()

    const uiElements: UIElements = {
      slider: document.getElementById('railSlider') as HTMLElement,
      rail: document.getElementById('comparisonRail') as HTMLElement,
      leftFingerprintDot: document.getElementById('leftFingerprintDot') as HTMLElement,
      rightFingerprintDot: document.getElementById('rightFingerprintDot') as HTMLElement,
      leftFingerprintContainer: document.getElementById('leftFingerprint') as HTMLElement,
      rightFingerprintContainer: document.getElementById('rightFingerprint') as HTMLElement,
      leftGenreName: document.getElementById('leftGenreName') as HTMLElement,
      leftBpm: document.getElementById('leftBpm') as HTMLElement,
      leftBpmOriginal: document.getElementById('leftBpmOriginal') as HTMLElement,
      leftTimeSig: document.getElementById('leftTimeSig') as HTMLElement,
      leftGroove: document.getElementById('leftGroove') as HTMLElement,
      rightGenreName: document.getElementById('rightGenreName') as HTMLElement,
      rightBpm: document.getElementById('rightBpm') as HTMLElement,
      rightBpmOriginal: document.getElementById('rightBpmOriginal') as HTMLElement,
      rightTimeSig: document.getElementById('rightTimeSig') as HTMLElement,
      rightGroove: document.getElementById('rightGroove') as HTMLElement
    }

    this.comparisonController = new ComparisonController(
      this.leftVisualizer,
      this.rightVisualizer,
      uiElements
    )

    this.bindGlobalEvents()
    this.startUiUpdateLoop()
    this.leftVisualizer.start()
    this.rightVisualizer.start()
    this.updatePlayButton()
  }

  private populateGenreSelects(): void {
    const leftSelect = document.getElementById('leftGenreSelect') as HTMLSelectElement
    const rightSelect = document.getElementById('rightGenreSelect') as HTMLSelectElement

    rhythmConfigs.forEach((config) => {
      const opt1 = document.createElement('option')
      opt1.value = config.id
      opt1.textContent = config.name
      leftSelect.appendChild(opt1)

      const opt2 = document.createElement('option')
      opt2.value = config.id
      opt2.textContent = config.name
      rightSelect.appendChild(opt2)
    })

    leftSelect.value = this.leftConfigId
    rightSelect.value = this.rightConfigId
  }

  private bindGlobalEvents(): void {
    const playBtn = document.getElementById('playBtn') as HTMLButtonElement
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
    const speedSelector = document.getElementById('speedSelector') as HTMLElement
    const leftSelect = document.getElementById('leftGenreSelect') as HTMLSelectElement
    const rightSelect = document.getElementById('rightGenreSelect') as HTMLSelectElement
    const leftLockBtn = document.getElementById('leftLockBtn') as HTMLButtonElement
    const rightLockBtn = document.getElementById('rightLockBtn') as HTMLButtonElement
    const leftLockIcon = document.getElementById('leftLockIcon') as unknown as SVGElement
    const rightLockIcon = document.getElementById('rightLockIcon') as unknown as SVGElement

    playBtn.addEventListener('click', () => this.togglePlay())
    resetBtn.addEventListener('click', () => this.reset())

    speedSelector.querySelectorAll('.speed-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const speed = parseFloat(target.dataset.speed || '1')
        this.setSpeed(speed)
      })
    })

    leftSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement
      if (!this.leftLocked) {
        this.setGenre('left', target.value)
      } else {
        target.value = this.leftConfigId
      }
    })

    rightSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement
      if (!this.rightLocked) {
        this.setGenre('right', target.value)
      } else {
        target.value = this.rightConfigId
      }
    })

    leftLockBtn.addEventListener('click', () => {
      this.leftLocked = !this.leftLocked
      this.updateLockButton('left', leftLockBtn, leftLockIcon)
    })

    rightLockBtn.addEventListener('click', () => {
      this.rightLocked = !this.rightLocked
      this.updateLockButton('right', rightLockBtn, rightLockIcon)
    })

    window.addEventListener('resize', () => {
      this.leftVisualizer.resize()
      this.rightVisualizer.resize()
    })
  }

  private updateLockButton(
    side: 'left' | 'right',
    btn: HTMLButtonElement,
    icon: SVGElement
  ): void {
    const locked = side === 'left' ? this.leftLocked : this.rightLocked
    if (locked) {
      btn.classList.add('locked')
      icon.innerHTML = LOCKED_SVG
    } else {
      btn.classList.remove('locked')
      icon.innerHTML = UNLOCKED_SVG
    }
    this.comparisonController.setLockIcon(side, locked)
  }

  private togglePlay(): void {
    this.isPlaying = !this.isPlaying
    if (this.isPlaying) {
      this.leftVisualizer.start()
      this.rightVisualizer.start()
    } else {
      this.leftVisualizer.stop()
      this.rightVisualizer.stop()
    }
    this.updatePlayButton()
  }

  private updatePlayButton(): void {
    const playIcon = document.getElementById('playIcon') as unknown as SVGElement
    if (this.isPlaying) {
      playIcon.innerHTML = PAUSE_SVG
      ;(document.getElementById('playBtn') as HTMLElement).classList.add('playing')
    } else {
      playIcon.innerHTML = PLAY_SVG
      ;(document.getElementById('playBtn') as HTMLElement).classList.remove('playing')
    }
  }

  private reset(): void {
    this.leftVisualizer.reset()
    this.rightVisualizer.reset()
    this.comparisonController.setPosition(0.5)
    if (!this.isPlaying) {
      this.leftVisualizer.drawStaticFrame(0)
      this.rightVisualizer.drawStaticFrame(0)
    }
  }

  private setSpeed(speed: number): void {
    this.leftVisualizer.setSpeed(speed)
    this.rightVisualizer.setSpeed(speed)

    document.querySelectorAll('.speed-btn').forEach((btn) => {
      const b = btn as HTMLElement
      if (parseFloat(b.dataset.speed || '1') === speed) {
        b.classList.add('active')
      } else {
        b.classList.remove('active')
      }
    })

    this.comparisonController.refresh()
  }

  private setGenre(side: 'left' | 'right', configId: string): void {
    const config = getConfigById(configId)
    if (!config) return

    if (side === 'left') {
      this.leftConfigId = configId
      this.leftVisualizer.setConfig(config)
    } else {
      this.rightConfigId = configId
      this.rightVisualizer.setConfig(config)
    }

    this.comparisonController.refresh()
  }

  private startUiUpdateLoop(): void {
    const loop = () => {
      this.comparisonController.refresh()
      this.animationLoopId = requestAnimationFrame(loop)
    }
    this.animationLoopId = requestAnimationFrame(loop)
  }

  public destroy(): void {
    if (this.animationLoopId !== null) {
      cancelAnimationFrame(this.animationLoopId)
    }
    this.leftVisualizer.stop()
    this.rightVisualizer.stop()
    this.comparisonController.destroy()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AppManager()
})
