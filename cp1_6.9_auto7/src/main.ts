import * as PIXI from 'pixi.js';
import {
  GameEngine,
  GRID_SIZE,
  Direction,
  TOTAL_COINS
} from './GameEngine';
import { UIManager } from './UIManager';

const CELL_SIZE = 48;
const CANVAS_W = GRID_SIZE * CELL_SIZE;
const CANVAS_H = GRID_SIZE * CELL_SIZE;
const COLOR_BG = 0x1a1a2e;
const COLOR_FLOOR = 0x2d2d44;
const COLOR_WALL = 0x0f0f23;
const COLOR_ENTRANCE = 0x4a9fff;
const COLOR_EXIT_LOCKED = 0x555555;
const COLOR_EXIT_OPEN = 0xffd700;
const COLOR_PLAYER = 0x66ff99;
const COLOR_COIN = 0xffd700;
const COLOR_KEY = 0xc0c0c0;
const COLOR_DOOR_CLOSED = 0xff4d4d;
const COLOR_DOOR_OPEN = 0x4dff88;
const COLOR_SPIKE = 0xff3333;
const COLOR_FLAME = 0xff8800;

const engine = new GameEngine();
let _uiManager: UIManager;
let app: PIXI.Application;
let sceneContainer: PIXI.Container;
let tileSprites: PIXI.Graphics[][] = [];
let coinSprites: Map<number, PIXI.Graphics> = new Map();
let keySprites: Map<number, PIXI.Graphics> = new Map();
let doorSprites: Map<number, PIXI.Graphics> = new Map();
let spikeSprites: Map<number, PIXI.Graphics> = new Map();
let flameSprites: Map<number, PIXI.Graphics> = new Map();
let playerSprite: PIXI.Graphics;
let exitSprite: PIXI.Graphics;
let chainSprite: PIXI.Graphics;
let particleContainer: PIXI.ParticleContainer;
let particles: PIXI.Sprite[] = [];

const pressedKeys = new Set<string>();
let lastMoveTime = 0;
const MOVE_COOLDOWN = 50;

async function main(): Promise<void> {
  const wrapper = document.getElementById('canvas-wrapper')!;

  app = new PIXI.Application({
    width: CANVAS_W,
    height: CANVAS_H,
    backgroundColor: COLOR_BG,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  });
  app.view.style.width = CANVAS_W + 'px';
  app.view.style.height = CANVAS_H + 'px';
  wrapper.insertBefore(app.view, wrapper.firstChild);

  sceneContainer = new PIXI.Container();
  app.stage.addChild(sceneContainer);

  particleContainer = new PIXI.ParticleContainer(50, {
    position: true,
    alpha: true,
    scale: true
  });
  app.stage.addChild(particleContainer);

  createTileSprites();
  createPlayerSprite();
  createExitSprite();

  _uiManager = new UIManager(
    engine,
    () => {
      resetAllVisuals();
      engine.startNewGame();
      rebuildSprites();
    },
    (dir: Direction) => tryMove(dir)
  );

  bindInput();
  handleResize();
  window.addEventListener('resize', handleResize);

  engine.startNewGame();
  rebuildSprites();

  app.ticker.add((_delta) => {
    const now = performance.now();
    engine.update(now);
    render(now);
  });
}

function createTileSprites(): void {
  tileSprites = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    tileSprites[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const g = new PIXI.Graphics();
      g.x = x * CELL_SIZE;
      g.y = y * CELL_SIZE;
      sceneContainer.addChild(g);
      tileSprites[y][x] = g;
    }
  }
}

function createPlayerSprite(): void {
  playerSprite = new PIXI.Graphics();
  sceneContainer.addChild(playerSprite);
}

function createExitSprite(): void {
  exitSprite = new PIXI.Graphics();
  sceneContainer.addChild(exitSprite);
  chainSprite = new PIXI.Graphics();
  sceneContainer.addChild(chainSprite);
}

function resetAllVisuals(): void {
  coinSprites.forEach(s => s.destroy());
  coinSprites.clear();
  keySprites.forEach(s => s.destroy());
  keySprites.clear();
  doorSprites.forEach(s => s.destroy());
  doorSprites.clear();
  spikeSprites.forEach(s => s.destroy());
  spikeSprites.clear();
  flameSprites.forEach(s => s.destroy());
  flameSprites.clear();
  particles.forEach(p => p.destroy());
  particles = [];
}

function rebuildSprites(): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const g = tileSprites[y][x];
      g.clear();
      const type = engine.state.grid[y][x];
      let color = COLOR_FLOOR;
      if (type === 'wall') color = COLOR_WALL;
      else if (type === 'entrance') color = COLOR_ENTRANCE;
      else if (type === 'exit') continue;
      g.beginFill(color);
      g.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
      g.endFill();
      if (color === COLOR_FLOOR) {
        g.lineStyle(1, 0x1a1a2e, 0.4);
        g.drawRect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2);
      }
    }
  }

  const exitPos = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
  exitSprite.x = exitPos.x * CELL_SIZE;
  exitSprite.y = exitPos.y * CELL_SIZE;
  chainSprite.x = exitPos.x * CELL_SIZE;
  chainSprite.y = exitPos.y * CELL_SIZE;

  engine.state.coins.forEach(coin => {
    const g = new PIXI.Graphics();
    g.x = coin.pos.x * CELL_SIZE;
    g.y = coin.pos.y * CELL_SIZE;
    sceneContainer.addChild(g);
    coinSprites.set(coin.id, g);
  });

  engine.state.keyItems.forEach(key => {
    const g = new PIXI.Graphics();
    g.x = key.pos.x * CELL_SIZE;
    g.y = key.pos.y * CELL_SIZE;
    sceneContainer.addChild(g);
    keySprites.set(key.id, g);
  });

  engine.state.doors.forEach(door => {
    const g = new PIXI.Graphics();
    g.x = door.pos.x * CELL_SIZE;
    g.y = door.pos.y * CELL_SIZE;
    sceneContainer.addChild(g);
    doorSprites.set(door.id, g);
  });

  engine.state.spikes.forEach(spike => {
    const g = new PIXI.Graphics();
    sceneContainer.addChild(g);
    spikeSprites.set(spike.id, g);
  });

  engine.state.flamethrowers.forEach(flame => {
    const g = new PIXI.Graphics();
    sceneContainer.addChild(g);
    flameSprites.set(flame.id, g);
  });
}

function handleResize(): void {
  const wrapper = document.getElementById('canvas-wrapper')!;
  const container = document.getElementById('game-container')!;
  const maxW = container.clientWidth - 32;
  const maxH = container.clientHeight - 32;
  const ratio = CANVAS_W / CANVAS_H;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  w = Math.min(w, CANVAS_W);
  h = Math.min(h, CANVAS_H);
  const scale = w / CANVAS_W;
  app.view.style.width = w + 'px';
  app.view.style.height = h + 'px';
  const uiRoot = document.getElementById('ui-root')!;
  uiRoot.style.width = w + 'px';
  uiRoot.style.height = h + 'px';
  wrapper.style.width = w + 'px';
  wrapper.style.height = h + 'px';
  (wrapper as any).dataset.scale = String(scale);
}

function bindInput(): void {
  window.addEventListener('keydown', (e) => {
    pressedKeys.add(e.key.toLowerCase());
    handleKeyMove(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => {
    pressedKeys.delete(e.key.toLowerCase());
  });
}

function handleKeyMove(key: string): void {
  let dir: Direction | null = null;
  if (key === 'w' || key === 'arrowup') dir = 'up';
  else if (key === 's' || key === 'arrowdown') dir = 'down';
  else if (key === 'a' || key === 'arrowleft') dir = 'left';
  else if (key === 'd' || key === 'arrowright') dir = 'right';
  if (dir) tryMove(dir);
}

function tryMove(dir: Direction): void {
  const now = performance.now();
  if (now - lastMoveTime < MOVE_COOLDOWN) return;
  lastMoveTime = now;
  engine.tryMove(dir);
}

function render(now: number): void {
  drawExit(now);
  drawPlayer(now);
  drawCoins(now);
  drawKeys(now);
  drawDoors(now);
  drawSpikes(now);
  drawFlamethrowers(now);
  updateParticles(now);
}

function drawExit(now: number): void {
  exitSprite.clear();
  chainSprite.clear();

  const pad = 4;
  if (engine.state.exitUnlocked) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
    exitSprite.beginFill(COLOR_EXIT_OPEN, 0.4 + pulse * 0.6);
    exitSprite.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
    exitSprite.endFill();
    exitSprite.lineStyle(3, COLOR_EXIT_OPEN, 1);
    exitSprite.drawRect(pad, pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2);
    const cx = CELL_SIZE / 2;
    const cy = CELL_SIZE / 2;
    const r = 10 + pulse * 6;
    exitSprite.lineStyle(2, 0xffffff, 0.8);
    exitSprite.drawCircle(cx, cy, r);
    exitSprite.beginFill(COLOR_EXIT_OPEN, 0.8);
    exitSprite.drawCircle(cx, cy, r * 0.5);
    exitSprite.endFill();
  } else {
    exitSprite.beginFill(COLOR_EXIT_LOCKED, 1);
    exitSprite.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
    exitSprite.endFill();
    exitSprite.lineStyle(2, 0x333333, 1);
    exitSprite.drawRect(pad, pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2);

    const sway = Math.sin(now * 0.002) * 3;
    const cx = CELL_SIZE / 2 + sway;
    const cy = CELL_SIZE / 2;
    chainSprite.lineStyle(2, 0x888888, 1);
    chainSprite.moveTo(cx - 10, cy - 14);
    chainSprite.lineTo(cx, cy - 4);
    chainSprite.lineTo(cx + 10, cy - 14);
    chainSprite.moveTo(cx, cy - 4);
    chainSprite.lineTo(cx, cy + 6);
    chainSprite.beginFill(0x666666);
    chainSprite.drawRoundedRect(cx - 8, cy + 4, 16, 12, 2);
    chainSprite.endFill();
    chainSprite.beginFill(0x222222);
    chainSprite.drawRect(cx - 3, cy + 8, 6, 4);
    chainSprite.endFill();
  }
}

function drawPlayer(now: number): void {
  playerSprite.clear();
  const bounce = engine.getBounceOffset(now);
  const px = engine.state.playerRenderPos.x * CELL_SIZE;
  const py = engine.state.playerRenderPos.y * CELL_SIZE - bounce;
  const size = 32;
  const pad = (CELL_SIZE - size) / 2;

  playerSprite.beginFill(COLOR_PLAYER);
  playerSprite.drawRoundedRect(px + pad, py + pad, size, size - 6, 6);
  playerSprite.endFill();

  playerSprite.beginFill(0xffddbb);
  playerSprite.drawCircle(px + CELL_SIZE / 2, py + pad + 4, 10);
  playerSprite.endFill();

  playerSprite.beginFill(0x000000);
  playerSprite.drawCircle(px + CELL_SIZE / 2 - 3, py + pad + 3, 2);
  playerSprite.drawCircle(px + CELL_SIZE / 2 + 3, py + pad + 3, 2);
  playerSprite.endFill();

  playerSprite.lineStyle(0);
  playerSprite.beginFill(COLOR_PLAYER, 0.3);
  playerSprite.drawCircle(px + CELL_SIZE / 2, py + CELL_SIZE - 6, size / 2);
  playerSprite.endFill();
}

function drawCoins(now: number): void {
  engine.state.coins.forEach(coin => {
    const sprite = coinSprites.get(coin.id);
    if (!sprite || coin.collected) {
      if (sprite) sprite.clear();
      return;
    }
    sprite.clear();
    const cx = CELL_SIZE / 2;
    const cy = CELL_SIZE / 2 + Math.sin(now * 0.004 + coin.id) * 3;
    const glow = 0.5 + 0.5 * Math.sin(now * 0.006 + coin.id * 0.5);
    const scale = 1 + Math.sin(now * 0.004 + coin.id) * 0.1;
    const r = 10 * scale;

    sprite.beginFill(COLOR_COIN, 0.2 + glow * 0.3);
    sprite.drawCircle(cx, cy, r + 6);
    sprite.endFill();

    sprite.beginFill(COLOR_COIN, 1);
    sprite.drawCircle(cx, cy, r);
    sprite.endFill();

    sprite.beginFill(0xffffaa, 0.9);
    sprite.drawCircle(cx - 3, cy - 3, r * 0.35);
    sprite.endFill();

    sprite.lineStyle(1.5, 0xcc9900, 1);
    sprite.drawCircle(cx, cy, r);
  });
}

function drawKeys(now: number): void {
  engine.state.keyItems.forEach(key => {
    const sprite = keySprites.get(key.id);
    if (!sprite || key.collected) {
      if (sprite) sprite.clear();
      return;
    }
    sprite.clear();
    const float = Math.sin(now * 0.003 + key.id) * 4;
    const alpha = 0.5 + 0.3 * Math.sin(now * 0.004 + key.id);
    const cx = CELL_SIZE / 2;
    const cy = CELL_SIZE / 2 + float;

    sprite.alpha = alpha;

    sprite.beginFill(COLOR_KEY, 0.15);
    sprite.drawCircle(cx, cy, 18);
    sprite.endFill();

    sprite.beginFill(COLOR_KEY, 1);
    sprite.drawCircle(cx - 6, cy, 7);
    sprite.endFill();

    sprite.beginFill(COLOR_BG, 1);
    sprite.drawCircle(cx - 6, cy, 3);
    sprite.endFill();

    sprite.lineStyle(3, COLOR_KEY, 1);
    sprite.moveTo(cx - 1, cy);
    sprite.lineTo(cx + 14, cy);
    sprite.moveTo(cx + 8, cy);
    sprite.lineTo(cx + 8, cy + 5);
    sprite.moveTo(cx + 14, cy);
    sprite.lineTo(cx + 14, cy + 7);
  });
}

function drawDoors(now: number): void {
  engine.state.doors.forEach(door => {
    const sprite = doorSprites.get(door.id);
    if (!sprite) return;
    sprite.clear();
    const pad = 6;

    if (door.open) {
      const t = Math.min(1, (now - (engine.state.time * 0 + 0)) / 500);
      sprite.alpha = 0.4 + Math.min(0.6, (now % 1000) / 1000);
      sprite.beginFill(COLOR_DOOR_OPEN, 0.35);
      sprite.drawRect(pad, pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2);
      sprite.endFill();
      sprite.lineStyle(2, COLOR_DOOR_OPEN, 0.8);
      sprite.drawRect(pad + 2, pad + 2, CELL_SIZE - pad * 2 - 4, CELL_SIZE - pad * 2 - 4);
      sprite.alpha = 1;
    } else {
      sprite.beginFill(COLOR_DOOR_CLOSED, 1);
      sprite.drawRect(pad, pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2);
      sprite.endFill();
      sprite.lineStyle(2, 0x991111, 1);
      sprite.drawRect(pad + 2, pad + 2, CELL_SIZE - pad * 2 - 4, CELL_SIZE - pad * 2 - 4);
      sprite.lineStyle(0);
      sprite.beginFill(0xffaa00);
      sprite.drawCircle(CELL_SIZE - pad - 6, CELL_SIZE / 2, 3);
      sprite.endFill();
      for (let i = 0; i < 4; i++) {
        sprite.lineStyle(1, 0x991111, 0.6);
        sprite.moveTo(pad, pad + 10 + i * 8);
        sprite.lineTo(CELL_SIZE - pad, pad + 10 + i * 8);
      }
    }
  });
}

function drawSpikes(_now: number): void {
  engine.state.spikes.forEach(spike => {
    const sprite = spikeSprites.get(spike.id);
    if (!sprite) return;
    sprite.clear();
    const sx = spike.pos.x * CELL_SIZE;
    const sy = spike.pos.y * CELL_SIZE;
    sprite.x = 0;
    sprite.y = 0;

    const cx = sx + CELL_SIZE / 2;
    const cy = sy + CELL_SIZE / 2;

    sprite.beginFill(COLOR_SPIKE, 0.3);
    sprite.drawCircle(cx, cy, 18);
    sprite.endFill();

    sprite.beginFill(COLOR_SPIKE, 1);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * 6;
      const y1 = cy + Math.sin(angle) * 6;
      const x2 = cx + Math.cos(angle - 0.2) * 14;
      const y2 = cy + Math.sin(angle - 0.2) * 14;
      const x3 = cx + Math.cos(angle + 0.2) * 14;
      const y3 = cy + Math.sin(angle + 0.2) * 14;
      sprite.moveTo(x1, y1);
      sprite.lineTo(x2, y2);
      sprite.lineTo(x3, y3);
      sprite.lineTo(x1, y1);
    }
    sprite.endFill();

    sprite.beginFill(0xffaaaa);
    sprite.drawCircle(cx, cy, 5);
    sprite.endFill();
  });
}

function drawFlamethrowers(now: number): void {
  engine.state.flamethrowers.forEach(flame => {
    const sprite = flameSprites.get(flame.id);
    if (!sprite) return;
    sprite.clear();
    const fx = flame.pos.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = flame.pos.y * CELL_SIZE + CELL_SIZE / 2;

    sprite.beginFill(0x663300, 1);
    sprite.drawCircle(fx, fy, 12);
    sprite.endFill();

    sprite.lineStyle(3, 0x331100, 1);
    sprite.drawCircle(fx, fy, 12);

    const flamePulse = 0.7 + 0.3 * Math.sin(now * 0.01 + flame.id);
    const flameLen = 28 * flamePulse;
    const angle = flame.angle;

    sprite.beginFill(COLOR_FLAME, 0.5 * flamePulse);
    sprite.moveTo(fx, fy);
    sprite.lineTo(
      fx + Math.cos(angle - 0.35) * flameLen,
      fy + Math.sin(angle - 0.35) * flameLen
    );
    sprite.lineTo(
      fx + Math.cos(angle) * flameLen * 1.2,
      fy + Math.sin(angle) * flameLen * 1.2
    );
    sprite.lineTo(
      fx + Math.cos(angle + 0.35) * flameLen,
      fy + Math.sin(angle + 0.35) * flameLen
    );
    sprite.lineTo(fx, fy);
    sprite.endFill();

    sprite.beginFill(0xffff00, flamePulse * 0.7);
    sprite.moveTo(fx, fy);
    sprite.lineTo(
      fx + Math.cos(angle - 0.2) * flameLen * 0.6,
      fy + Math.sin(angle - 0.2) * flameLen * 0.6
    );
    sprite.lineTo(
      fx + Math.cos(angle) * flameLen * 0.8,
      fy + Math.sin(angle) * flameLen * 0.8
    );
    sprite.lineTo(
      fx + Math.cos(angle + 0.2) * flameLen * 0.6,
      fy + Math.sin(angle + 0.2) * flameLen * 0.6
    );
    sprite.lineTo(fx, fy);
    sprite.endFill();
  });
}

function updateParticles(now: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const age = now - (p as any).birth;
    if (age > 1000) {
      p.destroy();
      particles.splice(i, 1);
      continue;
    }
    const t = age / 1000;
    p.alpha = 1 - t;
    p.scale.set(1 - t * 0.5);
    p.x += (p as any).vx;
    p.y += (p as any).vy;
  }

  if (particles.length === 0 && engine.state.exitUnlocked && engine.state.gold >= TOTAL_COINS) {
    const triggered = (engine as any)._chainBreakTriggered;
    if (!triggered) {
      (engine as any)._chainBreakTriggered = true;
      spawnChainBreakParticles();
    }
  }
  if (!engine.state.exitUnlocked) {
    (engine as any)._chainBreakTriggered = false;
  }
}

function spawnChainBreakParticles(): void {
  const ex = (GRID_SIZE - 1) * CELL_SIZE + CELL_SIZE / 2;
  const ey = (GRID_SIZE - 1) * CELL_SIZE + CELL_SIZE / 2;

  const tex = PIXI.RenderTexture.create({ width: 8, height: 8 });
  const tmp = new PIXI.Graphics();
  tmp.beginFill(0x888888);
  tmp.drawRect(0, 0, 8, 8);
  tmp.endFill();
  app.renderer.render(tmp, { renderTexture: tex });

  for (let i = 0; i < 20; i++) {
    const s = new PIXI.Sprite(tex);
    s.anchor.set(0.5);
    s.x = ex + (Math.random() - 0.5) * 30;
    s.y = ey + (Math.random() - 0.5) * 30;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    (s as any).vx = Math.cos(angle) * speed;
    (s as any).vy = Math.sin(angle) * speed - 2;
    (s as any).birth = performance.now();
    s.tint = Math.random() > 0.5 ? 0xaaaaaa : 0x666666;
    particleContainer.addChild(s);
    particles.push(s);
  }
  tmp.destroy();
}

main().catch(err => console.error(err));
