export interface PuzzleState {
  currentLevel: number;
  totalLevels: number;
  targetRatio: number;
  targetRatioNumerator: number;
  targetRatioDenominator: number;
  currentRatio: number;
  stepsUsed: number;
  maxSteps: number;
  errorCount: number;
  levelProgress: number;
  isLevelComplete: boolean;
  isGameOver: boolean;
  isVictory: boolean;
}

export interface LevelConfig {
  gearCount: number;
  runeCount: number;
  targetRatio: number;
  targetRatioStr: string;
}

export class PuzzleManager {
  private state: PuzzleState;
  private levelConfigs: LevelConfig[] = [];
  private onStateChange?: (state: PuzzleState) => void;

  constructor() {
    this.state = {
      currentLevel: 1,
      totalLevels: 4,
      targetRatio: 24,
      targetRatioNumerator: 24,
      targetRatioDenominator: 1,
      currentRatio: 0,
      stepsUsed: 0,
      maxSteps: 60,
      errorCount: 0,
      levelProgress: 0,
      isLevelComplete: false,
      isGameOver: false,
      isVictory: false
    };
    this.generateLevelConfigs();
  }

  private generateLevelConfigs(): void {
    const ratios = [
      { num: 24, den: 1, str: '24 : 1' },
      { num: 16, den: 3, str: '16 : 3' },
      { num: 9, den: 2, str: '9 : 2' },
      { num: 49, den: 4, str: '49 : 4' }
    ];

    for (let i = 0; i < 4; i++) {
      this.levelConfigs.push({
        gearCount: 6 + i,
        runeCount: 3 + Math.floor(i / 2),
        targetRatio: ratios[i].num / ratios[i].den,
        targetRatioStr: ratios[i].str
      });
    }
  }

  setStateChangeCallback(callback: (state: PuzzleState) => void): void {
    this.onStateChange = callback;
  }

  getState(): PuzzleState {
    return { ...this.state };
  }

  getLevelConfig(level?: number): LevelConfig {
    const lvl = level ?? this.state.currentLevel;
    return this.levelConfigs[lvl - 1];
  }

  getCurrentLevelConfig(): LevelConfig {
    return this.getLevelConfig(this.state.currentLevel);
  }

  resetGame(): void {
    this.state = {
      currentLevel: 1,
      totalLevels: 4,
      targetRatio: this.levelConfigs[0].targetRatio,
      targetRatioNumerator: parseInt(this.levelConfigs[0].targetRatioStr.split(':')[0].trim()),
      targetRatioDenominator: parseInt(this.levelConfigs[0].targetRatioStr.split(':')[1].trim()),
      currentRatio: 0,
      stepsUsed: 0,
      maxSteps: 60,
      errorCount: 0,
      levelProgress: 0,
      isLevelComplete: false,
      isGameOver: false,
      isVictory: false
    };
    this.notifyChange();
  }

  updateCurrentRatio(ratio: number): void {
    this.state.currentRatio = ratio;
    this.calculateLevelProgress();
    this.checkLevelComplete();
    this.notifyChange();
  }

  private calculateLevelProgress(): void {
    if (this.state.targetRatio === 0) {
      this.state.levelProgress = 0;
      return;
    }

    const diff = Math.abs(this.state.currentRatio - this.state.targetRatio);
    const maxDiff = this.state.targetRatio * 2;
    const progress = Math.max(0, Math.min(1, 1 - diff / maxDiff));
    this.state.levelProgress = progress;
  }

  private checkLevelComplete(): void {
    if (this.state.currentRatio === 0) {
      this.state.isLevelComplete = false;
      return;
    }

    const tolerance = 0.05;
    const diff = Math.abs(this.state.currentRatio - this.state.targetRatio);
    this.state.isLevelComplete = diff <= tolerance * this.state.targetRatio;
  }

  incrementStep(): void {
    if (this.state.isGameOver || this.state.isVictory) return;

    this.state.stepsUsed++;
    if (this.state.stepsUsed >= this.state.maxSteps) {
      this.state.isGameOver = true;
    }
    this.notifyChange();
  }

  incrementError(): void {
    this.state.errorCount++;
    this.notifyChange();
  }

  advanceLevel(): boolean {
    if (!this.state.isLevelComplete) return false;
    if (this.state.currentLevel >= this.state.totalLevels) {
      this.state.isVictory = true;
      this.notifyChange();
      return true;
    }

    this.state.currentLevel++;
    const config = this.getCurrentLevelConfig();
    this.state.targetRatio = config.targetRatio;
    const parts = config.targetRatioStr.split(':');
    this.state.targetRatioNumerator = parseInt(parts[0].trim());
    this.state.targetRatioDenominator = parseInt(parts[1].trim());
    this.state.currentRatio = 0;
    this.state.levelProgress = 0;
    this.state.isLevelComplete = false;
    this.notifyChange();
    return true;
  }

  getTargetRatioString(): string {
    return this.getCurrentLevelConfig().targetRatioStr;
  }

  formatRatio(ratio: number): string {
    if (ratio === 0) return '0 : 1';
    const rounded = Math.round(ratio * 100) / 100;
    return `${rounded.toFixed(2)} : 1`;
  }

  private notifyChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }
}
