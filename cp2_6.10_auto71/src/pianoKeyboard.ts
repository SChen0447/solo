import { AudioEngine, midiToNoteName } from './audioEngine.js';
import { UIController } from './uiController.js';

const START_MIDI = 60;
const END_MIDI = 84;

const WHITE_KEY_PATTERN = [0, 2, 4, 5, 7, 9, 11];

const KEYBOARD_MAP: Record<string, number> = {
  'a': 60, 's': 62, 'd': 64, 'f': 65, 'g': 67, 'h': 69, 'j': 71,
  'k': 72, 'l': 74, ';': 76, "'": 77, 'z': 79, 'x': 81, 'c': 83, 'v': 84,
  'w': 61, 'e': 63, 't': 66, 'y': 68, 'u': 70,
  'o': 73, 'p': 75, 'r': 78, 'i': 80, '[': 82
};

export class PianoKeyboard {
  private audioEngine: AudioEngine;
  private uiController: UIController;
  private container: HTMLElement | null = null;
  private pianoEl: HTMLElement | null = null;
  private keyElements: Map<number, HTMLElement> = new Map();
  private pressedKeys: Set<number> = new Set();
  private whiteKeyWidth = 40;
  private whiteKeyHeight = 200;
  private blackKeyWidth = 24;
  private blackKeyHeight = 130;

  constructor(audioEngine: AudioEngine, uiController: UIController) {
    this.audioEngine = audioEngine;
    this.uiController = uiController;
  }

  init(): void {
    this.container = document.getElementById('pianoContainer');
    if (!this.container) return;

    this.updateKeySizes();
    this.createKeyboard();
    this.bindKeyboardEvents();

    window.addEventListener('resize', () => {
      this.updateKeySizes();
      this.rebuildKeyboard();
    });
  }

  private updateKeySizes(): void {
    const screenWidth = window.innerWidth;
    if (screenWidth < 650) {
      const ratio = screenWidth / 650;
      this.whiteKeyWidth = Math.max(24, Math.floor(40 * ratio));
    } else {
      this.whiteKeyWidth = 40;
    }
    this.whiteKeyHeight = 200;
    this.blackKeyWidth = Math.floor(this.whiteKeyWidth * 0.6);
    this.blackKeyHeight = Math.floor(this.whiteKeyHeight * 0.65);
  }

  private rebuildKeyboard(): void {
    if (this.pianoEl && this.container) {
      this.container.removeChild(this.pianoEl);
    }
    this.keyElements.clear();
    this.createKeyboard();
  }

  private isBlackKey(midiNote: number): boolean {
    const semitone = midiNote % 12;
    return !WHITE_KEY_PATTERN.includes(semitone);
  }

  private getWhiteKeyIndex(midiNote: number): number {
    let count = 0;
    for (let n = START_MIDI; n <= midiNote; n++) {
      if (!this.isBlackKey(n)) count++;
    }
    return count - 1;
  }

  private createKeyboard(): void {
    if (!this.container) return;

    this.pianoEl = document.createElement('div');
    this.pianoEl.className = 'piano';

    const whiteKeys: number[] = [];
    const blackKeys: number[] = [];

    for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
      if (this.isBlackKey(midi)) {
        blackKeys.push(midi);
      } else {
        whiteKeys.push(midi);
      }
    }

    whiteKeys.forEach(midi => {
      const keyEl = this.createWhiteKey(midi);
      this.pianoEl!.appendChild(keyEl);
      this.keyElements.set(midi, keyEl);
    });

    const totalWhiteWidth = whiteKeys.length * this.whiteKeyWidth;
    this.pianoEl.style.width = totalWhiteWidth + 'px';

    blackKeys.forEach(midi => {
      const keyEl = this.createBlackKey(midi, totalWhiteWidth);
      this.pianoEl!.appendChild(keyEl);
      this.keyElements.set(midi, keyEl);
    });

    this.container.appendChild(this.pianoEl);
  }

  private createWhiteKey(midiNote: number): HTMLElement {
    const key = document.createElement('button');
    key.className = 'white-key';
    key.style.width = this.whiteKeyWidth + 'px';
    key.style.height = this.whiteKeyHeight + 'px';
    key.dataset.midi = String(midiNote);
    key.setAttribute('aria-label', midiToNoteName(midiNote));

    this.bindMouseEvents(key, midiNote);
    return key;
  }

  private createBlackKey(midiNote: number, _totalWidth: number): HTMLElement {
    const key = document.createElement('button');
    key.className = 'black-key';
    key.style.width = this.blackKeyWidth + 'px';
    key.style.height = this.blackKeyHeight + 'px';

    const whiteKeyBefore = this.getWhiteKeyIndex(midiNote - 1);
    const offset = (whiteKeyBefore + 1) * this.whiteKeyWidth - this.blackKeyWidth / 2;
    key.style.left = offset + 'px';
    key.style.top = '0';

    key.dataset.midi = String(midiNote);
    key.setAttribute('aria-label', midiToNoteName(midiNote));

    this.bindMouseEvents(key, midiNote);
    return key;
  }

  private bindMouseEvents(el: HTMLElement, midiNote: number): void {
    let isDown = false;

    const onDown = (e: Event) => {
      e.preventDefault();
      if (!isDown) {
        isDown = true;
        this.pressNote(midiNote);
      }
    };

    const onUp = (e: Event) => {
      e.preventDefault();
      if (isDown) {
        isDown = false;
        this.releaseNote(midiNote);
      }
    };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('mouseleave', (e) => {
      if (isDown) {
        isDown = false;
        this.releaseNote(midiNote);
      }
    });

    el.addEventListener('touchstart', onDown, { passive: false });
    el.addEventListener('touchend', onUp, { passive: false });
    el.addEventListener('touchcancel', onUp, { passive: false });
  }

  private bindKeyboardEvents(): void {
    const pressedKeyboardKeys = new Set<string>();

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const midi = KEYBOARD_MAP[key];
      if (midi !== undefined && !pressedKeyboardKeys.has(key)) {
        pressedKeyboardKeys.add(key);
        this.pressNote(midi);
      }
    });

    document.addEventListener('keyup', (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const midi = KEYBOARD_MAP[key];
      if (midi !== undefined && pressedKeyboardKeys.has(key)) {
        pressedKeyboardKeys.delete(key);
        this.releaseNote(midi);
      }
    });
  }

  private pressNote(midiNote: number): void {
    if (this.pressedKeys.has(midiNote)) return;
    this.pressedKeys.add(midiNote);
    this.audioEngine.playNote(midiNote);

    const el = this.keyElements.get(midiNote);
    if (el) {
      el.classList.add('pressed');
    }

    this.uiController.onNotePressed(midiNote);
  }

  private releaseNote(midiNote: number): void {
    if (!this.pressedKeys.has(midiNote)) return;
    this.pressedKeys.delete(midiNote);
    this.audioEngine.stopNote(midiNote);

    const el = this.keyElements.get(midiNote);
    if (el) {
      el.classList.remove('pressed');
    }

    this.uiController.onNoteReleased(midiNote);
  }
}
