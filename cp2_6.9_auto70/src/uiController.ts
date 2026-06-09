import type { AudioEngine, FilterParams, InstrumentType, Note } from './audioEngine';
import { SpectrumRenderer } from './spectrumRenderer';

const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  piano: '钢琴',
  guitar: '吉他',
  electone: '电子琴'
};

export class UIController {
  private audio: AudioEngine;
  private renderer: SpectrumRenderer;
  private melody: Note[];
  private melodyNotesEl: HTMLElement;
  private startBtn: HTMLButtonElement;
  private progressFill: HTMLElement;
  private timeIndicator: HTMLElement;
  private fpsVal: HTMLElement;
  private compareSection: HTMLElement;
  private freqAxis: HTMLElement;
  private instrumentButtons: Map<InstrumentType, HTMLButtonElement> = new Map();
  private sliders: {
    lowPass: HTMLInputElement;
    highPass: HTMLInputElement;
    reverb: HTMLInputElement;
  };
  private sliderLabels: {
    lpVal: HTMLElement;
    hpVal: HTMLElement;
    rvVal: HTMLElement;
  };
  private isPlaying: boolean = false;
  private animationId: number | null = null;
  private activeNoteIndex: number = -1;

  constructor(
    audio: AudioEngine,
    renderer: SpectrumRenderer,
    melody: Note[]
  ) {
    this.audio = audio;
    this.renderer = renderer;
    this.melody = melody;

    this.melodyNotesEl = document.getElementById('melodyNotes') as HTMLElement;
    this.startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    this.progressFill = document.getElementById('progressFill') as HTMLElement;
    this.timeIndicator = document.getElementById('timeIndicator') as HTMLElement;
    this.fpsVal = document.getElementById('fpsVal') as HTMLElement;
    this.compareSection = document.getElementById('compareSection') as HTMLElement;
    this.freqAxis = document.getElementById('freqAxis') as HTMLElement;

    this.instrumentButtons.set('piano', document.getElementById('btnPiano') as HTMLButtonElement);
    this.instrumentButtons.set('guitar', document.getElementById('btnGuitar') as HTMLButtonElement);
    this.instrumentButtons.set('electone', document.getElementById('btnElectone') as HTMLButtonElement);

    this.sliders = {
      lowPass: document.getElementById('lowPassSlider') as HTMLInputElement,
      highPass: document.getElementById('highPassSlider') as HTMLInputElement,
      reverb: document.getElementById('reverbSlider') as HTMLInputElement
    };

    this.sliderLabels = {
      lpVal: document.getElementById('lpVal') as HTMLElement,
      hpVal: document.getElementById('hpVal') as HTMLElement,
      rvVal: document.getElementById('rvVal') as HTMLElement
    };

    this.renderMelodyNotes();
    this.renderFreqAxis();
    this.bindEvents();
  }

  private renderMelodyNotes(): void {
    this.melodyNotesEl.innerHTML = '';
    this.melody.forEach((note, idx) => {
      const chip = document.createElement('span');
      chip.className = 'note-chip';
      chip.textContent = note.name;
      chip.dataset.idx = String(idx);
      this.melodyNotesEl.appendChild(chip);
    });
  }

  private renderFreqAxis(): void {
    const freqs = [4000, 2000, 1000, 500, 250, 125, 100];
    this.freqAxis.innerHTML = '';
    freqs.forEach(f => {
      const label = document.createElement('div');
      label.className = 'freq-label';
      label.textContent = `${f}Hz`;
      this.freqAxis.appendChild(label);
    });
  }

  private bindEvents(): void {
    this.startBtn.addEventListener('click', () => this.onStartClick());

    this.instrumentButtons.forEach((btn, type) => {
      btn.addEventListener('click', () => {
        this.highlightInstrument(type);
        if (!this.isPlaying) {
          this.audio.setActiveInstrument(type);
        }
      });
    });

    this.sliders.lowPass.addEventListener('input', () => {
      const val = parseFloat(this.sliders.lowPass.value);
      this.sliderLabels.lpVal.textContent = `${val} Hz`;
      this.audio.setFilterParams({ lowPassFreq: val });
    });

    this.sliders.highPass.addEventListener('input', () => {
      const val = parseFloat(this.sliders.highPass.value);
      this.sliderLabels.hpVal.textContent = `${val} Hz`;
      this.audio.setFilterParams({ highPassFreq: val });
    });

    this.sliders.reverb.addEventListener('input', () => {
      const val = parseFloat(this.sliders.reverb.value);
      this.sliderLabels.rvVal.textContent = val.toFixed(2);
      this.audio.setFilterParams({ reverbSize: val });
    });

    window.addEventListener('resize', () => {
      this.renderer.resize();
    });

    this.renderer.setFpsCallback((fps) => {
      this.fpsVal.textContent = `${fps} fps`;
    });
  }

  private highlightInstrument(type: InstrumentType): void {
    this.instrumentButtons.forEach((btn, t) => {
      btn.classList.toggle('active', t === type);
    });
  }

  private highlightActiveNote(noteIdx: number): void {
    const chips = this.melodyNotesEl.querySelectorAll('.note-chip');
    chips.forEach((chip, i) => {
      chip.classList.toggle('active', i === noteIdx);
    });
    this.activeNoteIndex = noteIdx;
  }

  private clearNoteHighlight(): void {
    const chips = this.melodyNotesEl.querySelectorAll('.note-chip');
    chips.forEach(chip => chip.classList.remove('active'));
    this.activeNoteIndex = -1;
  }

  private async onStartClick(): Promise<void> {
    if (this.isPlaying) return;
    await this.audio.resume();
    this.startPlayback();
  }

  private getMelodyTotalDuration(): number {
    return this.melody.reduce((sum, n) => sum + n.duration, 0);
  }

  private startPlayback(): void {
    this.isPlaying = true;
    this.startBtn.disabled = true;
    this.startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>&nbsp; 演奏中...';
    this.progressFill.style.width = '0%';
    this.renderer.clearHistory();

    const melodyDuration = this.getMelodyTotalDuration();
    const singleInstDuration = melodyDuration + 0.5;
    const intervalBetween = 1.0;
    const totalDuration = singleInstDuration * 3 + intervalBetween * 2;

    const instruments: InstrumentType[] = ['piano', 'guitar', 'electone'];
    let instrumentStartTime = 0;

    const startInstrument = (idx: number) => {
      if (idx >= instruments.length) {
        this.finishPlayback();
        return;
      }

      const instrument = instruments[idx];
      this.highlightInstrument(instrument);
      this.audio.setActiveInstrument(instrument);
      this.renderer.startRecording(instrument);

      const startT = this.audio.getCurrentTime() + 0.05;
      instrumentStartTime = startT;
      let noteOffset = 0;
      this.melody.forEach((note) => {
        const noteStart = startT + noteOffset;
        this.audio.playNoteFor(instrument, note, noteStart);
        noteOffset += note.duration;
      });

      const instElapsed = () => this.audio.getCurrentTime() - startT;
      const animate = () => {
        if (!this.isPlaying) return;
        const elapsed = instElapsed();
        const floatData = this.audio.getFloatFrequencyData();
        const renderElapsed = this.renderer.update(floatData);

        const totalElapsed = idx * (singleInstDuration + intervalBetween) + Math.min(elapsed, singleInstDuration);
        const progress = Math.min(1, totalElapsed / totalDuration);
        this.progressFill.style.width = `${(progress * 100).toFixed(1)}%`;

        let noteIdx = -1;
        let cumTime = 0;
        for (let i = 0; i < this.melody.length; i++) {
          cumTime += this.melody[i].duration;
          if (elapsed < cumTime) {
            noteIdx = i;
            break;
          }
        }
        if (noteIdx !== this.activeNoteIndex && noteIdx >= 0) {
          this.highlightActiveNote(noteIdx);
        }
        this.timeIndicator.textContent = `${Math.min(renderElapsed, melodyDuration).toFixed(1)}s`;

        if (elapsed < singleInstDuration) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          this.renderer.stopRecording();
          this.clearNoteHighlight();
          setTimeout(() => startInstrument(idx + 1), intervalBetween * 1000);
        }
      };

      this.animationId = requestAnimationFrame(animate);
    };

    startInstrument(0);
    void instrumentStartTime;
  }

  private finishPlayback(): void {
    this.isPlaying = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clearNoteHighlight();
    this.instrumentButtons.forEach(btn => btn.classList.remove('active'));
    this.startBtn.disabled = false;
    this.startBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>&nbsp; 重新分析';
    this.progressFill.style.width = '100%';
    this.renderComparisonCanvases();
  }

  private renderComparisonCanvases(): void {
    this.compareSection.innerHTML = '';
    const instruments: InstrumentType[] = ['piano', 'guitar', 'electone'];

    instruments.forEach((instrument) => {
      const history = this.renderer.getHistory(instrument);
      if (!history) return;

      const item = document.createElement('div');
      item.className = 'compare-item';

      const title = document.createElement('div');
      title.className = 'compare-title';
      title.textContent = INSTRUMENT_LABELS[instrument];
      item.appendChild(title);

      const wrap = document.createElement('div');
      wrap.className = 'compare-canvas-wrap';

      const canvas = document.createElement('canvas');
      canvas.className = 'compare-canvas';
      wrap.appendChild(canvas);

      const hint = document.createElement('div');
      hint.className = 'compare-hint';
      hint.textContent = '点击播放该时刻采样 (0.3s)';
      wrap.appendChild(hint);

      item.appendChild(wrap);
      this.compareSection.appendChild(item);

      this.renderer.renderComparison(canvas, history);

      wrap.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        this.playSampleAt(instrument, x, y);

        wrap.classList.remove('zooming');
        void wrap.offsetWidth;
        wrap.classList.add('zooming');
        setTimeout(() => wrap.classList.remove('zooming'), 200);
      });
    });
  }

  private playSampleAt(instrument: InstrumentType, _xRatio: number, yRatio: number): void {
    const freq = this.renderer.freqAtY(yRatio * 200, 200);
    const clampedFreq = Math.max(100, Math.min(4000, freq));
    const startTime = this.audio.getCurrentTime() + 0.02;
    this.audio.playSample(instrument, clampedFreq, startTime, 0.3);
  }

  getFilterParams(): FilterParams {
    return {
      lowPassFreq: parseFloat(this.sliders.lowPass.value),
      highPassFreq: parseFloat(this.sliders.highPass.value),
      reverbSize: parseFloat(this.sliders.reverb.value)
    };
  }
}
