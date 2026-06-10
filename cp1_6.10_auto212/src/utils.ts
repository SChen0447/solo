export interface TextItem {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
}

export interface DrawPath {
  points: { x: number; y: number }[];
  color: string;
  thickness: number;
}

export type WeatherType = 'sunny' | 'rain' | 'snow' | 'sunset';

export interface Postcard {
  id: string;
  shareCode: string;
  backgroundImage: string | null;
  backgroundColor: string;
  textItems: TextItem[];
  drawPaths: DrawPath[];
  weatherType: WeatherType;
  createdAt: number;
  thumbnail: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  angle: number;
}

const STORAGE_KEY = 'time_postcards';

export function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function savePostcards(postcards: Postcard[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(postcards));
  } catch (e) {
    console.error('保存失败:', e);
  }
}

export function loadPostcards(): Postcard[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('加载失败:', e);
    return [];
  }
}

export function savePostcard(postcard: Postcard): void {
  const postcards = loadPostcards();
  const index = postcards.findIndex(p => p.id === postcard.id);
  if (index >= 0) {
    postcards[index] = postcard;
  } else {
    postcards.unshift(postcard);
  }
  savePostcards(postcards);
}

export function deletePostcard(id: string): void {
  const postcards = loadPostcards().filter(p => p.id !== id);
  savePostcards(postcards);
}

export function getPostcardByShareCode(shareCode: string): Postcard | null {
  const postcards = loadPostcards();
  return postcards.find(p => p.shareCode === shareCode) || null;
}

export function getPostcardById(id: string): Postcard | null {
  const postcards = loadPostcards();
  return postcards.find(p => p.id === id) || null;
}

const weatherConfigs: Record<WeatherType, {
  particleCount: number;
  colors: string[];
  sizeRange: [number, number];
  speedRange: [number, number];
  opacityRange: [number, number];
}> = {
  sunny: {
    particleCount: 60,
    colors: ['#FFD700', '#FFA500', '#FFEC8B'],
    sizeRange: [1, 3],
    speedRange: [0.1, 0.3],
    opacityRange: [0.3, 0.9]
  },
  rain: {
    particleCount: 128,
    colors: ['#4A90D9', '#5B9BD5', '#7CB7E8'],
    sizeRange: [8, 15],
    speedRange: [8, 12],
    opacityRange: [0.4, 0.7]
  },
  snow: {
    particleCount: 200,
    colors: ['#FFFFFF', '#F0F8FF', '#E6E6FA'],
    sizeRange: [2, 6],
    speedRange: [0.5, 1.5],
    opacityRange: [0.5, 0.9]
  },
  sunset: {
    particleCount: 256,
    colors: ['#FF8C00', '#FF6347', '#FFA07A', '#FFD700'],
    sizeRange: [3, 8],
    speedRange: [0.3, 0.8],
    opacityRange: [0.2, 0.6]
  }
};

export class WeatherParticleSystem {
  private particles: Particle[] = [];
  private width: number;
  private height: number;
  private weatherType: WeatherType;
  private animationId: number | null = null;
  private onFrame: () => void;

  constructor(
    width: number,
    height: number,
    weatherType: WeatherType,
    onFrame: () => void
  ) {
    this.width = width;
    this.height = height;
    this.weatherType = weatherType;
    this.onFrame = onFrame;
    this.initParticles();
  }

  private initParticles(): void {
    const config = weatherConfigs[this.weatherType];
    this.particles = [];

    for (let i = 0; i < config.particleCount; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(randomY: boolean = false): Particle {
    const config = weatherConfigs[this.weatherType];
    const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
    const speed = config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]);
    const opacity = config.opacityRange[0] + Math.random() * (config.opacityRange[1] - config.opacityRange[0]);
    const color = config.colors[Math.floor(Math.random() * config.colors.length)];

    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -size * 2,
      vx: this.weatherType === 'snow' ? (Math.random() - 0.5) * 0.5 : 0,
      vy: speed,
      size,
      opacity,
      color,
      life: 0,
      maxLife: this.weatherType === 'sunny' ? 60 + Math.random() * 120 : Infinity,
      angle: Math.random() * Math.PI * 2
    };
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public setWeatherType(type: WeatherType): void {
    this.weatherType = type;
    this.initParticles();
  }

  public update(): void {
    const config = weatherConfigs[this.weatherType];

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (this.weatherType === 'sunny') {
        p.life++;
        p.opacity = config.opacityRange[0] +
          Math.sin(p.life * 0.05) * (config.opacityRange[1] - config.opacityRange[0]) * 0.5 +
          (config.opacityRange[1] - config.opacityRange[0]) * 0.5;
        p.x += Math.sin(p.angle + p.life * 0.02) * 0.2;
        p.y += Math.cos(p.angle + p.life * 0.02) * 0.2;

        if (p.life > p.maxLife) {
          this.particles[i] = this.createParticle(true);
        }
      } else {
        p.y += p.vy;
        p.x += p.vx;

        if (this.weatherType === 'snow') {
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vx = Math.max(-0.5, Math.min(0.5, p.vx));
        }

        if (p.y > this.height + p.size * 2) {
          this.particles[i] = this.createParticle(false);
        }
      }

      if (p.x < -20) p.x = this.width + 10;
      if (p.x > this.width + 20) p.x = -10;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity;

      switch (this.weatherType) {
        case 'sunny':
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'rain':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size / 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 1, p.y + p.size);
          ctx.stroke();
          break;

        case 'snow':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'sunset':
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      ctx.restore();
    }
  }

  public start(): void {
    const loop = () => {
      this.update();
      this.onFrame();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public destroy(): void {
    this.stop();
    this.particles = [];
  }
}

export class BackgroundMusicPlayer {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.3;
  private nextNoteTime: number = 0;
  private schedulerId: number | null = null;
  private currentNote: number = 0;

  private melody = [
    { note: 523.25, duration: 0.4 },
    { note: 587.33, duration: 0.4 },
    { note: 659.25, duration: 0.4 },
    { note: 698.46, duration: 0.6 },
    { note: 659.25, duration: 0.4 },
    { note: 587.33, duration: 0.4 },
    { note: 523.25, duration: 0.8 },
    { note: 0, duration: 0.2 },
    { note: 493.88, duration: 0.4 },
    { note: 523.25, duration: 0.4 },
    { note: 587.33, duration: 0.4 },
    { note: 659.25, duration: 0.6 },
    { note: 587.33, duration: 0.4 },
    { note: 523.25, duration: 0.4 },
    { note: 493.88, duration: 0.8 },
    { note: 0, duration: 0.2 }
  ];

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  public async play(): Promise<void> {
    if (this.isPlaying) return;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;
    this.nextNoteTime = this.audioContext.currentTime;
    this.currentNote = 0;
    this.scheduler();
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.schedulerId !== null) {
      clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private scheduler = (): void => {
    if (!this.isPlaying || !this.audioContext) return;

    while (this.nextNoteTime < this.audioContext.currentTime + 0.1) {
      this.scheduleNote(this.currentNote, this.nextNoteTime);
      const note = this.melody[this.currentNote];
      this.nextNoteTime += note.duration;
      this.currentNote = (this.currentNote + 1) % this.melody.length;
    }

    this.schedulerId = window.setTimeout(this.scheduler, 25);
  };

  private scheduleNote(noteIndex: number, time: number): void {
    if (!this.audioContext) return;

    const note = this.melody[noteIndex];
    if (note.note === 0) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = note.note;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(this.volume * 0.5, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + note.duration - 0.05);

    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = note.note / 2;
    gain2.gain.setValueAtTime(0, time);
    gain2.gain.linearRampToValueAtTime(this.volume * 0.2, time + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + note.duration - 0.05);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc2.connect(gain2);
    gain2.connect(this.audioContext.destination);

    osc.start(time);
    osc.stop(time + note.duration);
    osc2.start(time);
    osc2.stop(time + note.duration);
  }

  public destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
