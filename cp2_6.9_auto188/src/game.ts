import { ELEMENTS, RECIPES, BASE_ELEMENTS, RecipeDef } from './synthData.js';

export interface Sparkle {
  x: number;
  y: number;
  recipeId: string;
  description: string;
  discovered: boolean;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Effects {
  furnaceGlow: number;
  furnaceShake: number;
  furnaceFail: number;
  toast: { text: string; alpha: number; timer: number } | null;
  tutorialAlpha: number;
  tutorialTimer: number;
  recipePanel: { elementId: string; alpha: number } | null;
  mapFadeProgress: number;
}

export interface GameState {
  mode: 'alchemy' | 'explore';
  inventory: string[];
  discoveredRecipes: string[];
  discoveredElements: string[];
  furnaceSlots: (string | null)[];
  mapTiles: number[][];
  sparkles: Sparkle[];
  particles: Particle[];
  dragging: { elementId: string; x: number; y: number; fromInventory: boolean; fromFurnaceIdx: number | null } | null;
  longPress: { elementId: string; timer: number; triggered: boolean } | null;
  effects: Effects;
  exploreHovering: boolean;
  explorePressed: boolean;
}

export const FURNACE_CENTER_X = 375;
export const FURNACE_CENTER_Y = 300;
export const FURNACE_RADIUS = 80;
export const INVENTORY_WIDTH = 150;
export const INVENTORY_PADDING = 12;
export const ELEMENT_ICON_SIZE = 32;
export const ELEMENT_GAP = 8;
export const ELEMENTS_PER_ROW = 3;
export const MAP_GRID_SIZE = 80;
export const MAP_TILE_SIZE = 4;
export const MAP_OFFSET_X = 180;
export const MAP_OFFSET_Y = 140;
export const EXPLORE_BTN_X = 510;
export const EXPLORE_BTN_Y = 560;
export const EXPLORE_BTN_W = 80;
export const EXPLORE_BTN_H = 28;

const STORAGE_KEY = 'alchemyData';

function recipeKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

function buildRecipeMap(): Map<string, RecipeDef> {
  const map = new Map<string, RecipeDef>();
  for (const r of RECIPES) {
    map.set(recipeKey(r.inputs[0], r.inputs[1]), r);
  }
  return map;
}

const RECIPE_MAP = buildRecipeMap();

const SPARKLE_DESCRIPTIONS = [
  '发现远古石碑，解锁配方：',
  '在神秘洞穴中找到：',
  '古老卷轴揭示了：',
  '遗迹中闪耀着：',
  '魔法水晶显示：',
];

const SPARKLE_COLORS = ['#FFDD44', '#FF8844', '#44FFAA', '#AA88FF', '#44DDFF'];

export function createInitialState(): GameState {
  const saved = loadState();
  if (saved) {
    return saved;
  }
  return {
    mode: 'alchemy',
    inventory: [...BASE_ELEMENTS],
    discoveredRecipes: [],
    discoveredElements: [...BASE_ELEMENTS],
    furnaceSlots: [null, null],
    mapTiles: [],
    sparkles: [],
    particles: [],
    dragging: null,
    longPress: null,
    effects: {
      furnaceGlow: 0,
      furnaceShake: 0,
      furnaceFail: 0,
      toast: null,
      tutorialAlpha: 1,
      tutorialTimer: 3,
      recipePanel: null,
      mapFadeProgress: 0,
    },
    exploreHovering: false,
    explorePressed: false,
  };
}

function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.inventory || !data.discoveredRecipes || !data.discoveredElements) return null;
    const base: GameState = createInitialState();
    base.inventory = data.inventory;
    base.discoveredRecipes = data.discoveredRecipes;
    base.discoveredElements = data.discoveredElements;
    base.effects.tutorialAlpha = 0;
    base.effects.tutorialTimer = 0;
    return base;
  } catch {
    return null;
  }
}

export function saveState(state: GameState): void {
  try {
    const data = {
      inventory: state.inventory,
      discoveredRecipes: state.discoveredRecipes,
      discoveredElements: state.discoveredElements,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function valueNoise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const corners = (valueNoise2D(x - 1, y - 1, seed) + valueNoise2D(x + 1, y - 1, seed) +
                   valueNoise2D(x - 1, y + 1, seed) + valueNoise2D(x + 1, y + 1, seed)) / 16;
  const sides = (valueNoise2D(x - 1, y, seed) + valueNoise2D(x + 1, y, seed) +
                 valueNoise2D(x, y - 1, seed) + valueNoise2D(x, y + 1, seed)) / 8;
  const center = valueNoise2D(x, y, seed) / 4;
  return corners + sides + center;
}

function interpolatedNoise(x: number, y: number, seed: number): number {
  const intX = Math.floor(x);
  const fracX = x - intX;
  const intY = Math.floor(y);
  const fracY = y - intY;
  const v1 = smoothNoise(intX, intY, seed);
  const v2 = smoothNoise(intX + 1, intY, seed);
  const v3 = smoothNoise(intX, intY + 1, seed);
  const v4 = smoothNoise(intX + 1, intY + 1, seed);
  const i1 = v1 * (1 - fracX) + v2 * fracX;
  const i2 = v3 * (1 - fracX) + v4 * fracX;
  return i1 * (1 - fracY) + i2 * fracY;
}

export function generateMap(): { tiles: number[][]; sparkles: Sparkle[] } {
  const seed = Math.random() * 1000;
  const tiles: number[][] = [];
  for (let y = 0; y < MAP_GRID_SIZE; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_GRID_SIZE; x++) {
      let noise = 0;
      noise += interpolatedNoise(x / 16, y / 16, seed) * 0.5;
      noise += interpolatedNoise(x / 8, y / 8, seed + 100) * 0.3;
      noise += interpolatedNoise(x / 4, y / 4, seed + 200) * 0.2;
      tiles[y][x] = noise;
    }
  }
  const undiscovered = RECIPES.filter((_, i) => true);
  const sparkleCount = 5 + Math.floor(Math.random() * 4);
  const sparkles: Sparkle[] = [];
  const usedPositions = new Set<string>();
  for (let i = 0; i < sparkleCount; i++) {
    let sx: number, sy: number;
    let attempts = 0;
    do {
      sx = 8 + Math.floor(Math.random() * (MAP_GRID_SIZE - 16));
      sy = 8 + Math.floor(Math.random() * (MAP_GRID_SIZE - 16));
      attempts++;
    } while (usedPositions.has(`${sx},${sy}`) && attempts < 30);
    usedPositions.add(`${sx},${sy}`);
    const recipeIdx = Math.floor(Math.random() * undiscovered.length);
    const recipe = undiscovered[recipeIdx];
    const desc = SPARKLE_DESCRIPTIONS[Math.floor(Math.random() * SPARKLE_DESCRIPTIONS.length)];
    sparkles.push({
      x: sx,
      y: sy,
      recipeId: recipeKey(recipe.inputs[0], recipe.inputs[1]),
      description: desc + ELEMENTS[recipe.output]?.name || '未知物质',
      discovered: false,
      color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
    });
  }
  return { tiles, sparkles };
}

export function pointInFurnace(px: number, py: number): boolean {
  const dx = px - FURNACE_CENTER_X;
  const dy = py - FURNACE_CENTER_Y;
  return dx * dx + dy * dy <= FURNACE_RADIUS * FURNACE_RADIUS;
}

export function getInventorySlotAt(px: number, py: number): number {
  if (px < INVENTORY_PADDING || px > INVENTORY_WIDTH - INVENTORY_PADDING) return -1;
  if (py < 60 || py > 560) return -1;
  const localX = px - INVENTORY_PADDING;
  const localY = py - 60;
  const cellSize = ELEMENT_ICON_SIZE + ELEMENT_GAP;
  const col = Math.floor(localX / cellSize);
  const row = Math.floor(localY / cellSize);
  if (col < 0 || col >= ELEMENTS_PER_ROW) return -1;
  const idx = row * ELEMENTS_PER_ROW + col;
  return idx;
}

export function getInventorySlotPosition(idx: number): { x: number; y: number } {
  const cellSize = ELEMENT_ICON_SIZE + ELEMENT_GAP;
  const col = idx % ELEMENTS_PER_ROW;
  const row = Math.floor(idx / ELEMENTS_PER_ROW);
  return {
    x: INVENTORY_PADDING + col * cellSize,
    y: 60 + row * cellSize,
  };
}

export function getFurnaceSlotAt(px: number, py: number): number {
  for (let i = 0; i < 2; i++) {
    const slotX = FURNACE_CENTER_X + (i === 0 ? -30 : 30);
    const slotY = FURNACE_CENTER_Y;
    if (Math.abs(px - slotX) < 20 && Math.abs(py - slotY) < 20) {
      return i;
    }
  }
  return -1;
}

export function pointInExploreButton(px: number, py: number): boolean {
  return px >= EXPLORE_BTN_X && px <= EXPLORE_BTN_X + EXPLORE_BTN_W &&
         py >= EXPLORE_BTN_Y && py <= EXPLORE_BTN_Y + EXPLORE_BTN_H;
}

export function pointInMap(px: number, py: number): { tx: number; ty: number } | null {
  const mx = px - MAP_OFFSET_X;
  const my = py - MAP_OFFSET_Y;
  const size = MAP_GRID_SIZE * MAP_TILE_SIZE;
  if (mx < 0 || mx >= size || my < 0 || my >= size) return null;
  return {
    tx: Math.floor(mx / MAP_TILE_SIZE),
    ty: Math.floor(my / MAP_TILE_SIZE),
  };
}

export function getSparkleAt(state: GameState, tx: number, ty: number): Sparkle | null {
  for (const s of state.sparkles) {
    if (Math.abs(s.x - tx) <= 2 && Math.abs(s.y - ty) <= 2) {
      return s;
    }
  }
  return null;
}

export function trySynthesize(state: GameState): { success: boolean; output?: string; isNew?: boolean } {
  const [a, b] = state.furnaceSlots;
  if (!a || !b) return { success: false };
  const recipe = RECIPE_MAP.get(recipeKey(a, b));
  if (!recipe) {
    state.effects.furnaceShake = 0.2;
    state.effects.furnaceFail = 0.2;
    state.furnaceSlots = [null, null];
    return { success: false };
  }
  const output = recipe.output;
  const key = recipeKey(a, b);
  const isNewRecipe = !state.discoveredRecipes.includes(key);
  const isNewElement = !state.inventory.includes(output);
  if (isNewRecipe) {
    state.discoveredRecipes.push(key);
  }
  if (isNewElement) {
    if (state.inventory.length < 50) {
      state.inventory.push(output);
    }
    if (!state.discoveredElements.includes(output)) {
      state.discoveredElements.push(output);
    }
  }
  state.effects.furnaceGlow = 0.3;
  spawnParticles(state, FURNACE_CENTER_X, FURNACE_CENTER_Y, 12, ELEMENTS[output]?.color || '#FFFFFF');
  state.furnaceSlots = [null, null];
  saveState(state);
  return { success: true, output, isNew: isNewElement || isNewRecipe };
}

export function spawnParticles(state: GameState, x: number, y: number, count: number, color: string): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + Math.floor(Math.random() * 5),
      color,
      life: 0.5,
      maxLife: 0.5,
    });
  }
}

export function addToFurnace(state: GameState, elementId: string): boolean {
  for (let i = 0; i < 2; i++) {
    if (!state.furnaceSlots[i]) {
      state.furnaceSlots[i] = elementId;
      return true;
    }
  }
  return false;
}

export function enterExploreMode(state: GameState): void {
  const { tiles, sparkles } = generateMap();
  state.mapTiles = tiles;
  state.sparkles = sparkles;
  state.mode = 'explore';
  state.effects.mapFadeProgress = 0;
}

export function exitExploreMode(state: GameState): void {
  state.mode = 'alchemy';
}

export function getRecipesForElement(elementId: string): Array<{ recipe: RecipeDef; discovered: boolean; outputKnown: boolean }> {
  const results: Array<{ recipe: RecipeDef; discovered: boolean; outputKnown: boolean }> = [];
  for (const r of RECIPES) {
    if (r.inputs.includes(elementId)) {
      const key = recipeKey(r.inputs[0], r.inputs[1]);
      const discovered = RECIPES.some((_, idx) => {
        const target = RECIPES[idx];
        return recipeKey(target.inputs[0], target.inputs[1]) === key;
      });
      results.push({
        recipe: r,
        discovered: true,
        outputKnown: true,
      });
    }
  }
  return results;
}

export function updateEffects(state: GameState, dt: number): void {
  const e = state.effects;
  if (e.furnaceGlow > 0) e.furnaceGlow = Math.max(0, e.furnaceGlow - dt);
  if (e.furnaceShake > 0) e.furnaceShake = Math.max(0, e.furnaceShake - dt);
  if (e.furnaceFail > 0) e.furnaceFail = Math.max(0, e.furnaceFail - dt);
  if (e.toast) {
    e.toast.timer -= dt;
    if (e.toast.timer <= 0) {
      e.toast.alpha = Math.max(0, e.toast.alpha - dt * 2);
      if (e.toast.alpha <= 0) e.toast = null;
    } else if (e.toast.alpha < 1) {
      e.toast.alpha = Math.min(1, e.toast.alpha + dt * 3);
    }
  }
  if (e.tutorialTimer > 0) {
    e.tutorialTimer -= dt;
    if (e.tutorialTimer <= 0) {
      e.tutorialAlpha = Math.max(0, e.tutorialAlpha - dt);
    }
  }
  if (e.recipePanel) {
    const target = state.longPress && state.longPress.triggered ? 1 : 0;
    if (target > e.recipePanel.alpha) {
      e.recipePanel.alpha = Math.min(1, e.recipePanel.alpha + dt * 5);
    } else {
      e.recipePanel.alpha = Math.max(0, e.recipePanel.alpha - dt * 5);
      if (e.recipePanel.alpha <= 0) e.recipePanel = null;
    }
  }
  if (state.mode === 'explore') {
    e.mapFadeProgress = Math.min(1, e.mapFadeProgress + dt * 2);
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

export function showToast(state: GameState, text: string): void {
  state.effects.toast = { text, alpha: 0, timer: 2 };
}
