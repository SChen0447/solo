export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type ObstacleType = 'spike' | 'drone' | 'billboard'

export abstract class Entity {
  x: number
  y: number
  w: number
  h: number
  active: boolean = true

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
  }

  getRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h }
  }

  collidesWith(other: Entity): boolean {
    const a = this.getCollisionRect()
    const b = other.getCollisionRect()
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  }

  abstract getCollisionRect(): Rect
  abstract update(dt: number, speed: number): void
}

export type PlayerState = 'idle' | 'running' | 'jumping' | 'landing' | 'sliding'

export class Player extends Entity {
  static readonly GROUND_Y = 370
  static readonly NORMAL_W = 40
  static readonly NORMAL_H = 40
  static readonly SLIDE_W = 56
  static readonly SLIDE_H = 20
  static readonly JUMP_HEIGHT = 120
  static readonly GRAVITY = 1800
  static readonly JUMP_VELOCITY = -Math.sqrt(2 * Player.GRAVITY * Player.JUMP_HEIGHT)
  static readonly SLIDE_DURATION = 0.5
  static readonly LAND_BUFFER = 0.1

  vy: number = 0
  state: PlayerState = 'running'
  facing: number = 1
  animTime: number = 0
  private stateTime: number = 0
  private targetState: PlayerState = 'running'
  onGround: boolean = true

  constructor(x: number) {
    super(x, Player.GROUND_Y, Player.NORMAL_W, Player.NORMAL_H)
  }

  reset(): void {
    this.y = Player.GROUND_Y
    this.w = Player.NORMAL_W
    this.h = Player.NORMAL_H
    this.vy = 0
    this.state = 'running'
    this.targetState = 'running'
    this.stateTime = 0
    this.animTime = 0
    this.onGround = true
    this.active = true
  }

  jump(): boolean {
    if (this.onGround && this.state !== 'sliding' && this.state !== 'landing') {
      this.vy = Player.JUMP_VELOCITY
      this.onGround = false
      this.state = 'jumping'
      this.targetState = 'jumping'
      this.stateTime = 0
      return true
    }
    return false
  }

  startSlide(): boolean {
    if (this.onGround && this.state !== 'sliding' && this.state !== 'landing') {
      this.state = 'sliding'
      this.targetState = 'sliding'
      this.stateTime = 0
      this.w = Player.SLIDE_W
      this.h = Player.SLIDE_H
      this.y = Player.GROUND_Y + (Player.NORMAL_H - Player.SLIDE_H)
      return true
    }
    return false
  }

  endSlide(): void {
    if (this.state === 'sliding') {
      this.w = Player.NORMAL_W
      this.h = Player.NORMAL_H
      this.y = Player.GROUND_Y
      this.state = 'running'
      this.targetState = 'running'
      this.stateTime = 0
    }
  }

  getCollisionRect(): Rect {
    if (this.state === 'sliding') {
      return {
        x: this.x + 4,
        y: this.y + 2,
        w: this.w - 8,
        h: this.h - 4
      }
    }
    return {
      x: this.x + 6,
      y: this.y + 4,
      w: this.w - 12,
      h: this.h - 6
    }
  }

  update(dt: number): void {
    this.animTime += dt
    this.stateTime += dt

    if (!this.onGround) {
      this.vy += Player.GRAVITY * dt
      this.y += this.vy * dt
      if (this.y >= Player.GROUND_Y) {
        this.y = Player.GROUND_Y
        this.vy = 0
        this.onGround = true
        this.state = 'landing'
        this.stateTime = 0
      }
    }

    if (this.state === 'landing' && this.stateTime >= Player.LAND_BUFFER) {
      if (this.targetState === 'sliding') {
        this.state = 'sliding'
        this.w = Player.SLIDE_W
        this.h = Player.SLIDE_H
        this.y = Player.GROUND_Y + (Player.NORMAL_H - Player.SLIDE_H)
      } else {
        this.state = 'running'
      }
      this.stateTime = 0
    }

    if (this.state === 'sliding' && this.stateTime >= Player.SLIDE_DURATION) {
      this.endSlide()
    }
  }
}

export class Obstacle extends Entity {
  type: ObstacleType
  animTime: number = 0

  constructor(type: ObstacleType, x: number, groundY: number) {
    let w: number, h: number, y: number
    switch (type) {
      case 'spike':
        w = 28; h = 32
        y = groundY + 8
        break
      case 'drone':
        w = 44; h = 28
        y = groundY - 70
        break
      case 'billboard':
        w = 60; h = 90
        y = groundY - 50
        break
      default:
        w = 30; h = 30; y = groundY
    }
    super(x, y, w, h)
    this.type = type
  }

  getCollisionRect(): Rect {
    switch (this.type) {
      case 'spike':
        return { x: this.x + 4, y: this.y + 8, w: this.w - 8, h: this.h - 10 }
      case 'drone':
        return { x: this.x + 6, y: this.y + 4, w: this.w - 12, h: this.h - 8 }
      case 'billboard':
        return { x: this.x + 6, y: this.y + 10, w: this.w - 12, h: this.h - 14 }
    }
  }

  update(dt: number, speed: number): void {
    this.x -= speed * dt
    this.animTime += dt
    if (this.type === 'drone') {
      this.y += Math.sin(this.animTime * 4) * 20 * dt
    }
    if (this.x + this.w < 0) {
      this.active = false
    }
  }
}

export class EnergyBall extends Entity {
  static readonly RADIUS = 14
  animTime: number = 0
  collected: boolean = false

  constructor(x: number, y: number) {
    super(x, y, EnergyBall.RADIUS * 2, EnergyBall.RADIUS * 2)
  }

  getCollisionRect(): Rect {
    const cx = this.x + EnergyBall.RADIUS
    const cy = this.y + EnergyBall.RADIUS
    const r = EnergyBall.RADIUS - 3
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }
  }

  update(dt: number, speed: number): void {
    this.x -= speed * dt
    this.animTime += dt
    if (this.x + this.w < 0) {
      this.active = false
    }
  }

  get bobOffset(): number {
    return Math.sin(this.animTime * 3) * 4
  }
}

export function rectOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
