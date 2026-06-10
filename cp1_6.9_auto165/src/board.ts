import p5 from 'p5';
import { Rune, RuneAttribute, ATTRIBUTE_COLORS, EnergyPulse } from './rune';

export interface Slot {
  x: number;
  y: number;
  q: number;
  r: number;
  occupied: boolean;
  ring: number;
}

export interface Connection {
  from: number;
  to: number;
  pulsePhase: number;
}

export interface Loop {
  runeIndices: number[];
  rotation: number;
  nebulaRadius: number;
  nebulaTargetRadius: number;
  ripplePhase: number;
  rippleTimer: number;
  mixedColor: string;
  centerX: number;
  centerY: number;
}

export class Board {
  public centerX: number;
  public centerY: number;
  public slots: Slot[];
  public runes: Rune[];
  public connections: Connection[];
  public pulses: EnergyPulse[];
  public loops: Loop[];
  public rotation: number;
  public targetRotation: number;
  public rotationSpeed: number;
  public hoveredSlot: number;
  public boardRadius: number;
  public slotSize: number;
  public borderParticles: Array<{ angle: number; distance: number; phase: number }>;
  public stars: Array<{ x: number; y: number; size: number; phase: number; speed: number }>;

  constructor(centerX: number, centerY: number, level: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.slots = [];
    this.runes = [];
    this.connections = [];
    this.pulses = [];
    this.loops = [];
    this.rotation = 0;
    this.targetRotation = 0;
    this.rotationSpeed = 0;
    this.hoveredSlot = -1;
    this.boardRadius = 300;
    this.slotSize = 22;
    this.borderParticles = [];
    this.stars = [];

    this.generateSlots(level);
    this.generateBorderParticles();
    this.generateStars();
  }

  generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 400; i++) {
      this.stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 1 + 1,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * (1.0 / 1.5) + (1.0 / 1.5)
      });
    }
  }

  generateSlots(level: number): void {
    this.slots = [];
    const slotDistance = 65;

    this.slots.push({
      x: this.centerX,
      y: this.centerY,
      q: 0,
      r: 0,
      occupied: false,
      ring: 0
    });

    for (let ring = 1; ring <= 3; ring++) {
      const count = ring * 6;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2 + (Math.PI / 6) * (ring % 2);
        const x = this.centerX + Math.cos(angle) * slotDistance * ring;
        const y = this.centerY + Math.sin(angle) * slotDistance * ring;
        const q = ring;
        const r = -ring + i;
        this.slots.push({ x, y, q, r, occupied: false, ring });
      }
    }

    if (level >= 2) {
      this.addExtraRing(4, slotDistance * 4);
    }
    if (level >= 3) {
      this.addExtraRing(5, slotDistance * 5);
    }
  }

  addExtraRing(ring: number, radius: number): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      this.slots.push({ x, y, q: ring, r: i, occupied: false, ring });
    }
  }

  generateBorderParticles(): void {
    this.borderParticles = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      this.borderParticles.push({
        angle: (Math.PI * 2 * i) / count,
        distance: this.boardRadius + Math.random() * 5 - 2.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  update(dt: number, mouseX: number, mouseY: number): void {
    for (const p of this.borderParticles) {
      p.angle += 0.015;
      p.phase += dt * 2;
    }

    for (const star of this.stars) {
      star.phase += dt * star.speed * Math.PI * 2;
    }

    if (Math.abs(this.rotationSpeed) > 0.001 || Math.abs(this.rotation - this.targetRotation) > 0.01) {
      this.rotationSpeed *= 0.95;
      this.rotation += this.rotationSpeed;
      const diff = this.targetRotation - this.rotation;
      if (Math.abs(this.rotationSpeed) < 0.01 && Math.abs(diff) > 0.01) {
        this.rotation += diff * 0.1;
      }
    }

    this.hoveredSlot = -1;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.occupied) {
        const dx = mouseX - slot.x;
        const dy = mouseY - slot.y;
        if (Math.sqrt(dx * dx + dy * dy) < this.slotSize) {
          this.hoveredSlot = i;
          break;
        }
      }
    }

    for (const rune of this.runes) {
      rune.update(dt);
    }

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      pulse.update(dt);
      if (!pulse.active) {
        this.pulses.splice(i, 1);
      }
    }

    for (const conn of this.connections) {
      conn.pulsePhase += dt * Math.PI * 2 * 1.5;
    }

    for (const loop of this.loops) {
      loop.rotation += dt * 0.5;
      if (loop.nebulaRadius < loop.nebulaTargetRadius) {
        loop.nebulaRadius = Math.min(loop.nebulaRadius + dt * 30, loop.nebulaTargetRadius);
      }
      loop.rippleTimer -= dt;
      if (loop.rippleTimer <= 0) {
        loop.ripplePhase = 0;
        loop.rippleTimer = 1.0 / 1.2;
      }
      loop.ripplePhase += dt * 1.2;
    }

    this.updateConnections();
    this.detectLoops();
  }

  updateConnections(): void {
    this.connections = [];
    const placedRunes: { index: number; slotIndex: number }[] = [];
    for (let i = 0; i < this.runes.length; i++) {
      if (this.runes[i].isPlaced && this.runes[i].slotIndex >= 0) {
        placedRunes.push({ index: i, slotIndex: this.runes[i].slotIndex });
      }
    }

    for (let i = 0; i < placedRunes.length; i++) {
      for (let j = i + 1; j < placedRunes.length; j++) {
        const a = placedRunes[i];
        const b = placedRunes[j];
        if (this.areSlotsAdjacent(a.slotIndex, b.slotIndex)) {
          if (this.runes[a.index].attribute !== this.runes[b.index].attribute) {
            this.connections.push({ from: a.index, to: b.index, pulsePhase: Math.random() * Math.PI * 2 });
            if (!this.runes[a.index].connected.includes(b.index)) {
              this.runes[a.index].connected.push(b.index);
            }
            if (!this.runes[b.index].connected.includes(a.index)) {
              this.runes[b.index].connected.push(a.index);
            }
          }
        }
      }
    }
  }

  areSlotsAdjacent(slotA: number, slotB: number): boolean {
    if (slotA < 0 || slotB < 0 || slotA >= this.slots.length || slotB >= this.slots.length) return false;
    const a = this.slots[slotA];
    const b = this.slots[slotB];
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 80;
  }

  detectLoops(): void {
    this.loops = [];
    const placed: { index: number; slotIndex: number }[] = [];
    for (let i = 0; i < this.runes.length; i++) {
      if (this.runes[i].isPlaced && this.runes[i].slotIndex >= 0) {
        placed.push({ index: i, slotIndex: this.runes[i].slotIndex });
      }
    }

    if (placed.length < 3) return;

    const adjacency = new Map<number, number[]>();
    for (const p of placed) {
      adjacency.set(p.index, []);
    }
    for (const conn of this.connections) {
      if (adjacency.has(conn.from) && adjacency.has(conn.to)) {
        adjacency.get(conn.from)!.push(conn.to);
        adjacency.get(conn.to)!.push(conn.from);
      }
    }

    const foundLoops: number[][] = [];
    const visitedTriples = new Set<string>();

    for (const start of placed) {
      const startIdx = start.index;
      this.findCycles(startIdx, startIdx, [startIdx], adjacency, foundLoops, visitedTriples, 5);
    }

    for (const loopIndices of foundLoops) {
      if (loopIndices.length >= 3) {
        let cx = 0, cy = 0;
        const attrs: RuneAttribute[] = [];
        for (const idx of loopIndices) {
          cx += this.runes[idx].x;
          cy += this.runes[idx].y;
          attrs.push(this.runes[idx].attribute);
        }
        cx /= loopIndices.length;
        cy /= loopIndices.length;

        this.loops.push({
          runeIndices: loopIndices,
          rotation: 0,
          nebulaRadius: 30,
          nebulaTargetRadius: 80,
          ripplePhase: 0,
          rippleTimer: 0,
          mixedColor: this.mixLoopColors(attrs),
          centerX: cx,
          centerY: cy
        });
      }
    }
  }

  findCycles(
    current: number,
    start: number,
    path: number[],
    adjacency: Map<number, number[]>,
    result: number[][],
    visitedTriples: Set<string>,
    maxDepth: number
  ): void {
    if (path.length > maxDepth) return;
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (neighbor === start && path.length >= 3) {
        const sorted = [...path].sort((a, b) => a - b);
        const key = sorted.join(',');
        if (!visitedTriples.has(key)) {
          visitedTriples.add(key);
          result.push([...path]);
        }
      } else if (!path.includes(neighbor)) {
        this.findCycles(neighbor, start, [...path, neighbor], adjacency, result, visitedTriples, maxDepth);
      }
    }
  }

  mixLoopColors(attrs: RuneAttribute[]): string {
    if (attrs.length === 0) return '#88aaff';
    let r = 0, g = 0, b = 0;
    for (const attr of attrs) {
      const color = ATTRIBUTE_COLORS[attr].primary;
      r += parseInt(color.slice(1, 3), 16);
      g += parseInt(color.slice(3, 5), 16);
      b += parseInt(color.slice(5, 7), 16);
    }
    r = Math.floor(r / attrs.length);
    g = Math.floor(g / attrs.length);
    b = Math.floor(b / attrs.length);
    return `rgb(${r},${g},${b})`;
  }

  placeRune(rune: Rune, slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.slots.length) return false;
    if (this.slots[slotIndex].occupied) return false;

    if (rune.slotIndex >= 0 && rune.slotIndex < this.slots.length) {
      this.slots[rune.slotIndex].occupied = false;
    }

    rune.slotIndex = slotIndex;
    rune.x = this.slots[slotIndex].x;
    rune.y = this.slots[slotIndex].y;
    rune.homeX = rune.x;
    rune.homeY = rune.y;
    rune.isPlaced = true;
    this.slots[slotIndex].occupied = true;
    rune.connected = [];
    return true;
  }

  removeRuneFromSlot(runeIndex: number): void {
    const rune = this.runes[runeIndex];
    if (rune && rune.slotIndex >= 0 && rune.slotIndex < this.slots.length) {
      this.slots[rune.slotIndex].occupied = false;
      rune.slotIndex = -1;
      rune.isPlaced = false;
    }
  }

  triggerPulse(runeIndex: number): void {
    if (runeIndex < 0 || runeIndex >= this.runes.length) return;
    const rune = this.runes[runeIndex];
    if (!rune.isPlaced) return;

    rune.emitParticles();
    rune.triggerFlash();

    const visited = new Set<number>();
    const queue: { idx: number; depth: number }[] = [{ idx: runeIndex, depth: 0 }];
    visited.add(runeIndex);

    const toFlash: number[] = [];

    while (queue.length > 0) {
      const { idx } = queue.shift()!;
      const current = this.runes[idx];
      for (const neighborIdx of current.connected) {
        if (!visited.has(neighborIdx)) {
          visited.add(neighborIdx);
          this.pulses.push(new EnergyPulse(idx, neighborIdx));
          queue.push({ idx: neighborIdx, depth: 0 });
          toFlash.push(neighborIdx);
        }
      }
    }

    setTimeout(() => {
      for (const idx of toFlash) {
        if (this.runes[idx]) {
          this.runes[idx].triggerFlash();
          this.runes[idx].emitParticles();
        }
      }
    }, 400);
  }

  getRuneAt(x: number, y: number): number {
    for (let i = this.runes.length - 1; i >= 0; i--) {
      if (this.runes[i].contains(x, y)) {
        return i;
      }
    }
    return -1;
  }

  getNearestEmptySlot(x: number, y: number): number {
    let nearest = -1;
    let minDist = Infinity;
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i].occupied) {
        const dx = x - this.slots[i].x;
        const dy = y - this.slots[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 50 && dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
    }
    return nearest;
  }

  clearAllRunes(): void {
    for (const rune of this.runes) {
      rune.slotIndex = -1;
      rune.isPlaced = false;
      rune.connected = [];
    }
    for (const slot of this.slots) {
      slot.occupied = false;
    }
    this.connections = [];
    this.pulses = [];
    this.loops = [];
    this.startRotation(Math.PI * 2);
  }

  startRotation(delta: number): void {
    this.targetRotation += delta;
    this.rotationSpeed = delta * 0.15;
  }

  drawBackground(p: p5): void {
    const gradient = p.drawingContext.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, Math.max(window.innerWidth, window.innerHeight)
    );
    gradient.addColorStop(0, '#0d0a1a');
    gradient.addColorStop(1, '#080c20');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, window.innerWidth, window.innerHeight);

    for (const star of this.stars) {
      const twinkle = 0.3 + (Math.sin(star.phase) * 0.5 + 0.5) * 0.7;
      p.noStroke();
      p.fill(255, 255, 255, Math.floor(twinkle * 255));
      p.ellipse(star.x, star.y, star.size, star.size);
    }
  }

  draw(p: p5): void {
    this.drawBackground(p);

    p.push();
    p.translate(this.centerX, this.centerY);
    p.rotate(this.rotation);
    p.translate(-this.centerX, -this.centerY);

    this.drawBoardBackground(p);
    this.drawSlots(p);
    this.drawConnections(p);
    this.drawLoops(p);
    this.drawRunes(p);
    this.drawPulses(p);
    this.drawBorderParticles(p);

    p.pop();
  }

  drawBoardBackground(p: p5): void {
    p.push();
    p.translate(this.centerX, this.centerY);
    p.noFill();
    p.stroke('#88aaff22');
    p.strokeWeight(2);
    this.drawHexagonShape(p, 0, 0, this.boardRadius);

    p.drawingContext.shadowBlur = 30;
    p.drawingContext.shadowColor = '#88aaff';
    p.stroke('#88aaff66');
    p.strokeWeight(1);
    this.drawHexagonShape(p, 0, 0, this.boardRadius - 5);
    p.pop();
  }

  drawHexagonShape(p: p5, cx: number, cy: number, r: number): void {
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);
  }

  drawSlots(p: p5): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const isHovered = i === this.hoveredSlot;
      const scale = isHovered ? 1.1 : 1.0;
      const color = isHovered ? '#99ccff' : '#3355aa';
      const alpha = isHovered ? 100 : 64;

      p.push();
      p.translate(slot.x, slot.y);

      if (isHovered) {
        p.drawingContext.shadowBlur = 15;
        p.drawingContext.shadowColor = '#99ccff';
      }

      p.noStroke();
      const alphaHex = alpha.toString(16).padStart(2, '0');
      p.fill(color + alphaHex);
      this.drawSlotHexagon(p, 0, 0, this.slotSize * scale);

      if (isHovered) {
        p.noFill();
        p.stroke('#99ccff');
        p.strokeWeight(1.5);
        this.drawSlotHexagon(p, 0, 0, this.slotSize * scale);
      }

      p.pop();
    }
  }

  drawSlotHexagon(p: p5, cx: number, cy: number, r: number): void {
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);
  }

  drawConnections(p: p5): void {
    for (const conn of this.connections) {
      const runeA = this.runes[conn.from];
      const runeB = this.runes[conn.to];
      if (!runeA || !runeB) continue;

      const mixColor = Rune.mixColor(runeA.attribute, runeB.attribute);

      let isHighlighted = false;
      for (const pulse of this.pulses) {
        if ((pulse.fromRune === conn.from && pulse.toRune === conn.to) ||
            (pulse.fromRune === conn.to && pulse.toRune === conn.from)) {
          if (pulse.isLineHighlighted()) {
            isHighlighted = true;
            break;
          }
        }
      }

      const strokeWidth = isHighlighted ? 3 : 1.5;
      const glow = isHighlighted ? 25 : 10;

      p.push();
      p.drawingContext.shadowBlur = glow;
      p.drawingContext.shadowColor = mixColor;
      p.stroke(mixColor);
      p.strokeWeight(strokeWidth);
      p.line(runeA.x, runeA.y, runeB.x, runeB.y);

      const pulse = (Math.sin(conn.pulsePhase) + 1) / 2;
      const px = runeA.x + (runeB.x - runeA.x) * pulse;
      const py = runeA.y + (runeB.y - runeA.y) * pulse;
      p.noStroke();
      p.fill(mixColor + 'ff');
      p.ellipse(px, py, 4, 4);
      p.pop();
    }
  }

  drawPulses(p: p5): void {
    for (const pulse of this.pulses) {
      const runeA = this.runes[pulse.fromRune];
      const runeB = this.runes[pulse.toRune];
      if (!runeA || !runeB || pulse.progress > 1) continue;

      const mixColor = Rune.mixColor(runeA.attribute, runeB.attribute);
      const t = pulse.progress;
      const x = runeA.x + (runeB.x - runeA.x) * t;
      const y = runeA.y + (runeB.y - runeA.y) * t;

      p.push();
      p.drawingContext.shadowBlur = 20;
      p.drawingContext.shadowColor = mixColor;
      p.noStroke();
      p.fill(mixColor + 'ff');
      p.ellipse(x, y, 8, 8);
      p.fill('#ffffffcc');
      p.ellipse(x, y, 4, 4);
      p.pop();
    }
  }

  drawLoops(p: p5): void {
    for (const loop of this.loops) {
      if (loop.runeIndices.length < 3) continue;

      p.push();
      p.translate(loop.centerX, loop.centerY);
      p.rotate(loop.rotation);

      const nebulaGrad = p.drawingContext.createRadialGradient(0, 0, 0, 0, 0, loop.nebulaRadius);
      nebulaGrad.addColorStop(0, loop.mixedColor + '88');
      nebulaGrad.addColorStop(0.5, loop.mixedColor + '33');
      nebulaGrad.addColorStop(1, loop.mixedColor + '00');
      p.drawingContext.fillStyle = nebulaGrad;
      p.noStroke();
      p.ellipse(0, 0, loop.nebulaRadius * 2, loop.nebulaRadius * 2);

      const rippleAlpha = Math.max(0, 1 - loop.ripplePhase);
      const rippleR = 30 + loop.ripplePhase * 80;
      p.noFill();
      p.stroke(loop.mixedColor + Math.floor(rippleAlpha * 255).toString(16).padStart(2, '0'));
      p.strokeWeight(2);
      p.ellipse(0, 0, rippleR * 2, rippleR * 2);

      for (let i = 0; i < loop.runeIndices.length; i++) {
        const idx = loop.runeIndices[i];
        const nextIdx = loop.runeIndices[(i + 1) % loop.runeIndices.length];
        const r1 = this.runes[idx];
        const r2 = this.runes[nextIdx];
        if (r1 && r2) {
          const mixColor = Rune.mixColor(r1.attribute, r2.attribute);
          p.drawingContext.shadowBlur = 20;
          p.drawingContext.shadowColor = mixColor;
          p.stroke(mixColor + 'aa');
          p.strokeWeight(2.5);
          p.line(r1.x - loop.centerX, r1.y - loop.centerY, r2.x - loop.centerX, r2.y - loop.centerY);
        }
      }

      p.pop();
    }
  }

  drawRunes(p: p5): void {
    for (const rune of this.runes) {
      rune.draw(p);
    }
  }

  drawBorderParticles(p: p5): void {
    for (const bp of this.borderParticles) {
      const x = this.centerX + Math.cos(bp.angle) * bp.distance;
      const y = this.centerY + Math.sin(bp.angle) * bp.distance;
      const alpha = (Math.sin(bp.phase) + 1) / 2 * 0.8 + 0.2;

      p.push();
      p.drawingContext.shadowBlur = 8;
      p.drawingContext.shadowColor = '#88aaff';
      p.noStroke();
      p.fill('#88aaff' + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
      p.ellipse(x, y, 2, 2);
      p.pop();
    }
  }

  resize(newCenterX: number, newCenterY: number): void {
    const dx = newCenterX - this.centerX;
    const dy = newCenterY - this.centerY;
    this.centerX = newCenterX;
    this.centerY = newCenterY;

    for (const slot of this.slots) {
      slot.x += dx;
      slot.y += dy;
    }
    for (const rune of this.runes) {
      rune.x += dx;
      rune.y += dy;
      rune.homeX += dx;
      rune.homeY += dy;
    }

    this.generateStars();
    this.generateBorderParticles();
  }
}
