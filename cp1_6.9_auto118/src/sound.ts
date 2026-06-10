import p5 from 'p5';

export interface SoundWaveConfig {
  frequency: number;
  color: p5.Color;
  key: string;
}

export class SoundWave {
  public x: number;
  public y: number;
  public radius: number;
  public maxRadius: number;
  public color: p5.Color;
  public life: number;
  public maxLife: number;
  public frequency: number;
  public isReflected: boolean;
  public velocityX: number;
  public velocityY: number;
  public active: boolean;

  private p: p5;

  constructor(p: p5, x: number, y: number, color: p5.Color, frequency: number, scale: number = 1) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.radius = 0.2 * scale;
    this.maxRadius = 2.0 * scale;
    this.color = color;
    this.life = 0;
    this.maxLife = 1.5;
    this.frequency = frequency;
    this.isReflected = false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.active = true;
  }

  update(dt: number, unitScale: number): void {
    if (!this.active) return;
    this.life += dt;
    const progress = Math.min(this.life / this.maxLife, 1);
    this.radius = 0.2 * unitScale + (this.maxRadius - 0.2) * unitScale * progress;
    if (this.isReflected) {
      this.x += this.velocityX * dt;
      this.y += this.velocityY * dt;
    }
    if (this.life >= this.maxLife) {
      this.active = false;
    }
  }

  draw(p: p5, unitScale: number): void {
    if (!this.active) return;
    const alpha = Math.max(0, 1 - this.life / this.maxLife);
    p.push();
    p.noFill();
    const r = p.red(this.color);
    const g = p.green(this.color);
    const b = p.blue(this.color);
    for (let i = 0; i < 3; i++) {
      const ringRadius = this.radius - i * 8;
      if (ringRadius > 0) {
        p.stroke(r, g, b, alpha * (200 - i * 50));
        p.strokeWeight(3 - i);
        p.ellipse(this.x, this.y, ringRadius * 2, ringRadius * 2);
      }
    }
    p.pop();
  }

  contains(px: number, py: number, unitScale: number): boolean {
    const dist = Math.sqrt((px - this.x) ** 2 + (py - this.y) ** 2);
    return dist <= this.radius * unitScale;
  }
}

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private p: p5;
  public waves: SoundWave[] = [];
  public readonly MAX_WAVES = 500;

  constructor(p: p5) {
    this.p = p;
  }

  private initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playTone(frequency: number, duration: number = 0.3, volume: number = 0.1): void {
    this.initAudio();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  getConfigForKey(key: string): SoundWaveConfig {
    const keyUpper = key.toUpperCase();
    const keyCode = keyUpper.charCodeAt(0) - 65;
    const normalized = keyCode / 25;

    let frequency: number;
    let color: p5.Color;
    let freqBand: string;

    if (keyCode >= 0 && keyCode <= 5) {
      freqBand = 'low';
      frequency = 220 + (keyCode / 5) * 180;
      const t = keyCode / 5;
      const r = Math.floor(68 + t * 68);
      const g = Math.floor(102 + t * 68);
      const b = Math.floor(255);
      color = this.p.color(r, g, b, 200);
    } else if (keyCode >= 6 && keyCode <= 14) {
      freqBand = 'mid';
      frequency = 400 + ((keyCode - 6) / 8) * 300;
      const t = (keyCode - 6) / 8;
      const r = Math.floor(68 + t * 68);
      const g = Math.floor(255);
      const b = Math.floor(102 + t * 68);
      color = this.p.color(r, g, b, 200);
    } else {
      freqBand = 'high';
      frequency = 700 + ((keyCode - 15) / 10) * 500;
      const t = (keyCode - 15) / 10;
      const r = Math.floor(255);
      const g = Math.floor(68 + t * 68);
      const b = Math.floor(102 + t * 68);
      color = this.p.color(r, g, b, 200);
    }

    return { frequency, color, key: keyUpper };
  }

  emitWave(x: number, y: number, key: string, unitScale: number): SoundWave | null {
    if (this.waves.length >= this.MAX_WAVES) return null;
    const config = this.getConfigForKey(key);
    this.playTone(config.frequency);
    const wave = new SoundWave(this.p, x, y, config.color, config.frequency, unitScale);
    this.waves.push(wave);
    return wave;
  }

  emitReflectedWave(x: number, y: number, originalWave: SoundWave, reflectColor: p5.Color, angle: number, unitScale: number): SoundWave | null {
    if (this.waves.length >= this.MAX_WAVES) return null;
    const r = (this.p.red(originalWave.color) + this.p.red(reflectColor)) / 2;
    const g = (this.p.green(originalWave.color) + this.p.green(reflectColor)) / 2;
    const b = (this.p.blue(originalWave.color) + this.p.blue(reflectColor)) / 2;
    const mixedColor = this.p.color(r, g, b, 200);
    const wave = new SoundWave(this.p, x, y, mixedColor, originalWave.frequency, unitScale * 0.5);
    wave.isReflected = true;
    const speed = 100 * unitScale;
    wave.velocityX = Math.cos(angle) * speed;
    wave.velocityY = Math.sin(angle) * speed;
    wave.maxRadius = originalWave.maxRadius * 0.5;
    this.waves.push(wave);
    return wave;
  }

  update(dt: number, unitScale: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      this.waves[i].update(dt, unitScale);
      if (!this.waves[i].active) {
        this.waves.splice(i, 1);
      }
    }
  }

  draw(unitScale: number): void {
    for (const wave of this.waves) {
      wave.draw(this.p, unitScale);
    }
  }

  clear(): void {
    this.waves = [];
  }
}
