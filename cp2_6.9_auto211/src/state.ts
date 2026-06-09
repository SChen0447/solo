import { CircuitComponent } from './component';
import type { Maze } from './maze';

export interface GameStateData {
  placedComponents: CircuitComponent[];
  connectedCount: number;
  targetCount: number;
  hasClosedLoop: boolean;
  isBulbLit: boolean;
  bulbGlowRadius: number;
  bulbGlowTarget: number;
  bulbGlowPhase: 'expanding' | 'contracting' | 'idle';
  pulseOpacity: number;
}

export type StateChangeListener = (state: GameStateData) => void;

const CONNECTION_THRESHOLD = 30;

export class GameState {
  private state: GameStateData;
  private maze: Maze;
  private listeners: Set<StateChangeListener> = new Set();
  private displayCount: number = 0;
  private countAnimationTarget: number = 0;

  constructor(maze: Maze) {
    this.maze = maze;
    this.state = {
      placedComponents: [],
      connectedCount: 0,
      targetCount: 2,
      hasClosedLoop: false,
      isBulbLit: false,
      bulbGlowRadius: 0,
      bulbGlowTarget: 15,
      bulbGlowPhase: 'idle',
      pulseOpacity: 0,
    };
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState(): GameStateData {
    return { ...this.state };
  }

  getDisplayCount(): number {
    return this.displayCount;
  }

  addComponent(component: CircuitComponent): void {
    this.state.placedComponents.push(component);
    this.updateLoopStatus();
    this.notify();
  }

  removeComponent(component: CircuitComponent): void {
    const idx = this.state.placedComponents.indexOf(component);
    if (idx !== -1) {
      this.state.placedComponents.splice(idx, 1);
      this.updateLoopStatus();
      this.notify();
    }
  }

  getComponentAt(px: number, py: number): CircuitComponent | null {
    for (let i = this.state.placedComponents.length - 1; i >= 0; i--) {
      if (this.state.placedComponents[i].containsPoint(px, py)) {
        return this.state.placedComponents[i];
      }
    }
    return null;
  }

  reset(): void {
    this.state.placedComponents = [];
    this.state.hasClosedLoop = false;
    this.state.isBulbLit = false;
    this.state.bulbGlowRadius = 0;
    this.state.bulbGlowPhase = 'idle';
    this.state.pulseOpacity = 0;
    this.state.connectedCount = 0;
    this.countAnimationTarget = 0;
    this.displayCount = 0;
    this.notify();
  }

  private arePointsNear(p1: { x: number; y: number }, p2: { x: number; y: number }): boolean {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy <= CONNECTION_THRESHOLD * CONNECTION_THRESHOLD;
  }

  private checkClosedLoop(): { hasLoop: boolean; connectedComponents: CircuitComponent[] } {
    const components = this.state.placedComponents;
    const power = this.maze.getConfig().powerSource;
    const bulb = this.maze.getConfig().bulb;

    if (components.length < 2) {
      return { hasLoop: false, connectedComponents: [] };
    }

    interface Node {
      component?: CircuitComponent;
      isPower?: boolean;
      isBulb?: boolean;
      pos: { x: number; y: number };
    }

    const nodes: Node[] = [];
    nodes.push({ isPower: true, pos: { x: power.x, y: power.y } });
    nodes.push({ isBulb: true, pos: { x: bulb.x, y: bulb.y } });
    for (const c of components) {
      const pts = c.getConnectionPoints();
      for (const p of pts) {
        nodes.push({ component: c, pos: p });
      }
    }

    const adjacency: Map<number, number[]> = new Map();
    for (let i = 0; i < nodes.length; i++) {
      adjacency.set(i, []);
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].component === nodes[j].component && nodes[i].component) continue;
        if (this.arePointsNear(nodes[i].pos, nodes[j].pos)) {
          adjacency.get(i)!.push(j);
          adjacency.get(j)!.push(i);
        }
      }
    }

    const powerIdx = nodes.findIndex(n => n.isPower);
    const bulbIdx = nodes.findIndex(n => n.isBulb);

    if (powerIdx === -1 || bulbIdx === -1) {
      return { hasLoop: false, connectedComponents: [] };
    }

    const visited: Set<number> = new Set();
    const connectedSet: Set<CircuitComponent> = new Set();
    const queue: number[] = [powerIdx];
    visited.add(powerIdx);

    let reachedBulb = false;
    let hasResistor = false;
    let hasSwitch = false;
    let allSwitchesOn = true;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const node = nodes[curr];

      if (node.isBulb) reachedBulb = true;
      if (node.component) {
        connectedSet.add(node.component);
        if (node.component.type === 'resistor') hasResistor = true;
        if (node.component.type === 'switch') {
          hasSwitch = true;
          if (!node.component.isOn) allSwitchesOn = false;
        }
      }

      for (const neighbor of adjacency.get(curr) || []) {
        if (!visited.has(neighbor)) {
          const neighborNode = nodes[neighbor];
          if (neighborNode.component && neighborNode.component.type === 'switch' && !neighborNode.component.isOn) {
            continue;
          }
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    const hasLoop = reachedBulb && hasResistor && hasSwitch && allSwitchesOn;
    return { hasLoop, connectedComponents: Array.from(connectedSet) };
  }

  updateLoopStatus(): void {
    const { hasLoop, connectedComponents } = this.checkClosedLoop();
    const wasLit = this.state.isBulbLit;

    this.state.connectedCount = connectedComponents.length;
    this.countAnimationTarget = connectedComponents.length;

    this.state.hasClosedLoop = hasLoop;
    this.state.isBulbLit = hasLoop;

    if (hasLoop && !wasLit) {
      this.state.bulbGlowRadius = 0;
      this.state.bulbGlowPhase = 'expanding';
      this.state.bulbGlowTarget = 60;
      this.state.pulseOpacity = 0.3;
    } else if (!hasLoop) {
      this.state.bulbGlowPhase = 'idle';
      this.state.bulbGlowRadius = 0;
    }

    this.notify();
  }

  updateAnimations(deltaTime: number): void {
    if (this.displayCount < this.countAnimationTarget) {
      this.displayCount = Math.min(this.countAnimationTarget, this.displayCount + deltaTime * 8);
      if (this.displayCount >= this.countAnimationTarget) {
        this.displayCount = this.countAnimationTarget;
      }
    } else if (this.displayCount > this.countAnimationTarget) {
      this.displayCount = Math.max(this.countAnimationTarget, this.displayCount - deltaTime * 8);
    }

    for (const comp of this.state.placedComponents) {
      comp.updateAnimation(deltaTime);
    }

    if (this.state.isBulbLit) {
      if (this.state.bulbGlowPhase === 'expanding') {
        this.state.bulbGlowRadius += deltaTime * 120;
        if (this.state.bulbGlowRadius >= 60) {
          this.state.bulbGlowRadius = 60;
          this.state.bulbGlowPhase = 'contracting';
          this.state.bulbGlowTarget = 15;
        }
      } else if (this.state.bulbGlowPhase === 'contracting') {
        this.state.bulbGlowRadius -= deltaTime * 45;
        if (this.state.bulbGlowRadius <= 15) {
          this.state.bulbGlowRadius = 15;
          this.state.bulbGlowPhase = 'idle';
        }
      } else {
        this.state.bulbGlowRadius = 13 + Math.sin(Date.now() / 400) * 2;
      }
    }

    if (this.state.pulseOpacity > 0) {
      this.state.pulseOpacity = Math.max(0, this.state.pulseOpacity - deltaTime * 0.6);
    }
  }
}
