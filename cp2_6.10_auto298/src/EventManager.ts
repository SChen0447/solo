import {
  GameEvent,
  EventType,
  RuneElement,
  ELEMENT_NAMES,
} from './types';
import { Grid } from './Grid';
import { SynthesisEngine } from './SynthesisEngine';
import { DragSystem } from './DragSystem';

const EVENT_INTERVAL = 10000;
const RAMPAGE_DURATION = 5000;
const DORMANT_DURATION = 5000;
const ENERGY_RAIN_DURATION = 3000;

export class EventManager {
  private grid: Grid;
  private synthesisEngine: SynthesisEngine;
  private dragSystem: DragSystem;
  private currentEvent: GameEvent | null = null;
  private timeSinceLastEvent: number = 0;
  public edgeFlash: { active: boolean; color: string; alpha: number } = {
    active: false,
    color: '#ffffff',
    alpha: 0,
  };
  public eventText: { active: boolean; text: string; alpha: number; y: number } = {
    active: false,
    text: '',
    alpha: 0,
    y: 0,
  };
  public rampageChargedPositions: { x: number; y: number }[] = [];
  public onEventTriggered?: (event: GameEvent) => void;

  constructor(grid: Grid, synthesisEngine: SynthesisEngine, dragSystem: DragSystem) {
    this.grid = grid;
    this.synthesisEngine = synthesisEngine;
    this.dragSystem = dragSystem;
  }

  getCurrentEvent(): GameEvent | null {
    return this.currentEvent;
  }

  isEnergyRainActive(): boolean {
    return this.currentEvent?.type === 'energyRain';
  }

  applyModifier(energyCost: number): number {
    if (this.currentEvent?.type === 'energyRain') {
      return 0;
    }
    return energyCost;
  }

  update(deltaTime: number, currentTime: number): void {
    this.timeSinceLastEvent += deltaTime;

    if (!this.currentEvent && this.timeSinceLastEvent >= EVENT_INTERVAL) {
      this.triggerRandomEvent(currentTime);
      this.timeSinceLastEvent = 0;
    }

    if (this.currentEvent) {
      const elapsed = currentTime - this.currentEvent.startTime;
      if (elapsed >= this.currentEvent.duration) {
        this.endEvent();
      } else {
        this.updateEventEffect(elapsed);
      }
    }

    if (this.edgeFlash.active) {
      this.edgeFlash.alpha -= deltaTime / 1500;
      if (this.edgeFlash.alpha <= 0) {
        this.edgeFlash.active = false;
        this.edgeFlash.alpha = 0;
      }
    }

    if (this.eventText.active) {
      this.eventText.alpha -= deltaTime / 2500;
      this.eventText.y -= deltaTime * 0.02;
      if (this.eventText.alpha <= 0) {
        this.eventText.active = false;
        this.eventText.alpha = 0;
      }
    }
  }

  private triggerRandomEvent(currentTime: number): void {
    const roll = Math.random();
    const elements: RuneElement[] = ['fire', 'water', 'thunder', 'earth'];
    const randomElement = elements[Math.floor(Math.random() * elements.length)];

    let event: GameEvent;
    let flashColor: string;
    let eventText: string;

    if (roll < 1 / 3) {
      event = {
        type: 'rampage',
        element: randomElement,
        startTime: currentTime,
        duration: RAMPAGE_DURATION,
      };
      flashColor = '#ff6b35';
      eventText = `${ELEMENT_NAMES[randomElement]}之力暴走！`;
    } else if (roll < 2 / 3) {
      event = {
        type: 'dormant',
        element: randomElement,
        startTime: currentTime,
        duration: DORMANT_DURATION,
      };
      flashColor = '#888888';
      eventText = `${ELEMENT_NAMES[randomElement]}之力休眠...`;
    } else {
      event = {
        type: 'energyRain',
        startTime: currentTime,
        duration: ENERGY_RAIN_DURATION,
      };
      flashColor = '#4caf50';
      eventText = '能量雨降临！';
    }

    this.currentEvent = event;
    this.edgeFlash = { active: true, color: flashColor, alpha: 1 };
    this.eventText = { active: true, text: eventText, alpha: 1, y: 60 };
    this.applyEventStartEffects();

    if (this.onEventTriggered) {
      this.onEventTriggered(event);
    }
  }

  private applyEventStartEffects(): void {
    if (!this.currentEvent) return;

    if (this.currentEvent.type === 'rampage' && this.currentEvent.element) {
      const runes = this.grid.getPlacedRunes();
      for (const rune of runes) {
        if (rune.element === this.currentEvent.element) {
          rune.chargeCount++;
          const neighbors = this.grid.getNeighbors(rune.gridX, rune.gridY, 1);
          for (const n of neighbors) {
            if (n.element === this.currentEvent.element) {
              n.chargeCount++;
            }
          }
        }
      }
      this.synthesisEngine.addEnergy(5);
    } else if (this.currentEvent.type === 'dormant' && this.currentEvent.element) {
      const runes = this.grid.getPlacedRunes();
      for (const rune of runes) {
        if (rune.element === this.currentEvent.element) {
          rune.isDormant = true;
        }
      }
      this.dragSystem.setDormantElement(this.currentEvent.element, true);
    }
  }

  private updateEventEffect(elapsed: number): void {
    if (!this.currentEvent) return;

    if (this.currentEvent.type === 'rampage' && this.currentEvent.element) {
      const runes = this.grid.getPlacedRunes();
      this.rampageChargedPositions = [];
      for (const rune of runes) {
        if (rune.element === this.currentEvent.element && rune.chargeCount >= 2) {
          this.rampageChargedPositions.push({ x: rune.gridX, y: rune.gridY });
        }
      }
    }
  }

  private endEvent(): void {
    if (!this.currentEvent) return;

    if (this.currentEvent.type === 'rampage' && this.currentEvent.element) {
      const runes = this.grid.getPlacedRunes();
      const charged: { x: number; y: number }[] = [];
      for (const rune of runes) {
        if (rune.element === this.currentEvent.element && rune.chargeCount >= 2) {
          charged.push({ x: rune.gridX, y: rune.gridY });
        }
      }
      if (charged.length >= 3) {
        this.synthesisEngine.checkFailCondition(charged);
      }
      for (const rune of runes) {
        if (rune.element === this.currentEvent.element) {
          rune.chargeCount = 0;
        }
      }
      this.rampageChargedPositions = [];
    } else if (this.currentEvent.type === 'dormant' && this.currentEvent.element) {
      const runes = this.grid.getPlacedRunes();
      for (const rune of runes) {
        if (rune.element === this.currentEvent.element) {
          rune.isDormant = false;
        }
      }
      this.dragSystem.setDormantElement(this.currentEvent.element, false);
    }

    this.currentEvent = null;
  }

  forceTriggerEvent(type: EventType, element?: RuneElement, currentTime: number = 0): void {
    this.currentEvent = {
      type,
      element,
      startTime: currentTime,
      duration: type === 'energyRain' ? ENERGY_RAIN_DURATION : RAMPAGE_DURATION,
    };
    const flashColor = type === 'rampage' ? '#ff6b35' : type === 'dormant' ? '#888888' : '#4caf50';
    const text =
      type === 'rampage'
        ? `${ELEMENT_NAMES[element || 'fire']}之力暴走！`
        : type === 'dormant'
        ? `${ELEMENT_NAMES[element || 'fire']}之力休眠...`
        : '能量雨降临！';
    this.edgeFlash = { active: true, color: flashColor, alpha: 1 };
    this.eventText = { active: true, text, alpha: 1, y: 60 };
    this.applyEventStartEffects();
  }
}
