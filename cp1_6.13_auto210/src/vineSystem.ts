import gsap from 'gsap';

export interface Point {
  x: number;
  y: number;
}

export interface VineNode {
  id: string;
  position: Point;
  prevNodeId: string | null;
  radius: number;
  baseRadius: number;
  color: string;
  createdAt: number;
  isBranchNode: boolean;
  isSeed: boolean;
  isWilting: boolean;
  wiltProgress: number;
  deleteProgress: number;
  pulseScale: number;
  parentVineId: string;
  parentBranchId: string | null;
  children: string[];
  growthProgress: number;
  visualScale: number;
  visualAlpha: number;
}

export type FlowerState = 'bud' | 'blooming' | 'open' | 'fading' | 'gone';

export interface Flower {
  id: string;
  nodeId: string;
  vineId: string;
  state: FlowerState;
  progress: number;
  stateStartTime: number;
  colorInner: string;
  colorOuter: string;
  scale: number;
  alpha: number;
  pulseScale: number;
  rotation: number;
}

export interface Branch {
  id: string;
  vineId: string;
  originNodeId: string;
  direction: number;
  tipNodeId: string;
  totalLength: number;
  pendingGrowth: number;
  nextNodeDistance: number;
  createdBranched: boolean;
  canFlower: boolean;
}

export interface Vine {
  id: string;
  seedNodeId: string;
  createdAt: number;
  isWilting: boolean;
  wiltProgress: number;
  mainBranchId: string;
  branchIds: string[];
  startedGrowth: boolean;
}

export interface Particle {
  id: string;
  position: Point;
  velocity: Point;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotSpeed: number;
}

export interface VineSystemSnapshot {
  vines: Vine[];
  nodes: Map<string, VineNode>;
  branches: Map<string, Branch>;
  flowers: Flower[];
  particles: Particle[];
  activeVineCount: number;
  activeNodeCount: number;
}

export const CONSTANTS = {
  MAX_VINES: 5,
  MAX_NODES_PER_VINE: 30,
  NODE_DISTANCE_MIN: 40,
  NODE_DISTANCE_MAX: 60,
  GROWTH_SPEED: 20,
  BRANCH_CHANCE_AT_150: 0.30,
  BUD_CHANCE: 0.15,
  BRANCH_ANGLE_OFFSET: Math.PI / 4,
  CURVATURE_RATE_LIMIT: (30 * Math.PI) / 180,
  SEED_GROWTH_DELAY: 1000,
  BUD_BLOOM_DELAY: 2000,
  FLOWER_LIFETIME: 10000,
  FLOWER_FADE_DURATION: 3000,
  DELETE_ANIM_DURATION: 800,
  WILT_DURATION: 3000,
  PARTICLE_COUNT_MIN: 6,
  PARTICLE_COUNT_MAX: 8,
  PARTICLE_SPEED_MIN: 30,
  PARTICLE_SPEED_MAX: 60,
  PARTICLE_LIFETIME: 500,
  MAX_PARTICLES: 50,
  PARTICLE_COLORS: ['#a0d8ff', '#66ff99', '#ffcc00', '#ff6699'],
  COLOR_SEED: '#a0d8ff',
  COLOR_NODE_START: '#a0d8ff',
  COLOR_NODE_END: '#66ff99',
  COLOR_BRANCH_NODE: '#88dd88',
  COLOR_BUD: '#ff99cc',
  COLOR_FLOWER_INNER: '#ffcc00',
  COLOR_FLOWER_OUTER: '#ff6699',
  COLOR_WILT: '#8b7355',
  COLOR_BORDER_GLOW: '#4488ff',
} as const;

interface UndoEntry {
  nodes: Map<string, VineNode>;
  flowers: Flower[];
  branches: Map<string, Branch>;
  vineBranchMap: Map<string, string[]>;
  deletedNodeIds: string[];
}

let idCounter = 0;
const uid = (prefix: string): string => `${prefix}_${Date.now().toString(36)}_${(++idCounter).toString(36)}`;

const randRange = (min: number, max: number): number => Math.random() * (max - min) + min;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

const normalizeAngle = (a: number): number => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

const lerpColor = (c1: string, c2: string, t: number): string => {
  const h2r = (h: string): [number, number, number] => {
    const s = h.replace('#', '');
    return [parseInt(s.substring(0, 2), 16), parseInt(s.substring(2, 4), 16), parseInt(s.substring(4, 6), 16)];
  };
  const [r1, g1, b1] = h2r(c1);
  const [r2, g2, b2] = h2r(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
};

export class VineSystem {
  private vines: Map<string, Vine> = new Map();
  private nodes: Map<string, VineNode> = new Map();
  private branches: Map<string, Branch> = new Map();
  private flowers: Map<string, Flower> = new Map();
  private particles: Particle[] = [];
  private undoStack: UndoEntry[] = [];
  private mouseTarget: Point = { x: 0, y: 0 };
  private hasMouseTarget = false;
  private canvasBounds = { width: 800, height: 600 };
  private pendingRemovalVines: string[] = [];
  private pendingRemovalNodes: string[] = [];
  private pendingRemovalFlowers: string[] = [];
  private gsapContexts: gsap.core.Tween[] = [];

  setCanvasSize(w: number, h: number): void {
    this.canvasBounds.width = w;
    this.canvasBounds.height = h;
  }

  setMouseTarget(x: number, y: number): void {
    this.mouseTarget.x = x;
    this.mouseTarget.y = y;
    this.hasMouseTarget = true;
  }

  clearMouseTarget(): void {
    this.hasMouseTarget = false;
  }

  plantSeed(x: number, y: number): Vine | null {
    if (this.vines.size >= CONSTANTS.MAX_VINES) {
      this.wiltOldestVine();
    }
    const vineId = uid('vine');
    const nodeId = uid('node');
    const branchId = uid('branch');
    const now = performance.now();
    const seedNode: VineNode = {
      id: nodeId,
      position: { x, y },
      prevNodeId: null,
      radius: 12,
      baseRadius: 12,
      color: CONSTANTS.COLOR_SEED,
      createdAt: now,
      isBranchNode: false,
      isSeed: true,
      isWilting: false,
      wiltProgress: 0,
      deleteProgress: 0,
      pulseScale: 1,
      parentVineId: vineId,
      parentBranchId: branchId,
      children: [],
      growthProgress: 0,
      visualScale: 1,
      visualAlpha: 1,
    };
    this.nodes.set(nodeId, seedNode);
    const initialDir = -Math.PI / 2 + randRange(-0.5, 0.5);
    const mainBranch: Branch = {
      id: branchId,
      vineId,
      originNodeId: nodeId,
      direction: initialDir,
      tipNodeId: nodeId,
      totalLength: 0,
      pendingGrowth: 0,
      nextNodeDistance: randRange(CONSTANTS.NODE_DISTANCE_MIN, CONSTANTS.NODE_DISTANCE_MAX),
      createdBranched: false,
      canFlower: false,
    };
    this.branches.set(branchId, mainBranch);
    const vine: Vine = {
      id: vineId,
      seedNodeId: nodeId,
      createdAt: now,
      isWilting: false,
      wiltProgress: 0,
      mainBranchId: branchId,
      branchIds: [branchId],
      startedGrowth: false,
    };
    this.vines.set(vineId, vine);
    this.startSeedPulse(seedNode);
    gsap.delayedCall(CONSTANTS.SEED_GROWTH_DELAY / 1000, () => {
      const v = this.vines.get(vineId);
      if (v) v.startedGrowth = true;
    });
    return vine;
  }

  private startSeedPulse(node: VineNode): void {
    gsap.to(node, {
      pulseScale: 1.15,
      duration: 0.75,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      overwrite: false,
    });
  }

  private startBudPulse(flower: Flower): void {
    gsap.to(flower, {
      pulseScale: 1.1,
      duration: 0.6,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      overwrite: false,
    });
  }

  findNodeAt(x: number, y: number, radius = 18): VineNode | null {
    let best: VineNode | null = null;
    let bestDist = radius * radius;
    for (const node of this.nodes.values()) {
      if (node.deleteProgress >= 1) continue;
      const dx = node.position.x - x;
      const dy = node.position.y - y;
      const d = dx * dx + dy * dy;
      const r = Math.max(radius, node.baseRadius * 2.5);
      if (d < r * r && d < bestDist) {
        bestDist = d;
        best = node;
      }
    }
    return best;
  }

  deleteNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    const vine = this.vines.get(node.parentVineId);
    if (!vine) return;
    const affectedIds = new Set<string>();
    const queue: string[] = [nodeId];
    while (queue.length) {
      const id = queue.shift()!;
      if (affectedIds.has(id)) continue;
      affectedIds.add(id);
      const n = this.nodes.get(id);
      if (!n) continue;
      for (const cid of n.children) queue.push(cid);
    }
    const savedNodes = new Map<string, VineNode>();
    for (const id of affectedIds) {
      const n = this.nodes.get(id);
      if (n) savedNodes.set(id, this.deepCloneNode(n));
    }
    const savedFlowers: Flower[] = [];
    for (const f of this.flowers.values()) {
      if (affectedIds.has(f.nodeId)) savedFlowers.push(this.deepCloneFlower(f));
    }
    const savedBranches = new Map<string, Branch>();
    const vineBranchMap = new Map<string, string[]>();
    vineBranchMap.set(vine.id, [...vine.branchIds]);
    for (const bid of vine.branchIds) {
      const b = this.branches.get(bid);
      if (b) savedBranches.set(bid, this.deepCloneBranch(b));
    }
    this.undoStack.push({
      nodes: savedNodes,
      flowers: savedFlowers,
      branches: savedBranches,
      vineBranchMap,
      deletedNodeIds: Array.from(affectedIds),
    });
    if (this.undoStack.length > 20) this.undoStack.shift();
    for (const id of affectedIds) {
      const n = this.nodes.get(id);
      if (!n) continue;
      n.deleteProgress = 0;
      n.visualScale = 1;
      gsap.killTweensOf(n);
      const flash = { i: 0 };
      const duration = CONSTANTS.DELETE_ANIM_DURATION / 1000;
      const tween = gsap.to(flash, {
        i: 6,
        duration,
        ease: 'none',
        onUpdate: () => {
          const visible = Math.floor(flash.i) % 2 === 0;
          n.visualAlpha = visible ? 1 : 0.15;
        },
        onComplete: () => {
          n.deleteProgress = 1;
          n.visualScale = 0;
          n.visualAlpha = 0;
          this.pendingRemovalNodes.push(id);
        },
      });
      gsap.to(n, {
        visualScale: 0.1,
        duration,
        ease: 'back.in(1.5)',
      });
      this.gsapContexts.push(tween);
    }
    for (const f of this.flowers.values()) {
      if (affectedIds.has(f.nodeId)) {
        gsap.killTweensOf(f);
        const duration = CONSTANTS.DELETE_ANIM_DURATION / 1000;
        gsap.to(f, {
          alpha: 0,
          scale: 0.2,
          duration,
          ease: 'back.in(1.5)',
          onComplete: () => {
            this.pendingRemovalFlowers.push(f.id);
          },
        });
      }
    }
  }

  undoDelete(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    for (const [id, n] of entry.nodes) {
      const restored = this.deepCloneNode(n);
      restored.deleteProgress = 1;
      restored.visualScale = 0.1;
      restored.visualAlpha = 0;
      this.nodes.set(id, restored);
      const parent = this.nodes.get(restored.prevNodeId || '');
      if (parent && !parent.children.includes(id)) {
        parent.children.push(id);
      }
      gsap.to(restored, {
        deleteProgress: 0,
        visualScale: 1,
        visualAlpha: 1,
        duration: 0.6,
        ease: 'back.out(1.5)',
      });
      if (restored.isSeed) {
        this.startSeedPulse(restored);
      }
    }
    for (const f of entry.flowers) {
      const restored = this.deepCloneFlower(f);
      restored.alpha = 0;
      restored.scale = 0.2;
      this.flowers.set(restored.id, restored);
      gsap.to(restored, {
        alpha: f.alpha,
        scale: f.scale,
        duration: 0.6,
        ease: 'back.out(1.5)',
      });
      if (restored.state === 'bud') {
        this.startBudPulse(restored);
      }
    }
    for (const [vineId, branchIds] of entry.vineBranchMap) {
      const v = this.vines.get(vineId);
      if (v) {
        for (const bid of branchIds) {
          if (!v.branchIds.includes(bid)) v.branchIds.push(bid);
        }
      }
    }
    for (const [bid, b] of entry.branches) {
      if (!this.branches.has(bid)) {
        this.branches.set(bid, this.deepCloneBranch(b));
      }
    }
    return true;
  }

  private deepCloneNode(n: VineNode): VineNode {
    return {
      ...n,
      position: { ...n.position },
      children: [...n.children],
    };
  }

  private deepCloneFlower(f: Flower): Flower {
    return { ...f };
  }

  private deepCloneBranch(b: Branch): Branch {
    return { ...b };
  }

  private wiltOldestVine(): void {
    let oldest: Vine | null = null;
    for (const v of this.vines.values()) {
      if (v.isWilting) continue;
      if (!oldest || v.createdAt < oldest.createdAt) oldest = v;
    }
    if (oldest) this.markVineWilting(oldest.id);
  }

  private markVineWilting(vineId: string): void {
    const v = this.vines.get(vineId);
    if (!v || v.isWilting) return;
    v.isWilting = true;
    v.wiltProgress = 0;
    for (const nodeId of this.getVineAllNodeIds(vineId)) {
      const n = this.nodes.get(nodeId);
      if (!n) continue;
      n.isWilting = true;
      n.wiltProgress = 0;
      gsap.killTweensOf(n);
      const duration = CONSTANTS.WILT_DURATION / 1000;
      gsap.to(n, {
        wiltProgress: 1,
        visualScale: 0.5,
        visualAlpha: 0,
        duration,
        ease: 'power2.inOut',
      });
    }
    for (const f of this.flowers.values()) {
      if (f.vineId !== vineId) continue;
      gsap.killTweensOf(f);
      if (f.state !== 'fading' && f.state !== 'gone') {
        f.state = 'fading';
        gsap.to(f, {
          alpha: 0,
          scale: 0.5,
          duration: CONSTANTS.FLOWER_FADE_DURATION / 1000,
          ease: 'power2.in',
          onComplete: () => {
            this.pendingRemovalFlowers.push(f.id);
          },
        });
      }
    }
    gsap.delayedCall(CONSTANTS.WILT_DURATION / 1000, () => {
      this.pendingRemovalVines.push(vineId);
    });
  }

  private getVineAllNodeIds(vineId: string): string[] {
    const result: string[] = [];
    for (const n of this.nodes.values()) {
      if (n.parentVineId === vineId) result.push(n.id);
    }
    return result;
  }

  countVineNodes(vineId: string): number {
    let c = 0;
    for (const n of this.nodes.values()) {
      if (n.parentVineId === vineId && n.deleteProgress < 1 && n.wiltProgress < 1) c++;
    }
    return c;
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.flushPendingRemovals();
    for (const vine of this.vines.values()) {
      if (vine.isWilting) continue;
      if (!vine.startedGrowth) continue;
      if (this.countVineNodes(vine.id) >= CONSTANTS.MAX_NODES_PER_VINE) {
        if (!vine.isWilting) this.markVineWilting(vine.id);
        continue;
      }
      for (const bid of vine.branchIds) {
        const branch = this.branches.get(bid);
        if (!branch) continue;
        this.growBranch(vine, branch, dt);
      }
    }
    while (this.vines.size > CONSTANTS.MAX_VINES) {
      this.wiltOldestVine();
    }
    this.updateFlowers(dtMs);
    this.updateParticles(dt);
  }

  private flushPendingRemovals(): void {
    for (const id of this.pendingRemovalNodes) {
      const n = this.nodes.get(id);
      if (n) {
        gsap.killTweensOf(n);
        const parent = this.nodes.get(n.prevNodeId || '');
        if (parent) {
          const idx = parent.children.indexOf(id);
          if (idx >= 0) parent.children.splice(idx, 1);
        }
        for (const vine of this.vines.values()) {
          if (vine.seedNodeId === id && !vine.isWilting) {
            this.markVineWilting(vine.id);
          }
        }
        this.nodes.delete(id);
      }
    }
    this.pendingRemovalNodes.length = 0;
    for (const id of this.pendingRemovalFlowers) {
      const f = this.flowers.get(id);
      if (f) {
        gsap.killTweensOf(f);
        this.flowers.delete(id);
      }
    }
    this.pendingRemovalFlowers.length = 0;
    for (const vineId of this.pendingRemovalVines) {
      const vine = this.vines.get(vineId);
      if (vine) {
        gsap.killTweensOf(vine);
        for (const bid of vine.branchIds) this.branches.delete(bid);
        for (const nid of this.getVineAllNodeIds(vineId)) {
          const n = this.nodes.get(nid);
          if (n) {
            gsap.killTweensOf(n);
            this.nodes.delete(nid);
          }
        }
        for (const f of Array.from(this.flowers.values())) {
          if (f.vineId === vineId) {
            gsap.killTweensOf(f);
            this.flowers.delete(f.id);
          }
        }
        this.vines.delete(vineId);
      }
    }
    this.pendingRemovalVines.length = 0;
  }

  private growBranch(vine: Vine, branch: Branch, dt: number): void {
    const tip = this.nodes.get(branch.tipNodeId);
    if (!tip) return;
    if (tip.deleteProgress > 0 || tip.isWilting) return;
    if (this.hasMouseTarget) {
      const dx = this.mouseTarget.x - tip.position.x;
      const dy = this.mouseTarget.y - tip.position.y;
      if (dx * dx + dy * dy > 400) {
        const target = Math.atan2(dy, dx);
        let diff = normalizeAngle(target - branch.direction);
        const maxTurn = CONSTANTS.CURVATURE_RATE_LIMIT * dt;
        diff = clamp(diff, -maxTurn, maxTurn);
        branch.direction = normalizeAngle(branch.direction + diff);
      }
    } else {
      const drift = (Math.sin(performance.now() / 700 + branch.originNodeId.charCodeAt(5)) * 0.5) * dt;
      branch.direction = normalizeAngle(branch.direction + drift);
    }
    const dist = CONSTANTS.GROWTH_SPEED * dt;
    branch.pendingGrowth += dist;
    while (branch.pendingGrowth >= branch.nextNodeDistance) {
      if (this.countVineNodes(vine.id) >= CONSTANTS.MAX_NODES_PER_VINE) break;
      branch.pendingGrowth -= branch.nextNodeDistance;
      branch.totalLength += branch.nextNodeDistance;
      const prevNode = this.nodes.get(branch.tipNodeId);
      if (!prevNode) break;
      const nx = prevNode.position.x + Math.cos(branch.direction) * branch.nextNodeDistance;
      const ny = prevNode.position.y + Math.sin(branch.direction) * branch.nextNodeDistance;
      const newId = uid('node');
      const isBranchOrigin = branch.totalLength >= 150 && !branch.createdBranched && Math.random() < CONSTANTS.BRANCH_CHANCE_AT_150;
      const t = clamp(branch.totalLength / 400, 0, 1);
      const nodeColor = isBranchOrigin
        ? CONSTANTS.COLOR_BRANCH_NODE
        : lerpColor(CONSTANTS.COLOR_NODE_START, CONSTANTS.COLOR_NODE_END, t);
      const newNode: VineNode = {
        id: newId,
        position: { x: nx, y: ny },
        prevNodeId: prevNode.id,
        radius: isBranchOrigin ? 8 : 6,
        baseRadius: isBranchOrigin ? 8 : 6,
        color: nodeColor,
        createdAt: performance.now(),
        isBranchNode: isBranchOrigin,
        isSeed: false,
        isWilting: false,
        wiltProgress: 0,
        deleteProgress: 0,
        pulseScale: 1,
        parentVineId: vine.id,
        parentBranchId: branch.id,
        children: [],
        growthProgress: 0,
        visualScale: 0,
        visualAlpha: 1,
      };
      this.nodes.set(newId, newNode);
      prevNode.children.push(newId);
      branch.tipNodeId = newId;
      branch.nextNodeDistance = randRange(CONSTANTS.NODE_DISTANCE_MIN, CONSTANTS.NODE_DISTANCE_MAX);
      gsap.to(newNode, {
        growthProgress: 1,
        visualScale: 1,
        duration: 0.35,
        ease: 'back.out(1.6)',
      });
      this.spawnParticles(nx, ny);
      if (isBranchOrigin) {
        branch.createdBranched = true;
        const sign = Math.random() < 0.5 ? -1 : 1;
        const newBranchId = uid('branch');
        const newBranch: Branch = {
          id: newBranchId,
          vineId: vine.id,
          originNodeId: newId,
          direction: normalizeAngle(branch.direction + CONSTANTS.BRANCH_ANGLE_OFFSET * sign),
          tipNodeId: newId,
          totalLength: 0,
          pendingGrowth: 0,
          nextNodeDistance: randRange(CONSTANTS.NODE_DISTANCE_MIN, CONSTANTS.NODE_DISTANCE_MAX),
          createdBranched: false,
          canFlower: true,
        };
        this.branches.set(newBranchId, newBranch);
        vine.branchIds.push(newBranchId);
        if (Math.random() < CONSTANTS.BUD_CHANCE) {
          this.createFlower(newId, vine.id);
        }
      } else if (branch.canFlower && Math.random() < CONSTANTS.BUD_CHANCE * 0.3) {
        this.createFlower(newId, vine.id);
      }
    }
  }

  private createFlower(nodeId: string, vineId: string): void {
    const f: Flower = {
      id: uid('flower'),
      nodeId,
      vineId,
      state: 'bud',
      progress: 0,
      stateStartTime: performance.now(),
      colorInner: CONSTANTS.COLOR_FLOWER_INNER,
      colorOuter: CONSTANTS.COLOR_FLOWER_OUTER,
      scale: 0,
      alpha: 0,
      pulseScale: 1,
      rotation: Math.random() * Math.PI * 2,
    };
    this.flowers.set(f.id, f);
    gsap.to(f, {
      scale: 1,
      alpha: 1,
      duration: 0.4,
      ease: 'back.out(1.6)',
      onComplete: () => {
        this.startBudPulse(f);
      },
    });
    gsap.delayedCall(CONSTANTS.BUD_BLOOM_DELAY / 1000, () => {
      if (!this.flowers.has(f.id)) return;
      gsap.killTweensOf(f);
      f.state = 'blooming';
      f.stateStartTime = performance.now();
      gsap.to(f, {
        progress: 1,
        scale: 1.0,
        duration: 0.9,
        ease: 'power2.out',
        onComplete: () => {
          if (!this.flowers.has(f.id)) return;
          f.state = 'open';
          f.stateStartTime = performance.now();
          gsap.delayedCall(CONSTANTS.FLOWER_LIFETIME / 1000, () => {
            if (!this.flowers.has(f.id)) return;
            f.state = 'fading';
            f.stateStartTime = performance.now();
            gsap.to(f, {
              alpha: 0,
              scale: 0.6,
              duration: CONSTANTS.FLOWER_FADE_DURATION / 1000,
              ease: 'power2.in',
              onComplete: () => {
                f.state = 'gone';
                this.pendingRemovalFlowers.push(f.id);
              },
            });
          });
        },
      });
    });
  }

  private updateFlowers(_dtMs: number): void {
    for (const f of this.flowers.values()) {
      if (f.state === 'blooming') {
        const t = (performance.now() - f.stateStartTime) / 900;
        f.progress = clamp(t, 0, 1);
      }
    }
  }

  private spawnParticles(x: number, y: number): void {
    const count = Math.floor(randRange(CONSTANTS.PARTICLE_COUNT_MIN, CONSTANTS.PARTICLE_COUNT_MAX + 1));
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= CONSTANTS.MAX_PARTICLES) {
        this.particles.shift();
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = randRange(CONSTANTS.PARTICLE_SPEED_MIN, CONSTANTS.PARTICLE_SPEED_MAX);
      const p: Particle = {
        id: uid('pt'),
        position: { x, y },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        color: CONSTANTS.PARTICLE_COLORS[Math.floor(Math.random() * CONSTANTS.PARTICLE_COLORS.length)],
        radius: randRange(2, 4),
        life: CONSTANTS.PARTICLE_LIFETIME / 1000,
        maxLife: CONSTANTS.PARTICLE_LIFETIME / 1000,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: randRange(-6, 6),
      };
      this.particles.push(p);
    }
  }

  private updateParticles(dt: number): void {
    const kept: Particle[] = [];
    for (const p of this.particles) {
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.velocity.x *= 0.96;
      p.velocity.y *= 0.96;
      p.rotation += p.rotSpeed * dt;
      p.life -= dt;
      if (p.life > 0) kept.push(p);
    }
    this.particles = kept;
  }

  getSnapshot(): VineSystemSnapshot {
    const activeNodes: VineNode[] = [];
    for (const n of this.nodes.values()) {
      if (n.deleteProgress < 1 && n.wiltProgress < 1) activeNodes.push(n);
    }
    return {
      vines: Array.from(this.vines.values()),
      nodes: this.nodes,
      branches: this.branches,
      flowers: Array.from(this.flowers.values()),
      particles: this.particles,
      activeVineCount: this.vines.size,
      activeNodeCount: activeNodes.length,
    };
  }

  destroy(): void {
    for (const t of this.gsapContexts) gsap.killTweensOf(t);
    for (const n of this.nodes.values()) gsap.killTweensOf(n);
    for (const f of this.flowers.values()) gsap.killTweensOf(f);
    this.gsapContexts.length = 0;
  }
}
