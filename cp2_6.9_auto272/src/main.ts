import { AudioEngine } from './audio';
import { Renderer, getNoteName, isBlackKey } from './renderer';
import { ParticleSystem } from './particle';

const WHITE_KEY_MAP: Record<string, number> = {
  'a': 48, 's': 50, 'd': 52, 'f': 53, 'g': 55, 'h': 57, 'j': 59,
  'k': 60, 'l': 62, ';': 64, '\'': 65,
  'z': 36, 'x': 38, 'c': 40, 'v': 41, 'b': 43, 'n': 45, 'm': 47,
  'q': 60, 'w': 62, 'e': 64, 'r': 65, 't': 67, 'y': 69, 'u': 71,
  'i': 72, 'o': 74, 'p': 76
};

const BLACK_KEY_MAP: Record<string, number> = {
  'w': 49, 'e': 51, 't': 54, 'y': 56, 'u': 58,
  'o': 61, 'p': 63,
  's': 37, 'd': 39, 'g': 42, 'h': 44, 'j': 46,
  '2': 49, '3': 51, '5': 54, '6': 56, '7': 58,
  '9': 61, '0': 63
};

class App {
  private canvas: HTMLCanvasElement;
  private slider: HTMLInputElement;
  private audio: AudioEngine;
  private renderer: Renderer;
  private particles: ParticleSystem;
  private pressedKeys: Set<number> = new Set();
  private keyboardPressed: Set<string> = new Set();
  private isMouseDown: boolean = false;
  private lastMouseNote: number | null = null;
  private lastFrameTime: number = 0;
  private animationId: number = 0;
  private spectrumUpdateCounter: number = 0;
  private cachedSpectrum: Uint8Array = new Uint8Array(128);

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.slider = document.getElementById('scroll-slider') as HTMLInputElement;
    this.audio = new AudioEngine();
    this.renderer = new Renderer(this.canvas);
    this.particles = new ParticleSystem();

    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.updateSliderRange();
    this.slider.value = String(this.renderer.getDefaultScrollOffset());
    this.renderer.setScrollOffset(this.renderer.getDefaultScrollOffset());
    this.startLoop();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.updateSliderRange();
    });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (this.keyboardPressed.has(key)) return;

      let noteIndex: number | undefined;

      if (BLACK_KEY_MAP[key] !== undefined) {
        noteIndex = BLACK_KEY_MAP[key];
      } else if (WHITE_KEY_MAP[key] !== undefined) {
        noteIndex = WHITE_KEY_MAP[key];
      }

      if (noteIndex !== undefined && !this.pressedKeys.has(noteIndex)) {
        this.noteOn(noteIndex);
        this.keyboardPressed.add(key);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();

      let noteIndex: number | undefined;
      if (BLACK_KEY_MAP[key] !== undefined) {
        noteIndex = BLACK_KEY_MAP[key];
      } else if (WHITE_KEY_MAP[key] !== undefined) {
        noteIndex = WHITE_KEY_MAP[key];
      }

      if (noteIndex !== undefined) {
        this.noteOff(noteIndex);
        this.keyboardPressed.delete(key);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.audio.resume();
      this.isMouseDown = true;
      const note = this.getNoteFromEvent(e);
      if (note !== null) {
        this.noteOn(note);
        this.lastMouseNote = note;
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;
      const note = this.getNoteFromEvent(e);
      if (note !== null && note !== this.lastMouseNote) {
        if (this.lastMouseNote !== null) {
          this.noteOff(this.lastMouseNote);
        }
        this.noteOn(note);
        this.lastMouseNote = note;
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isMouseDown) {
        this.isMouseDown = false;
        if (this.lastMouseNote !== null) {
          this.noteOff(this.lastMouseNote);
          this.lastMouseNote = null;
        }
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.audio.resume();
      this.isMouseDown = true;
      const touch = e.touches[0];
      const note = this.getNoteFromTouch(touch);
      if (note !== null) {
        this.noteOn(note);
        this.lastMouseNote = note;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.isMouseDown) return;
      const touch = e.touches[0];
      const note = this.getNoteFromTouch(touch);
      if (note !== null && note !== this.lastMouseNote) {
        if (this.lastMouseNote !== null) {
          this.noteOff(this.lastMouseNote);
        }
        this.noteOn(note);
        this.lastMouseNote = note;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isMouseDown = false;
      if (this.lastMouseNote !== null) {
        this.noteOff(this.lastMouseNote);
        this.lastMouseNote = null;
      }
    });

    this.slider.addEventListener('input', () => {
      const val = parseFloat(this.slider.value);
      this.renderer.setScrollOffset(val);
    });
  }

  private updateSliderRange(): void {
    const totalWidth = this.renderer.getKeyboardWidth();
    const maxScroll = Math.max(0, totalWidth - this.canvas.clientWidth + 50);
    this.slider.max = String(maxScroll);
    const currentVal = parseFloat(this.slider.value);
    if (currentVal > maxScroll) {
      this.slider.value = String(maxScroll);
      this.renderer.setScrollOffset(maxScroll);
    }
  }

  private getNoteFromEvent(e: MouseEvent): number | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return this.renderer.getNoteAtPosition(x, y);
  }

  private getNoteFromTouch(touch: Touch): number | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    return this.renderer.getNoteAtPosition(x, y);
  }

  private noteOn(noteIndex: number): void {
    if (this.pressedKeys.has(noteIndex)) return;
    if (noteIndex < 9 || noteIndex > 96) return;

    this.pressedKeys.add(noteIndex);
    this.audio.resume();
    this.audio.playNote(noteIndex, 80);
    this.renderer.setKeyPressed(noteIndex, true);
    this.renderer.addNoteStream(noteIndex, 80);

    const particlePos = this.getKeyTopPosition(noteIndex);
    if (particlePos) {
      this.particles.emit(particlePos.x, particlePos.y, noteIndex);
    }
  }

  private noteOff(noteIndex: number): void {
    if (!this.pressedKeys.has(noteIndex)) return;

    this.pressedKeys.delete(noteIndex);
    this.audio.fadeOutNote(noteIndex);
    this.renderer.setKeyPressed(noteIndex, false);
  }

  private getKeyTopPosition(noteIndex: number): { x: number; y: number } | null {
    const keyboardTop = this.canvas.clientHeight - 160 - 30 - 60;
    const keyboardWidth = this.renderer.getKeyboardWidth();
    const whiteKeyBaseWidth = this.canvas.clientWidth < 600 ? 18 : 26;

    let whiteX = 0;
    let whiteKeyWidth = whiteKeyBaseWidth;
    let targetWhiteX = -1;
    let targetWhiteWidth = 0;

    for (let i = 9; i <= 96; i++) {
      if (!isBlackKey(i)) {
        const t = (i - 9) / (96 - 9);
        const scale = 1 - t * 0.25;
        whiteKeyWidth = whiteKeyBaseWidth * scale;
        if (i === noteIndex) {
          targetWhiteX = whiteX;
          targetWhiteWidth = whiteKeyWidth;
          break;
        }
        if (!isBlackKey(noteIndex) && i === noteIndex - 1) {
          targetWhiteX = whiteX;
          targetWhiteWidth = whiteKeyWidth;
        }
        whiteX += whiteKeyWidth;
      }
    }

    let x: number;
    if (isBlackKey(noteIndex)) {
      x = targetWhiteX + targetWhiteWidth;
    } else {
      x = targetWhiteX + targetWhiteWidth / 2;
    }

    const visibleX = x - this.renderer['scrollOffset'];

    return {
      x: visibleX,
      y: keyboardTop + 5
    };
  }

  private startLoop(): void {
    const startTime = performance.now();

    const loop = (now: number) => {
      const elapsed = now - startTime;

      this.particles.update();

      this.spectrumUpdateCounter++;
      if (this.spectrumUpdateCounter % 2 === 0) {
        this.cachedSpectrum = new Uint8Array(this.audio.getSpectrumData());
      }

      this.renderer.draw(
        this.particles.getParticles(),
        this.cachedSpectrum,
        elapsed
      );

      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.audio.stopAllNotes();
  }
}

let app: App;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
