import {
  RGB,
  Vec2,
  lerp,
  clamp,
  easeOutCubic,
  easeOutExpo,
  gradientColor,
  rgbToString,
  midiToFrequency,
  randomRange
} from './utils';

const HARP_WIDTH_RATIO = 0.3;
const HARP_HEIGHT_RATIO = 0.6;
const STRING_COUNT = 12;
const STRING_WIDTH = 2;
const IDLE_AMPLITUDE = 2;
const IDLE_FREQUENCY = 0.5;
const MAX_TRIGGER_AMPLITUDE = 15;
const TRAIL_LENGTH = 30;
const TRAIL_OPACITY = 0.6;
const TRAIL_FADE_TIME = 1000;
const SLIDE_DURATION = 1500;
const DAMPING = 0.995;
const RETURN_SPEED = 0.05;

const STRING_BOTTOM: RGB = { r: 25, g: 25, b: 112 };
const STRING_TOP: RGB = { r: 135, g: 206, b: 235 };

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BASE_MIDI_NOTE = 60;

interface StringState {
  id: number;
  baseX: number;
  baseY: number;
  length: number;
  amplitude: number;
  targetAmplitude: number;
  frequency: number;
  phase: number;
  color: RGB;
  trail: Vec2[];
  note: string;
  midiNote: number;
  lastTriggerTime: number;
}

interface HarpState {
  x: number;
  y: number;
  width: number;
  height: number;
  strings: StringState[];
  slideProgress: number;
  slideDuration: number;
  slideStartTime: number;
}

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private activeOscillators: Map<number, { osc: OscillatorNode; gain: GainNode; startTime: number }[]> = new Map();

  private init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }

  playNote(midiNote: number, velocity: number, duration = 1.5): void {
    if (!this.audioContext) return;

    const frequency = midiToFrequency(midiNote);
    const now = this.audioContext.currentTime;

    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(frequency * 2, now);

    const gain = clamp(velocity * 0.3, 0, 0.5);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    osc1.start(now);
    osc1.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);

    const oscList = this.activeOscillators.get(midiNote) || [];
    oscList.push({ osc: osc1, gain: gainNode, startTime: now });
    this.activeOscillators.set(midiNote, oscList);
  }

  cleanup(): void {
    const now = this.audioContext?.currentTime || 0;
    this.activeOscillators.forEach((list) => {
      list.filter(item => now - item.startTime < 2);
    });
  }

  resume(): void {
    if (this.audioContext) {
      this.audioContext.resume();
    }
  }
}

const audioEngine = new AudioEngine();

export class Harp {
  private ctx: CanvasRenderingContext2D;
  private state: HarpState;
  private width: number;
  private height: number;
  private time: number = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.state = this.createInitialState();
    audioEngine.init();
  }

  private createInitialState(): HarpState {
    const harpWidth = this.width * HARP_WIDTH_RATIO;
    const harpHeight = this.height * HARP_HEIGHT_RATIO;
    const harpX = (this.width - harpWidth) / 2;
    const harpY = this.height * 0.15;

    const strings: StringState[] = [];
    const stringSpacing = harpWidth / (STRING_COUNT + 1);

    for (let i = 0; i < STRING_COUNT; i++) {
      const t = i / (STRING_COUNT - 1);
      const midiNote = BASE_MIDI_NOTE + i;
      const colorT = i / (STRING_COUNT - 1);
      strings.push({
        id: i,
        baseX: harpX + stringSpacing * (i + 1),
        baseY: harpY + harpHeight,
        length: harpHeight * 0.92,
        amplitude: IDLE_AMPLITUDE,
        targetAmplitude: IDLE_AMPLITUDE,
        frequency: IDLE_FREQUENCY + randomRange(-0.1, 0.1),
        phase: randomRange(0, Math.PI * 2),
        color: gradientColor(STRING_BOTTOM, STRING_TOP, colorT),
        trail: [],
        note: NOTE_NAMES[i % 12] + '4',
        midiNote,
        lastTriggerTime: 0
      });
    }

    return {
      x: harpX,
      y: harpY,
      width: harpWidth,
      height: harpHeight,
      strings,
      slideProgress: 0,
      slideDuration: SLIDE_DURATION,
      slideStartTime: performance.now()
    };
  }

  update(deltaTime: number, oceanTriggers: number[]): void {
    this.time += deltaTime;

    const elapsed = performance.now() - this.state.slideStartTime;
    this.state.slideProgress = clamp(elapsed / this.state.slideDuration, 0, 1);

    oceanTriggers.forEach((trigger) => {
      if (trigger > 0) {
        const stringIndex = clamp(Math.floor(trigger * STRING_COUNT), 0, STRING_COUNT - 1);
        const normalizedHeight = Math.abs(trigger - 0.5) * 2;
        this.triggerString(stringIndex, normalizedHeight * MAX_TRIGGER_AMPLITUDE);
      }
    });

    this.state.strings.forEach((str) => {
      str.phase += str.frequency * deltaTime * 0.001 * (2 * Math.PI);

      const diff = str.targetAmplitude - str.amplitude;
      str.amplitude += diff * RETURN_SPEED;
      str.amplitude *= DAMPING;

      const currentX = this.getStringX(str);
      str.trail.unshift({ x: currentX, y: str.baseY - str.length / 2 });

      if (str.trail.length > TRAIL_LENGTH) {
        str.trail.pop();
      }

      str.targetAmplitude = lerp(str.targetAmplitude, IDLE_AMPLITUDE, 0.02);
    });

    audioEngine.cleanup();
  }

  private getStringX(str: StringState): number {
    const slideOffset = (1 - easeOutCubic(this.state.slideProgress)) * this.height * 0.8;
    const vibration = Math.sin(str.phase) * str.amplitude;
    return str.baseX + vibration - slideOffset * 0;
  }

  triggerString(index: number, amplitude: number): void {
    const str = this.state.strings[index];
    if (!str) return;

    const now = performance.now();
    if (now - str.lastTriggerTime < 200) return;
    str.lastTriggerTime = now;

    str.targetAmplitude = clamp(amplitude, IDLE_AMPLITUDE, MAX_TRIGGER_AMPLITUDE);
    str.amplitude = clamp(amplitude, IDLE_AMPLITUDE, MAX_TRIGGER_AMPLITUDE);

    const velocity = amplitude / MAX_TRIGGER_AMPLITUDE;
    audioEngine.playNote(str.midiNote, velocity);
  }

  render(): void {
    const ctx = this.ctx;
    const slideOffset = (1 - easeOutCubic(this.state.slideProgress)) * this.height * 0.8;

    ctx.save();
    ctx.translate(0, -slideOffset);

    this.renderFrame();
    this.renderBow();

    this.state.strings.forEach((str, index) => {
      this.renderString(str, index);
    });

    this.renderBase();

    ctx.restore();
  }

  private renderFrame(): void {
    const ctx = this.ctx;
    const { x, y, width, height } = this.state;

    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#8B4513');
    gradient.addColorStop(0.3, '#CD853F');
    gradient.addColorStop(0.7, '#B8860B');
    gradient.addColorStop(1, '#8B4513');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(x + width * 0.1, y + height);
    ctx.lineTo(x + width * 0.05, y + height * 0.05);
    ctx.quadraticCurveTo(x + width * 0.15, y, x + width * 0.5, y + height * 0.02);
    ctx.quadraticCurveTo(x + width * 0.85, y, x + width * 0.95, y + height * 0.05);
    ctx.lineTo(x + width * 0.9, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const ly = y + height * (0.2 + i * 0.15);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.12, ly);
      ctx.lineTo(x + width * 0.88, ly);
      ctx.stroke();
    }
  }

  private renderBow(): void {
    const ctx = this.ctx;
    const { x, y, width, height } = this.state;

    ctx.strokeStyle = 'rgba(25, 25, 112, 0.6)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x + width * 0.1, y + height);
    ctx.quadraticCurveTo(
      x + width * 0.5, y - height * 0.15,
      x + width * 0.9, y + height);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(135, 206, 235, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.1, y + height);
    ctx.quadraticCurveTo(
      x + width * 0.5, y - height * 0.15,
      x + width * 0.9, y + height);
    ctx.stroke();
  }

  private renderString(str: StringState, _index: number): void {
    const ctx = this.ctx;
    const slideOffset = (1 - easeOutCubic(this.state.slideProgress)) * this.height * 0.8;
    const topY = str.baseY - str.length;
    const bottomY = str.baseY;
    const segments = 20;

    if (str.trail.length > 1) {
      for (let i = str.trail.length - 1; i > 0; i--) {
        const t = 1 - i / str.trail.length;
        const alpha = TRAIL_OPACITY * (1 - t);
        const prevPoint = str.trail[i];
        const currPoint = str.trail[i - 1];
        const trailColor = gradientColor(STRING_BOTTOM, STRING_TOP, 0.5 + Math.sin(this.time * 0.002 + str.id * 0.5) * 0.5);
        ctx.strokeStyle = rgbToString(trailColor, alpha * 0.5);
        ctx.lineWidth = STRING_WIDTH * (1 - t * 0.5);
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y - slideOffset);
        ctx.lineTo(currPoint.x, currPoint.y - slideOffset);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = rgbToString(str.color);
    ctx.lineWidth = STRING_WIDTH;
    ctx.lineCap = 'round';
    ctx.shadowColor = rgbToString(str.color, 0.8);
    ctx.shadowBlur = 10;

    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = lerp(topY, bottomY, t);
      const wavePhase = str.phase + t * Math.PI * 2;
      const xOffset = Math.sin(wavePhase) * str.amplitude * Math.sin(t * Math.PI);
      const x = str.baseX + xOffset;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private renderBase(): void {
    const ctx = this.ctx;
    const { x, y, width, height } = this.state;

    const baseGradient = ctx.createLinearGradient(x, y + height * 0.9, x, y + height);
    baseGradient.addColorStop(0, '#654321');
    baseGradient.addColorStop(1, '#3E2723');

    ctx.fillStyle = baseGradient;
    ctx.strokeStyle = '#2C1810';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(x - 10, y + height * 0.88, width + 20, height * 0.15, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#DAA520';
    for (let i = 0; i < STRING_COUNT; i++) {
      const t = i / (STRING_COUNT - 1);
      const px = x + (width / (STRING_COUNT + 1)) * (i + 1);
      ctx.beginPath();
      ctx.arc(px, y + height * 0.92, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getBasePosition(): Vec2 {
    return {
      x: this.state.x + this.state.width / 2,
      y: this.state.y + this.state.height
    };
  }

  getSlideProgress(): number {
    return this.state.slideProgress;
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.state.x,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height
    };
  }

  static resumeAudio(): void {
    audioEngine.resume();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    const harpWidth = width * HARP_WIDTH_RATIO;
    const harpHeight = height * HARP_HEIGHT_RATIO;
    const harpX = (width - harpWidth) / 2;
    const harpY = height * 0.15;

    this.state.x = harpX;
    this.state.y = harpY;
    this.state.width = harpWidth;
    this.state.height = harpHeight;

    const stringSpacing = harpWidth / (STRING_COUNT + 1);

    this.state.strings.forEach((str, i) => {
      str.baseX = harpX + stringSpacing * (i + 1);
      str.baseY = harpY + harpHeight;
      str.length = harpHeight * 0.92;
    });
  }
}
