import {
  RGB,
  clamp,
  rgbToString,
  midiToFrequency,
  randomRange
} from './utils';

const SAND_HEIGHT_RATIO = 0.1;
const FOOTPRINT_RADIUS = 20;
const FOOTPRINT_OPACITY = 0.4;
const FOOTPRINT_LIFETIME = 5000;
const FOOTPRINT_PULSE_PERIOD = 1200;
const MAX_FOOTPRINTS = 30;
const FOOTPRINTS_PER_BASS = 5;
const MAX_BASS_LAYERS = 3;

const SAND_COLOR_START: RGB = { r: 245, g: 222, b: 179 };
const SAND_COLOR_END: RGB = { r: 255, g: 250, b: 240 };
const FOOTPRINT_COLOR_START: RGB = { r: 34, g: 139, b: 34 };
const FOOTPRINT_COLOR_END: RGB = { r: 144, g: 238, b: 144 };

const BASS_MIDI_NOTE = 58;
const BASS_NOTES = [58, 62, 65];

interface Footprint {
  id: number;
  x: number;
  y: number;
  radius: number;
  baseOpacity: number;
  createdAt: number;
  lifetime: number;
  pulsePhase: number;
  color: RGB;
}

interface BassLayer {
  active: boolean;
  startTime: number;
  lifetime: number;
  note: number;
}

class SandAudioEngine {
  private audioContext: AudioContext | null = null;
  private bassLayers: Map<number, { osc: OscillatorNode; gain: GainNode; startTime: number }> = new Map();
  private layerIdCounter = 0;

  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }

  playBassNote(midiNote: number, duration = 3000): number {
    if (!this.audioContext) return -1;

    const layerId = this.layerIdCounter++;
    const frequency = midiToFrequency(midiNote);
    const now = this.audioContext.currentTime;
    const durationSec = duration / 1000;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + durationSec);

    this.bassLayers.set(layerId, { osc, gain: gainNode, startTime: now });

    setTimeout(() => {
      this.bassLayers.delete(layerId);
    }, duration + 100);

    return layerId;
  }

  cleanup(): void {
    const now = this.audioContext?.currentTime || 0;
    this.bassLayers.forEach((layer, id) => {
      if (now - layer.startTime > 4) {
        this.bassLayers.delete(id);
      }
    });
  }

  resume(): void {
    if (this.audioContext) {
      this.audioContext.resume();
    }
  }

  getActiveLayerCount(): number {
    return this.bassLayers.size;
  }
}

const sandAudioEngine = new SandAudioEngine();

export class Sand {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private sandHeight: number;
  private footprints: Footprint[] = [];
  private maxFootprints: number = MAX_FOOTPRINTS;
  private footprintIdCounter: number = 0;
  private totalFootprintsAdded: number = 0;
  private bassLayers: BassLayer[] = [];
  private noiseTexture: ImageData | null = null;
  private time: number = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.sandHeight = height * SAND_HEIGHT_RATIO;
    this.initBassLayers();
    this.generateNoiseTexture();
    sandAudioEngine.init();
  }

  private initBassLayers(): void {
    for (let i = 0; i < MAX_BASS_LAYERS; i++) {
      this.bassLayers.push({
        active: false,
        startTime: 0,
        lifetime: 3000,
        note: BASS_NOTES[i % BASS_NOTES.length]
      });
    }
  }

  private generateNoiseTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const tempCtx = canvas.getContext('2d');
    if (!tempCtx) return;

    const imageData = tempCtx.createImageData(256, 256);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.floor(randomRange(200, 255));
      data[i] = noise;
      data[i + 1] = Math.floor(noise * 0.9);
      data[i + 2] = Math.floor(noise * 0.75);
      data[i + 3] = Math.floor(randomRange(10, 30));
    }

    tempCtx.putImageData(imageData, 0, 0);
    this.noiseTexture = imageData;
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
    const now = performance.now();

    this.footprints = this.footprints.filter((fp) => {
      const age = now - fp.createdAt;
      return age < fp.lifetime;
    });

    this.bassLayers.forEach((layer) => {
      if (layer.active) {
        const age = now - layer.startTime;
        if (age > layer.lifetime) {
          layer.active = false;
        }
      }
    });

    sandAudioEngine.cleanup();
  }

  addFootprint(x: number, y: number): void {
    if (this.footprints.length >= this.maxFootprints) {
      const oldest = this.footprints.shift();
      if (oldest) {
        this.totalFootprintsAdded++;
      }
    }

    const colorT = randomRange(0, 1);
    const footprint: Footprint = {
      id: this.footprintIdCounter++,
      x,
      y,
      radius: FOOTPRINT_RADIUS + randomRange(-5, 5),
      baseOpacity: FOOTPRINT_OPACITY,
      createdAt: performance.now(),
      lifetime: FOOTPRINT_LIFETIME,
      pulsePhase: randomRange(0, Math.PI * 2),
      color: {
        r: Math.floor(FOOTPRINT_COLOR_START.r + (FOOTPRINT_COLOR_END.r - FOOTPRINT_COLOR_START.r) * colorT),
        g: Math.floor(FOOTPRINT_COLOR_START.g + (FOOTPRINT_COLOR_END.g - FOOTPRINT_COLOR_START.g) * colorT),
        b: Math.floor(FOOTPRINT_COLOR_START.b + (FOOTPRINT_COLOR_END.b - FOOTPRINT_COLOR_START.b) * colorT)
      }
    };

    this.footprints.push(footprint);
    this.totalFootprintsAdded++;

    this.checkBassTrigger();
  }

  private checkBassTrigger(): void {
    const activeLayers = this.bassLayers.filter(l => l.active).length;
    const triggersNeeded = (activeLayers + 1) * FOOTPRINTS_PER_BASS;

    if (this.totalFootprintsAdded >= triggersNeeded && activeLayers < MAX_BASS_LAYERS) {
      const inactiveLayer = this.bassLayers.find(l => !l.active);
      if (inactiveLayer) {
        inactiveLayer.active = true;
        inactiveLayer.startTime = performance.now();
        sandAudioEngine.playBassNote(inactiveLayer.note, inactiveLayer.lifetime);
      }
    }
  }

  isInSandArea(y: number): boolean {
    const sandTop = this.height - this.sandHeight;
    return y >= sandTop && y <= this.height;
  }

  render(): void {
    const ctx = this.ctx;
    const sandTop = this.height - this.sandHeight;

    const gradient = ctx.createLinearGradient(0, sandTop, 0, this.height);
    gradient.addColorStop(0, rgbToString(SAND_COLOR_START));
    gradient.addColorStop(1, rgbToString(SAND_COLOR_END));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, sandTop, this.width, this.sandHeight);

    this.renderNoiseTexture(sandTop);
    this.renderFoamEdge(sandTop);
    this.renderFootprints();
  }

  private renderNoiseTexture(sandTop: number): void {
    const ctx = this.ctx;

    if (this.noiseTexture) {
      ctx.globalAlpha = 0.3;
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = 256;
      patternCanvas.height = 256;
      const patternCtx = patternCanvas.getContext('2d');
      if (patternCtx) {
        patternCtx.putImageData(this.noiseTexture, 0, 0);
        const pattern = ctx.createPattern(patternCanvas, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, sandTop, this.width, this.sandHeight);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  private renderFoamEdge(sandTop: number): void {
    const ctx = this.ctx;
    const timeSec = this.time / 1000;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let x = 0; x <= this.width; x += 4) {
      const waveOffset = Math.sin(x * 0.03 + timeSec * 2) * 4 +
                        Math.sin(x * 0.05 + timeSec * 1.5) * 2;
      const y = sandTop + waveOffset;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= this.width; x += 4) {
      const waveOffset = Math.sin(x * 0.04 + timeSec * 1.8 + 1) * 3 +
                        Math.sin(x * 0.06 + timeSec * 1.2 + 2) * 1.5;
      const y = sandTop + waveOffset + 5;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  private renderFootprints(): void {
    const ctx = this.ctx;
    const now = performance.now();

    this.footprints.forEach((fp) => {
      const age = now - fp.createdAt;
      const lifeT = age / fp.lifetime;
      const fadeT = lifeT < 0.1 ? lifeT / 0.1 : (lifeT > 0.8 ? (1 - lifeT) / 0.2 : 1);

      const pulseT = (now / 1000 + fp.pulsePhase) * (2 * Math.PI / (FOOTPRINT_PULSE_PERIOD / 1000));
      const pulseScale = 1 + Math.sin(pulseT) * 0.2;

      const radius = fp.radius * pulseScale;
      const opacity = fp.baseOpacity * fadeT;

      const gradient = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, radius);
      gradient.addColorStop(0, rgbToString(fp.color, opacity));
      gradient.addColorStop(0.5, rgbToString(fp.color, opacity * 0.6));
      gradient.addColorStop(1, rgbToString(fp.color, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const innerGradient = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, radius * 0.5);
      innerGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.3})`);
      innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  getActiveFootprintCount(): number {
    return this.footprints.length;
  }

  getActiveBassLayerCount(): number {
    return this.bassLayers.filter(l => l.active).length;
  }

  resetFootprintCounter(): void {
    this.totalFootprintsAdded = 0;
  }

  static resumeAudio(): void {
    sandAudioEngine.resume();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.sandHeight = height * SAND_HEIGHT_RATIO;
  }
}
