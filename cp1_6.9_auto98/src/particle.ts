import p5 from 'p5';
import { RGB } from './types';

const SPIDER_COLORS: RGB[] = [
  { r: 255, g: 102, b: 68 },
  { r: 68, g: 221, b: 136 },
  { r: 136, g: 136, b: 255 }
];

export class Spider {
  x: number;
  y: number;
  size: number;
  color: RGB;
  angle: number;
  private targetAngle: number;
  private speed: number;
  private edgeRadius: number;
  private centerX: number;
  private centerY: number;
  private positionOnEdge: number;
  private brightnessBoost = 0;
  private boostDuration = 0;
  private rotateAmount = 0;
  private rotateDuration = 0;
  private reacting = false;

  constructor(centerX: number, centerY: number, edgeRadius: number, startAngle: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.edgeRadius = edgeRadius;
    this.positionOnEdge = startAngle;
    this.size = 10 + Math.random() * 5;
    this.color = SPIDER_COLORS[Math.floor(Math.random() * SPIDER_COLORS.length)];
    this.speed = 0.5;
    this.angle = startAngle;
    this.targetAngle = startAngle;
    this.updatePosition();
  }

  private updatePosition(): void {
    this.x = this.centerX + Math.cos(this.positionOnEdge) * this.edgeRadius;
    this.y = this.centerY + Math.sin(this.positionOnEdge) * this.edgeRadius;
  }

  reactToPulse(pulseX: number, pulseY: number): void {
    const dx = pulseX - this.x;
    const dy = pulseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 80 && !this.reacting) {
      this.reacting = true;
      this.brightnessBoost = 1;
      this.boostDuration = 0.5;
      this.rotateAmount = Math.atan2(dy, dx) - this.angle;
      this.rotateDuration = 0.5;
    }
  }

  update(dt: number): void {
    this.positionOnEdge += this.speed * dt * 0.01;
    this.angle = this.positionOnEdge + Math.PI / 2;
    this.updatePosition();

    if (this.boostDuration > 0) {
      this.boostDuration -= dt;
      if (this.boostDuration <= 0) {
        this.brightnessBoost = 0;
        this.reacting = false;
      }
    }

    if (this.rotateDuration > 0) {
      this.rotateDuration -= dt;
      if (this.rotateDuration <= 0) {
        this.rotateAmount = 0