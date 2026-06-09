import p5 from 'p5';
import { Particle } from './particle';
import { Leaf } from './leaf';

export const MEMORY_COLORS = [
  '#ff6688',
  '#ffaa44',
  '#ffdd44',
  '#44bb66',
  '#66ccff',
  '#8888ff',
  '#cc66ff',
  '#ff88cc'
];

interface Branch {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number;
  baseAngle: number;
  angle: number;
  thickness: number;
  depth: number;
  children: Branch[];
  parent: Branch | null;
  pulsePhase: number;
  pulseSpeed: number;
  isReturning: boolean;
  returnStartTime: number;
  leaves: Leaf[];
}

interface Seed {
  x: number;
  y: number;
  size: number;
  isGrowing: boolean;
  growthStartTime: number;
  shaking: boolean;
  shakingStartTime: number;
}

interface Root {
  x: number;
  y: number;
  angle: number;
  length: number;
  currentLength: number;
  growthStartTime: number;
  growthDuration: number;
}

interface TreeConnection {
  leaf1: Leaf;
  leaf2: Leaf;
  pulsePhase: number;
}

interface TreeData {
  branches: Branch[];
  leaves: Leaf[];
  seed: Seed | null;
  roots: Root[];
  grown: boolean;
  growthStartTime: number;
}

export class TreeSystem {
  private p: p5;
  private trees: Map<number, TreeData>;
  private particles: Particle[];
  private connections: TreeConnection[];
  private treeIdCounter: number;
  private draggedLeaf: Leaf | null;
  private maxParticles: number;

  constructor(p: p5) {
    this.p = p;
    this.trees = new Map();
    this.particles = [];
    this.connections = [];
    this.treeIdCounter = 0;
    this.draggedLeaf = null;
    this.maxParticles = 400;
  }

  createInitialTree(x: number, y: number): void {
    const treeId = this.treeIdCounter++;
    this.trees.set(treeId, {
      branches: [],
      leaves: [],
      seed: {
        x,
        y,
        size: 10,
        isGrowing: false,
        growthStartTime: 0,
        shaking: false,
        shakingStartTime: 0
      },
      roots: [],
      grown: false,
      growthStartTime: 0
    });
  }

  addTreeAt(x: number, y: number, delayFrames: number = 30): void {
    const treeId = this.treeIdCounter++;
    this.trees.set(treeId, {
      branches: [],
      leaves: [],
      seed: {
        x,
        y,
        size: 10,
        isGrowing: false,
        growthStartTime: 0,
        shaking: false,
        shakingStartTime: 0
      },
      roots: [],
      grown: false,
      growthStartTime: 0
    });

    this.startGrowthWithDelay(treeId, delayFrames);
  }

  private startGrowthWithDelay(treeId: number, delayFrames: number): void {
    let frames = 0;
    const check = () => {
      frames++;
      if (frames >= delayFrames) {
        this.startGrowth(treeId);
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  }

  startGrowth(treeId: number): void {
    const tree = this.trees.get(treeId);
    if (!tree || tree.grown) return;

    if (tree.seed) {
      tree.seed.shaking = true;
      tree.seed.shakingStartTime = this.p.frameCount;
    }

    setTimeout(() => {
      this.beginTreeGrowth(treeId);
    }, 500);
  }

  private beginTreeGrowth(treeId: number): void {
    const tree = this.trees.get(treeId);
    if (!tree || !tree.seed) return;

    tree.seed.isGrowing = true;
    tree.growthStartTime = this.p.frameCount;

    const rootCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < rootCount; i++) {
      tree.roots.push({
        x: tree.seed.x,
        y: tree.seed.y,
        angle: Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.5,
        length: 30 + Math.random() * 40,
        currentLength: 0,
        growthStartTime: this.p.frameCount,
        growthDuration: 60
      });
    }

    setTimeout(() => {
      this.growTrunk(treeId);
    }, 1000);
  }

  private growTrunk(treeId: number): void {
    const tree = this.trees.get(treeId);
    if (!tree || !tree.seed) return;

    const trunkLength = 80 + Math.random() * 40;
    const trunk: Branch = {
      startX: tree.seed.x,
      startY: tree.seed.y,
      endX: tree.seed.x,
      endY: tree.seed.y - trunkLength,
      length: trunkLength,
      baseAngle: -Math.PI / 2,
      angle: -Math.PI / 2,
      thickness: 4,
      depth: 0,
      children: [],
      parent: null,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.015,
      isReturning: false,
      returnStartTime: 0,
      leaves: []
    };

    tree.branches.push(trunk);

    setTimeout(() => {
      this.growBranches(treeId, trunk);
    }, 2000);
  }

  private growBranches(treeId: number, parent: Branch): void {
    const tree = this.trees.get(treeId);
    if (!tree) return;

    const branchCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < branchCount; i++) {
      const side = i < branchCount / 2 ? -1 : 1;
      const angleDeg = 60 + Math.random() * 60;
      const angleRad = (angleDeg - 90) * (Math.PI / 180) * side;
      const baseAngle = parent.baseAngle + angleRad;
      const length = parent.length * (0.5 + Math.random() * 0.3);
      const thickness = Math.max(1, parent.thickness * 0.6);

      const branch: Branch = {
        startX: parent.endX,
        startY: parent.endY,
        endX: parent.endX + Math.cos(baseAngle) * length,
        endY: parent.endY + Math.sin(baseAngle) * length,
        length,
        baseAngle,
        angle: baseAngle,
        thickness,
        depth: parent.depth + 1,
        children: [],
        parent,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.015,
        isReturning: false,
        returnStartTime: 0,
        leaves: []
      };

      parent.children.push(branch);
      tree.branches.push(branch);

      setTimeout(() => {
        this.addLeaves(treeId, branch);
      }, 800);

      if (parent.depth < 1 && Math.random() > 0.5) {
        setTimeout(() => {
          this.growBranches(treeId, branch);
        }, 1200);
      }
    }
  }

  private addLeaves(treeId: number, branch: Branch): void {
    const tree = this.trees.get(treeId);
    if (!tree) return;

    const leafCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < leafCount; i++) {
      const color = MEMORY_COLORS[Math.floor(Math.random() * MEMORY_COLORS.length)];
      const offsetX = (Math.random() - 0.5) * 15;
      const offsetY = (Math.random() - 0.5) * 15;
      const leaf = new Leaf(
        this.p,
        branch.endX + offsetX,
        branch.endY + offsetY,
        color,
        this.p.random(),
        treeId
      );
      tree.leaves.push(leaf);
      branch.leaves.push(leaf);
    }
  }

  tryClickSeed(mx: number, my: number): boolean {
    for (const [treeId, tree] of this.trees) {
      if (tree.seed && !tree.grown) {
        const dx = mx - tree.seed.x;
        const dy = my - tree.seed.y;
        if (Math.sqrt(dx * dx + dy * dy) < tree.seed.size + 10) {
          this.startGrowth(treeId);
          return true;
        }
      }
    }
    return false;
  }

  tryStartDrag(mx: number, my: number): boolean {
    for (const [, tree] of this.trees) {
      for (const leaf of tree.leaves) {
        if (leaf.contains(mx, my)) {
          leaf.startDrag();
          this.draggedLeaf = leaf;
          return true;
        }
      }
    }
    return false;
  }

  updateDrag(mx: number, my: number): void {
    if (!this.draggedLeaf) return;

    this.draggedLeaf.updateDragPosition(mx, my);
    this.bendBranchesForLeaf(this.draggedLeaf, mx, my);
    this.spawnDragParticles();
  }

  private bendBranchesForLeaf(leaf: Leaf, targetX: number, targetY: number): void {
    const tree = this.trees.get(leaf.treeId);
    if (!tree) return;

    let targetBranch: Branch | null = null;
    for (const b of tree.branches) {
      if (b.leaves.includes(leaf)) {
        targetBranch = b;
        break;
      }
    }
    if (!targetBranch) return;

    const dx = targetX - leaf.baseX;
    const dy = targetY - leaf.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 150;
    const bendFactor = Math.min(dist / maxDist, 1);
    const maxBendAngle = Math.PI / 4;

    let current: Branch | null = targetBranch;
    let depthFactor = 1;
    while (current && current.depth > 0) {
      const targetBendAngle = Math.atan2(dy, dx);
      const angleDiff = targetBendAngle - current.baseAngle;
      const clampedDiff = Math.max(-maxBendAngle, Math.min(maxBendAngle, angleDiff)) * bendFactor * depthFactor;
      current.angle = current.baseAngle + clampedDiff;
      current.isReturning = false;
      this.updateBranchPositions(current);
      current = current.parent;
      depthFactor *= 0.5;
    }
  }

  private updateBranchPositions(branch: Branch): void {
    branch.endX = branch.startX + Math.cos(branch.angle) * branch.length;
    branch.endY = branch.startY + Math.sin(branch.angle) * branch.length;

    for (const child of branch.children) {
      child.startX = branch.endX;
      child.startY = branch.endY;
      if (!child.isReturning) {
        child.angle = child.baseAngle + (branch.angle - branch.baseAngle) * 0.3;
      }
      this.updateBranchPositions(child);
    }

    for (const leaf of branch.leaves) {
      if (!leaf.isDragging && !leaf.isReturning) {
        const offsetX = leaf.baseX - (branch.parent ? branch.parent.endX : branch.startX);
        const offsetY = leaf.baseY - (branch.parent ? branch.parent.endY : branch.startY);
        leaf.setBasePosition(branch.endX + (leaf.baseX - branch.endX), branch.endY + (leaf.baseY - branch.endY));
      }
    }
  }

  private spawnDragParticles(): void {
    if (!this.draggedLeaf) return;

    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const size = 3 + Math.random() * 5;
      const vx = (Math.random() - 0.5) * 3;
      const vy = 2 + Math.random() * 2;
      const alpha = 0.6 + Math.random() * 0.4;
      this.particles.push(
        new Particle(
          this.p,
          this.draggedLeaf.x + (Math.random() - 0.5) * 20,
          this.draggedLeaf.y + (Math.random() - 0.5) * 20,
          vx,
          vy,
          size,
          this.draggedLeaf.color,
          alpha,
          60,
          0.05
        )
      );
    }
  }

  endDrag(): void {
    if (!this.draggedLeaf) return;

    const leaf = this.draggedLeaf;
    leaf.endDrag();

    const tree = this.trees.get(leaf.treeId);
    if (tree) {
      for (const branch of tree.branches) {
        if (branch.depth > 0) {
          branch.isReturning = true;
          branch.returnStartTime = this.p.frameCount;
        }
      }
    }

    this.spawnBurstParticles(leaf);
    this.draggedLeaf = null;
  }

  private spawnBurstParticles(leaf: Leaf): void {
    const count = 10 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      const size = 5 + Math.random() * 7;
      this.particles.push(
        new Particle(
          this.p,
          leaf.x,
          leaf.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          size,
          leaf.color,
          1.0,
          90,
          0.02
        )
      );
    }
  }

  updateConnections(): void {
    this.connections = [];
    const allLeaves: Leaf[] = [];
    for (const [, tree] of this.trees) {
      allLeaves.push(...tree.leaves);
    }

    for (let i = 0; i < allLeaves.length; i++) {
      for (let j = i + 1; j < allLeaves.length; j++) {
        const l1 = allLeaves[i];
        const l2 = allLeaves[j];
        if (l1.treeId === l2.treeId) continue;
        const dist = Math.sqrt((l1.x - l2.x) ** 2 + (l1.y - l2.y) ** 2);
        if (dist < 80) {
          this.connections.push({
            leaf1: l1,
            leaf2: l2,
            pulsePhase: Math.random() * Math.PI * 2
          });
        }
      }
    }
  }

  update(): void {
    for (const [, tree] of this.trees) {
      if (tree.seed) {
        if (tree.seed.shaking) {
          const elapsed = this.p.frameCount - tree.seed.shakingStartTime;
          if (elapsed < 30) {
            tree.seed.size = 10 + Math.sin(elapsed * 0.5) * 2 + (elapsed / 30) * 5;
          } else {
            tree.seed.size = 15;
            tree.seed.shaking = false;
          }
        }

        if (tree.seed.isGrowing && !tree.grown) {
          const elapsed = this.p.frameCount - tree.growthStartTime;
          if (elapsed > 180) {
            tree.grown = true;
          }
        }
      }

      for (const root of tree.roots) {
        const elapsed = this.p.frameCount - root.growthStartTime;
        const t = Math.min(elapsed / root.growthDuration, 1);
        const easeT = 1 - Math.pow(1 - t, 3);
        root.currentLength = root.length * easeT;
      }

      for (const branch of tree.branches) {
        if (branch.isReturning) {
          const elapsed = this.p.frameCount - branch.returnStartTime;
          const t = Math.min(elapsed / 30, 1);
          const bounceT = this.bounceEaseOut(t);
          branch.angle = this.p.lerp(branch.angle, branch.baseAngle, bounceT);
          if (t >= 1) {
            branch.angle = branch.baseAngle;
            branch.isReturning = false;
          }
          this.updateBranchPositions(branch);
        }
        branch.pulsePhase += branch.pulseSpeed;
      }

      for (const leaf of tree.leaves) {
        leaf.update();
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].isDead) {
        this.particles.splice(i, 1);
      }
    }

    this.updateConnections();
  }

  private bounceEaseOut(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  draw(): void {
    for (const [, tree] of this.trees) {
      for (const root of tree.roots) {
        if (root.currentLength > 0) {
          this.p.push();
          this.p.stroke(255, 255, 255, 100);
          this.p.strokeWeight(1);
          this.p.noFill();
          this.p.line(
            root.x,
            root.y,
            root.x + Math.cos(root.angle) * root.currentLength,
            root.y + Math.sin(root.angle) * root.currentLength
          );
          this.p.pop();
        }
      }

      for (const branch of tree.branches) {
        if (branch.depth === 0) {
          this.drawBranch(branch);
        }
      }

      if (tree.seed && !tree.grown) {
        this.drawSeed(tree.seed);
      }

      for (const leaf of tree.leaves) {
        leaf.draw();
      }
    }

    for (const conn of this.connections) {
      this.drawConnection(conn);
    }

    for (const particle of this.particles) {
      particle.draw();
    }
  }

  private drawSeed(seed: Seed): void {
    this.p.push();
    this.p.drawingContext.shadowBlur = 16;
    this.p.drawingContext.shadowColor = '#4477dd';
    this.p.noStroke();
    this.p.fill(136, 170, 255, 200);
    this.p.ellipse(seed.x, seed.y, seed.size, seed.size);
    this.p.pop();
  }

  private drawBranch(branch: Branch): void {
    const pulse = 0.8 + 0.2 * Math.sin(branch.pulsePhase);
    const rootColor = this.p.color('#4466aa');
    const topColor = this.p.color('#88aaff');
    const t = branch.depth > 0 ? 0.7 : 0;
    const r = this.p.lerp(this.p.red(rootColor), this.p.red(topColor), t) * pulse;
    const g = this.p.lerp(this.p.green(rootColor), this.p.green(topColor), t) * pulse;
    const b = this.p.lerp(this.p.blue(rootColor), this.p.blue(topColor), t) * pulse;

    this.p.push();
    this.p.drawingContext.shadowBlur = 6;
    this.p.drawingContext.shadowColor = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, 0.5)`;
    this.p.stroke(r, g, b, 220);
    this.p.strokeWeight(branch.thickness);
    this.p.strokeCap(this.p.ROUND);
    this.p.noFill();

    if (branch.depth > 0 && branch.parent) {
      const midX = (branch.startX + branch.endX) / 2;
      const midY = (branch.startY + branch.endY) / 2;
      const perpAngle = branch.angle + Math.PI / 2;
      const bendAmount = Math.abs(branch.angle - branch.baseAngle) * 30;
      const offsetX = Math.cos(perpAngle) * bendAmount * (branch.angle > branch.baseAngle ? 1 : -1);
      const offsetY = Math.sin(perpAngle) * bendAmount * (branch.angle > branch.baseAngle ? 1 : -1);

      this.p.beginShape();
      this.p.vertex(branch.startX, branch.startY);
      this.p.quadraticVertex(midX + offsetX, midY + offsetY, branch.endX, branch.endY);
      this.p.endShape();
    } else {
      this.p.line(branch.startX, branch.startY, branch.endX, branch.endY);
    }

    this.p.pop();

    for (const child of branch.children) {
      this.drawBranch(child);
    }
  }

  private drawConnection(conn: TreeConnection): void {
    conn.pulsePhase += 0.05;
    const pulse = 0.5 + 0.5 * Math.sin(conn.pulsePhase);
    const width = 2 + pulse * 2;

    const c1 = this.p.color(conn.leaf1.color);
    const c2 = this.p.color(conn.leaf2.color);

    this.p.push();
    this.p.drawingContext.shadowBlur = 8;
    this.p.noFill();

    this.p.beginShape();
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = this.p.lerp(conn.leaf1.x, conn.leaf2.x, t);
      const y = this.p.lerp(conn.leaf1.y, conn.leaf2.y, t);
      const r = this.p.lerp(this.p.red(c1), this.p.red(c2), t);
      const g = this.p.lerp(this.p.green(c1), this.p.green(c2), t);
      const b = this.p.lerp(this.p.blue(c1), this.p.blue(c2), t);
      this.p.stroke(r, g, b, 100 * pulse);
      this.p.strokeWeight(width);
      this.p.vertex(x, y);
    }
    this.p.endShape();
    this.p.pop();
  }

  getDraggedLeaf(): Leaf | null {
    return this.draggedLeaf;
  }

  getAllParticles(): Particle[] {
    return this.particles;
  }
}
