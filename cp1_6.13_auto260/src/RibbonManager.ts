import * as THREE from 'three';
import gsap from 'gsap';

const COLOR_PALETTE = [
  '#ff6b6b', '#ff9ff3', '#48dbfb', '#feca57', '#54a0ff', '#a29bfe',
  '#e17055', '#00cec9', '#6c5ce7', '#fd79a8', '#fdcb6e', '#81ecec'
];

const TUBULAR_SEGMENTS = 64;
const RADIAL_SEGMENTS = 8;

interface Ribbon {
  id: number;
  mesh: THREE.Mesh;
  controlPoints: THREE.Vector3[];
  basePoints: THREE.Vector3[];
  curve: THREE.CatmullRomCurve3;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  baseOpacity: number;
  angularVelocity: number;
  floatAmplitude: number;
  floatFrequency: number;
  rotationOffset: number;
  phase: number;
  hueShiftSpeed: number;
  hueOffset: number;
  canShoot: boolean;
  shootTimer: number;
  shootInterval: number;
  isShooting: boolean;
  shootProgress: number;
  trailMesh?: THREE.Mesh;
  trailGeometry?: THREE.BufferGeometry;
  trailMaterial?: THREE.MeshBasicMaterial;
  windRotation: number;
  windZAmplitude: number;
  windZFreq: number;
}

interface StarParticle {
  mesh: THREE.Points;
  positions: Float32Array;
  phases: number[];
  periods: number[];
}

export class RibbonManager {
  private scene: THREE.Scene;
  private ribbons: Ribbon[] = [];
  private mouseTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private zoom: number = 1;
  private starParticle!: StarParticle;
  private group: THREE.Group;
  private _windModeActive: boolean = false;
  private _windRotationSpeed: number = 0;
  private _targetWindSpeed: number = 0;
  private _pulseActive: boolean = false;
  private _ribbonCount: number = 200;
  private _dynamicTubularSegments: number = TUBULAR_SEGMENTS;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.createRibbons();
    this.createStars();
  }

  get ribbonCount(): number {
    return this._ribbonCount;
  }

  get dynamicTubularSegments(): number {
    return this._dynamicTubularSegments;
  }

  set dynamicTubularSegments(value: number) {
    this._dynamicTubularSegments = Math.max(16, Math.min(TUBULAR_SEGMENTS, Math.floor(value)));
  }

  get windModeActive(): boolean {
    return this._windModeActive;
  }

  setWindSpeed(speed: number): void {
    this._targetWindSpeed = Math.max(0, Math.min(0.8, speed));
    if (this._targetWindSpeed > 0.05) {
      this._windModeActive = true;
    }
    gsap.to(this, {
      _windRotationSpeed: this._targetWindSpeed,
      duration: 1,
      ease: 'power2.out',
      onComplete: () => {
        if (this._windRotationSpeed < 0.01) {
          this._windModeActive = false;
        }
      }
    });
  }

  triggerPulse(): void {
    if (this._pulseActive) return;
    this._pulseActive = true;

    for (const ribbon of this.ribbons) {
      const origOpacity = ribbon.baseOpacity;
      const origColor = ribbon.baseColor.clone();
      const neighborColor = this.getNeighborColor(origColor);

      const tl = gsap.timeline({
        onComplete: () => {
          ribbon.material.opacity = origOpacity;
          ribbon.material.color.copy(origColor);
          ribbon.currentColor.copy(origColor);
        }
      });

      tl.to(ribbon.material, {
        opacity: 0.9,
        duration: 0.15,
        ease: 'power2.out'
      }, 0);

      const colorObj = { t: 0 };
      tl.to(colorObj, {
        t: 1,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          const c = origColor.clone().lerp(neighborColor, colorObj.t);
          ribbon.material.color.copy(c);
          ribbon.material.emissive.copy(c);
        }
      }, 0);

      tl.to(ribbon.material, {
        opacity: origOpacity,
        duration: 0.15,
        ease: 'power2.in'
      }, 0.15);

      const colorBackObj = { t: 0 };
      tl.to(colorBackObj, {
        t: 1,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          const c = neighborColor.clone().lerp(origColor, colorBackObj.t);
          ribbon.material.color.copy(c);
          ribbon.material.emissive.copy(c);
          ribbon.currentColor.copy(c);
        }
      }, 0.5);
    }

    setTimeout(() => {
      this._pulseActive = false;
    }, 1200);
  }

  updateTarget(target: THREE.Vector3): void {
    this.mouseTarget.copy(target);
  }

  update(mouseTarget: THREE.Vector3, time: number, zoom: number): void {
    this.mouseTarget.copy(mouseTarget);
    this.zoom = zoom;

    this.group.rotation.y += this._windRotationSpeed * 0.016;

    for (let i = 0; i < this.ribbons.length; i++) {
      this.updateRibbon(this.ribbons[i], time);
    }

    this.updateStars(time);
  }

  private createRibbons(): void {
    for (let i = 0; i < this._ribbonCount; i++) {
      const ribbon = this.createSingleRibbon(i);
      this.ribbons.push(ribbon);
      this.group.add(ribbon.mesh);
      if (ribbon.trailMesh) {
        this.group.add(ribbon.trailMesh);
      }
    }
  }

  private createSingleRibbon(id: number): Ribbon {
    const pointCount = 4 + Math.floor(Math.random() * 3);
    const radius = 1.5 + Math.random() * 2.5;
    const basePoints: THREE.Vector3[] = [];
    const controlPoints: THREE.Vector3[] = [];

    const angleStep = (Math.PI * 2) / pointCount;
    const startAngle = Math.random() * Math.PI * 2;
    const tiltX = (Math.random() - 0.5) * 0.5;
    const tiltZ = (Math.random() - 0.5) * 0.5;

    for (let i = 0; i < pointCount; i++) {
      const angle = startAngle + i * angleStep;
      const r = radius * (0.7 + Math.random() * 0.6);
      const x = Math.cos(angle) * r;
      const y = (Math.random() - 0.5) * 3;
      const z = Math.sin(angle) * r;

      const v = new THREE.Vector3(x, y, z);
      v.applyEuler(new THREE.Euler(tiltX, 0, tiltZ));
      basePoints.push(v.clone());
      controlPoints.push(v.clone());
    }

    const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5);
    const tubeRadius = 0.03 + Math.random() * 0.05;
    const geometry = new THREE.TubeGeometry(curve, TUBULAR_SEGMENTS, tubeRadius, RADIAL_SEGMENTS, true);

    const colorHex = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    const baseColor = new THREE.Color(colorHex);
    const baseOpacity = 0.2 + Math.random() * 0.3;

    const material = new THREE.MeshStandardMaterial({
      color: baseColor.clone(),
      emissive: baseColor.clone(),
      emissiveIntensity: 0.3 + Math.random() * 0.3,
      transparent: true,
      opacity: baseOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;

    const canShoot = Math.random() < 0.3;
    const ribbon: Ribbon = {
      id,
      mesh,
      controlPoints,
      basePoints,
      curve,
      geometry,
      material,
      baseColor: baseColor.clone(),
      currentColor: baseColor.clone(),
      baseOpacity,
      angularVelocity: 0.1 + Math.random() * 0.4,
      floatAmplitude: 0.3 + Math.random() * 0.5,
      floatFrequency: 0.2 + Math.random() * 0.3,
      rotationOffset: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      hueShiftSpeed: 0.2 * (Math.PI / 180),
      hueOffset: 0,
      canShoot,
      shootTimer: Math.random() * 2,
      shootInterval: 2 + Math.random() * 3,
      isShooting: false,
      shootProgress: 0,
      windRotation: Math.random() * Math.PI * 2,
      windZAmplitude: 0.3,
      windZFreq: 0.5 + Math.random() * 0.5
    };

    if (canShoot) {
      const trailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3()], false);
      ribbon.trailGeometry = new THREE.TubeGeometry(trailCurve, 8, 0.02, 4, false);
      ribbon.trailMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      ribbon.trailMesh = new THREE.Mesh(ribbon.trailGeometry, ribbon.trailMaterial);
      ribbon.trailMesh.frustumCulled = false;
    }

    return ribbon;
  }

  private updateRibbon(ribbon: Ribbon, time: number): void {
    const mx = this.mouseTarget.x;
    const my = this.mouseTarget.y;
    const mDist = Math.sqrt(mx * mx + my * my);
    const sigmoidFactor = 1 / (1 + Math.exp(mDist * 4 - 2));

    const twistAmount = mx * 1.0 * sigmoidFactor;
    const bendAmount = my * 0.8 * sigmoidFactor;

    const selfRot = time * ribbon.angularVelocity + ribbon.rotationOffset;
    const floatY = Math.sin(time * ribbon.floatFrequency + ribbon.phase) * ribbon.floatAmplitude;

    ribbon.hueOffset += ribbon.hueShiftSpeed * 0.016;
    if (ribbon.hueOffset > Math.PI * 2) ribbon.hueOffset -= Math.PI * 2;

    if (!this._pulseActive) {
      const hsl = { h: 0, s: 0, l: 0 };
      ribbon.baseColor.getHSL(hsl);
      hsl.h = (hsl.h + ribbon.hueOffset / (Math.PI * 2)) % 1;
      const shifted = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
      ribbon.currentColor.copy(shifted);
      ribbon.material.color.copy(ribbon.currentColor);
      ribbon.material.emissive.copy(ribbon.currentColor);
    }

    for (let i = 0; i < ribbon.basePoints.length; i++) {
      const base = ribbon.basePoints[i];
      const ctrl = ribbon.controlPoints[i];

      const angle = selfRot + (i / ribbon.basePoints.length) * Math.PI * 2;
      const cosR = Math.cos(angle);
      const sinR = Math.sin(angle);

      let x = base.x * cosR - base.z * sinR;
      let z = base.x * sinR + base.z * cosR;
      let y = base.y + floatY;

      const pointAngle = Math.atan2(z, x);
      const twist = Math.sin(pointAngle + time * 0.5) * twistAmount;
      x += twist;
      y += bendAmount * Math.cos(pointAngle + time * 0.3);

      if (this._windModeActive) {
        const zWave = Math.sin(time * ribbon.windZFreq * (1 + mx * 0.5) + i * 0.8 + ribbon.windRotation) * ribbon.windZAmplitude;
        z += zWave;
        const rotBoost = Math.sin(time * 0.8 + ribbon.id * 0.1) * 0.2 * this._windRotationSpeed;
        const xr = x * Math.cos(rotBoost) - z * Math.sin(rotBoost);
        const zr = x * Math.sin(rotBoost) + z * Math.cos(rotBoost);
        x = xr;
        z = zr;
      }

      ctrl.set(x, y, z);
    }

    ribbon.curve.points = ribbon.controlPoints;
    this.updateTubeGeometry(ribbon.geometry, ribbon.curve, this._dynamicTubularSegments);

    if (ribbon.canShoot) {
      this.updateShootEffect(ribbon, time);
    }
  }

  private updateTubeGeometry(geometry: THREE.BufferGeometry, curve: THREE.CatmullRomCurve3, tubularSegments: number): void {
    const radialSegments = RADIAL_SEGMENTS;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;

    const frames = curve.computeFrenetFrames(tubularSegments, curve.closed);
    const tubeRadius = (geometry.userData?.radius) ?? this.getTubeRadiusFromGeometry(geometry);

    const targetVertexCount = (tubularSegments + 1) * (radialSegments + 1);
    const currentVertexCount = positions.length / 3;

    if (targetVertexCount !== currentVertexCount) {
      const newPositions = new Float32Array(targetVertexCount * 3);
      const newNormals = new Float32Array(targetVertexCount * 3);
      const newUvs = new Float32Array(targetVertexCount * 2);
      const newIndices: number[] = [];

      for (let i = 0; i <= tubularSegments; i++) {
        const t = i / tubularSegments;
        const P = curve.getPointAt(t);
        const N = frames.normals[i];
        const B = frames.binormals[i];

        for (let j = 0; j <= radialSegments; j++) {
          const v = j / radialSegments * Math.PI * 2;
          const sin = Math.sin(v);
          const cos = Math.cos(v);

          const nx = cos * N.x + sin * B.x;
          const ny = cos * N.y + sin * B.y;
          const nz = cos * N.z + sin * B.z;

          const idx = (i * (radialSegments + 1) + j) * 3;
          newPositions[idx] = P.x + tubeRadius * nx;
          newPositions[idx + 1] = P.y + tubeRadius * ny;
          newPositions[idx + 2] = P.z + tubeRadius * nz;

          newNormals[idx] = nx;
          newNormals[idx + 1] = ny;
          newNormals[idx + 2] = nz;

          const uvIdx = (i * (radialSegments + 1) + j) * 2;
          newUvs[uvIdx] = i / tubularSegments;
          newUvs[uvIdx + 1] = j / radialSegments;
        }
      }

      for (let i = 0; i < tubularSegments; i++) {
        for (let j = 0; j < radialSegments; j++) {
          const a = i * (radialSegments + 1) + j;
          const b = a + radialSegments + 1;
          newIndices.push(a, b, a + 1);
          newIndices.push(b, b + 1, a + 1);
        }
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(newNormals, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(newUvs, 2));
      geometry.setIndex(newIndices);
      geometry.userData = { ...geometry.userData, radius: tubeRadius };
    } else {
      for (let i = 0; i <= tubularSegments; i++) {
        const t = i / tubularSegments;
        const P = curve.getPointAt(t);
        const N = frames.normals[i];
        const B = frames.binormals[i];

        for (let j = 0; j <= radialSegments; j++) {
          const v = j / radialSegments * Math.PI * 2;
          const sin = Math.sin(v);
          const cos = Math.cos(v);

          const nx = cos * N.x + sin * B.x;
          const ny = cos * N.y + sin * B.y;
          const nz = cos * N.z + sin * B.z;

          const idx = (i * (radialSegments + 1) + j) * 3;
          positions[idx] = P.x + tubeRadius * nx;
          positions[idx + 1] = P.y + tubeRadius * ny;
          positions[idx + 2] = P.z + tubeRadius * nz;
        }
      }
      positionAttr.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    geometry.computeBoundingSphere();
  }

  private getTubeRadiusFromGeometry(geometry: THREE.BufferGeometry): number {
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    if (pos && pos.count > 1) {
      const p0 = new THREE.Vector3(pos.getX(0), pos.getY(0), pos.getZ(0));
      const p1 = new THREE.Vector3(pos.getX(1), pos.getY(1), pos.getZ(1));
      return p0.distanceTo(p1) / 2;
    }
    return 0.05;
  }

  private updateShootEffect(ribbon: Ribbon, time: number): void {
    ribbon.shootTimer += 0.016;

    if (!ribbon.isShooting && ribbon.shootTimer >= ribbon.shootInterval) {
      ribbon.isShooting = true;
      ribbon.shootProgress = 0;
      ribbon.shootTimer = 0;
      ribbon.shootInterval = 2 + Math.random() * 3;
    }

    if (ribbon.isShooting && ribbon.trailMesh && ribbon.trailGeometry && ribbon.trailMaterial) {
      ribbon.shootProgress += 0.016 / 0.4;

      if (ribbon.shootProgress >= 1) {
        ribbon.isShooting = false;
        ribbon.trailMaterial.opacity = 0;
      } else {
        const p = ribbon.shootProgress;
        const startT = Math.max(0, p - 0.08);
        const endT = p;
        const pStart = ribbon.curve.getPointAt(startT);
        const pEnd = ribbon.curve.getPointAt(endT);
        const midT = (startT + endT) / 2;
        const pMid = ribbon.curve.getPointAt(midT);
        const pMid2 = ribbon.curve.getPointAt(midT + 0.01);

        const trailCurve = new THREE.CatmullRomCurve3([pStart, pMid, pMid2, pEnd], false);
        const frames = trailCurve.computeFrenetFrames(8, false);
        const trailRadius = 0.02;
        const posAttr = ribbon.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
        const posArr = posAttr.array as Float32Array;
        const rs = 4;

        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const pt = trailCurve.getPointAt(t);
          const N = frames.normals[i];
          const B = frames.binormals[i];
          for (let j = 0; j <= rs; j++) {
            const v = j / rs * Math.PI * 2;
            const sin = Math.sin(v);
            const cos = Math.cos(v);
            const nx = cos * N.x + sin * B.x;
            const ny = cos * N.y + sin * B.y;
            const nz = cos * N.z + sin * B.z;
            const idx = (i * (rs + 1) + j) * 3;
            posArr[idx] = pt.x + trailRadius * nx;
            posArr[idx + 1] = pt.y + trailRadius * ny;
            posArr[idx + 2] = pt.z + trailRadius * nz;
          }
        }
        posAttr.needsUpdate = true;
        ribbon.trailGeometry.computeVertexNormals();

        const fadeP = p > 0.7 ? (1 - p) / 0.3 : 1;
        const appearP = p < 0.1 ? p / 0.1 : 1;
        ribbon.trailMaterial.opacity = 0.8 * fadeP * appearP;
      }
    }
  }

  private createStars(): void {
    const starCount = 100;
    const positions = new Float32Array(starCount * 3);
    const phases: number[] = [];
    const periods: number[] = [];

    for (let i = 0; i < starCount; i++) {
      const r = 15 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
      positions[i * 3 + 2] = r * Math.cos(phi);
      phases.push(Math.random() * Math.PI * 2);
      periods.push(2 + Math.random() * 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Points(geometry, material);
    this.scene.add(mesh);

    this.starParticle = { mesh, positions, phases, periods };
  }

  private updateStars(time: number): void {
    const mat = this.starParticle.mesh.material as THREE.PointsMaterial;
    const total = this.starParticle.phases.length;
    let avg = 0;
    for (let i = 0; i < total; i++) {
      const t = (time / this.starParticle.periods[i]) + this.starParticle.phases[i];
      avg += 0.1 + (Math.sin(t) * 0.5 + 0.5) * 0.4;
    }
    mat.opacity = avg / total;
  }

  private getNeighborColor(color: THREE.Color): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    const shift = (Math.random() > 0.5 ? 1 : -1) * (30 / 360);
    hsl.h = (hsl.h + shift + 1) % 1;
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }
}
