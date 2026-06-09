import type { GameState, Fragment } from './gameState';

export class TimelineRenderer {
  private container: HTMLElement;
  private gameState: GameState;
  private slots: HTMLElement[] = [];

  constructor(container: HTMLElement, gameState: GameState) {
    this.container = container;
    this.gameState = gameState;
    this.render();
  }

  render(): void {
    this.container.innerHTML = '';
    this.slots = [];

    for (let i = 0; i < 24; i++) {
      const slot = document.createElement('div');
      slot.className = 'timeline-slot';
      slot.dataset.slotIndex = String(i);

      const hourLabel = document.createElement('div');
      hourLabel.className = 'hour-label';
      hourLabel.textContent = `${String(i).padStart(2, '0')}:00`;
      slot.appendChild(hourLabel);

      const content = document.createElement('div');
      content.className = 'slot-content';
      slot.appendChild(content);

      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
        slot.classList.add('drag-over');
      });

      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });

      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        if (!e.dataTransfer) return;

        const fragmentId = e.dataTransfer.getData('fragmentId');
        const objectIndexStr = e.dataTransfer.getData('objectIndex');
        const timeIndexStr = e.dataTransfer.getData('timeIndex');
        const fragmentContent = e.dataTransfer.getData('content');
        if (!fragmentId) return;
        const objectIndex = parseInt(objectIndexStr, 10);
        const timeIndex = parseInt(timeIndexStr, 10);

        const existingIdx = this.gameState.collectedFragments.findIndex(f => f.id === fragmentId);
        if (!existingIdx) {
          const fragment: Fragment = {
            id: fragmentId,
            objectIndex,
            timeIndex,
            content: fragmentContent
          };
          this.gameState.addFragment(fragment);
        }

        const isCorrect = this.gameState.placeFragmentOnTimeline(fragmentId, i);
        this.updateSlot(slot, i, isCorrect);
        this.refreshFragmentChip(fragmentId);
        this.emitSound(isCorrect);
        if (this.gameState.isTimelineCorrect()) {
          this.container.dispatchEvent(new CustomEvent('timelineComplete', { bubbles: true }));
        }
      });

      slot.addEventListener('click', () => {
        if (this.gameState.timelineSlots[i] !== -1) {
          const fragIdx = this.gameState.timelineSlots[i];
          const fragment = this.gameState.collectedFragments[fragIdx];
          this.gameState.removeFragmentFromTimeline(i);
          slot.classList.remove('correct', 'incorrect');
          const content = slot.querySelector('.slot-content') as HTMLElement;
          if (content) content.textContent = '';
          const check = slot.querySelector('.check-icon');
          if (check) check.remove();
          if (fragment) {
            const chip = document.querySelector(`.fragment-chip[data-fragment-id="${fragment.id}`) as HTMLElement;
            if (chip) chip.classList.remove('used');
          }
        }
      });

      this.container.appendChild(slot);
      this.slots.push(slot);
    }
  }

  refresh(): void {
    for (let i = 0; i < 24; i++) {
      const slot = this.slots[i];
      const fragIdx = this.gameState.timelineSlots[i];
      if (fragIdx !== -1) {
        const fragment = this.gameState.collectedFragments[fragIdx];
        if (fragment && fragment.timeIndex === i) {
          this.updateSlot(slot, i, true);
        }
      }
    }
  }

  private updateSlot(slot: HTMLElement, index: number, correct: boolean): void {
    const content = slot.querySelector('.slot-content') as HTMLElement;
    const fragIdx = this.gameState.timelineSlots[index];
    const fragment = fragIdx !== -1 ? this.gameState.collectedFragments[fragIdx] : null;
    if (correct && fragment) {
      slot.classList.add('correct');
      if (content) {
        const hours = String(Math.floor(fragment.timeIndex)).padStart(2, '0');
        content.textContent = `${hours}:00`;
      }
      let check = slot.querySelector('.check-icon');
      if (!check) {
        check = document.createElement('span');
        check.className = 'check-icon';
        check.textContent = '✓';
        slot.appendChild(check);
      }
    } else if (!correct) {
      slot.classList.add('incorrect');
      setTimeout(() => { slot.classList.remove('incorrect'); }, 400);
    }
  }

  private refreshFragmentChip(fragmentId: string): void {
    const chips = document.querySelectorAll('.fragment-chip');
    chips.forEach(chip => {
      if ((chip as HTMLElement).dataset.fragmentId === fragmentId) {
        if (this.gameState.isFragmentPlaced(fragmentId)) {
          (chip as HTMLElement).classList.add('used');
        }
      }
    });
  }

  private emitSound(correct: boolean): void {
    const audio = document.getElementById('sound-effect') as HTMLAudioElement | null;
    if (!audio) return;
    if (correct) {
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAA';
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  }
}
