import {
  GameState,
  createInitialState,
  updateEffects,
  getInventorySlotAt,
  getFurnaceSlotAt,
  pointInFurnace,
  pointInExploreButton,
  pointInMap,
  getSparkleAt,
  addToFurnace,
  trySynthesize,
  enterExploreMode,
  exitExploreMode,
  getRecipesForElement,
  showToast,
  saveState,
  ELEMENT_ICON_SIZE,
  ELEMENT_GAP,
  ELEMENTS_PER_ROW,
  INVENTORY_PADDING,
} from './game.js';
import { render } from './renderer.js';
import { ELEMENTS, RECIPES } from './synthData.js';

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

let state: GameState;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let toastEl: HTMLDivElement;
let tutorialEl: HTMLDivElement;
let recipePanelEl: HTMLDivElement;

let lastFrameTime = 0;
let lastLongPressCheck = 0;
let mouseX = 0;
let mouseY = 0;

function recipeKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  toastEl = document.getElementById('toast') as HTMLDivElement;
  tutorialEl = document.getElementById('tutorial') as HTMLDivElement;
  recipePanelEl = document.getElementById('recipe-panel') as HTMLDivElement;

  state = createInitialState();

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  requestAnimationFrame(gameLoop);
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top) * sy,
  };
}

function onMouseDown(e: MouseEvent): void {
  const { x, y } = getCanvasCoords(e);
  mouseX = x;
  mouseY = y;

  if (state.mode === 'explore') {
    if (pointInExploreButton(x, y)) {
      state.explorePressed = true;
      return;
    }
    const pt = pointInMap(x, y);
    if (pt) {
      const sparkle = getSparkleAt(state, pt.tx, pt.ty);
      if (sparkle && !sparkle.discovered) {
        sparkle.discovered = true;
        const recipe = RECIPES.find(
          (r) => recipeKey(r.inputs[0], r.inputs[1]) === sparkle.recipeId
        );
        if (recipe) {
          const key = sparkle.recipeId;
          if (!state.discoveredRecipes.includes(key)) {
            state.discoveredRecipes.push(key);
          }
          if (!state.inventory.includes(recipe.output) && state.inventory.length < 50) {
            state.inventory.push(recipe.output);
          }
          if (!state.discoveredElements.includes(recipe.output)) {
            state.discoveredElements.push(recipe.output);
          }
          const el = ELEMENTS[recipe.output];
          showToast(state, sparkle.description + (el ? `【${el.name}】` : ''));
          saveState(state);
        }
      }
    }
    return;
  }

  if (pointInExploreButton(x, y)) {
    state.explorePressed = true;
    return;
  }

  const furnaceIdx = getFurnaceSlotAt(x, y);
  if (furnaceIdx >= 0 && state.furnaceSlots[furnaceIdx]) {
    const elId = state.furnaceSlots[furnaceIdx]!;
    state.dragging = {
      elementId: elId,
      x,
      y,
      fromInventory: false,
      fromFurnaceIdx: furnaceIdx,
    };
    state.furnaceSlots[furnaceIdx] = null;
    state.longPress = null;
    return;
  }

  const invIdx = getInventorySlotAt(x, y);
  if (invIdx >= 0 && invIdx < state.inventory.length) {
    const elId = state.inventory[invIdx];
    state.longPress = {
      elementId: elId,
      timer: 1.0,
      triggered: false,
    };
    state.dragging = {
      elementId: elId,
      x,
      y,
      fromInventory: true,
      fromFurnaceIdx: null,
    };
    return;
  }
}

function onMouseMove(e: MouseEvent): void {
  const { x, y } = getCanvasCoords(e);
  mouseX = x;
  mouseY = y;

  if (state.dragging) {
    state.dragging.x = x;
    state.dragging.y = y;
  }

  if (state.mode === 'alchemy' || state.mode === 'explore') {
    state.exploreHovering = pointInExploreButton(x, y);
  }

  if (state.longPress && !state.longPress.triggered) {
    const moved = Math.abs(state.dragging?.x ?? x - mouseX) > 5 ||
                  Math.abs(state.dragging?.y ?? y - mouseY) > 5;
    if (moved) {
      state.longPress = null;
    }
  }
}

function onMouseUp(_e: MouseEvent): void {
  if (state.mode === 'explore') {
    if (state.explorePressed && pointInExploreButton(mouseX, mouseY)) {
      exitExploreMode(state);
    }
    state.explorePressed = false;
    return;
  }

  if (state.explorePressed) {
    if (pointInExploreButton(mouseX, mouseY)) {
      enterExploreMode(state);
    }
    state.explorePressed = false;
    state.dragging = null;
    state.longPress = null;
    return;
  }

  if (state.longPress?.triggered) {
    state.longPress = null;
    state.dragging = null;
    return;
  }

  if (state.dragging) {
    const elId = state.dragging.elementId;
    if (pointInFurnace(mouseX, mouseY)) {
      const added = addToFurnace(state, elId);
      if (added) {
        if (state.dragging.fromFurnaceIdx === null || state.dragging.fromFurnaceIdx === undefined) {
        }
        if (state.furnaceSlots[0] && state.furnaceSlots[1]) {
          const result = trySynthesize(state);
          if (result.success && result.output) {
            const el = ELEMENTS[result.output];
            if (result.isNew) {
              showToast(state, `合成成功！获得【${el?.name || '未知'}】`);
            } else {
              showToast(state, `已拥有【${el?.name || '未知'}】`);
            }
          } else if (!result.success) {
            showToast(state, '合成失败，试试其他组合吧！');
          }
        }
      } else {
        if (state.dragging.fromFurnaceIdx !== null && state.dragging.fromFurnaceIdx !== undefined) {
          state.furnaceSlots[state.dragging.fromFurnaceIdx] = elId;
        }
      }
    } else if (state.dragging.fromFurnaceIdx !== null && state.dragging.fromFurnaceIdx !== undefined) {
      state.furnaceSlots[state.dragging.fromFurnaceIdx] = elId;
    }
    state.dragging = null;
  }

  state.longPress = null;
}

function onMouseLeave(_e: MouseEvent): void {
  if (state.dragging && state.dragging.fromFurnaceIdx !== null && state.dragging.fromFurnaceIdx !== undefined) {
    state.furnaceSlots[state.dragging.fromFurnaceIdx] = state.dragging.elementId;
  }
  state.dragging = null;
  state.longPress = null;
  state.exploreHovering = false;
  state.explorePressed = false;
}

function updateDOM(): void {
  if (state.effects.toast) {
    toastEl.textContent = state.effects.toast.text;
    toastEl.style.opacity = String(state.effects.toast.alpha);
    if (state.effects.toast.alpha > 0.01) {
      toastEl.classList.add('show');
    } else {
      toastEl.classList.remove('show');
    }
  } else {
    toastEl.classList.remove('show');
  }

  if (state.effects.tutorialAlpha > 0.01) {
    tutorialEl.style.opacity = String(state.effects.tutorialAlpha);
    tutorialEl.classList.add('show');
  } else {
    tutorialEl.classList.remove('show');
  }

  if (state.longPress?.triggered && state.effects.recipePanel?.alpha) {
    renderRecipePanel(state.longPress.elementId);
    recipePanelEl.style.opacity = String(state.effects.recipePanel.alpha);
    if (state.effects.recipePanel.alpha > 0.1) {
      recipePanelEl.classList.add('show');
    }
  } else if (state.effects.recipePanel && state.effects.recipePanel.alpha > 0.01) {
    recipePanelEl.style.opacity = String(state.effects.recipePanel.alpha);
  } else {
    recipePanelEl.classList.remove('show');
  }
}

function renderRecipePanel(elementId: string): void {
  const el = ELEMENTS[elementId];
  if (!el) return;
  const recipes = getRecipesForElement(elementId);
  const discovered = new Set(state.discoveredRecipes);

  let html = `<div style="color:#FFD700;font-weight:bold;margin-bottom:6px;font-size:13px;">【${el.name}】相关配方</div>`;
  if (recipes.length === 0) {
    html += '<div class="recipe-item unknown">暂无相关配方</div>';
  } else {
    const shown = new Set<string>();
    for (const r of recipes) {
      const key = recipeKey(r.recipe.inputs[0], r.recipe.inputs[1]);
      if (shown.has(key)) continue;
      shown.add(key);
      const isKnown = discovered.has(key);
      const out = ELEMENTS[r.recipe.output];
      const aName = ELEMENTS[r.recipe.inputs[0]]?.name || '?';
      const bName = ELEMENTS[r.recipe.inputs[1]]?.name || '?';
      if (isKnown) {
        html += `<div class="recipe-item">${aName} + ${bName} → ${out?.name || '?'}</div>`;
      } else {
        html += `<div class="recipe-item unknown">??? + ??? → ???</div>`;
      }
    }
  }
  recipePanelEl.innerHTML = html;
}

function gameLoop(timestamp: number): void {
  const elapsed = timestamp - lastFrameTime;
  if (elapsed >= FRAME_INTERVAL) {
    const dt = Math.min(elapsed / 1000, 0.1);
    lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);

    if (state.longPress && !state.longPress.triggered) {
      state.longPress.timer -= dt;
      if (state.longPress.timer <= 0) {
        state.longPress.triggered = true;
        state.effects.recipePanel = {
          elementId: state.longPress.elementId,
          alpha: 0,
        };
      }
    }

    updateEffects(state, dt);

    if (!state.effects.recipePanel && state.longPress?.triggered) {
      state.effects.recipePanel = {
        elementId: state.longPress.elementId,
        alpha: 0,
      };
    }

    render(ctx, state, timestamp / 1000);
    updateDOM();
  }
  requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', init);
