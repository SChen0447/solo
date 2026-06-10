import {
  Sequencer,
  NOTES,
  NOTE_ORDER,
  DURATION_LABELS,
  TOTAL_BEATS_COUNT,
  type NoteName,
  type Duration,
  type TrackElement,
} from './sequencer';
import type { ParticleSystem } from './particles';

interface DragData {
  type: 'note' | 'rhythm';
  noteName?: NoteName;
  duration?: Duration;
}

export class UI {
  private sequencer: Sequencer;
  private particles: ParticleSystem;
  private currentDuration: Duration = 'quarter';

  private trackEl!: HTMLElement;
  private playheadEl!: HTMLElement;
  private notePaletteEl!: HTMLElement;
  private rhythmPaletteEl!: HTMLElement;
  private bpmSlider!: HTMLInputElement;
  private bpmValueEl!: HTMLElement;
  private volumeSlider!: HTMLInputElement;
  private volumeValueEl!: HTMLElement;
  private densitySlider!: HTMLInputElement;
  private densityValueEl!: HTMLElement;
  private waveformSelect!: HTMLSelectElement;
  private playBtn!: HTMLButtonElement;
  private saveBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;

  private beatSlots: HTMLElement[] = [];
  private dragData: DragData | null = null;

  constructor(sequencer: Sequencer, particles: ParticleSystem) {
    this.sequencer = sequencer;
    this.particles = particles;
  }

  init(): void {
    this.cacheElements();
    this.buildBeatSlots();
    this.buildNotePalette();
    this.buildRhythmPalette();
    this.bindEvents();
    this.syncState();
    this.renderTrack();
  }

  private cacheElements(): void {
    this.trackEl = document.getElementById('track') as HTMLElement;
    this.playheadEl = document.getElementById('playhead') as HTMLElement;
    this.notePaletteEl = document.getElementById('note-palette') as HTMLElement;
    this.rhythmPaletteEl = document.getElementById('rhythm-palette') as HTMLElement;
    this.bpmSlider = document.getElementById('bpm-slider') as HTMLInputElement;
    this.bpmValueEl = document.getElementById('bpm-value') as HTMLElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.volumeValueEl = document.getElementById('volume-value') as HTMLElement;
    this.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.densityValueEl = document.getElementById('density-value') as HTMLElement;
    this.waveformSelect = document.getElementById('waveform-select') as HTMLSelectElement;
    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  }

  private buildBeatSlots(): void {
    for (let i = 0; i < TOTAL_BEATS_COUNT; i++) {
      const slot = document.createElement('div');
      slot.className = 'beat-slot';
      slot.dataset.beat = String(i);
      this.trackEl.appendChild(slot);
      this.beatSlots.push(slot);
    }
  }

  private buildNotePalette(): void {
    for (const name of NOTE_ORDER) {
      const note = NOTES[name];
      const block = document.createElement('div');
      block.className = 'note-block';
      block.draggable = true;
      block.textContent = name;
      block.style.background = `hsl(${note.colorHue}, 70%, 50%)`;
      block.dataset.note = name;
      this.notePaletteEl.appendChild(block);
    }
  }

  private buildRhythmPalette(): void {
    const durations: Duration[] = ['quarter', 'eighth', 'dotted'];
    for (const dur of durations) {
      const block = document.createElement('div');
      block.className = 'rhythm-block';
      block.draggable = true;
      block.textContent = DURATION_LABELS[dur];
      block.dataset.duration = dur;
      if (dur === this.currentDuration) {
        block.style.borderColor = '#fbbf24';
        block.style.background = 'rgba(251, 191, 36, 0.15)';
      }
      this.rhythmPaletteEl.appendChild(block);
    }
  }

  private bindEvents(): void {
    this.notePaletteEl.addEventListener('dragstart', this.onPaletteDragStart.bind(this));
    this.notePaletteEl.addEventListener('dragend', this.onPaletteDragEnd.bind(this));
    this.rhythmPaletteEl.addEventListener('dragstart', this.onPaletteDragStart.bind(this));
    this.rhythmPaletteEl.addEventListener('dragend', this.onPaletteDragEnd.bind(this));

    for (const slot of this.beatSlots) {
      slot.addEventListener('dragover', this.onBeatDragOver.bind(this));
      slot.addEventListener('dragleave', this.onBeatDragLeave.bind(this));
      slot.addEventListener('drop', this.onBeatDrop.bind(this));
    }

    this.trackEl.addEventListener('click', this.onTrackClick.bind(this));

    this.bpmSlider.addEventListener('input', this.onBPMInput.bind(this));
    this.volumeSlider.addEventListener('input', this.onVolumeInput.bind(this));
    this.densitySlider.addEventListener('input', this.onDensityInput.bind(this));
    this.waveformSelect.addEventListener('change', this.onWaveformChange.bind(this));

    this.playBtn.addEventListener('click', this.onPlayClick.bind(this));
    this.saveBtn.addEventListener('click', this.onSaveClick.bind(this));
    this.clearBtn.addEventListener('click', this.onClearClick.bind(this));

    this.sequencer.onChange(this.syncState.bind(this));
  }

  private onPaletteDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement;
    if (!target.draggable) return;

    target.classList.add('dragging');

    if (target.dataset.note) {
      this.dragData = { type: 'note', noteName: target.dataset.note as NoteName };
    } else if (target.dataset.duration) {
      this.dragData = { type: 'rhythm', duration: target.dataset.duration as Duration };
    }

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', JSON.stringify(this.dragData));
    }
  }

  private onPaletteDragEnd(e: DragEvent): void {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
    this.dragData = null;
    for (const slot of this.beatSlots) {
      slot.classList.remove('drag-over');
    }
  }

  private onBeatDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!this.dragData || this.dragData.type !== 'note') return;
    const slot = e.currentTarget as HTMLElement;
    slot.classList.add('drag-over');
  }

  private onBeatDragLeave(e: DragEvent): void {
    const slot = e.currentTarget as HTMLElement;
    slot.classList.remove('drag-over');
  }

  private onBeatDrop(e: DragEvent): void {
    e.preventDefault();
    const slot = e.currentTarget as HTMLElement;
    slot.classList.remove('drag-over');

    let data: DragData | null = this.dragData;
    if (!data && e.dataTransfer) {
      try {
        data = JSON.parse(e.dataTransfer.getData('text/plain')) as DragData;
      } catch {
        data = null;
      }
    }

    if (!data) return;

    if (data.type === 'note' && data.noteName) {
      const beat = parseInt(slot.dataset.beat || '0', 10);
      this.sequencer.addElement(beat, NOTES[data.noteName], this.currentDuration);
      this.renderTrack();
    } else if (data.type === 'rhythm' && data.duration) {
      this.currentDuration = data.duration;
      this.updateRhythmSelection();
    }
  }

  private updateRhythmSelection(): void {
    const blocks = this.rhythmPaletteEl.querySelectorAll('.rhythm-block');
    blocks.forEach((el) => {
      const block = el as HTMLElement;
      if (block.dataset.duration === this.currentDuration) {
        block.style.borderColor = '#fbbf24';
        block.style.background = 'rgba(251, 191, 36, 0.15)';
      } else {
        block.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        block.style.background = 'rgba(255, 255, 255, 0.06)';
      }
    });
  }

  private onTrackClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const elementEl = target.closest('.track-element') as HTMLElement | null;
    if (!elementEl) return;
    const id = elementEl.dataset.id;
    if (!id) return;
    this.sequencer.removeElement(id);
    this.renderTrack();
  }

  private onBPMInput(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    this.sequencer.setBPM(value);
    this.bpmValueEl.textContent = String(value);
  }

  private onVolumeInput(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    this.sequencer.setVolume(value / 100);
    this.volumeValueEl.textContent = `${value}%`;
  }

  private onDensityInput(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    this.particles.setDensity(value);
    this.densityValueEl.textContent = String(value);
  }

  private onWaveformChange(e: Event): void {
    const value = (e.target as HTMLSelectElement).value as any;
    this.sequencer.setWaveform(value);
  }

  private onPlayClick(): void {
    this.sequencer.togglePlay();
  }

  private onSaveClick(): void {
    this.sequencer.downloadConfig();
  }

  private onClearClick(): void {
    if (!confirm('确定要清空所有轨道配置吗？')) return;
    this.sequencer.clear();
    this.particles.clear();
    this.renderTrack();
  }

  private syncState(): void {
    this.bpmSlider.value = String(this.sequencer.getBPM());
    this.bpmValueEl.textContent = String(this.sequencer.getBPM());

    const volPercent = Math.round(this.sequencer.getVolume() * 100);
    this.volumeSlider.value = String(volPercent);
    this.volumeValueEl.textContent = `${volPercent}%`;

    this.densitySlider.value = String(this.particles.getDensity());
    this.densityValueEl.textContent = String(this.particles.getDensity());

    this.waveformSelect.value = this.sequencer.getWaveform();

    if (this.sequencer.isPlayingState()) {
      this.playBtn.textContent = '⏸ 暂停';
    } else {
      this.playBtn.textContent = '▶ 播放';
    }

    const progress = this.sequencer.getPlaybackProgress();
    const beatWidth = 100 / TOTAL_BEATS_COUNT;
    this.playheadEl.style.left = `calc(${progress * 100}% + ${beatWidth / 2}% - 1.5px)`;
  }

  renderTrack(): void {
    const existing = this.trackEl.querySelectorAll('.track-element');
    existing.forEach((el) => el.remove());

    const elements = this.sequencer.getElements();
    const stackedMap = new Map<number, number>();

    const sortedElements = [...elements].sort((a, b) => {
      if (a.beat !== b.beat) return a.beat - b.beat;
      return 0;
    });

    for (const el of sortedElements) {
      const stackIdx = stackedMap.get(el.beat) || 0;
      stackedMap.set(el.beat, stackIdx + 1);
      this.createElementNode(el, stackIdx);
    }
  }

  private createElementNode(element: TrackElement, stackIdx: number): void {
    const el = document.createElement('div');
    el.className = 'track-element';
    el.dataset.id = element.id;
    el.textContent = element.note.name;
    el.style.background = `hsl(${element.note.colorHue}, 70%, 50%)`;
    el.style.left = `calc(${(100 / TOTAL_BEATS_COUNT) * element.beat}%)`;
    el.style.top = `${52 - stackIdx * 42}px`;

    const hint = document.createElement('span');
    hint.className = 'remove-hint';
    hint.textContent = '点击移除';
    el.appendChild(hint);

    this.trackEl.appendChild(el);
  }
}
