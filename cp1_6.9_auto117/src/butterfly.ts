import * as THREE from 'three';
import { Garden } from './garden.js';

export interface ButterflySpecies {
  id: string;
  name: string;
  primary: number;
  secondary: number;
  primaryHex: string;
  secondaryHex: string;
}

export const BUTTERFLY_SPECIES: ButterflySpecies[] = [
  { id: 'monarch', name: '帝王蝶', primary: 0xff4500, secondary: 0x2f2f2f, primaryHex: '#ff4500', secondaryHex: '#2f2f2f' },
  { id: 'morpho', name: '蓝闪蝶', primary: 0x4b0082, secondary: 0x00bfff, primaryHex: '#4b0082', secondaryHex: '#00bfff' },
  { id: 'swallowtail', name: '凤蝶', primary: 0xffd700, secondary: 0x000000, primaryHex: '#ffd700', secondaryHex: '#000000' },
  { id: 'painted-lady', name: '小红蛱蝶', primary: 0xff8c00, secondary: 0x2f2f2f, primaryHex: '#ff8c00', secondaryHex: '#2f2f2f' },
  { id: 'blue-morpho', name: '大蓝闪蝶', primary: 0x1e90ff, secondary: 0xffffff, primaryHex: '#1e90ff', secondaryHex: '#ffffff' },
  { id: 'peacock', name: '孔雀蛱蝶', primary: 0x8b0000, secondary: 0x4169e1, primaryHex: '#8b0000', secondaryHex: '#4169e1' },
  { id: 'purple-emperor', name: '紫斑蝶', primary: 0x9400d3, secondary: 0xdda0dd, primaryHex: '#9400d3', secondaryHex: '#dda0dd' },
  { id: 'tiger', name: '虎斑蝶', primary: 0xff6347, secondary: 0x000000, primaryHex: '#ff6347', secondaryHex: '#000000' },
];

enum ButterflyState {
  Flying,
  Nectaring,
  Caught,
}

interface Butterfly {
  id: number;
  species: ButterflySpecies;
  group: THREE.Group;
  upperWing: THREE.Mesh;
  lowerWing: THREE.Mesh;
  body: THREE.Mesh;
  state: ButterflyState;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  bezierStart: THREE.Vector3;
  bezierCtrl1: THREE.Vector3;
  bezierCtrl2: THREE.Vector3;
  bezierEnd: THREE.Vector3;
  bezierT: number;
  bezierDuration: number;
  wingPhase: number;
  wingSpeed: number;
  nectarTimer: number;
  nectarTargetFlower: { position: THREE.Vector3; color: THREE.Color } | null;
  catchAnimation: number;
  hitboxRadius: number;
}

interface CatchParticles {
  mesh: THREE.Points;
  positions: Float32Array;
  velocities: THREE.Vector3[];
  lives: number[];
  count: number;
}

export class ButterflyManager {
  scene: THREE.Scene;
  garden: Garden;
  butterflies: Butterfly[] = [];
  nextButterflyId: number = 0;
  spawnTimer: number = 5;
  spawnInterval: number = 30;
  maxButterflies: number = 8;
  collectedSpecies: Set<string> = new Set();
  catchParticlesList: CatchParticles[] = [];

  onCatch: ((species: ButterflySpecies) => void) | null = null;

  constructor(scene: THREE.Scene, garden: Garden) {
    this.scene = scene;
    this.garden = garden;
  }

  createWingTexture(primary: THREE.Color, secondary: THREE.Color, isUpper: boolean): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size * 0.6, size * 0.5, 10, size * 0.5, size * 0.5, size * 0.6);
    const main = isUpper ? primary : secondary;
    const edge = isUpper ? secondary : primary;
    grad.addColorStop(0, `rgba(${Math.floor(main.r * 255)},${Math.floor(main.g * 255)},${Math.floor(main.b * 255)},0.92)`);
    grad.addColorStop(0.6, `rgba(${Math.floor(main.r * 255)},${Math.floor(main.g * 255)},${Math.floor(main.b * 255)},0.75)`);
    grad.addColorStop(1, `rgba(${Math.floor(edge.r * 255)},${Math.floor(edge.g * 255)},${Math.floor(edge.b * 255)},0.35)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(size * 0.55, size * 0.5, size * 0.42, size * 0.38, -0.15, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = size * (0.12 + Math.random() * 0.15);
      ctx.fillStyle = `rgba(${Math.floor(edge.r * 255)},${Math.floor(edge.g * 255)},${Math.floor(edge.b * 255)},0.8)`;
      ctx.beginPath();
      ctx.arc(size * 0.55 + Math.cos(a) * r, size * 0.5 + Math.sin(a) * r * 0.9, 6 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  createButterfly(species: ButterflySpecies, position: THREE.Vector3): Butterfly {
    const group = new THREE.Group();

    const primary = new THREE.Color(species.primary);
    const secondary = new THREE.Color(species.secondary);

    const wingSpan = 1.2;
    const wingGeo = new THREE.PlaneGeometry(wingSpan, wingSpan * 0.65, 1, 1);

    const upperTex = this.createWingTexture(primary, secondary, true);
    const lowerTex = this.createWingTexture(primary, secondary, false);

    const upperMat = new THREE.MeshStandardMaterial({
      map: upperTex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.4,
      metalness: 0.1,
      emissive: primary,
      emissiveIntensity: 0.1,
    });
    const lowerMat = new THREE.MeshStandardMaterial({
      map: lowerTex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.4,
      metalness: 0.1,
      emissive: secondary,
      emissiveIntensity: 0.05,
    });

    const upperWing = new THREE.Mesh(wingGeo, upperMat);
    upperWing.position.set(0, 0, 0.01);
    upperWing.rotation.y = 0.05;

    const lowerWing = new THREE.Mesh(wingGeo, lowerMat);
    lowerWing.position.set(0, 0, -0.01);
    lowerWing.rotation.y = -0.05;
    lowerWing.rotation.z = Math.PI;

    const bodyGeo = new THREE.CapsuleGeometry(0.035, 0.22, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(-0.02, 0, 0);

    group.add(upperWing);
    group.add(lowerWing);
    group.add(body);
    group.position.copy(position);
    this.scene.add(group);

    const endPos = this.randomGardenPoint();
    return {
      id: this.nextButterflyId++,
      species,
      group,
      upperWing,
      lowerWing,
      body,
      state: ButterflyState.Flying,
      position: position.clone(),
      velocity: new THREE.Vector3(),
      bezierStart: position.clone(),
      bezierCtrl1: this.randomCtrlPoint(position, endPos),
      bezierCtrl2: this.randomCtrlPoint(endPos, position),
      bezierEnd: endPos,
      bezierT: 0,
      bezierDuration: 4,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 6 * Math.PI * 2,
      nectarTimer: 0,
      nectarTargetFlower: null,
      catchAnimation: 0,
      hitboxRadius: 0.9,
    };
  }

  randomGardenPoint(): THREE.Vector3 {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 14,
      1.5 + Math.random() * 2.5,
      (Math.random() - 0.5) * 14
    );
  }

  randomCtrlPoint(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.x += (Math.random() - 0.5) * 8;
    mid.z += (Math.random() - 0.5) * 8;
    mid.y += (Math.random() - 0.5) * 4;
    return mid;
  }

  spawnButterfly() {
    if (this.butterflies.length >= this.maxButterflies) return;

    const species = BUTTERFLY_SPECIES[Math.floor(Math.random() * BUTTERFLY_SPECIES.length)];
    const side = Math.floor(Math.random() * 4);
    let spawn: THREE.Vector3;
    switch (side) {
      case 0: spawn = new THREE.Vector3(-16, 2 + Math.random() * 2, (Math.random() - 0.5) * 16); break;
      case 1: spawn = new THREE.Vector3(16, 2 + Math.random() * 2, (Math.random() - 0.5) * 16); break;
      case 2: spawn = new THREE.Vector3((Math.random() - 0.5) * 16, 2 + Math.random() * 2, -16); break;
      default: spawn = new THREE.Vector3((Math.random() - 0.5) * 16, 2 + Math.random() * 2, 16); break;
    }
    const bf = this.createButterfly(species, spawn);
    this.butterflies.push(bf);
  }

  bezierPoint(t: number, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): THREE.Vector3 {
    const u = 1 - t;
    return p0.clone().multiplyScalar(u * u * u)
      .add(p1.clone().multiplyScalar(3 * u * u * t))
      .add(p2.clone().multiplyScalar(3 * u * t * t))
      .add(p3.clone().multiplyScalar(t * t * t));
  }

  bezierTangent(t: number, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): THREE.Vector3 {
    const u = 1 - t;
    return p1.clone().sub(p0).multiplyScalar(3 * u * u)
      .add(p2.clone().sub(p1).multiplyScalar(6 * u * t))
      .add(p3.clone().sub(p2).multiplyScalar(3 * t * t)).normalize();
  }

  colorDistance(c1: THREE.Color, c2: THREE.Color): number {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  findMatchingFlower(bf: Butterfly): { position: THREE.Vector3; color: THREE.Color } | null {
    const flowers = this.garden.getFlowers();
    const bfColor = new THREE.Color(bf.species.primary);
    let best: { position: THREE.Vector3; color: THREE.Color; dist: number } | null = null;
    for (const f of flowers) {
      const cd = this.colorDistance(bfColor, f.color);
      if (cd < 0.65) {
        const pd = bf.position.distanceTo(f.position);
        if (pd < 7 && (!best || pd < best.dist)) {
          best = { position: f.position, color: f.color, dist: pd };
        }
      }
    }
    if (best) return { position: best.position, color: best.color };
    return null;
  }

  tryCatch(raycaster: THREE.Raycaster): ButterflySpecies | null {
    for (let i = this.butterflies.length - 1; i >= 0; i--) {
      const bf = this.butterflies[i];
      if (bf.state === ButterflyState.Caught) continue;

      const origin = raycaster.ray.origin;
      const dir = raycaster.ray.direction.clone().normalize();
      const toBf = bf.position.clone().sub(origin);
      const proj = toBf.dot(dir);
      if (proj < 0) continue;
      const closest = origin.clone().add(dir.multiplyScalar(proj));
      const dist = closest.distanceTo(bf.position);
      if (dist < bf.hitboxRadius) {
        this.triggerCatch(bf);
        return bf.species;
      }
    }
    return null;
  }

  playCatchSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const t = ctx.currentTime;

      const bufSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        const env = 1 - i / bufSize;
        data[i] = (Math.random() * 2 - 1) * env * env * 0.5;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 2500;
      filt.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      noise.connect(filt).connect(gain).connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.22);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.25);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.15, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(og).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    } catch (e) { /* noop */ }
  }

  spawnCatchParticles(position: THREE.Vector3, species: ButterflySpecies) {
    const count = 40;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    const lives: number[] = [];

    const c1 = new THREE.Color(species.primary);
    const c2 = new THREE.Color(species.secondary);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      const mix = Math.random();
      const c = c1.clone().lerp(c2, mix);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 3;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
      lives.push(0.8 + Math.random() * 0.4);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Points(geo, mat);
    this.scene.add(mesh);

    this.catchParticlesList.push({ mesh, positions, velocities, lives, count });
  }

  triggerCatch(bf: Butterfly) {
    bf.state = ButterflyState.Caught;
    bf.catchAnimation = 0;
    this.collectedSpecies.add(bf.species.id);
    this.playCatchSound();
    this.spawnCatchParticles(bf.position.clone(), bf.species);
  }

  getCollectedCount(): number {
    return this.collectedSpecies.size;
  }

  getTotalSpecies(): number {
    return BUTTERFLY_SPECIES.length;
  }

  isCollected(id: string): boolean {
    return this.collectedSpecies.has(id);
  }

  update(dt: number, elapsed: number) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnButterfly();
      this.spawnTimer = this.spawnInterval;
    }

    for (let i = this.butterflies.length - 1; i >= 0; i--) {
      const bf = this.butterflies[i];

      if (bf.state === ButterflyState.Caught) {
        bf.catchAnimation += dt;
        const t = Math.min(bf.catchAnimation / 0.7, 1);
        const scale = 1 - t;
        bf.group.scale.setScalar(Math.max(scale * 0.05, 0.001));
        bf.group.position.y += dt * 1.5;
        if (t >= 1) {
          this.scene.remove(bf.group);
          bf.upperWing.geometry.dispose();
          (bf.upperWing.material as THREE.Material).dispose();
          bf.lowerWing.geometry.dispose();
          (bf.lowerWing.material as THREE.Material).dispose();
          bf.body.geometry.dispose();
          (bf.body.material as THREE.Material).dispose();
          this.butterflies.splice(i, 1);
        }
        continue;
      }

      const flapMult = bf.state === ButterflyState.Nectaring ? 0.35 : 1;
      bf.wingPhase += bf.wingSpeed * dt * flapMult;
      const flap = Math.sin(bf.wingPhase) * 0.6;
      bf.upperWing.rotation.y = flap + 0.05;
      bf.lowerWing.rotation.y = -flap - 0.05;

      if (bf.state === ButterflyState.Flying) {
        const matching = this.findMatchingFlower(bf);
        if (matching && bf.position.distanceTo(matching.position) < 1.3) {
          bf.state = ButterflyState.Nectaring;
          bf.nectarTimer = 5;
          bf.nectarTargetFlower = matching;
          this.garden.startPollenEmitter(matching.position, 5);
        } else if (matching) {
          bf.bezierEnd.copy(matching.position).add(new THREE.Vector3(0, 0.2, 0));
          bf.bezierStart.copy(bf.position);
          bf.bezierCtrl1 = this.randomCtrlPoint(bf.position, bf.bezierEnd);
          bf.bezierCtrl2 = this.randomCtrlPoint(bf.bezierEnd, bf.position);
          bf.bezierT = 0;
          bf.bezierDuration = Math.max(1, bf.position.distanceTo(bf.bezierEnd) / 0.5);
        }
      }

      if (bf.state === ButterflyState.Nectaring) {
        bf.nectarTimer -= dt;
        if (bf.nectarTargetFlower) {
          const hover = bf.nectarTargetFlower.position.clone();
          hover.y += 0.3 + Math.sin(elapsed * 3) * 0.05;
          hover.x += Math.sin(elapsed * 2.5) * 0.08;
          hover.z += Math.cos(elapsed * 2.2) * 0.08;
          bf.position.lerp(hover, 1 - Math.pow(0.001, dt));
        }
        if (bf.nectarTimer <= 0) {
          bf.state = ButterflyState.Flying;
          bf.nectarTargetFlower = null;
        }
      } else if (bf.state === ButterflyState.Flying) {
        bf.bezierT += dt / bf.bezierDuration;
        if (bf.bezierT >= 1) {
          bf.bezierT = 0;
          bf.bezierStart.copy(bf.bezierEnd);
          bf.bezierEnd = this.randomGardenPoint();
          bf.bezierCtrl1 = this.randomCtrlPoint(bf.bezierStart, bf.bezierEnd);
          bf.bezierCtrl2 = this.randomCtrlPoint(bf.bezierEnd, bf.bezierStart);
          bf.bezierDuration = Math.max(2, bf.bezierStart.distanceTo(bf.bezierEnd) / 0.5);
        }
        const target = this.bezierPoint(bf.bezierT, bf.bezierStart, bf.bezierCtrl1, bf.bezierCtrl2, bf.bezierEnd);
        const tangent = this.bezierTangent(bf.bezierT, bf.bezierStart, bf.bezierCtrl1, bf.bezierCtrl2, bf.bezierEnd);
        bf.position.copy(target);
        if (tangent.lengthSq() > 0.001) {
          const lookTarget = bf.position.clone().add(tangent);
          bf.group.lookAt(lookTarget);
        }
      }

      bf.group.position.copy(bf.position);
      const bob = Math.sin(elapsed * 4 + bf.id) * 0.04;
      bf.group.position.y += bob;
    }

    for (let i = this.catchParticlesList.length - 1; i >= 0; i--) {
      const cp = this.catchParticlesList[i];
      let anyAlive = false;
      const posAttr = cp.mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < cp.count; j++) {
        if (cp.lives[j] > 0) {
          cp.lives[j] -= dt;
          cp.positions[j * 3] += cp.velocities[j].x * dt;
          cp.positions[j * 3 + 1] += cp.velocities[j].y * dt;
          cp.positions[j * 3 + 2] += cp.velocities[j].z * dt;
          cp.velocities[j].y -= 4 * dt;
          anyAlive = true;
        } else {
          cp.positions[j * 3 + 1] = -1000;
        }
      }
      posAttr.needsUpdate = true;
      const mat = cp.mesh.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, mat.opacity - dt * 1.2);
      if (!anyAlive || mat.opacity <= 0) {
        this.scene.remove(cp.mesh);
        cp.mesh.geometry.dispose();
        (cp.mesh.material as THREE.Material).dispose();
        this.catchParticlesList.splice(i, 1);
      }
    }
  }
}
