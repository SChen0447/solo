import * as THREE from 'three';
import type { ControlParams } from './controls';

const MAX_SMOKE = 8000;
const MAX_KRILL = 3500;
const MAX_WORMS = 500;
const VENT_POSITION = new THREE.Vector3(0, -8, 0);
const SMOKE_LIFETIME = 220;

const SMOKE_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SMOKE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.15, dist) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const KRILL_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const KRILL_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float glow = smoothstep(0.5, 0.05, dist);
    float core = smoothstep(0.25, 0.0, dist);
    float alpha = glow * vAlpha;
    vec3 finalColor = vColor * (0.5 + core * 0.5);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface SmokeParticle {
  active: boolean;
  age: number;
  baseSpeed: number;
  vx: number;
  vz: number;
  size: number;
  spawnOffset: number;
}

interface KrillParticle {
  active: boolean;
  basePos: THREE.Vector3;
  blinkPhase: number;
  blinkSpeed: number;
  wanderAngle: number;
  wanderRadius: number;
  size: number;
}

interface WormParticle {
  active: boolean;
  basePos: THREE.Vector3;
  height: number;
  swayPhase: number;
  swaySpeed: number;
  glowIntensity: number;
}

export class ParticleSystem {
  public readonly group: THREE.Group;

  private smokeGeo!: THREE.BufferGeometry;
  private smokeMat!: THREE.ShaderMaterial;
  private smokePoints!: THREE.Points;
  private smokeData: SmokeParticle[] = [];
  private smokePositions!: Float32Array;
  private smokeColors!: Float32Array;
  private smokeSizes!: Float32Array;
  private smokeAlphas!: Float32Array;

  private krillGeo!: THREE.BufferGeometry;
  private krillMat!: THREE.ShaderMaterial;
  private krillPoints!: THREE.Points;
  private krillData: KrillParticle[] = [];
  private krillPositions!: Float32Array;
  private krillColors!: Float32Array;
  private krillSizes!: Float32Array;
  private krillAlphas!: Float32Array;

  private wormGroup!: THREE.Group;
  private wormData: WormParticle[] = [];

  private targetTemperature = 300;
  private currentTemperature = 300;
  private targetDensity = 50;
  private currentDensity = 50;
  private targetOpacity = 50;
  private currentOpacity = 50;

  private time = 0;
  private smokeSpawnCounter = 0;

  constructor() {
    this.group = new THREE.Group();
    this.initSmokeParticles();
    this.initKrillParticles();
    this.initTubeWorms();
  }

  private initSmokeParticles(): void {
    this.smokeGeo = new THREE.BufferGeometry();
    this.smokePositions = new Float32Array(MAX_SMOKE * 3);
    this.smokeColors = new Float32Array(MAX_SMOKE * 3);
    this.smokeSizes = new Float32Array(MAX_SMOKE);
    this.smokeAlphas = new Float32Array(MAX_SMOKE);

    for (let i = 0; i < MAX_SMOKE; i++) {
      this.smokePositions[i * 3] = 0;
      this.smokePositions[i * 3 + 1] = -1000;
      this.smokePositions[i * 3 + 2] = 0;
      this.smokeColors[i * 3] = 0.05;
      this.smokeColors[i * 3 + 1] = 0.045;
      this.smokeColors[i * 3 + 2] = 0.055;
      this.smokeSizes[i] = 0;
      this.smokeAlphas[i] = 0;
    }

    this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    this.smokeGeo.setAttribute('color', new THREE.BufferAttribute(this.smokeColors, 3));
    this.smokeGeo.setAttribute('aSize', new THREE.BufferAttribute(this.smokeSizes, 1));
    this.smokeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.smokeAlphas, 1));

    this.smokeMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: SMOKE_VERTEX_SHADER,
      fragmentShader: SMOKE_FRAGMENT_SHADER,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.smokePoints = new THREE.Points(this.smokeGeo, this.smokeMat);
    this.smokePoints.frustumCulled = false;
    this.group.add(this.smokePoints);

    for (let i = 0; i < MAX_SMOKE; i++) {
      this.smokeData.push({
        active: false,
        age: 0,
        baseSpeed: 0,
        vx: 0,
        vz: 0,
        size: 0,
        spawnOffset: Math.random() * Math.PI * 2
      });
    }
  }

  private initKrillParticles(): void {
    this.krillGeo = new THREE.BufferGeometry();
    this.krillPositions = new Float32Array(MAX_KRILL * 3);
    this.krillColors = new Float32Array(MAX_KRILL * 3);
    this.krillSizes = new Float32Array(MAX_KRILL);
    this.krillAlphas = new Float32Array(MAX_KRILL);

    for (let i = 0; i < MAX_KRILL; i++) {
      this.krillPositions[i * 3] = 0;
      this.krillPositions[i * 3 + 1] = -1000;
      this.krillPositions[i * 3 + 2] = 0;
      this.krillColors[i * 3] = 1.0;
      this.krillColors[i * 3 + 1] = 0.80;
      this.krillColors[i * 3 + 2] = 0.28;
      this.krillSizes[i] = 0;
      this.krillAlphas[i] = 0;
    }

    this.krillGeo.setAttribute('position', new THREE.BufferAttribute(this.krillPositions, 3));
    this.krillGeo.setAttribute('color', new THREE.BufferAttribute(this.krillColors, 3));
    this.krillGeo.setAttribute('aSize', new THREE.BufferAttribute(this.krillSizes, 1));
    this.krillGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.krillAlphas, 1));

    this.krillMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: KRILL_VERTEX_SHADER,
      fragmentShader: KRILL_FRAGMENT_SHADER,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.krillPoints = new THREE.Points(this.krillGeo, this.krillMat);
    this.krillPoints.frustumCulled = false;
    this.group.add(this.krillPoints);

    for (let i = 0; i < MAX_KRILL; i++) {
      this.krillData.push({
        active: false,
        basePos: new THREE.Vector3(),
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: Math.PI / (30 + Math.random() * 90),
        wanderAngle: Math.random() * Math.PI * 2,
        wanderRadius: 0.3 + Math.random() * 0.7,
        size: 6.0 + Math.random() * 6.0
      });
    }
  }

  private initTubeWorms(): void {
    this.wormGroup = new THREE.Group();
    this.group.add(this.wormGroup);

    for (let i = 0; i < MAX_WORMS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.2 + Math.random() * 3.5;
      const basePos = new THREE.Vector3(
        VENT_POSITION.x + Math.cos(angle) * dist,
        VENT_POSITION.y + 0.05,
        VENT_POSITION.z + Math.sin(angle) * dist
      );

      this.wormData.push({
        active: false,
        basePos,
        height: 0.8 + Math.random() * 2.5,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.01 + Math.random() * 0.02,
        glowIntensity: 0.3 + Math.random() * 0.7
      });
    }
  }

  private rebuildWorms(density: number): void {
    while (this.wormGroup.children.length > 0) {
      const child = this.wormGroup.children[0];
      this.wormGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }

    const activeCount = Math.floor(MAX_WORMS * (density / 100));

    for (let i = 0; i < this.wormData.length; i++) {
      this.wormData[i].active = i < activeCount;
    }

    for (let i = 0; i < this.wormData.length; i++) {
      const worm = this.wormData[i];
      if (!worm.active) continue;
      this.createSingleWorm(worm, i);
    }
  }

  private createSingleWorm(worm: WormParticle, _index: number): void {
    const segments = 10;
    const tubeRadius = 0.035;
    const curvePoints: THREE.Vector3[] = [];

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const swayAmount = Math.sin(t * Math.PI) * 0.12 * worm.glowIntensity;
      curvePoints.push(new THREE.Vector3(
        worm.basePos.x + Math.cos(worm.swayPhase) * swayAmount * t,
        worm.basePos.y + t * worm.height,
        worm.basePos.z + Math.sin(worm.swayPhase) * swayAmount * t
      ));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, segments, tubeRadius, 5, false);

    const hue = 0.36 + worm.glowIntensity * 0.1;
    const sat = 0.45 + worm.glowIntensity * 0.3;
    const light = 0.28 + worm.glowIntensity * 0.22;
    const color = new THREE.Color().setHSL(hue, sat, light);

    const tubeMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72
    });

    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.userData = { wormIndex: this.wormData.indexOf(worm), type: 'tube' };
    this.wormGroup.add(tube);

    const tipGeo = new THREE.SphereGeometry(tubeRadius * 2.4, 8, 8);
    const tipColor = new THREE.Color().setHSL(hue, sat, 0.42 + worm.glowIntensity * 0.35);
    const tipMat = new THREE.MeshBasicMaterial({
      color: tipColor,
      transparent: true,
      opacity: 0.95
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.copy(curvePoints[segments]);
    tip.userData = { wormIndex: this.wormData.indexOf(worm), type: 'tip' };
    this.wormGroup.add(tip);
  }

  private updateWorms(_deltaTime: number): void {
    const time = this.time;

    for (let i = 0; i < this.wormGroup.children.length; i += 2) {
      const tube = this.wormGroup.children[i];
      const tip = this.wormGroup.children[i + 1];
      if (!tube || !tip) continue;

      const wormIndex = tube.userData.wormIndex;
      if (wormIndex === undefined) continue;
      const worm = this.wormData[wormIndex];
      if (!worm) continue;

      const segments = 10;
      const swayAmountBase = 0.07 * worm.glowIntensity;
      const phase = worm.swayPhase + time * worm.swaySpeed;

      if (tube instanceof THREE.Mesh && tube.geometry instanceof THREE.TubeGeometry) {
        const params = tube.geometry.parameters as { path: THREE.CatmullRomCurve3 };
        if (params.path && params.path.points) {
          const pts = params.path.points;
          for (let s = 0; s <= segments; s++) {
            const t = s / segments;
            const localSway = Math.sin(t * Math.PI);
            const sway = localSway * swayAmountBase;
            pts[s].set(
              worm.basePos.x + Math.cos(phase) * sway * t,
              worm.basePos.y + t * worm.height,
              worm.basePos.z + Math.sin(phase) * sway * t
            );
            if (s === segments && tip instanceof THREE.Mesh) {
              tip.position.copy(pts[s]);
            }
          }
          const newCurve = new THREE.CatmullRomCurve3(pts);
          const newGeo = new THREE.TubeGeometry(newCurve, segments, 0.035, 5, false);
          const posAttr = tube.geometry.attributes.position as THREE.BufferAttribute;
          posAttr.array = (newGeo.attributes.position as THREE.BufferAttribute).array;
          posAttr.needsUpdate = true;
          tube.geometry.computeVertexNormals();
          newGeo.dispose();
        }
      }

      const pulse = 0.82 + Math.sin(time * 0.028 + worm.swayPhase) * 0.18;
      if (tube instanceof THREE.Mesh && tube.material instanceof THREE.MeshBasicMaterial) {
        tube.material.opacity = 0.68 * pulse;
      }
      if (tip instanceof THREE.Mesh && tip.material instanceof THREE.MeshBasicMaterial) {
        tip.material.opacity = 0.95 * pulse;
      }
    }
  }

  public setParams(params: ControlParams): void {
    this.targetTemperature = params.temperature;
    this.targetDensity = params.density;
    this.targetOpacity = params.opacity;
    this.rebuildWorms(params.density);
  }

  public update(_deltaTime: number): void {
    this.time++;

    this.currentTemperature += (this.targetTemperature - this.currentTemperature) * 0.015;
    this.currentDensity += (this.targetDensity - this.currentDensity) * 0.015;
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * 0.015;

    const tempT = (this.currentTemperature - 200) / 200;
    const speedFactor = 0.5 + tempT * 2.5;
    const expandFactor = 1 + tempT * 1.8;

    const globalOpacityFactor = this.currentOpacity / 100;

    this.updateSmoke(speedFactor, expandFactor, globalOpacityFactor);
    this.updateKrill(globalOpacityFactor);
    this.updateWorms(_deltaTime);
  }

  private updateSmoke(speedFactor: number, expandFactor: number, opacityFactor: number): void {
    const smokeRate = Math.floor(20 + speedFactor * 35);
    this.smokeSpawnCounter++;

    if (this.smokeSpawnCounter >= 1) {
      this.smokeSpawnCounter = 0;
      let spawned = 0;
      for (let i = 0; i < MAX_SMOKE && spawned < smokeRate; i++) {
        if (!this.smokeData[i].active) {
          this.spawnSmoke(i, speedFactor);
          spawned++;
        }
      }
    }

    for (let i = 0; i < MAX_SMOKE; i++) {
      const p = this.smokeData[i];
      if (!p.active) {
        this.smokePositions[i * 3 + 1] = -1000;
        this.smokeSizes[i] = 0;
        this.smokeAlphas[i] = 0;
        continue;
      }

      p.age++;

      const lifeT = p.age / SMOKE_LIFETIME;
      const decayFactor = Math.max(0.05, 1 - lifeT * 0.88);
      const upwardSpeed = p.baseSpeed * decayFactor;

      const agePhase = (p.age + p.spawnOffset * 30) * 0.025;
      const turbX = Math.sin(agePhase) * 0.007 * expandFactor;
      const turbZ = Math.cos(agePhase * 1.3) * 0.007 * expandFactor;

      this.smokePositions[i * 3] += p.vx + turbX;
      this.smokePositions[i * 3 + 1] += upwardSpeed;
      this.smokePositions[i * 3 + 2] += p.vz + turbZ;

      const expand = (1 - Math.pow(1 - lifeT, 2)) * expandFactor;
      this.smokeSizes[i] = p.size * (0.9 + expand * 2.0);

      let alpha: number;
      if (lifeT < 0.06) {
        alpha = (lifeT / 0.06) * 0.85;
      } else if (lifeT > 0.82) {
        alpha = Math.max(0, (1 - lifeT) / 0.18) * 0.85;
      } else {
        alpha = 0.85;
      }
      this.smokeAlphas[i] = alpha * opacityFactor;

      if (p.age >= SMOKE_LIFETIME || this.smokePositions[i * 3 + 1] > 22) {
        p.active = false;
        this.smokePositions[i * 3 + 1] = -1000;
        this.smokeSizes[i] = 0;
        this.smokeAlphas[i] = 0;
      }
    }

    (this.smokeGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.smokeGeo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.smokeGeo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (this.smokeGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private spawnSmoke(index: number, speedFactor: number): void {
    const p = this.smokeData[index];
    p.active = true;
    p.age = 0;
    p.baseSpeed = 0.028 + Math.random() * 0.028 * speedFactor;
    p.spawnOffset = Math.random();

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.45;
    p.vx = Math.cos(angle) * (0.002 + Math.random() * 0.002);
    p.vz = Math.sin(angle) * (0.002 + Math.random() * 0.002);
    p.size = 16.0 + Math.random() * 22.0;

    this.smokePositions[index * 3] = VENT_POSITION.x + Math.cos(angle) * radius;
    this.smokePositions[index * 3 + 1] = VENT_POSITION.y + 0.28;
    this.smokePositions[index * 3 + 2] = VENT_POSITION.z + Math.sin(angle) * radius;

    const warmTint = 0.015 + Math.random() * 0.025;
    const r = 0.045 + warmTint;
    const g = 0.038 + warmTint * 0.4;
    const b = 0.05;
    this.smokeColors[index * 3] = r;
    this.smokeColors[index * 3 + 1] = g;
    this.smokeColors[index * 3 + 2] = b;
  }

  private updateKrill(opacityFactor: number): void {
    const activeTarget = Math.floor(MAX_KRILL * (this.currentDensity / 100));

    for (let i = 0; i < MAX_KRILL; i++) {
      const k = this.krillData[i];

      if (!k.active && i < activeTarget) {
        k.active = true;
        const angle = Math.random() * Math.PI * 2;
        const dist = 1.8 + Math.random() * 11;
        const height = -7 + Math.random() * 15;
        k.basePos.set(
          VENT_POSITION.x + Math.cos(angle) * dist,
          height,
          VENT_POSITION.z + Math.sin(angle) * dist
        );
        k.wanderAngle = Math.random() * Math.PI * 2;
        k.blinkPhase = Math.random() * Math.PI * 2;
        k.blinkSpeed = Math.PI / (30 + Math.random() * 90);
        k.size = 3.5 + Math.random() * 4.5;
      } else if (k.active && i >= activeTarget) {
        k.active = false;
      }

      if (!k.active) {
        this.krillPositions[i * 3 + 1] = -1000;
        this.krillSizes[i] = 0;
        this.krillAlphas[i] = 0;
        continue;
      }

      k.blinkPhase += k.blinkSpeed;
      k.wanderAngle += 0.008 + Math.random() * 0.008;

      const wander = k.wanderRadius;
      const wx = Math.cos(k.wanderAngle) * wander;
      const wz = Math.sin(k.wanderAngle) * wander;
      const wy = Math.sin(k.wanderAngle * 0.7) * wander * 0.45;

      this.krillPositions[i * 3] = k.basePos.x + wx;
      this.krillPositions[i * 3 + 1] = k.basePos.y + wy;
      this.krillPositions[i * 3 + 2] = k.basePos.z + wz;

      this.krillSizes[i] = k.size;

      const blink = 0.3 + Math.sin(k.blinkPhase) * 0.7;
      this.krillAlphas[i] = Math.max(0, blink) * opacityFactor;
    }

    (this.krillGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.krillGeo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.krillGeo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.smokeGeo.dispose();
    this.smokeMat.dispose();
    this.krillGeo.dispose();
    this.krillMat.dispose();
  }
}
