import { Ship } from './entities';

export type AIState = 'patrol' | 'chase' | 'dodge' | 'attack';

export interface AIInput {
  thrust: boolean;
  rotate: number;
  fire: boolean;
}

export class AIController {
  public state: AIState = 'patrol';
  private stateTimer: number = 0;
  private nextStateSwitch: number = 3000 + Math.random() * 2000;
  private patrolAngle: number = Math.random() * Math.PI * 2;
  private dodgeDirection: number = 1;
  private dodgeTimer: number = 0;
  private fireTimer: number = 0;

  private static readonly PATROL_DISTANCE = 300;
  private static readonly CHASE_DISTANCE = 150;
  private static readonly ATTACK_PROBABILITY = 0.4;
  private static readonly STATE_SWITCH_MIN = 3000;
  private static readonly STATE_SWITCH_MAX = 5000;

  public update(
    aiShip: Ship,
    playerShip: Ship,
    deltaTime: number,
    canvasWidth: number,
    canvasHeight: number
  ): AIInput {
    const input: AIInput = { thrust: false, rotate: 0, fire: false };

    if (!aiShip.alive || !playerShip.alive) {
      return input;
    }

    this.stateTimer += deltaTime;
    if (this.stateTimer >= this.nextStateSwitch) {
      this.stateTimer = 0;
      this.nextStateSwitch =
        AIStateSwitch.STATE_SWITCH_MIN + Math.random() * (AIStateSwitch.STATE_SWITCH_MAX - AIStateSwitch.STATE_SWITCH_MIN);
      this.randomStateSwitch();
    }

    const dx = playerShip.x - aiShip.x;
    const dy = playerShip.y - aiShip.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angleToPlayer = Math.atan2(dy, dx);
    let angleDiff = angleToPlayer - aiShip.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (distance > AIController.PATROL_DISTANCE) {
      this.state = 'patrol';
    } else if (distance > AIController.CHASE_DISTANCE) {
      this.state = 'chase';
    } else {
      if (Math.random() < 0.02) {
        this.state = Math.random() < AIController.ATTACK_PROBABILITY ? 'attack' : 'dodge';
        if (this.state === 'dodge') {
          this.dodgeDirection = Math.random() < 0.5 ? 1 : -1;
          this.dodgeTimer = 0;
        }
      }
    }

    switch (this.state) {
      case 'patrol':
        this.updatePatrol(aiShip, input, canvasWidth, canvasHeight, deltaTime);
        break;
      case 'chase':
        this.updateChase(aiShip, angleDiff, input);
        break;
      case 'attack':
        this.updateAttack(aiShip, angleDiff, distance, input);
        break;
      case 'dodge':
        this.updateDodge(aiShip, angleToPlayer, input, deltaTime);
        break;
    }

    return input;
  }

  private randomStateSwitch(): void {
    const states: AIState[] = ['patrol', 'chase', 'dodge', 'attack'];
    const weights = [0.25, 0.35, 0.2, 0.2];
    let r = Math.random();
    for (let i = 0; i < states.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        this.state = states[i];
        break;
      }
    }
    if (this.state === 'dodge') {
      this.dodgeDirection = Math.random() < 0.5 ? 1 : -1;
      this.dodgeTimer = 0;
    }
    this.patrolAngle += (Math.random() - 0.5) * 0.5;
  }

  private updatePatrol(
    ship: Ship,
    input: AIInput,
    canvasWidth: number,
    canvasHeight: number,
    deltaTime: number
  ): void {
    this.patrolAngle += (Math.random() - 0.5) * 0.02;

    const margin = 60;
    if (ship.x < margin) this.patrolAngle = 0 + (Math.random() - 0.5) * 0.5;
    if (ship.x > canvasWidth - margin) this.patrolAngle = Math.PI + (Math.random() - 0.5) * 0.5;
    if (ship.y < margin) this.patrolAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    if (ship.y > canvasHeight - margin) this.patrolAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;

    let angleDiff = this.patrolAngle - ship.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const rotSpeed = Ship.PLAYER_ROTATION_SPEED * 0.8;
    if (angleDiff > rotSpeed) {
      input.rotate = 1;
    } else if (angleDiff < -rotSpeed) {
      input.rotate = -1;
    }

    input.thrust = true;
  }

  private updateChase(ship: Ship, angleDiff: number, input: AIInput): void {
    const rotSpeed = Ship.PLAYER_ROTATION_SPEED;
    if (angleDiff > rotSpeed * 0.5) {
      input.rotate = 1;
    } else if (angleDiff < -rotSpeed * 0.5) {
      input.rotate = -1;
    } else {
      const jitter = (Math.random() - 0.5) * 0.3;
      input.rotate = jitter;
    }

    if (Math.abs(angleDiff) < Math.PI / 3) {
      input.thrust = true;
    }
  }

  private updateAttack(
    ship: Ship,
    angleDiff: number,
    distance: number,
    input: AIInput
  ): void {
    const rotSpeed = Ship.PLAYER_ROTATION_SPEED * 1.2;
    if (angleDiff > rotSpeed * 0.3) {
      input.rotate = 1;
    } else if (angleDiff < -rotSpeed * 0.3) {
      input.rotate = -1;
    }

    if (Math.abs(angleDiff) < Math.PI / 6 && distance < 200) {
      input.fire = true;
    }

    if (Math.abs(angleDiff) < Math.PI / 4) {
      input.thrust = Math.random() < 0.7;
    }
  }

  private updateDodge(
    ship: Ship,
    angleToPlayer: number,
    input: AIInput,
    deltaTime: number
  ): void {
    this.dodgeTimer += deltaTime;

    const perpendicular = angleToPlayer + (this.dodgeDirection * Math.PI) / 2;
    let angleDiff = perpendicular - ship.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const rotSpeed = Ship.PLAYER_ROTATION_SPEED * 1.5;
    if (angleDiff > rotSpeed * 0.3) {
      input.rotate = 1;
    } else if (angleDiff < -rotSpeed * 0.3) {
      input.rotate = -1;
    }

    input.thrust = true;

    if (this.dodgeTimer > 800 + Math.random() * 400) {
      this.dodgeDirection = -this.dodgeDirection;
      this.dodgeTimer = 0;
    }
  }

  public reset(): void {
    this.state = 'patrol';
    this.stateTimer = 0;
    this.nextStateSwitch = 3000 + Math.random() * 2000;
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.dodgeTimer = 0;
    this.fireTimer = 0;
  }
}

namespace AIStateSwitch {
  export const STATE_SWITCH_MIN = 3000;
  export const STATE_SWITCH_MAX = 5000;
}
