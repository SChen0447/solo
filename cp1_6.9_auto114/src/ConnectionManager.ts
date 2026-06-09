import type { Connection, TrailPoint, RuneFragment, PatternDef } from './types';
import { RuneManager } from './RuneManager';
import { PatternLibrary } from './PatternLibrary';
import type p5 from 'p5';

const TRAIL_DURATION = 2000;
const FADE_DURATION = 0.3;

export class ConnectionManager {
  private p: p5;
  private runeManager: RuneManager;
  private patternLibrary: PatternLibrary;
  private connections: Connection[] = [];
  private trail: TrailPoint[] = [];
  private isDrawing: boolean = false;
  private startRune: RuneFragment | null = null;
  private currentTrailColor: string = '#ffffff';
  private completedPatterns: Set<string> = new Set();
  private onPatternComplete: ((pattern: PatternDef) => void) | null = null;
  private onFirstDraw: (() => void) | null = null;
  private hasDrawn: boolean = false;

  constructor(
    p: p5,
    runeManager: RuneManager,
    patternLibrary: PatternLibrary
  ) {
    this.p = p;
    this.runeManager = runeManager;
    this.patternLibrary = patternLibrary;
  }

  setCallbacks(
    onPatternComplete: (pattern: PatternDef) => void,
    onFirstDraw: () => void
  ): void {
    this.onPatternComplete = onPatternComplete;
    this.onFirstDraw = onFirstDraw;
  }

  getCompletedPatterns(): Set<string> {
    return this.completedPatterns;
  }

  getConnections(): Connection[] {
    return this.connections;
  }

  startDrawing(x: number, y: number): void {
    const rune = this.runeManager.getRuneAt(x, y);
    if (rune) {
      this.isDrawing = true;
      this.startRune = rune;
      this.currentTrailColor = this.runeManager.getComplementaryColor(rune);
      this.trail.push({
        x,
        y,
        alpha: 1,
        color: this.currentTrailColor,
        timestamp: Date.now(),
      });

      if (!this.hasDrawn && this.onFirstDraw) {
        this.hasDrawn = true;
        this.onFirstDraw();
      }
    }
  }

  continueDrawing(x: number, y: number): void {
    if (!this.isDrawing) return;
    this.trail.push({
      x,
      y,
      alpha: 1,
      color: this.currentTrailColor,
      timestamp: Date.now(),
    });
  }

  endDrawing(x: number, y: number): void {
    if (!this.isDrawing) return;

    const endRune = this.runeManager.getRuneAt(x, y);
    if (this.startRune && endRune && endRune.id !== this.startRune.id) {
      this.addConnection(this.startRune, endRune);
      this.checkPatternMatch();
    }

    this.isDrawing = false;
    this.startRune = null;
  }

  private addConnection(from: RuneFragment, to: RuneFragment): void {
    const exists = this.connections.some(
      c =>
        (c.fromId === from.id && c.toId === to.id) ||
        (c.fromId === to.id && c.toId === from.id)
    );
    if (exists) return;

    from.isConnected = true;
    to.isConnected = true;

    this.connections.push({
      fromId: from.id,
      toId: to.id,
      color: this.runeManager.mixColors(from.color, to.color),
      alpha: 0,
      fadeProgress: 0,
    });
  }

  private checkPatternMatch(): void {
    const connectedIds = this.getConnectedComponentIds();
    if (connectedIds.length < 3) return;

    const allRunes = this.runeManager.getAllRunes();
    const pattern = this.patternLibrary.matchPattern(allRunes, connectedIds);

    if (pattern && !this.completedPatterns.has(pattern.id)) {
      this.completedPatterns.add(pattern.id);

      const connectedRunes = allRunes.filter(r => connectedIds.includes(r.id));
      const cx = connectedRunes.reduce((s, r) => s + r.x, 0) / connectedRunes.length;
      const cy = connectedRunes.reduce((s, r) => s + r.y, 0) / connectedRunes.length;

      this.runeManager.triggerUnlock(connectedIds, cx, cy);

      if (this.onPatternComplete) {
        this.onPatternComplete(pattern);
      }
    }
  }

  private getConnectedComponentIds(): number[] {
    if (this.connections.length === 0) return [];

    const idSet = new Set<number>();
    const queue: number[] = [this.connections[0].fromId];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      idSet.add(id);

      for (const conn of this.connections) {
        if (conn.fromId === id && !visited.has(conn.toId)) {
          queue.push(conn.toId);
        }
        if (conn.toId === id && !visited.has(conn.fromId)) {
          queue.push(conn.fromId);
        }
      }
    }

    return Array.from(idSet);
  }

  update(dt: number, now: number): void {
    for (const conn of this.connections) {
      if (conn.fadeProgress < 1) {
        conn.fadeProgress = Math.min(1, conn.fadeProgress + dt / FADE_DURATION);
        conn.alpha = conn.fadeProgress;
      }
    }

    this.trail = this.trail.filter(pt => {
      const age = now - pt.timestamp;
      pt.alpha = Math.max(0, 1 - age / TRAIL_DURATION);
      return age < TRAIL_DURATION;
    });
  }

  reset(): void {
    this.connections = [];
    this.trail = [];
    this.isDrawing = false;
    this.startRune = null;
    this.hasDrawn = false;
    this.completedPatterns.clear();
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  draw(): void {
    const p = this.p;

    for (const conn of this.connections) {
      const runes = this.runeManager.getAllRunes();
      const from = runes.find(r => r.id === conn.fromId);
      const to = runes.find(r => r.id === conn.toId);
      if (!from || !to || from.hasDisappeared || to.hasDisappeared) continue;

      p.drawingContext.shadowColor = conn.color;
      p.drawingContext.shadowBlur = 10;
      p.stroke(p.color(conn.color, Math.floor(conn.alpha * 255)));
      p.strokeWeight(3);
      p.line(from.x, from.y, to.x, to.y);
      p.drawingContext.shadowBlur = 0;
    }

    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const pt1 = this.trail[i - 1];
        const pt2 = this.trail[i];
        p.stroke(p.color(pt2.color, Math.floor(pt2.alpha * 255)));
        p.strokeWeight(2);
        p.line(pt1.x, pt1.y, pt2.x, pt2.y);
      }
    }
  }
}
