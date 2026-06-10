export type StoneState = 'default' | 'correct' | 'wrong' | 'fading';

export interface StoneData {
  index: number;
  state: StoneState;
  stateStartTime: number;
  pressOffset: number;
  pressStartTime: number;
  glowRadius: number;
  glowAlpha: number;
  glowStartTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class GameState {
  private currentStep: number = 0;
  private correctSequence: number[] = [];
  private playerSequence: number[] = [];
  private stones: StoneData[] = [];
  private particles: Particle[] = [];
  private towerProgress: number = 0;
  private towerRising: boolean = false;
  private isCompleted: boolean = false;
  private readonly SEQUENCE_LENGTH: number = 3;
  private readonly TOTAL_STONES: number = 9;

  public readonly PENTATONIC_FREQS: number[] = [261, 293, 329, 392, 440];

  constructor() {
    this.initStones();
    this.generateSequence();
  }

  private initStones(): void {
    this.stones = [];
    for (let i = 0; i < this.TOTAL_STONES; i++) {
      this.stones.push({
        index: i,
        state: 'default',
        stateStartTime: 0,
        pressOffset: 0,
        pressStartTime: 0,
        glowRadius: 0,
        glowAlpha: 0,
        glowStartTime: 0,
      });
    }
  }

  private generateSequence(): void {
    this.correctSequence = [];
    const available = Array.from({ length: this.TOTAL_STONES }, (_, i) => i);
    for (let i = 0; i < this.SEQUENCE_LENGTH; i++) {
      const randIdx = Math.floor(Math.random() * available.length);
      this.correctSequence.push(available[randIdx]);
      available.splice(randIdx, 1);
    }
  }

  public reset(): void {
    this.currentStep = 0;
    this.playerSequence = [];
    this.towerProgress = 0;
    this.towerRising = false;
    this.isCompleted = false;
    this.particles = [];
    this.initStones();
    this.generateSequence();
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getSequenceLength(): number {
    return this.SEQUENCE_LENGTH;
  }

  public getCorrectSequence(): number[] {
    return [...this.correctSequence];
  }

  public getPlayerSequence(): number[] {
    return [...this.playerSequence];
  }

  public getStones(): StoneData[] {
    return this.stones;
  }

  public getStone(index: number): StoneData | undefined {
    return this.stones[index];
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public addParticle(p: Particle): void {
    this.particles.push(p);
  }

  public removeParticle(index: number): void {
    this.particles.splice(index, 1);
  }

  public getTowerProgress(): number {
    return this.towerProgress;
  }

  public setTowerProgress(p: number): void {
    this.towerProgress = Math.max(0, Math.min(1, p));
  }

  public isTowerRising(): boolean {
    return this.towerRising;
  }

  public setTowerRising(v: boolean): void {
    this.towerRising = v;
  }

  public getIsCompleted(): boolean {
    return this.isCompleted;
  }

  public setIsCompleted(v: boolean): void {
    this.isCompleted = v;
  }

  public pressStone(stoneIndex: number, now: number): boolean {
    if (this.isCompleted || stoneIndex < 0 || stoneIndex >= this.TOTAL_STONES) {
      return false;
    }

    const stone = this.stones[stoneIndex];
    stone.pressStartTime = now;
    stone.pressOffset = 2;
    stone.glowStartTime = now;
    stone.glowRadius = 0;
    stone.glowAlpha = 0.6;

    const expected = this.correctSequence[this.currentStep];
    if (stoneIndex === expected) {
      stone.state = 'correct';
      stone.stateStartTime = now;
      this.playerSequence.push(stoneIndex);
      this.currentStep++;

      if (this.currentStep >= this.SEQUENCE_LENGTH) {
        this.isCompleted = true;
        this.towerRising = true;
      }
      return true;
    } else {
      stone.state = 'wrong';
      stone.stateStartTime = now;
      this.currentStep = 0;
      this.playerSequence = [];

      for (const s of this.stones) {
        if (s.index !== stoneIndex) {
          s.state = 'default';
        }
      }
      return false;
    }
  }

  public getFreqForStone(stoneIndex: number): number {
    return this.PENTATONIC_FREQS[stoneIndex % this.PENTATONIC_FREQS.length];
  }
}
