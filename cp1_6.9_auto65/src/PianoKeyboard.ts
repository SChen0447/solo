import { AudioEngine } from './AudioEngine.js';

export class PianoKeyboard {
  private container: HTMLElement;
  private audioEngine: AudioEngine;
  private onKeyPress: ((midi: number) => void) | null = null;
  private activeOscillators: Map<number, ReturnType<AudioEngine['playNote']>> = new Map();
  private keyElements: Map<number, HTMLElement> = new Map();

  private readonly WHITE_KEYS: number[] = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81];
  private readonly BLACK_KEYS: Array<{ midi: number; afterWhite: number }> = [
    { midi: 61, afterWhite: 0 },
    { midi: 63, afterWhite: 1 },
    { midi: 66, afterWhite: 3 },
    { midi: 68, afterWhite: 4 },
    { midi: 70, afterWhite: 5 },
    { midi: 73, afterWhite: 7 },
    { midi: 75, afterWhite: 8 },
    { midi: 78, afterWhite: 10 },
    { midi: 80, afterWhite: 11 },
  ];
  private readonly WHITE_WIDTH = 40;
  private readonly BLACK_WIDTH = 24;

  constructor(container: HTMLElement, audioEngine: AudioEngine) {
    this.container = container;
    this.audioEngine = audioEngine;
    this.render();
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public render(): void {
    this.container.innerHTML = '';
    this.keyElements.clear();

    const totalWhite = this.WHITE_KEYS.length;
    this.container.style.width = `${totalWhite * this.WHITE_WIDTH}px`;

    this.WHITE_KEYS.forEach((midi, idx) => {
      const key = document.createElement('div');
      key.className = 'white-key';
      key.dataset.midi = String(midi);
      key.style.left = `${idx * this.WHITE_WIDTH}px`;

      this.bindKeyEvents(key, midi);
      this.container.appendChild(key);
      this.keyElements.set(midi, key);
    });

    this.BLACK_KEYS.forEach(({ midi, afterWhite }) => {
      const key = document.createElement('div');
      key.className = 'black-key';
      key.dataset.midi = String(midi);
      key.style.left = `${(afterWhite + 1) * this.WHITE_WIDTH - this.BLACK_WIDTH / 2}px`;

      this.bindKeyEvents(key, midi);
      this.container.appendChild(key);
      this.keyElements.set(midi, key);
    });
  }

  private bindKeyEvents(el: HTMLElement, midi: number): void {
    const startPress = (e: Event) => {
      e.preventDefault();
      this.pressKey(midi);
    };
    const endPress = (e: Event) => {
      e.preventDefault();
      this.releaseKey(midi);
    };

    el.addEventListener('mousedown', startPress);
    el.addEventListener('mouseup', endPress);
    el.addEventListener('mouseleave', endPress);
    el.addEventListener('touchstart', startPress, { passive: false });
    el.addEventListener('touchend', endPress, { passive: false });
  }

  private pressKey(midi: number): void {
    const el = this.keyElements.get(midi);
    if (el) {
      el.classList.add('pressed');
    }

    const freq = this.midiToFreq(midi);
    const osc = this.audioEngine.playNote(freq, 0.5);
    this.activeOscillators.set(midi, osc);

    if (this.onKeyPress) {
      this.onKeyPress(midi);
    }
  }

  private releaseKey(midi: number): void {
    const el = this.keyElements.get(midi);
    if (el) {
      setTimeout(() => el.classList.remove('pressed'), 100);
    }
    this.activeOscillators.delete(midi);
  }

  public highlightKey(midi: number): void {
    const el = this.keyElements.get(midi);
    if (el) {
      el.classList.add('pressed');
      setTimeout(() => el.classList.remove('pressed'), 100);
    }
  }

  public setOnKeyPress(callback: (midi: number) => void): void {
    this.onKeyPress = callback;
  }

  public destroy(): void {
    this.container.innerHTML = '';
    this.keyElements.clear();
    this.activeOscillators.clear();
  }
}
