export interface AsteroidVertex {
  x: number;
  y: number;
}

export interface Ore {
  x: number;
  y: number;
  vy: number;
}

export class Asteroid {
  x: number;
  y: number;
  radius: number;
  vy: number;
  vx: number;
  vertices: AsteroidVertex[];
  isFragment: boolean;
  flashTime: number;
  rotation: number;
  rotationSpeed: number;

  constructor(x: number, y: number, radius: number, speed: number, isFragment = false) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vy = isFragment ? speed : speed;
    this.vx = isFragment ? (Math.random() - 0.5) * 4 : 0;
    this.isFragment = isFragment;
    this.flashTime = 0;
    this.rotation = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.04;
    this.vertices = this.generateVertices();
  }

  generateVertices(): AsteroidVertex[] {
    const sides = 6 + Math.floor(Math.random() * 4);
    const verts: AsteroidVertex[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides;
      const r = this.radius * (0.75 + Math.random() * 0.5);
      verts.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    }
    return verts;
  }

  update(canvasHeight: number): boolean {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    if (this.flashTime > 0) this.flashTime--;
    return this.y - this.radius > canvasHeight + 50;
  }

  getRotatedVertices(): AsteroidVertex[] {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    return this.vertices.map((v) => ({
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    }));
  }

  hit(): void {
    this.flashTime = 12;
  }

  split(baseSpeed: number): Asteroid[] {
    const fragmentCount = 3 + Math.floor(Math.random() * 3);
    const newRadius = this.radius * 0.5;
    const fragments: Asteroid[] = [];
    for (let i = 0; i < fragmentCount; i++) {
      const angle = (Math.PI * 2 * i) / fragmentCount + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      const frag = new Asteroid(this.x, this.y, newRadius, baseSpeed, true);
      frag.vx = Math.cos(angle) * speed;
      frag.vy = Math.sin(angle) * speed + Math.abs(this.vy) * 0.5;
      fragments.push(frag);
    }
    return fragments;
  }

  dropOre(): Ore[] {
    const count = 1 + Math.floor(Math.random() * 2);
    const ores: Ore[] = [];
    for (let i = 0; i < count; i++) {
      ores.push({
        x: this.x + (Math.random() - 0.5) * this.radius,
        y: this.y + (Math.random() - 0.5) * this.radius,
        vy: 1 + Math.random() * 1.5,
      });
    }
    return ores;
  }

  static generate(width: number, speed: number): Asteroid {
    const radius = 15 + Math.random() * 20;
    const x = radius + Math.random() * (width - radius * 2);
    return new Asteroid(x, -radius - 10, radius, speed, false);
  }
}
