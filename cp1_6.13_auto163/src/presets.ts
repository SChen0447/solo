export type PresetPattern = 'normal' | 'meteor' | 'rings' | 'spiral' | 'fountain' | 'heart';

export interface ParticleData {
  vx: number;
  vy: number;
  hueShift: number;
  easeOut: boolean;
  sineWobble: number;
}

export interface IPattern {
  getParticle(index: number, total: number, radius: number): ParticleData;
}

class NormalPattern implements IPattern {
  getParticle(_index: number, _total: number, radius: number): ParticleData {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.5 + Math.random() * 0.5) * (radius / 30);
    const minSpeed = 50 / 30;
    const actualSpeed = Math.max(minSpeed, speed);
    
    return {
      vx: Math.cos(angle) * actualSpeed,
      vy: Math.sin(angle) * actualSpeed,
      hueShift: (Math.random() - 0.5) * 30,
      easeOut: false,
      sineWobble: 0
    };
  }
}

class MeteorPattern implements IPattern {
  getParticle(index: number, total: number, radius: number): ParticleData {
    const angle = Math.PI / 4 + Math.random() * Math.PI / 2;
    const speed = (0.8 + Math.random() * 0.4) * (radius / 25);
    
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      hueShift: index < total * 0.7 ? 0 : (Math.random() - 0.5) * 60,
      easeOut: false,
      sineWobble: 0.15
    };
  }
}

class RingsPattern implements IPattern {
  getParticle(index: number, total: number, radius: number): ParticleData {
    const ringCount = 3;
    const ringIndex = index % ringCount;
    const particlesPerRing = Math.ceil(total / ringCount);
    const ringParticleIndex = Math.floor(index / ringCount);
    
    const baseAngle = (ringParticleIndex / particlesPerRing) * Math.PI * 2;
    const angle = baseAngle + (Math.random() - 0.5) * 0.1;
    
    const ringRadiusFactor = 0.5 + (ringIndex / ringCount) * 0.5;
    const speed = ringRadiusFactor * (radius / 30);
    
    const hueShifts = [0, 120, 240];
    const hueShift = hueShifts[ringIndex] + (Math.random() - 0.5) * 20;
    
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      hueShift,
      easeOut: true,
      sineWobble: 0
    };
  }
}

class SpiralPattern implements IPattern {
  getParticle(index: number, total: number, radius: number): ParticleData {
    const spiralArms = 4;
    const armIndex = index % spiralArms;
    const particlesPerArm = Math.ceil(total / spiralArms);
    const armProgress = Math.floor(index / spiralArms) / particlesPerArm;
    
    const baseAngle = (armIndex / spiralArms) * Math.PI * 2;
    const spiralAngle = baseAngle + armProgress * Math.PI * 2;
    const angle = spiralAngle + (Math.random() - 0.5) * 0.15;
    
    const speedFactor = 0.3 + armProgress * 0.7;
    const speed = speedFactor * (radius / 30);
    
    const hueShift = armProgress * 180 + armIndex * 90;
    
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      hueShift,
      easeOut: true,
      sineWobble: 0.2
    };
  }
}

class FountainPattern implements IPattern {
  getParticle(index: number, total: number, radius: number): ParticleData {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
    const speed = (0.6 + Math.random() * 0.6) * (radius / 25);
    
    const hueShift = (index / total) * 360 + (Math.random() - 0.5) * 30;
    
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      hueShift,
      easeOut: false,
      sineWobble: 0.1
    };
  }
}

class HeartPattern implements IPattern {
  getParticle(index: number, total: number, radius: number): ParticleData {
    const t = (index / total) * Math.PI * 2;
    
    const heartX = 16 * Math.pow(Math.sin(t), 3);
    const heartY = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    
    const scale = radius / 20;
    const targetX = heartX * scale;
    const targetY = heartY * scale;
    
    const distance = Math.sqrt(targetX * targetX + targetY * targetY);
    const angle = Math.atan2(targetY, targetX);
    const speed = (distance / 30) * (0.9 + Math.random() * 0.2);
    
    const hueShift = (Math.random() - 0.5) * 20;
    
    return {
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.5,
      vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.5,
      hueShift,
      easeOut: true,
      sineWobble: 0.05
    };
  }
}

export class PresetManager {
  private patterns: Map<PresetPattern, IPattern>;

  constructor() {
    this.patterns = new Map();
    this.patterns.set('normal', new NormalPattern());
    this.patterns.set('meteor', new MeteorPattern());
    this.patterns.set('rings', new RingsPattern());
    this.patterns.set('spiral', new SpiralPattern());
    this.patterns.set('fountain', new FountainPattern());
    this.patterns.set('heart', new HeartPattern());
  }

  public getPattern(pattern: PresetPattern): IPattern {
    return this.patterns.get(pattern) || this.patterns.get('normal')!;
  }

  public getAllPatterns(): PresetPattern[] {
    return Array.from(this.patterns.keys());
  }
}
