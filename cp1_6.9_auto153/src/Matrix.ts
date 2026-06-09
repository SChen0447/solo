import type p5 from 'p5';
import { Crystal, CrystalColor } from './Crystal';

export interface Slot {
  row: number;
  col: number;
  x: number;
  y: number;
  crystal: Crystal | null;
  isHovered: boolean;
}

export interface EnergyConnection {
  slot1: Slot;
  slot2: Slot;
  efficiency: number;
  lightPointPosition: number;
  lightPointSpeed: number;
  brightenStartTime: number;
  isBrightened: boolean;
}

export class Matrix {
  centerX: number;
  centerY: number;
  radius: number;
  slots: Slot[][];
  connections: EnergyConnection[];
  particleRingAngle: number;
  particleRingParticles: { angle: number; offset: number }[];
  hoveredSlot: Slot | null;
  gridSize: number;
  slotSpacing: number;
  maxEfficiency: number;

  static readonly GRID_SIZE = 5;
  static readonly SLOT_HEX_SIZE = 20;
  static readonly PARTICLE_COUNT = 40;
  static readonly PARTICLE_ROTATION_SPEED = 0.01;
  static readonly EFFICIENCY_THRESHOLD = 0.6;
  static readonly BRIGHTEN_DURATION = 500;

  constructor(centerX: number, centerY: number, radius: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
    this.gridSize = Matrix.GRID_SIZE;
    this.slotSpacing = (radius * 1.6) / (this.gridSize - 1);
    this.slots = [];
    this.connections = [];
    this.particleRingAngle = 0;
    this.particleRingParticles = [];
    this.hoveredSlot = null;
    this.maxEfficiency = 0;

    this.initSlots();
    this.initParticleRing();
  }

  private initSlots(): void {
    for (let row = 0; row < this.gridSize; row++) {
      this.slots[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const x = this.centerX + (col - (this.gridSize - 1) / 2) * this.slotSpacing;
        const y = this.centerY + (row - (this.gridSize - 1) / 2) * this.slotSpacing;
        this.slots[row][col] = {
          row,
          col,
          x,
          y,
          crystal: null,
          isHovered: false,
        };
      }
    }
  }

  private initParticleRing(): void {
    for (let i = 0; i < Matrix.PARTICLE_COUNT; i++) {
      this.particleRingParticles.push({
        angle: (Math.PI * 2 * i) / Matrix.PARTICLE_COUNT,
        offset: Math.random() * 10 - 5,
      });
    }
  }

  getPlacedCrystalCount(): number {
    let count = 0;
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.slots[row][col].crystal) {
          count++;
        }
      }
    }
    return count;
  }

  getSlotAt(x: number, y: number): Slot | null {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const slot = this.slots[row][col];
        const dx = x - slot.x;
        const dy = y - slot.y;
        if (Math.sqrt(dx * dx + dy * dy) <= Matrix.SLOT_HEX_SIZE) {
          return slot;
        }
      }
    }
    return null;
  }

  isInsideMatrix(x: number, y: number): boolean {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius;
  }

  placeCrystal(crystal: Crystal, slot: Slot): boolean {
    if (slot.crystal) {
      return false;
    }
    crystal.place(slot.row, slot.col, slot.x, slot.y);
    slot.crystal = crystal;
    this.updateConnections();
    return true;
  }

  removeCrystal(slot: Slot): Crystal | null {
    const crystal = slot.crystal;
    if (crystal) {
      crystal.removeFromSlot();
      slot.crystal = null;
      this.updateConnections();
    }
    return crystal;
  }

  getCrystalAt(x: number, y: number): Crystal | null {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const crystal = this.slots[row][col].crystal;
        if (crystal && crystal.isInside(x, y)) {
          return crystal;
        }
      }
    }
    return null;
  }

  updateHover(x: number, y: number): void {
    this.hoveredSlot = null;
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const slot = this.slots[row][col];
        slot.isHovered = false;
        const dx = x - slot.x;
        const dy = y - slot.y;
        if (Math.sqrt(dx * dx + dy * dy) <= Matrix.SLOT_HEX_SIZE && !slot.crystal) {
          slot.isHovered = true;
          this.hoveredSlot = slot;
        }
      }
    }
  }

  getAdjacentSlots(slot: Slot): Slot[] {
    const adjacent: Slot[] = [];
    const { row, col } = slot;
    if (row > 0) adjacent.push(this.slots[row - 1][col]);
    if (row < this.gridSize - 1) adjacent.push(this.slots[row + 1][col]);
    if (col > 0) adjacent.push(this.slots[row][col - 1]);
    if (col < this.gridSize - 1) adjacent.push(this.slots[row][col + 1]);
    return adjacent;
  }

  calculateEfficiency(crystal1: Crystal, crystal2: Crystal): number {
    const freqDiff = Math.abs(crystal1.frequency - crystal2.frequency);
    let angleDiff = Math.abs(crystal1.angle - crystal2.angle);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;
    const freqFactor = 1 - freqDiff / 3;
    const angleFactor = 1 - angleDiff / 180;
    return Math.max(0, freqFactor * angleFactor);
  }

  updateConnections(): void {
    this.connections = [];
    this.maxEfficiency = 0;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const slot = this.slots[row][col];
        if (!slot.crystal) continue;

        const adjacent = this.getAdjacentSlots(slot);
        for (const adjSlot of adjacent) {
          if (!adjSlot.crystal) continue;
          if (adjSlot.row < slot.row || (adjSlot.row === slot.row && adjSlot.col < slot.col)) {
            continue;
          }

          const efficiency = this.calculateEfficiency(slot.crystal, adjSlot.crystal);
          this.maxEfficiency = Math.max(this.maxEfficiency, efficiency);

          if (efficiency >= Matrix.EFFICIENCY_THRESHOLD) {
            const existing = this.connections.find(
              (c) =>
                (c.slot1 === slot && c.slot2 === adjSlot) ||
                (c.slot1 === adjSlot && c.slot2 === slot)
            );
            if (!existing) {
              this.connections.push({
                slot1: slot,
                slot2: adjSlot,
                efficiency,
                lightPointPosition: 0,
                lightPointSpeed: 50 + efficiency * 150,
                brightenStartTime: 0,
                isBrightened: false,
              });
            }
          }
        }
      }
    }
  }

  getConnectionNetworks(): Slot[][] {
    const visited = new Set<string>();
    const networks: Slot[][] = [];

    const getKey = (slot: Slot) => `${slot.row},${slot.col}`;

    for (const conn of this.connections) {
      const key1 = getKey(conn.slot1);
      const key2 = getKey(conn.slot2);
      if (!visited.has(key1) && !visited.has(key2)) {
        const network: Slot[] = [];
        const queue: Slot[] = [conn.slot1];
        while (queue.length > 0) {
          const current = queue.shift()!;
          const currentKey = getKey(current);
          if (visited.has(currentKey)) continue;
          visited.add(currentKey);
          network.push(current);

          for (const c of this.connections) {
            let neighbor: Slot | null = null;
            if (c.slot1 === current) neighbor = c.slot2;
            else if (c.slot2 === current) neighbor = c.slot1;
            if (neighbor && !visited.has(getKey(neighbor))) {
              queue.push(neighbor);
            }
          }
        }
        if (network.length > 0) {
          networks.push(network);
        }
      }
    }

    return networks;
  }

  getConnectedSlotCount(): number {
    const networks = this.getConnectionNetworks();
    let total = 0;
    for (const net of networks) {
      const connectionsInNet = this.connections.filter(
        (c) => net.includes(c.slot1) && net.includes(c.slot2)
      );
      if (connectionsInNet.length >= 3) {
        total += net.length;
      }
    }
    return total;
  }

  getConnectionBetween(slot1: Slot, slot2: Slot): EnergyConnection | null {
    return (
      this.connections.find(
        (c) =>
          (c.slot1 === slot1 && c.slot2 === slot2) ||
          (c.slot1 === slot2 && c.slot2 === slot1)
      ) || null
    );
  }

  brightenConnection(conn: EnergyConnection, currentTime: number): void {
    conn.isBrightened = true;
    conn.brightenStartTime = currentTime;
  }

  update(deltaTime: number, currentTime: number): void {
    this.particleRingAngle += Matrix.PARTICLE_ROTATION_SPEED * deltaTime * 60;

    for (const conn of this.connections) {
      const highFreqCrystal =
        conn.slot1.crystal!.frequency >= conn.slot2.crystal!.frequency
          ? conn.slot1.crystal!
          : conn.slot2.crystal!;
      const lowFreqCrystal =
        highFreqCrystal === conn.slot1.crystal ? conn.slot2.crystal! : conn.slot1.crystal!;
      const startX = highFreqCrystal.x;
      const startY = highFreqCrystal.y;
      const endX = lowFreqCrystal.x;
      const endY = lowFreqCrystal.y;
      const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);

      conn.lightPointPosition += (conn.lightPointSpeed * deltaTime) / dist;
      if (conn.lightPointPosition > 1) {
        conn.lightPointPosition = 0;
      }

      if (conn.isBrightened) {
        if (currentTime - conn.brightenStartTime >= Matrix.BRIGHTEN_DURATION) {
          conn.isBrightened = false;
        }
      }
    }

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const crystal = this.slots[row][col].crystal;
        if (crystal) {
          crystal.update(currentTime);
        }
      }
    }
  }

  draw(p: p5): void {
    this.drawPlatform(p);
    this.drawParticleRing(p);
    this.drawSlots(p);
    this.drawConnections(p);
    this.drawCrystals(p);
  }

  private drawPlatform(p: p5): void {
    p.push();
    const gradient = p.drawingContext.createRadialGradient(
      this.centerX,
      this.centerY,
      0,
      this.centerX,
      this.centerY,
      this.radius
    );
    gradient.addColorStop(0, '#1a0a2a');
    gradient.addColorStop(1, '#0a102a');
    p.drawingContext.fillStyle = gradient;
    p.noStroke();
    p.ellipse(this.centerX, this.centerY, this.radius * 2, this.radius * 2);

    p.noFill();
    p.stroke(136, 170, 255, 100);
    p.strokeWeight(2);
    p.ellipse(this.centerX, this.centerY, this.radius * 2, this.radius * 2);
    p.pop();
  }

  private drawParticleRing(p: p5): void {
    p.push();
    p.noStroke();
    for (const particle of this.particleRingParticles) {
      const angle = this.particleRingAngle + particle.angle;
      const r = this.radius + particle.offset;
      const x = this.centerX + Math.cos(angle) * r;
      const y = this.centerY + Math.sin(angle) * r;
      p.fill(136, 170, 255, 200);
      p.ellipse(x, y, 3, 3);
    }
    p.pop();
  }

  private drawSlots(p: p5): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        this.drawHexagonSlot(p, this.slots[row][col]);
      }
    }
  }

  private drawHexagonSlot(p: p5, slot: Slot): void {
    p.push();
    p.translate(slot.x, slot.y);

    p.noStroke();
    if (slot.isHovered) {
      p.fill(51, 85, 170, 80);
    } else {
      p.fill(51, 85, 170, 30);
    }
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (p.TWO_PI / 6) * i - p.HALF_PI;
      const x = Math.cos(angle) * Matrix.SLOT_HEX_SIZE;
      const y = Math.sin(angle) * Matrix.SLOT_HEX_SIZE;
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);

    if (slot.isHovered) {
      p.stroke(136, 221, 255, 255);
    } else {
      p.stroke(51, 85, 170, 100);
    }
    p.strokeWeight(1.5);
    p.noFill();
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (p.TWO_PI / 6) * i - p.HALF_PI;
      const x = Math.cos(angle) * Matrix.SLOT_HEX_SIZE;
      const y = Math.sin(angle) * Matrix.SLOT_HEX_SIZE;
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);

    p.pop();
  }

  private drawConnections(p: p5): void {
    for (const conn of this.connections) {
      this.drawConnection(p, conn);
    }
  }

  private drawConnection(p: p5, conn: EnergyConnection): void {
    const c1 = conn.slot1.crystal!;
    const c2 = conn.slot2.crystal!;

    const mixedColor: CrystalColor = {
      r: Math.floor((c1.color.r + c2.color.r) / 2),
      g: Math.floor((c1.color.g + c2.color.g) / 2),
      b: Math.floor((c1.color.b + c2.color.b) / 2),
    };

    const baseWidth = 2 + conn.efficiency * 4;
    const width = conn.isBrightened ? baseWidth + 4 : baseWidth;

    p.push();
    p.stroke(mixedColor.r, mixedColor.g, mixedColor.b, 180);
    p.strokeWeight(width);
    p.line(c1.x, c1.y, c2.x, c2.y);

    p.stroke(mixedColor.r, mixedColor.g, mixedColor.b, 50);
    p.strokeWeight(width + 4);
    p.line(c1.x, c1.y, c2.x, c2.y);

    const highFreqCrystal = c1.frequency >= c2.frequency ? c1 : c2;
    const lowFreqCrystal = highFreqCrystal === c1 ? c2 : c1;
    const lx = p.lerp(highFreqCrystal.x, lowFreqCrystal.x, conn.lightPointPosition);
    const ly = p.lerp(highFreqCrystal.y, lowFreqCrystal.y, conn.lightPointPosition);

    p.noStroke();
    p.fill(mixedColor.r, mixedColor.g, mixedColor.b, 255);
    p.ellipse(lx, ly, 5, 5);
    p.fill(mixedColor.r, mixedColor.g, mixedColor.b, 100);
    p.ellipse(lx, ly, 10, 10);
    p.pop();
  }

  private drawCrystals(p: p5): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const crystal = this.slots[row][col].crystal;
        if (crystal) {
          crystal.draw(p);
        }
      }
    }
  }

  resetAllCrystals(): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const crystal = this.slots[row][col].crystal;
        if (crystal) {
          crystal.frequency = 0.5 + Math.random() * 2.5;
          crystal.angle = Math.floor(Math.random() * 6) * 60;
          crystal.targetAngle = crystal.angle;
        }
      }
    }
    this.updateConnections();
  }
}
