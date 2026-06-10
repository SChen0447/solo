import type p5 from 'p5';
import { Matrix, Slot, EnergyConnection } from './Matrix';
import { Crystal, CrystalColor } from './Crystal';

interface PulseWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  color: CrystalColor;
  currentSlot: Slot;
  visitedSlots: Set<string>;
  lineWidth: number;
  startTime: number;
  propagated: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: CrystalColor;
  alpha: number;
  startTime: number;
  duration: number;
}

export class ResonanceSystem {
  matrix: Matrix;
  pulseWaves: PulseWave[];
  particles: Particle[];
  pulseCount: number;
  lastPulseTime: number;
  isUltimateResonance: boolean;
  ultimateResonanceStartTime: number;
  ultimateFlashStartTime: number;
  isUltimateFlashing: boolean;

  static readonly PULSE_INTERVAL = 300;
  static readonly PULSE_MAX_RADIUS = 150;
  static readonly PULSE_SPEED = 200;
  static readonly PULSE_LINE_WIDTH = 3;
  static readonly MIN_CONNECTIONS_FOR_PULSE = 3;
  static readonly ULTIMATE_THRESHOLD = 5;
  static readonly ULTIMATE_PARTICLE_COUNT = 200;
  static readonly ULTIMATE_DURATION = 2000;
  static readonly ULTIMATE_FLASH_DURATION = 300;

  constructor(matrix: Matrix) {
    this.matrix = matrix;
    this.pulseWaves = [];
    this.particles = [];
    this.pulseCount = 0;
    this.lastPulseTime = 0;
    this.isUltimateResonance = false;
    this.ultimateResonanceStartTime = 0;
    this.ultimateFlashStartTime = 0;
    this.isUltimateFlashing = false;
  }

  resetPulseCount(): void {
    this.pulseCount = 0;
  }

  canTriggerUltimate(): boolean {
    return this.pulseCount >= ResonanceSystem.ULTIMATE_THRESHOLD && !this.isUltimateResonance;
  }

  triggerUltimateResonance(currentTime: number): void {
    if (!this.canTriggerUltimate()) return;

    this.isUltimateResonance = true;
    this.ultimateResonanceStartTime = currentTime;
    this.isUltimateFlashing = true;
    this.ultimateFlashStartTime = currentTime;

    this.spawnUltimateParticles();

    for (let row = 0; row < this.matrix.gridSize; row++) {
      for (let col = 0; col < this.matrix.gridSize; col++) {
        const crystal = this.matrix.slots[row][col].crystal;
        if (crystal) {
          crystal.triggerFlash();
        }
      }
    }
  }

  private spawnUltimateParticles(): void {
    const crystalColors: CrystalColor[] = [];
    for (let row = 0; row < this.matrix.gridSize; row++) {
      for (let col = 0; col < this.matrix.gridSize; col++) {
        const crystal = this.matrix.slots[row][col].crystal;
        if (crystal) {
          crystalColors.push(crystal.color);
        }
      }
    }

    if (crystalColors.length === 0) return;

    for (let i = 0; i < ResonanceSystem.ULTIMATE_PARTICLE_COUNT; i++) {
      const color = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      this.particles.push({
        x: this.matrix.centerX,
        y: this.matrix.centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: { ...color },
        alpha: 255,
        startTime: performance.now(),
        duration: ResonanceSystem.ULTIMATE_DURATION,
      });
    }
  }

  private getValidNetworks(): Slot[][] {
    const networks = this.matrix.getConnectionNetworks();
    return networks.filter((net) => {
      const connectionsInNet = this.matrix.connections.filter(
        (c) => net.includes(c.slot1) && net.includes(c.slot2)
      );
      return connectionsInNet.length >= ResonanceSystem.MIN_CONNECTIONS_FOR_PULSE;
    });
  }

  private spawnPulseWave(startSlot: Slot, currentTime: number): void {
    if (!startSlot.crystal) return;

    this.pulseWaves.push({
      x: startSlot.x,
      y: startSlot.y,
      radius: 0,
      maxRadius: ResonanceSystem.PULSE_MAX_RADIUS,
      speed: ResonanceSystem.PULSE_SPEED,
      color: { ...startSlot.crystal.color },
      currentSlot: startSlot,
      visitedSlots: new Set([`${startSlot.row},${startSlot.col}`]),
      lineWidth: ResonanceSystem.PULSE_LINE_WIDTH,
      startTime: currentTime,
      propagated: false,
    });

    startSlot.crystal.triggerFlash();
  }

  private propagatePulse(pulse: PulseWave, currentTime: number): void {
    if (pulse.propagated) return;

    const adjacent = this.matrix.getAdjacentSlots(pulse.currentSlot);
    for (const adjSlot of adjacent) {
      const key = `${adjSlot.row},${adjSlot.col}`;
      if (pulse.visitedSlots.has(key)) continue;

      const conn = this.matrix.getConnectionBetween(pulse.currentSlot, adjSlot);
      if (conn) {
        this.matrix.brightenConnection(conn, currentTime);
        if (adjSlot.crystal) {
          pulse.visitedSlots.add(key);
          this.pulseWaves.push({
            x: adjSlot.x,
            y: adjSlot.y,
            radius: 0,
            maxRadius: ResonanceSystem.PULSE_MAX_RADIUS,
            speed: ResonanceSystem.PULSE_SPEED,
            color: { ...adjSlot.crystal.color },
            currentSlot: adjSlot,
            visitedSlots: new Set(pulse.visitedSlots),
            lineWidth: ResonanceSystem.PULSE_LINE_WIDTH,
            startTime: currentTime,
            propagated: false,
          });
          adjSlot.crystal.triggerFlash();
        }
      }
    }
    pulse.propagated = true;
  }

  update(deltaTime: number, currentTime: number): void {
    if (this.isUltimateResonance) {
      if (currentTime - this.ultimateResonanceStartTime >= ResonanceSystem.ULTIMATE_DURATION) {
        this.isUltimateResonance = false;
        this.matrix.resetAllCrystals();
        this.pulseCount = 0;
      }
      if (this.isUltimateFlashing && currentTime - this.ultimateFlashStartTime >= ResonanceSystem.ULTIMATE_FLASH_DURATION) {
        this.isUltimateFlashing = false;
      }
    }

    const validNetworks = this.getValidNetworks();
    if (validNetworks.length > 0 && !this.isUltimateResonance) {
      if (currentTime - this.lastPulseTime >= ResonanceSystem.PULSE_INTERVAL) {
        const network = validNetworks[Math.floor(Math.random() * validNetworks.length)];
        const startSlot = network[Math.floor(Math.random() * network.length)];
        this.spawnPulseWave(startSlot, currentTime);
        this.lastPulseTime = currentTime;
        this.pulseCount++;
      }
    }

    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      const pulse = this.pulseWaves[i];
      pulse.radius += pulse.speed * deltaTime;

      const propagationThreshold = Crystal.RADIUS + 10;
      if (pulse.radius >= propagationThreshold && !pulse.propagated) {
        this.propagatePulse(pulse, currentTime);
      }

      if (pulse.radius >= pulse.maxRadius) {
        this.pulseWaves.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const elapsed = currentTime - particle.startTime;
      if (elapsed >= particle.duration) {
        this.particles.splice(i, 1);
        continue;
      }
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      particle.alpha = 255 * (1 - elapsed / particle.duration);
    }
  }

  draw(p: p5, currentTime: number): void {
    this.drawPulseWaves(p);
    this.drawParticles(p);

    if (this.isUltimateResonance) {
      this.drawUltimateConnections(p, currentTime);
      if (this.isUltimateFlashing) {
        this.drawUltimateFlash(p, currentTime);
      }
    }
  }

  private drawPulseWaves(p: p5): void {
    for (const pulse of this.pulseWaves) {
      const alpha = 255 * (1 - pulse.radius / pulse.maxRadius);
      p.push();
      p.noFill();
      p.stroke(pulse.color.r, pulse.color.g, pulse.color.b, alpha);
      p.strokeWeight(pulse.lineWidth);
      p.ellipse(pulse.x, pulse.y, pulse.radius * 2, pulse.radius * 2);

      p.stroke(pulse.color.r, pulse.color.g, pulse.color.b, alpha * 0.3);
      p.strokeWeight(pulse.lineWidth + 4);
      p.ellipse(pulse.x, pulse.y, pulse.radius * 2, pulse.radius * 2);
      p.pop();
    }
  }

  private drawParticles(p: p5): void {
    for (const particle of this.particles) {
      p.push();
      p.noStroke();
      p.fill(particle.color.r, particle.color.g, particle.color.b, particle.alpha);
      p.ellipse(particle.x, particle.y, particle.size, particle.size);

      p.fill(particle.color.r, particle.color.g, particle.color.b, particle.alpha * 0.3);
      p.ellipse(particle.x, particle.y, particle.size * 2, particle.size * 2);
      p.pop();
    }
  }

  private drawUltimateConnections(p: p5, currentTime: number): void {
    const elapsed = currentTime - this.ultimateResonanceStartTime;
    const alpha = Math.max(0, 200 * (1 - elapsed / ResonanceSystem.ULTIMATE_DURATION));

    const crystals: Crystal[] = [];
    for (let row = 0; row < this.matrix.gridSize; row++) {
      for (let col = 0; col < this.matrix.gridSize; col++) {
        if (this.matrix.slots[row][col].crystal) {
          crystals.push(this.matrix.slots[row][col].crystal!);
        }
      }
    }

    for (let i = 0; i < crystals.length; i++) {
      for (let j = i + 1; j < crystals.length; j++) {
        const c1 = crystals[i];
        const c2 = crystals[j];
        const mixedColor: CrystalColor = {
          r: Math.floor((c1.color.r + c2.color.r) / 2),
          g: Math.floor((c1.color.g + c2.color.g) / 2),
          b: Math.floor((c1.color.b + c2.color.b) / 2),
        };
        p.push();
        p.stroke(mixedColor.r, mixedColor.g, mixedColor.b, alpha);
        p.strokeWeight(3);
        p.line(c1.x, c1.y, c2.x, c2.y);
        p.pop();
      }
    }
  }

  private drawUltimateFlash(p: p5, currentTime: number): void {
    const elapsed = currentTime - this.ultimateFlashStartTime;
    const t = elapsed / ResonanceSystem.ULTIMATE_FLASH_DURATION;
    const alpha = Math.floor(100 * Math.sin(t * Math.PI));
    if (alpha > 0) {
      p.push();
      p.noStroke();
      p.fill(255, 255, 255, alpha);
      p.rect(0, 0, p.width, p.height);
      p.pop();
    }
  }

  isCircleGesture(points: { x: number; y: number }[]): boolean {
    if (points.length < 10) return false;

    let sumX = 0, sumY = 0;
    for (const pt of points) {
      sumX += pt.x;
      sumY += pt.y;
    }
    const centerX = sumX / points.length;
    const centerY = sumY / points.length;

    let sumRadius = 0;
    const radii: number[] = [];
    for (const pt of points) {
      const r = Math.sqrt((pt.x - centerX) ** 2 + (pt.y - centerY) ** 2);
      radii.push(r);
      sumRadius += r;
    }
    const avgRadius = sumRadius / points.length;
    if (avgRadius < 80) return false;

    let variance = 0;
    for (const r of radii) {
      variance += (r - avgRadius) ** 2;
    }
    variance /= points.length;
    const stdDev = Math.sqrt(variance);

    const first = points[0];
    const last = points[points.length - 1];
    const closureDist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);

    return stdDev < avgRadius * 0.4 && closureDist < avgRadius * 0.6;
  }
}
