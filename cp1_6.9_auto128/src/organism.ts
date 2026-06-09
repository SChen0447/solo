import p5 from 'p5';

export type OrganismType = 'producer' | 'consumer' | 'decomposer';

export interface Organism {
  type: OrganismType;
  x: number;
  y: number;
  energy: number;
  alive: boolean;
  update(ecosystem: any, p: p5): void;
  render(p: p5): void;
  checkBoundary(centerX: number, centerY: number, radius: number, p: p5): void;
}

export class Producer implements Organism {
  type: OrganismType = 'producer';
  x: number;
  y: number;
  energy: number;
  alive: boolean = true;
  radius: number = 8;
  vx: number;
  vy: number;
  lastSplitTime: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.energy = 60;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
  }

  update(ecosystem: any, p: p5): void {
    if (!this.alive) return;

    this.x += this.vx;
    this.y += this.vy;

    this.vx += (Math.random() - 0.5) * 0.05;
    this.vy += (Math.random() - 0.5) * 0.05;

    const maxSpeed = 0.6;
    this.vx = p.constrain(this.vx, -maxSpeed, maxSpeed);
    this.vy = p.constrain(this.vy, -maxSpeed, maxSpeed);

    this.energy += 0.05;
    if (this.energy > 100) this.energy = 100;

    const now = p.millis();
    if (now - this.lastSplitTime > 3000 && this.energy > 50 && ecosystem.getProducerCount() < 10) {
      this.energy -= 30;
      this.lastSplitTime = now;
      const newX = this.x + (Math.random() - 0.5) * 30;
      const newY = this.y + (Math.random() - 0.5) * 30;
      ecosystem.addOrganism(new Producer(newX, newY));
    }
  }

  render(p: p5): void {
    if (!this.alive) return;
    p.noStroke();
    p.fill(102, 187, 106);
    p.ellipse(this.x, this.y, this.radius * 2, this.radius * 2);
    p.fill(150, 230, 150, 120);
    p.ellipse(this.x - 2, this.y - 2, this.radius * 0.8, this.radius * 0.8);
  }

  checkBoundary(centerX: number, centerY: number, radius: number, p: p5): void {
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = radius - this.radius;

    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      this.x = centerX + Math.cos(angle) * maxDist;
      this.y = centerY + Math.sin(angle) * maxDist;
      this.vx *= -0.8;
      this.vy *= -0.8;
    }
  }
}

export class Consumer implements Organism {
  type: OrganismType = 'consumer';
  x: number;
  y: number;
  energy: number;
  alive: boolean = true;
  length: number = 20;
  speed: number = 1.5;
  angle: number;
  target: Producer | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.energy = 80;
    this.angle = Math.random() * Math.PI * 2;
  }

  update(ecosystem: any, p: p5): void {
    if (!this.alive) return;

    this.energy -= 0.08;
    if (this.energy <= 0) {
      this.alive = false;
      return;
    }

    const producers = ecosystem.getProducers();
    let minDist = Infinity;
    this.target = null;

    for (const prod of producers) {
      if (!prod.alive) continue;
      const d = Math.sqrt((prod.x - this.x) ** 2 + (prod.y - this.y) ** 2);
      if (d < minDist) {
        minDist = d;
        this.target = prod;
      }
    }

    if (this.target && minDist < 200) {
      const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.angle += angleDiff * 0.08;

      if (minDist < 15) {
        this.target.alive = false;
        this.energy += 20;
        ecosystem.addRemnant(this.target.x, this.target.y);
        if (this.energy > 100) this.energy = 100;
      }
    } else {
      this.angle += (Math.random() - 0.5) * 0.1;
    }

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }

  render(p: p5): void {
    if (!this.alive) return;
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.angle);
    p.noStroke();
    p.fill(66, 165, 245);
    p.beginShape();
    p.ellipse(0, 0, this.length, this.length * 0.5);
    p.triangle(-this.length * 0.5, 0, -this.length * 0.9, -this.length * 0.35, -this.length * 0.9, this.length * 0.35);
    p.endShape();
    p.fill(255, 255, 255);
    p.ellipse(this.length * 0.3, -this.length * 0.1, 3, 3);
    p.fill(0, 0, 0);
    p.ellipse(this.length * 0.32, -this.length * 0.1, 1.5, 1.5);
    p.pop();
  }

  checkBoundary(centerX: number, centerY: number, radius: number, p: p5): void {
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = radius - this.length * 0.5;

    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      this.x = centerX + Math.cos(angle) * maxDist;
      this.y = centerY + Math.sin(angle) * maxDist;
      this.angle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
    }
  }
}

export class Decomposer implements Organism {
  type: OrganismType = 'decomposer';
  x: number;
  y: number;
  energy: number;
  alive: boolean = true;
  size: number = 10;
  speed: number = 0.8;
  vx: number;
  vy: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.energy = 50;
    this.vx = (Math.random() - 0.5) * this.speed * 2;
    this.vy = (Math.random() - 0.5) * this.speed * 2;
  }

  update(ecosystem: any, p: p5): void {
    if (!this.alive) return;

    this.energy -= 0.03;
    if (this.energy <= 0) {
      this.alive = false;
      return;
    }

    const remnants = ecosystem.getRemnants();
    let closestRemnant: any = null;
    let minDist = Infinity;

    for (const r of remnants) {
      if (!r.alive) continue;
      const d = Math.sqrt((r.x - this.x) ** 2 + (r.y - this.y) ** 2);
      if (d < minDist) {
        minDist = d;
        closestRemnant = r;
      }
    }

    if (closestRemnant && minDist < 100) {
      const angle = Math.atan2(closestRemnant.y - this.y, closestRemnant.x - this.x);
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;

      if (minDist < 12) {
        closestRemnant.alive = false;
        this.energy += 15;
        if (this.energy > 100) this.energy = 100;
        for (let i = 0; i < 5; i++) {
          ecosystem.addEnergyParticle(closestRemnant.x, closestRemnant.y);
        }
      }
    } else {
      this.vx += (Math.random() - 0.5) * 0.1;
      this.vy += (Math.random() - 0.5) * 0.1;
      const vMag = Math.sqrt(this.vx ** 2 + this.vy ** 2);
      if (vMag > this.speed) {
        this.vx = (this.vx / vMag) * this.speed;
        this.vy = (this.vy / vMag) * this.speed;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  render(p: p5): void {
    if (!this.alive) return;
    p.noStroke();
    p.fill(239, 83, 80);
    p.rectMode(p.CENTER);
    p.rect(this.x, this.y, this.size, this.size);
    p.fill(255, 150, 150, 100);
    p.rect(this.x - 1, this.y - 1, this.size * 0.6, this.size * 0.6);
  }

  checkBoundary(centerX: number, centerY: number, radius: number, p: p5): void {
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = radius - this.size * 0.5;

    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      this.x = centerX + Math.cos(angle) * maxDist;
      this.y = centerY + Math.sin(angle) * maxDist;
      this.vx *= -0.8;
      this.vy *= -0.8;
    }
  }
}

export interface Remnant {
  x: number;
  y: number;
  alive: boolean;
  life: number;
}

export interface EnergyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  alive: boolean;
}
