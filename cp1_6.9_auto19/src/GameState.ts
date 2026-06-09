export type GamePhase = 'idle' | 'playing' | 'finished';
export type Grade = 'S' | 'A' | 'B' | 'C';
export type ModuleShape = 'cube' | 'sphere' | 'octahedron';

export interface ModuleData {
  id: number;
  shape: ModuleShape;
  color: number;
  colorName: string;
  installed: boolean;
}

export interface InstallRecord {
  moduleId: number;
  timeSpent: number;
  collisions: number;
  score: number;
}

export class GameState {
  private static _instance: GameState | null = null;

  public phase: GamePhase = 'idle';
  public totalScore: number = 0;
  public collisionCount: number = 0;
  public installRecords: InstallRecord[] = [];
  public startTime: number = 0;
  public totalElapsed: number = 0;
  public currentModuleStartTime: number = 0;
  public currentModuleCollisions: number = 0;
  public disturbanceActive: boolean = false;
  public disturbanceStartTime: number = 0;
  public lastDisturbanceTime: number = 0;
  public currentTargetIndex: number = 0;

  public modules: ModuleData[] = [];
  public onStateChange: (() => void) | null = null;

  private constructor() {
    this.initModules();
  }

  public static getInstance(): GameState {
    if (!GameState._instance) {
      GameState._instance = new GameState();
    }
    return GameState._instance;
  }

  private initModules(): void {
    const presets: Array<{ shape: ModuleShape; color: number; colorName: string }> = [
      { shape: 'cube', color: 0xff5566, colorName: '红色立方体' },
      { shape: 'sphere', color: 0x55ff88, colorName: '绿色球体' },
      { shape: 'octahedron', color: 0x5588ff, colorName: '蓝色八面体' },
      { shape: 'cube', color: 0xffcc33, colorName: '黄色立方体' },
      { shape: 'sphere', color: 0xcc66ff, colorName: '紫色球体' },
    ];

    this.modules = presets.map((p, i) => ({
      id: i,
      shape: p.shape,
      color: p.color,
      colorName: p.colorName,
      installed: false,
    }));
  }

  public startGame(): void {
    this.phase = 'playing';
    this.totalScore = 0;
    this.collisionCount = 0;
    this.installRecords = [];
    this.startTime = performance.now();
    this.totalElapsed = 0;
    this.currentTargetIndex = 0;
    this.currentModuleCollisions = 0;
    this.currentModuleStartTime = this.startTime;
    this.disturbanceActive = false;
    this.lastDisturbanceTime = this.startTime;
    this.initModules();
    this.emitChange();
  }

  public recordCollision(): void {
    this.collisionCount++;
    this.currentModuleCollisions++;
    this.emitChange();
  }

  public completeInstall(moduleId: number): void {
    const module = this.modules.find(m => m.id === moduleId);
    if (!module || module.installed) return;

    module.installed = true;
    const now = performance.now();
    const timeSpent = (now - this.currentModuleStartTime) / 1000;
    const score = this.calculateScore(timeSpent, this.currentModuleCollisions);

    this.installRecords.push({
      moduleId,
      timeSpent,
      collisions: this.currentModuleCollisions,
      score,
    });
    this.totalScore += score;
    this.currentTargetIndex++;
    this.currentModuleStartTime = now;
    this.currentModuleCollisions = 0;

    if (this.currentTargetIndex >= this.modules.length) {
      this.finishGame();
    }
    this.emitChange();
  }

  private calculateScore(timeSpent: number, collisions: number): number {
    const timeScore = Math.max(0, 1000 - (timeSpent - 30) * 20);
    const collisionPenalty = collisions * 50;
    return Math.max(0, Math.round(timeScore - collisionPenalty));
  }

  public getGrade(): Grade {
    if (this.totalScore >= 4000) return 'S';
    if (this.totalScore >= 3000) return 'A';
    if (this.totalScore >= 2000) return 'B';
    return 'C';
  }

  public finishGame(): void {
    this.phase = 'finished';
    this.totalElapsed = (performance.now() - this.startTime) / 1000;
    this.emitChange();
  }

  public checkDisturbance(currentTime: number): boolean {
    if (this.phase !== 'playing') return false;

    const elapsedSinceLast = (currentTime - this.lastDisturbanceTime) / 1000;

    if (!this.disturbanceActive && elapsedSinceLast >= 60) {
      this.disturbanceActive = true;
      this.disturbanceStartTime = currentTime;
      return true;
    }

    if (this.disturbanceActive) {
      const disturbanceElapsed = (currentTime - this.disturbanceStartTime) / 1000;
      if (disturbanceElapsed >= 5) {
        this.disturbanceActive = false;
        this.lastDisturbanceTime = currentTime;
      }
    }
    return false;
  }

  public getCurrentTarget(): ModuleData | null {
    if (this.currentTargetIndex >= this.modules.length) return null;
    return this.modules[this.currentTargetIndex];
  }

  public getInstalledCount(): number {
    return this.modules.filter(m => m.installed).length;
  }

  public formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private emitChange(): void {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  public reset(): void {
    GameState._instance = null;
  }
}
