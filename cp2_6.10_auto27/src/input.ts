export interface InputState {
  jumpPressed: boolean
  jumpHeld: boolean
  slideHeld: boolean
}

type InputCallback = (action: 'jump' | 'slideStart' | 'slideEnd') => void

export class InputManager {
  private state: InputState = {
    jumpPressed: false,
    jumpHeld: false,
    slideHeld: false
  }

  private callbacks: Set<InputCallback> = new Set()
  private touchStartY: number | null = null
  private touchStartTime: number = 0
  private readonly SWIPE_THRESHOLD = 30

  constructor(private readonly target: HTMLElement) {
    this.bindEvents()
  }

  on(callback: InputCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  getState(): InputState {
    const s = { ...this.state }
    this.state.jumpPressed = false
    return s
  }

  private emit(action: 'jump' | 'slideStart' | 'slideEnd'): void {
    this.callbacks.forEach(cb => cb(action))
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)

    this.target.addEventListener('mousedown', this.onMouseDown)

    this.target.addEventListener('touchstart', this.onTouchStart, { passive: false })
    this.target.addEventListener('touchmove', this.onTouchMove, { passive: false })
    this.target.addEventListener('touchend', this.onTouchEnd, { passive: false })
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.target.removeEventListener('mousedown', this.onMouseDown)
    this.target.removeEventListener('touchstart', this.onTouchStart)
    this.target.removeEventListener('touchmove', this.onTouchMove)
    this.target.removeEventListener('touchend', this.onTouchEnd)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      if (!this.state.jumpHeld) {
        this.state.jumpPressed = true
        this.emit('jump')
      }
      this.state.jumpHeld = true
      e.preventDefault()
    } else if (e.code === 'ArrowDown') {
      if (!this.state.slideHeld) {
        this.emit('slideStart')
      }
      this.state.slideHeld = true
      e.preventDefault()
    }
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      this.state.jumpHeld = false
    } else if (e.code === 'ArrowDown') {
      this.state.slideHeld = false
      this.emit('slideEnd')
    }
  }

  private onMouseDown = (): void => {
    this.state.jumpPressed = true
    this.state.jumpHeld = true
    this.emit('jump')
    setTimeout(() => {
      this.state.jumpHeld = false
    }, 100)
  }

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length > 0) {
      this.touchStartY = e.touches[0].clientY
      this.touchStartTime = Date.now()
    }
    e.preventDefault()
  }

  private onTouchMove = (e: TouchEvent): void => {
    if (this.touchStartY === null || e.touches.length === 0) return
    const deltaY = e.touches[0].clientY - this.touchStartY
    if (deltaY > this.SWIPE_THRESHOLD && !this.state.slideHeld) {
      this.state.slideHeld = true
      this.emit('slideStart')
    }
    e.preventDefault()
  }

  private onTouchEnd = (e: TouchEvent): void => {
    const touchDuration = Date.now() - this.touchStartTime
    if (this.touchStartY !== null) {
      const changedTouch = e.changedTouches[0]
      if (changedTouch) {
        const deltaY = changedTouch.clientY - this.touchStartY
        if (deltaY < -this.SWIPE_THRESHOLD / 2 || (touchDuration < 200 && Math.abs(deltaY) < this.SWIPE_THRESHOLD)) {
          this.state.jumpPressed = true
          this.state.jumpHeld = true
          this.emit('jump')
          setTimeout(() => {
            this.state.jumpHeld = false
          }, 100)
        }
      }
    }
    if (this.state.slideHeld) {
      this.state.slideHeld = false
      this.emit('slideEnd')
    }
    this.touchStartY = null
    e.preventDefault()
  }
}
