import { Room } from './dungeonGenerator';

export interface RuneFragment {
  id: number;
  roomId: number;
  tileX: number;
  tileY: number;
  collected: boolean;
  color: string;
}

export type RuneSystemState = 'collecting' | 'ready' | 'merging' | 'portalOpen';

export class RuneSystem {
  private fragments: RuneFragment[] = [];
  private state: RuneSystemState = 'collecting';
  private mergeProgress: number = 0;
  private readonly MERGE_DURATION: number = 2000;
  private portalActivationTime: number = 0;
  private readonly PORTAL_TRANSITION_DURATION: number = 1500;

  constructor() {}

  initialize(rooms: Room[], runeRoomIds: number[]): void {
    this.fragments = [];
    this.state = 'collecting';
    this.mergeProgress = 0;
    this.portalActivationTime = 0;

    const colors = ['#4fc3f7', '#81d4fa', '#29b6f6'];
    runeRoomIds.forEach((roomId, idx) => {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        const offsets = [
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
        ];
        const offset = offsets[idx % offsets.length];
        this.fragments.push({
          id: idx,
          roomId,
          tileX: room.centerX + offset.dx,
          tileY: room.centerY + offset.dy,
          collected: false,
          color: colors[idx % colors.length],
        });
      }
    });
  }

  getFragments(): RuneFragment[] {
    return this.fragments;
  }

  getCollectedCount(): number {
    return this.fragments.filter(f => f.collected).length;
  }

  getTotalCount(): number {
    return this.fragments.length;
  }

  getState(): RuneSystemState {
    return this.state;
  }

  tryCollect(tileX: number, tileY: number): RuneFragment | null {
    if (this.state !== 'collecting') return null;
    for (const fragment of this.fragments) {
      if (!fragment.collected && fragment.tileX === tileX && fragment.tileY === tileY) {
        fragment.collected = true;
        if (this.getCollectedCount() >= this.getTotalCount()) {
          this.state = 'ready';
        }
        return fragment;
      }
    }
    return null;
  }

  startMerge(): boolean {
    if (this.state !== 'ready') return false;
    this.state = 'merging';
    this.mergeProgress = 0;
    return true;
  }

  update(deltaTime: number): void {
    if (this.state === 'merging') {
      this.mergeProgress += deltaTime;
      if (this.mergeProgress >= this.MERGE_DURATION) {
        this.state = 'portalOpen';
        this.portalActivationTime = 0;
      }
    } else if (this.state === 'portalOpen') {
      this.portalActivationTime += deltaTime;
    }
  }

  getMergeProgress(): number {
    return Math.min(1, this.mergeProgress / this.MERGE_DURATION);
  }

  getPortalTransitionProgress(): number {
    return Math.min(1, this.portalActivationTime / this.PORTAL_TRANSITION_DURATION);
  }

  isPortalActive(): boolean {
    return this.state === 'portalOpen';
  }

  reset(): void {
    this.fragments = [];
    this.state = 'collecting';
    this.mergeProgress = 0;
    this.portalActivationTime = 0;
  }
}
