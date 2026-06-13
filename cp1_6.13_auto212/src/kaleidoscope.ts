import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

const COLOR_PALETTE: number[] = [
  0xf72585, 0xb5179e, 0x7209b7, 0x3a0ca3, 0x4361ee, 0x4cc9f0
];

const CURVE_SEGMENTS = 24;
const MAX_SPEED = 0.05;
const DEFAULT_SPEED_MULTIPLIER = 1;
const MAX_SPEED_MULTIPLIER = 5;
const DRAG_SPEED_THRESHOLD = 0.05;
const COLOR_SWITCH_INTERVAL_DEFAULT = 2.0;
const COLOR_SWITCH_INTERVAL_FAST = 0.3;
const WHITE_FLASH_DURATION = 0.2;
const BEND_AMOUNT = 0.02;
const PICKUP_NEARBY_COUNT = 10;
const PULSE_DURATION = 0.5;
const WIDTH_BOOST = 0.5;

interface Filament {
  line: Line2;
  geometry: LineGeometry;
  positions: Float32Array;
  colors: Float32Array;
  endDir: THREE.Vector3;
  theta: number;
  phi: number;
  radius: number;
  thetaSpeed: number;
  phiSpeed: number;
  helixOffset: number;
  helixFrequency: number;
  colorIndex: number;
  targetColorIndex: number;
  colorBlend: number;
  nextColorSwitchTime: number;
  whiteFlashTime: number;
  bendTowards: THREE.Vector3 | null;
  bendWeight: number;
  baseWidth: number;
  widthBoost: number;
  widthBoostTime: number;
}

export class Kaleidoscope {
  public readonly group: THREE.Group;
  public readonly sphereRadius: number;

  private scene: THREE.Scene;
  private filaments: Filament[] = [];
  private sphereShell!: THREE.Mesh;
  private pulseRing!: THREE.Mesh;
  private pulseTime: number = -1;
  private speedMultiplier: number = DEFAULT_SPEED_MULTIPLIER;
  private targetSpeedMultiplier: number = DEFAULT_SPEED_MULTIPLIER;
  private colorSwitchInterval: number = COLOR_SWITCH_INTERVAL_DEFAULT;
  private time: number = 0;
  private hoverPoint: THREE.Vector3 | null = null;
  private tmpVec3: THREE.Vector3 = new THREE.Vector3();
  private tmpVec3B: THREE.Vector3 = new THREE.Vector3();
  private tmpColorA: THREE.Color = new THREE.Color();
  private tmpColorB: THREE.Color = new THREE.Color();

  constructor(scene: THREE.Scene, sphereRadius: number) {
    this.scene = scene;
    this.sphereRadius = sphereRadius;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.createSphereShell();
    this.createPulseRing();
    this.createFilaments();
  }

  private createSphereShell(): void {
    const geo = new THREE.SphereGeometry(this.sphereRadius, 96, 96);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: this.sphereRadius }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uRadius;
        varying vec3 vNormal;
        varying vec3 vPos;
        
        vec3 hueShift(vec3 col, float t) {
          vec3 k = vec3(0.57735);
          float cosA = cos(t);
          return col * cosA + cross(k, col) * sin(t) + k * dot(k, col) * (1.0 - cosA);
        }
        
        void main() {
          vec3 viewDir = normalize(cameraPosition - vPos);
          float rim = 1.0 - max(dot(viewDir, normalize(-vNormal)), 0.0);
          rim = pow(rim, 3.0);
          
          float distFromCenter = length(vPos) / uRadius;
          float edgeFade = smoothstep(0.7, 1.0, distFromCenter);
          
          vec3 colorA = vec3(1.0, 0.0, 0.502);
          vec3 colorB = vec3(0.475, 0.157, 0.792);
          float t = 0.5 + 0.5 * sin(uTime * 1.5);
          vec3 neon = mix(colorA, colorB, t);
          
          float alpha = 0.15 * edgeFade + rim * 0.9;
          vec3 finalColor = mix(vec3(0.0), neon, rim * 1.2) + neon * 0.05 * edgeFade;
          
          gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
        }
      `
    });
    this.sphereShell = new THREE.Mesh(geo, mat);
    this.group.add(this.sphereShell);
  }

  private createPulseRing(): void {
    const ringGeo = new THREE.RingGeometry(this.sphereRadius * 0.98, this.sphereRadius, 128, 1);
    const ringMat = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(0xffe5b4) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        varying float vRadial;
        uniform float uProgress;
        void main() {
          vUv = uv;
          float len = length(position.xy);
          float maxR = 1.2;
          float scaled = mix(0.01, maxR, uProgress);
          vec3 newPos = position * scaled;
          vRadial = len;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vRadial;
        void main() {
          float alpha = 0.8 * (1.0 - uProgress);
          float edge = smoothstep(0.4, 1.0, vRadial);
          gl_FragColor = vec4(uColor, alpha * edge);
        }
      `
    });
    this.pulseRing = new THREE.Mesh(ringGeo, ringMat);
    this.pulseRing.visible = false;
    this.group.add(this.pulseRing);
  }

  private createFilaments(): void {
    const count = 400;
    for (let i = 0; i < count; i++) {
      this.createSingleFilament(i, count);
    }
  }

  private createSingleFilament(index: number, total: number): void {
    const geometry = new LineGeometry();
    const positions = new Float32Array((CURVE_SEGMENTS + 1) * 3);
    const colors = new Float32Array((CURVE_SEGMENTS + 1) * 3);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = this.sphereRadius * (0.25 + Math.random() * 0.7);

    const endDir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    );

    const baseWidth = 0.5 + Math.random() * 2.0;

    const colorIndex = index % COLOR_PALETTE.length;
    const hex = COLOR_PALETTE[colorIndex];
    const c = new THREE.Color(hex);
    for (let i = 0; i <= CURVE_SEGMENTS; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const material = new LineMaterial({
      color: 0xffffff,
      linewidth: baseWidth,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const line = new Line2(geometry, material);
    geometry.setPositions(new Float32Array(positions));
    geometry.setColors(new Float32Array(colors));
    line.computeLineDistances();

    this.group.add(line);

    const filament: Filament = {
      line,
      geometry,
      positions,
      colors,
      endDir,
      theta,
      phi,
      radius,
      thetaSpeed: (Math.random() - 0.5) * 0.015,
      phiSpeed: (Math.random() - 0.5) * 0.01,
      helixOffset: Math.random() * Math.PI * 2,
      helixFrequency: 0.8 + Math.random() * 1.5,
      colorIndex,
      targetColorIndex: colorIndex,
      colorBlend: 1.0,
      nextColorSwitchTime: Math.random() * COLOR_SWITCH_INTERVAL_DEFAULT,
      whiteFlashTime: 0,
      bendTowards: null,
      bendWeight: 0,
      baseWidth,
      widthBoost: 0,
      widthBoostTime: 0
    };

    this.filaments.push(filament);
  }

  public setDragSpeed(normalizedSpeed: number): void {
    if (normalizedSpeed > DRAG_SPEED_THRESHOLD) {
      const t = Math.min(1, (normalizedSpeed - DRAG_SPEED_THRESHOLD) / 0.15);
      this.targetSpeedMultiplier = DEFAULT_SPEED_MULTIPLIER + t * (MAX_SPEED_MULTIPLIER - DEFAULT_SPEED_MULTIPLIER);
      this.colorSwitchInterval = COLOR_SWITCH_INTERVAL_FAST;
    } else {
      this.targetSpeedMultiplier = DEFAULT_SPEED_MULTIPLIER;
      this.colorSwitchInterval = COLOR_SWITCH_INTERVAL_DEFAULT;
    }
  }

  public setHoverPoint(worldPoint: THREE.Vector3 | null): void {
    this.hoverPoint = worldPoint;
    if (worldPoint !== null) {
      this.findNearbyFilaments(worldPoint);
    }
  }

  private findNearbyFilaments(point: THREE.Vector3): void {
    const distances: { idx: number; dist: number }[] = [];
    for (let i = 0; i < this.filaments.length; i++) {
      const f = this.filaments[i];
      this.tmpVec3.copy(f.endDir).multiplyScalar(f.radius);
      const d = this.tmpVec3.distanceToSquared(point);
      distances.push({ idx: i, dist: d });
    }
    distances.sort((a, b) => a.dist - b.dist);

    for (const f of this.filaments) {
      f.bendTowards = null;
      f.bendWeight = 0;
    }

    for (let i = 0; i < Math.min(PICKUP_NEARBY_COUNT, distances.length); i++) {
      const f = this.filaments[distances[i].idx];
      f.bendTowards = point.clone();
      f.bendWeight = 1.0 - i / PICKUP_NEARBY_COUNT;
      f.whiteFlashTime = WHITE_FLASH_DURATION;
    }
  }

  public triggerPulse(): void {
    this.pulseTime = 0;
    this.pulseRing.visible = true;
    for (const f of this.filaments) {
      let newIdx = Math.floor(Math.random() * COLOR_PALETTE.length);
      while (newIdx === f.targetColorIndex) {
        newIdx = Math.floor(Math.random() * COLOR_PALETTE.length);
      }
      f.colorIndex = f.targetColorIndex;
      f.targetColorIndex = newIdx;
      f.colorBlend = 0;
      f.widthBoost = WIDTH_BOOST;
      f.widthBoostTime = 0.3;
    }
  }

  public update(delta: number): void {
    this.time += delta;

    this.speedMultiplier += (this.targetSpeedMultiplier - this.speedMultiplier) * 0.1;

    const shellMat = this.sphereShell.material as THREE.ShaderMaterial;
    shellMat.uniforms.uTime.value = this.time;

    this.updatePulse(delta);
    this.updateFilaments(delta);
  }

  private updatePulse(delta: number): void {
    if (this.pulseTime >= 0) {
      this.pulseTime += delta;
      const progress = Math.min(1, this.pulseTime / PULSE_DURATION);
      const mat = this.pulseRing.material as THREE.ShaderMaterial;
      mat.uniforms.uProgress.value = progress;

      this.pulseRing.lookAt(this.tmpVec3.set(
        this.sphereShell.position.x,
        this.sphereShell.position.y,
        this.sphereShell.position.z + 1
      ));

      for (const f of this.filaments) {
        const pulseRadius = progress * this.sphereRadius * 1.2;
        const filamentEnd = f.radius;
        if (Math.abs(filamentEnd - pulseRadius) < this.sphereRadius * 0.08 && f.widthBoost === 0) {
          let newIdx = Math.floor(Math.random() * COLOR_PALETTE.length);
          if (newIdx === f.targetColorIndex) newIdx = (newIdx + 1) % COLOR_PALETTE.length;
          f.colorIndex = f.targetColorIndex;
          f.targetColorIndex = newIdx;
          f.colorBlend = 0;
          f.widthBoost = WIDTH_BOOST;
          f.widthBoostTime = 0.3;
        }
      }

      if (progress >= 1) {
        this.pulseTime = -1;
        this.pulseRing.visible = false;
      }
    }
  }

  private updateFilaments(delta: number): void {
    for (let i = 0; i < this.filaments.length; i++) {
      this.updateSingleFilament(this.filaments[i], delta, i);
    }
  }

  private updateSingleFilament(f: Filament, delta: number, index: number): void {
    const mult = this.speedMultiplier;

    f.theta += f.thetaSpeed * mult;
    f.phi += f.phiSpeed * mult;
    f.phi = Math.max(0.1, Math.min(Math.PI - 0.1, f.phi));

    const helixPhase = f.helixOffset + this.time * 0.3 * mult;
    const radialWiggle = Math.sin(helixPhase * f.helixFrequency) * 0.06 * f.radius;
    const actualRadius = f.radius + radialWiggle;

    f.endDir.set(
      Math.sin(f.phi) * Math.cos(f.theta),
      Math.sin(f.phi) * Math.sin(f.theta),
      Math.cos(f.phi)
    );

    f.nextColorSwitchTime -= delta;
    if (f.nextColorSwitchTime <= 0) {
      f.nextColorSwitchTime = this.colorSwitchInterval;
      f.colorIndex = f.targetColorIndex;
      let newIdx = Math.floor(Math.random() * COLOR_PALETTE.length);
      while (newIdx === f.colorIndex) newIdx = Math.floor(Math.random() * COLOR_PALETTE.length);
      f.targetColorIndex = newIdx;
      f.colorBlend = 0;
    }
    if (f.colorBlend < 1) {
      f.colorBlend = Math.min(1, f.colorBlend + delta / 0.3);
    }

    if (f.whiteFlashTime > 0) f.whiteFlashTime -= delta;
    if (f.widthBoostTime > 0) {
      f.widthBoostTime -= delta;
      if (f.widthBoostTime <= 0) f.widthBoost = 0;
    }

    const endPoint = this.tmpVec3.copy(f.endDir).multiplyScalar(actualRadius);
    if (f.bendTowards && f.bendWeight > 0) {
      endPoint.lerp(f.bendTowards, BEND_AMOUNT * f.bendWeight);
    }

    const ctrl1T = 0.33;
    const ctrl2T = 0.66;
    const midDir = this.tmpVec3B.copy(f.endDir).applyAxisAngle(
      new THREE.Vector3(1, 0.5, 0.3).normalize(),
      Math.sin(helixPhase * 0.7) * 0.5
    );
    const ctrl1 = new THREE.Vector3().copy(midDir).multiplyScalar(actualRadius * ctrl1T);
    const ctrl2 = new THREE.Vector3().copy(f.endDir).multiplyScalar(actualRadius * ctrl2T).add(
      midDir.multiplyScalar(actualRadius * 0.1)
    );

    const start = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i <= CURVE_SEGMENTS; i++) {
      const t = i / CURVE_SEGMENTS;
      const p = bezierPoint(start, ctrl1, ctrl2, endPoint, t);
      f.positions[i * 3] = p.x;
      f.positions[i * 3 + 1] = p.y;
      f.positions[i * 3 + 2] = p.z;

      this.tmpColorA.setHex(COLOR_PALETTE[f.colorIndex]);
      this.tmpColorB.setHex(COLOR_PALETTE[f.targetColorIndex]);
      const col = this.tmpColorA.clone().lerp(this.tmpColorB, f.colorBlend);

      if (f.whiteFlashTime > 0) {
        const whiteT = f.whiteFlashTime / WHITE_FLASH_DURATION;
        const flashT = 1 - whiteT;
        const smoothFlash = flashT < 0.5 ? 2 * flashT * flashT : 1 - Math.pow(-2 * flashT + 2, 2) / 2;
        col.lerp(new THREE.Color(0xffffff), (1 - smoothFlash) * 0.9);
      }

      f.colors[i * 3] = col.r;
      f.colors[i * 3 + 1] = col.g;
      f.colors[i * 3 + 2] = col.b;
    }

    f.geometry.setPositions(f.positions);
    f.geometry.setColors(f.colors);
    f.line.computeLineDistances();

    const mat = f.line.material as LineMaterial;
    mat.linewidth = f.baseWidth + (f.widthBoost > 0 ? WIDTH_BOOST * (f.widthBoostTime / 0.3) : 0);
    mat.resolution.set(window.innerWidth, window.innerHeight);
  }

  public updateResolution(): void {
    for (const f of this.filaments) {
      const mat = f.line.material as LineMaterial;
      mat.resolution.set(window.innerWidth, window.innerHeight);
    }
  }
}

function bezierPoint(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number
): THREE.Vector3 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return new THREE.Vector3(
    mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    mt3 * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t3 * p3.z
  );
}
