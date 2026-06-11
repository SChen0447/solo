import * as THREE from 'three';

export interface Constellation {
  id: string;
  name: string;
  color: string;
  points: THREE.Vector3[];
  connections: [number, number][];
  divinations: string[];
}

export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  color: THREE.Color;
  originalPosition: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
}

export interface LightThread {
  start: THREE.Vector3;
  end: THREE.Vector3;
  control1: THREE.Vector3;
  control2: THREE.Vector3;
  startVel: THREE.Vector3;
  endVel: THREE.Vector3;
}

export interface ChainLink {
  particleA: number;
  particleB: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface SummonState {
  isSummoning: boolean;
  currentConstellation: Constellation | null;
  summonProgress: number;
  matchTime: number;
  matchThreshold: number;
  flashCount: number;
  flashTimer: number;
  spiritVisible: boolean;
  spiritTimer: number;
  bestMatchScore: number;
  bestMatchName: string;
}

const SPHERE_RADIUS = 2.0;
const PARTICLE_COUNT = 500;
const LIGHT_THREAD_COUNT = 20;
const MATCH_THRESHOLD = 0.85;
const MATCH_DURATION = 2.0;
const SPIRIT_DURATION = 5.0;
const FLASH_COUNT = 3;
const FLASH_INTERVAL = 0.3;
const CHAIN_DISTANCE = 0.3;
const CHAIN_LIFE = 0.5;
const MAX_CHAINS = 100;

const iceBlue = new THREE.Color(0xa0d8f1);
const palePurple = new THREE.Color(0xc8a2f6);

function randomInSphere(radius: number): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(Math.random());
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

function lerpColor(t: number): THREE.Color {
  const color = new THREE.Color();
  color.r = iceBlue.r + (palePurple.r - iceBlue.r) * t;
  color.g = iceBlue.g + (palePurple.g - iceBlue.g) * t;
  color.b = iceBlue.b + (palePurple.b - iceBlue.b) * t;
  return color;
}

function createSwanConstellation(): Constellation {
  const points: THREE.Vector3[] = [];
  const r = SPHERE_RADIUS * 0.7;
  points.push(new THREE.Vector3(0, r * 0.9, 0));
  points.push(new THREE.Vector3(0, r * 0.5, 0));
  points.push(new THREE.Vector3(0, r * 0.1, 0));
  points.push(new THREE.Vector3(-r * 0.6, -r * 0.2, 0));
  points.push(new THREE.Vector3(r * 0.6, -r * 0.2, 0));
  points.push(new THREE.Vector3(0, -r * 0.5, 0));
  points.push(new THREE.Vector3(-r * 0.3, r * 0.3, r * 0.2));
  points.push(new THREE.Vector3(r * 0.3, r * 0.3, -r * 0.2));
  points.push(new THREE.Vector3(-r * 0.15, -r * 0.7, r * 0.1));
  points.push(new THREE.Vector3(r * 0.15, -r * 0.7, -r * 0.1));
  points.push(new THREE.Vector3(0, r * 0.7, r * 0.15));

  const connections: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [2, 4], [2, 5],
    [1, 6], [1, 7], [5, 8], [5, 9], [0, 10]
  ];

  return {
    id: 'swan',
    name: '天鹅座',
    color: '#ffd700',
    points,
    connections,
    divinations: [
      '优雅的天鹅在星河中展翅，你的灵魂将在艺术之美中找到归宿。',
      '北方之星指引方向，追随内心的光芒，答案就在你心中。',
      '真爱如天鹅般纯洁而忠诚，耐心等待，它将翩然而至。',
      '天鹅的歌声预示着转变的到来，拥抱变化，你将获得新生。'
    ]
  };
}

function createAndromedaConstellation(): Constellation {
  const points: THREE.Vector3[] = [];
  const r = SPHERE_RADIUS * 0.7;
  points.push(new THREE.Vector3(0, r * 0.8, 0));
  points.push(new THREE.Vector3(-r * 0.2, r * 0.4, r * 0.1));
  points.push(new THREE.Vector3(-r * 0.4, 0, r * 0.2));
  points.push(new THREE.Vector3(-r * 0.6, -r * 0.4, r * 0.1));
  points.push(new THREE.Vector3(-r * 0.3, -r * 0.2, -r * 0.3));
  points.push(new THREE.Vector3(r * 0.1, r * 0.2, -r * 0.2));
  points.push(new THREE.Vector3(r * 0.4, r * 0.5, -r * 0.1));
  points.push(new THREE.Vector3(r * 0.2, -r * 0.3, r * 0.4));
  points.push(new THREE.Vector3(-r * 0.1, -r * 0.6, -r * 0.2));
  points.push(new THREE.Vector3(r * 0.5, 0, r * 0.3));
  points.push(new THREE.Vector3(0, r * 0.6, r * 0.3));
  points.push(new THREE.Vector3(-r * 0.5, r * 0.2, -r * 0.3));

  const connections: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [1, 5], [5, 6],
    [2, 4], [3, 8], [4, 7], [5, 10], [2, 11], [6, 9]
  ];

  return {
    id: 'andromeda',
    name: '仙女座',
    color: '#ff69b4',
    points,
    connections,
    divinations: [
      '仙女的光辉洒落人间，你的梦想即将绽放光芒。',
      '被锁链束缚的终将自由，勇敢打破桎梏，新世界在等待。',
      '浪漫的邂逅即将来临，敞开心扉，迎接爱的降临。',
      '内在的力量远超想象，相信自己，你能创造奇迹。'
    ]
  };
}

function createLibraConstellation(): Constellation {
  const points: THREE.Vector3[] = [];
  const r = SPHERE_RADIUS * 0.7;
  points.push(new THREE.Vector3(0, r * 0.6, 0));
  points.push(new THREE.Vector3(-r * 0.4, r * 0.2, r * 0.1));
  points.push(new THREE.Vector3(r * 0.4, r * 0.2, -r * 0.1));
  points.push(new THREE.Vector3(-r * 0.6, -r * 0.1, r * 0.2));
  points.push(new THREE.Vector3(r * 0.6, -r * 0.1, -r * 0.2));
  points.push(new THREE.Vector3(-r * 0.5, -r * 0.4, r * 0.15));
  points.push(new THREE.Vector3(r * 0.5, -r * 0.4, -r * 0.15));
  points.push(new THREE.Vector3(0, -r * 0.6, 0));
  points.push(new THREE.Vector3(-r * 0.2, 0, r * 0.4));
  points.push(new THREE.Vector3(r * 0.2, 0, -r * 0.4));
  points.push(new THREE.Vector3(0, r * 0.3, r * 0.3));
  points.push(new THREE.Vector3(0, r * 0.3, -r * 0.3));

  const connections: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6],
    [5, 7], [6, 7], [1, 8], [2, 9], [0, 10], [0, 11]
  ];

  return {
    id: 'libra',
    name: '天秤座',
    color: '#00ffd5',
    points,
    connections,
    divinations: [
      '天平的两端终将平衡，正义与公平会站在你这边。',
      '做出抉择的时刻到了，聆听内心的声音，它不会错。',
      '和谐与美好即将降临，你的优雅将为你赢得一切。',
      '权衡利弊后再行动，谨慎是你最强大的武器。'
    ]
  };
}

function createOrionConstellation(): Constellation {
  const points: THREE.Vector3[] = [];
  const r = SPHERE_RADIUS * 0.7;
  points.push(new THREE.Vector3(0, r * 0.8, 0));
  points.push(new THREE.Vector3(-r * 0.3, r * 0.5, r * 0.1));
  points.push(new THREE.Vector3(r * 0.3, r * 0.5, -r * 0.1));
  points.push(new THREE.Vector3(-r * 0.15, r * 0.2, 0));
  points.push(new THREE.Vector3(0, r * 0.2, r * 0.05));
  points.push(new THREE.Vector3(r * 0.15, r * 0.2, -r * 0.05));
  points.push(new THREE.Vector3(-r * 0.2, -r * 0.1, r * 0.1));
  points.push(new THREE.Vector3(r * 0.2, -r * 0.1, -r * 0.1));
  points.push(new THREE.Vector3(-r * 0.4, -r * 0.5, r * 0.2));
  points.push(new THREE.Vector3(r * 0.4, -r * 0.5, -r * 0.2));
  points.push(new THREE.Vector3(-r * 0.3, r * 0.7, r * 0.2));
  points.push(new THREE.Vector3(r * 0.3, r * 0.7, -r * 0.2));

  const connections: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 5], [3, 4], [4, 5],
    [3, 6], [5, 7], [6, 8], [7, 9], [1, 10], [2, 11]
  ];

  return {
    id: 'orion',
    name: '猎户座',
    color: '#ff4444',
    points,
    connections,
    divinations: [
      '猎人的勇气注入你的血脉，面对挑战，你将无往不利。',
      '腰带三星指引征途，坚定前行，荣耀在前方等待。',
      '强大的盟友即将出现，携手并肩，共同征服困难。',
      '冬季的星空下许下愿望，猎户会为你见证誓言。'
    ]
  };
}

function createUrsaMajorConstellation(): Constellation {
  const points: THREE.Vector3[] = [];
  const r = SPHERE_RADIUS * 0.7;
  points.push(new THREE.Vector3(-r * 0.6, r * 0.3, r * 0.2));
  points.push(new THREE.Vector3(-r * 0.3, r * 0.5, r * 0.1));
  points.push(new THREE.Vector3(r * 0.1, r * 0.45, 0));
  points.push(new THREE.Vector3(r * 0.4, r * 0.3, -r * 0.1));
  points.push(new THREE.Vector3(r * 0.3, -r * 0.1, r * 0.1));
  points.push(new THREE.Vector3(r * 0.05, -r * 0.3, r * 0.2));
  points.push(new THREE.Vector3(-r * 0.25, -r * 0.25, r * 0.25));
  points.push(new THREE.Vector3(-r * 0.5, 0, r * 0.3));
  points.push(new THREE.Vector3(-r * 0.4, r * 0.1, r * 0.35));
  points.push(new THREE.Vector3(r * 0.2, r * 0.1, r * 0.15));
  points.push(new THREE.Vector3(-r * 0.15, r * 0.55, r * 0.15));
  points.push(new THREE.Vector3(r * 0.5, r * 0.05, 0));

  const connections: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
    [6, 7], [7, 0], [1, 8], [3, 9], [2, 10], [4, 11]
  ];

  return {
    id: 'ursa-major',
    name: '大熊座',
    color: '#44aaff',
    points,
    connections,
    divinations: [
      '北斗七星指引方向，迷茫之时，抬头仰望星空。',
      '伟大的熊灵赐予力量，内心的坚韧将支撑你度过难关。',
      '守护与被守护，你身边的人需要你的庇护。',
      '北方的智者带来启示，古老的智慧能解答你的疑惑。'
    ]
  };
}

function createPhoenixConstellation(): Constellation {
  const points: THREE.Vector3[] = [];
  const r = SPHERE_RADIUS * 0.7;
  points.push(new THREE.Vector3(0, r * 0.7, 0));
  points.push(new THREE.Vector3(-r * 0.2, r * 0.4, r * 0.15));
  points.push(new THREE.Vector3(r * 0.2, r * 0.4, -r * 0.15));
  points.push(new THREE.Vector3(0, r * 0.1, 0));
  points.push(new THREE.Vector3(-r * 0.4, -r * 0.1, r * 0.3));
  points.push(new THREE.Vector3(r * 0.4, -r * 0.1, -r * 0.3));
  points.push(new THREE.Vector3(-r * 0.2, -r * 0.4, r * 0.15));
  points.push(new THREE.Vector3(r * 0.2, -r * 0.4, -r * 0.15));
  points.push(new THREE.Vector3(0, -r * 0.7, 0));
  points.push(new THREE.Vector3(-r * 0.5, r * 0.2, r * 0.2));
  points.push(new THREE.Vector3(r * 0.5, r * 0.2, -r * 0.2));
  points.push(new THREE.Vector3(0, -r * 0.2, r * 0.4));

  const connections: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5],
    [4, 6], [5, 7], [6, 8], [7, 8], [1, 9], [2, 10], [3, 11]
  ];

  return {
    id: 'phoenix',
    name: '凤凰座',
    color: '#ff8800',
    points,
    connections,
    divinations: [
      '浴火重生的时刻到来，毁灭之后是崭新的开始。',
      '不死鸟的火焰净化一切，痛苦终将化为力量。',
      '绝境中蕴含转机，相信奇迹，它就会发生。',
      '你的灵魂如凤凰般不朽，每次陨落都是为了更璀璨的重生。'
    ]
  };
}

const CONSTELLATIONS: Constellation[] = [
  createSwanConstellation(),
  createAndromedaConstellation(),
  createLibraConstellation(),
  createOrionConstellation(),
  createUrsaMajorConstellation(),
  createPhoenixConstellation()
];

export class SpiritSystem {
  private particles: ParticleData[] = [];
  private lightThreads: LightThread[] = [];
  private constellations: Constellation[] = CONSTELLATIONS;
  private chainLinks: ChainLink[] = [];
  private summonState: SummonState = {
    isSummoning: false,
    currentConstellation: null,
    summonProgress: 0,
    matchTime: 0,
    matchThreshold: MATCH_THRESHOLD,
    flashCount: 0,
    flashTimer: 0,
    spiritVisible: false,
    spiritTimer: 0,
    bestMatchScore: 0,
    bestMatchName: ''
  };
  private isGathering: boolean = false;
  private gatherProgress: number = 0;
  private stormActive: boolean = false;
  private stormTimer: number = 0;
  private onSummonCallback: ((constellation: Constellation) => void) | null = null;
  private matchScores: Map<string, number> = new Map();
  private targetConstellation: Constellation | null = null;
  private particleAssignments: number[] = [];

  constructor() {
    this.initParticles();
    this.initLightThreads();
    this.constellations.forEach(c => this.matchScores.set(c.id, 0));
  }

  private initParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pos = randomInSphere(SPHERE_RADIUS);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.002
      );
      const size = 2 + Math.random() * 4;
      const colorT = Math.random();
      const color = lerpColor(colorT);

      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        size,
        color,
        originalPosition: pos.clone(),
        targetPosition: null
      });
      this.particleAssignments.push(-1);
    }
  }

  private initLightThreads(): void {
    for (let i = 0; i < LIGHT_THREAD_COUNT; i++) {
      const start = randomInSphere(SPHERE_RADIUS * 0.8);
      const end = randomInSphere(SPHERE_RADIUS * 0.8);
      const control1 = randomInSphere(SPHERE_RADIUS * 0.6);
      const control2 = randomInSphere(SPHERE_RADIUS * 0.6);
      const startVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003
      );
      const endVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003
      );

      this.lightThreads.push({
        start,
        end,
        control1,
        control2,
        startVel,
        endVel
      });
    }
  }

  public getParticles(): ParticleData[] {
    return this.particles;
  }

  public getLightThreads(): LightThread[] {
    return this.lightThreads;
  }

  public getChainLinks(): ChainLink[] {
    return this.chainLinks;
  }

  public getConstellations(): Constellation[] {
    return this.constellations;
  }

  public getSummonState(): SummonState {
    return { ...this.summonState };
  }

  public setOnSummonCallback(callback: (constellation: Constellation) => void): void {
    this.onSummonCallback = callback;
  }

  public setGathering(gathering: boolean): void {
    if (gathering && !this.isGathering && !this.summonState.isSummoning) {
      this.selectTargetConstellation();
    }
    this.isGathering = gathering;
  }

  private selectTargetConstellation(): void {
    const idx = Math.floor(Math.random() * this.constellations.length);
    this.targetConstellation = this.constellations[idx];
    this.assignParticlesToConstellation(this.targetConstellation);
  }

  private assignParticlesToConstellation(constellation: Constellation): void {
    const numPerPoint = Math.floor(PARTICLE_COUNT / constellation.points.length);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pointIdx = i % constellation.points.length;
      this.particleAssignments[i] = pointIdx;
      
      const targetPoint = constellation.points[pointIdx];
      const offset = randomInSphere(0.15);
      this.particles[i].targetPosition = targetPoint.clone().add(offset);
    }
  }

  public triggerStorm(): void {
    this.stormActive = true;
    this.stormTimer = 0.8;
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);

    this.updateParticles(dt);
    this.updateLightThreads(dt);
    this.updateChainLinks(dt);
    this.updateSummonState(dt);

    if (this.stormActive) {
      this.stormTimer -= dt;
      if (this.stormTimer <= 0) {
        this.stormActive = false;
      }
    }

    if (this.isGathering && !this.summonState.isSummoning) {
      this.gatherProgress = Math.min(1, this.gatherProgress + dt * 0.5);
      this.checkConstellationMatch(dt);
    } else {
      this.gatherProgress = Math.max(0, this.gatherProgress - dt * 0.5);
      if (this.gatherProgress === 0) {
        this.clearParticleTargets();
      }
    }
  }

  private clearParticleTargets(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles[i].targetPosition = null;
      this.particleAssignments[i] = -1;
    }
    this.targetConstellation = null;
  }

  private updateParticles(dt: number): void {
    const speedMultiplier = this.stormActive ? 5 : 1;
    const center = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];

      if (particle.targetPosition && this.gatherProgress > 0) {
        const toTarget = particle.targetPosition.clone().sub(particle.position);
        const dist = toTarget.length();
        
        if (dist > 0.01) {
          const force = Math.min(dist * 2, 0.05) * this.gatherProgress;
          particle.velocity.lerp(toTarget.normalize().multiplyScalar(force), 0.05);
        }
      } else if (this.isGathering && this.gatherProgress > 0) {
        const dirToCenter = center.clone().sub(particle.position).normalize();
        const gatherForce = 0.005 * this.gatherProgress;
        particle.velocity.add(dirToCenter.multiplyScalar(gatherForce));
      }

      particle.position.add(particle.velocity.clone().multiplyScalar(speedMultiplier * dt * 60));

      const dist = particle.position.length();
      if (dist > SPHERE_RADIUS) {
        particle.position.normalize().multiplyScalar(SPHERE_RADIUS * 0.98);
        const normal = particle.position.clone().normalize();
        particle.velocity.reflect(normal).multiplyScalar(0.8);
      }

      particle.velocity.multiplyScalar(0.99);

      this.applyLightThreadInfluence(particle);
    }
  }

  private applyLightThreadInfluence(particle: ParticleData): void {
    for (const thread of this.lightThreads) {
      const midPoint = new THREE.Vector3().addVectors(thread.start, thread.end).multiplyScalar(0.5);
      const dist = particle.position.distanceTo(midPoint);
      if (dist < 0.5) {
        const influence = (0.5 - dist) * 0.01;
        const dir = midPoint.clone().sub(particle.position).normalize();
        particle.velocity.add(dir.multiplyScalar(influence));
      }
    }
  }

  private updateLightThreads(dt: number): void {
    for (const thread of this.lightThreads) {
      thread.start.add(thread.startVel.clone().multiplyScalar(dt * 60));
      thread.end.add(thread.endVel.clone().multiplyScalar(dt * 60));

      thread.control1.lerp(thread.start.clone().add(thread.end).multiplyScalar(0.3), 0.01);
      thread.control2.lerp(thread.start.clone().add(thread.end).multiplyScalar(0.7), 0.01);

      const startDist = thread.start.length();
      const endDist = thread.end.length();
      const maxDist = SPHERE_RADIUS * 0.85;

      if (startDist > maxDist) {
        thread.start.normalize().multiplyScalar(maxDist);
        const normal = thread.start.clone().normalize();
        thread.startVel.reflect(normal);
      }
      if (endDist > maxDist) {
        thread.end.normalize().multiplyScalar(maxDist);
        const normal = thread.end.clone().normalize();
        thread.endVel.reflect(normal);
      }

      if (Math.random() < 0.002) {
        thread.startVel.x += (Math.random() - 0.5) * 0.002;
        thread.startVel.y += (Math.random() - 0.5) * 0.002;
        thread.startVel.z += (Math.random() - 0.5) * 0.002;
        thread.endVel.x += (Math.random() - 0.5) * 0.002;
        thread.endVel.y += (Math.random() - 0.5) * 0.002;
        thread.endVel.z += (Math.random() - 0.5) * 0.002;
      }
    }
  }

  private updateChainLinks(dt: number): void {
    for (let i = this.chainLinks.length - 1; i >= 0; i--) {
      this.chainLinks[i].life -= dt;
      this.chainLinks[i].opacity = this.chainLinks[i].life / this.chainLinks[i].maxLife;
      if (this.chainLinks[i].life <= 0) {
        this.chainLinks.splice(i, 1);
      }
    }

    if (this.chainLinks.length < MAX_CHAINS && Math.random() < 0.3) {
      this.generateNewChain();
    }
  }

  private generateNewChain(): void {
    const sampleSize = 30;
    let bestPair: [number, number] | null = null;
    let bestDist = CHAIN_DISTANCE;

    for (let attempt = 0; attempt < 5; attempt++) {
      const idxA = Math.floor(Math.random() * PARTICLE_COUNT);
      const idxB = Math.floor(Math.random() * PARTICLE_COUNT);
      
      if (idxA === idxB) continue;

      const dist = this.particles[idxA].position.distanceTo(this.particles[idxB].position);
      if (dist < bestDist) {
        bestDist = dist;
        bestPair = [idxA, idxB];
      }
    }

    if (bestPair) {
      this.chainLinks.push({
        particleA: bestPair[0],
        particleB: bestPair[1],
        opacity: 0.15,
        life: CHAIN_LIFE,
        maxLife: CHAIN_LIFE
      });
    }
  }

  private checkConstellationMatch(dt: number): void {
    let bestMatch = 0;
    let bestConstellation: Constellation | null = null;

    for (const constellation of this.constellations) {
      const score = this.calculateMatchScore(constellation);
      this.matchScores.set(constellation.id, score);

      if (score > bestMatch) {
        bestMatch = score;
        bestConstellation = constellation;
      }
    }

    this.summonState.bestMatchScore = bestMatch;
    this.summonState.bestMatchName = bestConstellation?.name || '';

    if (bestMatch >= MATCH_THRESHOLD && bestConstellation) {
      this.summonState.matchTime += dt;

      if (this.summonState.matchTime >= MATCH_DURATION) {
        this.startSummoning(bestConstellation);
      }
    } else {
      this.summonState.matchTime = Math.max(0, this.summonState.matchTime - dt * 0.5);
    }
  }

  private calculateMatchScore(constellation: Constellation): number {
    let totalScore = 0;
    const matchRadius = 0.25;

    for (const point of constellation.points) {
      let nearestDist = Infinity;

      for (const particle of this.particles) {
        const dist = particle.position.distanceTo(point);
        if (dist < nearestDist) {
          nearestDist = dist;
        }
      }

      const pointScore = Math.max(0, 1 - nearestDist / matchRadius);
      totalScore += pointScore;
    }

    return totalScore / constellation.points.length;
  }

  private startSummoning(constellation: Constellation): void {
    this.summonState.isSummoning = true;
    this.summonState.currentConstellation = constellation;
    this.summonState.summonProgress = 0;
    this.summonState.flashCount = 0;
    this.summonState.flashTimer = 0;
    this.summonState.spiritVisible = false;
    this.summonState.spiritTimer = 0;

    this.triggerStorm();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pointIdx = i % constellation.points.length;
      const targetPoint = constellation.points[pointIdx];
      const offset = randomInSphere(0.05);
      this.particles[i].targetPosition = targetPoint.clone().add(offset);
    }

    if (this.onSummonCallback) {
      this.onSummonCallback(constellation);
    }
  }

  private updateSummonState(dt: number): void {
    if (!this.summonState.isSummoning) return;

    this.summonState.summonProgress = Math.min(1, this.summonState.summonProgress + dt * 0.5);

    if (this.summonState.summonProgress >= 0.5 && this.summonState.flashCount < FLASH_COUNT * 2) {
      this.summonState.flashTimer += dt;
      if (this.summonState.flashTimer >= FLASH_INTERVAL) {
        this.summonState.flashTimer = 0;
        this.summonState.flashCount++;
      }
    }

    if (this.summonState.summonProgress >= 0.8 && !this.summonState.spiritVisible) {
      this.summonState.spiritVisible = true;
      this.summonState.spiritTimer = SPIRIT_DURATION;
    }

    if (this.summonState.spiritVisible) {
      this.summonState.spiritTimer -= dt;
      if (this.summonState.spiritTimer <= 0) {
        this.resetSummonState();
      }
    }
  }

  private resetSummonState(): void {
    this.summonState.isSummoning = false;
    this.summonState.currentConstellation = null;
    this.summonState.summonProgress = 0;
    this.summonState.matchTime = 0;
    this.summonState.flashCount = 0;
    this.summonState.flashTimer = 0;
    this.summonState.spiritVisible = false;
    this.summonState.spiritTimer = 0;
    this.summonState.bestMatchScore = 0;
    this.summonState.bestMatchName = '';
    this.gatherProgress = 0;
    this.isGathering = false;

    this.clearParticleTargets();

    for (const particle of this.particles) {
      const spreadDir = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();
      particle.velocity.add(spreadDir.multiplyScalar(0.01));
    }
  }

  public isFlashing(): boolean {
    if (!this.summonState.isSummoning || this.summonState.flashCount >= FLASH_COUNT * 2) {
      return false;
    }
    return this.summonState.flashCount % 2 === 0;
  }

  public getBestMatchScore(): number {
    return this.summonState.bestMatchScore;
  }

  public getRandomDivination(constellation: Constellation): string {
    const index = Math.floor(Math.random() * constellation.divinations.length);
    return constellation.divinations[index];
  }

  public getIsGathering(): boolean {
    return this.isGathering;
  }

  public getGatherProgress(): number {
    return this.gatherProgress;
  }
}

export { CONSTELLATIONS, SPHERE_RADIUS, PARTICLE_COUNT };
