import { v4 as uuidv4 } from 'uuid';
import {
  FermentationEngine,
  TeaVariety,
  FermentationParams,
  TeaState,
  AromaMolecule,
  TeaVarietyConfig
} from './FermentationEngine';

export type BatchStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TeaBatch {
  id: string;
  name: string;
  variety: TeaVariety;
  params: FermentationParams;
  status: BatchStatus;
  currentDay: number;
  totalDays: number;
  startTime: number | null;
  endTime: number | null;
  speedMultiplier: number;
  currentState: TeaState;
  history: TeaState[];
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

interface BatchStoreEvents {
  batchCreated: TeaBatch;
  batchUpdated: TeaBatch;
  batchDeleted: string;
  batchCompleted: TeaBatch;
}

type EventListener<T> = (data: T) => void;

export class TeaBatchStore {
  private batches: Map<string, TeaBatch> = new Map();
  private listeners: Map<keyof BatchStoreEvents, Set<EventListener<any>>> = new Map();
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;
  private maxBatches: number = 5;

  constructor() {
    this.setupSimulationLoop();
  }

  private setupSimulationLoop(): void {
    if (typeof window !== 'undefined') {
      const loop = (timestamp: number) => {
        if (timestamp - this.lastUpdateTime >= 33) {
          this.updateBatches(timestamp);
          this.lastUpdateTime = timestamp;
        }
        this.animationFrameId = requestAnimationFrame(loop);
      };
      this.animationFrameId = requestAnimationFrame(loop);
    }
  }

  private updateBatches(timestamp: number): void {
    let hasUpdates = false;
    for (const batch of this.batches.values()) {
      if (batch.status === 'running' && batch.startTime) {
        const elapsedMs = timestamp - batch.startTime;
        const simulatedDays = (elapsedMs / 1000) * batch.speedMultiplier;
        const newDay = Math.min(batch.totalDays, simulatedDays);

        if (newDay !== batch.currentDay) {
          batch.currentDay = newDay;
          const engine = this.getEngine(batch);
          batch.currentState = engine.getStateAtDay(newDay);
          if (batch.history.length === 0 || newDay - batch.history[batch.history.length - 1].day >= 0.5) {
            batch.history.push(batch.currentState);
            if (batch.history.length > 200) {
              batch.history = batch.history.filter((_, i) => i % 2 === 0);
            }
          }
          hasUpdates = true;

          if (newDay >= batch.totalDays && batch.status === 'running') {
            batch.status = 'completed';
            batch.endTime = timestamp;
            batch.report = this.generateReport(batch);
            this.emit('batchCompleted', batch);
          }

          this.emit('batchUpdated', batch);
        }
      }
    }
  }

  private getEngine(batch: TeaBatch): FermentationEngine {
    return new FermentationEngine(batch.variety, batch.params);
  }

  createBatch(
    variety: TeaVariety,
    params: FermentationParams,
    name?: string,
    speedMultiplier: number = 1
  ): TeaBatch | null {
    if (this.batches.size >= this.maxBatches) {
      return null;
    }

    const engine = new FermentationEngine(variety, params);
    const config = engine.getConfig();
    const initialState = engine.getStateAtDay(0);

    const batch: TeaBatch = {
      id: uuidv4(),
      name: name || `${config.name} - 批次${this.batches.size + 1}`,
      variety,
      params: { ...params },
      status: 'idle',
      currentDay: 0,
      totalDays: config.fermentationDays,
      startTime: null,
      endTime: null,
      speedMultiplier,
      currentState: initialState,
      history: [initialState]
    };

    this.batches.set(batch.id, batch);
    this.emit('batchCreated', batch);
    return batch;
  }

  startBatch(batchId: string): boolean {
    const batch = this.batches.get(batchId);
    if (!batch || batch.status === 'running') return false;

    batch.status = 'running';
    if (batch.startTime === null) {
      batch.startTime = performance.now();
    } else {
      const pausedDuration = performance.now() - (batch.endTime || performance.now());
      batch.startTime = performance.now() - (batch.currentDay / batch.speedMultiplier) * 1000;
    }
    batch.endTime = null;

    this.emit('batchUpdated', batch);
    return true;
  }

  pauseBatch(batchId: string): boolean {
    const batch = this.batches.get(batchId);
    if (!batch || batch.status !== 'running') return false;

    batch.status = 'paused';
    batch.endTime = performance.now();
    this.emit('batchUpdated', batch);
    return true;
  }

  resetBatch(batchId: string): boolean {
    const batch = this.batches.get(batchId);
    if (!batch) return false;

    const engine = this.getEngine(batch);
    batch.status = 'idle';
    batch.currentDay = 0;
    batch.startTime = null;
    batch.endTime = null;
    batch.currentState = engine.getStateAtDay(0);
    batch.history = [batch.currentState];
    batch.report = undefined;

    this.emit('batchUpdated', batch);
    return true;
  }

  deleteBatch(batchId: string): boolean {
    if (!this.batches.has(batchId)) return false;
    this.batches.delete(batchId);
    this.emit('batchDeleted', batchId);
    return true;
  }

  updateBatchParams(batchId: string, params: Partial<FermentationParams>): boolean {
    const batch = this.batches.get(batchId);
    if (!batch || batch.status === 'running') return false;

    batch.params = { ...batch.params, ...params };
    const engine = this.getEngine(batch);
    batch.totalDays = engine.getTotalDays();
    batch.currentState = engine.getStateAtDay(batch.currentDay);

    this.emit('batchUpdated', batch);
    return true;
  }

  updateBatchSpeed(batchId: string, speedMultiplier: number): boolean {
    const batch = this.batches.get(batchId);
    if (!batch) return false;

    batch.speedMultiplier = speedMultiplier;
    if (batch.status === 'running' && batch.startTime) {
      batch.startTime = performance.now() - (batch.currentDay / speedMultiplier) * 1000;
    }

    this.emit('batchUpdated', batch);
    return true;
  }

  getBatch(batchId: string): TeaBatch | undefined {
    return this.batches.get(batchId);
  }

  getAllBatches(): TeaBatch[] {
    return Array.from(this.batches.values());
  }

  getCompletedBatches(): TeaBatch[] {
    return this.getAllBatches().filter(b => b.status === 'completed');
  }

  generateReport(batch: TeaBatch): TastingReport {
    const engine = this.getEngine(batch);
    const finalState = engine.getStateAtDay(batch.totalDays);
    const tasteScores = engine.getTasteScores(batch.totalDays);
    const aromaTimeline = engine.getAromaTimeline(batch.totalDays);
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

    const notes = this.generateNotes(batch, tasteScores, efficiency);

    return {
      batchId: batch.id,
      batchName: batch.name,
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
    batch: TeaBatch,
    tasteScores: Record<string, number>,
    efficiency: number
  ): string {
    const notes: string[] = [];
    const config = new FermentationEngine(batch.variety, batch.params).getConfig();

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

  compareBatches(batchIds: string[]): Array<{
    batchId: string;
    batchName: string;
    tasteScores: Record<string, number>;
    overallScore: number;
    soupColor: string;
  }> {
    return batchIds
      .map(id => this.batches.get(id))
      .filter((batch): batch is TeaBatch => batch !== undefined && batch.report !== undefined)
      .map(batch => ({
        batchId: batch.id,
        batchName: batch.name,
        tasteScores: batch.report!.tasteScores,
        overallScore: batch.report!.overallScore,
        soupColor: batch.report!.soupColor.hex
      }));
  }

  on<K extends keyof BatchStoreEvents>(
    event: K,
    listener: EventListener<BatchStoreEvents[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)!.delete(listener);
  }

  private emit<K extends keyof BatchStoreEvents>(event: K, data: BatchStoreEvents[K]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  getMaxBatches(): number {
    return this.maxBatches;
  }

  destroy(): void {
    if (this.animationFrameId !== null && typeof window !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.batches.clear();
    this.listeners.clear();
  }
}

export const batchStore = new TeaBatchStore();
