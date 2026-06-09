import { POTIONS, type Potion, type PotionColor } from './recipeBook'

export class PotionShelf {
  private container: HTMLElement
  private bottles: HTMLDivElement[] = []
  private dragging: {
    bottle: HTMLDivElement
    potion: Potion
    ghost: HTMLDivElement
    startX: number
    startY: number
    origX: number
    origY: number
  } | null = null
  private onPotionSelected: ((potion: Potion) => void) | null = null
  private isInCauldronZone: ((x: number, y: number) => boolean) | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.render()
  }

  setOnPotionSelected(callback: (potion: Potion) => void): void {
    this.onPotionSelected = callback
  }

  setCauldronZoneChecker(checker: (x: number, y: number) => boolean): void {
    this.isInCauldronZone = checker
  }

  private render(): void {
    this.container.innerHTML = ''
    this.bottles = []

    POTIONS.forEach(potion => {
      const bottle = this.createBottle(potion)
      this.container.appendChild(bottle)
      this.bottles.push(bottle)
    })

    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))
  }

  private createBottle(potion: Potion): HTMLDivElement {
    const bottle = document.createElement('div')
    bottle.className = 'potion-bottle'
    bottle.dataset.color = potion.color
    bottle.dataset.id = potion.id
    bottle.title = potion.name

    const body = document.createElement('div')
    body.className = 'potion-body'
    body.style.background = `linear-gradient(135deg, ${this.lighten(potion.color, 30)} 0%, ${potion.color} 50%, ${this.darken(potion.color, 30)} 100%)`
    body.style.border = `2px solid rgba(255,255,255,0.7)`

    const neck = document.createElement('div')
    neck.className = 'potion-neck'
    neck.style.background = `linear-gradient(135deg, ${this.lighten(potion.color, 20)}, ${this.darken(potion.color, 20)})`
    neck.style.border = `2px solid rgba(255,255,255,0.7)`

    const cork = document.createElement('div')
    cork.className = 'potion-cork'

    const label = document.createElement('div')
    label.className = 'potion-label'
    label.textContent = potion.name

    bottle.appendChild(cork)
    bottle.appendChild(neck)
    bottle.appendChild(body)
    bottle.appendChild(label)

    bottle.addEventListener('mousedown', (e) => this.onMouseDown(e, bottle, potion))

    return bottle
  }

  private lighten(hex: string, percent: number): string {
    const { r, g, b } = this.parseHex(hex)
    const amt = Math.round(2.55 * percent)
    return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`
  }

  private darken(hex: string, percent: number): string {
    const { r, g, b } = this.parseHex(hex)
    const amt = Math.round(2.55 * percent)
    return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`
  }

  private parseHex(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 }
  }

  private onMouseDown(e: MouseEvent, bottle: HTMLDivElement, potion: Potion): void {
    e.preventDefault()
    const rect = bottle.getBoundingClientRect()

    bottle.classList.add('pressed')
    setTimeout(() => bottle.classList.remove('pressed'), 100)

    const ghost = bottle.cloneNode(true) as HTMLDivElement
    ghost.className = 'potion-bottle dragging'
    ghost.style.position = 'fixed'
    ghost.style.left = rect.left + 'px'
    ghost.style.top = rect.top + 'px'
    ghost.style.width = rect.width + 'px'
    ghost.style.height = rect.height + 'px'
    ghost.style.pointerEvents = 'none'
    ghost.style.zIndex = '1000'
    document.body.appendChild(ghost)

    this.dragging = {
      bottle,
      potion,
      ghost,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top
    }

    bottle.style.opacity = '0.3'
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragging) return
    const dx = e.clientX - this.dragging.startX
    const dy = e.clientY - this.dragging.startY
    this.dragging.ghost.style.left = (this.dragging.origX + dx) + 'px'
    this.dragging.ghost.style.top = (this.dragging.origY + dy) + 'px'
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.dragging) return

    const { ghost, bottle, potion, origX, origY } = this.dragging
    const dx = e.clientX - this.dragging.startX
    const dy = e.clientY - this.dragging.startY
    const finalX = origX + dx
    const finalY = origY + dy

    const inCauldron = this.isInCauldronZone ? this.isInCauldronZone(e.clientX, e.clientY) : false

    if (inCauldron) {
      ghost.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
      ghost.style.transform = 'scale(0.3) rotate(60deg)'
      ghost.style.opacity = '0'
      setTimeout(() => {
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost)
        bottle.style.opacity = '1'
        if (this.onPotionSelected) this.onPotionSelected(potion)
      }, 300)
    } else {
      ghost.style.transition = 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease'
      ghost.style.left = origX + 'px'
      ghost.style.top = origY + 'px'
      setTimeout(() => {
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost)
        bottle.style.opacity = '1'
      }, 400)
    }

    this.dragging = null
  }

  destroy(): void {
    document.removeEventListener('mousemove', this.onMouseMove.bind(this))
    document.removeEventListener('mouseup', this.onMouseUp.bind(this))
  }
}
