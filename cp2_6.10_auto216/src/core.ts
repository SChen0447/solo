import { HexNode, RuneType, StateManager, Spell } from './state';

const HEX_SIZE = 60;
const HEX_LAYERS = 3;

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

export interface AnimationState {
  particles: Particle[];
  activeSpell: Spell | null;
  spellStartTime: number;
  spellEffectProgress: number;
  clearAnimation: { active: boolean; startTime: number; progress: number };
}

export class MagicCore {
  private state: StateManager;
  private canvas: HTMLCanvasElement;
  private centerX: number;
  private centerY: number;
  private particlePool: Particle[];
  private animationState: AnimationState;

  constructor(canvas: HTMLCanvasElement, state: StateManager) {
    this.canvas = canvas;
    this.state = state;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.particlePool = this.createParticlePool(100);
    this.animationState = {
      particles: this.particlePool,
      activeSpell: null,
      spellStartTime: 0,
      spellEffectProgress: 0,
      clearAnimation: { active: false, startTime: 0, progress: 0 }
    };
    this.initHexGrid();
  }

  private createParticlePool(count: number): Particle[] {
    const pool: Particle[] = [];
    for (let i = 0; i < count; i++) {
      pool.push({
        active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        size: 0, color: '#fff',
        alpha: 0, life: 0, maxLife: 1,
        rotation: 0, rotationSpeed: 0
      });
    }
    return pool;
  }

  private initHexGrid(): void {
    const nodes: HexNode[] = [];
    for (let q = -HEX_LAYERS; q <= HEX_LAYERS; q++) {
      const r1 = Math.max(-HEX_LAYERS, -q - HEX_LAYERS);
      const r2 = Math.min(HEX_LAYERS, -q + HEX_LAYERS);
      for (let r = r1; r <= r2; r++) {
        const pos = this.hexToPixel(q, r);
        nodes.push({
          id: `hex_${q}_${r}`,
          q, r,
          x: pos.x,
          y: pos.y,
          rune: null,
          isHighlighted: false,
          pulseProgress: 0,
          fadeProgress: 1,
          fadeOut: false
        });
      }
    }
    this.state.setHexNodes(nodes);
  }

  private hexToPixel(q: number, r: number): { x: number; y: number } {
    const x = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = HEX_SIZE * (3 / 2 * r);
    return {
      x: this.centerX + x,
      y: this.centerY + y
    };
  }

  getHexCorners(cx: number, cy: number, size: number): { x: number; y: number }[] {
    const corners: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angleDeg = 60 * i - 30;
      const angleRad = (Math.PI / 180) * angleDeg;
      corners.push({
        x: cx + size * Math.cos(angleRad),
        y: cy + size * Math.sin(angleRad)
      });
    }
    return corners;
  }

  isPointInHex(px: number, py: number, hx: number, hy: number, size: number): boolean {
    const dx = Math.abs(px - hx);
    const dy = Math.abs(py - hy);
    if (dy > size * Math.sqrt(3) / 2) return false;
    if (dx > size) return false;
    return size * Math.sqrt(3) / 2 * size - size / 2 * dy >= Math.sqrt(3) / 2 * dx * size;
  }

  findHexAtPosition(px: number, py: number): HexNode | null {
    const nodes = this.state.getState().hexNodes;
    for (const node of nodes) {
      if (this.isPointInHex(px, py, node.x, node.y, HEX_SIZE - 2)) {
        return node;
      }
    }
    return null;
  }

  getHexNeighbors(node: HexNode): HexNode[] {
    const directions = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ];
    const nodes = this.state.getState().hexNodes;
    return directions
      .map(d => nodes.find(n => n.q === node.q + d.q && n.r === node.r + d.r))
      .filter((n): n is HexNode => n !== undefined);
  }

  handleCanvasClick(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const node = this.findHexAtPosition(x, y);
    if (!node) return;

    const { selectedRune } = this.state.getState();

    if (selectedRune && !node.rune) {
      this.placeRune(node, selectedRune);
    } else {
      this.triggerPulse(node.id);
    }
  }

  private placeRune(node: HexNode, rune: RuneType): void {
    this.state.updateHexNode(node.id, {
      rune,
      isHighlighted: true,
      pulseProgress: 0
    });
    this.state.addToSequence(node.id, rune);
    this.triggerPulse(node.id);

    const spell = this.state.checkSpellCombination();
    if (spell) {
      this.triggerSpell(spell);
    }
  }

  private triggerPulse(nodeId: string): void {
    this.state.updateHexNode(nodeId, { pulseProgress: 0 });
    let start: number | null = null;
    const duration = 300;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(elapsed / duration, 1);
      const progress = t;

      this.state.updateHexNode(nodeId, { pulseProgress: progress });

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.state.updateHexNode(nodeId, { pulseProgress: 0, isHighlighted: false });
      }
    };
    requestAnimationFrame(animate);
  }

  private triggerSpell(spell: Spell): void {
    this.state.setActiveSpell(spell);
    this.animationState.activeSpell = spell;
    this.animationState.spellStartTime = performance.now();
    this.animationState.spellEffectProgress = 0;

    this.state.addSpellRecord(spell, this.state.getCurrentRunes());

    this.spawnSpellParticles(spell);

    setTimeout(() => {
      this.animationState.activeSpell = null;
      this.state.setActiveSpell(null);
    }, spell.duration);
  }

  private spawnSpellParticles(spell: Spell): void {
    switch (spell.effectType) {
      case 'EXPLOSION':
        this.spawnExplosionParticles();
        break;
      case 'FREEZE':
        this.spawnFreezeParticles();
        break;
      case 'THUNDERSTORM':
        this.spawnThunderstormParticles();
        break;
      case 'HELLFIRE':
        this.spawnHellfireParticles();
        break;
      case 'TEMPEST':
        this.spawnTempestParticles();
        break;
    }
  }

  private getParticleFromPool(): Particle | null {
    return this.particlePool.find(p => !p.active) || null;
  }

  private spawnExplosionParticles(): void {
    const colors = ['#e74c3c', '#ff6b6b', '#ffa502', '#ff7f50'];
    for (let i = 0; i < 80; i++) {
      const p = this.getParticleFromPool();
      if (!p) break;
      const angle = (Math.PI * 2 * i) / 80 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 5;
      p.active = true;
      p.x = this.centerX;
      p.y = this.centerY;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 3 + Math.random() * 6;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1;
      p.life = 1500 + Math.random() * 500;
      p.maxLife = p.life;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }
  }

  private spawnFreezeParticles(): void {
    const nodes = this.state.getState().hexNodes;
    const colors = ['#3498db', '#74b9ff', '#a29bfe', '#dfe6e9'];
    for (let i = 0; i < 70; i++) {
      const p = this.getParticleFromPool();
      if (!p) break;
      const node = nodes[Math.floor(Math.random() * nodes.length)];
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;
      p.active = true;
      p.x = node.x + offsetX;
      p.y = node.y + offsetY;
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = -0.5 - Math.random() * 1;
      p.size = 2 + Math.random() * 5;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 0.8;
      p.life = 1800 + Math.random() * 400;
      p.maxLife = p.life;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }
  }

  private spawnThunderstormParticles(): void {
    const colors = ['#f1c40f', '#ffeaa7', '#fdcb6e', '#fff'];
    for (let i = 0; i < 60; i++) {
      const p = this.getParticleFromPool();
      if (!p) break;
      p.active = true;
      p.x = Math.random() * this.canvas.width;
      p.y = -10 - Math.random() * 100;
      p.vx = (Math.random() - 0.5) * 1;
      p.vy = 8 + Math.random() * 6;
      p.size = 2 + Math.random() * 4;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1;
      p.life = 800 + Math.random() * 400;
      p.maxLife = p.life;
      p.rotation = 0;
      p.rotationSpeed = 0;
    }
  }

  private spawnHellfireParticles(): void {
    const colors = ['#8b0000', '#a52a2a', '#dc143c', '#4a0000'];
    for (let i = 0; i < 80; i++) {
      const p = this.getParticleFromPool();
      if (!p) break;
      const startX = this.centerX + (Math.random() - 0.5) * 200;
      p.active = true;
      p.x = startX;
      p.y = this.canvas.height + 10;
      p.vx = (Math.random() - 0.5) * 1.5;
      p.vy = -2 - Math.random() * 4;
      p.size = 4 + Math.random() * 8;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 0.9;
      p.life = 1800 + Math.random() * 600;
      p.maxLife = p.life;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.15;
    }
  }

  private spawnTempestParticles(): void {
    const colors = ['#f1c40f', '#3498db', '#e74c3c', '#74b9ff'];
    for (let i = 0; i < 90; i++) {
      const p = this.getParticleFromPool();
      if (!p) break;
      const angle = (i / 90) * Math.PI * 4;
      const radius = 50 + Math.random() * 80;
      p.active = true;
      p.x = this.centerX + Math.cos(angle) * radius;
      p.y = this.centerY + Math.sin(angle) * radius;
      p.vx = 0;
      p.vy = 0;
      p.size = 3 + Math.random() * 5;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1;
      p.life = 2200 + Math.random() * 500;
      p.maxLife = p.life;
      p.rotation = angle;
      p.rotationSpeed = 0.08 + Math.random() * 0.04;
    }
  }

  updateParticles(deltaTime: number): void {
    const spell = this.animationState.activeSpell;

    for (const p of this.particlePool) {
      if (!p.active) continue;

      p.life -= deltaTime;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.alpha = Math.max(0, p.life / p.maxLife);

      if (spell?.effectType === 'TEMPEST') {
        p.rotation += p.rotationSpeed;
        const radius = 60 + ((p.maxLife - p.life) / p.maxLife) * 40;
        p.x = this.centerX + Math.cos(p.rotation) * radius;
        p.y = this.centerY + Math.sin(p.rotation) * radius;
      } else {
        p.x += p.vx;
        p.y += p.vy;

        if (spell?.effectType === 'HELLFIRE') {
          p.vx += (Math.random() - 0.5) * 0.2;
          p.vy *= 0.99;
        }
        if (spell?.effectType === 'EXPLOSION') {
          p.vx *= 0.98;
          p.vy *= 0.98;
        }
      }
    }
  }

  getAnimationState(): AnimationState {
    return this.animationState;
  }

  getParticles(): Particle[] {
    return this.particlePool;
  }

  undoLastRune(): void {
    const last = this.state.removeLastFromSequence();
    if (last) {
      const node = this.state.getState().hexNodes.find(n => n.id === last.nodeId);
      if (node) {
        this.state.updateHexNode(node.id, { fadeOut: true, fadeProgress: 1 });
        let start: number | null = null;
        const animate = (timestamp: number) => {
          if (!start) start = timestamp;
          const elapsed = timestamp - start;
          const t = Math.min(elapsed / 300, 1);
          const progress = 1 - t;
          this.state.updateHexNode(node.id, { fadeProgress: progress });
          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            this.state.updateHexNode(node.id, { rune: null, fadeOut: false, fadeProgress: 1 });
          }
        };
        requestAnimationFrame(animate);
      }
    }
  }

  clearAllRunes(): void {
    this.state.clearAllRunes();
    this.animationState.clearAnimation = {
      active: true,
      startTime: performance.now(),
      progress: 0
    };
    this.state.clearSequence();

    setTimeout(() => {
      this.animationState.clearAnimation.active = false;
      this.state.getState().hexNodes.forEach(node => {
        node.fadeOut = false;
        node.fadeProgress = 1;
      });
    }, 600);
  }

  getHexSize(): number {
    return HEX_SIZE;
  }

  getCenter(): { x: number; y: number } {
    return { x: this.centerX, y: this.centerY };
  }

  resizeCanvas(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.initHexGrid();
  }
}
