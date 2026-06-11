import Phaser from 'phaser';
import { Direction, PuzzleGenerator } from '../utils/PuzzleGenerator';

interface PathPoint {
  x: number;
  y: number;
}

interface LaserSegment {
  start: PathPoint;
  end: PathPoint;
}

interface Reflector {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  type: 'statue' | 'scarab';
}

export class LaserBeam {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private segments: LaserSegment[] = [];
  private isSuccess: boolean = false;
  private isFailure: boolean = false;
  private maxReflections: number = 20;
  private animProgress: number = 0;
  private isAnimating: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.glowGraphics = scene.add.graphics();
  }

  public calculatePath(
    startX: number,
    startY: number,
    direction: Direction,
    reflectors: Reflector[],
    targetX: number,
    targetY: number,
    targetRadius: number,
    doorBounds: { x: number; y: number; width: number; height: number },
    gameBounds: { width: number; height: number }
  ): void {
    this.segments = [];
    this.isSuccess = false;
    this.isFailure = false;

    let currentX = startX;
    let currentY = startY;
    let currentDir = direction;
    let reflections = 0;
    let lastReflectorId: string | null = null;

    while (reflections < this.maxReflections) {
      const result = this.findNearestIntersection(
        currentX,
        currentY,
        currentDir,
        reflectors,
        targetX,
        targetY,
        targetRadius,
        doorBounds,
        gameBounds,
        lastReflectorId
      );

      if (result.type === 'reflector' && result.reflector) {
        this.segments.push({
          start: { x: currentX, y: currentY },
          end: { x: result.reflector.x, y: result.reflector.y }
        });

        const newDir = PuzzleGenerator.reflectDirection(currentDir, result.reflector.rotation);
        if (newDir === null) {
          this.isFailure = true;
          break;
        }

        currentX = result.reflector.x;
        currentY = result.reflector.y;
        currentDir = newDir;
        lastReflectorId = result.reflector.id;
        reflections++;
      } else if (result.type === 'target') {
        this.segments.push({
          start: { x: currentX, y: currentY },
          end: { x: result.x, y: result.y }
        });
        this.isSuccess = true;
        break;
      } else {
        this.segments.push({
          start: { x: currentX, y: currentY },
          end: { x: result.x, y: result.y }
        });
        this.isFailure = true;
        break;
      }
    }

    if (reflections >= this.maxReflections) {
      this.isFailure = true;
    }
  }

  private findNearestIntersection(
    x: number,
    y: number,
    direction: Direction,
    reflectors: Reflector[],
    targetX: number,
    targetY: number,
    targetRadius: number,
    doorBounds: { x: number; y: number; width: number; height: number },
    gameBounds: { width: number; height: number },
    skipReflectorId: string | null
  ): { x: number; y: number; type: string; reflector?: Reflector; distance: number } {
    const intersections: { x: number; y: number; type: string; reflector?: Reflector; distance: number }[] = [];

    const boundaryIntersection = this.getBoundaryIntersection(x, y, direction, gameBounds);
    if (boundaryIntersection) {
      intersections.push({
        ...boundaryIntersection,
        type: 'boundary',
        distance: this.getDistance(x, y, boundaryIntersection.x, boundaryIntersection.y)
      });
    }

    const targetIntersection = this.getCircleIntersection(x, y, direction, targetX, targetY, targetRadius);
    if (targetIntersection) {
      intersections.push({
        ...targetIntersection,
        type: 'target',
        distance: this.getDistance(x, y, targetIntersection.x, targetIntersection.y)
      });
    }

    const doorIntersection = this.getRectIntersection(
      x, y, direction,
      doorBounds.x - doorBounds.width / 2,
      doorBounds.y - doorBounds.height / 2,
      doorBounds.width,
      doorBounds.height
    );
    if (doorIntersection) {
      intersections.push({
        ...doorIntersection,
        type: 'door',
        distance: this.getDistance(x, y, doorIntersection.x, doorIntersection.y)
      });
    }

    for (const reflector of reflectors) {
      if (reflector.id === skipReflectorId) continue;

      const rectIntersection = this.getRectIntersection(
        x, y, direction,
        reflector.x - reflector.width / 2,
        reflector.y - reflector.height / 2,
        reflector.width,
        reflector.height
      );
      if (rectIntersection) {
        const dist = this.getDistance(x, y, rectIntersection.x, rectIntersection.y);
        if (dist > 1) {
          intersections.push({
            x: reflector.x,
            y: reflector.y,
            type: 'reflector',
            reflector,
            distance: this.getDistance(x, y, reflector.x, reflector.y)
          });
        }
      }
    }

    if (intersections.length === 0) {
      return { x, y, type: 'none', distance: 0 };
    }

    intersections.sort((a, b) => a.distance - b.distance);
    return intersections[0];
  }

  private getBoundaryIntersection(
    x: number,
    y: number,
    direction: Direction,
    bounds: { width: number; height: number }
  ): { x: number; y: number } | null {
    const vec = PuzzleGenerator.getDirectionVector(direction);

    if (vec.dx > 0 && x < bounds.width) {
      return { x: bounds.width, y };
    }
    if (vec.dx < 0 && x > 0) {
      return { x: 0, y };
    }
    if (vec.dy > 0 && y < bounds.height) {
      return { x, y: bounds.height };
    }
    if (vec.dy < 0 && y > 0) {
      return { x, y: 0 };
    }

    return null;
  }

  private getCircleIntersection(
    x: number,
    y: number,
    direction: Direction,
    cx: number,
    cy: number,
    radius: number
  ): { x: number; y: number } | null {
    const vec = PuzzleGenerator.getDirectionVector(direction);

    if (vec.dx !== 0) {
      const dx = cx - x;
      if ((vec.dx > 0 && dx < 0) || (vec.dx < 0 && dx > 0)) return null;

      const absDx = Math.abs(dx);
      if (absDx > radius) {
        const dy2 = radius * radius - absDx * absDx;
        if (dy2 < 0) return null;
        const dy = Math.sqrt(dy2);
        if (y >= cy - dy && y <= cy + dy) {
          return { x: cx + Math.sign(dx) * radius, y };
        }
      } else {
        return { x: cx + Math.sign(dx) * radius, y };
      }
    } else {
      const dy = cy - y;
      if ((vec.dy > 0 && dy < 0) || (vec.dy < 0 && dy > 0)) return null;

      const absDy = Math.abs(dy);
      if (absDy > radius) {
        const dx2 = radius * radius - absDy * absDy;
        if (dx2 < 0) return null;
        const dx = Math.sqrt(dx2);
        if (x >= cx - dx && x <= cx + dx) {
          return { x, y: cy + Math.sign(dy) * radius };
        }
      } else {
        return { x, y: cy + Math.sign(dy) * radius };
      }
    }

    return null;
  }

  private getRectIntersection(
    x: number,
    y: number,
    direction: Direction,
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): { x: number; y: number } | null {
    const vec = PuzzleGenerator.getDirectionVector(direction);

    if (vec.dx > 0) {
      if (x < rx && y >= ry && y <= ry + rh) {
        return { x: rx, y };
      }
    } else if (vec.dx < 0) {
      if (x > rx + rw && y >= ry && y <= ry + rh) {
        return { x: rx + rw, y };
      }
    }

    if (vec.dy > 0) {
      if (y < ry && x >= rx && x <= rx + rw) {
        return { x, y: ry };
      }
    } else if (vec.dy < 0) {
      if (y > ry + rh && x >= rx && x <= rx + rw) {
        return { x, y: ry + rh };
      }
    }

    return null;
  }

  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  public draw(): void {
    this.graphics.clear();
    this.glowGraphics.clear();

    if (this.segments.length === 0) return;

    this.drawGlow();
    this.drawLaser();
  }

  private drawGlow(): void {
    this.glowGraphics.lineStyle(8, 0xffd700, 0.3);

    for (const segment of this.segments) {
      this.glowGraphics.beginPath();
      this.glowGraphics.moveTo(segment.start.x, segment.start.y);
      this.glowGraphics.lineTo(segment.end.x, segment.end.y);
      this.glowGraphics.strokePath();
    }
  }

  private drawLaser(): void {
    const color = this.isSuccess ? 0x00ff00 : (this.isFailure ? 0xff4444 : 0xffd700);
    this.graphics.lineStyle(2, color, 1);

    for (const segment of this.segments) {
      this.graphics.beginPath();
      this.graphics.moveTo(segment.start.x, segment.start.y);
      this.graphics.lineTo(segment.end.x, segment.end.y);
      this.graphics.strokePath();
    }
  }

  public animateDraw(duration: number = 500): void {
    if (this.segments.length === 0) return;

    this.isAnimating = true;
    this.animProgress = 0;

    this.scene.tweens.add({
      targets: this,
      animProgress: 1,
      duration,
      ease: Phaser.Math.Easing.Quadratic.InOut,
      onUpdate: () => {
        this.drawAnimated();
      },
      onComplete: () => {
        this.isAnimating = false;
        this.draw();
      }
    });
  }

  private drawAnimated(): void {
    this.graphics.clear();
    this.glowGraphics.clear();

    if (this.segments.length === 0) return;

    let totalLength = 0;
    const segmentLengths: number[] = [];

    for (const segment of this.segments) {
      const len = this.getDistance(segment.start.x, segment.start.y, segment.end.x, segment.end.y);
      segmentLengths.push(len);
      totalLength += len;
    }

    const targetLength = totalLength * this.animProgress;
    let drawnLength = 0;

    this.glowGraphics.lineStyle(8, 0xffd700, 0.3);
    this.graphics.lineStyle(2, this.isSuccess ? 0x00ff00 : 0xffd700, 1);

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const segLen = segmentLengths[i];

      if (drawnLength + segLen <= targetLength) {
        this.glowGraphics.beginPath();
        this.glowGraphics.moveTo(segment.start.x, segment.start.y);
        this.glowGraphics.lineTo(segment.end.x, segment.end.y);
        this.glowGraphics.strokePath();

        this.graphics.beginPath();
        this.graphics.moveTo(segment.start.x, segment.start.y);
        this.graphics.lineTo(segment.end.x, segment.end.y);
        this.graphics.strokePath();

        drawnLength += segLen;
      } else {
        const remaining = targetLength - drawnLength;
        const t = remaining / segLen;

        const endX = segment.start.x + (segment.end.x - segment.start.x) * t;
        const endY = segment.start.y + (segment.end.y - segment.start.y) * t;

        this.glowGraphics.beginPath();
        this.glowGraphics.moveTo(segment.start.x, segment.start.y);
        this.glowGraphics.lineTo(endX, endY);
        this.glowGraphics.strokePath();

        this.graphics.beginPath();
        this.graphics.moveTo(segment.start.x, segment.start.y);
        this.graphics.lineTo(endX, endY);
        this.graphics.strokePath();

        break;
      }
    }
  }

  public showFailureFlash(): void {
    const flashGraphics = this.scene.add.graphics();
    flashGraphics.fillStyle(0xff0000, 0.3);
    flashGraphics.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    flashGraphics.setDepth(100);

    this.scene.tweens.add({
      targets: flashGraphics,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        flashGraphics.destroy();
      }
    });
  }

  public getSuccess(): boolean {
    return this.isSuccess;
  }

  public getFailure(): boolean {
    return this.isFailure;
  }

  public clear(): void {
    this.graphics.clear();
    this.glowGraphics.clear();
    this.segments = [];
    this.isSuccess = false;
    this.isFailure = false;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.glowGraphics.destroy();
  }

  public setDepth(depth: number): void {
    this.graphics.setDepth(depth);
    this.glowGraphics.setDepth(depth - 1);
  }
}
