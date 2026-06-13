import { Piece, GameState } from './pieces';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface SnapAnimation {
  piece: Piece;
  startX: number;
  startY: number;
  startRotation: number;
  endX: number;
  endY: number;
  endRotation: number;
  duration: number;
  elapsed: number;
}

export interface CompletionAnimation {
  elapsed: number;
  duration: number;
  phase: 'combine' | 'pattern' | 'particles' | 'text';
  patternProgress: number;
  textIndex: number;
  textTimer: number;
}

export interface FlowLight {
  x: number;
  y: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  progress: number;
}

export interface AnimationState {
  snapAnimations: SnapAnimation[];
  completionAnimation: CompletionAnimation | null;
  particles: Particle[];
  flowLights: FlowLight[];
  timerDisplay: { seconds: number; animProgress: number };
}

const EASE_ELASTIC = (t: number): number => {
  if (t === 0 || t === 1) return t;
  const p = 0.3;
  const s = p / 4;
  return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
};

const EASE_IN_OUT = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

export function createAnimationState(): AnimationState {
  return {
    snapAnimations: [],
    completionAnimation: null,
    particles: [],
    flowLights: [],
    timerDisplay: { seconds: 0, animProgress: 1 }
  };
}

export function addSnapAnimation(
  state: AnimationState,
  piece: Piece,
  startX: number,
  startY: number,
  startRotation: number
): void {
  state.snapAnimations.push({
    piece,
    startX,
    startY,
    startRotation,
    endX: piece.targetX,
    endY: piece.targetY,
    endRotation: piece.targetRotation,
    duration: 0.3,
    elapsed: 0
  });
}

export function startCompletionAnimation(state: AnimationState, gameState: GameState): void {
  state.completionAnimation = {
    elapsed: 0,
    duration: 1.5 + 3.6 + 2 + 1.2,
    phase: 'combine',
    patternProgress: 0,
    textIndex: 0,
    textTimer: 0
  };

  const centerX = gameState.potCenterX;
  const centerY = gameState.potCenterY;
  for (let i = 0; i < 100; i++) {
    const angle = (i / 100) * Math.PI * 2;
    const speed = 100 + Math.random() * 150;
    state.particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      life: 2,
      maxLife: 2,
      size: 2 + Math.random() * 4,
      color: `rgba(255, ${180 + Math.floor(Math.random() * 60)}, 0, `
    });
  }
}

export function initFlowLights(state: AnimationState, width: number, height: number): void {
  state.flowLights = [];
  for (let i = 0; i < 8; i++) {
    state.flowLights.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 50 + Math.random() * 100,
      angle: Math.random() * Math.PI * 2,
      speed: 20 + Math.random() * 30,
      opacity: 0.1 + Math.random() * 0.2,
      progress: Math.random()
    });
  }
}

export function updateAnimations(
  state: AnimationState,
  gameState: GameState,
  deltaTime: number
): void {
  for (let i = state.snapAnimations.length - 1; i >= 0; i--) {
    const anim = state.snapAnimations[i];
    anim.elapsed += deltaTime;
    const t = Math.min(anim.elapsed / anim.duration, 1);
    const eased = EASE_ELASTIC(t);

    anim.piece.x = anim.startX + (anim.endX - anim.startX) * eased;
    anim.piece.y = anim.startY + (anim.endY - anim.startY) * eased;
    anim.piece.rotation = anim.startRotation + (anim.endRotation - anim.startRotation) * eased;

    if (t >= 1) {
      state.snapAnimations.splice(i, 1);
    }
  }

  if (state.completionAnimation) {
    const ca = state.completionAnimation;
    ca.elapsed += deltaTime;

    if (ca.elapsed < 1.5) {
      ca.phase = 'combine';
      const t = Math.min(ca.elapsed / 1.5, 1);
      const eased = EASE_IN_OUT(t);
      gameState.pieces.forEach(piece => {
        if (!piece._startX) {
          (piece as any)._startX = piece.x;
          (piece as any)._startY = piece.y;
          (piece as any)._startRotation = piece.rotation;
        }
        piece.x = (piece as any)._startX + (piece.targetX - (piece as any)._startX) * eased;
        piece.y = (piece as any)._startY + (piece.targetY - (piece as any)._startY) * eased;
        piece.rotation = (piece as any)._startRotation + (piece.targetRotation - (piece as any)._startRotation) * eased;
      });
    } else if (ca.elapsed < 1.5 + 3.6) {
      ca.phase = 'pattern';
      ca.patternProgress = (ca.elapsed - 1.5) / 3.6;
    } else if (ca.elapsed < 1.5 + 3.6 + 2) {
      ca.phase = 'particles';
    } else {
      ca.phase = 'text';
      ca.textTimer += deltaTime;
      if (ca.textTimer >= 0.15) {
        ca.textTimer = 0;
        ca.textIndex = Math.min(ca.textIndex + 1, 5);
      }
    }
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    p.vy += 80 * deltaTime;
    p.life -= deltaTime;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }

  state.flowLights.forEach(light => {
    light.progress += deltaTime * 0.5;
    if (light.progress > 1) {
      light.progress = 0;
      light.x = Math.random() * gameState.canvasWidth;
      light.y = Math.random() * gameState.canvasHeight;
      light.angle = Math.random() * Math.PI * 2;
    }
  });

  const currentSeconds = Math.floor(gameState.elapsedTime / 1000);
  if (currentSeconds !== state.timerDisplay.seconds) {
    state.timerDisplay.seconds = currentSeconds;
    state.timerDisplay.animProgress = 0;
  } else if (state.timerDisplay.animProgress < 1) {
    state.timerDisplay.animProgress = Math.min(state.timerDisplay.animProgress + deltaTime * 4, 1);
  }
}

export function getPatternRingProgress(state: AnimationState, ringIndex: number, totalRings: number): number {
  if (!state.completionAnimation) return 0;
  const perRing = 1 / totalRings;
  const ringStart = ringIndex * perRing * 0.8;
  const ringProgress = (state.completionAnimation.patternProgress - ringStart) / perRing;
  return Math.max(0, Math.min(1, ringProgress));
}

export function getTextDisplay(state: AnimationState): string {
  if (!state.completionAnimation) return '';
  const fullText = '修复完成！';
  return fullText.slice(0, state.completionAnimation.textIndex);
}
