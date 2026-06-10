import {
  CharacterStateData,
  applyHit,
  checkCollision,
  shouldComboReset,
  updateCharacter,
  isInHitWindow,
} from './stateMachine';

export interface ComboEntry {
  hitNumber: number;
  damage: number;
  hitFrame: number;
  hitWindow: string;
}

export interface FloatingDamage {
  id: number;
  x: number;
  y: number;
  damage: number;
  opacity: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface DamageCurveControlPoint {
  hitCount: number;
  multiplier: number;
}

export interface CombatState {
  p1: CharacterStateData;
  p2: CharacterStateData;
  p1Combo: ComboEntry[];
  p2Combo: ComboEntry[];
  p1ComboResetTimer: number;
  p2ComboResetTimer: number;
  p1DamageTotal: number;
  p2DamageTotal: number;
  p1MaxCombo: number;
  p2MaxCombo: number;
  p1TotalCombos: number;
  p2TotalCombos: number;
  floatingDamages: FloatingDamage[];
  curveControlPoints: DamageCurveControlPoint[];
  aiEnabled: boolean;
  battleRunning: boolean;
  battleTimeSeconds: number;
  p1ComboTerminated: boolean;
  p2ComboTerminated: boolean;
  p1ComboTerminatedTimer: number;
  p2ComboTerminatedTimer: number;
  showResult: boolean;
  winner: 1 | 2 | null;
}

let floatingDamageIdCounter = 0;

const DEFAULT_CURVE_POINTS: DamageCurveControlPoint[] = [
  { hitCount: 1, multiplier: 1.0 },
  { hitCount: 5, multiplier: 0.75 },
  { hitCount: 10, multiplier: 0.5 },
  { hitCount: 20, multiplier: 0.3 },
];

export function createCombatState(
  p1: CharacterStateData,
  p2: CharacterStateData
): CombatState {
  return {
    p1,
    p2,
    p1Combo: [],
    p2Combo: [],
    p1ComboResetTimer: 0,
    p2ComboResetTimer: 0,
    p1DamageTotal: 0,
    p2DamageTotal: 0,
    p1MaxCombo: 0,
    p2MaxCombo: 0,
    p1TotalCombos: 0,
    p2TotalCombos: 0,
    floatingDamages: [],
    curveControlPoints: DEFAULT_CURVE_POINTS.map((p) => ({ ...p })),
    aiEnabled: false,
    battleRunning: false,
    battleTimeSeconds: 30,
    p1ComboTerminated: false,
    p2ComboTerminated: false,
    p1ComboTerminatedTimer: 0,
    p2ComboTerminatedTimer: 0,
    showResult: false,
    winner: null,
  };
}

export function getDamageMultiplier(
  state: CombatState,
  hitCount: number
): number {
  const points = state.curveControlPoints;
  if (points.length === 0) return 1.0;

  if (hitCount <= points[0].hitCount) return points[0].multiplier;
  if (hitCount >= points[points.length - 1].hitCount)
    return points[points.length - 1].multiplier;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (hitCount >= p1.hitCount && hitCount <= p2.hitCount) {
      const t = (hitCount - p1.hitCount) / (p2.hitCount - p1.hitCount);
      return p1.multiplier + (p2.multiplier - p1.multiplier) * t;
    }
  }

  return 0.3;
}

export function generateFormulaString(state: CombatState): string {
  const points = state.curveControlPoints;
  if (points.length < 2) {
    return `damage = max(0.3, ${points[0]?.multiplier.toFixed(2) || 1.0})`;
  }

  const p1 = points[0];
  const p2 = points[1];
  const slope = (p2.multiplier - p1.multiplier) / (p2.hitCount - p1.hitCount);
  const intercept = p1.multiplier - slope * p1.hitCount;
  const minMult = points[points.length - 1].multiplier;

  const slopeStr = slope >= 0 ? `+ ${slope.toFixed(3)}` : `- ${Math.abs(slope).toFixed(3)}`;
  const interceptStr = intercept >= 0 ? `+ ${intercept.toFixed(2)}` : `- ${Math.abs(intercept).toFixed(2)}`;

  return `damage = max(${minMult.toFixed(2)}, (hitCount * ${Math.abs(slope).toFixed(3)}) ${interceptStr})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function addFloatingDamage(
  state: CombatState,
  x: number,
  y: number,
  damage: number
): void {
  state.floatingDamages.push({
    id: floatingDamageIdCounter++,
    x,
    y,
    damage,
    opacity: 1,
    vy: -1.5,
    life: 60,
    maxLife: 60,
  });
}

export function getDamageColor(damage: number, baseDamage: number): string {
  const ratio = damage / baseDamage;
  if (ratio <= 0.6) return '#2ecc71';
  if (ratio <= 1.0) return '#f1c40f';
  return '#e74c3c';
}

export function processAttackHit(
  state: CombatState,
  attacker: 1 | 2
): void {
  const attackerChar = attacker === 1 ? state.p1 : state.p2;
  const defenderChar = attacker === 1 ? state.p2 : state.p1;
  const defenderNum: 1 | 2 = attacker === 1 ? 2 : 1;

  if (!isInHitWindow(attackerChar) || attackerChar.attackHit) return;
  if (!checkCollision(attackerChar, defenderChar)) return;

  const isBlocking = defenderChar.isDefending;
  const hitResult = applyHit(defenderChar, isBlocking);
  attackerChar.attackHit = true;

  const attackerCombo = attacker === 1 ? state.p1Combo : state.p2Combo;
  const newComboCount = attackerCombo.length + 1;

  if (newComboCount === 1) {
    if (attacker === 1) state.p1TotalCombos++;
    else state.p2TotalCombos++;
  }

  const multiplier = getDamageMultiplier(state, newComboCount);
  const baseDamage = attackerChar.config.baseDamage;
  const damage = Math.round(baseDamage * multiplier * hitResult.damageMultiplier);

  if (attacker === 1) {
    state.p1DamageTotal += damage;
    if (newComboCount > state.p1MaxCombo) state.p1MaxCombo = newComboCount;
    state.p1ComboTerminated = false;
    state.p1ComboTerminatedTimer = 0;
  } else {
    state.p2DamageTotal += damage;
    if (newComboCount > state.p2MaxCombo) state.p2MaxCombo = newComboCount;
    state.p2ComboTerminated = false;
    state.p2ComboTerminatedTimer = 0;
  }

  const hitFrame = attackerChar.frameInState;
  const hitWindow = `${attackerChar.config.hitWindowStart}-${attackerChar.config.hitWindowEnd}`;

  attackerCombo.push({
    hitNumber: newComboCount,
    damage,
    hitFrame,
    hitWindow,
  });

  addFloatingDamage(state, defenderChar.x, defenderChar.y - 120, damage);

  if (defenderNum === 1) {
    state.p1ComboResetTimer = 0;
  } else {
    state.p2ComboResetTimer = 0;
  }
}

export function resetComboIfNeeded(state: CombatState): void {
  if (shouldComboReset(state.p1) && state.p2Combo.length > 0 && !state.p2ComboTerminated) {
    state.p2ComboTerminated = true;
    state.p2ComboTerminatedTimer = 30;
    state.p2Combo = [];
  }
  if (shouldComboReset(state.p2) && state.p1Combo.length > 0 && !state.p1ComboTerminated) {
    state.p1ComboTerminated = true;
    state.p1ComboTerminatedTimer = 30;
    state.p1Combo = [];
  }
}

export function runAI(state: CombatState): void {
  if (!state.battleRunning || !state.aiEnabled) return;

  const processAI = (char: CharacterStateData, opponent: CharacterStateData, id: 1 | 2) => {
    if (char.state !== 'idle') return;
    if (Math.random() < 0.05) return;

    const choice = Math.random();

    if (choice < 0.7) {
      char.isDefending = false;
      if (opponent.state === 'idle' || opponent.state === 'attacking') {
        if (Math.random() < 0.85) {
          const savedState = opponent.state;
          const savedFrame = opponent.frameInState;
          processAttackHit(state, id);
          if (id === 1) {
            if (!state.p2.attackHit && state.p2.state !== savedState) {
            }
          }
        }
      }
    } else if (choice < 0.85) {
      char.isDefending = true;
    } else {
      char.isDefending = false;
    }
  };

  if (Math.random() < 0.08) {
    if (state.p1.state === 'idle') {
      processAI(state.p1, state.p2, 1);
      if (state.p1.state === 'idle' && Math.random() < 0.6) {
        state.p1.state = 'attacking';
        state.p1.prevState = 'idle';
        state.p1.frameInState = 0;
        state.p1.attackHit = false;
      }
    }
  }

  if (Math.random() < 0.08) {
    if (state.p2.state === 'idle') {
      processAI(state.p2, state.p1, 2);
      if (state.p2.state === 'idle' && Math.random() < 0.6) {
        state.p2.state = 'attacking';
        state.p2.prevState = 'idle';
        state.p2.frameInState = 0;
        state.p2.attackHit = false;
      }
    }
  }
}

export function updateCombat(state: CombatState, deltaFrames: number = 1): void {
  for (let i = 0; i < deltaFrames; i++) {
    updateCharacter(state.p1);
    updateCharacter(state.p2);

    processAttackHit(state, 1);
    processAttackHit(state, 2);

    resetComboIfNeeded(state);

    if (state.p1ComboTerminatedTimer > 0) {
      state.p1ComboTerminatedTimer--;
      if (state.p1ComboTerminatedTimer <= 0) state.p1ComboTerminated = false;
    }
    if (state.p2ComboTerminatedTimer > 0) {
      state.p2ComboTerminatedTimer--;
      if (state.p2ComboTerminatedTimer <= 0) state.p2ComboTerminated = false;
    }

    state.floatingDamages = state.floatingDamages.filter((fd) => {
      fd.y += fd.vy;
      fd.vy *= 0.98;
      fd.life--;
      fd.opacity = Math.max(0, fd.life / fd.maxLife);
      return fd.life > 0;
    });

    if (state.battleRunning) {
      runAI(state);
    }
  }
}

export function startBattle(state: CombatState): void {
  state.battleRunning = true;
  state.aiEnabled = true;
  state.battleTimeSeconds = 30;
  state.p1DamageTotal = 0;
  state.p2DamageTotal = 0;
  state.p1Combo = [];
  state.p2Combo = [];
  state.p1MaxCombo = 0;
  state.p2MaxCombo = 0;
  state.p1TotalCombos = 0;
  state.p2TotalCombos = 0;
  state.floatingDamages = [];
  state.showResult = false;
  state.winner = null;

  state.p1.state = 'idle';
  state.p1.frameInState = 0;
  state.p1.prevState = 'idle';
  state.p1.attackHit = false;
  state.p1.isDefending = false;
  state.p2.state = 'idle';
  state.p2.frameInState = 0;
  state.p2.prevState = 'idle';
  state.p2.attackHit = false;
  state.p2.isDefending = false;
}

export function endBattle(state: CombatState): void {
  state.battleRunning = false;
  state.aiEnabled = false;
  state.showResult = true;
  state.winner = state.p1DamageTotal >= state.p2DamageTotal ? 1 : 2;
}

export function resetBattle(state: CombatState): void {
  startBattle(state);
  state.battleRunning = false;
  state.aiEnabled = false;
}
