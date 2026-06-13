import { gsap } from 'gsap';
import type { InteractionData } from './input';

export interface ThreadPoint {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  targetOffsetX: number;
  targetOffsetY: number;
  baseOffsetX: number;
  baseOffsetY: number;
  color: string;
  animationId: number | null;
}

export interface Thread {
  points: ThreadPoint[];
  isHorizontal: boolean;
  baseColor: string;
}

export interface Ripple {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  colors: string[];
  maxRadius: number;
  speed: number;
  active: boolean;
}

export interface Stardust {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  driftSpeed: number;
  driftAngle: number;
  driftAngleChange: number;
  isFlashing: boolean;
  flashEndTime: number;
  pushOffsetX: number;
  pushOffsetY: number;
}

const RIPPLE_COLORS = [
  '#ff7f7f',
  '#7ecf7e',
  '#5fa8d3',
  '#b39ddb',
  '#ffd54f',
  '#ffb74d',
  '#f48fb1',
  '#80cbc4'
];

const THREAD_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
const THREAD_SPACING = 12;
const MIN_BEND = 5;
const MAX_BEND = 25;
const MIN_RECOVERY_TIME = 0.3;
const MAX_RECOVERY_TIME = 1.5;
const VELOCITY_THRESHOLD = 300;
const STARDUST_COUNT = 30;
const STARDUST_PUSH_RADIUS = 80;
const MAX_PUSH_DISTANCE = 50;
const FLASH_DURATION = 300;
const MAX_RIPPLES = 20;
const RIPPLE_SPEED = 150;
const RIPPLE_DURATION = 2000;

export class WeaveSystem {
  private width: number;
  private height: number;
  private threads: Thread[] = [];
  private ripples: Ripple[] = [];
  private stardust: Stardust[] = [];
  private ripplePool: Ripple[] = [];
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragDistance: number = 0;
  private lastDragX: number = 0;
  private lastDragY: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initializeRipplePool();
    this.initializeThreads();
    this.initializeStardust();
  }

  private initializeRipplePool(): void {
    for (let i = 0; i < MAX_RIPPLES; i++) {
      this.ripplePool.push({
        x: 0,
        y: 0,
        startTime: 0,
        duration: RIPPLE_DURATION,
        colors: [],
        maxRadius: 48,
        speed: RIPPLE_SPEED,
        active: false
      });
    }
  }

  private initializeThreads(): void {
    this.threads = [];
    const horizontalCount = Math.floor(this.height / THREAD_SPACING);
    const verticalCount = Math.floor(this.width / THREAD_SPACING);

    for (let i = 0; i <= horizontalCount; i++) {
      const y = (i * this.height) / horizontalCount;
      const points: ThreadPoint[] = [];
      const pointCount = Math.floor(this.width / 4) + 1;

      for (let j = 0; j <= pointCount; j++) {
        const x = (j * this.width) / pointCount;
        points.push({
          x,
          y,
          offsetX: 0,
          offsetY: 0,
          targetOffsetX: 0,
          targetOffsetY: 0,
          baseOffsetX: 0,
          baseOffsetY: 0,
          color: THREAD_COLORS[i % THREAD_COLORS.length],
          animationId: null
        });
      }

      this.threads.push({
        points,
        isHorizontal: true,
        baseColor: THREAD_COLORS[i % THREAD_COLORS.length]
      });
    }

    for (let i = 0; i <= verticalCount; i++) {
      const x = (i * this.width) / verticalCount;
      const points: ThreadPoint[] = [];
      const pointCount = Math.floor(this.height / 4) + 1;

      for (let j = 0; j <= pointCount; j++) {
        const y = (j * this.height) / pointCount;
        points.push({
          x,
          y,
          offsetX: 0,
          offsetY: 0,
          targetOffsetX: 0,
          targetOffsetY: 0,
          baseOffsetX: 0,
          baseOffsetY: 0,
          color: THREAD_COLORS[(i + 2) % THREAD_COLORS.length],
          animationId: null
        });
      }

      this.threads.push({
        points,
        isHorizontal: false,
        baseColor: THREAD_COLORS[(i + 2) % THREAD_COLORS.length]
      });
    }
  }

  private initializeStardust(): void {
    this.stardust = [];
    for (let i = 0; i < STARDUST_COUNT; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      this.stardust.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size: 3 + Math.random() * 3,
        opacity: 0.4 + Math.random() * 0.4,
        baseOpacity: 0.4 + Math.random() * 0.4,
        driftSpeed: 0.5 + Math.random() * 1.0,
        driftAngle: Math.random() * Math.PI * 2,
        driftAngleChange: (Math.random() - 0.5) * 0.02,
        isFlashing: false,
        flashEndTime: 0,
        pushOffsetX: 0,
        pushOffsetY: 0
      });
    }
  }

  private getRandomRippleColors(): string[] {
    const shuffled = [...RIPPLE_COLORS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }

  private createRipple(x: number, y: number): void {
    let ripple = this.ripplePool.find(r => !r.active);
    if (!ripple) {
      ripple = this.ripples.shift();
      if (ripple) {
        ripple.active = false;
      }
    }

    if (ripple) {
      ripple.x = x;
      ripple.y = y;
      ripple.startTime = performance.now();
      ripple.duration = RIPPLE_DURATION;
      ripple.colors = this.getRandomRippleColors();
      ripple.maxRadius = 48;
      ripple.speed = RIPPLE_SPEED;
      ripple.active = true;
      this.ripples.push(ripple);
    }
  }

  private calculateBendAmount(velocity: number): number {
    const normalizedVel = Math.min(Math.max(velocity, 0), VELOCITY_THRESHOLD) / VELOCITY_THRESHOLD;
    return MIN_BEND + normalizedVel * (MAX_BEND - MIN_BEND);
  }

  private calculateRecoveryTime(velocity: number): number {
    const normalizedVel = Math.min(Math.max(velocity, 0), VELOCITY_THRESHOLD) / VELOCITY_THRESHOLD;
    return MIN_RECOVERY_TIME + normalizedVel * (MAX_RECOVERY_TIME - MIN_RECOVERY_TIME);
  }

  private getThreadColor(distance: number): string {
    const gradientStep = 30;
    const colorIndex = Math.floor(distance / gradientStep) % THREAD_COLORS.length;
    return THREAD_COLORS[colorIndex];
  }

  private applyThreadBend(
    mouseX: number,
    mouseY: number,
    velocity: number,
    dragDistance: number
  ): void {
    const bendAmount = this.calculateBendAmount(velocity);
    const recoveryTime = this.calculateRecoveryTime(velocity);
    const influenceRadius = 60;

    for (const thread of this.threads) {
      for (const point of thread.points) {
        const dx = point.x - mouseX;
        const dy = point.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < influenceRadius) {
          const influence = 1 - distance / influenceRadius;
          const angle = Math.atan2(dy, dx);
          const bendX = Math.cos(angle) * bendAmount * influence;
          const bendY = Math.sin(angle) * bendAmount * influence;

          if (point.animationId !== null) {
            gsap.killTweensOf(point);
            point.animationId = null;
          }

          point.targetOffsetX = bendX;
          point.targetOffsetY = bendY;
          point.offsetX = bendX;
          point.offsetY = bendY;
          point.color = this.getThreadColor(dragDistance);

          const anim = gsap.to(point, {
            offsetX: 0,
            offsetY: 0,
            duration: recoveryTime,
            ease: 'bounce.out',
            onComplete: () => {
              point.animationId = null;
            }
          });
          point.animationId = (anim as unknown as { _uid: number })._uid;
        }
      }
    }
  }

  private applyStardustPush(mouseX: number, mouseY: number): void {
    for (const dust of this.stardust) {
      const dx = dust.x - mouseX;
      const dy = dust.y - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < STARDUST_PUSH_RADIUS) {
        const influence = 1 - distance / STARDUST_PUSH_RADIUS;
        const angle = Math.atan2(dy, dx);
        const pushDistance = MAX_PUSH_DISTANCE * influence;

        gsap.to(dust, {
          pushOffsetX: Math.cos(angle) * pushDistance,
          pushOffsetY: Math.sin(angle) * pushDistance,
          duration: 0.3,
          ease: 'power2.out'
        });

        gsap.to(dust, {
          pushOffsetX: 0,
          pushOffsetY: 0,
          duration: 0.8,
          ease: 'power2.out',
          delay: 0.3
        });
      }
    }
  }

  private triggerStardustFlash(clickX: number, clickY: number): void {
    const flashRadius = 100;
    const now = performance.now();

    for (const dust of this.stardust) {
      const dx = dust.x - clickX;
      const dy = dust.y - clickY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < flashRadius) {
        dust.isFlashing = true;
        dust.flashEndTime = now + FLASH_DURATION;
        dust.opacity = 1;

        gsap.to(dust, {
          opacity: dust.baseOpacity,
          duration: 0.3,
          ease: 'power2.out',
          delay: 0,
          onComplete: () => {
            dust.isFlashing = false;
          }
        });
      }
    }
  }

  private updateStardust(deltaTime: number): void {
    const now = performance.now();

    for (const dust of this.stardust) {
      dust.driftAngle += dust.driftAngleChange;
      if (Math.random() < 0.01) {
        dust.driftAngleChange = (Math.random() - 0.5) * 0.02;
      }

      const moveX = Math.cos(dust.driftAngle) * dust.driftSpeed * (deltaTime / 1000);
      const moveY = Math.sin(dust.driftAngle) * dust.driftSpeed * (deltaTime / 1000);

      dust.baseX += moveX;
      dust.baseY += moveY;

      if (dust.baseX < 0) dust.baseX = this.width;
      if (dust.baseX > this.width) dust.baseX = 0;
      if (dust.baseY < 0) dust.baseY = this.height;
      if (dust.baseY > this.height) dust.baseY = 0;

      dust.x = dust.baseX + dust.pushOffsetX;
      dust.y = dust.baseY + dust.pushOffsetY;

      if (dust.isFlashing && now > dust.flashEndTime) {
        dust.isFlashing = false;
      }
    }
  }

  private updateRipples(): void {
    const now = performance.now();
    this.ripples = this.ripples.filter(ripple => {
      if (!ripple.active) return false;
      const elapsed = now - ripple.startTime;
      if (elapsed >= ripple.duration) {
        ripple.active = false;
        return false;
      }
      return true;
    });
  }

  public update(deltaTime: number, interaction: InteractionData): void {
    if (interaction.isDragging) {
      if (this.lastDragX !== interaction.prevMouseX || this.lastDragY !== interaction.prevMouseY) {
        const dx = interaction.mouseX - this.dragStartX;
        const dy = interaction.mouseY - this.dragStartY;
        this.dragDistance = Math.sqrt(dx * dx + dy * dy);
      }

      this.applyThreadBend(
        interaction.mouseX,
        interaction.mouseY,
        interaction.velocity,
        this.dragDistance
      );

      this.applyStardustPush(interaction.mouseX, interaction.mouseY);

      this.lastDragX = interaction.mouseX;
      this.lastDragY = interaction.mouseY;
    } else {
      this.dragStartX = interaction.mouseX;
      this.dragStartY = interaction.mouseY;
      this.dragDistance = 0;
    }

    if (interaction.clickX !== null && interaction.clickY !== null) {
      this.createRipple(interaction.clickX, interaction.clickY);
      this.triggerStardustFlash(interaction.clickX, interaction.clickY);
    }

    this.updateStardust(deltaTime);
    this.updateRipples();
  }

  public getThreads(): Thread[] {
    return this.threads;
  }

  public getRipples(): Ripple[] {
    return this.ripples.filter(r => r.active);
  }

  public getStardust(): Stardust[] {
    return this.stardust;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.initializeThreads();
    this.initializeStardust();
  }

  public destroy(): void {
    for (const thread of this.threads) {
      for (const point of thread.points) {
        if (point.animationId !== null) {
          gsap.killTweensOf(point);
        }
      }
    }
    this.threads = [];
    this.ripples = [];
    this.stardust = [];
  }
}
