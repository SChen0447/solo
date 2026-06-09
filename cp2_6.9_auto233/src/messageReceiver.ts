export const MORSE_CODE: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  ' ': '/'
};

export const REVERSE_MORSE: Record<string, string> = Object.entries(MORSE_CODE)
  .reduce((acc, [letter, code]) => {
    acc[code] = letter;
    return acc;
  }, {} as Record<string, string>);

const WORD_POOL = [
  'HELLO', 'WORLD', 'SPACE', 'STELLAR', 'SIGNAL', 'FREQ', 'CODE',
  'MORSE', 'RADIO', 'COMET', 'ORBIT', 'GALAXY', 'NEBULA', 'QUASAR',
  'PULSAR', 'VOID', 'WORMHOLE', 'NEBULA', 'ASTEROID', 'SATELLITE',
  'TRANSMIT', 'RECEIVE', 'DECODE', 'ENCODE', 'MESSAGE', 'CHANNEL',
  'DISTRESS', 'HELP', 'EMERGENCY', 'SAFE', 'HOME', 'STAR', 'PLANET',
  'MOON', 'MARS', 'VENUS', 'JUPITER', 'SATURN', 'EARTH', 'NOVA',
  'SUPERNOVA', 'BLACKHOLE', 'RELAY', 'BEACON', 'ANTENNA'
];

export type PlanetId = 'krypton' | 'titan' | 'bluegiant' | 'darkstar' | 'crystal';

export interface PlanetInfo {
  id: PlanetId;
  name: string;
  color: string;
  frequency: number;
  description: string;
  x: number;
  y: number;
}

export const PLANETS: PlanetInfo[] = [
  { id: 'krypton', name: '氪星', color: '#FFD700', frequency: 88, description: '氪星：能源丰富，但辐射强烈', x: 40, y: 50 },
  { id: 'titan', name: '泰坦星', color: '#FF6B6B', frequency: 95, description: '泰坦星：寒冷而厚重的甲烷大气层', x: 130, y: 80 },
  { id: 'bluegiant', name: '蓝巨星', color: '#3B82F6', frequency: 102, description: '蓝巨星：高温恒星，电磁风暴频发', x: 60, y: 140 },
  { id: 'darkstar', name: '暗星', color: '#8B5CF6', frequency: 110, description: '暗星：神秘的暗能量聚集地', x: 140, y: 180 },
  { id: 'crystal', name: '水晶星', color: '#34D399', frequency: 117, description: '水晶星：整个星球由纯净水晶构成', x: 90, y: 240 }
];

export interface TelegraphMessage {
  id: number;
  planet: PlanetInfo;
  text: string;
  morse: string;
  received: boolean;
  startTime: number;
}

export type ValidateResult = 'correct' | 'wrong' | 'incomplete';

export type SignalStrength = 'clear' | 'noisy' | 'unreadable';

export class MessageReceiver {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pixelRatio: number;
  private currentFrequency: number = 100;
  private currentMessage: TelegraphMessage | null = null;
  private messageCount: number = 0;
  private scrollOffset: number = 0;
  private morsePixels: Array<{ x: number; y: number; type: 'dot' | 'dash' | 'noise' | 'gap'; color: string; }> = [];
  private audioContext: AudioContext | null = null;
  private noisePattern: Array<{ x: number; y: number; ttl: number }> = [];
  private onMessageDecoded: ((planet: PlanetInfo, text: string, messageId: number) => void) | null = null;
  private onFeedback: ((result: ValidateResult, expected: string, input: string) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context for telegraph canvas');
    this.ctx = ctx;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.setupHighDPICanvas();
    this.generateNewMessage();
  }

  private setupHighDPICanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.pixelRatio;
    this.canvas.height = rect.height * this.pixelRatio;
    this.ctx.scale(this.pixelRatio, this.pixelRatio);
  }

  public setFrequency(freq: number): void {
    this.currentFrequency = freq;
  }

  public setOnMessageDecoded(callback: (planet: PlanetInfo, text: string, messageId: number) => void): void {
    this.onMessageDecoded = callback;
  }

  public setOnFeedback(callback: (result: ValidateResult, expected: string, input: string) => void): void {
    this.onFeedback = callback;
  }

  public getCurrentMessage(): TelegraphMessage | null {
    return this.currentMessage;
  }

  public getCurrentMorse(): string {
    return this.currentMessage?.morse ?? '';
  }

  public getSignalStrength(): SignalStrength {
    if (!this.currentMessage) return 'clear';
    const diff = Math.abs(this.currentFrequency - this.currentMessage.planet.frequency);
    if (diff >= 10) return 'unreadable';
    if (diff >= 5) return 'noisy';
    return 'clear';
  }

  public validateInput(input: string): ValidateResult {
    if (!this.currentMessage) return 'incomplete';
    const cleanInput = input.trim().toUpperCase();
    const expected = this.currentMessage.text;

    if (cleanInput.length === 0) return 'incomplete';

    if (cleanInput === expected) {
      this.playCorrectSound();
      if (this.onMessageDecoded) {
        this.onMessageDecoded(this.currentMessage.planet, this.currentMessage.text, this.currentMessage.id);
      }
      if (this.onFeedback) {
        this.onFeedback('correct', expected, cleanInput);
      }
      setTimeout(() => {
        this.generateNewMessage();
      }, 1500);
      return 'correct';
    } else {
      this.playErrorSound();
      if (this.onFeedback) {
        this.onFeedback('wrong', expected, cleanInput);
      }
      return 'wrong';
    }
  }

  private generateNewMessage(): void {
    this.messageCount++;
    const planet = PLANETS[Math.floor(Math.random() * PLANETS.length)];
    const wordCount = Math.random() > 0.5 ? 2 : 1;
    const words: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      words.push(WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)]);
    }
    const text = words.join(' ');
    const morse = this.textToMorse(text);

    this.currentMessage = {
      id: this.messageCount,
      planet,
      text,
      morse,
      received: false,
      startTime: performance.now()
    };

    this.generateMorsePixels(morse);
    this.currentFrequency = planet.frequency;
  }

  private textToMorse(text: string): string {
    return text
      .toUpperCase()
      .split('')
      .map((ch) => MORSE_CODE[ch] ?? '')
      .filter(Boolean)
      .join(' ');
  }

  private generateMorsePixels(morse: string): void {
    this.morsePixels = [];
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    let x = 20;
    const baseY = height / 2;
    const charSpacing = 18;

    for (let i = 0; i < morse.length; i++) {
      const ch = morse[i];
      if (ch === '.') {
        this.morsePixels.push({ x, y: baseY, type: 'dot', color: '#FFFFFF' });
        x += charSpacing / 2;
      } else if (ch === '-') {
        this.morsePixels.push({ x, y: baseY, type: 'dash', color: '#FFFFFF' });
        this.morsePixels.push({ x: x + 4, y: baseY, type: 'dash', color: '#FFFFFF' });
        this.morsePixels.push({ x: x + 8, y: baseY, type: 'dash', color: '#FFFFFF' });
        x += charSpacing;
      } else if (ch === ' ') {
        x += charSpacing * 0.8;
      } else if (ch === '/') {
        x += charSpacing * 1.5;
      }
    }

    this.scrollOffset = Math.max(0, x - width + 40);
  }

  private playCorrectSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.value = 880;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.value = 1320;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.2);
    } catch {
    }
  }

  private playErrorSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.15;
      noise.connect(gain).connect(ctx.destination);
      noise.start(now);
    } catch {
    }
  }

  public update(deltaTime: number): void {
    const strength = this.getSignalStrength();
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.scrollOffset += deltaTime * 20;
    if (this.scrollOffset > this.morsePixels.length * 20 + 200) {
      this.scrollOffset = 0;
    }

    if (strength !== 'clear') {
      const noiseRate = strength === 'unreadable' ? 8 : 3;
      if (Math.random() < noiseRate * deltaTime) {
        this.noisePattern.push({
          x: Math.random() * width,
          y: Math.random() * height,
          ttl: 0.3 + Math.random() * 0.5
        });
      }
    }

    this.noisePattern = this.noisePattern.filter((n) => {
      n.ttl -= deltaTime;
      return n.ttl > 0;
    });
  }

  public render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const strength = this.getSignalStrength();

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#0F0F18';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = 0; x < width; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const baseY = height / 2;
    ctx.fillStyle = '#1A1A28';
    ctx.fillRect(0, baseY - 15, width, 30);

    ctx.strokeStyle = '#2A2A38';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(width, baseY);
    ctx.stroke();

    const pixelSize = 3;
    for (const p of this.morsePixels) {
      let screenX = p.x - this.scrollOffset;
      if (screenX < -10 || screenX > width + 10) continue;

      let color = p.color;
      let isNoise = false;

      if (strength === 'unreadable') {
        if (Math.random() > 0.3) continue;
        color = '#808080';
        isNoise = true;
      } else if (strength === 'noisy') {
        if (Math.random() > 0.7) {
          color = '#808080';
          isNoise = true;
        }
      }

      const pulseIntensity = 0.7 + 0.3 * Math.sin(performance.now() / 150 + p.x * 0.05);
      ctx.fillStyle = color;
      ctx.globalAlpha = isNoise ? 0.5 : pulseIntensity;

      if (p.type === 'dot') {
        ctx.fillRect(Math.floor(screenX), Math.floor(p.y - pixelSize / 2), pixelSize, pixelSize);
      } else if (p.type === 'dash') {
        ctx.fillRect(Math.floor(screenX), Math.floor(p.y - pixelSize / 2), pixelSize, pixelSize);
      }
    }
    ctx.globalAlpha = 1;

    for (const n of this.noisePattern) {
      ctx.fillStyle = '#808080';
      ctx.globalAlpha = n.ttl * 2;
      ctx.fillRect(Math.floor(n.x), Math.floor(n.y), 2, 2);
    }
    ctx.globalAlpha = 1;

    const indicatorX = width - 16;
    const indicatorY = 12;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 5, 0, Math.PI * 2);
    if (strength === 'clear') {
      ctx.fillStyle = '#22C55E';
      ctx.shadowColor = '#22C55E';
    } else {
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = '#EF4444';
    }
    ctx.shadowBlur = 8 + 4 * Math.sin(performance.now() / 200);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (this.currentMessage) {
      const scanY = (performance.now() / 50) % height;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.03)';
      ctx.fillRect(0, scanY, width, 2);
    }
  }
}
