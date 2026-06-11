export type PartType = 'engine' | 'wing' | 'propeller' | 'cockpit';

export interface Part {
  id: string;
  type: PartType;
  name: string;
  description: string;
  stats: {
    speed?: number;
    stability?: number;
    durability?: number;
    acceleration?: number;
  };
  color: string;
  accentColor: string;
  width: number;
  height: number;
}

export interface SelectedParts {
  engine: Part | null;
  wing: Part | null;
  propeller: Part | null;
  cockpit: Part | null;
}

export type GamePhase = 'assembly' | 'racing' | 'finished';

export interface RaceState {
  position: { x: number; y: number };
  speed: number;
  durability: number;
  distance: number;
  collisions: number;
  startTime: number | null;
  endTime: number | null;
  isFinished: boolean;
  isShaking: boolean;
}

export interface ScoreData {
  totalTime: number;
  collisions: number;
  durability: number;
  totalScore: number;
}

export interface Obstacle {
  id: string;
  type: 'gear' | 'pipe' | 'clock';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  floatOffset: number;
  floatSpeed: number;
}

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function checkAABBCollision(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function calculateScore(
  time: number,
  collisions: number,
  durability: number
): number {
  const timeInSeconds = time / 1000;
  const timeScore = Math.max(0, 100 - Math.max(0, timeInSeconds - 15) * 3);
  const collisionScore = Math.max(0, 100 - collisions * 20);
  const durabilityScore = Math.max(0, durability);

  return Math.round(
    timeScore * 0.5 +
    collisionScore * 0.3 +
    durabilityScore * 0.2
  );
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playClickSound(): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn('Audio not supported');
  }
}

export function playMetalSnapSound(): void {
  try {
    const ctx = getAudioContext();
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(600, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(200, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn('Audio not supported');
  }
}

export function playCrashSound(): void {
  try {
    const ctx = getAudioContext();
    
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(ctx.currentTime);
  } catch (e) {
    console.warn('Audio not supported');
  }
}

export class EngineSound {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private baseFrequency: number = 80;

  start(): void {
    try {
      this.ctx = getAudioContext();
      this.oscillator = this.ctx.createOscillator();
      this.gainNode = this.ctx.createGain();

      this.oscillator.type = 'sawtooth';
      this.oscillator.frequency.value = this.baseFrequency;

      this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.5);

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.oscillator.start();
    } catch (e) {
      console.warn('Audio not supported');
    }
  }

  setDurability(durability: number): void {
    if (!this.oscillator || !this.ctx) return;

    const freq = durability < 30 
      ? this.baseFrequency * 0.6 
      : this.baseFrequency + (100 - durability) * 0.3;

    this.oscillator.frequency.linearRampToValueAtTime(
      freq, 
      this.ctx.currentTime + 0.1
    );
  }

  stop(): void {
    if (this.oscillator && this.gainNode && this.ctx) {
      this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      setTimeout(() => {
        if (this.oscillator) {
          try {
            this.oscillator.stop();
          } catch (e) {}
          this.oscillator.disconnect();
          this.oscillator = null;
        }
        if (this.gainNode) {
          this.gainNode.disconnect();
          this.gainNode = null;
        }
      }, 300);
    }
  }
}

export const ENGINE_PARTS: Part[] = [
  {
    id: 'engine-turbine',
    type: 'engine',
    name: '蒸汽涡轮引擎',
    description: '高速涡轮，动力强劲',
    stats: { speed: 180, durability: 0, acceleration: 30 },
    color: '#b87333',
    accentColor: '#d4a574',
    width: 60,
    height: 40
  },
  {
    id: 'engine-piston',
    type: 'engine',
    name: '双活塞引擎',
    description: '平衡型，可靠耐用',
    stats: { speed: 140, durability: 20, acceleration: 20 },
    color: '#8b6914',
    accentColor: '#c9a227',
    width: 55,
    height: 45
  },
  {
    id: 'engine-single',
    type: 'engine',
    name: '单缸引擎',
    description: '结构简单，极其耐用',
    stats: { speed: 100, durability: 30, acceleration: 10 },
    color: '#6b4423',
    accentColor: '#8b6b4a',
    width: 50,
    height: 35
  }
];

export const WING_PARTS: Part[] = [
  {
    id: 'wing-biplane',
    type: 'wing',
    name: '双翼式机翼',
    description: '稳定性极佳，速度较慢',
    stats: { stability: 90, speed: -20 },
    color: '#8b4513',
    accentColor: '#cd853f',
    width: 80,
    height: 50
  },
  {
    id: 'wing-mono',
    type: 'wing',
    name: '单翼式机翼',
    description: '平衡型设计',
    stats: { stability: 60, speed: 0 },
    color: '#a0522d',
    accentColor: '#deb887',
    width: 70,
    height: 35
  },
  {
    id: 'wing-swept',
    type: 'wing',
    name: '后掠翼',
    description: '高速设计，稳定性低',
    stats: { stability: 30, speed: 25 },
    color: '#654321',
    accentColor: '#987654',
    width: 75,
    height: 30
  }
];

export const PROPELLER_PARTS: Part[] = [
  {
    id: 'prop-turbine',
    type: 'propeller',
    name: '涡轮螺旋桨',
    description: '高速推进',
    stats: { speed: 20, acceleration: 25 },
    color: '#708090',
    accentColor: '#b0c4de',
    width: 45,
    height: 45
  },
  {
    id: 'prop-three',
    type: 'propeller',
    name: '三叶螺旋桨',
    description: '平衡型',
    stats: { speed: 10, acceleration: 15 },
    color: '#556b2f',
    accentColor: '#8fbc8f',
    width: 40,
    height: 40
  },
  {
    id: 'prop-two',
    type: 'propeller',
    name: '双叶螺旋桨',
    description: '低速高扭矩',
    stats: { speed: 0, acceleration: 10, durability: 10 },
    color: '#4a4a4a',
    accentColor: '#808080',
    width: 35,
    height: 35
  }
];

export const COCKPIT_PARTS: Part[] = [
  {
    id: 'cockpit-brass',
    type: 'cockpit',
    name: '黄铜座舱',
    description: '经典设计，耐久度高',
    stats: { durability: 20, stability: 10 },
    color: '#b8860b',
    accentColor: '#daa520',
    width: 50,
    height: 45
  },
  {
    id: 'cockpit-glass',
    type: 'cockpit',
    name: '玻璃座舱',
    description: '视野开阔，耐久度低',
    stats: { durability: -10, stability: -5, speed: 5 },
    color: '#4682b4',
    accentColor: '#87ceeb',
    width: 45,
    height: 40
  },
  {
    id: 'cockpit-armor',
    type: 'cockpit',
    name: '装甲座舱',
    description: '最重最耐用',
    stats: { durability: 40, stability: 20, speed: -15 },
    color: '#2f4f4f',
    accentColor: '#5f9ea0',
    width: 55,
    height: 50
  }
];

export const ALL_PARTS: Part[] = [
  ...ENGINE_PARTS,
  ...WING_PARTS,
  ...PROPELLER_PARTS,
  ...COCKPIT_PARTS
];

export const TRACK_LENGTH = 3000;
export const TRACK_WIDTH = 800;
export const TRACK_HEIGHT = 400;
export const INITIAL_DURABILITY = 100;
export const COLLISION_DAMAGE = 15;
export const FRAME_RATE = 60;

export function generateObstacles(): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const types: ('gear' | 'pipe' | 'clock')[] = ['gear', 'pipe', 'clock', 'gear', 'pipe'];
  
  for (let i = 0; i < 5; i++) {
    const type = types[i];
    let width = 60;
    let height = 60;
    
    if (type === 'pipe') {
      width = 40;
      height = 100;
    } else if (type === 'clock') {
      width = 80;
      height = 120;
    }
    
    obstacles.push({
      id: `obstacle-${i}`,
      type,
      x: 600 + i * 500 + Math.random() * 200,
      y: 50 + Math.random() * (TRACK_HEIGHT - 150),
      width,
      height,
      rotation: 0,
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.5 + Math.random() * 0.5
    });
  }
  
  return obstacles;
}

export function calculateAircraftStats(parts: SelectedParts): { speed: number; durability: number; stability: number } {
  let baseSpeed = 0;
  let baseDurability = INITIAL_DURABILITY;
  let baseStability = 50;

  if (parts.engine) {
    baseSpeed += parts.engine.stats.speed || 0;
    baseDurability += parts.engine.stats.durability || 0;
  }
  if (parts.wing) {
    baseSpeed += parts.wing.stats.speed || 0;
    baseStability += parts.wing.stats.stability || 0;
  }
  if (parts.propeller) {
    baseSpeed += parts.propeller.stats.speed || 0;
    baseDurability += parts.propeller.stats.durability || 0;
  }
  if (parts.cockpit) {
    baseDurability += parts.cockpit.stats.durability || 0;
    baseStability += parts.cockpit.stats.stability || 0;
    baseSpeed += parts.cockpit.stats.speed || 0;
  }

  return {
    speed: Math.max(50, Math.min(250, baseSpeed)),
    durability: Math.max(30, Math.min(150, baseDurability)),
    stability: Math.max(10, Math.min(100, baseStability))
  };
}
