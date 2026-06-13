import * as THREE from 'three';
import { gsap } from 'gsap';

const COLOR_PALETTE: number[] = [
  0xff6b6b, 0xff9ff3, 0x48dbfb, 0xfeca57,
  0x54a0ff, 0xa29bfe, 0xe17055, 0x00cec9,
  0x6c5ce7, 0xfd79a8, 0xfdcb6e, 0x81ecec
];

const RIBBON_COUNT = 200;
const TUBULAR_SEGMENTS = 64;
const RADIAL_SEGMENTS = 8;

interface RibbonData {
  mesh: THREE.Mesh;
  baseControlPoints: THREE.Vector3[];
  currentControlPoints: THREE.Vector3[];
  curve: THREE.CatmullRomCurve3;
  baseColor: THREE.Color;
  targetColor: THREE.Color;
  baseOpacity: number;
  currentOpacity: number;
  angularVelocity: number;
  floatAmplitude: number;
  floatFrequency: number;
  floatPhase: number;
  rotationPhase: number;
  hueDriftSpeed: number;
  hueDriftPhase: number;
  streamLightActive: boolean;
  streamLightProgress: number;
  streamLightMesh?: THREE.Mesh;
  streamLightCurve?: THREE.CatmullRomCurve3;
  hasStreamLight: boolean;
  nextStreamLightTime: number;
  pulseTimeline?: gsap.core.Timeline;
}

export class RibbonManager {
  private scene: THREE.Scene;
  private ribbons: RibbonData[] = [];
  private mouseTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private zoom: number = 1;
  private windRotationSpeed: number = 0;
  private windWaveAmplitude: number = 0;
  private windWaveFrequency: number = 0;
  private time: number = 0;
  private globalRotation: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createRibbons();
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x * 3));
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private createRibbons(): void {
    for (let i = 0; i < RIBBON_COUNT; i++) {
      const pointCount = Math.floor(this.randomRange(4, 7));
      const basePoints: THREE.Vector3[] = [];
      const currentPoints: THREE.Vector3[] = [];

      const radius = this.randomRange(0.5, 2.5);
      const startAngle = (i / RIBBON_COUNT) * Math.PI * 2 + this.randomRange(-0.3, 0.3);
      const heightOffset = this.randomRange(-1.5, 1.5);

      for (let j = 0; j < pointCount; j++) {
        const t = j / (pointCount - 1);
        const angle = startAngle + t * this.randomRange(0.5, 2.0);
        const r = radius + this.randomRange(-0.3, 0.3);
        const x = Math.cos(angle) * r;
        const y = heightOffset + (t - 0.5) * this.randomRange(1, 3);
        const z = Math.sin(angle) * r;
        basePoints.push(new THREE.Vector3(x, y, z));
        currentPoints.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(currentPoints, false, 'catmullrom', 0.5);
      const tubeRadius = this.randomRange(0.03, 0.08);
      const geometry = new THREE.TubeGeometry(curve, TUBULAR_SEGMENTS, tubeRadius, RADIAL_SEGMENTS, false);

      const colorIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
      const baseColorHex = COLOR_PALETTE[colorIndex];
      const baseOpacity = this.randomRange(0.2, 0.5);
      const emissiveIntensity = this.randomRange(0.3, 0.6);

      const material = new THREE.MeshStandardMaterial({
        color: baseColorHex,
        transparent: true,
        opacity: baseOpacity,
        emissive: baseColorHex,
        emissiveIntensity: emissiveIntensity,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const hasStreamLight = Math.random() < 0.3;
      let streamLightMesh: THREE.Mesh | undefined;
      let streamLightCurve: THREE.CatmullRomCurve3 | undefined;

      if (hasStreamLight) {
        streamLightCurve = new THREE.CatmullRomCurve3(currentPoints, false, 'catmullrom', 0.5);
        const streamGeo = new THREE.TubeGeometry(streamLightCurve, TUBULAR_SEGMENTS, 0.02, 4, false);
        const streamMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        streamLightMesh = new THREE.Mesh(streamGeo, streamMat);
        this.scene.add(streamLightMesh);
      }

      this.ribbons.push({
        mesh,
        baseControlPoints: basePoints,
        currentControlPoints: currentPoints,
        curve,
        baseColor: new THREE.Color(baseColorHex),
        targetColor: new THREE.Color(baseColorHex),
        baseOpacity,
        currentOpacity: baseOpacity,
        angularVelocity: this.randomRange(0.1, 0.5),
        floatAmplitude: this.randomRange(0.3, 0.8),
        floatFrequency: this.randomRange(0.2, 0.5),
        floatPhase: this.randomRange(0, Math.PI * 2),
        rotationPhase: this.randomRange(0, Math.PI * 2),
        hueDriftSpeed: this.randomRange(0.15, 0.25),
        hueDriftPhase: this.randomRange(0, Math.PI * 2),
        streamLightActive: false,
        streamLightProgress: 0,
        streamLightMesh,
        streamLightCurve,
        hasStreamLight,
        nextStreamLightTime: hasStreamLight ? this.randomRange(2, 5) : -1
      });
    }
  }

  public updateTarget(mouseTarget: THREE.Vector3): void {
    this.mouseTarget.copy(mouseTarget);
  }

  public setZoom(zoom: number): void {
    this.zoom = zoom;
  }

  public triggerPulse(): void {
    for (const ribbon of this.ribbons) {
      if (ribbon.pulseTimeline) {
        ribbon.pulseTimeline.kill();
      }

      const originalColor = ribbon.baseColor.clone();
      const tempColor = originalColor.clone();
      const hsl = { h: 0, s: 0, l: 0 };
      tempColor.getHSL(hsl);
      hsl.h = (hsl.h + (Math.random() > 0.5 ? 1 : -1) * (30 / 360) + 1) % 1;
      tempColor.setHSL(hsl.h, hsl.s, hsl.l);

      const material = ribbon.mesh.material as THREE.MeshStandardMaterial;
      ribbon.currentOpacity = ribbon.baseOpacity;

      ribbon.pulseTimeline = gsap.timeline()
        .to(material, {
          opacity: 0.9,
          duration: 0.15,
          ease: 'power2.out',
          onUpdate: () => {
            ribbon.currentOpacity = material.opacity;
          }
        })
        .to(material, {
          opacity: ribbon.baseOpacity,
          duration: 0.15,
          ease: 'power2.in',
          onUpdate: () => {
            ribbon.currentOpacity = material.opacity;
          }
        }, 0.15);

      gsap.to(ribbon.targetColor, {
        r: tempColor.r,
        g: tempColor.g,
        b: tempColor.b,
        duration: 0.25,
        ease: 'power2.out',
        onUpdate: () => {
          material.color.copy(ribbon.targetColor);
          material.emissive.copy(ribbon.targetColor);
        }
      });

      gsap.to(ribbon.targetColor, {
        r: originalColor.r,
        g: originalColor.g,
        b: originalColor.b,
        duration: 0.25,
        ease: 'power2.in',
        delay: 0.25,
        onUpdate: () => {
          material.color.copy(ribbon.targetColor);
          material.emissive.copy(ribbon.targetColor);
        }
      });
    }
  }

  public triggerWindSwirl(scrollSpeed: number): void {
    const targetSpeed = Math.min(Math.abs(scrollSpeed) * 0.02, 0.8);
    gsap.to(this, {
      windRotationSpeed: targetSpeed,
      windWaveAmplitude: 0.3,
      windWaveFrequency: 0.5 + Math.abs(this.mouseTarget.x) * 1.5,
      duration: 0.3,
      ease: 'power2.out'
    });
  }

  public stopWindSwirl(): void {
    gsap.to(this, {
      windRotationSpeed: 0,
      windWaveAmplitude: 0,
      windWaveFrequency: 0,
      duration: 1.0,
      ease: 'power2.out'
    });
  }

  public update(mouseTarget: THREE.Vector3, time: number, zoom: number): void {
    this.time = time;
    this.mouseTarget.copy(mouseTarget);
    this.zoom = zoom;
    this.globalRotation += this.windRotationSpeed * (1 / 60);

    const mouseXInfluence = this.sigmoid(Math.abs(this.mouseTarget.x) * 3) * Math.sign(this.mouseTarget.x);
    const mouseYInfluence = this.sigmoid(Math.abs(this.mouseTarget.y) * 3) * Math.sign(this.mouseTarget.y);

    for (const ribbon of this.ribbons) {
      this.updateRibbon(ribbon, mouseXInfluence, mouseYInfluence);
      this.updateHueDrift(ribbon, time);
      this.updateStreamLight(ribbon, time);
    }
  }

  private updateRibbon(ribbon: RibbonData, mouseX: number, mouseY: number): void {
    const { baseControlPoints, currentControlPoints, curve } = ribbon;

    ribbon.rotationPhase += ribbon.angularVelocity * (1 / 60);
    const floatOffset = Math.sin(this.time * ribbon.floatFrequency * Math.PI * 2 + ribbon.floatPhase) * ribbon.floatAmplitude;

    const cosR = Math.cos(ribbon.rotationPhase + this.globalRotation);
    const sinR = Math.sin(ribbon.rotationPhase + this.globalRotation);

    for (let i = 0; i < baseControlPoints.length; i++) {
      const base = baseControlPoints[i];
      const current = currentControlPoints[i];

      const rotatedX = base.x * cosR - base.z * sinR;
      const rotatedZ = base.x * sinR + base.z * cosR;

      const t = i / (baseControlPoints.length - 1);
      const twistFactor = (t - 0.5) * 2;

      const xBend = mouseX * twistFactor * 1.0;
      const yBend = mouseY * twistFactor * 0.8 + floatOffset;
      const zWave = this.windWaveAmplitude * Math.sin(
        this.time * (this.windWaveFrequency + t * 2) * Math.PI * 2 + i * 0.5
      );

      current.set(
        rotatedX + xBend,
        base.y + yBend,
        rotatedZ + zWave
      );
    }

    curve.points = currentControlPoints;
    this.updateTubeGeometry(ribbon);
  }

  private updateTubeGeometry(ribbon: RibbonData): void {
    const mesh = ribbon.mesh;
    const oldGeometry = mesh.geometry as THREE.TubeGeometry;
    const oldPosition = oldGeometry.attributes.position;

    const newGeometry = new THREE.TubeGeometry(ribbon.curve, TUBULAR_SEGMENTS,
      (oldGeometry.parameters as { radius: number }).radius, RADIAL_SEGMENTS, false);
    const newPosition = newGeometry.attributes.position;

    if (oldPosition.count === newPosition.count) {
      const oldArray = oldPosition.array as Float32Array;
      const newArray = newPosition.array as Float32Array;
      for (let i = 0; i < newArray.length; i++) {
        oldArray[i] = newArray[i];
      }
      oldPosition.needsUpdate = true;
      oldGeometry.computeVertexNormals();
      newGeometry.dispose();
    } else {
      oldGeometry.dispose();
      mesh.geometry = newGeometry;
    }

    if (ribbon.streamLightCurve && ribbon.streamLightMesh) {
      ribbon.streamLightCurve.points = ribbon.currentControlPoints;
      const streamGeo = ribbon.streamLightMesh.geometry as THREE.TubeGeometry;
      const streamOldPos = streamGeo.attributes.position;
      const streamNewGeo = new THREE.TubeGeometry(ribbon.streamLightCurve, TUBULAR_SEGMENTS, 0.02, 4, false);
      const streamNewPos = streamNewGeo.attributes.position;
      if (streamOldPos.count === streamNewPos.count) {
        const oldArr = streamOldPos.array as Float32Array;
        const newArr = streamNewPos.array as Float32Array;
        for (let i = 0; i < newArr.length; i++) {
          oldArr[i] = newArr[i];
        }
        streamOldPos.needsUpdate = true;
        streamGeo.computeVertexNormals();
        streamNewGeo.dispose();
      } else {
        streamGeo.dispose();
        ribbon.streamLightMesh.geometry = streamNewGeo;
      }
    }
  }

  private updateHueDrift(ribbon: RibbonData, time: number): void {
    const material = ribbon.mesh.material as THREE.MeshStandardMaterial;
    const hsl = { h: 0, s: 0, l: 0 };
    ribbon.baseColor.getHSL(hsl);
    const drift = (time * ribbon.hueDriftSpeed / 15 + ribbon.hueDriftPhase / (Math.PI * 2)) % 1;
    hsl.h = (hsl.h + drift) % 1;
    material.color.setHSL(hsl.h, hsl.s, hsl.l);
    material.emissive.setHSL(hsl.h, hsl.s, hsl.l);
  }

  private updateStreamLight(ribbon: RibbonData, time: number): void {
    if (!ribbon.hasStreamLight || !ribbon.streamLightMesh) return;

    if (!ribbon.streamLightActive && time >= ribbon.nextStreamLightTime) {
      ribbon.streamLightActive = true;
      ribbon.streamLightProgress = 0;
    }

    if (ribbon.streamLightActive) {
      ribbon.streamLightProgress += (1 / 60) / 0.4;
      const streamMat = ribbon.streamLightMesh.material as THREE.MeshBasicMaterial;

      if (ribbon.streamLightProgress <= 1) {
        const alpha = Math.sin(ribbon.streamLightProgress * Math.PI);
        streamMat.opacity = alpha * 0.8;
        streamMat.transparent = true;

        const point = ribbon.curve.getPointAt(ribbon.streamLightProgress);
        ribbon.streamLightMesh.position.copy(point);
      } else if (ribbon.streamLightProgress <= 1.5) {
        const fadeProgress = (ribbon.streamLightProgress - 1) * 5;
        streamMat.opacity = 0.8 * (1 - fadeProgress);
      } else {
        ribbon.streamLightActive = false;
        streamMat.opacity = 0;
        ribbon.nextStreamLightTime = time + this.randomRange(2, 5);
      }
    }
  }

  public dispose(): void {
    for (const ribbon of this.ribbons) {
      ribbon.mesh.geometry.dispose();
      (ribbon.mesh.material as THREE.Material).dispose();
      this.scene.remove(ribbon.mesh);
      if (ribbon.streamLightMesh) {
        ribbon.streamLightMesh.geometry.dispose();
        (ribbon.streamLightMesh.material as THREE.Material).dispose();
        this.scene.remove(ribbon.streamLightMesh);
      }
      if (ribbon.pulseTimeline) {
        ribbon.pulseTimeline.kill();
      }
    }
    this.ribbons = [];
  }
}
