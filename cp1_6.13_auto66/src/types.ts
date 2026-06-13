export type RuneType = 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';

export type SpellType = 'firestorm' | 'mudslide' | 'shadowbind' | 'holylight' | 'unknown';

export interface Rune {
  id: string;
  type: RuneType;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  placedIndex: number | null;
  isDragging: boolean;
  isFlying: boolean;
  flyStartX: number;
  flyStartY: number;
  flyEndX: number;
  flyEndY: number;
  flyStartTime: number;
  flyDuration: number;
  hoverScale: number;
  pressScale: number;
}

export interface SpellSlot {
  rune: Rune | null;
}

export interface GateNode {
  x: number;
  y: number;
  activated: boolean;
  requiredSpell: SpellType;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  runes: Rune[];
  spellSlots: SpellSlot[];
  gateNodes: GateNode[];
  isCasting: boolean;
  castProgress: number;
  castSpell: SpellType | null;
  edgeFlameTime: number;
  scheduledCastTime: number;
  gateShakeTime: number;
  gateErrorFlash: number;
  gateOpened: boolean;
  openLightProgress: number;
  hintText: string | null;
  hintShowTime: number;
  hintCooldown: number;
  rippleTime: number;
  particles: Particle[];
}

export type RuneEvent =
  | { type: 'pickup'; runeId: string; mouseX: number; mouseY: number }
  | { type: 'drag'; mouseX: number; mouseY: number }
  | { type: 'drop'; mouseX: number; mouseY: number }
  | { type: 'hover'; mouseX: number; mouseY: number }
  | { type: 'clickHint' }
  | { type: 'clickReset' };
