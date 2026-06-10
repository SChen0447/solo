export type CharacterState = 'idle' | 'attacking' | 'hit' | 'knockedDown' | 'gettingUp';

export interface CharacterConfig {
  attackFrames: number;
  hitStunFrames: number;
  baseDamage: number;
  hitWindowStart: number;
  hitWindowEnd: number;
}

export interface CharacterStateData {
  state: CharacterState;
  prevState: CharacterState;
  frameInState: number;
  totalFrames: number;
  config: CharacterConfig;
  attackHit: boolean;
  hitFlashTimer: number;
  hitBoxFlashTimer: number;
  blockFlashTimer: number;
  x: number;
  y: number;
  facing: 1 | -1;
  isDefending: boolean;
}

export const DEFAULT_CONFIG: CharacterConfig = {
  attackFrames: 15,
  hitStunFrames: 25,
  baseDamage: 10,
  hitWindowStart: 5,
  hitWindowEnd: 10,
};

const KNOCKDOWN_FRAMES = 60;
const GETTING_UP_FRAMES = 30;
const COMBO_TIMEOUT_FRAMES = 5;

export function createCharacter(
  x: number,
  y: number,
  facing: 1 | -1,
  config: CharacterConfig = { ...DEFAULT_CONFIG }
): CharacterStateData {
  return {
    state: 'idle',
    prevState: 'idle',
    frameInState: 0,
    totalFrames: 0,
    config,
    attackHit: false,
    hitFlashTimer: 0,
    hitBoxFlashTimer: 0,
    blockFlashTimer: 0,
    x,
    y,
    facing,
    isDefending: false,
  };
}

export function isInHitWindow(char: CharacterStateData): boolean {
  if (char.state !== 'attacking') return false;
  return (
    char.frameInState >= char.config.hitWindowStart &&
    char.frameInState <= char.config.hitWindowEnd
  );
}

export function canBeHit(char: CharacterStateData): boolean {
  return char.state === 'idle' || char.state === 'attacking' || char.state === 'hit';
}

export function startAttack(char: CharacterStateData): void {
  if (char.state === 'idle') {
    char.prevState = char.state;
    char.state = 'attacking';
    char.frameInState = 0;
    char.attackHit = false;
    char.isDefending = false;
  }
}

export function startDefend(char: CharacterStateData): void {
  if (char.state === 'idle') {
    char.isDefending = true;
  }
}

export function stopDefend(char: CharacterStateData): void {
  char.isDefending = false;
}

export function applyHit(
  char: CharacterStateData,
  isBlocking: boolean = false
): { knockedDown: boolean; damageMultiplier: number } {
  if (isBlocking) {
    char.blockFlashTimer = 9;
    return { knockedDown: false, damageMultiplier: 0.5 };
  }

  char.hitFlashTimer = 6;
  char.hitBoxFlashTimer = 3;
  char.prevState = char.state;

  if (char.state === 'hit') {
    const comboCount = char.frameInState;
    if (comboCount > char.config.hitStunFrames * 0.8) {
      char.state = 'knockedDown';
      char.frameInState = 0;
      return { knockedDown: true, damageMultiplier: 1.0 };
    }
  }

  char.state = 'hit';
  char.frameInState = 0;
  char.isDefending = false;
  return { knockedDown: false, damageMultiplier: 1.0 };
}

export function shouldComboReset(char: CharacterStateData): boolean {
  if (char.state === 'knockedDown') {
    return char.frameInState >= COMBO_TIMEOUT_FRAMES;
  }
  if (char.state === 'gettingUp') {
    return true;
  }
  if (char.state === 'idle' && char.prevState === 'hit') {
    return char.frameInState >= COMBO_TIMEOUT_FRAMES;
  }
  return false;
}

export function updateCharacter(char: CharacterStateData): void {
  char.totalFrames++;
  char.frameInState++;

  if (char.hitFlashTimer > 0) char.hitFlashTimer--;
  if (char.hitBoxFlashTimer > 0) char.hitBoxFlashTimer--;
  if (char.blockFlashTimer > 0) char.blockFlashTimer--;

  switch (char.state) {
    case 'attacking':
      if (char.frameInState >= char.config.attackFrames) {
        char.prevState = char.state;
        char.state = 'idle';
        char.frameInState = 0;
        char.attackHit = false;
      }
      break;

    case 'hit':
      if (char.frameInState >= char.config.hitStunFrames) {
        char.prevState = char.state;
        char.state = 'idle';
        char.frameInState = 0;
      }
      break;

    case 'knockedDown':
      if (char.frameInState >= KNOCKDOWN_FRAMES) {
        char.prevState = char.state;
        char.state = 'gettingUp';
        char.frameInState = 0;
      }
      break;

    case 'gettingUp':
      if (char.frameInState >= GETTING_UP_FRAMES) {
        char.prevState = char.state;
        char.state = 'idle';
        char.frameInState = 0;
      }
      break;

    case 'idle':
    default:
      break;
  }
}

export function getStateInterpolation(char: CharacterStateData): number {
  const totalDuration = getStateDuration(char);
  if (totalDuration <= 0) return 1;
  return Math.min(1, char.frameInState / totalDuration);
}

export function getStateDuration(char: CharacterStateData): number {
  switch (char.state) {
    case 'attacking':
      return char.config.attackFrames;
    case 'hit':
      return char.config.hitStunFrames;
    case 'knockedDown':
      return KNOCKDOWN_FRAMES;
    case 'gettingUp':
      return GETTING_UP_FRAMES;
    case 'idle':
    default:
      return 0;
  }
}

export function getHitBox(char: CharacterStateData): { x: number; y: number; w: number; h: number } {
  let w = 60;
  let h = 120;
  let offsetX = 0;

  if (char.state === 'attacking') {
    w = 80;
    h = 110;
    offsetX = 20 * char.facing;
  } else if (char.state === 'knockedDown' || char.state === 'gettingUp') {
    w = 100;
    h = 50;
  }

  return {
    x: char.x - w / 2 + offsetX,
    y: char.y - h,
    w,
    h,
  };
}

export function checkCollision(
  attacker: CharacterStateData,
  defender: CharacterStateData
): boolean {
  if (!isInHitWindow(attacker) || attacker.attackHit) return false;
  if (!canBeHit(defender)) return false;

  const atkBox = getHitBox(attacker);
  const defBox = getHitBox(defender);

  const hitExtend = 30 * attacker.facing;
  const attackHitBox = {
    x: atkBox.x + (attacker.facing === 1 ? atkBox.w : -hitExtend),
    y: atkBox.y + 20,
    w: hitExtend,
    h: atkBox.h - 40,
  };

  return (
    attackHitBox.x < defBox.x + defBox.w &&
    attackHitBox.x + attackHitBox.w > defBox.x &&
    attackHitBox.y < defBox.y + defBox.h &&
    attackHitBox.y + attackHitBox.h > defBox.y
  );
}
