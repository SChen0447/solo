import type { GameState, Rune, RuneEvent } from './types';
import {
  findRuneAt, isHintButtonArea, isResetButtonArea, isSpellBookArea
} from './game';

type Listener = (event: RuneEvent) => void;

export interface InteractionState {
  canvas: HTMLCanvasElement;
  scale: number;
  offsetX: number;
  offsetY: number;
  draggingRune: Rune | null;
  mouseX: number;
  mouseY: number;
  isPressed: boolean;
  pressTarget: 'rune' | 'hint' | 'reset' | null;
}

export function createInteraction(canvas: HTMLCanvasElement): InteractionState {
  return {
    canvas,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    draggingRune: null,
    mouseX: 0,
    mouseY: 0,
    isPressed: false,
    pressTarget: null
  };
}

export function setInteractionScale(
  state: InteractionState,
  scale: number,
  offsetX: number,
  offsetY: number
): void {
  state.scale = scale;
  state.offsetX = offsetX;
  state.offsetY = offsetY;
}

function getGameCoords(state: InteractionState, clientX: number, clientY: number): { x: number; y: number } {
  const rect = state.canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - state.offsetX) / state.scale,
    y: (clientY - rect.top - state.offsetY) / state.scale
  };
}

export function setupInteractionListeners(
  interaction: InteractionState,
  getState: () => GameState,
  listener: Listener
): () => void {
  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    const { x, y } = getGameCoords(interaction, e.clientX, e.clientY);
    interaction.mouseX = x;
    interaction.mouseY = y;
    interaction.isPressed = true;

    const gameState = getState();
    const rune = findRuneAt(gameState, x, y);

    if (rune && !rune.isFlying) {
      interaction.draggingRune = rune;
      interaction.pressTarget = 'rune';
      listener({ type: 'pickup', runeId: rune.id, mouseX: x, mouseY: y });
    } else if (isHintButtonArea(x, y)) {
      interaction.pressTarget = 'hint';
    } else if (isResetButtonArea(x, y)) {
      interaction.pressTarget = 'reset';
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    const { x, y } = getGameCoords(interaction, e.clientX, e.clientY);
    interaction.mouseX = x;
    interaction.mouseY = y;

    if (interaction.draggingRune) {
      listener({ type: 'drag', mouseX: x, mouseY: y });
    } else {
      listener({ type: 'hover', mouseX: x, mouseY: y });
    }

    updateCursor(interaction, getState());
  };

  const onMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    const { x, y } = getGameCoords(interaction, e.clientX, e.clientY);

    if (interaction.draggingRune) {
      listener({ type: 'drop', mouseX: x, mouseY: y });
      interaction.draggingRune = null;
    } else if (interaction.isPressed) {
      if (interaction.pressTarget === 'hint' && isHintButtonArea(x, y)) {
        listener({ type: 'clickHint' });
      } else if (interaction.pressTarget === 'reset' && isResetButtonArea(x, y)) {
        listener({ type: 'clickReset' });
      }
    }

    interaction.isPressed = false;
    interaction.pressTarget = null;
    updateCursor(interaction, getState());
  };

  const onMouseLeave = () => {
    if (interaction.draggingRune) {
      listener({ type: 'drop', mouseX: interaction.mouseX, mouseY: interaction.mouseY });
      interaction.draggingRune = null;
    }
    interaction.isPressed = false;
    interaction.pressTarget = null;
  };

  const canvas = interaction.canvas;
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);

  return () => {
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('mouseleave', onMouseLeave);
  };
}

function updateCursor(interaction: InteractionState, gameState: GameState): void {
  const canvas = interaction.canvas;
  const { mouseX: x, mouseY: y } = interaction;
  const rune = findRuneAt(gameState, x, y);

  if (interaction.draggingRune) {
    canvas.style.cursor = 'grabbing';
  } else if (rune || isSpellBookArea(x, y) || isHintButtonArea(x, y) || isResetButtonArea(x, y)) {
    canvas.style.cursor = 'pointer';
  } else {
    canvas.style.cursor = 'default';
  }
}
