export interface Fragment {
  id: string;
  objectIndex: number;
  timeIndex: number;
  content: string;
}

export class GameState {
  currentObjectIndex: number = -1;
  collectedFragments: Fragment[] = [];
  timelineSlots: number[] = new Array(24).fill(-1);
  isTransitioning: boolean = false;
  isGameComplete: boolean = false;

  addFragment(fragment: Fragment): void {
    if (!this.collectedFragments.find(f => f.id === fragment.id)) {
      this.collectedFragments.push(fragment);
    }
  }

  placeFragmentOnTimeline(fragmentId: string, slotIndex: number): boolean {
    const fragment = this.collectedFragments.find(f => f.id === fragmentId);
    if (!fragment) return false;
    const isCorrect = fragment.timeIndex === slotIndex;
    if (isCorrect) {
      this.timelineSlots[slotIndex] = this.collectedFragments.indexOf(fragment);
    }
    return isCorrect;
  }

  removeFragmentFromTimeline(slotIndex: number): void {
    this.timelineSlots[slotIndex] = -1;
  }

  isTimelineCorrect(): boolean {
    const requiredFragments = 4;
    let placedCorrect = 0;
    for (let i = 0; i < this.timelineSlots.length; i++) {
      if (this.timelineSlots[i] !== -1) {
        const fragIdx = this.timelineSlots[i];
        const fragment = this.collectedFragments[fragIdx];
        if (fragment && fragment.timeIndex === i) {
          placedCorrect++;
        }
      }
    }
    return placedCorrect >= requiredFragments;
  }

  isFragmentPlaced(fragmentId: string): boolean {
    const fragIdx = this.collectedFragments.findIndex(f => f.id === fragmentId);
    if (fragIdx === -1) return false;
    return this.timelineSlots.includes(fragIdx);
  }

  reset(): void {
    this.currentObjectIndex = -1;
    this.collectedFragments = [];
    this.timelineSlots = new Array(24).fill(-1);
    this.isTransitioning = false;
    this.isGameComplete = false;
  }
}
