import type p5 from 'p5';
import { Synth, type WaveformType } from './synth';

export interface WavePoint {
  x: number;
  y: number;
  baseY: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface WaveNode {
  index: number;
  x: number;
  baseY: number;
  offset: number;
}

export class Wave {
  points: WavePoint[];
  frequency: number;
  amplitude: number;
  phase: number;
  color: string;
  waveform: WaveformType;
  synth: Synth;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private nodes: WaveNode[] = [];
  id: number;

  static idCounter = 0;

  constructor(
    points: WavePoint[],
    frequency: number,
    amplitude: number,
    color: string,
    waveform: WaveformType,
    synth: Synth
  ) {
    this.id = ++Wave.idCounter;
    this.points = points;
    this.frequency = frequency;
    this.amplitude = amplitude;
    this.phase = Math.random() * Math.PI * 2;
    this.color = color;
    this.waveform = waveform;
    this.synth = synth;
    this.buildNodes();
    this.startSound();
  }

  private buildNodes(): void {
    this.nodes = [];
    if (this.points.length < 2) return;
    let accumulated = 0;
    const step = 20;
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen === 0) continue;
      let localDist = accumulated;
      while (localDist <= accumulated + segLen) {
        const t = (localDist - accumulated) / segLen;
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;
        this.nodes.push({
          index: i,
          x,
          baseY: y,
          offset: Math.random() * Math.PI * 2
        });
        localDist += step;
      }
      accumulated += segLen;
    }
  }

  private startSound(): void {
    const { osc, gain } = this.synth.createOscillator(
      this.frequency,
      this.waveform as OscillatorType,
      this.amplitude * 0.25
    );
    this.oscillator = osc;
    this.gainNode = gain;
  }

  update(time: number): void {
    const wavePhase = (time * this.frequency * Math.PI * 2) / 1000 + this.phase;
    const vibAmp = this.amplitude * 10;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const localPhase = wavePhase + i * 0.1;
      p.y = p.baseY + Math.sin(localPhase) * vibAmp;
    }
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const localPhase = wavePhase + n.offset;
      (n as any).y = n.baseY + Math.sin(localPhase) * 3;
    }
  }

  draw(p: p5): void {
    if (this.points.length < 2) return;
    p.noFill();
    p.stroke(this.color);
    p.strokeWeight(2.5);
    p.shadowBlur = 12;
    p.shadowColor = this.color;
    p.beginShape();
    for (const pt of this.points) {
      p.vertex(pt.x, pt.y);
    }
    p.endShape();
    p.shadowBlur = 0;

    for (const n of this.nodes) {
      const ny = (n as any).y !== undefined ? (n as any).y : n.baseY;
      p.noStroke();
      p.shadowBlur = 16;
      p.shadowColor = '#ffffff';
      p.fill('#ffffff');
      p.circle(n.x, ny, 4);
      p.shadowBlur = 8;
      p.shadowColor = this.color;
      p.fill(this.color);
      p.circle(n.x, ny, 3);
    }
    p.shadowBlur = 0;
  }

  getNodes(): { x: number; y: number }[] {
    return this.nodes.map((n) => ({
      x: n.x,
      y: (n as any).y !== undefined ? (n as any).y : n.baseY
    }));
  }

  checkInterference(other: Wave): { x: number; y: number; color: string }[] | null {
    const threshold = 5;
    const hits: { x: number; y: number; color: string }[] = [];
    const myNodes = this.getNodes();
    const otherNodes = other.getNodes();
    for (const a of myNodes) {
      for (const b of otherNodes) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          const mixed = mixColors(this.color, other.color);
          hits.push({
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            color: mixed
          });
        }
      }
    }
    return hits.length > 0 ? hits : null;
  }

  triggerInterferenceSound(frequencies: number[]): void {
    const lcm = this.synth.getLCM(frequencies);
    this.synth.playHarmony([lcm], this.waveform as OscillatorType, 1.2);
  }

  updateAmplitude(amp: number): void {
    this.amplitude = amp;
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(
        amp * 0.25,
        this.synth.audioContext.currentTime,
        0.05
      );
    }
  }

  stop(): void {
    if (this.oscillator && this.gainNode) {
      this.synth.stopOscillator(this.oscillator, this.gainNode);
      this.oscillator = null;
      this.gainNode = null;
    }
  }
}

export function mixColors(hex1: string, hex2: string): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return '#ffffff';
  const r = Math.min(255, Math.floor((c1.r + c2.r) / 2 + 30));
  const g = Math.min(255, Math.floor((c1.g + c2.g) / 2 + 30));
  const b = Math.min(255, Math.floor((c1.b + c2.b) / 2 + 30));
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

export function colorFromDirection(dx: number, dy: number): string {
  const angle = Math.atan2(dy, dx);
  const t = (angle + Math.PI) / (Math.PI * 2);
  const r1 = 255,
    g1 = 68,
    b1 = 102;
  const r2 = 68,
    g2 = 136,
    b2 = 255;
  const r = Math.floor(r1 + (r2 - r1) * t);
  const g = Math.floor(g1 + (g2 - g1) * t);
  const b = Math.floor(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

export function createParticles(
  x: number,
  y: number,
  color: string,
  count: number = 8
): Particle[] {
  const particles: Particle[] = [];
  const n = Math.floor(count + Math.random() * (count * 0.5));
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 180,
      maxLife: 180,
      color,
      size: 2 + Math.random() * 2
    });
  }
  return particles;
}

export function updateAndDrawParticles(p: p5, particles: Particle[]): Particle[] {
  const alive: Particle[] = [];
  for (const pt of particles) {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vx *= 0.98;
    pt.vy *= 0.98;
    pt.life--;
    if (pt.life > 0) {
      const alpha = pt.life / pt.maxLife;
      p.noStroke();
      p.shadowBlur = 10;
      p.shadowColor = pt.color;
      p.fill(pt.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
      p.circle(pt.x, pt.y, pt.size);
      alive.push(pt);
    }
  }
  p.shadowBlur = 0;
  return alive;
}
