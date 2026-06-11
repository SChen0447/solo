import Phaser from 'phaser';
import { DroneData } from '../types';

const MAX_DRONES = 3;
const HEX_SIZE = 30;
const LASER_LENGTH = 200;
const LASER_WIDTH = 2;
const BASE_SPAWN_INTERVAL = 15000;

export interface DroneObject {
  data: DroneData;
  bodyGraphics: Phaser.GameObjects.Graphics;
  laserGraphics: Phaser.GameObjects.Graphics;
}

export class DroneManager {
  private scene: Phaser.Scene;
  private drones: DroneObject[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = BASE_SPAWN_INTERVAL;
  private scrollSpeed: number = 300;
  private onPlayerHitCallback?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setOnPlayerHit(callback: () => void): void {
    this.onPlayerHitCallback = callback;
  }

  setScrollSpeed(speed: number): void {
    this.scrollSpeed = speed;
  }

  setSpawnInterval(interval: number): void {
    this.spawnInterval = interval;
  }

  init(): void {
    this.drones = [];
    this.spawnTimer = 0;
  }

  getDrones(): DroneObject[] {
    return this.drones;
  }

  update(delta: number, playerX: number, playerY: number, playerW: number, playerH: number, speedMultiplier: number = 1): void {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval && this.drones.length < MAX_DRONES) {
      this.spawnTimer = 0;
      this.spawnDrone();
    }

    const moveAmount = (this.scrollSpeed * speedMultiplier * delta) / 1000;

    for (let i = this.drones.length - 1; i >= 0; i--) {
      const drone = this.drones[i];

      drone.data.x -= moveAmount;
      drone.data.phase += (delta / 1000) * drone.data.frequency * Math.PI * 2;
      drone.data.rotation += drone.data.rotationSpeed * (delta / 1000);
      drone.data.y = drone.data.baseY + Math.sin(drone.data.phase) * drone.data.amplitude;

      this.redrawDrone(drone);

      if (this.checkLaserHit(drone, playerX, playerY, playerW, playerH)) {
        if (this.onPlayerHitCallback) {
          this.onPlayerHitCallback();
        }
      }

      if (drone.data.x < -100) {
        this.destroyDrone(drone);
        this.drones.splice(i, 1);
      }
    }
  }

  private spawnDrone(): void {
    const baseY = Phaser.Math.Between(150, 350);

    const data: DroneData = {
      x: this.scene.scale.width + 50,
      y: baseY,
      baseY,
      amplitude: 50,
      frequency: 0.3,
      phase: Math.random() * Math.PI * 2,
      rotation: 0,
      rotationSpeed: 0.5,
      active: true
    };

    const bodyGraphics = this.scene.add.graphics();
    const laserGraphics = this.scene.add.graphics();

    this.drones.push({ data, bodyGraphics, laserGraphics });
    this.redrawDrone(this.drones[this.drones.length - 1]);
  }

  private redrawDrone(drone: DroneObject): void {
    const { x, y, rotation } = drone.data;

    drone.bodyGraphics.clear();
    drone.bodyGraphics.save();
    drone.bodyGraphics.translateCanvas(x, y);
    drone.bodyGraphics.rotateCanvas(rotation);

    drone.bodyGraphics.fillStyle(0xa0a0a0, 0.4);
    drone.bodyGraphics.lineStyle(2, 0x00d4ff, 0.8);

    drone.bodyGraphics.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = Math.cos(angle) * HEX_SIZE;
      const py = Math.sin(angle) * HEX_SIZE;
      if (i === 0) {
        drone.bodyGraphics.moveTo(px, py);
      } else {
        drone.bodyGraphics.lineTo(px, py);
      }
    }
    drone.bodyGraphics.closePath();
    drone.bodyGraphics.fillPath();
    drone.bodyGraphics.strokePath();

    drone.bodyGraphics.fillStyle(0xff0040, 0.8);
    drone.bodyGraphics.fillCircle(0, 0, 6);

    drone.bodyGraphics.restore();

    drone.laserGraphics.clear();
    drone.laserGraphics.lineStyle(LASER_WIDTH, 0xff0000, 0.6);
    drone.laserGraphics.beginPath();
    drone.laserGraphics.moveTo(x, y + HEX_SIZE * 0.5);
    drone.laserGraphics.lineTo(x, y + HEX_SIZE * 0.5 + LASER_LENGTH);
    drone.laserGraphics.strokePath();

    drone.laserGraphics.lineStyle(LASER_WIDTH + 2, 0xff0000, 0.2);
    drone.laserGraphics.beginPath();
    drone.laserGraphics.moveTo(x, y + HEX_SIZE * 0.5);
    drone.laserGraphics.lineTo(x, y + HEX_SIZE * 0.5 + LASER_LENGTH);
    drone.laserGraphics.strokePath();
  }

  private checkLaserHit(drone: DroneObject, px: number, py: number, pw: number, ph: number): boolean {
    const laserX = drone.data.x;
    const laserTop = drone.data.y + HEX_SIZE * 0.5;
    const laserBottom = laserTop + LASER_LENGTH;

    const laserHalfWidth = LASER_WIDTH;

    if (
      px + pw > laserX - laserHalfWidth &&
      px < laserX + laserHalfWidth &&
      py + ph > laserTop &&
      py < laserBottom
    ) {
      return true;
    }

    return false;
  }

  private destroyDrone(drone: DroneObject): void {
    drone.bodyGraphics.destroy();
    drone.laserGraphics.destroy();
  }

  destroy(): void {
    for (const drone of this.drones) {
      this.destroyDrone(drone);
    }
    this.drones = [];
  }
}
