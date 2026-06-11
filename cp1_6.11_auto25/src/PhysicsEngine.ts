import { BlackHole, Vec2 } from './BlackHole';
import { PlayerShip } from './PlayerShip';

export class PhysicsEngine {
  private blackHoles: BlackHole[];
  private ship: PlayerShip;
  private readonly MAX_SPEED: number = 600;

  constructor(blackHoles: BlackHole[], ship: PlayerShip) {
    this.blackHoles = blackHoles;
    this.ship = ship;
  }

  public setBlackHoles(blackHoles: BlackHole[]): void {
    this.blackHoles = blackHoles;
  }

  public calculateNetAcceleration(): Vec2 {
    let ax: number = 0;
    let ay: number = 0;

    for (const bh of this.blackHoles) {
      const g: Vec2 = bh.calculateGravity(this.ship.x, this.ship.y);
      ax += g.x;
      ay += g.y;
    }

    return { x: ax, y: ay };
  }

  public clampSpeed(): void {
    const speed: number = this.ship.getSpeed();
    if (speed > this.MAX_SPEED) {
      const factor: number = this.MAX_SPEED / speed;
      this.ship.vx *= factor;
      this.ship.vy *= factor;
    }
  }

  public update(deltaTime: number): void {
    const accel: Vec2 = this.calculateNetAcceleration();
    this.ship.update(deltaTime, accel);
    this.clampSpeed();
    this.handleBoundaryWrap();
  }

  private handleBoundaryWrap(): void {
    const w: number = window.innerWidth;
    const h: number = window.innerHeight;
    const margin: number = 50;

    if (this.ship.x < -margin) this.ship.x = w + margin;
    if (this.ship.x > w + margin) this.ship.x = -margin;
    if (this.ship.y < -margin) this.ship.y = h + margin;
    if (this.ship.y > h + margin) this.ship.y = -margin;
  }
}
