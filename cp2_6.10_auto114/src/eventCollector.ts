import { throttle } from 'lodash';
import { generateId, getElementPath } from './utils';

export type EventType = 'click' | 'mousemove' | 'scroll';

export interface CollectedEvent {
  id: string;
  type: EventType;
  timestamp: number;
  x: number;
  y: number;
  selector: string;
  scrollTop?: number;
  scrollLeft?: number;
}

export interface EventCollectorConfig {
  targetElement: HTMLElement;
  enabledEvents?: EventType[];
  maxQueueSize?: number;
}

export class EventCollector {
  private targetElement: HTMLElement;
  private eventQueue: CollectedEvent[] = [];
  private enabledEvents: Set<EventType>;
  private maxQueueSize: number;
  private boundHandlers: Map<EventType, EventListener> = new Map();
  private scrollContainer: HTMLElement | null = null;

  constructor(config: EventCollectorConfig) {
    this.targetElement = config.targetElement;
    this.enabledEvents = new Set(config.enabledEvents || []);
    this.maxQueueSize = config.maxQueueSize || 5000;
    this.findScrollContainer();
    this.bindAllListeners();
  }

  private findScrollContainer(): void {
    this.scrollContainer = this.targetElement.querySelector('.scroll-list');
  }

  private handleClick = (e: Event): void => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    const rect = this.targetElement.getBoundingClientRect();
    this.pushEvent({
      id: generateId(),
      type: 'click',
      timestamp: Date.now(),
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top,
      selector: getElementPath(target),
      scrollTop: this.scrollContainer?.scrollTop ?? 0,
      scrollLeft: this.scrollContainer?.scrollLeft ?? 0
    });
  };

  private handleMouseMove = throttle((e: Event): void => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    const rect = this.targetElement.getBoundingClientRect();
    this.pushEvent({
      id: generateId(),
      type: 'mousemove',
      timestamp: Date.now(),
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top,
      selector: getElementPath(target),
      scrollTop: this.scrollContainer?.scrollTop ?? 0,
      scrollLeft: this.scrollContainer?.scrollLeft ?? 0
    });
  }, 16);

  private handleScroll = throttle((): void => {
    if (!this.scrollContainer) return;
    const rect = this.targetElement.getBoundingClientRect();
    this.pushEvent({
      id: generateId(),
      type: 'scroll',
      timestamp: Date.now(),
      x: rect.width / 2,
      y: rect.height / 2,
      selector: getElementPath(this.scrollContainer),
      scrollTop: this.scrollContainer.scrollTop,
      scrollLeft: this.scrollContainer.scrollLeft
    });
  }, 50);

  private bindAllListeners(): void {
    this.bindListener('click', this.handleClick);
    this.bindListener('mousemove', this.handleMouseMove);
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.handleScroll, { passive: true });
    }
  }

  private bindListener(type: EventType, handler: EventListener): void {
    this.boundHandlers.set(type, handler);
    if (this.enabledEvents.has(type)) {
      this.targetElement.addEventListener(type, handler, { passive: true });
    }
  }

  private unbindListener(type: EventType): void {
    const handler = this.boundHandlers.get(type);
    if (handler) {
      this.targetElement.removeEventListener(type, handler);
    }
  }

  private pushEvent(event: CollectedEvent): void {
    this.eventQueue.push(event);
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.shift();
    }
  }

  public enableEvent(type: EventType): void {
    if (!this.enabledEvents.has(type)) {
      this.enabledEvents.add(type);
      const handler = this.boundHandlers.get(type);
      if (handler) {
        this.targetElement.addEventListener(type, handler, { passive: true });
      }
      if (type === 'scroll' && this.scrollContainer) {
        this.scrollContainer.addEventListener('scroll', this.handleScroll, { passive: true });
      }
    }
  }

  public disableEvent(type: EventType): void {
    if (this.enabledEvents.has(type)) {
      this.enabledEvents.delete(type);
      this.unbindListener(type);
      if (type === 'scroll' && this.scrollContainer) {
        this.scrollContainer.removeEventListener('scroll', this.handleScroll);
      }
    }
  }

  public isEventEnabled(type: EventType): boolean {
    return this.enabledEvents.has(type);
  }

  public getEvents(): CollectedEvent[] {
    return [...this.eventQueue];
  }

  public getRecentEvents(count: number): CollectedEvent[] {
    return this.eventQueue.slice(-count);
  }

  public getEventCount(): number {
    return this.eventQueue.length;
  }

  public clearEvents(): void {
    this.eventQueue = [];
  }

  public destroy(): void {
    this.enabledEvents.forEach((type) => this.disableEvent(type));
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.handleScroll);
    }
    this.boundHandlers.clear();
  }
}
