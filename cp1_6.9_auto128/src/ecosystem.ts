import p5 from 'p5';
import { Organism, Producer, Consumer, Decomposer, OrganismType, Remnant, EnergyParticle } from './organism';

export class Ecosystem {
  centerX: number;
  centerY: number;
  sphereRadius: number;
  organisms: Organism[] = [];
  remnants: Remnant[] = [];
  energyParticles: EnergyParticle[] = [];
  initialCounts: Record<OrganismType, number> = {
    producer: 0,
    consumer: 0,
    decomposer: 0
  };
  maxInitialPerType: number = 5;

  constructor(centerX: number, centerY: number, sphereRadius: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.sphereRadius = sphereRadius;
  }

  addOrganism(org: Organism): void {
    this.organisms.push(org);
  }

  canAddOrganism(type: OrganismType): boolean {
    return this.initialCounts[type] < this.maxInitialPerType;
  }

  tryAddOrganism(type: OrganismType, x: number, y: number): boolean {
    if (!this.canAddOrganism(type)) return false;

    let org: Organism;
    switch (type) {
      case 'producer':
        org = new Producer(x, y);
        break;
      case 'consumer':
        org = new Consumer(x, y);
        break;
      case 'decomposer':
        org = new Decomposer(x, y);
        break;
    }
    this.organisms.push(org);
    this.initialCounts[type]++;
    return true;
  }

  addRemnant(x: number, y: number): void {
    this.remnants.push({
      x,
      y,
      alive: true,
      life: 300
    });
  }

  addEnergyParticle(x: number, y: number): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    this.energyParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 60 + Math.random() * 40,
      maxLife: 100,
      alive: true
    });
  }

  getProducers(): Producer[] {
    return this.organisms.filter((o): o is Producer => o.type === 'producer' && o.alive);
  }

  getConsumers(): Consumer[] {
    return this.organisms.filter((o): o is Consumer => o.type === 'consumer' && o.alive);
  }

  getDecomposers(): Decomposer[] {
    return this.organisms.filter((o): o is Decomposer => o.type === 'decomposer' && o.alive);
  }

  getRemnants(): Remnant[] {
    return this.remnants;
  }

  getProducerCount(): number {
    return this.getProducers().length;
  }

  getConsumerCount(): number {
    return this.getConsumers().length;
  }

  getDecomposerCount(): number {
    return this.getDecomposers().length;
  }

  getTotalEnergy(): number {
    let total = 0;
    for (const org of this.organisms) {
      if (org.alive) total += org.energy;
    }
    return total;
  }

  getMaxEnergy(): number {
    const count = this.organisms.filter(o => o.alive).length;
    return Math.max(count * 100, 100);
  }

  getTotalOrganismCount(): number {
    return this.organisms.filter(o => o.alive).length;
  }

  isInsideSphere(x: number, y: number): boolean {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    return Math.sqrt(dx * dx + dy * dy) < this.sphereRadius - 10;
  }

  update(p: p5): void {
    const totalCount = this.getTotalOrganismCount();
    const useHighPrecision = totalCount <= 30;

    for (const org of this.organisms) {
      if (!org.alive) continue;
      org.update(this, p);
      org.checkBoundary(this.centerX, this.centerY, this.sphereRadius, p);
    }

    for (const r of this.remnants) {
      if (!r.alive) continue;
      r.life--;
      if (r.life <= 0) r.alive = false;
    }

    for (const ep of this.energyParticles) {
      if (!ep.alive) continue;
      ep.x += ep.vx;
      ep.y += ep.vy;
      ep.vx *= 0.98;
      ep.vy *= 0.98;
      ep.vy -= 0.01;
      ep.life--;
      if (ep.life <= 0) ep.alive = false;
    }

    this.organisms = this.organisms.filter(o => o.alive);
    this.remnants = this.remnants.filter(r => r.alive);
    this.energyParticles = this.energyParticles.filter(ep => ep.alive);

    if (!useHighPrecision) {
      if (this.energyParticles.length > 50) {
        this.energyParticles = this.energyParticles.slice(-50);
      }
    }
  }

  render(p: p5): void {
    const totalCount = this.getTotalOrganismCount();
    const renderParticles = totalCount <= 30;

    for (const r of this.remnants) {
      if (!r.alive) continue;
      p.noStroke();
      p.fill(150, 150, 150, Math.min(200, r.life));
      p.ellipse(r.x, r.y, 10, 10);
      p.fill(180, 180, 180, Math.min(120, r.life * 0.6));
      p.ellipse(r.x, r.y, 16, 16);
    }

    for (const org of this.organisms) {
      org.render(p);
    }

    if (renderParticles) {
      for (const ep of this.energyParticles) {
        if (!ep.alive) continue;
        const alpha = (ep.life / ep.maxLife) * 255;
        p.noStroke();
        p.fill(255, 215, 0, alpha);
        p.ellipse(ep.x, ep.y, 3, 3);
        p.fill(255, 255, 150, alpha * 0.5);
        p.ellipse(ep.x, ep.y, 6, 6);
      }
    }
  }

  reset(): void {
    this.organisms = [];
    this.remnants = [];
    this.energyParticles = [];
    this.initialCounts = {
      producer: 0,
      consumer: 0,
      decomposer: 0
    };
  }
}
