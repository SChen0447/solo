import { GameObject, ObjectState, MarkerVisual, WORLD_WIDTH, WORLD_HEIGHT } from './objects';

export interface TimelineEvent {
  id: string;
  time: number;
  type: 'record' | 'rewind' | 'ignite' | 'extinguish' | 'break' | 'door_open' | 'door_close' | 'signal' | 'marker' | 'energy';
  description: string;
  objectId?: string;
}

export interface GlobalSnapshot {
  time: number;
  states: Map<string, ObjectState>;
}

export class TimelineManager {
  private events: TimelineEvent[] = [];
  private snapshots: Map<number, Map<string, ObjectState>> = new Map();
  private rewindPoints: number[] = [];
  private markers: { time: number; objectId: string; snapshot: Map<string, ObjectState> }[] = [];
  private maxMarkers: number = 3;
  private eventIdCounter: number = 0;

  addEvent(event: Omit<TimelineEvent, 'id'>): void {
    this.events.push({
      ...event,
      id: `evt_${++this.eventIdCounter}`
    });
  }

  getEvents(): TimelineEvent[] {
    return [...this.events];
  }

  getEventsInRange(startTime: number, endTime: number): TimelineEvent[] {
    return this.events.filter(e => e.time >= startTime && e.time <= endTime);
  }

  recordSnapshot(time: number, objects: GameObject[]): void {
    const states = new Map<string, ObjectState>();
    for (const obj of objects) {
      states.set(obj.id, obj.getState());
    }
    this.snapshots.set(time, states);
  }

  getSnapshot(time: number): Map<string, ObjectState> | undefined {
    const keys = Array.from(this.snapshots.keys()).sort((a, b) => a - b);
    let closestKey = -1;
    for (const k of keys) {
      if (k <= time) {
        closestKey = k;
      } else {
        break;
      }
    }
    return closestKey >= 0 ? this.snapshots.get(closestKey) : undefined;
  }

  addRewindPoint(time: number): void {
    this.rewindPoints.push(time);
  }

  getRewindPoints(): number[] {
    return [...this.rewindPoints];
  }

  addMarker(time: number, objectId: string, objects: GameObject[]): MarkerVisual | null {
    if (this.markers.length >= this.maxMarkers) {
      return null;
    }

    const states = new Map<string, ObjectState>();
    for (const obj of objects) {
      states.set(obj.id, obj.getState());
    }

    this.markers.push({ time, objectId, snapshot: states });

    const targetObj = objects.find(o => o.id === objectId);
    if (targetObj) {
      const markerVis = new MarkerVisual(
        { x: targetObj.position.x, y: targetObj.position.y - 40 },
        time,
        objectId
      );
      return markerVis;
    }
    return null;
  }

  getMarkers(): { time: number; objectId: string; snapshot: Map<string, ObjectState> }[] {
    return [...this.markers];
  }

  getMarkerCount(): number {
    return this.markers.length;
  }

  getMaxMarkers(): number {
    return this.maxMarkers;
  }

  restoreToMarker(index: number, objects: GameObject[]): boolean {
    if (index < 0 || index >= this.markers.length) {
      return false;
    }

    const marker = this.markers[index];
    return this.restoreFromSnapshot(marker.snapshot, objects);
  }

  restoreObjectToRecordedState(objectId: string, recordedTime: number, objects: GameObject[]): boolean {
    const targetObj = objects.find(o => o.id === objectId);
    if (!targetObj) return false;

    const recordedState = targetObj.recordedStates.get(recordedTime);
    if (!recordedState) return false;

    targetObj.restoreToState(recordedState);

    this.applyChainReaction(targetObj, objects);

    return true;
  }

  private applyChainReaction(changedObj: GameObject, allObjects: GameObject[]): void {
    for (let i = 0; i < 5; i++) {
      let hasCollision = false;
      for (const obj of allObjects) {
        if (obj === changedObj || !obj.pushable) continue;
        if (obj.type === 'energy' || obj.type === 'marker' || obj.type === 'player') continue;

        const dx = obj.position.x - changedObj.position.x;
        const dy = obj.position.y - changedObj.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = changedObj.getBoundingRadius() + obj.getBoundingRadius();

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minDist - dist) / 2;

          obj.position.x += nx * overlap;
          obj.position.y += ny * overlap;
          obj.velocity.x += nx * 0.5;
          obj.velocity.y += ny * 0.5;
          hasCollision = true;

          if (obj.type === 'bottle' && !(obj as any).broken) {
            (obj as any).break();
          }
        }
      }
      if (!hasCollision) break;
    }
  }

  restoreFromSnapshot(snapshot: Map<string, ObjectState>, objects: GameObject[]): boolean {
    for (const obj of objects) {
      const state = snapshot.get(obj.id);
      if (state) {
        obj.restoreToState(state);
      }
    }
    return true;
  }

  sendSignalToPast(objectId: string, signalTime: number, objects: GameObject[]): boolean {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return false;

    const impulseStrength = 3;
    const angle = Math.random() * Math.PI * 2;
    obj.applyImpulse(Math.cos(angle) * impulseStrength, Math.sin(angle) * impulseStrength);

    return true;
  }

  renderReplayBar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
    maxDuration: number,
    hoveredX: number | null
  ): { eventAtHover: TimelineEvent | null } {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(15, 15, 26, 0.3)';
    ctx.fillRect(0, 0, width, height);

    const progress = Math.min(currentTime / maxDuration, 1);

    ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.fillRect(0, height / 2 - 3, width * progress, 6);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    const tickInterval = 10;
    for (let t = 0; t <= maxDuration; t += tickInterval) {
      const x = (t / maxDuration) * width;
      ctx.beginPath();
      ctx.moveTo(x, height / 2 - 8);
      ctx.lineTo(x, height / 2 + 8);
      ctx.stroke();
    }

    const smallTickInterval = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    for (let t = 0; t <= maxDuration; t += smallTickInterval) {
      if (t % tickInterval === 0) continue;
      const x = (t / maxDuration) * width;
      ctx.beginPath();
      ctx.moveTo(x, height / 2 - 4);
      ctx.lineTo(x, height / 2 + 4);
      ctx.stroke();
    }

    for (const rp of this.rewindPoints) {
      const x = (rp / maxDuration) * width;
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath();
      ctx.arc(x, height / 2, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const marker of this.markers) {
      const x = (marker.time / maxDuration) * width;
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.arc(x, height / 2, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const currentX = progress * width;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(currentX, height / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();

    let eventAtHover: TimelineEvent | null = null;
    if (hoveredX !== null) {
      const hoverTime = (hoveredX / width) * maxDuration;
      let minDist = Infinity;

      for (const evt of this.events) {
        const evtX = (evt.time / maxDuration) * width;
        const dist = Math.abs(hoveredX - evtX);
        if (dist < minDist && dist < 15) {
          minDist = dist;
          eventAtHover = evt;
        }
      }

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoveredX, 0);
      ctx.lineTo(hoveredX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      if (eventAtHover) {
        const evtX = (eventAtHover.time / maxDuration) * width;
        ctx.fillStyle = '#FFDD00';
        ctx.beginPath();
        ctx.arc(evtX, height / 2, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { eventAtHover };
  }

  getTimeFromX(x: number, width: number, maxDuration: number): number {
    return (x / width) * maxDuration;
  }

  clear(): void {
    this.events = [];
    this.snapshots.clear();
    this.rewindPoints = [];
    this.markers = [];
    this.eventIdCounter = 0;
  }
}

export { WORLD_WIDTH, WORLD_HEIGHT };
