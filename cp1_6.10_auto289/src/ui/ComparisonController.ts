import { RhythmVisualizer } from '../core/RhythmVisualizer'

export interface UIElements {
  slider: HTMLElement
  rail: HTMLElement
  leftFingerprintDot: HTMLElement
  rightFingerprintDot: HTMLElement
  leftFingerprintContainer: HTMLElement
  rightFingerprintContainer: HTMLElement
  leftGenreName: HTMLElement
  leftBpm: HTMLElement
  leftBpmOriginal: HTMLElement
  leftTimeSig: HTMLElement
  leftGroove: HTMLElement
  rightGenreName: HTMLElement
  rightBpm: HTMLElement
  rightBpmOriginal: HTMLElement
  rightTimeSig: HTMLElement
  rightGroove: HTMLElement
  leftLockIconContainer?: HTMLElement
  rightLockIconContainer?: HTMLElement
}

export class ComparisonController {
  private slider: HTMLElement
  private rail: HTMLElement
  private leftVisualizer: RhythmVisualizer
  private rightVisualizer: RhythmVisualizer
  private ui: UIElements
  private isDragging: boolean = false
  private position: number = 0.5
  private isHorizontal: boolean = false
  private onSliderChange?: (position: number) => void

  constructor(
    leftVisualizer: RhythmVisualizer,
    rightVisualizer: RhythmVisualizer,
    ui: UIElements,
    onSliderChange?: (position: number) => void
  ) {
    this.leftVisualizer = leftVisualizer
    this.rightVisualizer = rightVisualizer
    this.ui = ui
    this.slider = ui.slider
    this.rail = ui.rail
    this.onSliderChange = onSliderChange

    this.checkOrientation()
    this.setPosition(0.5)
    this.bindEvents()
    this.updateInfoPanels()
    this.updateFingerprintDots()
  }

  private checkOrientation(): void {
    this.isHorizontal = window.innerWidth <= 768
  }

  private bindEvents(): void {
    this.slider.addEventListener('mousedown', this.handleDragStart)
    this.slider.addEventListener('touchstart', this.handleTouchStart, { passive: false })
    document.addEventListener('mousemove', this.handleDragMove)
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false })
    document.addEventListener('mouseup', this.handleDragEnd)
    document.addEventListener('touchend', this.handleDragEnd)
    window.addEventListener('resize', this.handleResize)
  }

  private handleDragStart = (e: MouseEvent): void => {
    e.preventDefault()
    this.isDragging = true
    this.slider.classList.add('dragging')
  }

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault()
    this.isDragging = true
    this.slider.classList.add('dragging')
  }

  private handleDragMove = (e: MouseEvent): void => {
    if (!this.isDragging) return
    this.updatePositionFromPointer(e.clientX, e.clientY)
  }

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || e.touches.length === 0) return
    e.preventDefault()
    const touch = e.touches[0]
    this.updatePositionFromPointer(touch.clientX, touch.clientY)
  }

  private updatePositionFromPointer(clientX: number, clientY: number): void {
    this.checkOrientation()
    const rect = this.rail.getBoundingClientRect()

    if (this.isHorizontal) {
      const x = clientX - rect.left
      this.position = Math.max(0, Math.min(1, x / rect.width))
    } else {
      const y = clientY - rect.top
      this.position = Math.max(0, Math.min(1, y / rect.height))
    }

    this.applyPosition()
    this.updateInfoPanels()
    this.updateFingerprintDots()

    if (this.onSliderChange) {
      this.onSliderChange(this.position)
    }
  }

  private handleDragEnd = (): void => {
    this.isDragging = false
    this.slider.classList.remove('dragging')
  }

  private handleResize = (): void => {
    this.checkOrientation()
    this.applyPosition()
    this.updateFingerprintDots()
  }

  private applyPosition(): void {
    if (this.isHorizontal) {
      this.slider.style.left = `${this.position * 100}%`
      this.slider.style.top = '50%'
    } else {
      this.slider.style.top = `${this.position * 100}%`
      this.slider.style.left = '50%'
    }
  }

  public setPosition(position: number): void {
    this.position = Math.max(0, Math.min(1, position))
    this.applyPosition()
    this.updateInfoPanels()
    this.updateFingerprintDots()
  }

  public getPosition(): number {
    return this.position
  }

  private getTimeFromPosition(): { left: number; right: number } {
    const leftCurrentTime = this.leftVisualizer.getCurrentTime()
    const rightCurrentTime = this.rightVisualizer.getCurrentTime()

    const rect = this.slider.closest('.canvas-container')?.getBoundingClientRect()
    const visibleDuration = rect ? rect.width / 200 : 3

    const leftTime = Math.max(0, leftCurrentTime - visibleDuration * (1 - this.position))
    const rightTime = Math.max(0, rightCurrentTime - visibleDuration * (1 - this.position))

    return { left: leftTime, right: rightTime }
  }

  public updateInfoPanels(): void {
    const leftConfig = this.leftVisualizer.getConfig()
    const rightConfig = this.rightVisualizer.getConfig()
    const leftBpmData = this.leftVisualizer.getDisplayBpm()
    const rightBpmData = this.rightVisualizer.getDisplayBpm()

    this.ui.leftGenreName.innerHTML = `<span>${leftConfig.name}</span>`
    this.ui.rightGenreName.innerHTML = `<span>${rightConfig.name}</span>`

    this.ui.leftBpm.innerHTML = `${leftBpmData.current}`
    if (this.leftVisualizer.getSpeed() !== 1) {
      this.ui.leftBpmOriginal.textContent = `${leftBpmData.original}`
      this.ui.leftBpm.appendChild(this.ui.leftBpmOriginal)
    } else {
      this.ui.leftBpmOriginal.textContent = ''
    }

    this.ui.rightBpm.innerHTML = `${rightBpmData.current}`
    if (this.rightVisualizer.getSpeed() !== 1) {
      this.ui.rightBpmOriginal.textContent = `${rightBpmData.original}`
      this.ui.rightBpm.appendChild(this.ui.rightBpmOriginal)
    } else {
      this.ui.rightBpmOriginal.textContent = ''
    }

    this.ui.leftTimeSig.textContent = leftConfig.timeSignature
    this.ui.rightTimeSig.textContent = rightConfig.timeSignature

    this.ui.leftGroove.textContent = leftConfig.grooveDescription
    this.ui.rightGroove.textContent = rightConfig.grooveDescription
  }

  private updateFingerprintDots(): void {
    const times = this.getTimeFromPosition()

    const leftBeatPos = this.leftVisualizer.getBeatPositionAtTime(times.left)
    const rightBeatPos = this.rightVisualizer.getBeatPositionAtTime(times.right)

    this.ui.leftFingerprintDot.style.left = `${leftBeatPos * 100}%`
    this.ui.leftFingerprintDot.style.top = '50%'

    this.ui.rightFingerprintDot.style.left = `${rightBeatPos * 100}%`
    this.ui.rightFingerprintDot.style.top = '50%'
  }

  public setLockIcon(side: 'left' | 'right', locked: boolean): void {
    const nameEl = side === 'left' ? this.ui.leftGenreName : this.ui.rightGenreName
    const existingIcon = nameEl.querySelector('.lock-icon-inline')
    if (locked) {
      if (!existingIcon) {
        const lockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        lockSvg.setAttribute('class', 'lock-icon-inline')
        lockSvg.setAttribute('width', '16')
        lockSvg.setAttribute('height', '16')
        lockSvg.setAttribute('viewBox', '0 0 24 24')
        lockSvg.setAttribute('fill', 'none')
        lockSvg.setAttribute('stroke', '#ffd93d')
        lockSvg.setAttribute('stroke-width', '2.5')
        lockSvg.setAttribute('stroke-linecap', 'round')
        lockSvg.setAttribute('stroke-linejoin', 'round')
        lockSvg.style.flexShrink = '0'
        lockSvg.innerHTML = `
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        `
        const span = nameEl.querySelector('span')
        if (span) {
          nameEl.insertBefore(lockSvg, span)
        } else {
          nameEl.appendChild(lockSvg)
        }
      }
    } else {
      if (existingIcon) {
        existingIcon.remove()
      }
    }
  }

  public refresh(): void {
    this.updateInfoPanels()
    this.updateFingerprintDots()
  }

  public destroy(): void {
    this.slider.removeEventListener('mousedown', this.handleDragStart)
    this.slider.removeEventListener('touchstart', this.handleTouchStart)
    document.removeEventListener('mousemove', this.handleDragMove)
    document.removeEventListener('touchmove', this.handleTouchMove)
    document.removeEventListener('mouseup', this.handleDragEnd)
    document.removeEventListener('touchend', this.handleDragEnd)
    window.removeEventListener('resize', this.handleResize)
  }
}
