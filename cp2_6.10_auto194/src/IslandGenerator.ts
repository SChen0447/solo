import { v4 as uuidv4 } from 'uuid';

export type ResourceType = 'wood' | 'ore' | 'crystal' | null;

export interface ShapePoint {
  x: number;
  y: number;
  angle: number;
  distance: number;
}

export interface CloudParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  angle: number;
  speed: number;
  offsetY: number;
}

export interface Island {
  id: string;
  x: number;
  y: number;
  radius: number;
  shapePoints: ShapePoint[];
  resource: ResourceType;
  monsterLevel: number;
  clouds: CloudParticle[];
}

export class IslandGenerator {
  static random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  static generateShapePoints(radius: number): ShapePoint[] {
    const points: ShapePoint[] = [];
    const numPoints = Math.floor(this.random(8, 14));

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const distance = radius * this.random(0.7, 1.2);
      points.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        angle,
        distance
      });
    }

    return points;
  }

  static generateCloudParticles(radius: number): CloudParticle[] {
    const clouds: CloudParticle[] = [];
    const numClouds = Math.floor(this.random(6, 12));

    for (let i = 0; i < numClouds; i++) {
      const angle = this.random(0, Math.PI * 2);
      const distance = radius * this.random(0.9, 1.4);
      clouds.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        radius: this.random(6, 18),
        alpha: this.random(0.2, 0.4),
        angle,
        speed: this.random(0.002, 0.006),
        offsetY: this.random(0, Math.PI * 2)
      });
    }

    return clouds;
  }

  static generateIsland(x: number, y: number): Island {
    const radius = this.random(40, 80);
    return {
      id: uuidv4(),
      x,
      y,
      radius,
      shapePoints: this.generateShapePoints(radius),
      resource: null,
      monsterLevel: 1,
      clouds: this.generateCloudParticles(radius)
    };
  }
}
