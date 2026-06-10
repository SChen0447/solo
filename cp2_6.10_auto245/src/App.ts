import RingSpectrum from './RingSpectrum';
import ConflictDetector, { Track, ConflictWarning } from './ConflictDetector';

const DEFAULT_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#ff6b9d'
];

const generateWaveformData = (length: number = 64, seed: number = 0): number[] => {
  const data: number[] = [];
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const base = 0.5 + 0.3 * Math.sin(t * Math.PI * 4 + seed);
    const noise = 0.2 * (Math.sin(i * 0.7 + seed * 2) + Math.cos(i * 1.3 + seed * 3)) / 2;
    data.push(Math.max(0.1, Math.min(1, base + noise)));
  }
  return data;
};

const generateId = (): string => {
  return 'track_' + Math.random().toString(36).slice(2, 10);
};

const createDefaultTracks = (): Track[] => {
  return [
    {
      id: generateId(),
      name: '鼓组',
      color: DEFAULT_COLORS[0],
      volume: 80,
      startFreq: 40,
      endFreq: 8000,
      peakEnergy: 7.2,
      waveformData: generateWaveformData(64, 1),
    },
    {
      id: generateId(),
      name: '贝斯',
      color: DEFAULT_COLORS[1],
      volume: 72,
      startFreq: 30,
      endFreq: 1000,
      peakEnergy: 6.5,
      waveformData: generateWaveformData(64, 2),
    },
  ];
};

const formatFreq = (freq: number): string => {
  if (freq >= 1000) return (freq / 1000).toFixed(1) + 'k';
  return Math.round(freq).toString();
};

const parseFreq = (str: string): number => {
  const s = str.toLowerCase().trim();
  if (s.endsWith('k')) {
    return parseFloat(s) * 1000;
  }
  return parseFloat(s) || 100;
};

class App {
  private tracks: Track[] = [];
  private spectrum: RingSpectrum;
  private detector: ConflictDetector;
  private trackListEl: HTMLElement;
  private conflictListEl: HTMLElement;
  private addTrackBtn: HTMLElement;
  private conflictUpdateTimer: number | null = null;

  constructor() {
    const canvas = document.getElementById('ringCanvas') as HTMLCanvasElement;
    const wrapper = document.getElementById('spectrumWrapper') as HTMLElement;
    const bubbleEl = document.getElementById('infoBubble') as HTMLElement;
    this.trackListEl = document.getElementById('trackList') as HTMLElement;
    this.conflictListEl = document.getElementById('conflictList') as HTMLElement;
    this.addTrackBtn = document.getElementById('addTrackBtn') as HTMLElement;

    this.spectrum = new RingSpectrum(canvas, wrapper, bubbleEl);
    this.detector = new ConflictDetector();

    this.tracks = createDefaultTracks();
    this.spectrum.setTracks(this.tracks);

    this.bindEvents();
    this.renderTrackList();
    this.startConflictLoop();
    this.spectrum.start();
  }

  private bindEvents(): void {
    this.addTrackBtn.addEventListener('click', () => this.addTrack());

    this.spectrum.setOnHoverChange((hoveredId) => {
      document.querySelectorAll('.track-item').forEach((el) => {
        if (hoveredId && el.getAttribute('data-track-id') === hoveredId) {
          el.classList.add('highlighted');
        } else {
          el.classList.remove('highlighted');
        }
      });
    });
  }

  private startConflictLoop(): void {
    const update = () => {
      const warnings = this.detector.detect(this.tracks);
      this.renderConflictList(warnings);
      this.conflictUpdateTimer = window.setTimeout(update, 150);
    };
    update();
  }

  private addTrack(): void {
    if (this.tracks.length >= 8) {
      this.addTrackBtn.classList.add('btn-danger');
      this.addTrackBtn.textContent = '最多8条音轨';
      setTimeout(() => {
        this.addTrackBtn.classList.remove('btn-danger');
        this.addTrackBtn.textContent = '+ 添加音轨';
      }, 1500);
      return;
    }

    const usedColors = this.tracks.map((t) => t.color);
    const availableColor = DEFAULT_COLORS.find((c) => !usedColors.includes(c)) || DEFAULT_COLORS[this.tracks.length % DEFAULT_COLORS.length];

    const freqPresets = [
      { name: '人声', start: 80, end: 12000, peak: 5.8 },
      { name: '吉他', start: 80, end: 6000, peak: 5.2 },
      { name: '钢琴', start: 30, end: 10000, peak: 6.0 },
      { name: '合成器', start: 50, end: 15000, peak: 5.5 },
      { name: '弦乐', start: 200, end: 8000, peak: 5.0 },
      { name: '新音轨', start: 100, end: 5000, peak: 4.5 },
    ];
    const preset = freqPresets[this.tracks.length % freqPresets.length];

    const newTrack: Track = {
      id: generateId(),
      name: preset.name,
      color: availableColor,
      volume: 65,
      startFreq: preset.start,
      endFreq: preset.end,
      peakEnergy: preset.peak,
      waveformData: generateWaveformData(64, this.tracks.length + 3),
    };

    this.tracks.push(newTrack);
    this.spectrum.setTracks(this.tracks);
    this.renderTrackList();
  }

  private removeTrack(trackId: string): void {
    const el = this.trackListEl.querySelector(`[data-track-id="${trackId}"]`) as HTMLElement | null;
    if (!el) return;

    el.classList.add('removing');
    setTimeout(() => {
      this.tracks = this.tracks.filter((t) => t.id !== trackId);
      this.spectrum.setTracks(this.tracks);
      this.renderTrackList();
    }, 300);
  }

  private updateTrack(trackId: string, updates: Partial<Track>): void {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return;

    Object.assign(track, updates);
    if (updates.startFreq !== undefined && updates.endFreq === undefined) {
      if (track.startFreq >= track.endFreq) {
        track.endFreq = Math.min(20000, track.startFreq + 100);
      }
    }
    if (updates.endFreq !== undefined && updates.startFreq === undefined) {
      if (track.endFreq <= track.startFreq) {
        track.startFreq = Math.max(20, track.endFreq - 100);
      }
    }
    track.startFreq = Math.max(20, Math.min(20000, track.startFreq));
    track.endFreq = Math.max(20, Math.min(20000, track.endFreq));

    this.spectrum.setTracks(this.tracks);
  }

  private renderTrackList(): void {
    this.trackListEl.innerHTML = '';

    this.tracks.forEach((track) => {
      const trackEl = document.createElement('div');
      trackEl.className = 'track-item';
      trackEl.setAttribute('data-track-id', track.id);

      trackEl.innerHTML = `
        <div class="track-header">
          <div class="color-picker-wrapper" style="background: ${track.color};">
            <input type="color" value="${track.color}" data-field="color" />
          </div>
          <input type="text" class="track-name" value="${track.name}" data-field="name" maxlength="16" />
          <button class="btn btn-danger btn-sm" data-action="delete">删除</button>
        </div>
        <div class="track-controls">
          <div class="control-row">
            <span class="control-label">音量</span>
            <input type="range" class="slider" min="0" max="100" value="${track.volume}" data-field="volume" />
            <span class="slider-value">${track.volume}%</span>
          </div>
          <div class="control-row">
            <span class="control-label">起始</span>
            <input type="range" class="slider" min="20" max="20000" value="${track.startFreq}" data-field="startFreq" />
            <span class="slider-value">${formatFreq(track.startFreq)}Hz</span>
          </div>
          <div class="control-row">
            <span class="control-label">截止</span>
            <input type="range" class="slider" min="20" max="20000" value="${track.endFreq}" data-field="endFreq" />
            <span class="slider-value">${formatFreq(track.endFreq)}Hz</span>
          </div>
          <div class="control-row">
            <span class="control-label">能量</span>
            <input type="range" class="slider" min="0" max="12" step="0.1" value="${track.peakEnergy}" data-field="peakEnergy" />
            <span class="slider-value">${track.peakEnergy.toFixed(1)}dB</span>
          </div>
        </div>
      `;

      const colorInput = trackEl.querySelector('input[type="color"]') as HTMLInputElement;
      colorInput.addEventListener('input', (e) => {
        const val = (e.target as HTMLInputElement).value;
        (colorInput.parentElement as HTMLElement).style.background = val;
        this.updateTrack(track.id, { color: val });
      });

      const nameInput = trackEl.querySelector('input.track-name') as HTMLInputElement;
      nameInput.addEventListener('input', (e) => {
        this.updateTrack(track.id, { name: (e.target as HTMLInputElement).value });
      });

      const deleteBtn = trackEl.querySelector('[data-action="delete"]') as HTMLElement;
      deleteBtn.addEventListener('click', () => this.removeTrack(track.id));

      trackEl.querySelectorAll('input.slider').forEach((input) => {
        const slider = input as HTMLInputElement;
        const valueEl = slider.parentElement?.querySelector('.slider-value') as HTMLElement;
        const field = slider.getAttribute('data-field') as keyof Track;

        slider.addEventListener('input', (e) => {
          const val = (e.target as HTMLInputElement).value;
          let numVal: number | string = parseFloat(val);

          if (field === 'volume' || field === 'peakEnergy' || field === 'startFreq' || field === 'endFreq') {
            if (valueEl) {
              if (field === 'volume') valueEl.textContent = val + '%';
              else if (field === 'peakEnergy') valueEl.textContent = numVal.toFixed(1) + 'dB';
              else valueEl.textContent = formatFreq(numVal) + 'Hz';
            }
            this.updateTrack(track.id, { [field]: numVal } as Partial<Track>);
          }
        });
      });

      this.trackListEl.appendChild(trackEl);
    });
  }

  private renderConflictList(warnings: ConflictWarning[]): void {
    const currentIds = new Set(
      Array.from(this.conflictListEl.querySelectorAll('.conflict-card')).map((el) =>
        el.getAttribute('data-conflict-id')
      )
    );
    const newIds = new Set(warnings.map((w) => w.id));

    if (currentIds.size === newIds.size && warnings.every((w) => currentIds.has(w.id))) {
      return;
    }

    if (warnings.length === 0) {
      this.conflictListEl.innerHTML = '<div class="no-conflict">暂无频率冲突 ✓</div>';
      return;
    }

    this.conflictListEl.innerHTML = '';
    warnings.forEach((warning) => {
      const t1 = this.tracks.find((t) => t.id === warning.track1Id);
      const t2 = this.tracks.find((t) => t.id === warning.track2Id);
      if (!t1 || !t2) return;

      const card = document.createElement('div');
      card.className = 'conflict-card';
      card.setAttribute('data-conflict-id', warning.id);
      card.innerHTML = `
        <div class="conflict-title">⚠ ${warning.totalEnergy.toFixed(1)} dBFS 频率冲突</div>
        <div class="conflict-suggestion">${warning.suggestion}</div>
      `;

      card.addEventListener('click', () => {
        this.spectrum.setHighlightedTrack(warning.track1Id);
        document.querySelectorAll('.track-item').forEach((el) => el.classList.remove('highlighted'));
        const el1 = this.trackListEl.querySelector(`[data-track-id="${warning.track1Id}"]`);
        const el2 = this.trackListEl.querySelector(`[data-track-id="${warning.track2Id}"]`);
        el1?.classList.add('highlighted');
        el2?.classList.add('highlighted');

        setTimeout(() => {
          this.spectrum.setHighlightedTrack(null);
          el1?.classList.remove('highlighted');
          el2?.classList.remove('highlighted');
        }, 2500);
      });

      this.conflictListEl.appendChild(card);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
