export interface Block {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  color: string;
  colorSecondary: string;
  isRemoved: boolean;
  isRemoving: boolean;
  removeProgress: number;
  removeDirection: number;
  compressY: number;
  compressTarget: number;
  wobblePhase: number;
  wobbleAmplitude: number;
  wobbleDamping: number;
  layer: number;
  slot: number;
  hoverFlashTime: number;
}

export interface Fragment {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface AmbientParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  vx: number;
  vy: number;
  phase: number;
}

export interface GameState {
  blocks: Block[];
  fragments: Fragment[];
  ambientParticles: AmbientParticle[];
  score: number;
  extractedCount: number;
  consecutiveExtracts: number;
  isCollapsed: boolean;
  collapseTime: number;
  towerAngle: number;
  towerAngularVelocity: number;
  globalWobble: number;
  globalWobbleFrequency: number;
  flashAlpha: number;
  gameOver: boolean;
  gameWon: boolean;
  history: HistoryState[];
}

export interface HistoryState {
  blocks: Block[];
  score: number;
  extractedCount: number;
  consecutiveExtracts: number;
}

const GRAVITY = 500;
const BLOCK_WIDTH = 80;
const BLOCK_HEIGHT = 20;
const TOWER_LAYERS = 15;
const BLOCKS_PER_LAYER = 3;
const TOWER_BASE_Y = 400;
const MAX_FRAGMENTS = 200;
const COLOR_PALETTE = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#264653', '#8ecae6'];
const WOOD_COLORS_PRIMARY = ['#d4a373', '#c9956a', '#be8761', '#d4a373', '#caa075'];
const WOOD_COLORS_SECONDARY = ['#b5835a', '#a67350', '#976848', '#b5835a', '#ab7a55'];

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function createBlock(
  x: number,
  y: number,
  layer: number,
  slot: number,
  isNewLayer: boolean = false
): Block {
  const primaryIdx = Math.floor(Math.random() * WOOD_COLORS_PRIMARY.length);
  const secondaryIdx = Math.floor(Math.random() * WOOD_COLORS_SECONDARY.length);
  let color: string;
  let colorSecondary: string;

  if (isNewLayer) {
    color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    colorSecondary = color;
  } else {
    color = WOOD_COLORS_PRIMARY[primaryIdx];
    colorSecondary = WOOD_COLORS_SECONDARY[secondaryIdx];
  }

  return {
    id: generateId(),
    x,
    y,
    width: BLOCK_WIDTH,
    height: BLOCK_HEIGHT,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    color,
    colorSecondary,
    isRemoved: false,
    isRemoving: false,
    removeProgress: 0,
    removeDirection: 0,
    compressY: 0,
    compressTarget: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleAmplitude: 0,
    wobbleDamping: 0.95,
    layer,
    slot,
    hoverFlashTime: 0
  };
}

export function createInitialState(canvasWidth: number): GameState {
  const blocks: Block[] = [];
  const centerX = canvasWidth / 2;

  for (let layer = 0; layer < TOWER_LAYERS; layer++) {
    const y = TOWER_BASE_Y - layer * BLOCK_HEIGHT;
    const isAlternate = layer % 2 === 1;

    for (let slot = 0; slot < BLOCKS_PER_LAYER; slot++) {
      let x: number;
      if (isAlternate) {
        x = centerX + (slot - 1) * BLOCK_HEIGHT;
      } else {
        x = centerX + (slot - 1) * BLOCK_WIDTH;
      }
      const block = createBlock(x, y, layer, slot);
      if (isAlternate) {
        block.width = BLOCK_HEIGHT;
        block.height = BLOCK_WIDTH;
      }
      blocks.push(block);
    }
  }

  const ambientParticles: AmbientParticle[] = [];
  for (let i = 0; i < 50; i++) {
    ambientParticles.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * 600,
      radius: 1 + Math.random() * 2,
      alpha: 0.1 + Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      phase: Math.random() * Math.PI * 2
    });
  }

  return {
    blocks,
    fragments: [],
    ambientParticles,
    score: 0,
    extractedCount: 0,
    consecutiveExtracts: 0,
    isCollapsed: false,
    collapseTime: 0,
    towerAngle: 0,
    towerAngularVelocity: 0,
    globalWobble: 0,
    globalWobbleFrequency: 0.2,
    flashAlpha: 0,
    gameOver: false,
    gameWon: false,
    history: []
  };
}

export function saveHistory(state: GameState): void {
  const snapshot: HistoryState = {
    blocks: state.blocks.map(b => ({ ...b })),
    score: state.score,
    extractedCount: state.extractedCount,
    consecutiveExtracts: state.consecutiveExtracts
  };
  state.history.push(snapshot);
  if (state.history.length > 3) {
    state.history.shift();
  }
}

export function undoLastAction(state: GameState): boolean {
  if (state.history.length === 0 || state.isCollapsed) return false;
  const last = state.history.pop()!;
  state.blocks = last.blocks;
  state.score = last.score;
  state.extractedCount = last.extractedCount;
  state.consecutiveExtracts = last.consecutiveExtracts;
  state.isCollapsed = false;
  state.collapseTime = 0;
  state.gameOver = false;
  state.towerAngle = 0;
  state.towerAngularVelocity = 0;
  state.fragments = [];
  return true;
}

export function startBlockRemoval(state: GameState, blockId: string, direction: number): boolean {
  const block = state.blocks.find(b => b.id === blockId);
  if (!block || block.isRemoved || block.isRemoving) return false;
  if (state.isCollapsed) return false;

  saveHistory(state);

  block.isRemoving = true;
  block.removeDirection = direction;
  block.removeProgress = 0;

  const blocksAbove = state.blocks.filter(b => !b.isRemoved && !b.isRemoving && b.layer > block.layer);
  blocksAbove.forEach(b => {
    b.wobbleAmplitude = 3 + Math.random() * 4;
    b.wobblePhase = Math.random() * Math.PI * 2;
    b.compressTarget = 0.05 + Math.random() * 0.1;
  });

  state.consecutiveExtracts++;
  state.extractedCount++;

  if (state.consecutiveExtracts % 3 === 0) {
    state.score += 100;
    addNewLayer(state);
  }

  return true;
}

function addNewLayer(state: GameState): void {
  const activeBlocks = state.blocks.filter(b => !b.isRemoved && !b.isRemoving);
  if (activeBlocks.length === 0) return;

  const maxLayer = Math.max(...activeBlocks.map(b => b.layer));
  const newLayer = maxLayer + 1;
  const isAlternate = newLayer % 2 === 1;
  const centerX = activeBlocks.reduce((sum, b) => sum + b.x, 0) / activeBlocks.length;
  const y = TOWER_BASE_Y - newLayer * BLOCK_HEIGHT;

  for (let slot = 0; slot < BLOCKS_PER_LAYER; slot++) {
    let x: number;
    if (isAlternate) {
      x = centerX + (slot - 1) * BLOCK_HEIGHT;
    } else {
      x = centerX + (slot - 1) * BLOCK_WIDTH;
    }
    const block = createBlock(x, y, newLayer, slot, true);
    if (isAlternate) {
      block.width = BLOCK_HEIGHT;
      block.height = BLOCK_WIDTH;
    }
    state.blocks.push(block);
  }
}

export function triggerCollapse(state: GameState): void {
  if (state.isCollapsed) return;
  state.isCollapsed = true;
  state.collapseTime = 0;
  state.gameOver = true;
  state.flashAlpha = 0.3;

  state.blocks.forEach(block => {
    if (!block.isRemoved) {
      const fragmentCount = 6 + Math.floor(Math.random() * 5);
      for (let i = 0; i < fragmentCount; i++) {
        if (state.fragments.length >= MAX_FRAGMENTS) {
          state.fragments.shift();
        }
        const fw = 5 + Math.random() * 10;
        const fh = 3 + Math.random() * 8;
        state.fragments.push({
          x: block.x + (Math.random() - 0.5) * block.width,
          y: block.y + (Math.random() - 0.5) * block.height,
          width: fw,
          height: fh,
          vx: (Math.random() - 0.5) * 240,
          vy: -100 - Math.random() * 100,
          angle: Math.random() * Math.PI * 2,
          angularVelocity: (Math.random() - 0.5) * 10,
          color: block.color,
          alpha: 0.6 + Math.random() * 0.3,
          life: 0,
          maxLife: 2
        });
      }
    }
  });

  state.blocks = state.blocks.filter(b => b.isRemoved);
}

function checkWinCondition(state: GameState): void {
  if (state.extractedCount >= 45 && !state.isCollapsed) {
    state.gameWon = true;
  }
}

function checkCollapseCondition(state: GameState): void {
  if (state.isCollapsed) return;

  const activeBlocks = state.blocks.filter(b => !b.isRemoved && !b.isRemoving);
  if (activeBlocks.length === 0) return;

  const layers = new Set(activeBlocks.map(b => b.layer));
  const maxLayer = Math.max(...layers);
  const topBlocks = activeBlocks.filter(b => b.layer === maxLayer);

  if (topBlocks.length >= 2) {
    const avgX = topBlocks.reduce((s, b) => s + b.x, 0) / topBlocks.length;
    const centerX = activeBlocks.reduce((s, b) => s + b.x, 0) / activeBlocks.length;
    if (Math.abs(avgX - centerX) > 40) {
      triggerCollapse(state);
      return;
    }
  }

  if (Math.abs(state.towerAngle) > Math.PI / 6) {
    triggerCollapse(state);
    return;
  }
}

export function getBlockAt(state: GameState, x: number, y: number): Block | null {
  for (let i = state.blocks.length - 1; i >= 0; i--) {
    const b = state.blocks[i];
    if (b.isRemoved || b.isRemoving) continue;

    const dx = x - b.x;
    const dy = y - b.y;
    const cos = Math.cos(-b.angle);
    const sin = Math.sin(-b.angle);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;

    if (Math.abs(rx) <= b.width / 2 && Math.abs(ry) <= b.height / 2) {
      return b;
    }
  }
  return null;
}

export function updatePhysics(state: GameState, dt: number, canvasWidth: number, canvasHeight: number): void {
  if (state.flashAlpha > 0) {
    state.flashAlpha = Math.max(0, state.flashAlpha - dt * 3);
  }

  state.ambientParticles.forEach(p => {
    p.phase += dt;
    p.x += p.vx * dt + Math.sin(p.phase) * 0.3;
    p.y += p.vy * dt + Math.cos(p.phase * 0.7) * 0.3;
    if (p.x < 0) p.x = canvasWidth;
    if (p.x > canvasWidth) p.x = 0;
    if (p.y < 0) p.y = canvasHeight;
    if (p.y > canvasHeight) p.y = 0;
  });

  if (state.isCollapsed) {
    state.collapseTime += dt;
    updateFragments(state, dt, canvasHeight);
    return;
  }

  let maxSpeed = 0;

  state.blocks.forEach(block => {
    if (block.isRemoved) return;

    if (block.isRemoving) {
      block.removeProgress += dt / 0.8;
      block.x += block.removeDirection * 120 * dt;
      if (block.removeProgress >= 1) {
        block.isRemoved = true;
        block.isRemoving = false;
      }
      return;
    }

    block.vy += GRAVITY * dt;
    block.x += block.vx * dt;
    block.y += block.vy * dt;
    block.angle += block.angularVelocity * dt;
    block.vx *= 0.98;
    block.vy *= 0.99;
    block.angularVelocity *= 0.95;

    block.compressY = lerp(block.compressY, block.compressTarget, dt * 15);
    block.compressTarget = lerp(block.compressTarget, 0, dt * 8);

    if (block.wobbleAmplitude > 0.1) {
      block.wobblePhase += dt * 4;
      block.wobbleAmplitude *= Math.pow(block.wobbleDamping, dt * 60);
    } else {
      block.wobbleAmplitude = 0;
    }

    if (block.hoverFlashTime > 0) {
      block.hoverFlashTime -= dt;
    }

    const speed = Math.sqrt(block.vx * block.vx + block.vy * block.vy);
    maxSpeed = Math.max(maxSpeed, speed);

    const groundY = canvasHeight - 50;
    if (block.y + block.height / 2 > groundY) {
      block.y = groundY - block.height / 2;
      if (Math.abs(block.vy) > 50) {
        block.compressTarget = 0.05 + Math.random() * 0.05;
        triggerNearbyWobble(state, block, 2);
      }
      block.vy = -block.vy * 0.3;
      block.vx *= 0.8;
    }
  });

  resolveCollisions(state);

  let totalTorque = 0;
  const activeBlocks = state.blocks.filter(b => !b.isRemoved && !b.isRemoving);
  if (activeBlocks.length > 0) {
    const centerX = activeBlocks.reduce((s, b) => s + b.x, 0) / activeBlocks.length;
    activeBlocks.forEach(b => {
      totalTorque += (b.x - centerX) * b.vy * 0.001;
    });
  }

  state.towerAngularVelocity += totalTorque * dt;
  state.towerAngularVelocity *= 0.9;
  state.towerAngle += state.towerAngularVelocity * dt;
  state.towerAngle *= 0.95;

  if (maxSpeed > 30) {
    state.globalWobbleFrequency = 0.2 + Math.min(1.8, maxSpeed / 100);
  } else {
    state.globalWobbleFrequency = lerp(state.globalWobbleFrequency, 0.2, dt * 2);
  }
  state.globalWobble += dt * state.globalWobbleFrequency * Math.PI * 2;

  checkCollapseCondition(state);
  checkWinCondition(state);
}

function triggerNearbyWobble(state: GameState, source: Block, layerRange: number): void {
  state.blocks.forEach(b => {
    if (b.isRemoved || b.isRemoving) return;
    if (Math.abs(b.layer - source.layer) <= layerRange && b.id !== source.id) {
      b.wobbleAmplitude = Math.max(b.wobbleAmplitude, 2 + Math.random() * 3);
      b.wobblePhase = Math.random() * Math.PI * 2;
    }
  });
}

function resolveCollisions(state: GameState): void {
  const active = state.blocks.filter(b => !b.isRemoved && !b.isRemoving);

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];

      const overlapX = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
      const overlapY = (a.height + b.height) / 2 - Math.abs(a.y - b.y);

      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
          const sign = a.x < b.x ? -1 : 1;
          a.x += overlapX * 0.5 * sign;
          b.x -= overlapX * 0.5 * sign;
          const relV = a.vx - b.vx;
          if (relV * sign > 0) {
            a.vx -= relV * 0.5;
            b.vx += relV * 0.5;
          }
        } else {
          const sign = a.y < b.y ? -1 : 1;
          a.y += overlapY * 0.5 * sign;
          b.y -= overlapY * 0.5 * sign;
          const relV = a.vy - b.vy;
          if (relV * sign > 0) {
            const impact = Math.abs(relV);
            if (impact > 30) {
              a.compressTarget = Math.max(a.compressTarget, 0.05 + Math.random() * 0.1);
              b.compressTarget = Math.max(b.compressTarget, 0.05 + Math.random() * 0.1);
              triggerNearbyWobble(state, a, 2);
              triggerNearbyWobble(state, b, 2);
              a.hoverFlashTime = 0.15;
              b.hoverFlashTime = 0.15;
            }
            a.vy -= relV * 0.4;
            b.vy += relV * 0.4;
          }
        }
      }
    }
  }
}

function updateFragments(state: GameState, dt: number, canvasHeight: number): void {
  for (let i = state.fragments.length - 1; i >= 0; i--) {
    const f = state.fragments[i];
    f.life += dt;
    f.vy += GRAVITY * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.angle += f.angularVelocity * dt;
    f.vx *= 0.99;

    if (f.y + f.height / 2 > canvasHeight - 50) {
      f.y = canvasHeight - 50 - f.height / 2;
      f.vy = -f.vy * 0.4;
      f.vx *= 0.7;
    }

    if (f.life > f.maxLife * 0.7) {
      f.alpha = Math.max(0, f.alpha - dt * 2);
    }

    if (f.life >= f.maxLife || f.alpha <= 0) {
      state.fragments.splice(i, 1);
    }
  }
}

export function resetGame(canvasWidth: number): GameState {
  return createInitialState(canvasWidth);
}
