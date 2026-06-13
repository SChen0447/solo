import type { GameState, Rune, RuneEvent, RuneType, SpellType } from './types';
import {
  BOOKSHELF_X, BOOKSHELF_Y, BOOKSHELF_WIDTH, BOOKSHELF_HEIGHT,
  BOOKSHELF_COLS, BOOKSHELF_ROWS,
  SPELL_BOOK_X, SPELL_BOOK_Y, SPELL_BOOK_WIDTH, SPELL_BOOK_HEIGHT,
  MAX_SPELL_SLOTS, RUNE_SIZE, FLY_DURATION,
  GATE_CENTER_X, GATE_CENTER_Y, GATE_RADIUS,
  HINT_BUTTON_X, HINT_BUTTON_Y, HINT_BUTTON_WIDTH, HINT_BUTTON_HEIGHT,
  HINT_COOLDOWN_MS, HINT_SHOW_DURATION,
  RESET_BUTTON_X, RESET_BUTTON_Y, RESET_BUTTON_RADIUS,
  SPELL_COMBINATIONS, REQUIRED_SPELLS, HINT_TEXTS, RUNE_COLORS,
  EDGE_FLAME_DURATION, CAST_BEAM_DURATION, GATE_SHAKE_DURATION,
  GATE_ERROR_DURATION, OPEN_LIGHT_DURATION, RIPPLE_DURATION
} from './constants';
import { easeOut, lerp, pointInRect, pointInCircle } from './utils';

const RUNE_TYPES: RuneType[] = ['fire', 'water', 'wind', 'earth', 'light', 'dark'];

function createInitialRunes(): Rune[] {
  const runes: Rune[] = [];
  const cellW = BOOKSHELF_WIDTH / BOOKSHELF_COLS;
  const cellH = BOOKSHELF_HEIGHT / BOOKSHELF_ROWS;

  RUNE_TYPES.forEach((type, i) => {
    const col = i % BOOKSHELF_COLS;
    const row = Math.floor(i / BOOKSHELF_COLS);
    const cx = BOOKSHELF_X + cellW * (col + 0.5);
    const cy = BOOKSHELF_Y + cellH * (row + 0.5);
    runes.push({
      id: `rune-${type}`,
      type,
      homeX: cx,
      homeY: cy,
      x: cx,
      y: cy,
      placedIndex: null,
      isDragging: false,
      isFlying: false,
      flyStartX: cx,
      flyStartY: cy,
      flyEndX: cx,
      flyEndY: cy,
      flyStartTime: 0,
      flyDuration: FLY_DURATION,
      hoverScale: 1,
      pressScale: 1
    });
  });
  return runes;
}

function getSpellSlotPositions(): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const slotGap = 20;
  const totalWidth = MAX_SPELL_SLOTS * RUNE_SIZE + (MAX_SPELL_SLOTS - 1) * slotGap;
  const startX = SPELL_BOOK_X + (SPELL_BOOK_WIDTH - totalWidth) / 2 + RUNE_SIZE / 2;
  const slotY = SPELL_BOOK_Y + SPELL_BOOK_HEIGHT * 0.55;
  for (let i = 0; i < MAX_SPELL_SLOTS; i++) {
    positions.push({
      x: startX + i * (RUNE_SIZE + slotGap),
      y: slotY
    });
  }
  return positions;
}

function createGateNodes(): GameState['gateNodes'] {
  const angle1 = -Math.PI / 2;
  const angle2 = -Math.PI / 2 + (Math.PI * 2) / 3;
  const angle3 = -Math.PI / 2 + (Math.PI * 4) / 3;
  return [
    { x: GATE_CENTER_X + Math.cos(angle1) * GATE_RADIUS, y: GATE_CENTER_Y + Math.sin(angle1) * GATE_RADIUS, activated: false, requiredSpell: REQUIRED_SPELLS[0] },
    { x: GATE_CENTER_X + Math.cos(angle2) * GATE_RADIUS, y: GATE_CENTER_Y + Math.sin(angle2) * GATE_RADIUS, activated: false, requiredSpell: REQUIRED_SPELLS[1] },
    { x: GATE_CENTER_X + Math.cos(angle3) * GATE_RADIUS, y: GATE_CENTER_Y + Math.sin(angle3) * GATE_RADIUS, activated: false, requiredSpell: REQUIRED_SPELLS[2] }
  ];
}

export function createInitialState(): GameState {
  return {
    runes: createInitialRunes(),
    spellSlots: Array.from({ length: MAX_SPELL_SLOTS }, () => ({ rune: null })),
    gateNodes: createGateNodes(),
    isCasting: false,
    castProgress: 0,
    castSpell: null,
    edgeFlameTime: 0,
    scheduledCastTime: 0,
    gateShakeTime: 0,
    gateErrorFlash: 0,
    gateOpened: false,
    openLightProgress: 0,
    hintText: null,
    hintShowTime: 0,
    hintCooldown: 0,
    rippleTime: 0,
    particles: []
  };
}

export function getSpellFromRunes(slots: GameState['spellSlots']): SpellType {
  const placedRunes = slots.filter(s => s.rune !== null).map(s => s.rune!.type);
  if (placedRunes.length === 0) return 'unknown';
  const key = placedRunes.join('+');
  return SPELL_COMBINATIONS[key] || 'unknown';
}

export function isSpellBookArea(x: number, y: number): boolean {
  return pointInRect(x, y, SPELL_BOOK_X, SPELL_BOOK_Y, SPELL_BOOK_WIDTH, SPELL_BOOK_HEIGHT);
}

export function isHintButtonArea(x: number, y: number): boolean {
  return pointInRect(x, y, HINT_BUTTON_X, HINT_BUTTON_Y, HINT_BUTTON_WIDTH, HINT_BUTTON_HEIGHT);
}

export function isResetButtonArea(x: number, y: number): boolean {
  return pointInCircle(x, y, RESET_BUTTON_X, RESET_BUTTON_Y, RESET_BUTTON_RADIUS);
}

export function findRuneAt(state: GameState, x: number, y: number): Rune | null {
  for (let i = state.runes.length - 1; i >= 0; i--) {
    const r = state.runes[i];
    if (r.isFlying) continue;
    if (pointInCircle(x, y, r.x, r.y, RUNE_SIZE / 2 + 5)) {
      return r;
    }
  }
  return null;
}

export function findEmptySlotIndex(state: GameState): number {
  return state.spellSlots.findIndex(s => s.rune === null);
}

export function getSlotPosition(index: number): { x: number; y: number } {
  return getSpellSlotPositions()[index];
}

function startFlyTo(rune: Rune, targetX: number, targetY: number, now: number): void {
  rune.flyStartX = rune.x;
  rune.flyStartY = rune.y;
  rune.flyEndX = targetX;
  rune.flyEndY = targetY;
  rune.flyStartTime = now;
  rune.isFlying = true;
}

function resetRuneToHome(rune: Rune, now: number): void {
  rune.placedIndex = null;
  startFlyTo(rune, rune.homeX, rune.homeY, now);
}

function spawnParticles(state: GameState, x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 600 + Math.random() * 400,
      color,
      size: 2 + Math.random() * 4
    });
  }
}

export function handleRuneEvent(state: GameState, event: RuneEvent, now: number): GameState {
  const newState = { ...state, runes: state.runes.map(r => ({ ...r })), spellSlots: state.spellSlots.map(s => ({ rune: s.rune ? { ...s.rune } : null })), gateNodes: state.gateNodes.map(n => ({ ...n })), particles: [...state.particles] };

  switch (event.type) {
    case 'pickup': {
      const rune = newState.runes.find(r => r.id === event.runeId);
      if (!rune || rune.isFlying) break;
      if (rune.placedIndex !== null) {
        newState.spellSlots[rune.placedIndex].rune = null;
        rune.placedIndex = null;
      }
      rune.isDragging = true;
      rune.x = event.mouseX;
      rune.y = event.mouseY;
      break;
    }

    case 'drag': {
      const rune = newState.runes.find(r => r.isDragging);
      if (rune) {
        rune.x = event.mouseX;
        rune.y = event.mouseY;
      }
      break;
    }

    case 'drop': {
      const rune = newState.runes.find(r => r.isDragging);
      if (!rune) break;
      rune.isDragging = false;

      if (newState.isCasting) {
        resetRuneToHome(rune, now);
        break;
      }

      if (isSpellBookArea(event.mouseX, event.mouseY)) {
        const emptyIdx = findEmptySlotIndex(newState);
        if (emptyIdx !== -1) {
          rune.placedIndex = emptyIdx;
          newState.spellSlots[emptyIdx].rune = rune;
          const pos = getSlotPosition(emptyIdx);
          startFlyTo(rune, pos.x, pos.y, now);
          const placedCount = newState.spellSlots.filter(s => s.rune !== null).length;
          if (placedCount >= MAX_SPELL_SLOTS) {
            const spell = getSpellFromRunes(newState.spellSlots);
            newState.edgeFlameTime = now;
            newState.castSpell = spell;
            newState.scheduledCastTime = now + EDGE_FLAME_DURATION;
          }
        } else {
          resetRuneToHome(rune, now);
        }
      } else {
        resetRuneToHome(rune, now);
      }
      break;
    }

    case 'hover': {
      newState.runes.forEach(r => {
        if (r.isDragging || r.isFlying) {
          r.hoverScale = 1;
          return;
        }
        const isHover = pointInCircle(event.mouseX, event.mouseY, r.x, r.y, RUNE_SIZE / 2 + 5);
        r.hoverScale = isHover ? 1.05 : 1;
      });
      break;
    }

    case 'clickHint': {
      if (newState.hintCooldown > now) break;
      const hintIdx = Math.floor(Math.random() * HINT_TEXTS.length);
      newState.hintText = HINT_TEXTS[hintIdx];
      newState.hintShowTime = now;
      newState.hintCooldown = now + HINT_COOLDOWN_MS;
      break;
    }

    case 'clickReset': {
      newState.runes = createInitialRunes();
      newState.spellSlots = Array.from({ length: MAX_SPELL_SLOTS }, () => ({ rune: null }));
      newState.gateNodes = createGateNodes();
      newState.isCasting = false;
      newState.castSpell = null;
      newState.edgeFlameTime = 0;
      newState.scheduledCastTime = 0;
      newState.castProgress = 0;
      newState.gateShakeTime = 0;
      newState.gateErrorFlash = 0;
      newState.gateOpened = false;
      newState.openLightProgress = 0;
      newState.rippleTime = now;
      newState.particles = [];
      break;
    }
  }

  return newState;
}

export function updateGameState(state: GameState, now: number): GameState {
  const newState = { ...state, runes: state.runes.map(r => ({ ...r })), particles: state.particles.map(p => ({ ...p })) };

  newState.runes.forEach(rune => {
    if (rune.isFlying) {
      const t = Math.min(1, (now - rune.flyStartTime) / rune.flyDuration);
      const eased = easeOut(t);
      rune.x = lerp(rune.flyStartX, rune.flyEndX, eased);
      rune.y = lerp(rune.flyStartY, rune.flyEndY, eased);
      if (t >= 1) {
        rune.isFlying = false;
        rune.x = rune.flyEndX;
        rune.y = rune.flyEndY;
      }
    }
    if (rune.isDragging) {
      rune.pressScale = 0.95;
    } else {
      rune.pressScale = 1;
    }
  });

  if (newState.isCasting && newState.castProgress > 0) {
    const elapsed = now - newState.castProgress;
    if (elapsed >= CAST_BEAM_DURATION) {
      const spell = newState.castSpell;
      const nextNodeIdx = newState.gateNodes.findIndex(n => !n.activated);
      if (nextNodeIdx !== -1 && spell) {
        const node = newState.gateNodes[nextNodeIdx];
        const isCorrect = node.requiredSpell === spell || nextNodeIdx === 2;
        if (isCorrect) {
          node.activated = true;
          newState.gateShakeTime = now;
          spawnParticles(newState, node.x, node.y, '#fdf6b0', 30);
          if (newState.gateNodes.every(n => n.activated)) {
            newState.gateOpened = true;
            newState.openLightProgress = now;
          }
        } else {
          newState.gateErrorFlash = now;
        }
      }
      newState.runes.forEach(r => {
        if (r.placedIndex !== null) {
          r.placedIndex = null;
          startFlyTo(r, r.homeX, r.homeY, now);
        }
      });
      newState.spellSlots = Array.from({ length: MAX_SPELL_SLOTS }, () => ({ rune: null }));
      newState.isCasting = false;
      newState.castProgress = 0;
      newState.castSpell = null;
      newState.edgeFlameTime = 0;
    }
  }

  if (newState.hintShowTime > 0 && now - newState.hintShowTime > HINT_SHOW_DURATION) {
    newState.hintText = null;
    newState.hintShowTime = 0;
  }
  if (newState.hintCooldown > 0 && now > newState.hintCooldown) {
    newState.hintCooldown = 0;
  }

  newState.particles = newState.particles.filter(p => {
    p.life += 16;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02;
    return p.life < p.maxLife;
  });

  return newState;
}

export function getCastProgress(state: GameState, now: number): number {
  if (!state.isCasting || state.castProgress === 0) return 0;
  return Math.min(1, (now - state.castProgress) / CAST_BEAM_DURATION);
}

export function getEdgeFlameProgress(state: GameState, now: number): number {
  if (state.edgeFlameTime === 0) return 0;
  return Math.min(1, (now - state.edgeFlameTime) / EDGE_FLAME_DURATION);
}

export function getGateShakeProgress(state: GameState, now: number): number {
  if (state.gateShakeTime === 0) return 0;
  return Math.max(0, 1 - (now - state.gateShakeTime) / GATE_SHAKE_DURATION);
}

export function getGateErrorProgress(state: GameState, now: number): number {
  if (state.gateErrorFlash === 0) return 0;
  return Math.max(0, 1 - (now - state.gateErrorFlash) / GATE_ERROR_DURATION);
}

export function getOpenLightProgress(state: GameState, now: number): number {
  if (!state.gateOpened || state.openLightProgress === 0) return 0;
  return Math.min(1, (now - state.openLightProgress) / OPEN_LIGHT_DURATION);
}

export function getRippleProgress(state: GameState, now: number): number {
  if (state.rippleTime === 0) return 0;
  return Math.max(0, 1 - (now - state.rippleTime) / RIPPLE_DURATION);
}

export function getHintCooldownProgress(state: GameState, now: number): number {
  if (state.hintCooldown === 0) return 1;
  return Math.max(0, 1 - (state.hintCooldown - now) / HINT_COOLDOWN_MS);
}
