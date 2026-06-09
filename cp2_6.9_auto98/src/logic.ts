import { Recipe, RecipeStep, getCurrentStep, getTotalRecipeDuration } from './recipe';
import { InputEvent } from './input';

export type HitResult = 'perfect' | 'good' | 'miss';

export interface HitEffect {
  id: number;
  type: HitResult;
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  startTime: number;
  duration: number;
}

export interface GameState {
  status: 'ready' | 'playing' | 'burning' | 'gameover' | 'victory';
  score: number;
  combo: number;
  maxCombo: number;
  lives: number;
  maxLives: number;
  elapsedTime: number;
  totalDuration: number;
  currentStepIndex: number;
  currentStepTime: number;
  burnStartTime: number;
  burnDuration: number;
}

const PERFECT_WINDOW = 150;
const GOOD_WINDOW = 300;
const MAX_PARTICLES = 100;

export class GameLogic {
  private recipe: Recipe;
  private state: GameState;
  private hitEffects: HitEffect[] = [];
  private particles: Particle[] = [];
  private effectIdCounter = 0;
  private particleIdCounter = 0;
  private lastHitPointIndex: number = -1;
  private onStateChange?: (state: GameState) => void;

  constructor(recipe: Recipe) {
    this.recipe = JSON.parse(JSON.stringify(recipe));
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      status: 'ready',
      score: 0,
      combo: 0,
      maxCombo: 0,
      lives: 3,
      maxLives: 3,
      elapsedTime: 0,
      totalDuration: getTotalRecipeDuration(this.recipe),
      currentStepIndex: 0,
      currentStepTime: 0,
      burnStartTime: 0,
      burnDuration: 5000
    };
  }

  public setStateChangeListener(listener: (state: GameState) => void): void {
    this.onStateChange = listener;
  }

  public start(): void {
    this.state.status = 'playing';
    this.state.elapsedTime = 0;
    this.notifyStateChange();
  }

  public reset(): void {
    this.recipe = JSON.parse(JSON.stringify(this.recipe));
    this.state = this.createInitialState();
    this.hitEffects = [];
    this.particles = [];
    this.effectIdCounter = 0;
    this.particleIdCounter = 0;
    this.lastHitPointIndex = -1;
    this.notifyStateChange();
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getHitEffects(): HitEffect[] {
    return [...this.hitEffects];
  }

  public getParticles(): Particle[] {
    return [...this.particles];
  }

  public getCurrentStep(): RecipeStep | null {
    const { step } = getCurrentStep(this.recipe, this.state.elapsedTime);
    return step;
  }

  public getRecipe(): Recipe {
    return this.recipe;
  }

  public handleInput(_input: InputEvent): void {
    if (this.state.status !== 'playing') return;

    const { step, stepTime } = getCurrentStep(this.recipe, this.state.elapsedTime);
    if (!step) return;

    let closestIndex = -1;
    let minDiff = Infinity;

    for (let i = 0; i < step.rhythmPoints.length; i++) {
      const point = step.rhythmPoints[i];
      if (point.hit) continue;
      const diff = Math.abs(stepTime - point.time);
      if (diff < minDiff && diff <= GOOD_WINDOW) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    if (closestIndex >= 0 && closestIndex > this.lastHitPointIndex) {
      const hitPoint = step.rhythmPoints[closestIndex];
      hitPoint.hit = true;
      this.lastHitPointIndex = closestIndex;

      let result: HitResult;
      if (minDiff <= PERFECT_WINDOW) {
        result = 'perfect';
      } else if (minDiff <= GOOD_WINDOW) {
        result = 'good';
      } else {
        result = 'miss';
      }

      hitPoint.result = result;
      this.processHitResult(result);
    } else {
      this.processHitResult('miss');
    }
  }

  private processHitResult(result: HitResult): void {
    const effectX = 80;
    const effectY = 360;

    if (result === 'perfect') {
      this.state.combo++;
      if (this.state.combo > this.state.maxCombo) {
        this.state.maxCombo = this.state.combo;
      }
      let points = 100;
      if (this.state.combo > 0 && this.state.combo % 5 === 0) {
        points += 50;
      }
      this.state.score += points;
      this.spawnStarParticles(effectX, effectY);
    } else if (result === 'good') {
      this.state.combo++;
      if (this.state.combo > this.state.maxCombo) {
        this.state.maxCombo = this.state.combo;
      }
      this.state.score += 50;
    } else {
      this.state.combo = 0;
      this.state.lives--;
    }

    this.addHitEffect(result, effectX, effectY);

    if (this.state.lives <= 0) {
      this.state.status = 'burning';
      this.state.burnStartTime = this.state.elapsedTime;
    }

    this.notifyStateChange();
  }

  private addHitEffect(type: HitResult, x: number, y: number): void {
    this.hitEffects.push({
      id: this.effectIdCounter++,
      type,
      x,
      y,
      startTime: this.state.elapsedTime,
      duration: 500
    });
  }

  private spawnStarParticles(x: number, y: number): void {
    const colors = ['#FFD700', '#FFA500', '#FFFF00', '#FFFFFF'];
    for (let i = 0; i < 12; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      const angle = (i / 12) * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      this.particles.push({
        id: this.particleIdCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        startTime: this.state.elapsedTime,
        duration: 500
      });
    }
  }

  public update(deltaTime: number): void {
    if (this.state.status === 'ready') return;

    if (this.state.status === 'playing') {
      this.state.elapsedTime += deltaTime;
      const { stepIndex, stepTime } = getCurrentStep(this.recipe, this.state.elapsedTime);
      this.state.currentStepIndex = stepIndex;
      this.state.currentStepTime = stepTime;

      if (!this.getCurrentStep()) {
        this.state.status = 'victory';
        this.notifyStateChange();
      }
    } else if (this.state.status === 'burning') {
      this.state.elapsedTime += deltaTime;
      if (this.state.elapsedTime - this.state.burnStartTime >= this.state.burnDuration) {
        this.state.status = 'gameover';
        this.notifyStateChange();
      }
    }

    this.cleanupEffects();
    this.updateParticles(deltaTime);
  }

  private cleanupEffects(): void {
    this.hitEffects = this.hitEffects.filter(
      (effect) => this.state.elapsedTime - effect.startTime < effect.duration
    );
    this.particles = this.particles.filter(
      (p) => this.state.elapsedTime - p.startTime < p.duration
    );
  }

  private updateParticles(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
    });
  }

  public getGrade(): string {
    const score = this.state.score;
    if (score >= 1000) return 'S';
    if (score >= 700) return 'A';
    if (score >= 400) return 'B';
    return 'C';
  }

  public isRestartButtonClicked(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    if (this.state.status !== 'gameover' && this.state.status !== 'victory') return false;
    const btnWidth = 160;
    const btnHeight = 50;
    const btnX = (canvasWidth - btnWidth) / 2;
    const btnY = canvasHeight - 100;
    return x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }
}
