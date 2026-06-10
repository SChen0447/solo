export interface LevelState {
  score: number;
  level: number;
  maxLevel: number;
  cometCount: number;
  speedMultiplier: number;
  showNebula: boolean;
  homerunActive: boolean;
  homerunAlpha: number;
  homerunTimer: number;
  rainbowNebula: boolean;
  rainbowTimer: number;
}

const POINTS_PER_LEVEL = 5;
const MAX_COMETS = 3;
const MAX_LEVEL = 10;

export function createLevelState(): LevelState {
  return {
    score: 0,
    level: 1,
    maxLevel: MAX_LEVEL,
    cometCount: 1,
    speedMultiplier: 1,
    showNebula: false,
    homerunActive: false,
    homerunAlpha: 0,
    homerunTimer: 0,
    rainbowNebula: false,
    rainbowTimer: 0
  };
}

export function addScore(state: LevelState, points: number = 1): { leveledUp: boolean } {
  const oldLevel = state.level;
  state.score += points;
  state.level = Math.min(Math.floor(state.score / POINTS_PER_LEVEL) + 1, MAX_LEVEL);

  const leveledUp = state.level > oldLevel;
  if (leveledUp) {
    state.cometCount = Math.min(1 + (state.level - 1), MAX_COMETS);
    state.speedMultiplier = 1 + (state.level - 1) * 0.1;
    if (state.level >= 3) {
      state.showNebula = true;
    }
  }

  return { leveledUp };
}

export function updateHomerun(state: LevelState, deltaTime: number): void {
  if (state.homerunActive) {
    state.homerunTimer += deltaTime;
    const totalDuration = 1.5;

    if (state.homerunTimer < 0.3) {
      state.homerunAlpha = state.homerunTimer / 0.3;
    } else if (state.homerunTimer < totalDuration - 0.3) {
      state.homerunAlpha = 1;
    } else if (state.homerunTimer < totalDuration) {
      state.homerunAlpha = (totalDuration - state.homerunTimer) / 0.3;
    } else {
      state.homerunActive = false;
      state.homerunAlpha = 0;
      state.homerunTimer = 0;
    }
  }

  if (state.rainbowNebula) {
    state.rainbowTimer += deltaTime;
    if (state.rainbowTimer > 2) {
      state.rainbowNebula = false;
      state.rainbowTimer = 0;
    }
  }
}

export function triggerHomerun(state: LevelState): void {
  state.homerunActive = true;
  state.homerunAlpha = 0;
  state.homerunTimer = 0;
  state.rainbowNebula = true;
  state.rainbowTimer = 0;
}

export function shouldTriggerHomerun(
  state: LevelState,
  currentComets: number,
  capturedThisRound: number
): boolean {
  return state.cometCount === MAX_COMETS && currentComets === 0 && capturedThisRound === MAX_COMETS;
}
