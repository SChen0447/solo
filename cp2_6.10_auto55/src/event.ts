import type { ResourceType } from './resource';

export interface GameEvent {
  id: string;
  title: string;
  message: string;
  affectedResource: ResourceType | null;
  penaltyAmount: number;
  doubleConsumption: boolean;
  durationMs: number;
}

export interface EventTriggeredPayload {
  event: GameEvent;
}

export interface EventEndedPayload {
  event: GameEvent;
}

const EVENT_TEMPLATES: Omit<GameEvent, 'id'>[] = [
  {
    title: '能量泄露！',
    message: '能量系统检测到泄露，能量 -20！',
    affectedResource: 'energy',
    penaltyAmount: 20,
    doubleConsumption: false,
    durationMs: 0,
  },
  {
    title: '陨石撞击！',
    message: '船体遭受陨石撞击，合金 -15！',
    affectedResource: 'alloy',
    penaltyAmount: 15,
    doubleConsumption: false,
    durationMs: 0,
  },
  {
    title: '系统过热！',
    message: '生命维持系统过热，食物消耗翻倍持续10秒！',
    affectedResource: 'food',
    penaltyAmount: 0,
    doubleConsumption: true,
    durationMs: 10000,
  },
  {
    title: '电力故障！',
    message: '主电力系统故障，能量消耗翻倍持续8秒！',
    affectedResource: 'energy',
    penaltyAmount: 0,
    doubleConsumption: true,
    durationMs: 8000,
  },
  {
    title: '结构应力！',
    message: '船体结构承受异常应力，合金消耗翻倍持续8秒！',
    affectedResource: 'alloy',
    penaltyAmount: 0,
    doubleConsumption: true,
    durationMs: 8000,
  },
  {
    title: '微陨石雨！',
    message: '微陨石雨撞击船体，合金 -10，合金消耗翻倍持续5秒！',
    affectedResource: 'alloy',
    penaltyAmount: 10,
    doubleConsumption: true,
    durationMs: 5000,
  },
];

const EVENT_INTERVAL_MS = 30000;

interface ActiveEventEntry {
  event: GameEvent;
  timeoutId: number;
}

let eventIdCounter = 0;

export class EventSystem {
  private eventTimerId: number | null = null;
  private activeEvents: Map<string, ActiveEventEntry> = new Map();
  private isRunning: boolean = false;

  private onEventTriggered: ((payload: EventTriggeredPayload) => void) | null = null;
  private onEventEnded: ((payload: EventEndedPayload) => void) | null = null;

  setCallbacks(
    callbacks: {
      onEventTriggered?: (payload: EventTriggeredPayload) => void;
      onEventEnded?: (payload: EventEndedPayload) => void;
    }
  ): void {
    this.onEventTriggered = callbacks.onEventTriggered ?? null;
    this.onEventEnded = callbacks.onEventEnded ?? null;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextEvent();
  }

  stop(): void {
    this.isRunning = false;
    if (this.eventTimerId !== null) {
      window.clearTimeout(this.eventTimerId);
      this.eventTimerId = null;
    }
    this.clearAllActiveEvents();
  }

  reset(): void {
    this.stop();
    eventIdCounter = 0;
  }

  getActiveEvents(): GameEvent[] {
    return Array.from(this.activeEvents.values()).map((entry) => entry.event);
  }

  private scheduleNextEvent(): void {
    if (!this.isRunning) return;

    this.eventTimerId = window.setTimeout(() => {
      this.triggerRandomEvent();
      this.scheduleNextEvent();
    }, EVENT_INTERVAL_MS);
  }

  private triggerRandomEvent(): void {
    if (!this.isRunning) return;

    const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    const event: GameEvent = {
      ...template,
      id: `event_${++eventIdCounter}`,
    };

    if (this.onEventTriggered) {
      this.onEventTriggered({ event });
    }

    if (event.durationMs > 0) {
      const timeoutId = window.setTimeout(() => {
        this.endEvent(event);
      }, event.durationMs);
      this.activeEvents.set(event.id, timeoutId);
    }
  }

  private endEvent(event: GameEvent): void {
    this.activeEvents.delete(event.id);

    if (this.onEventEnded) {
      this.onEventEnded({ event });
    }
  }

  private clearAllActiveEvents(): void {
    for (const timeoutId of this.activeEvents.values()) {
      window.clearTimeout(timeoutId);
    }
    this.activeEvents.clear();
  }

  private findEventById(id: string): GameEvent | null {
    const template = EVENT_TEMPLATES.find((t) => {
      const testEvent: GameEvent = { ...t, id };
      return testEvent.id === id;
    });
    if (!template) return null;
    return { ...template, id };
  }
}
