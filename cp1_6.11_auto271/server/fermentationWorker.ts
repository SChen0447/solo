import {
  FermentationEngine,
  TeaVariety,
  FermentationParams,
  TeaState,
  AromaMolecule
} from '../src/FermentationEngine';

export interface WorkerTask {
  id: string;
  variety: TeaVariety;
  params: FermentationParams;
  totalDays: number;
  speedMultiplier: number;
  status: 'pending' | 'running' | 'paused' | 'completed';
  currentDay: number;
  startTime: number;
  endTime?: number;
  history: TeaState[];
  currentState: TeaState;
  report?: TastingReport;
}

export interface TastingReport {
  batchId: string;
  batchName: string;
  varietyName: string;
  generatedAt: number;
  soupColor: { r: number; g: number; b: number; hex: string };
  teaColor: { r: number; g: number; b: number; hex: string };
  aromaMolecules: AromaMolecule[];
  tasteScores: Record<string, number>;
  aromaTimeline: Array<{ day: number; molecules: AromaMolecule[] }>;
  overallScore: number;
  notes: string;
}

type TaskCallback = (task: WorkerTask) => void;
type TaskCompleteCallback = (task: WorkerTask, report: TastingReport) => void;

export class FermentationWorkerPool {
  private tasks: Map<string, WorkerTask> = new Map();
  private maxConcurrency: number = 5;
  private updateInterval: NodeJS.Timeout | null = null;
  private updateListeners: Map<string, TaskCallback> = new Map();
  private completeListeners: Map<string, TaskCompleteCallback> = new Map();

  constructor(maxConcurrency: number = 5) {
    this.maxConcurrency = maxConcurrency;
    this.startSimulationLoop();
  }

  private startSimulationLoop(): void {
    this.updateInterval = setInterval(() => {
      this.updateRunningTasks();
    }, 100);
  }

  private updateRunningTasks(): void {
    const now = Date.now();

    for (const task of this.tasks.values()) {
      if (task.status !== 'running') continue;

      const elapsedMs = now - task.startTime;
      const simulatedDays = (elapsedMs / 1000) * task.speedMultiplier;
      const newDay = Math.min(task.totalDays, simulatedDays);

      if (Math.abs(newDay - task.currentDay) > 0.05) {
        task.currentDay = newDay;

        const engine = new FermentationEngine(task.variety, task.params);
        task.currentState = engine.getStateAtDay(newDay);

        if (task.history.length === 0 || newDay - task.history[task.history.length - 1].day >= 0.5) {
          task.history.push(task.currentState);
          if (task.history.length > 200) {
            task.history = task.history.filter((_, i) => i % 2 === 0);
          }
        }

        const updateCallback = this.updateListeners.get(task.id);
        if (updateCallback) {
          updateCallback(task);
        }

        if (newDay >= task.totalDays) {
          task.status = 'completed';
          task.endTime = now;
          task.report = this.generateReport(task);

          const completeCallback = this.completeListeners.get(task.id);
          if (completeCallback) {
            completeCallback(task, task.report);
          }
        }
      }
    }
  }

  createTask(
    taskId: string,
    variety: TeaVariety,
    params: FermentationParams,
    speedMultiplier: number = 1
  ): WorkerTask {
    const engine = new FermentationEngine(variety, params);
    const config = engine.getConfig();
    const initialState = engine.getStateAtDay(0);

    const task: WorkerTask = {
      id: taskId,
      variety,
      params: { ...params },
      totalDays: config.fermentationDays,
      speedMultiplier,
      status: 'pending',
      currentDay: 0,
      startTime: 0,
      history: [initialState],
      currentState: initialState
    };

    this.tasks.set(taskId, task);
    return task;
  }

  startTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (task.status === 'running') return true;

    if (this.getRunningCount() >= this.maxConcurrency) {
      return false;
    }

    if (task.status === 'pending') {
      task.startTime = Date.now();
    } else if (task.status === 'paused') {
      const pausedDuration = Date.now() - (task.endTime || Date.now());
      task.startTime = Date.now() - (task.currentDay / task.speedMultiplier) * 1000;
    }

    task.status = 'running';
    task.endTime = undefined;
    return true;
  }

  pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') return false;

    task.status = 'paused';
    task.endTime = Date.now();
    return true;
  }

  resetTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const engine = new FermentationEngine(task.variety, task.params);
    task.status = 'pending';
    task.currentDay = 0;
    task.startTime = 0;
    task.endTime = undefined;
    task.currentState = engine.getStateAtDay(0);
    task.history = [task.currentState];
    task.report = undefined;

    return true;
  }

  removeTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  getTask(taskId: string): WorkerTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): WorkerTask[] {
    return Array.from(this.tasks.values());
  }

  getRunningCount(): number {
    return Array.from(this.tasks.values()).filter(t => t.status === 'running').length;
  }

  onUpdate(taskId: string, callback: TaskCallback): void {
    this.updateListeners.set(taskId, callback);
  }

  onComplete(taskId: string, callback: TaskCompleteCallback): void {
    this.completeListeners.set(taskId, callback);
  }

  removeListeners(taskId: string): void {
    this.updateListeners.delete(taskId);
    this.completeListeners.delete(taskId);
  }

  private generateReport(task: WorkerTask): TastingReport {
    const engine = new FermentationEngine(task.variety, task.params);
    const finalState = engine.getStateAtDay(task.totalDays);
    const tasteScores = engine.getTasteScores(task.totalDays);
    const aromaTimeline = engine.getAromaTimeline(task.totalDays);
    const efficiency = engine.getEfficiencyFactor();

    const overallScore = Math.round(
      (tasteScores.sweetness +
        tasteScores.thickness +
        tasteScores.aroma +
        tasteScores.aftertaste -
        tasteScores.bitterness * 0.5 -
        tasteScores.astringency * 0.3) *
        efficiency *
        10
    ) / 10;

    const notes = this.generateNotes(task, tasteScores, efficiency);

    return {
      batchId: task.id,
      batchName: task.id,
      varietyName: engine.getConfig().name,
      generatedAt: Date.now(),
      soupColor: {
        r: finalState.teaSoupColor.r,
        g: finalState.teaSoupColor.g,
        b: finalState.teaSoupColor.b,
        hex: finalState.teaSoupColorHex
      },
      teaColor: {
        r: finalState.color.r,
        g: finalState.color.g,
        b: finalState.color.b,
        hex: finalState.colorHex
      },
      aromaMolecules: finalState.aromaMolecules,
      tasteScores,
      aromaTimeline,
      overallScore,
      notes
    };
  }

  private generateNotes(
    task: WorkerTask,
    tasteScores: Record<string, number>,
    efficiency: number
  ): string {
    const notes: string[] = [];

    if (efficiency >= 0.9) {
      notes.push('发酵条件极佳，茶叶充分转化。');
    } else if (efficiency >= 0.7) {
      notes.push('发酵条件良好，转化程度适中。');
    } else {
      notes.push('发酵条件偏离最优，建议调整温湿度参数。');
    }

    if (tasteScores.aroma >= 8) {
      notes.push('香气高扬持久，层次丰富。');
    } else if (tasteScores.aroma >= 6) {
      notes.push('香气清雅，有一定表现力。');
    }

    if (tasteScores.aftertaste >= 8) {
      notes.push('回甘显著，余韵悠长。');
    }

    if (tasteScores.thickness >= 8) {
      notes.push('茶汤厚重饱满，质感上乘。');
    }

    return notes.join(' ');
  }

  updateSpeed(taskId: string, speedMultiplier: number): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'running') {
      task.startTime = Date.now() - (task.currentDay / speedMultiplier) * 1000;
    }
    task.speedMultiplier = speedMultiplier;
    return true;
  }

  updateParams(taskId: string, params: Partial<FermentationParams>): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'running') return false;

    task.params = { ...task.params, ...params };
    const engine = new FermentationEngine(task.variety, task.params);
    task.totalDays = engine.getTotalDays();
    task.currentState = engine.getStateAtDay(task.currentDay);
    return true;
  }

  shutdown(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.tasks.clear();
    this.updateListeners.clear();
    this.completeListeners.clear();
  }

  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }
}

export const workerPool = new FermentationWorkerPool(5);
